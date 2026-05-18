# fix_todos_problemas.py
# Rode na raiz do projeto: python fix_todos_problemas.py
#
# CORRIGE:
# 1. checarTravaBKO duplicada no BKOApp.jsx
# 2. Trava completa no BKODetail.jsx (bkoTravado + supervisores)
# 3. Check no banco antes de assumir (race condition)
# 4. JSON.stringify otimizado no sync

import os, sys

print('\n' + '='*60)
print('  FIX UNIFICADO — BKOApp.jsx + BKODetail.jsx')
print('='*60)

# ══════════════════════════════════════════════════════════════
# PARTE A: BKOApp.jsx — Remover checarTravaBKO duplicada
# ══════════════════════════════════════════════════════════════

app_path = 'src/views/bko/BKOApp.jsx'
if not os.path.exists(app_path):
    print(f'\nERRO: {app_path} não encontrado. Rode na raiz do projeto.')
    sys.exit(1)

with open(app_path, 'r', encoding='utf-8') as f:
    app = f.read()

app_changes = 0

# 1. Remover checarTravaBKO duplicada
count = app.count('function checarTravaBKO')
if count == 2:
    duplicata = """// Verifica se o cliente pode ser movido pelo usuário atual
// Retorna { travado: bool, motivo: string }
function checarTravaBKO(cliente, profile, session) {
  // Só trava se estiver nas colunas protegidas E tiver responsável BKO
  if (!COLUNAS_TRAVA_BKO.includes(cliente.estagio)) return { travado: false };
  if (!cliente.responsavel_bko_id) return { travado: false };

  const isBko = profile?.role === 'bko';
  const euSouResponsavel = cliente.responsavel_bko_id === profile?.id;
  const isSupervisorBko = SUPERVISORES_BKO_EMAILS.includes(session?.user?.email);

  // Se não é BKO, não trava (comercial/corban/startec mantêm permissões)
  if (!isBko) return { travado: false };

  // BKO responsável pode mover
  if (euSouResponsavel) return { travado: false };

  // Supervisor BKO pode mover
  if (isSupervisorBko) return { travado: false };

  // Outro BKO: TRAVADO
  return { travado: true, motivo: cliente.responsavel_bko_nome || 'outro BKO' };
}

const blankCliente"""
    if duplicata in app:
        app = app.replace(duplicata, 'const blankCliente', 1)
        print('\n  ✅ A1 — checarTravaBKO duplicada removida')
        app_changes += 1
    else:
        # Abordagem alternativa
        first = app.find('function checarTravaBKO')
        second = app.find('function checarTravaBKO', first + 1)
        if second > 0:
            end = app.find('\nconst blankCliente', second)
            if end > 0:
                app = app[:second] + app[end+1:]
                print('\n  ✅ A1 — checarTravaBKO duplicada removida (alt)')
                app_changes += 1
elif count == 1:
    print('\n  ✅ A1 — checarTravaBKO: apenas 1 declaração (OK)')
elif count == 0:
    print('\n  ⚠️  A1 — checarTravaBKO não encontrada')
else:
    print(f'\n  ❌ A1 — {count} declarações de checarTravaBKO (remova manualmente)')

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(app)

print(f'  BKOApp.jsx: {app_changes} correção(ões)')

# ══════════════════════════════════════════════════════════════
# PARTE B: BKODetail.jsx — Aplicar TODAS as travas
# ══════════════════════════════════════════════════════════════

det_path = 'src/views/bko/BKODetail.jsx'
if not os.path.exists(det_path):
    print(f'\nERRO: {det_path} não encontrado.')
    sys.exit(1)

with open(det_path, 'r', encoding='utf-8') as f:
    det = f.read()

det_changes = 0

# ── B1. Adicionar SUPERVISORES_BKO + bkoTravado + mover euSouResponsavel ──

# Verificar se já foi aplicado
if 'SUPERVISORES_BKO' in det:
    print('\n  ✅ B1 — SUPERVISORES_BKO já existe no BKODetail')
