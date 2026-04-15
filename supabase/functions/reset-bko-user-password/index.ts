// supabase/functions/reset-bko-user-password/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token não enviado.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // client "normal" usando o token do usuário logado
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: { headers: { Authorization: authHeader } },
      },
    )

    // client admin com service role para poder usar auth.admin
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1) Descobrir quem está chamando
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // 2) Verificar se é COMERCIAL
    const { data: callerProfile, error: callerError } = await admin
      .from('profiles')
      .select('id, email, role, nome')
      .eq('id', user.id)
      .single()

    if (callerError || !callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Perfil do solicitante não encontrado.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (callerProfile.role !== 'comercial') {
      return new Response(
        JSON.stringify({ error: 'Apenas o comercial pode redefinir senha.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // 3) Ler payload
    const body = await req.json().catch(() => null)
    const email = String(body?.email || '').toLowerCase()
    const newPassword = String(body?.newPassword || '')

    if (!email || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Email e nova senha são obrigatórios.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (newPassword.length < 8) {
      return new Response(
        JSON.stringify({
          error: 'A nova senha deve ter no mínimo 8 caracteres.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // 4) Validar se alvo é Corban do módulo BKO
    const { data: targetAllowed, error: targetAllowedError } = await admin
      .from('allowed_users')
      .select('email, role, nome')
      .eq('email', email)
      .eq('modulo', 'bko')
      .single()

    if (targetAllowedError || !targetAllowed) {
      return new Response(
        JSON.stringify({
          error: 'Usuário alvo não encontrado no módulo BKO.',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (targetAllowed.role !== 'corban_bko') {
      return new Response(
        JSON.stringify({
          error: 'A redefinição só é permitida para usuários Corban.',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // 5) Encontrar usuário no Auth pela conta de admin
    const { data: usersData, error: listError } =
      await admin.auth.admin.listUsers()

    if (listError) {
      return new Response(
        JSON.stringify({ error: 'Erro ao localizar usuário no Auth.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const authUser = usersData.users.find(
      (u) => u.email?.toLowerCase() === email,
    )

    if (!authUser) {
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado no Auth.' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // 6) Trocar a senha usando auth.admin
    const { error: updateError } = await admin.auth.admin.updateUserById(
      authUser.id,
      { password: newPassword },
    )

    if (updateError) {
      return new Response(
        JSON.stringify({
          error: updateError.message || 'Erro ao atualizar senha.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // 7) Registrar auditoria
    await admin.from('bko_audit_log').insert({
      user_id: callerProfile.id,
      user_nome: callerProfile.nome,
      user_role: callerProfile.role,
      action: 'Redefiniu senha de usuário',
      cliente_id: null,
      cliente_nome: null,
      detalhes: `Senha redefinida para ${targetAllowed.nome} (${targetAllowed.email})`,
    })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e?.message || 'Erro interno.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})