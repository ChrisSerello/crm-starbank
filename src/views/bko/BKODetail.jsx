/**
 * BKODetail — painel lateral de detalhes do cliente BKO
 *
 * MUDANÇAS nesta versão:
 * 1. Saldo Devedor → editável por bko, corban_bko e comercial
 * 2. Observações BKO → virou log imutável (como o chat):
 *    - qualquer um dos 3 perfis pode adicionar uma entrada
 *    - ninguém edita ou apaga mensagens já enviadas (nem o próprio autor)
 *    - cada entrada exibe: avatar + nome + badge do setor + data + texto
 * 3. Compatibilidade legada: se existir o campo antigo `observacoesBko` (string),
 *    ele é exibido como "Registro anterior" sem poder ser editado.
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabase';
import { gid, TODAY, fmtD, sinceD } from '../../utils';
import { DOC_STATUS } from '../../constants';
import { Avatar, StageTag } from '../../components/shared';

const B_MID   = '#3B5BDB';
const B_LIGHT = 'rgba(59,91,219,0.10)';
const B_GLOW  = 'rgba(59,91,219,0.28)';

const BKO_STAGES = [
  { id:'clientes_novos',   label:'Clientes Novos',              color:'#3B5BDB', bg:'rgba(59,91,219,.1)'  },
  { id:'saldo_andamento',  label:'Saldo em Andamento - BKO',    color:'#7C3AED', bg:'rgba(124,58,237,.1)' },
  { id:'em_negociacao',    label:'Em Negociação - Corban',      color:'#0EA5E9', bg:'rgba(14,165,233,.1)' },
  { id:'abertura_conta',   label:'Abertura de Conta - Corban',  color:'#10B981', bg:'rgba(16,185,129,.1)' },
  { id:'digitar_proposta', label:'Digitar Proposta - Corban',   color:'#F59E0B', bg:'rgba(245,158,11,.1)' },
  { id:'integrado',        label:'Integrado',                   color:'#22C55E', bg:'rgba(34,197,94,.1)'  },
  { id:'perdido',          label:'Perdido',                     color:'#EF4444', bg:'rgba(239,68,68,.1)'  },
];

// Mapa de cores e labels por setor — igual ao chat
const ROLE_COLOR = { comercial:'#3B5BDB', corban_bko:'#0EA5E9', bko:'#7C3AED' };
const ROLE_LABEL = { comercial:'Comercial', corban_bko:'Corban',  bko:'BKO'     };

export function BKODetail({ cliente, profile, session, dispatch, onClose }) {
  const [tab, setTab]         = useState('info');
  const [es, setEs]           = useState(cliente.estagio);
  const [ed, setEd]           = useState(cliente.documentoStatus || 'Não solicitado');
  const [saldo, setSaldo]     = useState(cliente.saldoDevedor || '');
  const [prefeituraEdit, setPrefeituraEdit] = useState(cliente.prefeitura || '');
  const [docs, setDocs]       = useState(cliente.documentos || []);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);

  // Atribuição (só Comercial)
  const [corbans, setCorbans]     = useState([]);
  const [atribuidoId, setAtribuidoId] = useState(cliente.atribuido_a_id || '');
  const [atribuindo, setAtribuindo]   = useState(false);
  const [atribMsg, setAtribMsg]       = useState(null);

  // Responsável BKO
  const [respMsg, setRespMsg]         = useState(null);
  const [salvandoResp, setSalvandoResp] = useState(false);

  // Saldo — botão salvar
  const [salvandoSaldo, setSalvandoSaldo] = useState(false);
  const [saldoMsg, setSaldoMsg]           = useState(null);

  // Log de observações
  const [novaObs, setNovaObs] = useState('');

  // Chat
  const [chatMsgs, setChatMsgs]   = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const r            = profile?.role;
  const isBko        = r === 'bko';
  const isComercial  = r === 'comercial';
  const isCorban     = r === 'corban_bko';

  // Observações: qualquer um dos 3 perfis pode adicionar entradas
  const podeInteragir = isBko || isComercial || isCorban;
  // Saldo Devedor: apenas BKO pode editar
  const podeEditarSaldo = isBko;

  const euSouResponsavel = isBko && cliente.responsavel_bko_id === profile?.id;
  const temResponsavel   = !!cliente.responsavel_bko_id;

  // Log de observações (novo campo array) + compatibilidade com string legada
  const obsLog    = cliente.observacoesBkoLog || [];
  const obsLegada = !obsLog.length && cliente.observacoesBko ? cliente.observacoesBko : null;

  // ── Carregar corbans (só comercial) ──
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

  // ── Chat realtime ──
  useEffect(() => {
    supabase.from('bko_chat').select('*')
      .eq('cliente_id', cliente.id).order('created_at', { ascending: true })
      .then(({ data }) => setChatMsgs(data || []));

    const ch = supabase.channel(`chat_${cliente.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'bko_chat', filter: `cliente_id=eq.${cliente.id}`,
      }, p => setChatMsgs(prev => [...prev, p.new]))
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [cliente.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMsgs, tab]);

  // ── Ações ──

  const enviarChat = async () => {
    if (!chatInput.trim()) return;
    setChatLoading(true);
    await supabase.from('bko_chat').insert({
      cliente_id: cliente.id,
      user_id:    profile?.id,
      user_nome:  profile?.nome || 'Usuário',
      user_role:  r,
      mensagem:   chatInput.trim(),
    });
    setChatInput('');
    setChatLoading(false);
  };

  const salvarSaldo = async () => {
    setSalvandoSaldo(true);
    dispatch({ type: 'UPD', c: { ...cliente, saldoDevedor: saldo, prefeitura: prefeituraEdit } });
    setSalvandoSaldo(false);
    setSaldoMsg({ t: 'success', text: 'Saldo salvo!' });
    setTimeout(() => setSaldoMsg(null), 2500);
  };

  // Adiciona entrada ao log — imutável após envio
  const adicionarObs = () => {
    if (!novaObs.trim()) return;
    const entrada = {
      id:          gid(),
      texto:       novaObs.trim(),
      autor_nome:  profile?.nome || 'Usuário',
      autor_role:  r,
      data:        TODAY,
      dataHora:    new Date().toISOString(),
    };
    const novoLog = [...obsLog, entrada];
    dispatch({ type: 'UPD', c: { ...cliente, observacoesBkoLog: novoLog } });
    setNovaObs('');
  };

  const assumirResponsabilidade = async () => {
    setSalvandoResp(true);
    setRespMsg(null);
    const { error } = await supabase.from('bko_clientes')
      .update({ responsavel_bko_id: profile?.id, responsavel_bko_nome: profile?.nome })
      .eq('id', cliente.id);
    setSalvandoResp(false);
    if (error) { setRespMsg({ t: 'error', text: 'Erro ao assumir.' }); return; }
    dispatch({ type: 'UPD', c: { ...cliente, responsavel_bko_id: profile?.id, responsavel_bko_nome: profile?.nome } });
    setRespMsg({ t: 'success', text: 'Você é o responsável por este cliente.' });
  };

  const liberarResponsabilidade = async () => {
    if (!confirm('Liberar responsabilidade deste cliente?')) return;
    setSalvandoResp(true);
    await supabase.from('bko_clientes')
      .update({ responsavel_bko_id: null, responsavel_bko_nome: null })
      .eq('id', cliente.id);
    setSalvandoResp(false);
    dispatch({ type: 'UPD', c: { ...cliente, responsavel_bko_id: null, responsavel_bko_nome: null } });
    setRespMsg(null);
  };

  const salvarAtribuicao = async () => {
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

  const salvarInfo = () => {
    const upd = { ...cliente, estagio: es, documentoStatus: ed, saldoDevedor: saldo, documentos: docs, prefeitura: prefeituraEdit };
    if (es !== cliente.estagio) dispatch({ type: 'MOVE', cid: cliente.id, st: es, user: profile?.nome || 'Usuário' });
    dispatch({ type: 'UPD', c: upd });
    onClose();
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setUploadMsg({ t: 'error', text: 'Máximo 10MB.' }); return; }
    setUploading(true);
    setUploadMsg(null);
    const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `bko/${cliente.id}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from('documentos').upload(path, file);
    if (error) {
      const msg = error.message?.includes('Bucket') ? 'Bucket "documentos" não encontrado.'
        : error.message?.includes('security') || error.message?.includes('policy') ? 'Sem permissão para upload.'
        : `Erro: ${error.message}`;
      setUploadMsg({ t: 'error', text: msg });
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from('documentos').getPublicUrl(path);
    const novos = [...docs, { nome: file.name, path, url: publicUrl, data: TODAY, enviadoPor: profile?.nome }];
    setDocs(novos);
    dispatch({ type: 'UPD', c: { ...cliente, documentos: novos } });
    setUploadMsg({ t: 'success', text: `"${file.name}" enviado!` });
    setUploading(false);
    e.target.value = '';
  };

  const handleDeleteDoc = async (doc) => {
    if (!confirm(`Remover "${doc.nome}"?`)) return;
    await supabase.storage.from('documentos').remove([doc.path]);
    const novos = docs.filter(d => d.path !== doc.path);
    setDocs(novos);
    dispatch({ type: 'UPD', c: { ...cliente, documentos: novos } });
  };

  const openDoc = async (path) => {
    const { data } = await supabase.storage.from('documentos').createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const stg = BKO_STAGES.find(s => s.id === cliente.estagio);

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div className="spanel">
      {/* Cabeçalho */}
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', marginBottom: 4 }}>{cliente.nomeCliente}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cliente.cpfCliente} · {cliente.telefone || '—'}</div>
            <div style={{ marginTop: 7, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {stg && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: stg.bg, color: stg.color, fontWeight: 700 }}>{stg.label}</span>}
              {cliente.prefeitura && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(0,0,0,.05)', color: 'var(--text-secondary)', fontWeight: 600 }}>🏛 {cliente.prefeitura}</span>}
              {cliente.atribuido_a_nome && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: B_LIGHT, color: B_MID, fontWeight: 700 }}>→ {cliente.atribuido_a_nome}</span>}
              {cliente.responsavel_bko_nome && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(124,58,237,.1)', color: '#7C3AED', fontWeight: 700 }}>🔒 {cliente.responsavel_bko_nome}</span>}
              {cliente.saldoDevedor && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(16,185,129,.1)', color: '#10B981', fontWeight: 700 }}>💰 {cliente.saldoDevedor}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(0,0,0,.06)', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--text-muted)' }}>×</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0, overflowX: 'auto' }}>
        {[
          ['info',     'Informações'],
          ['bko',      'BKO'],
          ['activity', 'Atividades'],
          ['chat',     'Chat'],
          ['docs',     `Documentos${docs.length > 0 ? ` (${docs.length})` : ''}`],
        ].map(([id, lb]) => (
          <button key={id} className={`ptab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)} style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{lb}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

        {/* ══════════════════ ABA: INFORMAÇÕES ══════════════════ */}
        {tab === 'info' && (
          <div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
              {[
                ['CPF',             cliente.cpfCliente || '—'],
                ['Telefone',        cliente.telefone || '—'],
                ['Data entrada',    fmtD(cliente.dataEntrada)],
                ['Criado por',      cliente.criado_por_nome || '—'],
                ['Atribuído a',     cliente.atribuido_a_nome || 'Não atribuído'],
                ['Responsável BKO', cliente.responsavel_bko_nome || 'Sem responsável'],
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
            </div>

            {isComercial && (
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

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>Atualizar status</div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Estágio</label>
              <select className="sel" value={es} onChange={e => setEs(e.target.value)} style={{ marginBottom: 10 }}>
                {BKO_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Documento</label>
              <select className="sel" value={ed} onChange={e => setEd(e.target.value)} style={{ marginBottom: 14 }}>
                {DOC_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="btn" style={{ width: '100%', justifyContent: 'center', background: B_MID, color: '#fff', boxShadow: `0 3px 12px ${B_GLOW}` }} onClick={salvarInfo}>Salvar alterações</button>
            </div>
          </div>
        )}

        {/* ══════════════════ ABA: BKO ══════════════════ */}
        {tab === 'bko' && (
          <div>

            {/* Responsável BKO — apenas BKO pode assumir/liberar */}
            <div style={{ marginBottom: 16, padding: 14, background: 'rgba(124,58,237,.06)', borderRadius: 10, border: '1px solid rgba(124,58,237,.2)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', marginBottom: 8 }}>🔒 Responsável BKO</div>
              {temResponsavel ? (
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
              )}
              {respMsg && <div style={{ fontSize: 11, marginTop: 8, padding: '6px 10px', borderRadius: 7, background: respMsg.t === 'success' ? 'var(--success-dim)' : 'var(--danger-dim)', color: respMsg.t === 'success' ? 'var(--success)' : 'var(--danger)' }}>{respMsg.text}</div>}
            </div>

            {/* Banner de acesso */}
            <div style={{ padding: '9px 12px', background: B_LIGHT, borderRadius: 9, border: `1px solid ${B_MID}25`, marginBottom: 16, fontSize: 11, color: B_MID, fontWeight: 600 }}>
              💼 Campos visíveis e editáveis por Comercial, Corban e BKO
            </div>

            {/* ── SALDO DEVEDOR ── */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>
                Saldo Devedor
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="inp"
                  value={saldo}
                  onChange={e => setSaldo(e.target.value)}
                  placeholder="R$ 0,00"
                  readOnly={!podeEditarSaldo}
                  style={{ flex: 1, background: !podeEditarSaldo ? 'var(--bg-surface)' : '', cursor: !podeEditarSaldo ? 'not-allowed' : '' }}
                />
                {podeEditarSaldo && (
                  <button
                    onClick={salvarSaldo}
                    disabled={salvandoSaldo}
                    style={{ padding: '0 16px', borderRadius: 8, background: B_MID, color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0, opacity: salvandoSaldo ? 0.7 : 1 }}
                  >
                    {salvandoSaldo ? '…' : 'Salvar'}
                  </button>
                )}
              </div>
              {saldoMsg && <div style={{ fontSize: 11, marginTop: 6, color: 'var(--success)' }}>✓ {saldoMsg.text}</div>}
            </div>

            {/* ── OBSERVAÇÕES BKO — log imutável ── */}
            <div>
              {/* Título + contador */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
                  Observações
                </label>
                {(obsLog.length > 0 || obsLegada) && (
                  <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                    {obsLog.length + (obsLegada ? 1 : 0)} registro{obsLog.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Log de entradas — somente leitura */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 12, maxHeight: 320, overflowY: 'auto' }}>

                {/* Vazio */}
                {obsLog.length === 0 && !obsLegada && (
                  <div style={{ padding: '32px 0', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>📋</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nenhuma observação registrada ainda.</div>
                  </div>
                )}

                {/* Registro legado (string antiga) */}
                {obsLegada && (
                  <div style={{ borderBottom: obsLog.length ? '1px solid var(--border)' : 'none', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: 'rgba(90,70,50,.04)', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Registros anteriores</span>
                      <span style={{ fontSize: 9, padding: '1px 7px', borderRadius: 99, background: 'rgba(90,70,50,.08)', color: 'var(--text-faint)', fontWeight: 600, marginLeft: 'auto' }}>legado</span>
                    </div>
                    <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                      {obsLegada}
                    </div>
                  </div>
                )}

                {/* Entradas do novo log */}
                {obsLog.map((entrada, i) => {
                  const cor   = ROLE_COLOR[entrada.autor_role] || '#666';
                  const label = ROLE_LABEL[entrada.autor_role] || entrada.autor_role || '—';
                  const dataFormatada = entrada.dataHora
                    ? new Date(entrada.dataHora).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })
                    : fmtD(entrada.data);
                  return (
                    <div key={entrada.id || i} style={{ borderBottom: i < obsLog.length - 1 ? '1px solid var(--border)' : 'none', overflow: 'hidden' }}>
                      {/* Header colorido por setor */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: `${cor}0d`, borderBottom: `1px solid ${cor}20` }}>
                        <Avatar name={entrada.autor_nome || '?'} size={20} color={cor} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{entrada.autor_nome}</span>
                        <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 99, fontWeight: 700, background: `${cor}20`, color: cor }}>{label}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-faint)', marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>{dataFormatada}</span>
                      </div>
                      {/* Texto */}
                      <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                        {entrada.texto}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Área de nova observação */}
              {podeInteragir && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                  {/* Header com perfil de quem escreve */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: `${ROLE_COLOR[r] || B_MID}0d`, borderBottom: `1px solid ${ROLE_COLOR[r] || B_MID}20` }}>
                    <Avatar name={profile?.nome || '?'} size={20} color={ROLE_COLOR[r] || B_MID} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{profile?.nome}</span>
                    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 99, fontWeight: 700, background: `${ROLE_COLOR[r] || B_MID}20`, color: ROLE_COLOR[r] || B_MID }}>{ROLE_LABEL[r] || r}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-faint)' }}>Nova observação</span>
                  </div>
                  {/* Textarea sem borda própria */}
                  <textarea
                    value={novaObs}
                    onChange={e => setNovaObs(e.target.value)}
                    placeholder="Digite a observação aqui…"
                    onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) adicionarObs(); }}
                    style={{ width: '100%', display: 'block', padding: '10px 14px', border: 'none', outline: 'none', resize: 'vertical', minHeight: 80, fontFamily: 'var(--font)', fontSize: 12, lineHeight: 1.6, color: 'var(--text-primary)', background: 'var(--bg-card)', boxSizing: 'border-box' }}
                  />
                  {/* Footer com botão verde */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,.02)' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>Ctrl+Enter · não editável após gravar</span>
                    <button
                      onClick={adicionarObs}
                      disabled={!novaObs.trim()}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 600, cursor: novaObs.trim() ? 'pointer' : 'not-allowed', background: novaObs.trim() ? '#1E8F5E' : 'rgba(0,0,0,.06)', color: novaObs.trim() ? '#fff' : 'var(--text-muted)', transition: 'all .15s', boxShadow: novaObs.trim() ? '0 2px 8px rgba(30,143,94,.35)' : 'none' }}
                    >
                      Adicionar Observação
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ══════════════════ ABA: ATIVIDADES ══════════════════ */}
        {tab === 'activity' && (
          <div>
            {(cliente.activities || []).length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 12, color: 'var(--text-muted)' }}>Nenhuma atividade registrada.</div>
            )}
            {[...(cliente.activities || [])].reverse().map((a, i) => (
              <div key={a.id || i} style={{ display: 'flex', gap: 9, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: B_LIGHT, color: B_MID, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
                  {a.type === 'stage_change' ? '⇄' : '✎'}
                </div>
                <div style={{ flex: 1, paddingBottom: 9, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>{a.user}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{fmtD(a.date)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{a.text}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════ ABA: CHAT ══════════════════ */}
        {tab === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 300 }}>
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {chatMsgs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 12, color: 'var(--text-muted)' }}>Nenhuma mensagem ainda.</div>
              )}
              {chatMsgs.map((m, i) => {
                const isMe     = m.user_id === profile?.id;
                const roleColor = ROLE_COLOR[m.user_role] || B_MID;
                const roleLabel = ROLE_LABEL[m.user_role] || m.user_role || '';
                return (
                  <div key={m.id || i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                      <Avatar name={m.user_nome || '?'} size={18} color={roleColor} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: roleColor }}>
                        {m.user_nome}
                        {roleLabel && <span style={{ fontWeight: 400, color: 'var(--text-faint)', marginLeft: 4 }}>· {roleLabel}</span>}
                      </span>
                      <span style={{ fontSize: 9, color: 'var(--text-faint)' }}>
                        {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ maxWidth: '80%', padding: '8px 12px', borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px', background: isMe ? B_MID : 'var(--bg-surface)', color: isMe ? '#fff' : 'var(--text-primary)', fontSize: 12, lineHeight: 1.5, border: isMe ? 'none' : '1px solid var(--border)' }}>
                      {m.mensagem}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              <input className="inp" style={{ flex: 1, height: 38, fontSize: 12 }} placeholder="Digite uma mensagem…" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarChat()} />
              <button onClick={enviarChat} disabled={chatLoading || !chatInput.trim()} style={{ padding: '0 16px', height: 38, borderRadius: 8, background: B_MID, color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: chatLoading || !chatInput.trim() ? 0.6 : 1, flexShrink: 0 }}>Enviar</button>
            </div>
          </div>
        )}

        {/* ══════════════════ ABA: DOCUMENTOS ══════════════════ */}
        {tab === 'docs' && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Checklist para avançar</div>
              {[
                { key: 'cnh',         label: 'CNH' },
                { key: 'holerite1',   label: 'Último holerite (obrigatório)' },
                { key: 'holerite2',   label: '2º holerite (opcional)' },
                { key: 'holerite3',   label: '3º holerite (opcional)' },
                { key: 'printMargem', label: 'Print da margem' },
              ].map(doc => {
                const tem = docs.some(d => d.nome?.toLowerCase().includes(doc.key) || d.categoria === doc.key);
                return (
                  <div key={doc.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${tem ? '#10B981' : 'var(--border-mid)'}`, background: tem ? '#10B981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', flexShrink: 0 }}>{tem ? '✓' : ''}</div>
                    <span style={{ fontSize: 12, color: tem ? 'var(--text-primary)' : 'var(--text-muted)' }}>{doc.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="eyebrow" style={{ marginBottom: 8 }}>Enviar documento</div>
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

            {uploadMsg && (
              <div style={{ padding: '8px 12px', borderRadius: 7, marginBottom: 10, fontSize: 11, fontWeight: 500, background: uploadMsg.t === 'success' ? 'var(--success-dim)' : 'var(--danger-dim)', color: uploadMsg.t === 'success' ? 'var(--success)' : 'var(--danger)' }}>
                {uploadMsg.text}
              </div>
            )}

            {docs.map((doc, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 9, marginBottom: 7 }}>
                <span style={{ fontSize: 18 }}>📄</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nome}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtD(doc.data)} · {doc.enviadoPor}</div>
                </div>
                <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 10 }} onClick={() => openDoc(doc.path)}>↓ Abrir</button>
                <button onClick={() => handleDeleteDoc(doc)} style={{ padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', background: 'var(--danger-dim)', color: 'var(--danger)', border: 'none' }}>✕</button>
              </div>
            ))}
            {docs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: 'var(--text-muted)' }}>Nenhum documento ainda.</div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}