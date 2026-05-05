# fix_startec_atribuicao.py
# Rode na raiz do projeto: python fix_startec_atribuicao.py
# Unifica atribuição Startec com o campo atribuido_a_id existente

import os

detail_path = 'src/views/bko/BKODetail.jsx'

print('\n=== Fix: Atribuição Startec → atribuido_a_id ===\n')

if not os.path.exists(detail_path):
    print(f'ERRO: {detail_path} não encontrado')
    exit()

with open(detail_path, 'r', encoding='utf-8') as f:
    detail = f.read()

changes = 0

# ── 1. Remover state separado de startec, usar atribuidoId existente ──────────
old_startec_state = """  // Atribuição Startec (supervisor_startec)
  const [operadoresStartec, setOperadoresStartec] = useState([]);
  const [atribStartecId, setAtribStartecId]       = useState(cliente.atribuido_startec_id || '');
  const [atribuindoStartec, setAtribuindoStartec] = useState(false);
  const [atribStartecMsg, setAtribStartecMsg]     = useState(null);"""
new_startec_state = """  // Atribuição Startec (usa mesmo campo atribuido_a_id)
  const [operadoresStartec, setOperadoresStartec] = useState([]);"""
if old_startec_state in detail:
    detail = detail.replace(old_startec_state, new_startec_state)
    print('  OK: state separado de startec removido')
    changes += 1

# ── 2. Remover função salvarAtribuicaoStartec separada ───────────────────────
old_fn_startec = """
  const salvarAtribuicaoStartec = async () => {
    const opSel = operadoresStartec.find(o => o.id === atribStartecId);
    setAtribuindoStartec(true);
    setAtribStartecMsg(null);
    const { error } = await supabase.from('bko_clientes')
      .update({ atribuido_startec_id: atribStartecId || null, atribuido_startec_nome: opSel?.nome || null })
      .eq('id', cliente.id);
    setAtribuindoStartec(false);
    if (error) { setAtribStartecMsg({ t: 'error', text: 'Erro ao atribuir.' }); return; }
    dispatch({ type: 'UPD', c: { ...cliente, atribuido_startec_id: atribStartecId || null, atribuido_startec_nome: opSel?.nome || null } });
    setAtribStartecMsg({ t: 'success', text: `Operação atribuída a ${opSel?.nome || 'ninguém'}!` });
  };"""
if old_fn_startec in detail:
    detail = detail.replace(old_fn_startec, '')
    print('  OK: função salvarAtribuicaoStartec removida')
    changes += 1

# ── 3. Substituir bloco de atribuição Startec para usar atribuidoId ───────────
old_startec_block = """            {/* Atribuição Startec — supervisor_startec atribui operadores */}
            {podeAtribuirStartec && (
              <div style={{ marginBottom: 16, padding: 14, background: 'rgba(5,150,105,.08)', borderRadius: 10, border: '1px solid rgba(5,150,105,.2)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', marginBottom: 8 }}>⚡ Atribuir à Operação Startec</div>
                {operadoresStartec.length === 0 ? (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Nenhum operador Startec cadastrado ainda.</div>
                ) : (
                  <>
                    <select className="sel" style={{ marginBottom: 8 }} value={atribStartecId} onChange={e => setAtribStartecId(e.target.value)}>
                      <option value="">— Sem atribuição —</option>
                      {operadoresStartec.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                    </select>
                    {atribStartecMsg && <div style={{ fontSize: 11, padding: '6px 10px', borderRadius: 7, marginBottom: 8, background: atribStartecMsg.t === 'success' ? 'var(--success-dim)' : 'var(--danger-dim)', color: atribStartecMsg.t === 'success' ? 'var(--success)' : 'var(--danger)' }}>{atribStartecMsg.text}</div>}
                    <button style={{ width: '100%', padding: '8px 0', borderRadius: 8, background: '#059669', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', opacity: atribuindoStartec ? 0.7 : 1 }} onClick={salvarAtribuicaoStartec} disabled={atribuindoStartec}>{atribuindoStartec ? 'Salvando…' : '✓ Confirmar atribuição'}</button>
                  </>
                )}
              </div>
            )}"""
new_startec_block = """            {/* Atribuição Startec — usa mesmo campo atribuido_a_id */}
            {podeAtribuirStartec && (
              <div style={{ marginBottom: 16, padding: 14, background: 'rgba(5,150,105,.08)', borderRadius: 10, border: '1px solid rgba(5,150,105,.2)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', marginBottom: 8 }}>⚡ Atribuir à Operação Startec</div>
                {operadoresStartec.length === 0 ? (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Nenhum operador Startec cadastrado ainda.</div>
                ) : (
                  <>
                    <select className="sel" style={{ marginBottom: 8 }} value={atribuidoId} onChange={e => setAtribuidoId(e.target.value)}>
                      <option value="">— Sem atribuição —</option>
                      {operadoresStartec.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                    </select>
                    {atribMsg && <div style={{ fontSize: 11, padding: '6px 10px', borderRadius: 7, marginBottom: 8, background: atribMsg.t === 'success' ? 'var(--success-dim)' : 'var(--danger-dim)', color: atribMsg.t === 'success' ? 'var(--success)' : 'var(--danger)' }}>{atribMsg.text}</div>}
                    <button style={{ width: '100%', padding: '8px 0', borderRadius: 8, background: '#059669', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', opacity: atribuindo ? 0.7 : 1 }} onClick={salvarAtribuicao} disabled={atribuindo}>{atribuindo ? 'Salvando…' : '✓ Confirmar atribuição'}</button>
                  </>
                )}
              </div>
            )}"""
if old_startec_block in detail:
    detail = detail.replace(old_startec_block, new_startec_block)
    print('  OK: bloco Startec agora usa atribuidoId e salvarAtribuicao')
    changes += 1

with open(detail_path, 'w', encoding='utf-8') as f:
    f.write(detail)

print(f'\n  BKODetail.jsx: {changes} alteração(ões) aplicada(s)')
print('\nPronto! Rode: npm run dev')