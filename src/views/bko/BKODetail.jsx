
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabase';
import { gid, TODAY, fmtD, sinceD } from '../../utils';
import { DOC_STATUS } from '../../constants';
import { Avatar, StageTag } from '../../components/shared';

const PIPELINE_PRINCIPAL_ID = '01981c9b-7715-454c-ae9e-7ae1e3a3ef14';

const fmtDH=(ts)=>{
  if(!ts) return '—';
  try{
    if(/^\d{4}-\d{2}-\d{2}$/.test(ts)){
      const [y,m,d]=ts.split('-');
      return `${d}/${m}/${y.slice(2)}`;
    }
    const d=new Date(ts);
    const data=d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',timeZone:'America/Sao_Paulo'});
    const hora=d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'});
    return `${data} às ${hora}`;
  }catch{ return ts; }
};

const B_MID   = '#3B5BDB';
const B_LIGHT = 'rgba(59,91,219,0.10)';
const B_GLOW  = 'rgba(59,91,219,0.28)';

// const BKO_STAGES = [
//   { id:'clientes_novos',       label:'Clientes Novos - Corban',                  color:'#3B5BDB', bg:'rgba(59,91,219,.1)'  },
//   { id:'saldo_andamento',      label:'BKO - Saldo Devedor',                      color:'#7C3AED', bg:'rgba(124,58,237,.1)' },
//   { id:'pendencia_BKO',        label:'Pendência Análise BKO',                    color:'#8e14b6', bg:'rgba(249,115,22,.1)' },
//   { id:'pendencia_financeiro', label:'Pendência Análise Financeira',              color:'#F97316', bg:'rgba(249,115,22,.1)' },
//   { id:'em_negociacao',        label:'Em negociação (Saldo Informado) - Corban', color:'#0EA5E9', bg:'rgba(14,165,233,.1)' },
//   { id:'abertura_conta',       label:'Abertura de conta - Interno',               color:'#10B981', bg:'rgba(16,185,129,.1)' },
//   { id:'digitar_proposta',     label:'Pronto para Digitar - Corban',              color:'#F59E0B', bg:'rgba(245,158,11,.1)' },
//   { id:'banksoft',             label:'Banksoft - Tratativas',                     color:'#EF4444', bg:'rgba(239,68,68,.1)'  },
//   { id:'integrado',            label:'Finalizado - Interno',                      color:'#22C55E', bg:'rgba(34,197,94,.1)'  },
//   { id:'perdido',              label:'Perdidos',                                  color:'#EF4444', bg:'rgba(239,68,68,.1)'  },
// ];

const ROLE_COLOR = { comercial:'#3B5BDB', corban_bko:'#0EA5E9', bko:'#7C3AED', startec:'#059669', supervisor_startec:'#0D9488' };
const ROLE_LABEL = { comercial:'Comercial', corban_bko:'Corban', bko:'BKO', startec:'Startec', supervisor_startec:'Supervisor' };

const MOTIVOS_PERDA_DETAIL = [
  'Taxa alta','Sem margem disponível','Cliente não atendeu','Cliente desistiu',
  'Concorrente mais vantajoso','Documentação incompleta','Reprovado na análise','Outro',
];