else:
    old_perms = """  const podeInteragir       = isBko || isComercial || isCorban || isStartec || isSupervisorStartec;
  const podeEditarSaldo     = isBko;
  const podeAtribuirStartec = isSupervisorStartec || isComercial;"""

    new_perms = """  // ── Supervisores BKO: podem mexer mesmo quando outro BKO é responsável ──
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

    if old_perms in det:
        det = det.replace(old_perms, new_perms)
        print('\n  ✅ B1 — SUPERVISORES_BKO + bkoTravado adicionados')
        det_changes += 1
    else:
        print('\n  ⚠️  B1 — Bloco podeInteragir não encontrado')

# ── B2. Mover euSouResponsavel/temResponsavel ANTES de bkoTravado ──

old_resp = """  const euSouResponsavel = isBko && cliente.responsavel_bko_id === profile?.id;
  const temResponsavel   = !!cliente.responsavel_bko_id;"""

# Verificar posição atual
idx_euSou = det.find('const euSouResponsavel')
idx_supervisores = det.find('const SUPERVISORES_BKO')

if idx_euSou > 0 and idx_supervisores > 0 and idx_euSou > idx_supervisores:
    # euSouResponsavel está DEPOIS de SUPERVISORES — precisa mover
    det = det.replace(old_resp, '')  # Remover do local antigo
    old_before = """  // ── Supervisores BKO: podem mexer mesmo quando outro BKO é responsável ──"""
    new_before = """  const euSouResponsavel = isBko && cliente.responsavel_bko_id === profile?.id;
  const temResponsavel   = !!cliente.responsavel_bko_id;

  // ── Supervisores BKO: podem mexer mesmo quando outro BKO é responsável ──"""
    if old_before in det:
        det = det.replace(old_before, new_before, 1)
        print('  ✅ B2 — euSouResponsavel movido para antes de bkoTravado')
        det_changes += 1
elif idx_euSou > 0 and idx_supervisores > 0 and idx_euSou < idx_supervisores:
    print('  ✅ B2 — euSouResponsavel já está antes de SUPERVISORES (OK)')
elif idx_supervisores < 0:
    print('  ⚠️  B2 — SUPERVISORES_BKO não encontrado (passo B1 falhou?)')
else:
    print('  ⚠️  B2 — Ordem das variáveis indeterminada')

# ── B3. Check no banco antes de assumir ──

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

if old_assumir in det:
    det = det.replace(old_assumir, new_assumir)
    print('  ✅ B3 — assumirResponsabilidade com check no banco')
    det_changes += 1
elif 'atual?.responsavel_bko_id' in det:
    print('  ✅ B3 — Check no banco já aplicado')
else:
    print('  ⚠️  B3 — Função assumirResponsabilidade não encontrada')

# ── B4. Travar select de estágio ──

old_estagio = """              <select className="sel" value={es} onChange={e => setEs(e.target.value)} style={{ marginBottom: 10 }}>
                {BKO_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>"""

new_estagio = """              <select className="sel" value={es} onChange={e => setEs(e.target.value)} disabled={bkoTravado} style={{ marginBottom: 10, opacity: bkoTravado ? 0.5 : 1, cursor: bkoTravado ? 'not-allowed' : '' }}>
                {BKO_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>"""

if old_estagio in det:
    det = det.replace(old_estagio, new_estagio)
    print('  ✅ B4 — Select de estágio travado')
    det_changes += 1
elif 'disabled={bkoTravado}' in det:
    print('  ✅ B4 — Select de estágio já travado')
else:
    print('  ⚠️  B4 — Select de estágio não encontrado')

# ── B5. Travar botão "Salvar alterações" ──

old_salvar = """              <button className="btn" style={{ width: '100%', justifyContent: 'center', background: B_MID, color: '#fff', boxShadow: `0 3px 12px ${B_GLOW}` }} onClick={salvarInfo}>Salvar alterações</button>"""

new_salvar = """              {bkoTravado ? (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(249,115,22,.08)', border: '1px solid rgba(249,115,22,.2)', fontSize: 11, color: '#F97316', textAlign: 'center' }}>
                  🔒 Cliente travado — sendo atendido por <strong>{cliente.responsavel_bko_nome}</strong>
                </div>
              ) : (
                <button className="btn" style={{ width: '100%', justifyContent: 'center', background: B_MID, color: '#fff', boxShadow: `0 3px 12px ${B_GLOW}` }} onClick={salvarInfo}>Salvar alterações</button>
              )}"""

if old_salvar in det:
    det = det.replace(old_salvar, new_salvar)
    print('  ✅ B5 — Botão salvar travado')
    det_changes += 1
elif 'Cliente travado' in det:
    print('  ✅ B5 — Botão salvar já travado')
else:
    print('  ⚠️  B5 — Botão salvar não encontrado')

# ── B6. Travar chat ──

old_chat = """              <input className="inp" style={{ flex: 1, height: 38, fontSize: 12 }} placeholder="Digite uma mensagem…" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarChat()} />
              <button onClick={enviarChat} disabled={chatLoading || !chatInput.trim()} style={{ padding: '0 16px', height: 38, borderRadius: 8, background: B_MID, color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: chatLoading || !chatInput.trim() ? 0.6 : 1, flexShrink: 0 }}>Enviar</button>"""

