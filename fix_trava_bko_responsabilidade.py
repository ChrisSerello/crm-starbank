# fix_trava_bko_responsabilidade.py
# Rode na raiz do projeto: python fix_trava_bko_responsabilidade.py
#
# IMPLEMENTA: Quando um BKO assume responsabilidade, o cliente fica TRAVADO
# para outros BKOs. Só podem mexer:
#   - O BKO responsável
#   - Os 3 supervisores BKO (edson, vera, maria)
#   - Perfis comercial/corban/startec (mantêm suas permissões normais)
#
# O que fica BLOQUEADO para BKO não-responsável e não-supervisor:
#   - Mover estágio
#   - Editar saldo devedor
#   - Adicionar observações
#   - Enviar/excluir documentos
#   - Enviar mensagens no chat
#   - Editar dados básicos (já era bloqueado, mas agora com mensagem clara)

import os, sys

path = 'src/views/bko/BKODetail.jsx'
if not os.path.exists(path):
    print(f'ERRO: {path} não encontrado. Rode na raiz do projeto.')
    sys.exit(1)

with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

changes = 0

# ══════════════════════════════════════════════════════════════════════════════
# 1. ADICIONAR CONSTANTES DE SUPERVISORES BKO + FLAG bkoTravado
# ══════════════════════════════════════════════════════════════════════════════

old_permissions = """  const podeInteragir       = isBko || isComercial || isCorban || isStartec || isSupervisorStartec;
  const podeEditarSaldo     = isBko;
  const podeAtribuirStartec = isSupervisorStartec || isComercial;"""

new_permissions = """  // ── Supervisores BKO: podem mexer mesmo quando outro BKO é responsável ──
  const SUPERVISORES_BKO = [
    'edson@starbank.tec.br',
    'vera.marques@starbank.tec.br',
    'maria.cerqueira@starbank.tec.br',
  ];
  const isSupervisorBko = SUPERVISORES_BKO.includes(session?.user?.email);

  // ── TRAVA BKO: quando tem responsável e NÃO sou eu nem supervisor, TUDO bloqueado ──
  const bkoTravado = isBko && temResponsavel && !euSouResponsavel && !isSupervisorBko;

  const podeInteragir       = (isBko || isComercial || isCorban || isStartec || isSupervisorStartec) && !bkoTravado;
  const podeEditarSaldo     = isBko && !bkoTravado;
  const podeAtribuirStartec = isSupervisorStartec || isComercial;"""

if old_permissions in code:
    code = code.replace(old_permissions, new_permissions)
    print('  ✅ 1/7 — Constantes SUPERVISORES_BKO + flag bkoTravado adicionadas')
    changes += 1
else:
    print('  ⚠️  1/7 — Bloco de permissões não encontrado')

# ══════════════════════════════════════════════════════════════════════════════
# 2. MOVER euSouResponsavel/temResponsavel PARA ANTES DE podeInteragir
#    (eles precisam existir antes de bkoTravado ser calculado)
# ══════════════════════════════════════════════════════════════════════════════

# Remover as declarações do local antigo (depois de podeEditar)
old_resp_vars = """  const euSouResponsavel = isBko && cliente.responsavel_bko_id === profile?.id;
  const temResponsavel   = !!cliente.responsavel_bko_id;"""

# Verificar se existem no local antigo
if old_resp_vars in code:
    code = code.replace(old_resp_vars, '')
    print('  ✅ 2/7 — euSouResponsavel/temResponsavel removidos do local antigo')
    changes += 1
else:
    print('  ⚠️  2/7 — euSouResponsavel/temResponsavel já foram movidos ou não encontrados')

# Inserir ANTES do bloco de permissões (antes de SUPERVISORES_BKO)
old_before_supervisores = """  // ── Supervisores BKO: podem mexer mesmo quando outro BKO é responsável ──"""
new_before_supervisores = """  const euSouResponsavel = isBko && cliente.responsavel_bko_id === profile?.id;
  const temResponsavel   = !!cliente.responsavel_bko_id;

  // ── Supervisores BKO: podem mexer mesmo quando outro BKO é responsável ──"""

