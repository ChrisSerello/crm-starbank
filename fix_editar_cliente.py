# fix_editar_cliente.py
# Rode na raiz do projeto: python fix_editar_cliente.py

import os

path = 'src/views/bko/BKODetail.jsx'
print('\n=== Fix: Edição de nome, CPF, telefone e prefeitura ===\n')

if not os.path.exists(path):
    print(f'ERRO: {path} não encontrado')
    exit()

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

changes = 0

# ── 1. Adicionar estados de edição após os estados existentes ─────────────────
old_states = """  const r                   = profile?.role;
  const isBko               = r === 'bko';
  const isComercial         = r === 'comercial';
  const isCorban            = r === 'corban_bko';
  const isStartec           = r === 'startec';
  const isSupervisorStartec = r === 'supervisor_startec';"""

new_states = """  const r                   = profile?.role;
  const isBko               = r === 'bko';
  const isComercial         = r === 'comercial';
  const isCorban            = r === 'corban_bko';
  const isStartec           = r === 'startec';
  const isSupervisorStartec = r === 'supervisor_startec';

  // Estados para edição de dados básicos
  const [editando, setEditando]     = useState(false);
  const [nomeEdit, setNomeEdit]     = useState(cliente.nomeCliente || '');
  const [cpfEdit, setCpfEdit]       = useState(cliente.cpfCliente || '');
  const [telEdit, setTelEdit]       = useState(cliente.telefone || '');
  const [salvandoEdit, setSalvandoEdit] = useState(false);
  const [editMsg, setEditMsg]       = useState(null);"""

if old_states in c:
    c = c.replace(old_states, new_states)
    print('  OK: estados de edição adicionados')
    changes += 1
else:
    print('  AVISO: bloco de roles não encontrado')

# ── 2. Adicionar lógica de permissão de edição ────────────────────────────────
old_permissoes = """  // Observações: todos os perfis podem adicionar entradas
  const podeInteragir   = isBko || isComercial || isCorban || isStartec || isSupervisorStartec;
  // Saldo Devedor: apenas BKO pode editar
  const podeEditarSaldo = isBko;
  // Atribuição Startec: supervisor_startec pode atribuir/reatribuir operadores startec
  const podeAtribuirStartec = isSupervisorStartec || isComercial;"""

new_permissoes = """  // Observações: todos os perfis podem adicionar entradas
  const podeInteragir   = isBko || isComercial || isCorban || isStartec || isSupervisorStartec;
  // Saldo Devedor: apenas BKO pode editar
  const podeEditarSaldo = isBko;
  // Atribuição Startec: supervisor_startec pode atribuir/reatribuir operadores startec
  const podeAtribuirStartec = isSupervisorStartec || isComercial;

  // ── Permissão de edição de dados básicos ──
  // Comercial: pode editar todos
  // BKO: não pode editar ninguém
  // Supervisor (Maicon/Nair): pode editar clientes que ele cadastrou + todos os startec
  // Startec/Corban: pode editar clientes que cadastrou ou que estão atribuídos a ele
  const podeEditar = (() => {
    if (isComercial && !profile?.is_supervisor) return true; // comercial normal edita tudo
    if (isBko) return false; // BKO não edita
    if (profile?.is_supervisor) {
      // supervisor edita os que ele cadastrou + todos os startec
      return cliente.criado_por_id === profile?.id || cliente.origem === 'startec';
    }
    if (isStartec || isCorban) {
      // edita os que cadastrou ou que estão atribuídos a ele
      return cliente.criado_por_id === profile?.id || cliente.atribuido_a_id === profile?.id;
    }
    return false;
  })();"""

if old_permissoes in c:
    c = c.replace(old_permissoes, new_permissoes)
    print('  OK: lógica de permissão adicionada')
    changes += 1
else:
    print('  AVISO: bloco de permissões não encontrado')

# ── 3. Adicionar função salvarEdicao após salvarSaldo ─────────────────────────
old_salvar_saldo_fn = """  const adicionarObs = () => {"""

