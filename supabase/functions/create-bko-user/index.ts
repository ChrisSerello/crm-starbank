import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Verificar se quem chama é comercial ou corban_bko do módulo bko
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles").select("role, modulo").eq("id", user.id).single();

    const { data: callerAllowed } = await supabaseAdmin
      .from("allowed_users").select("role, modulo").ilike("email", user.email || "").single();

    const effectiveRole = callerProfile?.role || callerAllowed?.role;
    const effectiveModulo = callerProfile?.modulo || callerAllowed?.modulo;

    if (!["comercial", "corban_bko"].includes(effectiveRole) || effectiveModulo !== "bko") {
      return new Response(JSON.stringify({ error: "Sem permissão para criar usuários BKO" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { email, password, role, nome, modulo } = await req.json();

    if (!email || !password || !role || !nome) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: email, password, role, nome" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verificar se já existe
    const { data: existing } = await supabaseAdmin.from("allowed_users").select("email").ilike("email", email.trim().toLowerCase()).single();
    if (existing) return new Response(JSON.stringify({ error: "E-mail já cadastrado" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Criar no Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
    });
    if (authError) return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const newUserId = authData.user.id;
    const emailLower = email.trim().toLowerCase();

    // Inserir em allowed_users
    const { error: allowedError } = await supabaseAdmin.from("allowed_users").insert({
      email: emailLower, nome, role, modulo: "bko",
    });
    if (allowedError) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: allowedError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Criar profile
    await supabaseAdmin.from("profiles").insert({
      id: newUserId, email: emailLower, nome, role, modulo: "bko",
    });

    return new Response(JSON.stringify({ success: true, message: `${nome} criado com sucesso!`, user_id: newUserId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
