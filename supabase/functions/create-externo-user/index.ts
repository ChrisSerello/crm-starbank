// supabase/functions/create-externo-user/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Verificar se quem chama é 'interno' do módulo 'externos'
    const { data: callerProfile } = await admin
      .from("profiles").select("role, modulo").eq("id", user.id).single();
    const { data: callerAllowed } = await admin
      .from("allowed_users").select("role, modulo").ilike("email", user.email || "").single();

    const role   = callerProfile?.role   || callerAllowed?.role;
    const modulo = callerProfile?.modulo || callerAllowed?.modulo;

    if (role !== "interno" || modulo !== "externos") {
      return new Response(JSON.stringify({ error: "Apenas internos podem cadastrar externos." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { email, password, nome, telefone } = await req.json();
    if (!email || !password || !nome) {
      return new Response(JSON.stringify({ error: "Nome, e-mail e senha são obrigatórios." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const emailLower = email.trim().toLowerCase();

    // Verificar se já existe
    const { data: existing } = await admin
      .from("allowed_users").select("email").ilike("email", emailLower).single();
    if (existing) {
      return new Response(JSON.stringify({ error: "E-mail já cadastrado no sistema." }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Criar no Supabase Auth
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: emailLower, password, email_confirm: true,
    });
    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const newUserId = authData.user.id;

    // Inserir em allowed_users
    const { error: allowedErr } = await admin.from("allowed_users").insert({
      email: emailLower, nome, role: "externo", modulo: "externos",
      extra_data: { telefone: telefone || null },
    });
    if (allowedErr) {
      await admin.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: allowedErr.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Criar profile
    await admin.from("profiles").insert({
      id: newUserId, email: emailLower, nome, role: "externo", modulo: "externos",
    });

    return new Response(JSON.stringify({ success: true, message: `${nome} cadastrado com sucesso!`, user_id: newUserId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});