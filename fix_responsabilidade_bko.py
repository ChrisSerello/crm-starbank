# fix_responsabilidade_bko.py
# Rode na raiz do projeto: python fix_responsabilidade_bko.py
#
# CORRIGE 3 PROBLEMAS:
# 1. Sync genérico não sobrescreve responsavel_bko_id/nome
# 2. UI bloqueada — outro BKO vê quem assumiu e NÃO consegue assumir em cima
# 3. Check no banco antes de assumir — previne race condition do Realtime

import os

# ══════════════════════════════════════════════════════════════════════════════
# PARTE 1: BKOApp.jsx — Sync genérico não mexe em responsavel_bko
# ══════════════════════════════════════════════════════════════════════════════

bko_app_path = 'src/views/bko/BKOApp.jsx'
print('\n=== Fix: Responsabilidade BKO — 3 proteções ===\n')

if not os.path.exists(bko_app_path):
    print(f'ERRO: {bko_app_path} não encontrado')
    exit()

with open(bko_app_path, 'r', encoding='utf-8') as f:
    app = f.read()

app_changes = 0

# ── 1a. No sync (useEffect que faz upsert), remover responsavel_bko do payload ──
old_sync_destruct = """        const {id,estagio,criado_por_id,criado_por_nome,criado_por_role,atribuido_a_id,atribuido_a_nome,responsavel_bko_id,responsavel_bko_nome,...data}=c;
        const {error}=await supabase.from('bko_clientes').upsert({id,data:{...data,id},estagio:estagio||'clientes_novos',criado_por_id:criado_por_id||session.user.id,criado_por_nome:criado_por_nome||profile?.nome,criado_por_role:criado_por_role||profile?.role,atribuido_a_id:atribuido_a_id||null,atribuido_a_nome:atribuido_a_nome||null,responsavel_bko_id:responsavel_bko_id||null,responsavel_bko_nome:responsavel_bko_nome||null},{onConflict:'id'});"""

new_sync_destruct = """        const {id,estagio,criado_por_id,criado_por_nome,criado_por_role,atribuido_a_id,atribuido_a_nome,responsavel_bko_id,responsavel_bko_nome,...data}=c;
        // IMPORTANTE: responsavel_bko_id/nome NÃO são incluídos no upsert genérico.
        // Esses campos são gerenciados EXCLUSIVAMENTE pelo botão Assumir/Liberar no BKODetail,
        // que faz update direto no banco. Isso evita que o sync de outro BKO sobrescreva a responsabilidade.
        const {error}=await supabase.from('bko_clientes').upsert({id,data:{...data,id},estagio:estagio||'clientes_novos',criado_por_id:criado_por_id||session.user.id,criado_por_nome:criado_por_nome||profile?.nome,criado_por_role:criado_por_role||profile?.role,atribuido_a_id:atribuido_a_id||null,atribuido_a_nome:atribuido_a_nome||null},{onConflict:'id'});"""

if old_sync_destruct in app:
    app = app.replace(old_sync_destruct, new_sync_destruct)
    print('  OK: Sync genérico NÃO inclui mais responsavel_bko no upsert')
    app_changes += 1
else:
    print('  AVISO: bloco de sync/upsert não encontrado — verifique manualmente')

with open(bko_app_path, 'w', encoding='utf-8') as f:
    f.write(app)

print(f'\n  BKOApp.jsx: {app_changes} alteração(ões)')

# ══════════════════════════════════════════════════════════════════════════════
# PARTE 2: BKODetail.jsx — UI bloqueada + check no banco antes de assumir
# ══════════════════════════════════════════════════════════════════════════════

detail_path = 'src/views/bko/BKODetail.jsx'

if not os.path.exists(detail_path):
    print(f'\nERRO: {detail_path} não encontrado')
    exit()

with open(detail_path, 'r', encoding='utf-8') as f:
    detail = f.read()

detail_changes = 0

# ── 2a. Substituir a função assumirResponsabilidade por versão com check no banco ──
old_assumir = """  const assumirResponsabilidade = async () => {
    setSalvandoResp(true);
    setRespMsg(null);
    const { error } = await supabase.from('bko_clientes')
      .update({ responsavel_bko_id: profile?.id, responsavel_bko_nome: profile?.nome })
      .eq('id', cliente.id);
    setSalvandoResp(false);
    if (error) { setRespMsg({ t: 'error', text: 'Erro ao assumir.' }); return; }
    dispatch({ type: 'UPD', c: { ...cliente, responsavel_bko_id: profile?.id, responsavel_bko_nome: profile?.nome } });
    setRespMsg({ t: 'success', text: 'Você é o responsável por este cliente.' });
  };"""

new_assumir = """  const assumirResponsabilidade = async () => {
    setSalvandoResp(true);
    setRespMsg(null);
    // PROTEÇÃO: verificar no banco se já tem responsável antes de gravar
    // Isso previne race condition quando dois BKOs tentam assumir ao mesmo tempo
    const { data: atual } = await supabase.from('bko_clientes')
      .select('responsavel_bko_id, responsavel_bko_nome')
      .eq('id', cliente.id)
      .single();
    if (atual?.responsavel_bko_id && atual.responsavel_bko_id !== profile?.id) {
      // Já tem outro BKO responsável — bloquear e atualizar estado local
      setSalvandoResp(false);
      dispatch({ type: 'UPD', c: { ...cliente, responsavel_bko_id: atual.responsavel_bko_id, responsavel_bko_nome: atual.responsavel_bko_nome } });
      setRespMsg({ t: 'error', text: `Este cliente já está com ${atual.responsavel_bko_nome || 'outro BKO'}. Não é possível assumir.` });
      return;
    }
    const { error } = await supabase.from('bko_clientes')
      .update({ responsavel_bko_id: profile?.id, responsavel_bko_nome: profile?.nome })
      .eq('id', cliente.id);
    setSalvandoResp(false);
    if (error) { setRespMsg({ t: 'error', text: 'Erro ao assumir.' }); return; }
    dispatch({ type: 'UPD', c: { ...cliente, responsavel_bko_id: profile?.id, responsavel_bko_nome: profile?.nome } });
    setRespMsg({ t: 'success', text: 'Você é o responsável por este cliente.' });
  };"""

