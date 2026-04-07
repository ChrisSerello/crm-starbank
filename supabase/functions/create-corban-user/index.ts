import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Criar client com service_role (permissão total) ──
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ── 2. Criar client com o JWT do usuário logado (para validar quem está chamando) ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // ── 3. Verificar quem está chamando ──
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ── 4. Buscar perfil do chamador para validar papel ──
    // Verifica tanto profiles quanto allowed_users (fallback caso profile ainda não tenha modulo correto)
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role, modulo, email")
      .eq("id", user.id)
      .single();

    // Fallback: verificar allowed_users pelo email
    const { data: callerAllowed } = await supabaseAdmin
      .from("allowed_users")
      .select("role, modulo")
      .ilike("email", user.email || "")
      .single();

    const effectiveRole = callerProfile?.role || callerAllowed?.role;
    const effectiveModulo = callerProfile?.modulo || callerAllowed?.modulo;

    const allowedRoles = ["master", "promotora_principal", "promotora"];
    if (!effectiveRole || !allowedRoles.includes(effectiveRole) || effectiveModulo !== "corbans") {
      // Log para debug
      console.log("Permission denied:", { effectiveRole, effectiveModulo, callerProfile, callerAllowed });
      return new Response(JSON.stringify({ 
        error: "Sem permissão para criar usuários",
        debug: { role: effectiveRole, modulo: effectiveModulo }
      }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ── 5. Ler dados do body ──
    const body = await req.json();
    const {
      email, password, role, nome,
      promotora_principal_email, promotora_email,
      extra_data,
    } = body;

    if (!email || !password || !role || !nome) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: email, password, role, nome" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ── 6. Validar hierarquia: quem pode criar quem ──
    const hierarchy: Record<string, string[]> = {
      master:               ["promotora_principal", "promotora", "digitalizador"],
      promotora_principal:  ["promotora", "digitalizador"],
      promotora:            ["digitalizador"],
    };
    if (!hierarchy[effectiveRole]?.includes(role)) {
      return new Response(JSON.stringify({ error: `${effectiveRole} não pode criar ${role}` }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ── 7. Verificar se e-mail já existe no allowed_users ──
    const { data: existing } = await supabaseAdmin
      .from("allowed_users")
      .select("email")
      .ilike("email", email.trim().toLowerCase())
      .single();

    if (existing) {
      return new Response(JSON.stringify({ error: "Este e-mail já está cadastrado no sistema" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ── 8. Criar usuário no Supabase Auth ──
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true, // já confirma o e-mail automaticamente
    });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const newUserId = authData.user.id;
    const emailLower = email.trim().toLowerCase();

    // ── 9. Inserir no allowed_users ──
    const { error: allowedError } = await supabaseAdmin.from("allowed_users").insert({
      email: emailLower,
      nome,
      role,
      modulo: "corbans",
      promotora_principal_email: promotora_principal_email || null,
      promotora_email: promotora_email || null,
      extra_data: extra_data || {},
    });

    if (allowedError) {
      // Rollback: remover o usuário criado no Auth
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: allowedError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ── 10. Resolver UUIDs da hierarquia ──
    let promotora_principal_id = null;
    let promotora_id = null;

    if (promotora_principal_email) {
      const { data: pp } = await supabaseAdmin
        .from("profiles").select("id").ilike("email", promotora_principal_email).single();
      promotora_principal_id = pp?.id || null;
    }
    if (promotora_email) {
      const { data: p } = await supabaseAdmin
        .from("profiles").select("id").ilike("email", promotora_email).single();
      promotora_id = p?.id || null;
    }

    // ── 11. Criar profile já pronto (sem precisar logar pela primeira vez) ──
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: newUserId,
      email: emailLower,
      nome,
      role,
      modulo: "corbans",
      promotora_principal_id,
      promotora_id,
    });

    if (profileError) {
      console.error("Profile insert error (non-fatal):", profileError.message);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Usuário ${nome} criado com sucesso!`,
      user_id: newUserId,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});