if old_before_supervisores in code:
    code = code.replace(old_before_supervisores, new_before_supervisores, 1)
    print('  ✅ 3/7 — euSouResponsavel/temResponsavel movidos para antes de bkoTravado')
    changes += 1
else:
    print('  ⚠️  3/7 — Inserção de euSouResponsavel antes de SUPERVISORES_BKO falhou')

# ══════════════════════════════════════════════════════════════════════════════
# 4. TRAVAR SELEÇÃO DE ESTÁGIO (aba Informações) — desabilitar quando bkoTravado
# ══════════════════════════════════════════════════════════════════════════════

old_estagio_select = """              <select className="sel" value={es} onChange={e => setEs(e.target.value)} style={{ marginBottom: 10 }}>
                {BKO_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>"""

new_estagio_select = """              <select className="sel" value={es} onChange={e => setEs(e.target.value)} disabled={bkoTravado} style={{ marginBottom: 10, opacity: bkoTravado ? 0.5 : 1, cursor: bkoTravado ? 'not-allowed' : '' }}>
                {BKO_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>"""

if old_estagio_select in code:
    code = code.replace(old_estagio_select, new_estagio_select)
    print('  ✅ 4/7 — Select de estágio travado para BKO não-responsável')
    changes += 1
else:
    print('  ⚠️  4/7 — Select de estágio não encontrado')

# ══════════════════════════════════════════════════════════════════════════════
# 5. TRAVAR BOTÃO "Salvar alterações" (aba Informações)
# ══════════════════════════════════════════════════════════════════════════════

old_salvar_btn = """              <button className="btn" style={{ width: '100%', justifyContent: 'center', background: B_MID, color: '#fff', boxShadow: `0 3px 12px ${B_GLOW}` }} onClick={salvarInfo}>Salvar alterações</button>"""

new_salvar_btn = """              {bkoTravado ? (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(249,115,22,.08)', border: '1px solid rgba(249,115,22,.2)', fontSize: 11, color: '#F97316', textAlign: 'center' }}>
                  🔒 Cliente travado — sendo atendido por <strong>{cliente.responsavel_bko_nome}</strong>
                </div>
              ) : (
                <button className="btn" style={{ width: '100%', justifyContent: 'center', background: B_MID, color: '#fff', boxShadow: `0 3px 12px ${B_GLOW}` }} onClick={salvarInfo}>Salvar alterações</button>
              )}"""

if old_salvar_btn in code:
    code = code.replace(old_salvar_btn, new_salvar_btn)
    print('  ✅ 5/7 — Botão "Salvar alterações" travado + mensagem de bloqueio')
    changes += 1
else:
    print('  ⚠️  5/7 — Botão "Salvar alterações" não encontrado')

# ══════════════════════════════════════════════════════════════════════════════
# 6. TRAVAR CHAT — desabilitar input e botão enviar
# ══════════════════════════════════════════════════════════════════════════════

old_chat_input = """              <input className="inp" style={{ flex: 1, height: 38, fontSize: 12 }} placeholder="Digite uma mensagem…" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarChat()} />
              <button onClick={enviarChat} disabled={chatLoading || !chatInput.trim()} style={{ padding: '0 16px', height: 38, borderRadius: 8, background: B_MID, color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: chatLoading || !chatInput.trim() ? 0.6 : 1, flexShrink: 0 }}>Enviar</button>"""

new_chat_input = """              {bkoTravado ? (
                <div style={{ flex: 1, padding: '10px 14px', borderRadius: 8, background: 'rgba(249,115,22,.08)', border: '1px solid rgba(249,115,22,.2)', fontSize: 11, color: '#F97316', textAlign: 'center' }}>
                  🔒 Chat bloqueado — cliente sendo atendido por <strong>{cliente.responsavel_bko_nome}</strong>
                </div>
              ) : (
                <>
                  <input className="inp" style={{ flex: 1, height: 38, fontSize: 12 }} placeholder="Digite uma mensagem…" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarChat()} />
                  <button onClick={enviarChat} disabled={chatLoading || !chatInput.trim()} style={{ padding: '0 16px', height: 38, borderRadius: 8, background: B_MID, color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: chatLoading || !chatInput.trim() ? 0.6 : 1, flexShrink: 0 }}>Enviar</button>
                </>
              )}"""