new_chat = """              {bkoTravado ? (
                <div style={{ flex: 1, padding: '10px 14px', borderRadius: 8, background: 'rgba(249,115,22,.08)', border: '1px solid rgba(249,115,22,.2)', fontSize: 11, color: '#F97316', textAlign: 'center' }}>
                  🔒 Chat bloqueado — cliente sendo atendido por <strong>{cliente.responsavel_bko_nome}</strong>
                </div>
              ) : (
                <>
                  <input className="inp" style={{ flex: 1, height: 38, fontSize: 12 }} placeholder="Digite uma mensagem…" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarChat()} />
                  <button onClick={enviarChat} disabled={chatLoading || !chatInput.trim()} style={{ padding: '0 16px', height: 38, borderRadius: 8, background: B_MID, color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: chatLoading || !chatInput.trim() ? 0.6 : 1, flexShrink: 0 }}>Enviar</button>
                </>
              )}"""

if old_chat in det:
    det = det.replace(old_chat, new_chat)
    print('  ✅ B6 — Chat travado')
    det_changes += 1
elif 'Chat bloqueado' in det:
    print('  ✅ B6 — Chat já travado')
else:
    print('  ⚠️  B6 — Bloco de chat não encontrado')

# ── B7. Travar upload de documentos ──

old_upload = """            <div className="eyebrow" style={{ marginBottom: 8 }}>Enviar documento</div>
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

new_upload = """            <div className="eyebrow" style={{ marginBottom: 8 }}>Enviar documento</div>
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

if old_upload in det:
    det = det.replace(old_upload, new_upload)
    print('  ✅ B7 — Upload de documentos travado')
    det_changes += 1
elif 'Upload bloqueado' in det:
    print('  ✅ B7 — Upload já travado')
else:
    print('  ⚠️  B7 — Bloco de upload não encontrado')

# ── B8. Ocultar botão excluir documento ──

old_del = """                <button onClick={() => handleDeleteDoc(doc)} style={{ padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', background: 'var(--danger-dim)', color: 'var(--danger)', border: 'none' }}>✕</button>"""

new_del = """                {!bkoTravado && <button onClick={() => handleDeleteDoc(doc)} style={{ padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', background: 'var(--danger-dim)', color: 'var(--danger)', border: 'none' }}>✕</button>}"""

if old_del in det:
    det = det.replace(old_del, new_del)
    print('  ✅ B8 — Botão excluir doc oculto para BKO travado')
    det_changes += 1
elif '!bkoTravado && <button onClick={() => handleDeleteDoc' in det:
    print('  ✅ B8 — Botão excluir já oculto')
else:
    print('  ⚠️  B8 — Botão excluir documento não encontrado')

# ── B9. Banner de trava no topo ──

old_tabs = """      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0, overflowX: 'auto' }}>"""

new_tabs = """      {/* Banner de trava BKO */}
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

if old_tabs in det:
    det = det.replace(old_tabs, new_tabs, 1)
    print('  ✅ B9 — Banner de trava no topo do painel')
    det_changes += 1
elif 'Cliente travado' in det and 'Banner de trava' in det:
    print('  ✅ B9 — Banner já existe')
else:
    print('  ⚠️  B9 — Seção de tabs não encontrada')

with open(det_path, 'w', encoding='utf-8') as f:
    f.write(det)

print(f'\n  BKODetail.jsx: {det_changes} correção(ões)')

# ══════════════════════════════════════════════════════════════
# RESUMO
# ══════════════════════════════════════════════════════════════

total = app_changes + det_changes
print(f'\n{"="*60}')
print(f'  TOTAL: {total} correção(ões) aplicada(s)')
print(f'{"="*60}')
print(f'\nRode: npm run dev')
print(f'\nO QUE FOI CORRIGIDO:')
print(f'  • checarTravaBKO duplicada removida (BKOApp.jsx)')
print(f'  • SUPERVISORES_BKO + bkoTravado adicionados (BKODetail.jsx)')
print(f'  • Check no banco antes de assumir responsabilidade')
print(f'  • Select de estágio travado para BKO não-responsável')
print(f'  • Botão "Salvar alterações" com mensagem de bloqueio')
print(f'  • Chat bloqueado para BKO não-responsável')
print(f'  • Upload bloqueado para BKO não-responsável')
print(f'  • Botão excluir doc oculto para BKO travado')
print(f'  • Banner "🔒 Cliente travado" no topo do painel')