function MotivoPerdaModal({ onConfirm, onCancel }) {
  const [motivo, setMotivo] = React.useState('');
  const [obs,    setObs]    = React.useState('');
  const [erro,   setErro]   = React.useState(false);
  const confirmar = () => { if (!motivo) { setErro(true); return; } onConfirm(motivo, obs.trim()); };
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:20 }}>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'28px 28px 24px', width:'100%', maxWidth:400, boxShadow:'0 24px 64px rgba(0,0,0,.2)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, color:'var(--text-primary)', marginBottom:3 }}>Mover para Perdidos</div>
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>Informe o motivo para registrar no histórico</div>
          </div>
          <button onClick={onCancel} style={{ background:'rgba(0,0,0,.06)', border:'1px solid var(--border)', borderRadius:7, cursor:'pointer', width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, color:'var(--text-muted)', flexShrink:0 }}>×</button>
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>Motivo *</label>
          <select style={{ width:'100%', padding:'8px 10px', border:`1px solid ${erro?'var(--danger)':'var(--border)'}`, borderRadius:7, fontSize:13, color:'var(--text-primary)', background:'var(--bg-card)', outline:'none', fontFamily:'var(--font)' }}
            value={motivo} onChange={e=>{ setMotivo(e.target.value); setErro(false); }}>
            <option value="">— Selecione um motivo —</option>
            {MOTIVOS_PERDA_DETAIL.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          {erro && <div style={{ fontSize:11, color:'var(--danger)', marginTop:4 }}>⚠ Selecione um motivo</div>}
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>Observação (opcional)</label>
          <textarea style={{ width:'100%', padding:'8px 10px', border:'1px solid var(--border)', borderRadius:7, fontSize:13, color:'var(--text-primary)', background:'var(--bg-card)', outline:'none', resize:'vertical', minHeight:64, fontFamily:'var(--font)', lineHeight:1.5 }}
            value={obs} onChange={e=>setObs(e.target.value)} placeholder="Detalhe se necessário…"/>
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={onCancel} style={{ padding:'7px 14px', borderRadius:8, background:'var(--bg-surface)', border:'1px solid var(--border)', fontSize:13, cursor:'pointer', fontFamily:'var(--font)' }}>Cancelar</button>
          <button onClick={confirmar} style={{ padding:'7px 14px', borderRadius:8, background:'var(--danger)', color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>Confirmar perda</button>
        </div>
      </div>
    </div>
  );
}

export function BKODetail({ cliente, profile, session, dispatch, onClose }) {

  const [bkoStages, setBkoStages] = useState([]);
  useEffect(() => {
    supabase.from('bko_pipeline_estagios')
      .select('id, nome, cor, ordem')
      .eq('pipeline_id', PIPELINE_PRINCIPAL_ID)
      .eq('ativo', true)
      .order('ordem')
      .then(({ data }) => {
        setBkoStages((data || []).map(s => ({
          id: s.id,
          label: s.nome,
          color: s.cor,
          bg: `${s.cor}1A`,
        })));
      });
  }, []);
  const [tab, setTab]         = useState('info');
  const [es, setEs]           = useState(cliente.estagio);
  const [esUserChanged, setEsUserChanged] = useState(false);
  const [motivoPerdaModal, setMotivoPerdaModal] = useState(false);
  const [ed, setEd]           = useState(cliente.documentoStatus || 'Não solicitado');
  const [saldo, setSaldo]     = useState(cliente.saldoDevedor || '');
  const [prefeituraEdit, setPrefeituraEdit] = useState(cliente.prefeitura || '');
  const [docs, setDocs]       = useState(cliente.documentos || []);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);

  // ── Atribuição Corban ──
  const [corbans, setCorbans]             = useState([]);
  const [atribCorbanId, setAtribCorbanId] = useState(cliente.atribuido_a_id || '');
  const [atribuindo, setAtribuindo]       = useState(false);
  const [atribMsg, setAtribMsg]           = useState(null);

  // ── Atribuição Startec ──
  const [operadoresStartec, setOperadoresStartec] = useState([]);
  const [atribStartecId, setAtribStartecId]       = useState(cliente.atribuido_a_id || '');
  const [atribuindoStartec, setAtribuindoStartec] = useState(false);
  const [atribStartecMsg, setAtribStartecMsg]     = useState(null);

  const [respMsg, setRespMsg]             = useState(null);
  const [salvandoResp, setSalvandoResp]   = useState(false);
  const [salvandoSaldo, setSalvandoSaldo] = useState(false);
  const [saldoMsg, setSaldoMsg]           = useState(null);
  const [novaObs, setNovaObs]             = useState('');
  const [chatMsgs, setChatMsgs]           = useState([]);
  const [chatInput, setChatInput]         = useState('');
  const [chatLoading, setChatLoading]     = useState(false);
  const chatEndRef = useRef(null);

  // ── ✨ IA: Resumo automático ──────────────────────────────────────────────
  const [iaResumo,  setIaResumo]  = useState(null);
  const [iaLoading, setIaLoading] = useState(false);
  const [iaErro,    setIaErro]    = useState(null);

  const gerarResumo = async () => {
    setIaLoading(true);
    setIaErro(null);
    setIaResumo(null);

    try {
      const stgLabel = bkoStages.find(s => s.id === cliente.estagio)?.label || cliente.estagio;
      const diasSemContato = (() => {
        const ref = cliente.ultimoContato || cliente.dataEntrada;
        if (!ref) return null;
        const d = new Date(ref);
        if (isNaN(d)) return null;
        return Math.floor((Date.now() - d.getTime()) / 86400000);
      })();

      const obsLog = cliente.observacoesBkoLog || [];
      const ultimasObs = obsLog.length > 0
        ? obsLog.slice(-15).map(o => {
            const dataObs = o.dataHora
              ? new Date(o.dataHora).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })
              : o.data || '';
            return `[${o.autor_nome} (${ROLE_LABEL[o.autor_role]||o.autor_role}) - ${dataObs}]: ${o.texto}`;
          }).join('\n')
        : (cliente.observacoesBko || 'Nenhuma observação registrada.');

      const ultimasAtividades = (cliente.activities || []).slice(-8).map(a =>
        `${a.date} - ${a.user}: ${a.text}`
      ).join('\n') || 'Nenhuma atividade registrada.';

      const prompt = `Você é um assistente de backoffice financeiro especializado em crédito consignado.
Analise TODOS os dados abaixo, incluindo o conteúdo completo das observações, e gere um resumo executivo CURTO em português brasileiro (máximo 4 linhas).
O resumo deve responder: onde o cliente está, há quanto tempo, o que está pendente e qual é o próximo passo recomendado.
Se houver informações de saldo, produto, matrícula ou proposta nas observações, USE essas informações no resumo.
Seja direto e objetivo. Não use markdown, não use asteriscos, não use listas — escreva em texto corrido.

DADOS DO CLIENTE:
- Nome: ${cliente.nomeCliente}
- CPF: ${cliente.cpfCliente || '—'}
- Prefeitura/Órgão: ${cliente.prefeitura || '—'}
- Estágio atual: ${stgLabel}
- Saldo devedor (campo): ${cliente.saldoDevedor || 'não preenchido no campo'}
- Atribuído a: ${cliente.atribuido_a_nome || 'não atribuído'}
- Responsável BKO: ${cliente.responsavel_bko_nome || 'sem responsável'}
- Dias sem movimentação: ${diasSemContato !== null ? diasSemContato + ' dias' : 'não calculado'}
- Status documento: ${cliente.documentoStatus || '—'}

OBSERVAÇÕES COMPLETAS (leia com atenção — podem conter saldo, produto, proposta):
${ultimasObs}

ATIVIDADES RECENTES:
${ultimasAtividades}`;

      const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY;
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300,
          temperature: 0.3,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Erro ${res.status}`);
      }

      const data = await res.json();
      const texto = data?.choices?.[0]?.message?.content;
      if (!texto) throw new Error('Resposta vazia da IA.');
      setIaResumo(texto.trim());
    } catch (e) {
      setIaErro(e.message || 'Erro ao gerar resumo.');
    } finally {
      setIaLoading(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  const r                   = profile?.role;
  const isBko               = r === 'bko';
  const isComercial         = r === 'comercial';
  const isCorban            = r === 'corban_bko';
  const isStartec           = r === 'startec';
  const isSupervisorStartec = r === 'supervisor_startec';

  const [editando, setEditando]         = useState(false);
  const [nomeEdit, setNomeEdit]         = useState(cliente.nomeCliente || '');
  const [cpfEdit, setCpfEdit]           = useState(cliente.cpfCliente || '');
  const [telEdit, setTelEdit]           = useState(cliente.telefone || '');
  const [salvandoEdit, setSalvandoEdit] = useState(false);
  const [editMsg, setEditMsg]           = useState(null);

  const euSouResponsavel = isBko && cliente.responsavel_bko_id === profile?.id;
  const temResponsavel   = !!cliente.responsavel_bko_id;

  const SUPERVISORES_BKO = [
    'edson@starbank.tec.br','vera.marques@starbank.tec.br',
    'maria.cerqueira@starbank.tec.br','elisangela.pereira@starbank.tec.br',
  ];
  const isSupervisorBko = SUPERVISORES_BKO.includes(session?.user?.email);
  const bkoTravado = isBko && temResponsavel && !euSouResponsavel && !isSupervisorBko;

  const podeInteragir       = (isBko || isComercial || isCorban || isStartec || isSupervisorStartec) && !bkoTravado;
  const podeEditarSaldo     = isBko && !bkoTravado;
  const podeAtribuirStartec = isSupervisorStartec || isComercial;

  const podeEditar = (() => {
    if (isComercial && !profile?.is_supervisor) return true;
    if (isBko) return false;
    if (profile?.is_supervisor) return cliente.criado_por_id === profile?.id || cliente.origem === 'startec';
    if (isStartec || isCorban) return cliente.criado_por_id === profile?.id || cliente.atribuido_a_id === profile?.id;
    return false;
  })();

  const obsLog    = cliente.observacoesBkoLog || [];
  const obsLegada = !obsLog.length && cliente.observacoesBko ? cliente.observacoesBko : null;

  useEffect(() => {
    if (!isComercial) return;
    supabase.rpc('get_bko_corbans').then(({ data, error }) => {
      if (error) {
        supabase.from('profiles').select('id,nome,email').eq('modulo','bko').eq('role','corban_bko').order('nome')
          .then(({ data: d2 }) => setCorbans(d2 || []));
        return;
      }
      setCorbans(data || []);
    });
  }, [isComercial]);

  useEffect(() => {
    if (!isSupervisorStartec && !isComercial) return;
    supabase.from('profiles').select('id,nome,email').eq('modulo','bko').eq('role','startec').order('nome')
      .then(({ data }) => setOperadoresStartec(data || []));
  }, [isSupervisorStartec, isComercial]);

  useEffect(() => {
    supabase.from('bko_chat').select('*').eq('cliente_id', cliente.id).order('created_at', { ascending: true })
      .then(({ data }) => setChatMsgs(data || []));
    const ch = supabase.channel(`chat_${cliente.id}`)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'bko_chat', filter:`cliente_id=eq.${cliente.id}` },
        p => setChatMsgs(prev => [...prev, p.new]))
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [cliente.id]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMsgs, tab]);

  const enviarChat = async () => {
    if (!chatInput.trim()) return;
    setChatLoading(true);
    await supabase.from('bko_chat').insert({ cliente_id:cliente.id, user_id:profile?.id, user_nome:profile?.nome||'Usuário', user_role:r, mensagem:chatInput.trim() });
    setChatInput('');
    setChatLoading(false);
  };

  const salvarSaldo = async () => {
    setSalvandoSaldo(true);
    dispatch({ type:'UPD', c:{ ...cliente, saldoDevedor:saldo, prefeitura:prefeituraEdit } });
    setSalvandoSaldo(false);
    setSaldoMsg({ t:'success', text:'Saldo salvo!' });
    setTimeout(() => setSaldoMsg(null), 2500);
  };

  const salvarEdicao = async () => {
    if (!nomeEdit.trim()) { setEditMsg({ t:'error', text:'Nome é obrigatório.' }); return; }
    setSalvandoEdit(true); setEditMsg(null);
    const alteracoes = [];
    if (nomeEdit.trim() !== cliente.nomeCliente) alteracoes.push(`Nome: "${cliente.nomeCliente}" → "${nomeEdit.trim()}"`);
    if (cpfEdit.trim() !== (cliente.cpfCliente||'')) alteracoes.push(`CPF: "${cliente.cpfCliente}" → "${cpfEdit.trim()}"`);
    if (telEdit.trim() !== (cliente.telefone||'')) alteracoes.push(`Telefone: "${cliente.telefone||'—'}" → "${telEdit.trim()}"`);
    if (prefeituraEdit.trim() !== (cliente.prefeitura||'')) alteracoes.push(`Prefeitura: "${cliente.prefeitura||'—'}" → "${prefeituraEdit.trim()}"`);
    if (alteracoes.length === 0) { setEditando(false); setSalvandoEdit(false); return; }
    const novaActivity = { id:gid(), type:'edit', date:TODAY, user:profile?.nome||'Usuário', text:`Editou dados: ${alteracoes.join(' · ')}` };
    dispatch({ type:'UPD', c:{ ...cliente, nomeCliente:nomeEdit.trim(), cpfCliente:cpfEdit.trim(), telefone:telEdit.trim(), prefeitura:prefeituraEdit.trim(), activities:[...(cliente.activities||[]), novaActivity] } });
    setSalvandoEdit(false); setEditando(false);
    setEditMsg({ t:'success', text:'Dados atualizados!' });
    setTimeout(() => setEditMsg(null), 3000);
  };

  const cancelarEdicao = () => {
    setNomeEdit(cliente.nomeCliente||''); setCpfEdit(cliente.cpfCliente||'');
    setTelEdit(cliente.telefone||''); setPrefeituraEdit(cliente.prefeitura||'');
    setEditando(false); setEditMsg(null);
  };

  const adicionarObs = () => {
    if (!novaObs.trim()) return;
    const entrada = { id:gid(), texto:novaObs.trim(), autor_nome:profile?.nome||'Usuário', autor_role:r, data:TODAY, dataHora:new Date().toISOString() };
    dispatch({ type:'UPD', c:{ ...cliente, observacoesBkoLog:[...obsLog, entrada] } });
    setNovaObs('');
  };

  const assumirResponsabilidade = async () => {
    setSalvandoResp(true); setRespMsg(null);
    const { data: atual } = await supabase.from('bko_clientes').select('responsavel_bko_id,responsavel_bko_nome').eq('id', cliente.id).single();
    if (atual?.responsavel_bko_id && atual.responsavel_bko_id !== profile?.id) {
      setSalvandoResp(false);
      dispatch({ type:'UPD', c:{ ...cliente, responsavel_bko_id:atual.responsavel_bko_id, responsavel_bko_nome:atual.responsavel_bko_nome } });
      setRespMsg({ t:'error', text:`Este cliente já está com ${atual.responsavel_bko_nome||'outro BKO'}.` });
      return;
    }
    const { error } = await supabase.from('bko_clientes').update({ responsavel_bko_id:profile?.id, responsavel_bko_nome:profile?.nome }).eq('id', cliente.id);
    setSalvandoResp(false);
    if (error) { setRespMsg({ t:'error', text:'Erro ao assumir.' }); return; }
    dispatch({ type:'UPD', c:{ ...cliente, responsavel_bko_id:profile?.id, responsavel_bko_nome:profile?.nome } });
    setRespMsg({ t:'success', text:'Você é o responsável por este cliente.' });
  };

  const liberarResponsabilidade = async () => {
    if (!confirm('Liberar responsabilidade deste cliente?')) return;
    setSalvandoResp(true);
    await supabase.from('bko_clientes').update({ responsavel_bko_id:null, responsavel_bko_nome:null }).eq('id', cliente.id);
    setSalvandoResp(false);
    dispatch({ type:'UPD', c:{ ...cliente, responsavel_bko_id:null, responsavel_bko_nome:null } });
    setRespMsg(null);
  };

  const salvarAtribuicaoCorban = async () => {
    const corbanSel = corbans.find(c => c.id === atribCorbanId);
    setAtribuindo(true); setAtribMsg(null);
    const { error } = await supabase.from('bko_clientes').update({ atribuido_a_id:atribCorbanId||null, atribuido_a_nome:corbanSel?.nome||null }).eq('id', cliente.id);
    setAtribuindo(false);
    if (error) { setAtribMsg({ t:'error', text:'Erro ao atribuir.' }); return; }
    dispatch({ type:'UPD', c:{ ...cliente, atribuido_a_id:atribCorbanId||null, atribuido_a_nome:corbanSel?.nome||null } });
    setAtribMsg({ t:'success', text:`Atribuído a ${corbanSel?.nome||'ninguém'}!` });
  };

  const salvarAtribuicaoStartec = async () => {
    const opSel = operadoresStartec.find(o => o.id === atribStartecId);
    setAtribuindoStartec(true); setAtribStartecMsg(null);
    const { error } = await supabase.from('bko_clientes').update({ atribuido_a_id:atribStartecId||null, atribuido_a_nome:opSel?.nome||null }).eq('id', cliente.id);
    setAtribuindoStartec(false);
    if (error) { setAtribStartecMsg({ t:'error', text:'Erro ao atribuir.' }); return; }
    dispatch({ type:'UPD', c:{ ...cliente, atribuido_a_id:atribStartecId||null, atribuido_a_nome:opSel?.nome||null } });
    setAtribStartecMsg({ t:'success', text:`Atribuído a ${opSel?.nome||'ninguém'}!` });
  };

  const salvarInfo = () => {
    const estagioFinal = esUserChanged ? es : cliente.estagio;
    if (esUserChanged && es !== cliente.estagio) {
      if (es === 'perdido') { setMotivoPerdaModal(true); return; }
      dispatch({ type:'MOVE', cid:cliente.id, st:es, user:profile?.nome||'Usuário' });
      const { activities: _ignored, ...clienteSemActivities } = cliente;
      dispatch({ type:'UPD', c:{ ...clienteSemActivities, estagio:estagioFinal, documentoStatus:ed, saldoDevedor:saldo, documentos:docs, prefeitura:prefeituraEdit } });
    } else {
      dispatch({ type:'UPD', c:{ ...cliente, estagio:estagioFinal, documentoStatus:ed, saldoDevedor:saldo, documentos:docs, prefeitura:prefeituraEdit } });
    }
    onClose();
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10*1024*1024) { setUploadMsg({ t:'error', text:'Máximo 10MB.' }); return; }
    setUploading(true); setUploadMsg(null);
    const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]/g,'_');
    const path = `bko/${cliente.id}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from('documentos').upload(path, file);
    if (error) {
      const msg = error.message?.includes('Bucket') ? 'Bucket "documentos" não encontrado.'
        : error.message?.includes('security')||error.message?.includes('policy') ? 'Sem permissão para upload.'
        : `Erro: ${error.message}`;
      setUploadMsg({ t:'error', text:msg }); setUploading(false); return;
    }
    const { data:{ publicUrl } } = supabase.storage.from('documentos').getPublicUrl(path);
    const novos = [...docs, { nome:file.name, path, url:publicUrl, data:new Date().toISOString(), enviadoPor:profile?.nome }];
    setDocs(novos);
    dispatch({ type:'UPD', c:{ ...cliente, documentos:novos } });
    setUploadMsg({ t:'success', text:`"${file.name}" enviado!` });
    setUploading(false); e.target.value = '';
  };

  const handleDeleteDoc = async (doc) => {
    if (!confirm(`Remover "${doc.nome}"?`)) return;
    await supabase.storage.from('documentos').remove([doc.path]);
    const novos = docs.filter(d => d.path !== doc.path);
    setDocs(novos);
    dispatch({ type:'UPD', c:{ ...cliente, documentos:novos } });
  };

  const openDoc = async (path) => {
    const { data } = await supabase.storage.from('documentos').createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const stg = bkoStages.find(s => s.id === cliente.estagio);

  const confirmarPerdaComMotivo = (motivo, obs) => {
    dispatch({ type:'MOVE', cid:cliente.id, st:'perdido', user:profile?.nome||'Usuário', motivo, obs });
    setMotivoPerdaModal(false);
    setEsUserChanged(false);
  };

  return (
    <div className="spanel">
      {motivoPerdaModal && (
        <MotivoPerdaModal
          onConfirm={confirmarPerdaComMotivo}
          onCancel={()=>{ setMotivoPerdaModal(false); setEs(cliente.estagio); setEsUserChanged(false); }}
        />
      )}

      {/* ── Cabeçalho ── */}
      <div style={{ padding:'16px 20px 12px', borderBottom:'1px solid var(--border)', background:'var(--bg-card)', flexShrink:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--font-display)', marginBottom:4 }}>{cliente.nomeCliente}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>{cliente.cpfCliente} · {cliente.telefone||'—'}</div>
            {editMsg&&<div style={{fontSize:11,marginTop:6,padding:'5px 10px',borderRadius:7,background:editMsg.t==='success'?'var(--success-dim)':'var(--danger-dim)',color:editMsg.t==='success'?'var(--success)':'var(--danger)'}}>{editMsg.text}</div>}
            <div style={{ marginTop:7, display:'flex', gap:5, flexWrap:'wrap' }}>
              {stg&&<span style={{fontSize:10,padding:'2px 8px',borderRadius:99,background:stg.bg,color:stg.color,fontWeight:700}}>{stg.label}</span>}
              {cliente.prefeitura&&<span style={{fontSize:10,padding:'2px 8px',borderRadius:99,background:'rgba(0,0,0,.05)',color:'var(--text-secondary)',fontWeight:600}}>🏛 {cliente.prefeitura}</span>}
              {cliente.atribuido_a_nome&&<span style={{fontSize:10,padding:'2px 8px',borderRadius:99,background:B_LIGHT,color:B_MID,fontWeight:700}}>→ {cliente.atribuido_a_nome}</span>}
              {cliente.atribuido_startec_nome&&<span style={{fontSize:10,padding:'2px 8px',borderRadius:99,background:'rgba(5,150,105,.1)',color:'#059669',fontWeight:700}}>⚡ {cliente.atribuido_startec_nome}</span>}
              {cliente.responsavel_bko_nome&&<span style={{fontSize:10,padding:'2px 8px',borderRadius:99,background:'rgba(124,58,237,.1)',color:'#7C3AED',fontWeight:700}}>🔒 {cliente.responsavel_bko_nome}</span>}
              {cliente.saldoDevedor&&<span style={{fontSize:10,padding:'2px 8px',borderRadius:99,background:'rgba(16,185,129,.1)',color:'#10B981',fontWeight:700}}>💰 {cliente.saldoDevedor}</span>}
            </div>
          </div>

          {/* ── Botões do cabeçalho ── */}
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            {/* ✨ Botão Resumo IA */}
            <button
              onClick={gerarResumo}
              disabled={iaLoading}
              title="Resumo automático com IA"
              style={{
                background: iaResumo ? 'rgba(99,102,241,.12)' : 'rgba(0,0,0,.06)',
                border: `1px solid ${iaResumo ? 'rgba(99,102,241,.3)' : 'var(--border)'}`,
                borderRadius:7, cursor: iaLoading ? 'wait' : 'pointer',
                padding:'0 10px', height:28, display:'flex', alignItems:'center',
                gap:5, fontSize:11, fontWeight:600,
                color: iaResumo ? '#6366F1' : 'var(--text-muted)',
                transition:'all .15s', flexShrink:0,
              }}>
              <span style={{fontSize:12}}>{iaLoading ? '⏳' : '✨'}</span>
              {iaLoading ? 'Analisando…' : 'Resumo IA'}
            </button>

            <button onClick={()=>podeEditar?setEditando(v=>!v):null} title={podeEditar?'Editar dados do cliente':'Sem permissão para editar'}
              style={{background:editando?'rgba(59,91,219,.1)':'rgba(0,0,0,.06)',border:`1px solid ${editando?'rgba(59,91,219,.3)':'var(--border)'}`,borderRadius:7,cursor:podeEditar?'pointer':'not-allowed',width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,color:editando?'#3B5BDB':podeEditar?'var(--text-muted)':'var(--border)',opacity:podeEditar?1:0.5,transition:'all .15s'}}>✎</button>
            <button onClick={onClose} style={{background:'rgba(0,0,0,.06)',border:'1px solid var(--border)',borderRadius:7,cursor:'pointer',width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,color:'var(--text-muted)'}}>×</button>
          </div>
        </div>

        {/* ✨ Card do Resumo IA */}
        {(iaResumo || iaErro) && (
          <div style={{
            marginTop:12,
            padding:'10px 14px',
            borderRadius:9,
            background: iaErro ? 'var(--danger-dim)' : 'rgba(99,102,241,.07)',
            border: `1px solid ${iaErro ? 'rgba(192,65,58,.2)' : 'rgba(99,102,241,.2)'}`,
            position:'relative',
          }}>
            {/* cabeçalho do card */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:12}}>✨</span>
                <span style={{fontSize:10,fontWeight:700,color: iaErro ? 'var(--danger)' : '#6366F1',textTransform:'uppercase',letterSpacing:'.06em'}}>
                  Resumo IA
                </span>
              </div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                {iaResumo && (
                  <button onClick={gerarResumo} disabled={iaLoading} title="Gerar novo resumo"
                    style={{fontSize:10,color:'#6366F1',background:'none',border:'none',cursor:'pointer',padding:'1px 6px',borderRadius:4,opacity:iaLoading?0.5:1}}>
                    ↺ Atualizar
                  </button>
                )}
                <button onClick={()=>{ setIaResumo(null); setIaErro(null); }}
                  style={{fontSize:13,color:'var(--text-muted)',background:'none',border:'none',cursor:'pointer',lineHeight:1,padding:'1px 4px'}}>×</button>
              </div>
            </div>
            {/* conteúdo */}
            {iaErro
              ? <div style={{fontSize:12,color:'var(--danger)'}}>{iaErro}</div>
              : <div style={{fontSize:12,color:'var(--text-primary)',lineHeight:1.6}}>{iaResumo}</div>
            }
          </div>
        )}
      </div>

      {bkoTravado&&(
        <div style={{padding:'10px 20px',background:'rgba(249,115,22,.08)',borderBottom:'1px solid rgba(249,115,22,.2)',display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
          <span style={{fontSize:14}}>🔒</span>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:'#F97316'}}>Cliente travado</div>
            <div style={{fontSize:11,color:'#F97316'}}>Sendo atendido por <strong>{cliente.responsavel_bko_nome}</strong>. Você pode visualizar mas não editar.</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{display:'flex',borderBottom:'1px solid var(--border)',background:'var(--bg-card)',flexShrink:0,overflowX:'auto'}}>
        {[['info','Informações'],['bko','BKO'],['activity','Atividades'],['chat','Chat'],['docs',`Documentos${docs.length>0?` (${docs.length})`:''}`]].map(([id,lb])=>(
          <button key={id} className={`ptab ${tab===id?'on':''}`} onClick={()=>setTab(id)} style={{whiteSpace:'nowrap',fontSize:12}}>{lb}</button>
        ))}
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>

        {/* ══ ABA: INFORMAÇÕES ══ */}
        {tab==='info'&&(
          <div>
            {!editando&&(
              <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,overflow:'hidden',marginBottom:14}}>
                {[
                  ['CPF',cliente.cpfCliente||'—'],['Telefone',cliente.telefone||'—'],['Prefeitura',cliente.prefeitura||'—'],
                  ['Data entrada',fmtD(cliente.dataEntrada)],['Criado em',cliente.created_at?fmtDH(cliente.created_at):'—'],
                  ['Criado por',cliente.criado_por_nome||'—'],['Atribuído a',cliente.atribuido_a_nome||'Não atribuído'],
                  ['Responsável BKO',cliente.responsavel_bko_nome||'Sem responsável'],
                  ['Operador Startec',cliente.atribuido_startec_nome||'Não atribuído'],
                  ['Último contato',fmtD(cliente.ultimoContato)],
                ].map(([k,v])=>(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',borderBottom:'1px solid var(--border)'}}>
                    <span style={{fontSize:11,color:'var(--text-muted)'}}>{k}</span>
                    <span style={{fontSize:11,color:'var(--text-primary)',fontWeight:500}}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            {editando&&(
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
                  <button className="btn" onClick={salvarEdicao} disabled={salvandoEdit} style={{background:'#3B5BDB',color:'#fff',fontSize:12,boxShadow:'0 3px 12px rgba(59,91,219,.28)'}}>
                    {salvandoEdit?'Salvando…':'Salvar alterações'}
                  </button>
                </div>
              </div>
            )}

            {isComercial&&(
              <div style={{marginBottom:16,padding:14,background:B_LIGHT,borderRadius:10,border:`1px solid ${B_MID}25`}}>
                <div style={{fontSize:11,fontWeight:700,color:B_MID,marginBottom:8}}>👤 Atribuir cliente a Corban</div>
                <select className="sel" style={{marginBottom:8}} value={atribCorbanId} onChange={e=>setAtribCorbanId(e.target.value)}>
                  <option value="">— Sem atribuição —</option>
                  {corbans.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                {atribMsg&&<div style={{fontSize:11,padding:'6px 10px',borderRadius:7,marginBottom:8,background:atribMsg.t==='success'?'var(--success-dim)':'var(--danger-dim)',color:atribMsg.t==='success'?'var(--success)':'var(--danger)'}}>{atribMsg.text}</div>}
                <button style={{width:'100%',padding:'8px 0',borderRadius:8,background:B_MID,color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',border:'none',opacity:atribuindo?0.7:1}} onClick={salvarAtribuicaoCorban} disabled={atribuindo}>
                  {atribuindo?'Salvando…':'✓ Confirmar atribuição'}
                </button>
              </div>
            )}

            {podeAtribuirStartec&&(
              <div style={{marginBottom:16,padding:14,background:'rgba(5,150,105,.08)',borderRadius:10,border:'1px solid rgba(5,150,105,.2)'}}>
                <div style={{fontSize:11,fontWeight:700,color:'#059669',marginBottom:8}}>⚡ Atribuir à Operação Startec</div>
                {operadoresStartec.length===0?(
                  <div style={{fontSize:11,color:'var(--text-muted)'}}>Nenhum operador Startec cadastrado ainda.</div>
                ):(
                  <>
                    <select className="sel" style={{marginBottom:8}} value={atribStartecId} onChange={e=>setAtribStartecId(e.target.value)}>
                      <option value="">— Sem atribuição —</option>
                      {operadoresStartec.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}
                    </select>
                    {atribStartecMsg&&<div style={{fontSize:11,padding:'6px 10px',borderRadius:7,marginBottom:8,background:atribStartecMsg.t==='success'?'var(--success-dim)':'var(--danger-dim)',color:atribStartecMsg.t==='success'?'var(--success)':'var(--danger)'}}>{atribStartecMsg.text}</div>}
                    <button style={{width:'100%',padding:'8px 0',borderRadius:8,background:'#059669',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',border:'none',opacity:atribuindoStartec?0.7:1}} onClick={salvarAtribuicaoStartec} disabled={atribuindoStartec}>
                      {atribuindoStartec?'Salvando…':'✓ Confirmar atribuição'}
                    </button>
                  </>
                )}
              </div>
            )}

            <div style={{borderTop:'1px solid var(--border)',paddingTop:14}}>
              <div className="eyebrow" style={{marginBottom:10}}>Atualizar status</div>
              <label style={{fontSize:11,color:'var(--text-muted)',display:'block',marginBottom:5}}>Estágio</label>
              <select className="sel" value={es}
                onChange={e=>{ setEs(e.target.value); setEsUserChanged(true); }}
                disabled={bkoTravado}
                style={{marginBottom:10,opacity:bkoTravado?0.5:1,cursor:bkoTravado?'not-allowed':''}}>
                {bkoStages.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <label style={{fontSize:11,color:'var(--text-muted)',display:'block',marginBottom:5}}>Documento</label>
              <select className="sel" value={ed} onChange={e=>setEd(e.target.value)} style={{marginBottom:14}}>
                {DOC_STATUS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              {bkoTravado?(
                <div style={{padding:'10px 14px',borderRadius:8,background:'rgba(249,115,22,.08)',border:'1px solid rgba(249,115,22,.2)',fontSize:11,color:'#F97316',textAlign:'center'}}>
                  🔒 Cliente travado — sendo atendido por <strong>{cliente.responsavel_bko_nome}</strong>
                </div>
              ):(
                <button className="btn" style={{width:'100%',justifyContent:'center',background:B_MID,color:'#fff',boxShadow:`0 3px 12px ${B_GLOW}`}} onClick={salvarInfo}>Salvar alterações</button>
              )}
            </div>
          </div>
        )}

        {/* ══ ABA: BKO ══ */}
        {tab==='bko'&&(
          <div>
            <div style={{marginBottom:16,padding:14,background:'rgba(124,58,237,.06)',borderRadius:10,border:'1px solid rgba(124,58,237,.2)'}}>
              <div style={{fontSize:11,fontWeight:700,color:'#7C3AED',marginBottom:8}}>🔒 Responsável BKO</div>
              {temResponsavel?(
                <div>
                  <div style={{fontSize:12,color:'var(--text-primary)',fontWeight:600,marginBottom:6}}>
                    {cliente.responsavel_bko_nome}
                    {euSouResponsavel&&<span style={{fontSize:9,marginLeft:6,padding:'1px 6px',borderRadius:99,background:'rgba(124,58,237,.1)',color:'#7C3AED',fontWeight:700}}>Você</span>}
                  </div>
                  {(euSouResponsavel||isSupervisorBko)?(
                    <button onClick={liberarResponsabilidade} disabled={salvandoResp} style={{padding:'6px 12px',borderRadius:7,background:'var(--danger-dim)',color:'var(--danger)',border:'none',fontSize:11,fontWeight:600,cursor:'pointer'}}>
                      Liberar responsabilidade
                    </button>
                  ):(
                    isBko&&(
                      <div style={{marginTop:6,padding:'8px 12px',borderRadius:8,background:'rgba(249,115,22,.08)',border:'1px solid rgba(249,115,22,.2)',fontSize:11,color:'#F97316'}}>
                        🔒 Este cliente já está sendo atendido por <strong>{cliente.responsavel_bko_nome}</strong>.
                      </div>
                    )
                  )}
                </div>
              ):(
                isBko?(
                  <div>
                    <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:8}}>Nenhum responsável ainda.</div>
                    <button onClick={assumirResponsabilidade} disabled={salvandoResp} style={{width:'100%',padding:'8px 0',borderRadius:8,background:'#7C3AED',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',border:'none',opacity:salvandoResp?0.7:1}}>
                      {salvandoResp?'Verificando…':'Assumir responsabilidade'}
                    </button>
                  </div>
                ):(
                  <div style={{fontSize:11,color:'var(--text-muted)'}}>Sem responsável BKO atribuído.</div>
                )
              )}
              {respMsg&&<div style={{fontSize:11,marginTop:8,padding:'6px 10px',borderRadius:7,background:respMsg.t==='success'?'var(--success-dim)':'var(--danger-dim)',color:respMsg.t==='success'?'var(--success)':'var(--danger)'}}>{respMsg.text}</div>}
            </div>

            <div style={{padding:'9px 12px',background:B_LIGHT,borderRadius:9,border:`1px solid ${B_MID}25`,marginBottom:16,fontSize:11,color:B_MID,fontWeight:600}}>
              💼 Campos visíveis e editáveis por Comercial, Corban e BKO
            </div>

            <div style={{marginBottom:20}}>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>Saldo Devedor</label>
              <div style={{display:'flex',gap:8}}>
                <input className="inp" value={saldo} onChange={e=>setSaldo(e.target.value)} placeholder="R$ 0,00" readOnly={!podeEditarSaldo}
                  style={{flex:1,background:!podeEditarSaldo?'var(--bg-surface)':'',cursor:!podeEditarSaldo?'not-allowed':''}}/>
                {podeEditarSaldo&&(
                  <button onClick={salvarSaldo} disabled={salvandoSaldo} style={{padding:'0 16px',borderRadius:8,background:B_MID,color:'#fff',border:'none',fontSize:12,fontWeight:600,cursor:'pointer',flexShrink:0,opacity:salvandoSaldo?0.7:1}}>
                    {salvandoSaldo?'…':'Salvar'}
                  </button>
                )}
              </div>
              {saldoMsg&&<div style={{fontSize:11,marginTop:6,color:'var(--success)'}}>✓ {saldoMsg.text}</div>}
            </div>

            <div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                <label style={{fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em'}}>Observações</label>
                {(obsLog.length>0||obsLegada)&&<span style={{fontSize:10,color:'var(--text-faint)'}}>{obsLog.length+(obsLegada?1:0)} registro{obsLog.length!==1?'s':''}</span>}
              </div>
              <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,marginBottom:12,maxHeight:320,overflowY:'auto'}}>
                {obsLog.length===0&&!obsLegada&&(
                  <div style={{padding:'32px 0',textAlign:'center'}}>
                    <div style={{fontSize:22,marginBottom:6}}>📋</div>
                    <div style={{fontSize:12,color:'var(--text-muted)'}}>Nenhuma observação registrada ainda.</div>
                  </div>
                )}
                {obsLegada&&(
                  <div style={{borderBottom:obsLog.length?'1px solid var(--border)':'none',overflow:'hidden'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,padding:'7px 14px',background:'rgba(90,70,50,.04)',borderBottom:'1px solid var(--border)'}}>
                      <span style={{fontSize:11,color:'var(--text-muted)',fontWeight:600}}>Registros anteriores</span>
                      <span style={{fontSize:9,padding:'1px 7px',borderRadius:99,background:'rgba(90,70,50,.08)',color:'var(--text-faint)',fontWeight:600,marginLeft:'auto'}}>legado</span>
                    </div>
                    <div style={{padding:'10px 14px',fontSize:12,color:'var(--text-secondary)',lineHeight:1.7,whiteSpace:'pre-wrap'}}>{obsLegada}</div>
                  </div>
                )}
                {obsLog.map((entrada,i)=>{
                  const cor=ROLE_COLOR[entrada.autor_role]||'#666';
                  const label=ROLE_LABEL[entrada.autor_role]||entrada.autor_role||'—';
                  const dataFormatada=entrada.dataHora?new Date(entrada.dataHora).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}):fmtD(entrada.data);
                  return(
                    <div key={entrada.id||i} style={{borderBottom:i<obsLog.length-1?'1px solid var(--border)':'none',overflow:'hidden'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,padding:'7px 14px',background:`${cor}0d`,borderBottom:`1px solid ${cor}20`}}>
                        <Avatar name={entrada.autor_nome||'?'} size={20} color={cor}/>
                        <span style={{fontSize:12,fontWeight:700,color:'var(--text-primary)'}}>{entrada.autor_nome}</span>
                        <span style={{fontSize:9,padding:'2px 8px',borderRadius:99,fontWeight:700,background:`${cor}20`,color:cor}}>{label}</span>
                        <span style={{fontSize:10,color:'var(--text-faint)',marginLeft:'auto',fontVariantNumeric:'tabular-nums'}}>{dataFormatada}</span>
                      </div>
                      <div style={{padding:'10px 14px',fontSize:12,color:'var(--text-secondary)',lineHeight:1.7,whiteSpace:'pre-wrap'}}>{entrada.texto}</div>
                    </div>
                  );
                })}
              </div>
              {podeInteragir&&(
                <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,overflow:'hidden'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',background:`${ROLE_COLOR[r]||B_MID}0d`,borderBottom:`1px solid ${ROLE_COLOR[r]||B_MID}20`}}>
                    <Avatar name={profile?.nome||'?'} size={20} color={ROLE_COLOR[r]||B_MID}/>
                    <span style={{fontSize:12,fontWeight:600,color:'var(--text-primary)'}}>{profile?.nome}</span>
                    <span style={{fontSize:9,padding:'2px 8px',borderRadius:99,fontWeight:700,background:`${ROLE_COLOR[r]||B_MID}20`,color:ROLE_COLOR[r]||B_MID}}>{ROLE_LABEL[r]||r}</span>
                    <span style={{marginLeft:'auto',fontSize:10,color:'var(--text-faint)'}}>Nova observação</span>
                  </div>
                  <textarea value={novaObs} onChange={e=>setNovaObs(e.target.value)} placeholder="Digite a observação aqui…"
                    onKeyDown={e=>{if(e.key==='Enter'&&e.ctrlKey)adicionarObs();}}
                    style={{width:'100%',display:'block',padding:'10px 14px',border:'none',outline:'none',resize:'vertical',minHeight:80,fontFamily:'var(--font)',fontSize:12,lineHeight:1.6,color:'var(--text-primary)',background:'var(--bg-card)',boxSizing:'border-box'}}/>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 14px',borderTop:'1px solid var(--border)',background:'rgba(0,0,0,.02)'}}>
                    <span style={{fontSize:10,color:'var(--text-faint)'}}>Ctrl+Enter · não editável após gravar</span>
                    <button onClick={adicionarObs} disabled={!novaObs.trim()}
                      style={{display:'flex',alignItems:'center',gap:6,padding:'7px 16px',borderRadius:7,border:'none',fontSize:12,fontWeight:600,cursor:novaObs.trim()?'pointer':'not-allowed',background:novaObs.trim()?'#1E8F5E':'rgba(0,0,0,.06)',color:novaObs.trim()?'#fff':'var(--text-muted)',transition:'all .15s',boxShadow:novaObs.trim()?'0 2px 8px rgba(30,143,94,.35)':'none'}}>
                      Adicionar Observação
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ ABA: ATIVIDADES ══ */}
        {tab==='activity'&&(
          <div>
            {(cliente.activities||[]).length===0&&<div style={{textAlign:'center',padding:'32px 0',fontSize:12,color:'var(--text-muted)'}}>Nenhuma atividade registrada.</div>}
            {[...(cliente.activities||[])].reverse().map((a,i)=>(
              <div key={a.id||i} style={{display:'flex',gap:9,marginBottom:8}}>
                <div style={{width:28,height:28,borderRadius:8,background:B_LIGHT,color:B_MID,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0}}>
                  {a.type==='stage_change'?'⇄':'✎'}
                </div>
                <div style={{flex:1,paddingBottom:9,borderBottom:'1px solid var(--border)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                    <span style={{fontSize:11,fontWeight:600}}>{a.user}</span>
                    <span style={{fontSize:10,color:'var(--text-faint)'}}>{fmtD(a.date)}</span>
                  </div>
                  <div style={{fontSize:11,color:'var(--text-secondary)',lineHeight:1.5}}>{a.text}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══ ABA: CHAT ══ */}
        {tab==='chat'&&(
          <div style={{display:'flex',flexDirection:'column',height:'100%',minHeight:300}}>
            <div style={{flex:1,overflowY:'auto',marginBottom:12,display:'flex',flexDirection:'column',gap:10}}>
              {chatMsgs.length===0&&<div style={{textAlign:'center',padding:'32px 0',fontSize:12,color:'var(--text-muted)'}}>Nenhuma mensagem ainda.</div>}
              {chatMsgs.map((m,i)=>{
                const isMe=m.user_id===profile?.id;
                const roleColor=ROLE_COLOR[m.user_role]||B_MID;
                const roleLabel=ROLE_LABEL[m.user_role]||m.user_role||'';
                return(
                  <div key={m.id||i} style={{display:'flex',flexDirection:'column',alignItems:isMe?'flex-end':'flex-start'}}>
                    <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:3}}>
                      <Avatar name={m.user_nome||'?'} size={18} color={roleColor}/>
                      <span style={{fontSize:10,fontWeight:700,color:roleColor}}>
                        {m.user_nome}
                        {roleLabel&&<span style={{fontWeight:400,color:'var(--text-faint)',marginLeft:4}}>· {roleLabel}</span>}
                      </span>
                      <span style={{fontSize:9,color:'var(--text-faint)'}}>{new Date(m.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>
                    </div>
                    <div style={{maxWidth:'80%',padding:'8px 12px',borderRadius:isMe?'12px 12px 4px 12px':'12px 12px 12px 4px',background:isMe?B_MID:'var(--bg-surface)',color:isMe?'#fff':'var(--text-primary)',fontSize:12,lineHeight:1.5,border:isMe?'none':'1px solid var(--border)'}}>
                      {m.mensagem}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef}/>
            </div>
            <div style={{display:'flex',gap:8,paddingTop:10,borderTop:'1px solid var(--border)',flexShrink:0}}>
              {bkoTravado?(
                <div style={{flex:1,padding:'10px 14px',borderRadius:8,background:'rgba(249,115,22,.08)',border:'1px solid rgba(249,115,22,.2)',fontSize:11,color:'#F97316',textAlign:'center'}}>
                  🔒 Chat bloqueado — cliente sendo atendido por <strong>{cliente.responsavel_bko_nome}</strong>
                </div>
              ):(
                <>
                  <input className="inp" style={{flex:1,height:38,fontSize:12}} placeholder="Digite uma mensagem…" value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&enviarChat()}/>
                  <button onClick={enviarChat} disabled={chatLoading||!chatInput.trim()} style={{padding:'0 16px',height:38,borderRadius:8,background:B_MID,color:'#fff',border:'none',fontSize:12,fontWeight:600,cursor:'pointer',opacity:chatLoading||!chatInput.trim()?0.6:1,flexShrink:0}}>Enviar</button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ══ ABA: DOCUMENTOS ══ */}
        {tab==='docs'&&(
          <div>
            <div style={{marginBottom:14}}>
              <div className="eyebrow" style={{marginBottom:8}}>Checklist para avançar</div>
              {[{key:'cnh',label:'CNH'},{key:'holerite1',label:'Último holerite (obrigatório)'},{key:'holerite2',label:'2º holerite (opcional)'},{key:'holerite3',label:'3º holerite (opcional)'},{key:'printMargem',label:'Print da margem'}].map(doc=>{
                const tem=docs.some(d=>d.nome?.toLowerCase().includes(doc.key)||d.categoria===doc.key);
                return(
                  <div key={doc.key} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
                    <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${tem?'#10B981':'var(--border-mid)'}`,background:tem?'#10B981':'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#fff',flexShrink:0}}>{tem?'✓':''}</div>
                    <span style={{fontSize:12,color:tem?'var(--text-primary)':'var(--text-muted)'}}>{doc.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="eyebrow" style={{marginBottom:8}}>Enviar documento</div>
            {bkoTravado?(
              <div style={{padding:14,borderRadius:10,background:'rgba(249,115,22,.08)',border:'1px solid rgba(249,115,22,.2)',fontSize:11,color:'#F97316',textAlign:'center',marginBottom:12}}>
                🔒 Upload bloqueado — cliente sendo atendido por <strong>{cliente.responsavel_bko_nome}</strong>
              </div>
            ):(
              <label style={{display:'flex',flexDirection:'column',alignItems:'center',gap:7,padding:18,borderRadius:10,cursor:'pointer',border:`2px dashed ${uploading?B_MID:'var(--border-mid)'}`,background:uploading?B_LIGHT:'rgba(0,0,0,.02)',marginBottom:12,transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background=B_LIGHT;e.currentTarget.style.borderColor=B_MID;}}
                onMouseLeave={e=>{if(!uploading){e.currentTarget.style.background='rgba(0,0,0,.02)';e.currentTarget.style.borderColor='var(--border-mid)';}}}
              >
                <input type="file" style={{display:'none'}} onChange={handleUpload} disabled={uploading} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"/>
                <div style={{fontSize:22}}>{uploading?'⏳':'📤'}</div>
                <div style={{fontSize:12,fontWeight:600,color:'var(--text-primary)'}}>{uploading?'Enviando…':'Clique para enviar'}</div>
                <div style={{fontSize:10,color:'var(--text-muted)'}}>PDF, Word, Imagens · Máx. 10MB</div>
              </label>
            )}
            {uploadMsg&&<div style={{padding:'8px 12px',borderRadius:7,marginBottom:10,fontSize:11,fontWeight:500,background:uploadMsg.t==='success'?'var(--success-dim)':'var(--danger-dim)',color:uploadMsg.t==='success'?'var(--success)':'var(--danger)'}}>{uploadMsg.text}</div>}
            {docs.map((doc,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:9,padding:'9px 12px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:9,marginBottom:7}}>
                <span style={{fontSize:18}}>📄</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{doc.nome}</div>
                  <div style={{fontSize:10,color:'var(--text-muted)'}}>{fmtDH(doc.data||doc.created_at||doc.uploadedAt)} · {doc.enviadoPor}</div>
                </div>
                <button className="btn btn-ghost" style={{padding:'4px 8px',fontSize:10}} onClick={()=>openDoc(doc.path)}>↓ Abrir</button>
                {!bkoTravado&&<button onClick={()=>handleDeleteDoc(doc)} style={{padding:'4px 8px',borderRadius:6,fontSize:10,fontWeight:600,cursor:'pointer',background:'var(--danger-dim)',color:'var(--danger)',border:'none'}}>✕</button>}
              </div>
            ))}
            {docs.length===0&&<div style={{textAlign:'center',padding:'24px 0',fontSize:12,color:'var(--text-muted)'}}>Nenhum documento ainda.</div>}
          </div>
        )}

      </div>
    </div>
  );
}