if old_chat_input in code:
    code = code.replace(old_chat_input, new_chat_input)
    print('  ✅ 6/7 — Chat travado para BKO não-responsável')
    changes += 1
else:
    print('  ⚠️  6/7 — Bloco de chat input não encontrado')

# ══════════════════════════════════════════════════════════════════════════════
# 7. TRAVAR UPLOAD DE DOCUMENTOS — desabilitar upload e exclusão
# ══════════════════════════════════════════════════════════════════════════════

old_upload_label = """            <div className="eyebrow" style={{ marginBottom: 8 }}>Enviar documento</div>
            <label
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: 18, borderRadius: 10, cursor: 'pointer', border: `2px dashed ${uploading ? B_MID : 'var(--border-mid)'}`, background: uploading ? B_LIGHT : 'rgba(0,0,0,.02)', marginBottom: 12, transition: 'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = B_LIGHT; e.currentTarget.style.borderColor = B_MID; }}
              onMouseLeave={e => { if (!uploading) { e.currentTarget.style.background = 'rgba(0,0,0,.02)'; e.currentTarget.style.borderColor = 'var(--border-mid)'; } }}
            >
              <input type="file" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" />
              <div style={{ fontSize: 22 }}>{uploading ? '⏳' : '📤'}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{uploading ? 'Enviando…' : 'Clique para enviar'}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>PDF, Word, Imagens · Máx. 10MB</div>
            </label>"""

new_upload_label = """            <div className="eyebrow" style={{ marginBottom: 8 }}>Enviar documento</div>
            {bkoTravado ? (
              <div style={{ padding: '14px', borderRadius: 10, background: 'rgba(249,115,22,.08)', border: '1px solid rgba(249,115,22,.2)', fontSize: 11, color: '#F97316', textAlign: 'center', marginBottom: 12 }}>
                🔒 Upload bloqueado — cliente sendo atendido por <strong>{cliente.responsavel_bko_nome}</strong>
              </div>
            ) : (
              <label
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: 18, borderRadius: 10, cursor: 'pointer', border: `2px dashed ${uploading ? B_MID : 'var(--border-mid)'}`, background: uploading ? B_LIGHT : 'rgba(0,0,0,.02)', marginBottom: 12, transition: 'all .15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = B_LIGHT; e.currentTarget.style.borderColor = B_MID; }}
                onMouseLeave={e => { if (!uploading) { e.currentTarget.style.background = 'rgba(0,0,0,.02)'; e.currentTarget.style.borderColor = 'var(--border-mid)'; } }}
              >
                <input type="file" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" />
                <div style={{ fontSize: 22 }}>{uploading ? '⏳' : '📤'}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{uploading ? 'Enviando…' : 'Clique para enviar'}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>PDF, Word, Imagens · Máx. 10MB</div>
              </label>
            )}"""

if old_upload_label in code:
    code = code.replace(old_upload_label, new_upload_label)
    print('  ✅ 7/7 — Upload de documentos travado para BKO não-responsável')
    changes += 1
else:
    print('  ⚠️  7/7 — Bloco de upload não encontrado')

# ══════════════════════════════════════════════════════════════════════════════
# 8. TRAVAR BOTÃO EXCLUIR DOCUMENTO
# ══════════════════════════════════════════════════════════════════════════════

old_delete_doc = """                <button onClick={() => handleDeleteDoc(doc)} style={{ padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', background: 'var(--danger-dim)', color: 'var(--danger)', border: 'none' }}>✕</button>"""

new_delete_doc = """                {!bkoTravado && <button onClick={() => handleDeleteDoc(doc)} style={{ padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', background: 'var(--danger-dim)', color: 'var(--danger)', border: 'none' }}>✕</button>}"""

if old_delete_doc in code:
    code = code.replace(old_delete_doc, new_delete_doc)
    print('  ✅ 8 (bônus) — Botão excluir documento oculto para BKO travado')
    changes += 1
else:
    print('  ⚠️  8 — Botão excluir documento não encontrado')

# ══════════════════════════════════════════════════════════════════════════════
# 9. CHECK NO BANCO ANTES DE ASSUMIR (proteção contra race condition)
# ══════════════════════════════════════════════════════════════════════════════