if old_assumir in detail:
    detail = detail.replace(old_assumir, new_assumir)
    print('\n  OK: assumirResponsabilidade agora verifica no banco antes de gravar')
    detail_changes += 1
else:
    print('\n  AVISO: função assumirResponsabilidade não encontrada')

# ── 2b. Substituir o bloco de UI do Responsável BKO ──
# Antes: quando temResponsavel=false, qualquer BKO vê "Assumir"
# Depois: quando temResponsavel=true E não sou eu, mostra quem é + mensagem de bloqueio

old_resp_ui = """            {temResponsavel ? (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 6 }}>
                    {cliente.responsavel_bko_nome}
                    {euSouResponsavel && <span style={{ fontSize: 9, marginLeft: 6, padding: '1px 6px', borderRadius: 99, background: 'rgba(124,58,237,.1)', color: '#7C3AED', fontWeight: 700 }}>Você</span>}
                  </div>
                  {euSouResponsavel && (
                    <button onClick={liberarResponsabilidade} disabled={salvandoResp} style={{ padding: '6px 12px', borderRadius: 7, background: 'var(--danger-dim)', color: 'var(--danger)', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      Liberar responsabilidade
                    </button>
                  )}
                </div>
              ) : (
                isBko ? (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Nenhum responsável ainda.</div>
                    <button onClick={assumirResponsabilidade} disabled={salvandoResp} style={{ width: '100%', padding: '8px 0', borderRadius: 8, background: '#7C3AED', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', opacity: salvandoResp ? 0.7 : 1 }}>
                      {salvandoResp ? 'Salvando…' : 'Assumir responsabilidade'}
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sem responsável BKO atribuído.</div>
                )
              )}"""

new_resp_ui = """            {temResponsavel ? (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 6 }}>
                    {cliente.responsavel_bko_nome}
                    {euSouResponsavel && <span style={{ fontSize: 9, marginLeft: 6, padding: '1px 6px', borderRadius: 99, background: 'rgba(124,58,237,.1)', color: '#7C3AED', fontWeight: 700 }}>Você</span>}
                  </div>
                  {euSouResponsavel ? (
                    <button onClick={liberarResponsabilidade} disabled={salvandoResp} style={{ padding: '6px 12px', borderRadius: 7, background: 'var(--danger-dim)', color: 'var(--danger)', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      Liberar responsabilidade
                    </button>
                  ) : (
                    isBko && (
                      <div style={{ marginTop: 6, padding: '8px 12px', borderRadius: 8, background: 'rgba(249,115,22,.08)', border: '1px solid rgba(249,115,22,.2)', fontSize: 11, color: '#F97316' }}>
                        🔒 Este cliente já está sendo atendido por <strong>{cliente.responsavel_bko_nome}</strong>. Não é possível assumir enquanto outro BKO estiver responsável.
                      </div>
                    )
                  )}
                </div>
              ) : (
                isBko ? (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Nenhum responsável ainda.</div>
                    <button onClick={assumirResponsabilidade} disabled={salvandoResp} style={{ width: '100%', padding: '8px 0', borderRadius: 8, background: '#7C3AED', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', opacity: salvandoResp ? 0.7 : 1 }}>
                      {salvandoResp ? 'Verificando…' : 'Assumir responsabilidade'}
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sem responsável BKO atribuído.</div>
                )
              )}"""

if old_resp_ui in detail:
    detail = detail.replace(old_resp_ui, new_resp_ui)
    print('  OK: UI do Responsável BKO bloqueada para outros BKOs')
    detail_changes += 1
else:
    print('  AVISO: bloco de UI do Responsável BKO não encontrado')

with open(detail_path, 'w', encoding='utf-8') as f:
    f.write(detail)

print(f'\n  BKODetail.jsx: {detail_changes} alteração(ões)')

# ══════════════════════════════════════════════════════════════════════════════
# RESUMO
# ══════════════════════════════════════════════════════════════════════════════
total = app_changes + detail_changes
print(f'\n{"="*60}')
print(f'  TOTAL: {total} alteração(ões) aplicada(s)')
print(f'{"="*60}')
print('\nPronto! Rode: npm run dev')
print('\nComo funciona agora:')
print('  1. BKO-1 abre o cliente e clica "Assumir responsabilidade"')
print('     → Sistema verifica no banco se está livre')
print('     → Se livre: grava BKO-1 como responsável')
print('     → Se já tem outro: mostra erro e atualiza o estado local')
print('')
print('  2. BKO-2 abre o mesmo cliente')
print('     → Vê: "🔒 Este cliente já está sendo atendido por BKO-1"')
print('     → Botão de assumir NÃO aparece')
print('')
print('  3. BKO-1 pode clicar "Liberar responsabilidade" quando quiser')
print('     → Aí sim o campo fica livre e outro BKO pode assumir')
print('')
print('  4. Sync genérico (editar observação, saldo, etc.) NÃO sobrescreve')
print('     a responsabilidade — campo gerenciado exclusivamente pelo botão')