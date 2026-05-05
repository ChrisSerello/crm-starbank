# fix_startec_bkodetail.py
# Rode na raiz do projeto: python fix_startec_bkodetail.py

import os

detail_path = 'src/views/bko/BKODetail.jsx'

print('\n=== Fix: Roles Startec no BKODetail ===\n')

if not os.path.exists(detail_path):
    print(f'ERRO: {detail_path} não encontrado')
    exit()

with open(detail_path, 'r', encoding='utf-8') as f:
    detail = f.read()

changes = 0

# ── 1. Atualizar ROLE_COLOR e ROLE_LABEL ──────────────────────────────────────
old_role_color = "const ROLE_COLOR = { comercial:'#3B5BDB', corban_bko:'#0EA5E9', bko:'#7C3AED' };"
new_role_color = "const ROLE_COLOR = { comercial:'#3B5BDB', corban_bko:'#0EA5E9', bko:'#7C3AED', startec:'#059669', supervisor_startec:'#0D9488' };"
if old_role_color in detail:
    detail = detail.replace(old_role_color, new_role_color)
    print('  OK: ROLE_COLOR atualizado')
    changes += 1

old_role_label = "const ROLE_LABEL = { comercial:'Comercial', corban_bko:'Corban',  bko:'BKO'     };"
new_role_label = "const ROLE_LABEL = { comercial:'Comercial', corban_bko:'Corban', bko:'BKO', startec:'Startec', supervisor_startec:'Supervisor' };"
if old_role_label in detail:
    detail = detail.replace(old_role_label, new_role_label)
    print('  OK: ROLE_LABEL atualizado')
    changes += 1

# ── 2. Atualizar flags de role ────────────────────────────────────────────────
old_flags = """  const r            = profile?.role;
  const isBko        = r === 'bko';
  const isComercial  = r === 'comercial';
  const isCorban     = r === 'corban_bko';

  // Observações: qualquer um dos 3 perfis pode adicionar entradas
  const podeInteragir = isBko || isComercial || isCorban;
  // Saldo Devedor: apenas BKO pode editar
  const podeEditarSaldo = isBko;"""
new_flags = """  const r                   = profile?.role;
  const isBko               = r === 'bko';
  const isComercial         = r === 'comercial';
  const isCorban            = r === 'corban_bko';
  const isStartec           = r === 'startec';
  const isSupervisorStartec = r === 'supervisor_startec';

  // Observações: todos os perfis podem adicionar entradas
  const podeInteragir   = isBko || isComercial || isCorban || isStartec || isSupervisorStartec;
  // Saldo Devedor: apenas BKO pode editar
  const podeEditarSaldo = isBko;
  // Atribuição Startec: supervisor_startec pode atribuir/reatribuir operadores startec
  const podeAtribuirStartec = isSupervisorStartec;"""
if old_flags in detail:
    detail = detail.replace(old_flags, new_flags)
    print('  OK: flags de role atualizadas')
    changes += 1

# ── 3. Adicionar state para lista de operadores startec ──────────────────────
old_atrib_state = """  // Atribuição (só Comercial)
  const [corbans, setCorbans]     = useState([]);
  const [atribuidoId, setAtribuidoId] = useState(cliente.atribuido_a_id || '');
  const [atribuindo, setAtribuindo]   = useState(false);
  const [atribMsg, setAtribMsg]       = useState(null);"""
new_atrib_state = """  // Atribuição Corban (só Comercial)
  const [corbans, setCorbans]         = useState([]);
  const [atribuidoId, setAtribuidoId] = useState(cliente.atribuido_a_id || '');
  const [atribuindo, setAtribuindo]   = useState(false);
  const [atribMsg, setAtribMsg]       = useState(null);

  // Atribuição Startec (supervisor_startec)
  const [operadoresStartec, setOperadoresStartec] = useState([]);
  const [atribStartecId, setAtribStartecId]       = useState(cliente.atribuido_startec_id || '');
  const [atribuindoStartec, setAtribuindoStartec] = useState(false);
  const [atribStartecMsg, setAtribStartecMsg]     = useState(null);"""
