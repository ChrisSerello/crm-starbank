import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../../supabase';
import { gid } from '../../utils';
import ReactDOM from 'react-dom';

const B_MID   = '#3B5BDB';
const B_LIGHT = 'rgba(13,27,86,0.1)';
const B_GLOW  = 'rgba(59,91,219,0.28)';

// ─── Formatadores ─────────────────────────────────────────────────────────────
const fmtCNPJ = v =>
  v?.replace(/\D/g,'').length === 14
    ? v.replace(/\D/g,'').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    : (v || '');

const fmtTel = v =>
  v?.replace(/\D/g,'').length === 11
    ? v.replace(/\D/g,'').replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
    : (v || '');

// Estágios
const GC_STAGES = [
  { id:'rascunho',          label:'Rascunho',           color:'#8B5CF6', bg:'rgba(139,92,246,.08)' },
  { id:'inativo',           label:'Inativo',            color:'#6B7280', bg:'rgba(107,114,128,.1)'  },
  { id:'ativo_sem_producao',label:'Ativo Sem Produção',  color:'#F59E0B', bg:'rgba(245,158,11,.1)'   },
  { id:'novo',              label:'Novo',                color:'#3B5BDB', bg:'rgba(59,91,219,.1)'    },
  { id:'20mil',             label:'20 Mil',              color:'#0EA5E9', bg:'rgba(14,165,233,.1)'   },
  { id:'100mil',            label:'100 Mil',             color:'#10B981', bg:'rgba(16,185,129,.1)'   },
  { id:'300mil',            label:'300 Mil',             color:'#7C3AED', bg:'rgba(124,58,237,.1)'   },
  { id:'500mil',            label:'500 Mil',             color:'#F97316', bg:'rgba(249,115,22,.1)'   },
  { id:'1milhao',           label:'1 Milhão',            color:'#EF4444', bg:'rgba(239,68,68,.1)'    },
];

// Portal Row (linha de dado somente-leitura) 
function PortalRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{
      display:'grid', gridTemplateColumns:'110px 1fr', gap:8,
      padding:'5px 0', borderBottom:'1px solid rgba(139,92,246,.1)',
    }}>
      <span style={{fontSize:11,color:'rgba(139,92,246,.7)',fontWeight:600}}>{label}</span>
      <span style={{fontSize:11,fontWeight:500,color:'var(--text-primary)',wordBreak:'break-all'}}>{value}</span>
    </div>
  );
}

// Portal Badge 
function PortalBadge({ style={} }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:4,
      fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:4,
      background:'rgba(139,92,246,.12)', color:'#7C3AED',
      border:'1px solid rgba(139,92,246,.22)', letterSpacing:'.04em',
      ...style,
    }}>
      ⚡ Portal
    </span>
  );
}