old_assumir = """  const assumirResponsabilidade = async () => {
    setSalvandoResp(true); setRespMsg(null);
    const { error } = await supabase.from('bko_clientes')
      .update({ responsavel_bko_id: profile?.id, responsavel_bko_nome: profile?.nome })
      .eq('id', cliente.id);
    setSalvandoResp(false);
    if (error) { setRespMsg({ t: 'error', text: 'Erro ao assumir.' }); return; }
    dispatch({ type: 'UPD', c: { ...cliente, responsavel_bko_id: profile?.id, responsavel_bko_nome: profile?.nome } });
    setRespMsg({ t: 'success', text: 'Você é o responsável por este cliente.' });
  };"""

new_assumir = """  const assumirResponsabilidade = async () => {
    setSalvandoResp(true); setRespMsg(null);
    // PROTEÇÃO: verificar no banco se já tem responsável antes de gravar
    const { data: atual } = await supabase.from('bko_clientes')
      .select('responsavel_bko_id, responsavel_bko_nome')
      .eq('id', cliente.id)
      .single();
    if (atual?.responsavel_bko_id && atual.responsavel_bko_id !== profile?.id) {
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

if old_assumir in code:
    code = code.replace(old_assumir, new_assumir)
    print('  ✅ 9 (bônus) — assumirResponsabilidade agora verifica no banco antes')
    changes += 1
else:
    print('  ⚠️  9 — Função assumirResponsabilidade não encontrada (pode já ter sido corrigida)')

# ══════════════════════════════════════════════════════════════════════════════
# 10. BANNER DE TRAVA NO TOPO DO PAINEL (quando bkoTravado=true)
#     Inserir logo após o cabeçalho, antes das tabs
# ══════════════════════════════════════════════════════════════════════════════

old_tabs_section = """      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0, overflowX: 'auto' }}>"""

new_tabs_section = """      {/* Banner de trava BKO */}
      {bkoTravado && (
        <div style={{ padding: '10px 20px', background: 'rgba(249,115,22,.08)', borderBottom: '1px solid rgba(249,115,22,.2)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 14 }}>🔒</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#F97316' }}>Cliente travado</div>
            <div style={{ fontSize: 11, color: '#F97316' }}>Sendo atendido por <strong>{cliente.responsavel_bko_nome}</strong>. Você pode visualizar mas não editar.</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0, overflowX: 'auto' }}>"""

if old_tabs_section in code:
    code = code.replace(old_tabs_section, new_tabs_section)
    print('  ✅ 10 (bônus) — Banner de trava no topo do painel')
    changes += 1
else:
    print('  ⚠️  10 — Seção de tabs não encontrada')

# ══════════════════════════════════════════════════════════════════════════════
# SALVAR
# ══════════════════════════════════════════════════════════════════════════════

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print(f'\n{"="*60}')
print(f'  TOTAL: {changes} alteração(ões) aplicada(s) em BKODetail.jsx')
print(f'{"="*60}')
print()
print('Rode: npm run dev')
print()
print('COMO FUNCIONA AGORA:')
print()
print('  BKO-1 assume responsabilidade do cliente:')
print('    → Sistema verifica no banco se está livre (proteção race condition)')
print('    → Se livre: grava BKO-1 como responsável')
print()
print('  BKO-2 (não-supervisor) abre o mesmo cliente:')
print('    → Banner laranja no topo: "🔒 Cliente travado - Sendo atendido por BKO-1"')
print('    → Mover estágio: DESABILITADO')
print('    → Editar saldo: DESABILITADO')
print('    → Observações: DESABILITADO')
print('    → Chat: DESABILITADO')
print('    → Upload docs: DESABILITADO')
print('    → Excluir docs: OCULTO')
print('    → Botão salvar: SUBSTITUÍDO por mensagem de bloqueio')
print()
print('  SUPERVISORES (edson, vera, maria):')
print('    → NÃO são travados, mesmo sendo role=bko')
print('    → Podem fazer tudo normalmente')
print()
print('  Comercial / Corban / Startec:')
print('    → Mantêm suas permissões normais (não afetados pela trava)')
print()
print('  BKO-1 libera responsabilidade:')
print('    → Tudo volta ao normal, qualquer BKO pode assumir')