if old_atrib_state in detail:
    detail = detail.replace(old_atrib_state, new_atrib_state)
    print('  OK: state para operadores startec adicionado')
    changes += 1

# ── 4. Carregar operadores startec ───────────────────────────────────────────
old_load_corbans = """  // ── Carregar corbans (só comercial) ──
  useEffect(() => {
    if (!isComercial) return;
    supabase.rpc('get_bko_corbans').then(({ data, error }) => {
      if (error) {
        supabase.from('profiles').select('id,nome,email')
          .eq('modulo', 'bko').eq('role', 'corban_bko').order('nome')
          .then(({ data: d2 }) => setCorbans(d2 || []));
        return;
      }
      setCorbans(data || []);
    });
  }, [isComercial]);"""
new_load_corbans = """  // ── Carregar corbans (só comercial) ──
  useEffect(() => {
    if (!isComercial) return;
    supabase.rpc('get_bko_corbans').then(({ data, error }) => {
      if (error) {
        supabase.from('profiles').select('id,nome,email')
          .eq('modulo', 'bko').eq('role', 'corban_bko').order('nome')
          .then(({ data: d2 }) => setCorbans(d2 || []));
        return;
      }
      setCorbans(data || []);
    });
  }, [isComercial]);

  // ── Carregar operadores startec (só supervisor_startec) ──
  useEffect(() => {
    if (!isSupervisorStartec) return;
    supabase.from('profiles').select('id,nome,email')
      .eq('modulo', 'bko').eq('role', 'startec').order('nome')
      .then(({ data }) => setOperadoresStartec(data || []));
  }, [isSupervisorStartec]);"""
if old_load_corbans in detail:
    detail = detail.replace(old_load_corbans, new_load_corbans)
    print('  OK: carregamento de operadores startec adicionado')
    changes += 1

# ── 5. Função salvar atribuição startec ──────────────────────────────────────
old_salvar_atrib = """  const salvarAtribuicao = async () => {
    const corbanSel = corbans.find(c => c.id === atribuidoId);
    setAtribuindo(true);
    setAtribMsg(null);
    const { error } = await supabase.from('bko_clientes')
      .update({ atribuido_a_id: atribuidoId || null, atribuido_a_nome: corbanSel?.nome || null })
      .eq('id', cliente.id);
    setAtribuindo(false);
    if (error) { setAtribMsg({ t: 'error', text: 'Erro ao atribuir.' }); return; }
    dispatch({ type: 'UPD', c: { ...cliente, atribuido_a_id: atribuidoId || null, atribuido_a_nome: corbanSel?.nome || null } });
    setAtribMsg({ t: 'success', text: `Atribuído a ${corbanSel?.nome || 'ninguém'}!` });
  };"""