// ─── CARD (opção B — lateral colorida) ───────────────────────────────────────
function GCCard({ c, onSelect, setDragId, onMove, profile }){
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos]   = useState({top:0,left:0});
  const btnRef = useRef(null);

  useEffect(()=>{
    if(!menuOpen) return;
    const close=(e)=>{
      if(btnRef.current&&!btnRef.current.closest('[data-gc-menu]')?.contains(e.target))
        setMenuOpen(false);
    };
    document.addEventListener('mousedown',close);
    return()=>document.removeEventListener('mousedown',close);
  },[menuOpen]);

  const openMenu=(e)=>{
    e.preventDefault(); e.stopPropagation();
    const rect=btnRef.current.getBoundingClientRect();
    setMenuPos({top:rect.bottom+4, left:rect.right-220});
    setMenuOpen(v=>!v);
  };

  const stage = GC_STAGES.find(s=>s.id===c.estagio);
  const tel   = fmtTel(c.pj_telefone || c.pf_telefone);
  const cnpj  = fmtCNPJ(c.pj_cnpj);

  // iniciais do responsável para o avatar
  const initials = c.responsavel_nome
    ? c.responsavel_nome.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()
    : null;

  return(
    <>
      {/* ── Card ── */}
      <div
        draggable
        onDragStart={()=>setDragId(c.id)}
        onClick={(e)=>{if(!e.defaultPrevented)onSelect(c);}}
        style={{
          background:'var(--bg-card)',
          border:'1px solid var(--border)',
          borderLeft:`3px solid ${stage?.color||'#8B5CF6'}`,
          borderRadius:8,
          padding:'10px 12px',
          marginBottom:7,
          cursor:'pointer',
          position:'relative',
          transition:'border-color .15s, box-shadow .15s',
        }}
        onMouseEnter={e=>{
          e.currentTarget.style.boxShadow=`0 2px 8px ${stage?.color}18`;
          e.currentTarget.style.borderColor=stage?.color||'#8B5CF6';
        }}
        onMouseLeave={e=>{
          e.currentTarget.style.boxShadow='none';
          e.currentTarget.style.borderColor='var(--border)';
          e.currentTarget.style.borderLeftColor=stage?.color||'#8B5CF6';
        }}
      >
        {/* badge portal */}
        {c.origem_portal && (
          <span style={{
            display:'inline-flex',alignItems:'center',gap:3,
            fontSize:9,fontWeight:700,padding:'1px 6px',borderRadius:3,
            background:'rgba(139,92,246,.1)',color:'#7C3AED',
            marginBottom:6,letterSpacing:'.03em',
          }}>
            ⚡ Portal
          </span>
        )}

        {/* nome */}
        <div style={{
          fontSize:12,fontWeight:600,color:'var(--text-primary)',
          lineHeight:1.3,marginBottom:7,paddingRight:22,
        }}>
          {c.nome}
        </div>

        {/* linhas de info */}
        {cnpj && (
          <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--text-muted)',marginBottom:3}}>
            <span style={{fontSize:12,opacity:.6}}>🏢</span> {cnpj}
          </div>
        )}
        {tel && (
          <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--text-muted)',marginBottom:3}}>
            <span style={{fontSize:12,opacity:.6}}>📞</span> {tel}
          </div>
        )}
        {c.saldo_produzido && (
          <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,fontWeight:700,color:'#10B981',marginBottom:3}}>
            <span style={{fontSize:12}}>💰</span> {c.saldo_produzido}
          </div>
        )}

        {/* rodapé: avatar + responsável */}
        <div style={{
          display:'flex',alignItems:'center',gap:6,
          marginTop:8,paddingTop:7,
          borderTop:'1px solid var(--border)',
        }}>
          <div style={{
            width:18,height:18,borderRadius:'50%',flexShrink:0,
            background: initials ? 'rgba(59,91,219,.12)' : 'rgba(0,0,0,.06)',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:8,fontWeight:700,
            color: initials ? '#3B5BDB' : 'var(--text-faint)',
          }}>
            {initials || '—'}
          </div>
          <span style={{fontSize:10,color: initials ? 'var(--text-muted)' : 'var(--text-faint)'}}>
            {c.responsavel_nome || 'Sem responsável'}
          </span>
        </div>

        {/* botão menu */}
        <button ref={btnRef} onClick={openMenu}
          style={{
            position:'absolute',top:8,right:8,
            background:'rgba(0,0,0,.06)',border:'none',borderRadius:5,
            cursor:'pointer',width:20,height:20,
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:11,color:'var(--text-muted)',lineHeight:1,padding:0,
          }}>⋯</button>
      </div>

      {/* ── Menu contextual ── */}
      {menuOpen&&ReactDOM.createPortal(
        <div data-gc-menu="1" onMouseDown={e=>e.stopPropagation()}
          style={{
            position:'fixed',top:menuPos.top,left:Math.max(8,menuPos.left),
            zIndex:9999,background:'var(--bg-card)',
            border:'1px solid var(--border)',borderRadius:10,
            boxShadow:'0 8px 24px rgba(0,0,0,.18)',minWidth:200,overflow:'hidden',
          }}>
          <div style={{padding:'7px 12px',fontSize:9,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.08em',borderBottom:'1px solid var(--border)'}}>
            Mover para…
          </div>
          {GC_STAGES.filter(s=>s.id!==c.estagio).map(s=>(
            <button key={s.id}
              onMouseDown={e=>{e.stopPropagation();onMove(c.id,s.id);setMenuOpen(false);}}
              style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'7px 12px',background:'none',border:'none',cursor:'pointer',textAlign:'left',fontSize:12,color:'var(--text-primary)',fontFamily:'var(--font)',transition:'background .1s'}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,.04)'}
              onMouseLeave={e=>e.currentTarget.style.background='none'}>
              <div style={{width:7,height:7,borderRadius:'50%',background:s.color,flexShrink:0}}/>{s.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

// ─── COLUNA ───────────────────────────────────────────────────────────────────
function GCCol({ s, corbans, dragId, setDragId, onMove, onSelect, profile, collapsed, onToggleCollapse }){
  const [over, setOver] = useState(false);
  const items = corbans.filter(c=>c.estagio===s.id);

  return(
    <div
      style={{
        minWidth:collapsed?44:180, width:collapsed?44:210, flexShrink:0,
        background:over?`${s.color}06`:'rgba(0,0,0,.02)',
        border:`1px solid ${over?s.color+'40':'var(--border)'}`,
        borderRadius:12, padding:'10px 8px',
        transition:'all .22s cubic-bezier(.4,0,.2,1)', display:'flex', flexDirection:'column',
      }}
      onDragOver={e=>{e.preventDefault();setOver(true);}}
      onDragLeave={()=>setOver(false)}
      onDrop={()=>{setOver(false);if(dragId)onMove(dragId,s.id);}}
    >
      {collapsed?(
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,cursor:'pointer',paddingTop:4}} onClick={onToggleCollapse} title={`Expandir: ${s.label}`}>
          <div style={{width:7,height:7,borderRadius:'50%',background:s.color,boxShadow:`0 0 5px ${s.color}60`}}/>
          <span style={{fontSize:10,fontWeight:700,background:s.bg,color:s.color,borderRadius:99,padding:'2px 6px'}}>{items.length}</span>
          <span style={{fontSize:9,color:'var(--text-faint)',writingMode:'vertical-rl',transform:'rotate(180deg)',marginTop:4,maxHeight:100,overflow:'hidden',whiteSpace:'nowrap'}}>{s.label}</span>
        </div>
      ):(
        <>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10,padding:'0 3px',flexShrink:0}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:s.color,boxShadow:`0 0 5px ${s.color}60`,flexShrink:0}}/>
            <span style={{fontSize:11,fontWeight:600,color:'var(--text-secondary)',flex:1}}>{s.label}</span>
            <span style={{fontSize:10,fontWeight:700,background:s.bg,color:s.color,borderRadius:99,padding:'1px 6px'}}>{items.length}</span>
            <button onClick={onToggleCollapse} title="Recolher"
              style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-faint)',fontSize:12,padding:'0 2px',lineHeight:1}}
              onMouseEnter={e=>e.currentTarget.style.color='var(--text-secondary)'}
              onMouseLeave={e=>e.currentTarget.style.color='var(--text-faint)'}>‹</button>
          </div>
          <div style={{flex:1,overflowY:'auto',minHeight:40,paddingRight:2,scrollbarWidth:'thin',scrollbarColor:'rgba(0,0,0,.1) transparent'}}>
            {items.map(c=>(
              <GCCard key={c.id} c={c} onSelect={onSelect} setDragId={setDragId} onMove={onMove} profile={profile}/>
            ))}
            {items.length===0&&<div style={{textAlign:'center',padding:'16px 0',fontSize:10,color:'var(--text-faint)'}}>Solte aqui</div>}
          </div>
        </>
      )}
    </div>
  );
}

