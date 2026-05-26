import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabase';

const BKO_STAGES_DEFAULT = [
  { id:'clientes_novos',       label:'Clientes Novos - Corban',                  color:'#3B5BDB' },
  { id:'saldo_andamento',      label:'BKO - Saldo Devedor',                      color:'#7C3AED' },
  { id:'pendencia_BKO',        label:'Pendência Análise BKO',                    color:'#8e14b6' },
  { id:'pendencia_financeiro', label:'Pendência Análise Financeira',              color:'#F97316' },
  { id:'em_negociacao',        label:'Em negociação (Saldo Informado) - Corban', color:'#0EA5E9' },
  { id:'abertura_conta',       label:'Abertura de conta - Interno',               color:'#10B981' },
  { id:'digitar_proposta',     label:'Pronto para Digitar - Corban',              color:'#F59E0B' },
  { id:'banksoft',             label:'Banksoft - Tratativas',                     color:'#EF4444' },
  { id:'integrado',            label:'Finalizado - Interno',                      color:'#22C55E' },
  { id:'perdido',              label:'Perdidos',                                  color:'#EF4444' },
];

const CORES = [
  '#3B5BDB','#7C3AED','#8e14b6','#0EA5E9','#10B981',
  '#F59E0B','#F97316','#EF4444','#22C55E','#EC4899',
  '#059669','#6366F1','#14B8A6','#F43F5E','#8B5CF6',
];