new_salvar_atrib = """  const salvarAtribuicao = async () => {
    const corbanSel = corbans.find(c => c.id === atribuidoId);
    setAtribuindo(true);
    setAtribMsg(null);
    const { error } = await supabase.from('bko_clientes')
      .update({ atribuido_a_id: atribuidoId || null, atribuido_a_nome: corbanSel?.nome || null })
      .eq('id', cliente.id);
    setAtribuindo(false);
    if (error) { setAtribMsg({ t: 'error', text: 'Erro ao atribuir.' }); return; }
    dispatch({ type: 'UPD', c: { ...cliente, atribuido_a_id: atribuidoId || null, atribuido_a_nome: corbanSel?.nome || null } });
    setAtribMsg({ t: 'success', text: `Atribuído a ${corbanSel?.nome || 'ninguém'}!` });
  };

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
if old_salvar_atrib in detail:
    detail = detail.replace(old_salvar_atrib, new_salvar_atrib)
    print('  OK: função salvarAtribuicaoStartec adicionada')
    changes += 1

# ── 6. Exibir atribuido_startec_nome no cabeçalho ────────────────────────────
old_header_badges = "              {cliente.atribuido_a_nome && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: B_LIGHT, color: B_MID, fontWeight: 700 }}>→ {cliente.atribuido_a_nome}</span>}"
new_header_badges = """              {cliente.atribuido_a_nome && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: B_LIGHT, color: B_MID, fontWeight: 700 }}>→ {cliente.atribuido_a_nome}</span>}
              {cliente.atribuido_startec_nome && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(5,150,105,.1)', color: '#059669', fontWeight: 700 }}>⚡ {cliente.atribuido_startec_nome}</span>}"""
if old_header_badges in detail:
    detail = detail.replace(old_header_badges, new_header_badges)
    print('  OK: badge atribuido_startec_nome no cabeçalho')
    changes += 1

# ── 7. Adicionar linha na tabela de info ─────────────────────────────────────
old_info_rows = "                ['Responsável BKO', cliente.responsavel_bko_nome || 'Sem responsável'],"
new_info_rows = """                ['Responsável BKO', cliente.responsavel_bko_nome || 'Sem responsável'],
                ['Operador Startec', cliente.atribuido_startec_nome || 'Não atribuído'],"""
if old_info_rows in detail:
    detail = detail.replace(old_info_rows, new_info_rows)
    print('  OK: linha Operador Startec na tabela de info')
    changes += 1

# ── 8. Bloco de atribuição Startec na aba info ───────────────────────────────
old_atrib_corban_block = """            {isComercial && (
              <div style={{ marginBottom: 16, padding: 14, background: B_LIGHT, borderRadius: 10, border: `1px solid ${B_MID}25` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: B_MID, marginBottom: 8 }}>👤 Atribuir cliente a Corban</div>
                <select className="sel" style={{ marginBottom: 8 }} value={atribuidoId} onChange={e => setAtribuidoId(e.target.value)}>
                  <option value="">— Sem atribuição —</option>
                  {corbans.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                {atribMsg && <div style={{ fontSize: 11, padding: '6px 10px', borderRadius: 7, marginBottom: 8, background: atribMsg.t === 'success' ? 'var(--success-dim)' : 'var(--danger-dim)', color: atribMsg.t === 'success' ? 'var(--success)' : 'var(--danger)' }}>{atribMsg.text}</div>}
                <button style={{ width: '100%', padding: '8px 0', borderRadius: 8, background: B_MID, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', opacity: atribuindo ? 0.7 : 1 }} onClick={salvarAtribuicao} disabled={atribuindo}>{atribuindo ? 'Salvando…' : '✓ Confirmar atribuição'}</button>
              </div>
            )}"""
new_atrib_corban_block = """            {isComercial && (
              <div style={{ marginBottom: 16, padding: 14, background: B_LIGHT, borderRadius: 10, border: `1px solid ${B_MID}25` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: B_MID, marginBottom: 8 }}>👤 Atribuir cliente a Corban</div>
                <select className="sel" style={{ marginBottom: 8 }} value={atribuidoId} onChange={e => setAtribuidoId(e.target.value)}>
                  <option value="">— Sem atribuição —</option>
                  {corbans.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                {atribMsg && <div style={{ fontSize: 11, padding: '6px 10px', borderRadius: 7, marginBottom: 8, background: atribMsg.t === 'success' ? 'var(--success-dim)' : 'var(--danger-dim)', color: atribMsg.t === 'success' ? 'var(--success)' : 'var(--danger)' }}>{atribMsg.text}</div>}
                <button style={{ width: '100%', padding: '8px 0', borderRadius: 8, background: B_MID, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', opacity: atribuindo ? 0.7 : 1 }} onClick={salvarAtribuicao} disabled={atribuindo}>{atribuindo ? 'Salvando…' : '✓ Confirmar atribuição'}</button>
              </div>
            )}

            {/* Atribuição Startec — supervisor_startec atribui operadores */}
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
if old_atrib_corban_block in detail:
    detail = detail.replace(old_atrib_corban_block, new_atrib_corban_block)
    print('  OK: bloco de atribuição Startec adicionado na aba info')
    changes += 1

with open(detail_path, 'w', encoding='utf-8') as f:
    f.write(detail)

print(f'\n  BKODetail.jsx: {changes} alteração(ões) aplicada(s)')
print('\nPronto! Agora rode o SQL e depois: npm run dev')