new_salvar_saldo_fn = """  // Salvar edição de dados básicos com log de alterações
  const salvarEdicao = async () => {
    if (!nomeEdit.trim()) { setEditMsg({ t: 'error', text: 'Nome é obrigatório.' }); return; }
    setSalvandoEdit(true);
    setEditMsg(null);

    // Montar log das alterações
    const alteracoes = [];
    if (nomeEdit.trim() !== cliente.nomeCliente) alteracoes.push(`Nome: "${cliente.nomeCliente}" → "${nomeEdit.trim()}"`);
    if (cpfEdit.trim() !== (cliente.cpfCliente||'')) alteracoes.push(`CPF: "${cliente.cpfCliente}" → "${cpfEdit.trim()}"`);
    if (telEdit.trim() !== (cliente.telefone||'')) alteracoes.push(`Telefone: "${cliente.telefone||'—'}" → "${telEdit.trim()}"`);
    if (prefeituraEdit.trim() !== (cliente.prefeitura||'')) alteracoes.push(`Prefeitura: "${cliente.prefeitura||'—'}" → "${prefeituraEdit.trim()}"`);

    if (alteracoes.length === 0) { setEditando(false); setSalvandoEdit(false); return; }

    // Adicionar ao histórico de atividades
    const novaActivity = {
      id: gid(),
      type: 'edit',
      date: TODAY,
      user: profile?.nome || 'Usuário',
      text: `Editou dados: ${alteracoes.join(' · ')}`,
    };
    const activities = [...(cliente.activities || []), novaActivity];

    dispatch({
      type: 'UPD',
      c: {
        ...cliente,
        nomeCliente: nomeEdit.trim(),
        cpfCliente: cpfEdit.trim(),
        telefone: telEdit.trim(),
        prefeitura: prefeituraEdit.trim(),
        activities,
      }
    });

    setSalvandoEdit(false);
    setEditando(false);
    setEditMsg({ t: 'success', text: 'Dados atualizados!' });
    setTimeout(() => setEditMsg(null), 3000);
  };

  const cancelarEdicao = () => {
    setNomeEdit(cliente.nomeCliente || '');
    setCpfEdit(cliente.cpfCliente || '');
    setTelEdit(cliente.telefone || '');
    setPrefeituraEdit(cliente.prefeitura || '');
    setEditando(false);
    setEditMsg(null);
  };

  const adicionarObs = () => {"""

if old_salvar_saldo_fn in c:
    c = c.replace(old_salvar_saldo_fn, new_salvar_saldo_fn)
    print('  OK: função salvarEdicao adicionada')
    changes += 1
else:
    print('  AVISO: ponto de inserção da função não encontrado')

# ── 4. Substituir o cabeçalho do cliente por versão editável ─────────────────
old_header = """      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', marginBottom: 4 }}>{cliente.nomeCliente}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cliente.cpfCliente} · {cliente.telefone || '—'}</div>"""

new_header = """      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', marginBottom: 4 }}>{cliente.nomeCliente}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cliente.cpfCliente} · {cliente.telefone || '—'}</div>
            {editMsg&&<div style={{fontSize:11,marginTop:6,padding:'5px 10px',borderRadius:7,background:editMsg.t==='success'?'var(--success-dim)':'var(--danger-dim)',color:editMsg.t==='success'?'var(--success)':'var(--danger)'}}>{editMsg.text}</div>}"""

if old_header in c:
    c = c.replace(old_header, new_header)
    print('  OK: cabeçalho atualizado com feedback de edição')
    changes += 1
else:
    print('  AVISO: cabeçalho não encontrado')

# ── 5. Adicionar botão Editar ao lado do × no cabeçalho ──────────────────────
old_close_btn = """          <button onClick={onClose} style={{ background: 'rgba(0,0,0,.06)', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--text-muted)' }}>×</button>"""

new_close_btn = """          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            <button
              onClick={()=>podeEditar?setEditando(v=>!v):null}
              title={podeEditar?'Editar dados do cliente':'Sem permissão para editar'}
              style={{background:editando?'rgba(59,91,219,.1)':'rgba(0,0,0,.06)',border:`1px solid ${editando?'rgba(59,91,219,.3)':'var(--border)'}`,borderRadius:7,cursor:podeEditar?'pointer':'not-allowed',width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,color:editando?'#3B5BDB':podeEditar?'var(--text-muted)':'var(--border)',opacity:podeEditar?1:0.5,transition:'all .15s'}}>✎</button>
            <button onClick={onClose} style={{ background: 'rgba(0,0,0,.06)', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--text-muted)' }}>×</button>
          </div>"""

if old_close_btn in c:
    c = c.replace(old_close_btn, new_close_btn)
    print('  OK: botão ✎ adicionado no cabeçalho')
    changes += 1
else:
    print('  AVISO: botão fechar não encontrado')

# ── 6. Substituir campos de info por versão com modo edição ──────────────────
old_info_fields = """            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
              {[
                ['CPF',             cliente.cpfCliente || '—'],
                ['Telefone',        cliente.telefone || '—'],
                ['Data entrada',    fmtD(cliente.dataEntrada)],
                ['Criado em',       cliente.created_at ? fmtDH(cliente.created_at) : '—'],
                ['Criado por',      cliente.criado_por_nome || '—'],
                ['Atribuído a',     cliente.atribuido_a_nome || 'Não atribuído'],
                ['Responsável BKO', cliente.responsavel_bko_nome || 'Sem responsável'],
                ['Operador Startec', cliente.atribuido_startec_nome || 'Não atribuído'],
                ['Último contato',  fmtD(cliente.ultimoContato)],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Prefeitura / Órgão</label>
              <input className="inp" value={prefeituraEdit} onChange={e => setPrefeituraEdit(e.target.value)} placeholder="Nome da prefeitura…" />
            </div>"""