function ModalRenomear({ estagio, onSave, onClose }) {
  const [nome, setNome] = useState(estagio.label_custom || estagio.label);
  const [cor,  setCor]  = useState(estagio.color_custom || estagio.color);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  return (
    <div className="mbk" onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="mbox" style={{ maxWidth:400 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, color:'var(--text-primary)' }}>Renomear estágio</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>Padrão: {estagio.label}</div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(0,0,0,.06)', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, color:'var(--text-muted)' }}>×</button>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>Nome</label>
          <input ref={inputRef} className="inp" value={nome} onChange={e=>setNome(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&nome.trim()&&onSave(nome.trim(),cor)}/>
        </div>
        <div style={{ marginBottom:22 }}>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>Cor</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {CORES.map(c=>(
              <div key={c} onClick={()=>setCor(c)}
                style={{ width:22, height:22, borderRadius:'50%', background:c, cursor:'pointer', border:cor===c?`2px solid var(--text-primary)`:'2px solid transparent', transition:'all .12s' }}/>
            ))}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" style={{ background:'#3B5BDB', color:'#fff' }}
            onClick={()=>nome.trim()&&onSave(nome.trim(),cor)}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

function ModalNovoFunil({ funil, onSave, onClose }) {
  const [nome, setNome] = useState(funil?.nome || '');
  const [cor,  setCor]  = useState(funil?.cor  || '#22C55E');
  const inputRef = useRef(null);
  useEffect(()=>{ inputRef.current?.focus(); },[]);

  return (
    <div className="mbk" onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="mbox" style={{ maxWidth:380 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, color:'var(--text-primary)' }}>
            {funil ? 'Renomear funil' : 'Novo funil de arquivo'}
          </div>
          <button onClick={onClose} style={{ background:'rgba(0,0,0,.06)', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, color:'var(--text-muted)' }}>×</button>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>Nome *</label>
          <input ref={inputRef} className="inp" value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex: Integrados 2026"
            onKeyDown={e=>e.key==='Enter'&&nome.trim()&&onSave(nome.trim(),cor)}/>
        </div>
        <div style={{ marginBottom:22 }}>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>Cor</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {CORES.map(c=>(
              <div key={c} onClick={()=>setCor(c)}
                style={{ width:22, height:22, borderRadius:'50%', background:c, cursor:'pointer', border:cor===c?`2px solid var(--text-primary)`:'2px solid transparent', transition:'all .12s' }}/>
            ))}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" style={{ background:'#3B5BDB', color:'#fff' }}
            onClick={()=>nome.trim()&&onSave(nome.trim(),cor)}>
            {funil ? 'Salvar' : 'Criar funil'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal renomear estágio CRM ────────────────────────────────────────────────
function ModalRenomearCrmEstagio({ estagio, onSave, onClose }) {
  const [nome, setNome] = useState(estagio.nome);
  const [cor,  setCor]  = useState(estagio.cor || '#3B5BDB');
  const inputRef = useRef(null);
  useEffect(()=>{ inputRef.current?.focus(); inputRef.current?.select(); },[]);

  return (
    <div className="mbk" onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="mbox" style={{ maxWidth:400 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, color:'var(--text-primary)' }}>Configurar estágio</div>
          <button onClick={onClose} style={{ background:'rgba(0,0,0,.06)', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, color:'var(--text-muted)' }}>×</button>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>Nome</label>
          <input ref={inputRef} className="inp" value={nome} onChange={e=>setNome(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&nome.trim()&&onSave(nome.trim(),cor)}/>
        </div>
        <div style={{ marginBottom:22 }}>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>Cor</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {CORES.map(c=>(
              <div key={c} onClick={()=>setCor(c)}
                style={{ width:22, height:22, borderRadius:'50%', background:c, cursor:'pointer', border:cor===c?`2px solid var(--text-primary)`:'2px solid transparent', transition:'all .12s' }}/>
            ))}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" style={{ background:'#3B5BDB', color:'#fff' }}
            onClick={()=>nome.trim()&&onSave(nome.trim(),cor)}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal novo estágio em pipeline CRM ───────────────────────────────────────
function ModalNovoEstagio({ pipeline, onSave, onClose }) {
  const [nome, setNome] = useState('');
  const [cor,  setCor]  = useState(pipeline.cor || '#3B5BDB');
  const inputRef = useRef(null);
  useEffect(()=>{ inputRef.current?.focus(); },[]);

  return (
    <div className="mbk" onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="mbox" style={{ maxWidth:400 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, color:'var(--text-primary)' }}>Novo estágio</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{pipeline.icone} {pipeline.nome}</div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(0,0,0,.06)', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, color:'var(--text-muted)' }}>×</button>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>Nome do estágio *</label>
          <input ref={inputRef} className="inp" value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex: Em análise"
            onKeyDown={e=>e.key==='Enter'&&nome.trim()&&onSave(nome.trim(),cor)}/>
        </div>
        <div style={{ marginBottom:22 }}>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>Cor</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {CORES.map(c=>(
              <div key={c} onClick={()=>setCor(c)}
                style={{ width:22, height:22, borderRadius:'50%', background:c, cursor:'pointer', border:cor===c?`2px solid var(--text-primary)`:'2px solid transparent', transition:'all .12s' }}/>
            ))}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" style={{ background:'#3B5BDB', color:'#fff' }}
            onClick={()=>nome.trim()&&onSave(nome.trim(),cor)}>Criar estágio</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal editar pipeline CRM ─────────────────────────────────────────────────
function ModalEditarCrmPipeline({ pipeline, onSave, onClose }) {
  const [nome,   setNome]   = useState(pipeline.nome);
  const [cor,    setCor]    = useState(pipeline.cor);
  const [icone,  setIcone]  = useState(pipeline.icone);
  const inputRef = useRef(null);
  useEffect(()=>{ inputRef.current?.focus(); inputRef.current?.select(); },[]);

  const ICONES = ['◈','⊞','◎','⬡','⬢','▣','◇','◆','★','⚡','🎯','📋','💡','🔗'];

  return (
    <div className="mbk" onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="mbox" style={{ maxWidth:420 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, color:'var(--text-primary)' }}>Configurar Pipeline CRM</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{icone} {pipeline.nome}</div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(0,0,0,.06)', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, color:'var(--text-muted)' }}>×</button>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>Nome</label>
          <input ref={inputRef} className="inp" value={nome} onChange={e=>setNome(e.target.value)}/>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>Ícone</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
            {/* Opção sem ícone */}
            <button onClick={()=>setIcone('')}
              style={{ width:32, height:32, borderRadius:7, border:`1px solid ${icone===''?'var(--text-primary)':'var(--border)'}`, background:icone===''?'rgba(0,0,0,.06)':'transparent', cursor:'pointer', fontSize:11, color:'var(--text-muted)', transition:'all .12s', fontFamily:'var(--font)' }}
              title="Sem ícone">
              —
            </button>
            {ICONES.map(ic=>(
              <button key={ic} onClick={()=>setIcone(ic)}
                style={{ width:32, height:32, borderRadius:7, border:`1px solid ${icone===ic?cor:'var(--border)'}`, background:icone===ic?`${cor}12`:'transparent', cursor:'pointer', fontSize:15, transition:'all .12s' }}>
                {ic}
              </button>
            ))}
          </div>
          <div style={{ fontSize:10, color:'var(--text-faint)', marginTop:5 }}>
            Clique em "—" para remover o ícone
          </div>
        </div>
        <div style={{ marginBottom:22 }}>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>Cor</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {CORES.map(c=>(
              <div key={c} onClick={()=>setCor(c)}
                style={{ width:22, height:22, borderRadius:'50%', background:c, cursor:'pointer', border:cor===c?`2px solid var(--text-primary)`:'2px solid transparent', transition:'all .12s' }}/>
            ))}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" style={{ background:'#3B5BDB', color:'#fff' }}
            onClick={()=>nome.trim()&&onSave(nome.trim(),cor,icone)}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

// ── Linha do tempo horizontal dos estágios ────────────────────────────────────
function TimelineEstagios({ estagios, onRenomear, onToggle, onDragEnd }) {
  const dragItem    = useRef(null);
  const dragOverItem= useRef(null);
  const [over, setOver] = useState(null);

  const handleDragStart = (i) => { dragItem.current = i; };
  const handleDragEnter = (i) => { dragOverItem.current = i; setOver(i); };
  const handleDragEnd   = ()  => {
    setOver(null);
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) { dragItem.current=null; dragOverItem.current=null; return; }
    onDragEnd(dragItem.current, dragOverItem.current);
    dragItem.current = null; dragOverItem.current = null;
  };

  return (
    <div style={{ overflowX:'auto', paddingBottom:8 }}>
      <div style={{ position:'relative', minWidth: estagios.length * 148 }}>
        {/* Linha de conexão — neutra */}
        <div style={{ position:'absolute', top:10, left:60, right:60, height:1, background:'var(--border)', zIndex:0 }}/>

        <div style={{ display:'flex', alignItems:'flex-start', position:'relative', zIndex:1 }}>
          {estagios.map((s,i)=>{
            const cor = s.color_custom || s.color;
            const nome = s.label_custom || s.label;
            const isOver = over === i;
            return (
              <div key={s.id}
                draggable
                onDragStart={()=>handleDragStart(i)}
                onDragEnter={()=>handleDragEnter(i)}
                onDragEnd={handleDragEnd}
                onDragOver={e=>e.preventDefault()}
                style={{ display:'flex', flexDirection:'column', alignItems:'center', minWidth:140, padding:'0 4px', transition:'all .15s', cursor:'grab',
                  background:isOver?'rgba(0,0,0,.02)':'transparent', borderRadius:8 }}>

                {/* Ponto — pequeno, cor só quando ativo */}
                <div style={{ width:10, height:10, borderRadius:'50%',
                  background:s.ativo?cor:'var(--border)',
                  border:`1.5px solid ${s.ativo?cor:'var(--border-mid)'}`,
                  marginBottom:10, flexShrink:0, transition:'all .2s' }}/>

                {/* Card neutro */}
                <div style={{ background:s.ativo?'var(--bg-card)':'var(--bg-surface)',
                  border:`1px solid ${isOver?'rgba(0,0,0,.18)':'var(--border)'}`,
                  borderRadius:7, padding:'9px 10px 8px', width:'100%',
                  opacity:s.ativo?1:.6, transition:'all .15s' }}>

                  <div style={{ fontSize:11.5, fontWeight:s.ativo?500:400,
                    color:s.ativo?'var(--text-primary)':'var(--text-muted)',
                    lineHeight:1.35, marginBottom:7, wordBreak:'break-word',
                    textDecoration:s.ativo?'none':'line-through' }}>
                    {nome}
                  </div>
                  {s.label_custom && (
                    <div style={{ fontSize:9, color:'var(--text-faint)', marginBottom:5 }}>Padrão: {s.label}</div>
                  )}

                  <button onClick={()=>onRenomear(s)}
                    style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'var(--font)', fontWeight:500, marginBottom:7 }}
                    onMouseEnter={e=>e.currentTarget.style.color='var(--text-primary)'}
                    onMouseLeave={e=>e.currentTarget.style.color='var(--text-muted)'}>
                    ⚙ Configurar
                  </button>

                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:9, color:'var(--text-faint)', letterSpacing:'.04em', textTransform:'uppercase' }}>
                      {s.ativo?'Ativo':'Inativo'}
                    </span>
                    {/* Toggle neutro — só muda cor quando ativo */}
                    <div onClick={()=>onToggle(s.id, s.ativo)} style={{ cursor:'pointer' }}>
                      <div style={{ width:28, height:15, borderRadius:99,
                        background:s.ativo?'#4A7C59':'rgba(0,0,0,.15)',
                        display:'flex', alignItems:'center', padding:'2px 3px', transition:'background .2s' }}>
                        <div style={{ width:9, height:9, borderRadius:'50%', background:'#fff',
                          transform:s.ativo?'translateX(13px)':'translateX(0)',
                          transition:'transform .2s', boxShadow:'0 1px 2px rgba(0,0,0,.2)' }}/>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Modal: Criar novo pipeline ───────────────────────────────────────────────
function ModalNovoPipeline({ onSave, onClose }) {
  const [step,    setStep]    = useState(1);
  const [nome,    setNome]    = useState('');
  const [icone,   setIcone]   = useState('◈');
  const [cor,     setCor]     = useState('#3B5BDB');
  const [descricao, setDescricao] = useState('');
  const [estagios, setEstagios]   = useState([
    { nome:'', cor:'#3B5BDB', tempId: Date.now() }
  ]);
  const [saving, setSaving]   = useState(false);
  const nomeRef = useRef(null);
  useEffect(() => { nomeRef.current?.focus(); }, []);

  const ICONES_PIPE = ['◈','⊞','◎','⬡','⬢','▣','◇','◆','★','⚡','🎯','📋','💡','🔗','—'];

  const addEstagio = () => {
    setEstagios(prev => [...prev, { nome:'', cor, tempId: Date.now() + Math.random() }]);
  };

  const removeEstagio = (tempId) => {
    setEstagios(prev => prev.filter(e => e.tempId !== tempId));
  };

  const updateEstagio = (tempId, field, value) => {
    setEstagios(prev => prev.map(e => e.tempId === tempId ? { ...e, [field]: value } : e));
  };

  const podeAvancar = nome.trim().length > 0;
  const podeSalvar  = estagios.some(e => e.nome.trim().length > 0);

  const handleSalvar = async () => {
    setSaving(true);
    const estagiosValidos = estagios.filter(e => e.nome.trim());
    await onSave({ nome: nome.trim(), icone: icone === '—' ? '' : icone, cor, descricao: descricao.trim() }, estagiosValidos);
    setSaving(false);
  };

  return (
    <div className="mbk" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mbox" style={{ maxWidth: 520 }}>

        {/* Cabeçalho */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:600, color:'var(--text-primary)' }}>
              {step === 1 ? 'Novo Pipeline' : 'Criar estágios'}
            </div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
              {step === 1 ? 'Defina as informações básicas do funil' : `Pipeline: ${nome} · Adicione os estágios`}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(0,0,0,.06)', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, color:'var(--text-muted)' }}>×</button>
        </div>

        {/* Progress */}
        <div style={{ display:'flex', gap:5, marginBottom:22 }}>
          {[1,2].map(s => (
            <div key={s} style={{ flex:1, height:2.5, borderRadius:99,
              background: s <= step ? cor : 'var(--border)', transition:'background .3s' }}/>
          ))}
        </div>

        {/* ── Step 1: Informações do pipeline ── */}
        {step === 1 && (
          <div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>Nome do pipeline *</label>
              <input ref={nomeRef} className="inp" value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Ex: Pipeline de Indicações"
                onKeyDown={e => e.key === 'Enter' && podeAvancar && setStep(2)}/>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>Descrição (opcional)</label>
              <input className="inp" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Breve descrição do objetivo deste funil"/>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>Ícone</label>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                {ICONES_PIPE.map(ic => (
                  <button key={ic} onClick={() => setIcone(ic)}
                    style={{ width:32, height:32, borderRadius:7, fontSize:ic === '—' ? 13 : 15,
                      border:`1px solid ${icone === ic ? cor : 'var(--border)'}`,
                      background: icone === ic ? `${cor}14` : 'transparent',
                      cursor:'pointer', transition:'all .12s', color: ic === '—' ? 'var(--text-muted)' : 'inherit' }}>
                    {ic}
                  </button>
                ))}
              </div>
              {icone === '—' && <div style={{ fontSize:10, color:'var(--text-faint)', marginTop:4 }}>Sem ícone — só o nome será exibido</div>}
            </div>

            <div style={{ marginBottom:24 }}>
              <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>Cor</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {CORES.map(c => (
                  <div key={c} onClick={() => setCor(c)}
                    style={{ width:22, height:22, borderRadius:'50%', background:c, cursor:'pointer',
                      border: cor === c ? `2px solid var(--text-primary)` : '2px solid transparent', transition:'all .12s' }}/>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div style={{ padding:'10px 14px', borderRadius:9, background:'var(--bg-surface)', border:'1px solid var(--border)', marginBottom:22, display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:cor, flexShrink:0 }}/>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>
                {icone && icone !== '—' ? `${icone} ` : ''}{nome || 'Nome do pipeline'}
              </span>
              {descricao && <span style={{ fontSize:11, color:'var(--text-muted)', flex:1 }}>— {descricao}</span>}
            </div>

            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
              <button className="btn" style={{ background: podeAvancar ? cor : 'var(--border)', color: podeAvancar ? '#fff' : 'var(--text-muted)', cursor: podeAvancar ? 'pointer' : 'not-allowed' }}
                onClick={() => podeAvancar && setStep(2)}>
                Próximo: Estágios →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Estágios ── */}
        {step === 2 && (
          <div>
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12, maxHeight:320, overflowY:'auto' }}>
              {estagios.map((e, i) => (
                <div key={e.tempId} style={{ display:'grid', gridTemplateColumns:'auto 1fr auto auto', gap:8, alignItems:'center', padding:'8px 10px', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:8 }}>
                  {/* Número */}
                  <div style={{ width:22, height:22, borderRadius:'50%', background:e.cor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#fff', flexShrink:0 }}>{i+1}</div>
                  {/* Nome */}
                  <input className="inp" value={e.nome} onChange={ev => updateEstagio(e.tempId, 'nome', ev.target.value)}
                    placeholder={`Estágio ${i+1}`}
                    style={{ padding:'6px 10px', fontSize:13 }}/>
                  {/* Cor */}
                  <div style={{ display:'flex', gap:3, flexWrap:'nowrap', overflowX:'hidden' }}>
                    {CORES.slice(0,8).map(c => (
                      <div key={c} onClick={() => updateEstagio(e.tempId, 'cor', c)}
                        style={{ width:16, height:16, borderRadius:'50%', background:c, cursor:'pointer', flexShrink:0,
                          border: e.cor === c ? '2px solid var(--text-primary)' : '1.5px solid transparent', transition:'all .1s' }}/>
                    ))}
                  </div>
                  {/* Remover */}
                  {estagios.length > 1 && (
                    <button onClick={() => removeEstagio(e.tempId)}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:14, padding:'2px 4px', borderRadius:4, lineHeight:1 }}
                      onMouseEnter={ev => ev.currentTarget.style.color='var(--danger)'}
                      onMouseLeave={ev => ev.currentTarget.style.color='var(--text-muted)'}>×</button>
                  )}
                </div>
              ))}
            </div>

            {/* Botão adicionar estágio */}
            <button onClick={addEstagio}
              style={{ display:'flex', alignItems:'center', gap:7, width:'100%', padding:'8px 12px', borderRadius:8, background:'none', border:'1px dashed var(--border-mid)', fontSize:12, color:'var(--text-muted)', cursor:'pointer', fontFamily:'var(--font)', marginBottom:20, transition:'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=cor; e.currentTarget.style.color=cor; e.currentTarget.style.background=`${cor}06`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border-mid)'; e.currentTarget.style.color='var(--text-muted)'; e.currentTarget.style.background='none'; }}>
              + Adicionar estágio
            </button>

            <div style={{ display:'flex', gap:8, justifyContent:'space-between', alignItems:'center' }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>← Voltar</button>
              <div style={{ display:'flex', gap:8 }}>
                <span style={{ fontSize:11, color:'var(--text-muted)', alignSelf:'center' }}>
                  {estagios.filter(e => e.nome.trim()).length} estágio{estagios.filter(e => e.nome.trim()).length !== 1 ? 's' : ''} definido{estagios.filter(e => e.nome.trim()).length !== 1 ? 's' : ''}
                </span>
                <button className="btn" style={{ background: podeSalvar && !saving ? cor : 'var(--border)', color: podeSalvar && !saving ? '#fff' : 'var(--text-muted)', cursor: podeSalvar && !saving ? 'pointer' : 'not-allowed' }}
                  onClick={handleSalvar} disabled={!podeSalvar || saving}>
                  {saving ? 'Criando…' : '✓ Criar pipeline'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export function BKOConfigurarPipeline({ profile, session, funis, setFunis, onVoltar }) {
  const [estagios,      setEstagios]      = useState([]);
  const [crmPipelines,  setCrmPipelines]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [salvando,      setSalvando]      = useState(false);
  const [msg,           setMsg]           = useState(null);
  const [modalRenomear, setModalRenomear] = useState(null);
  const [editCrmPipeline,   setEditCrmPipeline]    = useState(null);
  const [editCrmEstagio,    setEditCrmEstagio]     = useState(null); // {estagio, pipeline}
  const [novoEstagioPipeline, setNovoEstagioPipeline] = useState(null); // pipeline onde criar
  const [modalNovoPipeline, setModalNovoPipeline]  = useState(false);
  const [modalFunil,        setModalFunil]          = useState(false);
  const crmDragItem = useRef(null);
  const crmDragOver = useRef(null);
  const [editFunil,     setEditFunil]     = useState(null);

  useEffect(()=>{
    Promise.all([
      supabase.from('bko_pipeline_config').select('*'),
      supabase.from('bko_pipelines').select('*, bko_pipeline_estagios(*)').order('ordem'),
    ]).then(([{ data: configData }, { data: pipelinesData }])=>{
      // Estágios da esteira
      const configMap = {};
      (configData||[]).forEach(c=>{ configMap[c.estagio_id]=c; });
      const merged = BKO_STAGES_DEFAULT.map((s,i)=>({
        ...s,
        label_custom: configMap[s.id]?.label_custom || null,
        color_custom:  configMap[s.id]?.color_custom  || null,
        ativo:         configMap[s.id]?.ativo !== false,
        ordem:         configMap[s.id]?.ordem ?? i,
      })).sort((a,b)=>a.ordem-b.ordem);
      setEstagios(merged);
      // Pipelines CRM
      setCrmPipelines(pipelinesData||[]);
      setLoading(false);
    });
  },[]);

  const salvarEstagio = useCallback(async (estagioId, updates) => {
    setSalvando(true);
    const { error } = await supabase.from('bko_pipeline_config').upsert(
      { estagio_id:estagioId, ...updates, updated_at:new Date().toISOString(), updated_by:profile?.nome },
      { onConflict:'estagio_id' }
    );
    setSalvando(false);
    if (error) { setMsg({t:'error',text:error.message}); return false; }
    return true;
  },[profile]);

  // ── Salvar pipeline CRM ──
  const handleSalvarCrmPipeline = async (nome, cor, icone) => {
    const p = editCrmPipeline;
    const { error } = await supabase.from('bko_pipelines')
      .update({ nome, cor, icone }).eq('id', p.id);
    if (error) { setMsg({t:'error',text:error.message}); return; }
    setCrmPipelines(prev=>prev.map(x=>x.id===p.id?{...x,nome,cor,icone}:x));
    setEditCrmPipeline(null);
    setMsg({t:'success',text:`Pipeline "${nome}" atualizado!`});
    setTimeout(()=>setMsg(null),2500);
  };

  const handleToggleCrm = async (pipeline) => {
    const novoAtivo = !pipeline.ativo;
    const { error } = await supabase.from('bko_pipelines').update({ ativo:novoAtivo }).eq('id', pipeline.id);
    if (error) { setMsg({t:'error',text:error.message}); return; }
    setCrmPipelines(prev=>prev.map(x=>x.id===pipeline.id?{...x,ativo:novoAtivo}:x));
  };

  // ── Criar novo pipeline CRM ──
  const handleCriarPipeline = async (info, estagiosLista) => {
    // 1. Inserir o pipeline
    const { data: novoPipeline, error: errP } = await supabase
      .from('bko_pipelines')
      .insert({
        nome:      info.nome,
        icone:     info.icone,
        cor:       info.cor,
        descricao: info.descricao,
        ativo:     true,
        ordem:     (crmPipelines.length || 0) + 1,
      })
      .select()
      .single();

    if (errP) { setMsg({t:'error', text: errP.message}); return; }

    // 2. Inserir os estágios
    const estagiosParaInserir = estagiosLista.map((e, i) => ({
      pipeline_id: novoPipeline.id,
      nome:        e.nome.trim(),
      cor:         e.cor,
      ordem:       i,
      ativo:       true,
    }));

    const { data: novosEstagios, error: errE } = await supabase
      .from('bko_pipeline_estagios')
      .insert(estagiosParaInserir)
      .select();

    if (errE) { setMsg({t:'error', text: errE.message}); return; }

    // 3. Atualizar estado local
    setCrmPipelines(prev => [...prev, { ...novoPipeline, bko_pipeline_estagios: novosEstagios || [] }]);
    setModalNovoPipeline(false);
    setMsg({t:'success', text: `Pipeline "${info.nome}" criado com ${estagiosLista.length} estágio${estagiosLista.length !== 1 ? 's' : ''}!`});
    setTimeout(() => setMsg(null), 3000);
  };

  // ── Toggle estágio individual de pipeline CRM ──
  const handleToggleCrmEstagio = async (pipelineId, estagio) => {
    const novoAtivo = estagio.ativo === false ? true : false;
    const { error } = await supabase.from('bko_pipeline_estagios')
      .update({ ativo: novoAtivo }).eq('id', estagio.id);
    if (error) { setMsg({t:'error',text:error.message}); return; }
    setCrmPipelines(prev=>prev.map(p=>p.id!==pipelineId?p:{
      ...p,
      bko_pipeline_estagios:(p.bko_pipeline_estagios||[]).map(s=>
        s.id===estagio.id?{...s,ativo:novoAtivo}:s
      )
    }));
  };

  // ── Salvar customização de estágio CRM ──
  const handleSalvarCrmEstagio = async (nome, cor) => {
    const { estagio, pipeline } = editCrmEstagio;
    const { error } = await supabase.from('bko_pipeline_estagios')
      .update({ nome, cor }).eq('id', estagio.id);
    if (error) { setMsg({t:'error',text:error.message}); return; }
    setCrmPipelines(prev=>prev.map(p=>p.id!==pipeline.id?p:{
      ...p,
      bko_pipeline_estagios:(p.bko_pipeline_estagios||[]).map(s=>
        s.id===estagio.id?{...s,nome,cor}:s
      )
    }));
    setEditCrmEstagio(null);
    setMsg({t:'success',text:'Estágio atualizado!'});
    setTimeout(()=>setMsg(null),2500);
  };

  // ── Criar novo estágio em pipeline CRM ──
  const handleCriarCrmEstagio = async (nome, cor) => {
    const p = novoEstagioPipeline;
    const estagiosAtuais = p.bko_pipeline_estagios||[];
    const { data, error } = await supabase.from('bko_pipeline_estagios')
      .insert({ pipeline_id:p.id, nome, cor, ordem:estagiosAtuais.length, ativo:true })
      .select().single();
    if (error) { setMsg({t:'error',text:error.message}); return; }
    setCrmPipelines(prev=>prev.map(x=>x.id!==p.id?x:{
      ...x, bko_pipeline_estagios:[...(x.bko_pipeline_estagios||[]), data]
    }));
    setNovoEstagioPipeline(null);
    setMsg({t:'success',text:`Estágio "${nome}" criado!`});
    setTimeout(()=>setMsg(null),2500);
  };

  // ── Reordenar estágios CRM por drag ──
  const handleCrmStageDragEnd = async (pipelineId) => {
    if (!crmDragItem.current || !crmDragOver.current) return;
    if (crmDragItem.current.pid !== pipelineId) return;
    const fromIdx = crmDragItem.current.idx;
    const toIdx   = crmDragOver.current.idx;
    crmDragItem.current = null; crmDragOver.current = null;
    if (fromIdx === toIdx) return;

    setCrmPipelines(prev=>prev.map(p=>{
      if (p.id !== pipelineId) return p;
      const list = [...(p.bko_pipeline_estagios||[])];
      const dragged = list.splice(fromIdx, 1)[0];
      list.splice(toIdx, 0, dragged);
      const reordered = list.map((s,i)=>({...s,ordem:i}));
      // Save to DB
      Promise.all(reordered.map(s=>
        supabase.from('bko_pipeline_estagios').update({ordem:s.ordem}).eq('id',s.id)
      ));
      return { ...p, bko_pipeline_estagios: reordered };
    }));
    setMsg({t:'success',text:'Ordem salva!'});
    setTimeout(()=>setMsg(null),2000);
  };

  const handleRenomear = async (nome, cor) => {
    const e = modalRenomear;
    const ok = await salvarEstagio(e.id, { label_custom:nome, color_custom:cor });
    if (!ok) return;
    setEstagios(prev=>prev.map(s=>s.id===e.id?{...s,label_custom:nome,color_custom:cor}:s));
    setModalRenomear(null);
    setMsg({t:'success',text:'Estágio atualizado!'});
    setTimeout(()=>setMsg(null),2500);
  };

  const handleToggle = async (estagioId, ativoAtual) => {
    if (ativoAtual) {
      setMsg({t:'warn',text:'Desativar oculta o estágio no kanban. Clientes existentes são preservados.'});
      setTimeout(()=>setMsg(null),3500);
    }
    const ok = await salvarEstagio(estagioId, { ativo:!ativoAtual });
    if (!ok) return;
    setEstagios(prev=>prev.map(s=>s.id===estagioId?{...s,ativo:!ativoAtual}:s));
  };

  const handleDragEnd = async (fromIdx, toIdx) => {
    const newList = [...estagios];
    const dragged = newList.splice(fromIdx, 1)[0];
    newList.splice(toIdx, 0, dragged);
    const reordered = newList.map((s,i)=>({...s,ordem:i}));
    setEstagios(reordered);
    setSalvando(true);
    await Promise.all(reordered.map(s=>
      supabase.from('bko_pipeline_config').upsert(
        { estagio_id:s.id, ordem:s.ordem, updated_at:new Date().toISOString(), updated_by:profile?.nome },
        { onConflict:'estagio_id' }
      )
    ));
    setSalvando(false);
    setMsg({t:'success',text:'Ordem salva!'});
    setTimeout(()=>setMsg(null),2000);
  };

  const handleCriarFunil = async (nome, cor) => {
    const { data, error } = await supabase.from('bko_funis')
      .insert({ nome, cor, ordem:(funis?.length||0)+1 }).select().single();
    if (error) { setMsg({t:'error',text:error.message}); return; }
    setFunis(prev=>[...prev, data]);
    setModalFunil(false);
    setMsg({t:'success',text:`Funil "${nome}" criado!`});
    setTimeout(()=>setMsg(null),2500);
  };

  const handleRenomearFunil = async (nome, cor) => {
    const { error } = await supabase.from('bko_funis').update({ nome, cor }).eq('id', editFunil.id);
    if (error) { setMsg({t:'error',text:error.message}); return; }
    setFunis(prev=>prev.map(f=>f.id===editFunil.id?{...f,nome,cor}:f));
    setEditFunil(null);
    setMsg({t:'success',text:'Funil atualizado!'});
    setTimeout(()=>setMsg(null),2500);
  };

  const handleArquivarFunil = async (funil) => {
    if (!confirm(`Arquivar "${funil.nome}"? O funil sumirá do dropdown mas os clientes são preservados.`)) return;
    await supabase.from('bko_funis').update({ativo:false}).eq('id', funil.id);
    setFunis(prev=>prev.filter(f=>f.id!==funil.id));
    setMsg({t:'success',text:`Funil "${funil.nome}" arquivado.`});
    setTimeout(()=>setMsg(null),2500);
  };

  const funisAtivos = (funis||[]).filter(f=>f.ativo);

  return (
    <div style={{ padding:'24px 32px', overflowY:'auto', height:'100%', boxSizing:'border-box' }}>

      {/* Cabeçalho */}
      <div style={{ marginBottom:24 }}>
        <button onClick={onVoltar}
          style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', padding:0, marginBottom:12, fontFamily:'var(--font)' }}
          onMouseEnter={e=>e.currentTarget.style.color='var(--text-primary)'}
          onMouseLeave={e=>e.currentTarget.style.color='var(--text-muted)'}>
          Voltar ao Pipeline
        </button>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
          <div>
            <div className="section-title">Configurar Pipeline</div>
            <div className="section-sub">Personalize estágios e funis — o sistema continua funcionando normalmente</div>
          </div>
          {salvando && <div style={{ fontSize:11, color:'var(--text-muted)' }}>Salvando…</div>}
        </div>
      </div>

      {msg && (
        <div style={{ padding:'9px 14px', borderRadius:9, marginBottom:16, fontSize:12,
          background: msg.t==='success'?'var(--success-dim)':msg.t==='warn'?'rgba(245,158,11,.1)':'var(--danger-dim)',
          border: `1px solid ${msg.t==='success'?'rgba(61,155,107,.2)':msg.t==='warn'?'rgba(245,158,11,.25)':'rgba(192,65,58,.2)'}`,
          color: msg.t==='success'?'var(--success)':msg.t==='warn'?'#B45309':'var(--danger)' }}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text-muted)' }}>Carregando…</div>
      ) : (
        <>
          {/* ── Seção: Esteira de Operação ── */}
          <div style={{ marginBottom:32 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:600, color:'var(--text-primary)', letterSpacing:'-.01em' }}>Esteira de Operação</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                  {estagios.filter(s=>s.ativo).length} de {estagios.length} estágios ativos · Arraste para reordenar
                </div>
              </div>
            </div>

            <TimelineEstagios
              estagios={estagios}
              onRenomear={setModalRenomear}
              onToggle={handleToggle}
              onDragEnd={handleDragEnd}
            />

            <div style={{ marginTop:12, fontSize:11, color:'var(--text-faint)', paddingLeft:2 }}>
              ℹ️ Desativar oculta o estágio no kanban sem remover clientes · Arraste para reordenar
            </div>
          </div>

          {/* Divisor */}
          <div style={{ height:1, background:'var(--border)', margin:'0 0 28px' }}/>

          {/* ── Botão criar novo pipeline ── */}
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:20 }}>
            <button onClick={()=>setModalNovoPipeline(true)}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 16px', borderRadius:9, background:'#3B5BDB', color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)', boxShadow:'0 3px 12px rgba(59,91,219,.25)', transition:'all .15s' }}
              onMouseEnter={e=>{ e.currentTarget.style.background='#2f4cbf'; e.currentTarget.style.transform='translateY(-1px)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.background='#3B5BDB'; e.currentTarget.style.transform=''; }}>
              + Novo Pipeline
            </button>
          </div>

          {/* ── Seção: Um bloco por Pipeline CRM ── */}
          {crmPipelines.map((p, pi) => {
            const estagiosCrm = (p.bko_pipeline_estagios||[]).sort((a,b)=>(a.ordem||0)-(b.ordem||0));
            return (
              <div key={p.id} style={{ marginBottom:32 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:16 }}>{p.icone}</span>
                      <div style={{ fontSize:15, fontWeight:600, color:'var(--text-primary)', letterSpacing:'-.01em' }}>{p.nome}</div>
                      {/* Toggle do pipeline — neutro */}
                      <div onClick={()=>handleToggleCrm(p)} style={{ cursor:'pointer', marginLeft:4 }}>
                        <div style={{ width:28, height:15, borderRadius:99,
                          background:p.ativo?'#4A7C59':'rgba(0,0,0,.15)',
                          display:'flex', alignItems:'center', padding:'2px 3px', transition:'background .2s' }}>
                          <div style={{ width:9, height:9, borderRadius:'50%', background:'#fff',
                            transform:p.ativo?'translateX(13px)':'translateX(0)',
                            transition:'transform .2s', boxShadow:'0 1px 2px rgba(0,0,0,.2)' }}/>
                        </div>
                      </div>
                    </div>
                    {p.descricao && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{p.descricao}</div>}
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                      {estagiosCrm.filter(s=>s.ativo).length} de {estagiosCrm.length} estágios ativos
                    </div>
                  </div>
                  <button onClick={()=>setEditCrmPipeline(p)}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, background:'var(--bg-card)', border:'1px solid var(--border)', fontSize:12, fontWeight:600, color:'var(--text-secondary)', cursor:'pointer', fontFamily:'var(--font)', transition:'all .15s' }}
                    onMouseEnter={e=>{ e.currentTarget.style.borderColor='#3B5BDB'; e.currentTarget.style.color='#3B5BDB'; }}
                    onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-secondary)'; }}>
                    ⚙ Configurar
                  </button>
                </div>

                {/* Timeline dos estágios deste pipeline */}
                {estagiosCrm.length === 0 ? (
                  <div style={{ padding:'16px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12, color:'var(--text-muted)' }}>
                    Nenhum estágio ativo neste pipeline.
                  </div>
                ) : (
                  <div style={{ overflowX:'auto', paddingBottom:8, opacity:p.ativo?1:.5 }}>
                    <div style={{ position:'relative', minWidth: estagiosCrm.length * 148 }}>
                      <div style={{ position:'absolute', top:10, left:60, right:60, height:1, background:'var(--border)', zIndex:0 }}/>
                      <div style={{ display:'flex', alignItems:'flex-start', position:'relative', zIndex:1 }}>
                        {estagiosCrm.map((s, si)=>(
                          <div key={s.id}
                            draggable
                            onDragStart={()=>{ crmDragItem.current={pid:p.id,idx:si}; }}
                            onDragEnter={()=>{ crmDragOver.current={pid:p.id,idx:si}; }}
                            onDragEnd={()=>handleCrmStageDragEnd(p.id)}
                            onDragOver={e=>e.preventDefault()}
                            style={{ display:'flex', flexDirection:'column', alignItems:'center', minWidth:140, padding:'0 4px',
                              opacity:s.ativo!==false?1:.5, cursor:'grab', transition:'opacity .15s' }}>
                            <div style={{ width:10, height:10, borderRadius:'50%',
                              background:s.ativo!==false?(s.cor||p.cor):'var(--border)',
                              border:`1.5px solid ${s.ativo!==false?(s.cor||p.cor):'var(--border-mid)'}`,
                              marginBottom:10, flexShrink:0 }}/>
                            <div style={{ background:s.ativo!==false?'var(--bg-card)':'var(--bg-surface)',
                              border:'1px solid var(--border)', borderRadius:7, padding:'9px 10px 8px', width:'100%' }}>
                              <div style={{ fontSize:11.5, fontWeight:500,
                                color:s.ativo!==false?'var(--text-primary)':'var(--text-muted)',
                                lineHeight:1.35, marginBottom:5,
                                textDecoration:s.ativo!==false?'none':'line-through' }}>
                                {s.nome}
                              </div>
                              {s.sla_dias && (
                                <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3 }}>SLA {s.sla_dias}d</div>
                              )}
                              {s.responsavel_role && (
                                <div style={{ fontSize:9, padding:'2px 6px', borderRadius:3, display:'inline-block',
                                  background:'var(--bg-surface)', color:'var(--text-muted)',
                                  fontWeight:600, textTransform:'uppercase', letterSpacing:'.04em',
                                  border:'1px solid var(--border)', marginBottom:5 }}>
                                  {s.responsavel_role==='corban_bko'?'Corban':s.responsavel_role==='bko'?'BKO':s.responsavel_role==='comercial'?'Comercial':s.responsavel_role}
                                </div>
                              )}
                              {/* Botão renomear */}
                              <button onClick={()=>setEditCrmEstagio({estagio:s,pipeline:p})}
                                style={{ display:'block', fontSize:10, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'var(--font)', fontWeight:500, marginBottom:5 }}
                                onMouseEnter={e=>e.currentTarget.style.color='var(--text-primary)'}
                                onMouseLeave={e=>e.currentTarget.style.color='var(--text-muted)'}>
                                ⚙ Configurar
                              </button>
                              {/* Toggle por estágio */}
                              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                                <span style={{ fontSize:9, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'.04em' }}>
                                  {s.ativo!==false?'Ativo':'Inativo'}
                                </span>
                                <div onClick={()=>handleToggleCrmEstagio(p.id, s)} style={{ cursor:'pointer' }}>
                                  <div style={{ width:28, height:15, borderRadius:99,
                                    background:s.ativo!==false?'#4A7C59':'rgba(0,0,0,.15)',
                                    display:'flex', alignItems:'center', padding:'2px 3px', transition:'background .2s' }}>
                                    <div style={{ width:9, height:9, borderRadius:'50%', background:'#fff',
                                      transform:s.ativo!==false?'translateX(13px)':'translateX(0)',
                                      transition:'transform .2s', boxShadow:'0 1px 2px rgba(0,0,0,.2)' }}/>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {/* Botão adicionar novo estágio */}
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', minWidth:120, padding:'0 4px' }}>
                          <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--border)', border:'1.5px dashed var(--border-mid)', marginBottom:10, flexShrink:0 }}/>
                          <button onClick={()=>setNovoEstagioPipeline(p)}
                            style={{ width:'100%', padding:'9px 8px', borderRadius:7, background:'none',
                              border:'1px dashed var(--border-mid)', fontSize:11, color:'var(--text-muted)',
                              cursor:'pointer', fontFamily:'var(--font)', transition:'all .15s' }}
                            onMouseEnter={e=>{ e.currentTarget.style.borderColor='#3B5BDB'; e.currentTarget.style.color='#3B5BDB'; e.currentTarget.style.background='rgba(59,91,219,.04)'; }}
                            onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border-mid)'; e.currentTarget.style.color='var(--text-muted)'; e.currentTarget.style.background='none'; }}>
                            + Novo estágio
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Divisor entre pipelines */}
                <div style={{ height:1, background:'var(--border)', marginTop:28 }}/>
              </div>
            );
          })}

          {/* ── Seção: Funis de arquivo ── */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:600, color:'var(--text-primary)', letterSpacing:'-.01em' }}>Funis de arquivo</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>Organize clientes integrados, perdidos e outros</div>
              </div>
              <button onClick={()=>setModalFunil(true)}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, background:'var(--bg-card)', border:'1px solid var(--border)', fontSize:12, fontWeight:600, color:'var(--text-secondary)', cursor:'pointer', fontFamily:'var(--font)', transition:'all .15s' }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor='#3B5BDB'; e.currentTarget.style.color='#3B5BDB'; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-secondary)'; }}>
                + Novo funil
              </button>
            </div>

            {funisAtivos.length === 0 ? (
              <div style={{ padding:'32px 0', textAlign:'center', fontSize:12, color:'var(--text-muted)' }}>
                Nenhum funil criado ainda.
              </div>
            ) : (
              /* Timeline dos funis — mesma estrutura horizontal */
              <div style={{ overflowX:'auto', paddingBottom:8 }}>
                <div style={{ position:'relative', minWidth: funisAtivos.length * 180 }}>
                  <div style={{ position:'absolute', top:10, left:60, right:60, height:1, background:'var(--border)', zIndex:0 }}/>
                  <div style={{ display:'flex', alignItems:'flex-start', position:'relative', zIndex:1 }}>
                    {funisAtivos.map((f)=>(
                      <div key={f.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', minWidth:170, padding:'0 4px' }}>
                        <div style={{ width:10, height:10, borderRadius:'50%', background:f.cor, border:`1.5px solid ${f.cor}`, marginBottom:10, flexShrink:0 }}/>
                        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 10px 8px', width:'100%' }}>
                          <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', marginBottom:8 }}>{f.nome}</div>
                          <div style={{ display:'flex', gap:6 }}>
                            <button onClick={()=>setEditFunil(f)}
                              style={{ flex:1, padding:'4px 0', borderRadius:6, fontSize:10, fontWeight:600, cursor:'pointer', background:'rgba(0,0,0,.04)', border:'1px solid var(--border)', color:'var(--text-muted)', fontFamily:'var(--font)' }}
                              onMouseEnter={e=>{ e.currentTarget.style.background='rgba(59,91,219,.08)'; e.currentTarget.style.color='#3B5BDB'; }}
                              onMouseLeave={e=>{ e.currentTarget.style.background='rgba(0,0,0,.04)'; e.currentTarget.style.color='var(--text-muted)'; }}>
                              ✎ Renomear
                            </button>
                            <button onClick={()=>handleArquivarFunil(f)}
                              style={{ flex:1, padding:'4px 0', borderRadius:6, fontSize:10, fontWeight:600, cursor:'pointer', background:'var(--danger-dim)', border:'1px solid rgba(192,65,58,.15)', color:'var(--danger)', fontFamily:'var(--font)' }}>
                              Arquivar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Botão adicionar no final da timeline */}
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', minWidth:130, padding:'0 4px' }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--border)', border:'1.5px dashed var(--border-mid)', marginBottom:10, flexShrink:0 }}/>
                      <button onClick={()=>setModalFunil(true)}
                        style={{ width:'100%', padding:'10px 8px', borderRadius:8, background:'none', border:'1px dashed var(--border-mid)', fontSize:11, color:'var(--text-muted)', cursor:'pointer', fontFamily:'var(--font)', transition:'all .15s' }}
                        onMouseEnter={e=>{ e.currentTarget.style.borderColor='#3B5BDB'; e.currentTarget.style.color='#3B5BDB'; e.currentTarget.style.background='rgba(59,91,219,.04)'; }}
                        onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border-mid)'; e.currentTarget.style.color='var(--text-muted)'; e.currentTarget.style.background='none'; }}>
                        + Novo funil
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {modalNovoPipeline    && <ModalNovoPipeline onSave={handleCriarPipeline} onClose={()=>setModalNovoPipeline(false)}/>}
      {modalRenomear        && <ModalRenomear estagio={modalRenomear} onSave={handleRenomear} onClose={()=>setModalRenomear(null)}/>}
      {editCrmPipeline      && <ModalEditarCrmPipeline pipeline={editCrmPipeline} onSave={handleSalvarCrmPipeline} onClose={()=>setEditCrmPipeline(null)}/>}
      {editCrmEstagio       && <ModalRenomearCrmEstagio estagio={editCrmEstagio.estagio} onSave={handleSalvarCrmEstagio} onClose={()=>setEditCrmEstagio(null)}/>}
      {novoEstagioPipeline  && <ModalNovoEstagio pipeline={novoEstagioPipeline} onSave={handleCriarCrmEstagio} onClose={()=>setNovoEstagioPipeline(null)}/>}
      {modalFunil           && <ModalNovoFunil funil={null}      onSave={handleCriarFunil}   onClose={()=>setModalFunil(false)}/>}
      {editFunil            && <ModalNovoFunil funil={editFunil} onSave={handleRenomearFunil} onClose={()=>setEditFunil(null)}/>}
    </div>
  );
}