// ─── MODAL DETALHE ────────────────────────────────────────────────────────────
function GCDetalhe({ corban, onClose, onSave, onDelete, responsaveis }){
  const [form,       setForm]       = useState({...corban});
  const [saving,     setSaving]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [showPortal, setShowPortal] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const save = async() => {
    setSaving(true);
    const resp = responsaveis.find(r=>r.id===form.responsavel_id);
    const updated = {...form, responsavel_nome: resp?.nome||form.responsavel_nome};
    const {error} = await supabase.from('gestao_corbans')
      .update({
        nome:            updated.nome,
        localizacao:     updated.localizacao,
        saldo_produzido: updated.saldo_produzido,
        estagio:         updated.estagio,
        responsavel_id:  updated.responsavel_id||null,
        responsavel_nome:updated.responsavel_nome||null,
        observacoes:     updated.observacoes,
        updated_at:      new Date().toISOString(),
      })
      .eq('id', corban.id);
    setSaving(false);
    if(!error) onSave(updated);
  };

  const del = async() => {
    await supabase.from('gestao_corbans').delete().eq('id', corban.id);
    onDelete(corban.id);
  };

  const stage = GC_STAGES.find(s=>s.id===form.estagio);
  const hasPerfilComercial = form.tipo_operacao || form.producao_mensal || form.produtos_atuacao?.length;
  const hasBanco           = form.banco_nome;
  const hasRepresentante   = form.pf_nome;

  return(
    <div
      style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:'var(--bg-card)',borderRadius:16,padding:28,width:520,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>

        {/* ── Header ── */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
          <div>
            {form.origem_portal && <PortalBadge style={{marginBottom:8,display:'inline-flex'}}/>}
            <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:600,color:'var(--text-primary)'}}>{form.nome}</div>
            <div style={{marginTop:6}}>
              <span style={{fontSize:10,padding:'2px 8px',borderRadius:99,fontWeight:700,background:`${stage?.color}18`,color:stage?.color}}>
                {stage?.label}
              </span>
            </div>
          </div>
          <button onClick={onClose}
            style={{background:'rgba(0,0,0,.06)',border:'1px solid var(--border)',borderRadius:8,cursor:'pointer',width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,color:'var(--text-muted)'}}>×</button>
        </div>

        {/* ── Seção dados do portal (colapsável) ── */}
        {form.origem_portal && (
          <div style={{
            border:'1px solid rgba(139,92,246,.22)',
            borderRadius:12, marginBottom:18, overflow:'hidden',
            background:'rgba(139,92,246,.03)',
          }}>
            <button
              onClick={()=>setShowPortal(v=>!v)}
              style={{
                width:'100%', display:'flex', justifyContent:'space-between',
                alignItems:'center', padding:'10px 14px',
                background:'none', border:'none', cursor:'pointer',
                fontFamily:'var(--font)',
              }}>
              <span style={{fontSize:11,fontWeight:700,color:'#7C3AED',display:'flex',alignItems:'center',gap:6}}>
                ⚡ Dados preenchidos no portal
                <span style={{
                  fontSize:9,fontWeight:600,padding:'1px 6px',borderRadius:4,
                  background:'rgba(139,92,246,.12)',color:'#7C3AED',
                }}>
                  {form.portal_status === 'rascunho' ? 'incompleto' : 'completo'}
                </span>
              </span>
              <span style={{
                fontSize:14, color:'#7C3AED',
                transform:showPortal?'rotate(180deg)':'none',
                transition:'transform .2s', display:'inline-block',
              }}>▾</span>
            </button>

            {showPortal && (
              <div style={{padding:'0 14px 14px'}}>

                {/* Empresa */}
                <div style={{fontSize:10,fontWeight:700,color:'rgba(139,92,246,.7)',textTransform:'uppercase',letterSpacing:'.07em',padding:'8px 0 6px'}}>
                  Empresa
                </div>
                <PortalRow label="CNPJ"          value={fmtCNPJ(form.pj_cnpj)} />
                <PortalRow label="Razão Social"   value={form.pj_razao_social} />
                <PortalRow label="Nome Fantasia"  value={form.pj_nome_fantasia} />
                <PortalRow label="Endereço"       value={form.pj_endereco ? `${form.pj_endereco}${form.pj_uf ? ' — ' + form.pj_uf : ''}` : null} />
                <PortalRow label="CEP"            value={form.pj_cep} />
                <PortalRow label="Telefone PJ"    value={fmtTel(form.pj_telefone)} />

                {/* Perfil Comercial */}
                {hasPerfilComercial && (
                  <>
                    <div style={{fontSize:10,fontWeight:700,color:'rgba(139,92,246,.7)',textTransform:'uppercase',letterSpacing:'.07em',padding:'12px 0 6px'}}>
                      Perfil Comercial
                    </div>
                    <PortalRow label="Tipo de Operação" value={form.tipo_operacao} />
                    <PortalRow label="Produção Mensal"  value={form.producao_mensal} />
                    <PortalRow label="Produtos"         value={form.produtos_atuacao?.join(', ')} />
                    <PortalRow label="Bancos parceiros" value={form.bancos_parceiros?.join(', ')} />
                    <PortalRow label="Estados"          value={form.estados_atuacao?.join(', ')} />
                  </>
                )}

                {/* Representante Legal */}
                {hasRepresentante && (
                  <>
                    <div style={{fontSize:10,fontWeight:700,color:'rgba(139,92,246,.7)',textTransform:'uppercase',letterSpacing:'.07em',padding:'12px 0 6px'}}>
                      Representante Legal
                    </div>
                    <PortalRow label="Nome"       value={form.pf_nome} />
                    <PortalRow label="CPF"        value={form.pf_cpf} />
                    <PortalRow label="E-mail"     value={form.pf_email} />
                    <PortalRow label="Celular"    value={fmtTel(form.pf_telefone)} />
                    <PortalRow label="Cidade/UF"  value={form.pf_cidade ? `${form.pf_cidade} — ${form.pf_uf}` : null} />
                    <PortalRow label="Nascimento" value={form.pf_nascimento} />
                    <PortalRow label="Estado Civil" value={form.pf_estado_civil} />
                  </>
                )}

                {/* Dados Bancários */}
                {hasBanco && (
                  <>
                    <div style={{fontSize:10,fontWeight:700,color:'rgba(139,92,246,.7)',textTransform:'uppercase',letterSpacing:'.07em',padding:'12px 0 6px'}}>
                      Dados Bancários
                    </div>
                    <PortalRow label="Banco"   value={form.banco_nome} />
                    <PortalRow label="Agência" value={form.banco_agencia} />
                    <PortalRow label="Conta"   value={form.banco_conta ? `${form.banco_conta}${form.banco_digito ? '-' + form.banco_digito : ''}` : null} />
                    <PortalRow label="PIX"     value={form.banco_pix} />
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Campos editáveis ── */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
          <div style={{gridColumn:'1/-1'}}>
            <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Nome *</label>
            <input className="inp" value={form.nome||''} onChange={e=>set('nome',e.target.value)} placeholder="Nome do corban"/>
          </div>
          <div>
            <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Localização</label>
            <input className="inp" value={form.localizacao||''} onChange={e=>set('localizacao',e.target.value)} placeholder="Cidade / Estado"/>
          </div>
          <div>
            <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Saldo Produzido</label>
            <input className="inp" value={form.saldo_produzido||''} onChange={e=>set('saldo_produzido',e.target.value)} placeholder="Ex: R$ 50.000"/>
          </div>
          <div>
            <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Estágio</label>
            <select className="sel" value={form.estagio||'novo'} onChange={e=>set('estagio',e.target.value)}>
              {GC_STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Responsável</label>
            <select className="sel" value={form.responsavel_id||''} onChange={e=>set('responsavel_id',e.target.value)}>
              <option value="">— Sem responsável —</option>
              {responsaveis.map(r=><option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
          </div>
          <div style={{gridColumn:'1/-1'}}>
            <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Observações</label>
            <textarea className="inp" value={form.observacoes||''} onChange={e=>set('observacoes',e.target.value)} placeholder="Anotações sobre este corban…" rows={3} style={{resize:'vertical'}}/>
          </div>
        </div>

        {/* ── Ações ── */}
        <div style={{display:'flex',gap:8,justifyContent:'space-between',marginTop:8}}>
          {!confirmDel
            ? <button onClick={()=>setConfirmDel(true)} style={{padding:'6px 12px',borderRadius:7,background:'var(--danger-dim)',color:'var(--danger)',border:'none',cursor:'pointer',fontSize:12,fontWeight:600}}>Excluir</button>
            : <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <span style={{fontSize:11,color:'var(--danger)'}}>Confirmar?</span>
                <button onClick={del} style={{padding:'4px 10px',borderRadius:6,background:'var(--danger)',color:'#fff',border:'none',cursor:'pointer',fontSize:11,fontWeight:600}}>Sim</button>
                <button onClick={()=>setConfirmDel(false)} style={{padding:'4px 10px',borderRadius:6,background:'rgba(0,0,0,.06)',color:'var(--text-muted)',border:'none',cursor:'pointer',fontSize:11}}>Não</button>
              </div>
          }
          <div style={{display:'flex',gap:8}}>
            <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn" style={{background:B_MID,color:'#fff',boxShadow:`0 3px 12px ${B_GLOW}`}} onClick={save} disabled={saving}>{saving?'Salvando…':'Salvar'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL NOVO ───────────────────────────────────────────────────────────────
function GCNovo({ onClose, onSave, profile, responsaveis }){
  const [form, setForm] = useState({
    nome:'', localizacao:'', estagio:'novo',
    responsavel_id: profile?.id||'',
    responsavel_nome: profile?.nome||'',
  });
  const [saving, setSaving] = useState(false);
  const [msg,    setMsg]    = useState(null);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const save = async() => {
    if(!form.nome.trim()){ setMsg('Nome é obrigatório.'); return; }
    setSaving(true);
    const resp = responsaveis.find(r=>r.id===form.responsavel_id);
    const novo = {
      id: gid(),
      nome:            form.nome.trim(),
      localizacao:     form.localizacao.trim(),
      estagio:         form.estagio,
      responsavel_id:  form.responsavel_id||null,
      responsavel_nome:resp?.nome||profile?.nome||null,
      saldo_produzido: null,
      observacoes:     null,
      origem_portal:   false,
      created_at:      new Date().toISOString(),
      updated_at:      new Date().toISOString(),
    };
    const {error} = await supabase.from('gestao_corbans').insert(novo);
    setSaving(false);
    if(error){ setMsg(error.message); return; }
    onSave(novo);
  };

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:'var(--bg-card)',borderRadius:16,padding:28,width:420,boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <div>
            <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:600,color:'var(--text-primary)'}}>Novo Corban</div>
            <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>Gestão de Corbans</div>
          </div>
          <button onClick={onClose} style={{background:'rgba(0,0,0,.06)',border:'1px solid var(--border)',borderRadius:8,cursor:'pointer',width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,color:'var(--text-muted)'}}>×</button>
        </div>

        {msg&&<div style={{padding:'8px 12px',borderRadius:8,marginBottom:12,background:'var(--danger-dim)',border:'1px solid rgba(192,65,58,.2)',fontSize:12,color:'var(--danger)'}}>{msg}</div>}

        <div style={{marginBottom:12}}>
          <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Nome *</label>
          <input className="inp" value={form.nome} onChange={e=>set('nome',e.target.value)} placeholder="Nome do corban" autoFocus/>
        </div>
        <div style={{marginBottom:12}}>
          <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Localização</label>
          <input className="inp" value={form.localizacao} onChange={e=>set('localizacao',e.target.value)} placeholder="Cidade / Estado"/>
        </div>
        <div style={{marginBottom:12}}>
          <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Estágio inicial</label>
          <select className="sel" value={form.estagio} onChange={e=>set('estagio',e.target.value)}>
            {GC_STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div style={{marginBottom:20}}>
          <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Responsável</label>
          <select className="sel" value={form.responsavel_id||''} onChange={e=>set('responsavel_id',e.target.value)}>
            <option value="">— Sem responsável —</option>
            {responsaveis.map(r=><option key={r.id} value={r.id}>{r.nome}</option>)}
          </select>
        </div>

        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" style={{background:B_MID,color:'#fff',boxShadow:`0 3px 12px ${B_GLOW}`}} onClick={save} disabled={saving}>
            {saving?'Salvando…':'Cadastrar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export function BKOGestaoCorbans({ profile }){
  const [corbans,      setCorbans]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [dragId,       setDragId]       = useState(null);
  const [search,       setSearch]       = useState('');
  const [collapsedCols,setCollapsedCols]= useState(new Set());
  const [selected,     setSelected]     = useState(null);
  const [novoOpen,     setNovoOpen]     = useState(false);
  const [responsaveis, setResponsaveis] = useState([]);
  const colsRef = useRef(null);

  const toggleCol = (id) => setCollapsedCols(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});

  // Carregar responsáveis
  useEffect(()=>{
    supabase.from('profiles')
      .select('id,nome')
      .eq('modulo','bko')
      .eq('acesso_gestao_corban',true)
      .order('nome')
      .then(({data})=>setResponsaveis(data||[]));
  },[]);

  // Carregar corbans + realtime
  useEffect(()=>{
    supabase.from('gestao_corbans')
      .select('*')
      .order('created_at',{ascending:false})
      .then(({data})=>{setCorbans(data||[]);setLoading(false);});

    const ch = supabase.channel('gestao_corbans_rt')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'gestao_corbans'},p=>{
        setCorbans(prev=>prev.find(c=>c.id===p.new.id)?prev:[p.new,...prev]);
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'gestao_corbans'},p=>{
        setCorbans(prev=>prev.map(c=>c.id===p.new.id?p.new:c));
      })
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'gestao_corbans'},p=>{
        setCorbans(prev=>prev.filter(c=>c.id!==p.old.id));
      })
      .subscribe();
    return()=>supabase.removeChannel(ch);
  },[]);

  const filtered = useMemo(()=>{
    if(!search.trim()) return corbans;
    const s = search.toLowerCase();
    return corbans.filter(c=>
      c.nome?.toLowerCase().includes(s) ||
      c.localizacao?.toLowerCase().includes(s) ||
      c.responsavel_nome?.toLowerCase().includes(s) ||
      c.pj_cnpj?.includes(s.replace(/\D/g,'')) ||
      c.pf_nome?.toLowerCase().includes(s) ||
      c.pf_email?.toLowerCase().includes(s) ||
      c.pj_telefone?.includes(s.replace(/\D/g,''))
    );
  },[corbans,search]);

  const onMove = useCallback(async(id, novoEstagio)=>{
    setCorbans(prev=>prev.map(c=>c.id!==id?c:{...c,estagio:novoEstagio}));
    setDragId(null);
    await supabase.from('gestao_corbans').update({estagio:novoEstagio,updated_at:new Date().toISOString()}).eq('id',id);
  },[]);

  const onSaveDetalhe = useCallback((updated)=>{
    setCorbans(prev=>prev.map(c=>c.id===updated.id?{...c,...updated}:c));
    setSelected(null);
  },[]);

  const onDeleteDetalhe = useCallback((id)=>{
    setCorbans(prev=>prev.filter(c=>c.id!==id));
    setSelected(null);
  },[]);

  const onSaveNovo = useCallback((novo)=>{
    setCorbans(prev=>[novo,...prev]);
    setNovoOpen(false);
  },[]);

  const totalAtivos  = corbans.filter(c=>c.estagio!=='inativo'&&c.estagio!=='rascunho').length;
  const totalPortal  = corbans.filter(c=>c.origem_portal).length;

  return(
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px 0',flexShrink:0,marginBottom:16,flexWrap:'wrap',gap:12}}>
        <div>
          <div className="section-title">Gestão de Corbans</div>
          <div className="section-sub">
            {totalAtivos} corbans ativos · arraste para mover
            {totalPortal > 0 && (
              <span style={{marginLeft:8,fontSize:10,fontWeight:700,padding:'1px 7px',borderRadius:4,background:'rgba(139,92,246,.12)',color:'#7C3AED',border:'1px solid rgba(139,92,246,.18)'}}>
                ⚡ {totalPortal} do portal
              </span>
            )}
          </div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <div style={{position:'relative',width:220}}>
            <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-faint)',fontSize:12}}>⌕</span>
            <input className="inp" style={{paddingLeft:30,height:34,fontSize:12}} placeholder="Buscar corban, CNPJ, e-mail…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <button className="btn" style={{background:B_MID,color:'#fff',boxShadow:`0 3px 12px rgba(59,91,219,.28)`}} onClick={()=>setNovoOpen(true)}>
            + Novo Corban
          </button>
        </div>
      </div>

      {/* Kanban */}
      {loading?(
        <div style={{textAlign:'center',padding:'60px 0',fontSize:13,color:'var(--text-muted)'}}>Carregando…</div>
      ):(
        <div ref={colsRef} style={{display:'flex',gap:7,overflowX:'auto',overflowY:'hidden',padding:'0 20px 16px',flex:1,minHeight:0,alignItems:'stretch',scrollbarWidth:'thin',scrollbarColor:'rgba(59,91,219,.4) transparent'}}>
          {GC_STAGES.map(s=>(
            <GCCol
              key={s.id}
              s={s}
              corbans={filtered}
              dragId={dragId}
              setDragId={setDragId}
              onMove={onMove}
              onSelect={setSelected}
              profile={profile}
              collapsed={collapsedCols.has(s.id)}
              onToggleCollapse={()=>toggleCol(s.id)}
            />
          ))}
        </div>
      )}

      {/* Modais */}
      {selected&&(
        <GCDetalhe
          corban={selected}
          onClose={()=>setSelected(null)}
          onSave={onSaveDetalhe}
          onDelete={onDeleteDetalhe}
          responsaveis={responsaveis}
        />
      )}
      {novoOpen&&(
        <GCNovo
          onClose={()=>setNovoOpen(false)}
          onSave={onSaveNovo}
          profile={profile}
          responsaveis={responsaveis}
        />
      )}
    </div>
  );
}