new_info_fields = """            {/* Modo visualização */}
            {!editando && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
                {[
                  ['CPF',             cliente.cpfCliente || '—'],
                  ['Telefone',        cliente.telefone || '—'],
                  ['Prefeitura',      cliente.prefeitura || '—'],
                  ['Data entrada',    fmtD(cliente.dataEntrada)],
                  ['Criado em',       cliente.created_at ? fmtDH(cliente.created_at) : '—'],
                  ['Criado por',      cliente.criado_por_nome || '—'],
                  ['Atribuído a',     cliente.atribuido_a_nome || 'Não atribuído'],
                  ['Responsável BKO', cliente.responsavel_bko_nome || 'Sem responsável'],
                  ['Operador Startec', cliente.atribuido_startec_nome || 'Não atribuído'],
                  ['Último contato',  fmtD(cliente.ultimoContato)],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{k}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Modo edição */}
            {editando && (
              <div style={{background:'var(--bg-card)',border:'1px solid rgba(59,91,219,.3)',borderRadius:10,padding:14,marginBottom:14,boxShadow:'0 0 0 3px rgba(59,91,219,.08)'}}>
                <div style={{fontSize:10,fontWeight:700,color:'#3B5BDB',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:12}}>✎ Editando dados do cliente</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                  <div style={{gridColumn:'1/-1'}}>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:4}}>Nome completo *</label>
                    <input className="inp" value={nomeEdit} onChange={e=>setNomeEdit(e.target.value)} placeholder="Nome completo"/>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:4}}>CPF</label>
                    <input className="inp" value={cpfEdit} onChange={e=>setCpfEdit(e.target.value)} placeholder="000.000.000-00"/>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:4}}>Telefone</label>
                    <input className="inp" value={telEdit} onChange={e=>setTelEdit(e.target.value)} placeholder="(00) 00000-0000"/>
                  </div>
                  <div style={{gridColumn:'1/-1'}}>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:4}}>Prefeitura / Órgão</label>
                    <input className="inp" value={prefeituraEdit} onChange={e=>setPrefeituraEdit(e.target.value)} placeholder="Nome da prefeitura…"/>
                  </div>
                </div>
                <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                  <button className="btn btn-ghost" onClick={cancelarEdicao} style={{fontSize:12}}>Cancelar</button>
                  <button className="btn" onClick={salvarEdicao} disabled={salvandoEdit}
                    style={{background:'#3B5BDB',color:'#fff',fontSize:12,boxShadow:'0 3px 12px rgba(59,91,219,.28)'}}>
                    {salvandoEdit?'Salvando…':'Salvar alterações'}
                  </button>
                </div>
              </div>
            )}

            {/* Prefeitura no modo visualização — campo editável separado só quando não está em modo edição */}
            {!editando && (
              <div style={{ marginBottom: 14, display:'none' }}>
                <input className="inp" value={prefeituraEdit} onChange={e => setPrefeituraEdit(e.target.value)} placeholder="Nome da prefeitura…" />
              </div>
            )}"""

if old_info_fields in c:
    c = c.replace(old_info_fields, new_info_fields)
    print('  OK: campos de info substituídos por versão com modo edição')
    changes += 1
else:
    print('  AVISO: bloco de campos de info não encontrado')
    # Tentar versão sem o campo "Criado em" (caso o patch anterior não tenha rodado)
    old_info_fields_v2 = """            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
              {[
                ['CPF',             cliente.cpfCliente || '—'],
                ['Telefone',        cliente.telefone || '—'],
                ['Data entrada',    fmtD(cliente.dataEntrada)],
                ['Criado por',      cliente.criado_por_nome || '—'],
                ['Atribuído a',     cliente.atribuido_a_nome || 'Não atribuído'],
                ['Responsável BKO', cliente.responsavel_bko_nome || 'Sem responsável'],
                ['Operador Startec', cliente.atribuido_startec_nome || 'Não atribuído'],
                ['Último contato',  fmtD(cliente.ultimoContato)],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Prefeitura / Órgão</label>
              <input className="inp" value={prefeituraEdit} onChange={e => setPrefeituraEdit(e.target.value)} placeholder="Nome da prefeitura…" />
            </div>"""
    if old_info_fields_v2 in c:
        c = c.replace(old_info_fields_v2, new_info_fields)
        print('  OK: campos de info substituídos (versão sem Criado em)')
        changes += 1
    else:
        print('  AVISO: nenhuma variante encontrada — verifique manualmente')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print(f'\n  BKODetail.jsx: {changes} alteração(ões) aplicada(s)')
print('\nPronto! Rode: npm run dev')
print('\nComo funciona:')
print('  - Botão ✎ aparece no cabeçalho para todos')
print('  - Desabilitado (cinza) para quem não tem permissão')
print('  - Habilitado para quem pode editar — clica e abre o formulário')
print('  - Ao salvar, registra as alterações no histórico de atividades do cliente')
print('\nPermissões:')
print('  Comercial normal → edita todos')
print('  BKO              → não edita ninguém')
print('  Supervisor       → edita próprios + todos Startec')
print('  Startec/Corban   → edita próprios + atribuídos a eles')