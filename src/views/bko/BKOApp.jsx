import { useState, useEffect, useReducer, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../../supabase';
import { gid, TODAY, fmtD, sinceD } from '../../utils';
import { DOC_STATUS } from '../../constants';
import { Avatar, StageTag } from '../../components/shared';
import { AlterarSenha } from '../../components/AlterarSenha';

const B_DARK  = '#1C2033';
const B_MID   = '#3B5BDB';
const B_LIGHT = 'rgba(59,91,219,0.10)';
const B_GLOW  = 'rgba(59,91,219,0.28)';
const B_TEXT  = '#A5B4FC';

const ROLE_LABELS = { comercial:'Comercial', corban_bko:'Corban', bko:'BKO' };
const ROLE_COLORS = { comercial:'#3B5BDB', corban_bko:'#0EA5E9', bko:'#7C3AED' };

const BKO_STAGES = [
  { id:'clientes_novos',   label:'Clientes Novos',              color:'#3B5BDB', bg:'rgba(59,91,219,.1)'  },
  { id:'saldo_andamento',  label:'Saldo em Andamento - BKO',    color:'#7C3AED', bg:'rgba(124,58,237,.1)' },
  { id:'em_negociacao',    label:'Em Negociação - Corban',      color:'#0EA5E9', bg:'rgba(14,165,233,.1)' },
  { id:'abertura_conta',   label:'Abertura de Conta - Corban',  color:'#10B981', bg:'rgba(16,185,129,.1)' },
  { id:'digitar_proposta', label:'Digitar Proposta - Corban',   color:'#F59E0B', bg:'rgba(245,158,11,.1)' },
  { id:'integrado',        label:'Integrado',                   color:'#22C55E', bg:'rgba(34,197,94,.1)'  },
  { id:'perdido',          label:'Perdido',                     color:'#EF4444', bg:'rgba(239,68,68,.1)'  },
];

// ── 1. blankCliente com prefeitura ──
const blankCliente = () => ({
  nomeCliente:'', cpfCliente:'', telefone:'', prefeitura:'',
  estagio:'clientes_novos',
  documentoStatus:'Não solicitado',
  observacoesBko:'', saldoDevedor:'',
  activities:[], documentos:[],
  dataEntrada:TODAY, ultimoContato:TODAY,
});

const INIT = { clientes:[], view:'dashboard', sel:null, newOpen:false };

function R(s,{type:t,...a}){
  switch(t){
    case'SET_C': return{...s,clientes:a.clientes};
    case'VIEW':  return{...s,view:a.v,sel:null};
    case'SEL':   return{...s,sel:a.id};
    case'CLOSE': return{...s,sel:null};
    case'TNEW':  return{...s,newOpen:!s.newOpen};
    case'MOVE':  return{...s,clientes:s.clientes.map(c=>c.id!==a.cid?c:{...c,estagio:a.st,ultimoContato:TODAY,activities:[...(c.activities||[]),{id:gid(),type:'stage_change',date:TODAY,user:a.user,text:`Movido para "${BKO_STAGES.find(s=>s.id===a.st)?.label}"`}]})};
    case'UPD':   return{...s,clientes:s.clientes.map(c=>c.id!==a.c.id?c:{...c,...a.c})};
    case'ADD':   return{...s,newOpen:false,clientes:[{...a.c,activities:[{id:gid(),type:'stage_change',date:TODAY,user:a.user,text:'Cliente cadastrado'}]},...s.clientes]};
    default:     return s;
  }
}

function BKOSidebar({view,setView,profile,onLogout,onAlterarSenha}){
  const r=profile?.role;
  const items=[
    {id:'dashboard',icon:'◈',label:'Dashboard'},
    {id:'pipeline', icon:'⊞',label:'Pipeline'},
    {id:'clientes', icon:'≡',label:'Clientes'},
    ...(r==='comercial'||r==='corban_bko'?[{id:'cadastrar',icon:'＋',label:'Cadastrar'}]:[]),
    ...(r==='comercial'?[{id:'auditoria',icon:'🔍',label:'Auditoria'}]:[]),
  ];
  return(
    <div style={{width:220,background:B_DARK,borderRight:'1px solid rgba(59,91,219,.2)',display:'flex',flexDirection:'column',flexShrink:0,height:'100vh',position:'sticky',top:0}}>
      <div style={{padding:'18px 16px 14px',borderBottom:'1px solid rgba(59,91,219,.15)'}}>
        <div style={{flex:1,overflow:'hidden',borderRadius:8}}>
          <img src="/starflow.gif" alt="StarFlow" style={{display:'block',width:'100%',height:'auto',maxHeight:44,objectFit:'cover',objectPosition:'center',borderRadius:8}}/>
        </div>
        <div style={{marginTop:8,fontSize:9,fontWeight:700,color:B_TEXT,letterSpacing:'.12em',textTransform:'uppercase'}}>BKO — Backoffice</div>
      </div>
      <nav style={{padding:'10px 8px',flex:1}}>
        <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.25)',textTransform:'uppercase',letterSpacing:'.09em',padding:'10px 8px 6px'}}>Menu</div>
        {items.map(it=>(
          <button key={it.id} onClick={()=>setView(it.id)} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:8,fontSize:13,fontWeight:view===it.id?600:400,cursor:'pointer',border:'none',width:'100%',textAlign:'left',transition:'all .15s',position:'relative',background:view===it.id?B_LIGHT:'transparent',color:view===it.id?B_TEXT:'rgba(255,255,255,.5)',fontFamily:'var(--font)'}}>
            {view===it.id&&<div style={{position:'absolute',left:0,top:'18%',bottom:'18%',width:3,background:B_MID,borderRadius:'0 3px 3px 0'}}/>}
            <span style={{fontSize:14,width:20,textAlign:'center'}}>{it.icon}</span>{it.label}
          </button>
        ))}
      </nav>
      <div style={{padding:'12px 14px',borderTop:'1px solid rgba(59,91,219,.15)'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
          <Avatar name={profile?.nome||'U'} size={28} color={ROLE_COLORS[r]||B_MID}/>
          <div style={{minWidth:0}}>
            <div style={{fontSize:11,fontWeight:600,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.nome}</div>
            <div style={{fontSize:9,fontWeight:700,color:B_TEXT,textTransform:'uppercase',letterSpacing:'.07em'}}>{ROLE_LABELS[r]||r}</div>
          </div>
          <div style={{marginLeft:'auto',width:6,height:6,borderRadius:'50%',background:'#22C55E',boxShadow:'0 0 5px #22C55E',flexShrink:0}}/>
        </div>
        <button onClick={onAlterarSenha} style={{width:'100%',padding:'6px 0',borderRadius:6,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',color:'rgba(255,255,255,.5)',fontSize:11,fontWeight:500,cursor:'pointer',fontFamily:'var(--font)',marginBottom:5}}>🔑 Alterar senha</button>
        <button onClick={onLogout} style={{width:'100%',padding:'6px 0',borderRadius:6,background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.2)',color:'#FCA5A5',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'var(--font)'}}>Sair da conta</button>
      </div>
    </div>
  );
}

function StatCard({label,value,color,icon,onClick}){
  return(
    <div onClick={onClick} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:'18px 20px',position:'relative',overflow:'hidden',cursor:'pointer',transition:'transform .15s, box-shadow .15s'}}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 8px 24px ${color}22`;}}
      onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='';}}>
      <div style={{position:'absolute',top:-16,right:-16,width:64,height:64,borderRadius:'50%',background:color,filter:'blur(24px)',opacity:.2}}/>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
        <span style={{fontSize:9,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text-muted)'}}>{label}</span>
        <div style={{width:28,height:28,borderRadius:8,background:`${color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>{icon}</div>
      </div>
      <div style={{fontSize:28,fontWeight:700,color:'var(--text-primary)',fontFamily:'var(--font-display)',lineHeight:1}}>{value}</div>
      <div style={{marginTop:4,fontSize:8,fontWeight:700,color,letterSpacing:'.08em',textTransform:'uppercase'}}>VER →</div>
    </div>
  );
}

function BKODashboard({clientes,setView,setFiltroEstagio}){
  const counts=useMemo(()=>{const m={};BKO_STAGES.forEach(s=>{m[s.id]=clientes.filter(c=>c.estagio===s.id).length;});return m;},[clientes]);
  const handleCard=(stageId)=>{setFiltroEstagio(stageId);setView('pipeline');};
  const recent=useMemo(()=>clientes.flatMap(c=>(c.activities||[]).map(a=>({...a,clienteName:c.nomeCliente}))).sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,8),[clientes]);
  return(
    <div style={{padding:'28px 32px'}}>
      <div style={{marginBottom:24}}><div className="section-title">Dashboard</div><div className="section-sub">BKO Backoffice · {fmtD(TODAY)}</div></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:12}}>
        {BKO_STAGES.slice(0,4).map(s=>(
          <StatCard key={s.id} label={s.label} value={counts[s.id]||0} color={s.color} icon={s.id==='clientes_novos'?'👤':s.id==='saldo_andamento'?'💰':s.id==='em_negociacao'?'⟳':'🏦'} onClick={()=>handleCard(s.id)}/>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
        {BKO_STAGES.slice(4).map(s=>(
          <StatCard key={s.id} label={s.label} value={counts[s.id]||0} color={s.color} icon={s.id==='digitar_proposta'?'📝':s.id==='integrado'?'✓':'✕'} onClick={()=>handleCard(s.id)}/>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <div className="card fu1" style={{padding:'18px 20px'}}>
          <div className="eyebrow" style={{marginBottom:14}}>Pipeline por estágio</div>
          {BKO_STAGES.map(s=>(
            <div key={s.id} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8,cursor:'pointer'}} onClick={()=>handleCard(s.id)}>
              <div style={{width:7,height:7,borderRadius:'50%',background:s.color,flexShrink:0}}/>
              <div style={{flex:1,fontSize:12,color:'var(--text-secondary)'}}>{s.label}</div>
              <div style={{width:100,height:5,background:'rgba(0,0,0,.06)',borderRadius:99,overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:99,background:s.color,width:`${Math.max((counts[s.id]||0)/Math.max(...Object.values(counts),1)*100,0)}%`,transition:'width .6s'}}/>
              </div>
              <div style={{fontSize:12,fontWeight:700,color:'var(--text-primary)',width:20,textAlign:'right'}}>{counts[s.id]||0}</div>
            </div>
          ))}
        </div>
        <div className="card fu2" style={{padding:'18px 20px'}}>
          <div className="eyebrow" style={{marginBottom:14}}>Atividade recente</div>
          {recent.length===0?<div style={{fontSize:12,color:'var(--text-muted)'}}>Nenhuma atividade ainda.</div>:recent.map((a,i)=>(
            <div key={a.id||i} style={{display:'flex',gap:10,padding:'7px 0',borderBottom:i<recent.length-1?'1px solid var(--border)':'none'}}>
              <div style={{width:26,height:26,borderRadius:7,background:B_LIGHT,color:B_MID,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,flexShrink:0}}>⇄</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.clienteName}</div>
                <div style={{fontSize:11,color:'var(--text-muted)',marginTop:1}}>{a.text}</div>
              </div>
              <div style={{fontSize:10,color:'var(--text-faint)',flexShrink:0}}>{fmtD(a.date)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 2. KANBAN: mostra prefeitura no card ──
function BKOKanbanCol({s,clientes,dragId,setDragId,dispatch,onSelect,profile,highlight}){
  const [over,setOver]=useState(false);
  const sl=clientes.filter(c=>c.estagio===s.id);
  return(
    <div style={{minWidth:200,width:210,flexShrink:0,background:highlight?`${s.color}08`:'rgba(0,0,0,.03)',border:`1px solid ${highlight?s.color+'40':'var(--border)'}`,borderRadius:14,padding:'11px 9px',transition:'all .2s',boxShadow:highlight?`0 0 0 2px ${s.color}30`:''}}
      onDragOver={e=>{e.preventDefault();setOver(true);}}
      onDragLeave={()=>setOver(false)}
      onDrop={()=>{setOver(false);if(dragId)dispatch({type:'MOVE',cid:dragId,st:s.id,user:profile?.nome||'Usuário'});setDragId(null);}}>
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10,padding:'0 3px'}}>
        <div style={{width:7,height:7,borderRadius:'50%',background:s.color,boxShadow:`0 0 5px ${s.color}60`,flexShrink:0}}/>
        <span style={{fontSize:11,fontWeight:600,color:'var(--text-secondary)',flex:1}}>{s.label}</span>
        <span style={{fontSize:10,fontWeight:700,background:s.bg,color:s.color,borderRadius:99,padding:'1px 6px'}}>{sl.length}</span>
      </div>
      <div style={{minHeight:40}}>
        {sl.map(c=>(
          <div key={c.id} className="kcard" draggable onDragStart={()=>setDragId(c.id)} onClick={()=>onSelect(c.id)}>
            <div style={{fontSize:12,fontWeight:600,color:'var(--text-primary)',marginBottom:4}}>{c.nomeCliente}</div>
            <div style={{fontSize:10,color:'var(--text-muted)',marginBottom:c.prefeitura?3:5}}>{c.cpfCliente||'—'}</div>
            {/* ── prefeitura no card ── */}
            {c.prefeitura&&<div style={{fontSize:9,color:'var(--text-muted)',marginBottom:4}}>🏛 {c.prefeitura}</div>}
            {c.saldoDevedor&&<div style={{fontSize:10,fontWeight:700,color:'#10B981',marginBottom:4}}>💰 {c.saldoDevedor}</div>}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:9,color:'var(--text-faint)'}}>{fmtD(c.dataEntrada)}</span>
              <span style={{fontSize:9,fontWeight:600,color:c.documentoStatus==='Aprovado'?'var(--success)':c.documentoStatus==='Não solicitado'?'var(--text-faint)':'var(--amber)'}}>{c.documentoStatus}</span>
            </div>
            {c.criado_por_nome&&<div style={{marginTop:5,paddingTop:5,borderTop:'1px solid var(--border)',fontSize:9,color:'var(--text-muted)'}}>{c.criado_por_nome}</div>}
          </div>
        ))}
        {sl.length===0&&<div style={{textAlign:'center',padding:'16px 0',fontSize:10,color:'var(--text-faint)'}}>Solte aqui</div>}
      </div>
    </div>
  );
}

function BKOPipeline({clientes,profile,dispatch,onSelect,filtroEstagio,setFiltroEstagio}){
  const [dragId,setDragId]=useState(null);
  const [search,setSearch]=useState('');
  const colsRef=useRef(null);
  useEffect(()=>{if(filtroEstagio&&colsRef.current){const idx=BKO_STAGES.findIndex(s=>s.id===filtroEstagio);if(idx>-1)colsRef.current.scrollLeft=idx*220;}},[filtroEstagio]);
  const filtered=search.trim()?clientes.filter(c=>c.nomeCliente?.toLowerCase().includes(search.toLowerCase())||c.cpfCliente?.includes(search)):clientes;
  return(
    <div style={{padding:'28px 32px',overflowX:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,gap:16}}>
        <div><div className="section-title">Pipeline</div><div className="section-sub">{clientes.length} clientes · arraste para mover</div></div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {filtroEstagio&&(<div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:99,background:B_LIGHT,border:`1px solid ${B_MID}30`,fontSize:11,color:B_MID,fontWeight:600}}>{BKO_STAGES.find(s=>s.id===filtroEstagio)?.label}<button onClick={()=>setFiltroEstagio(null)} style={{background:'none',border:'none',cursor:'pointer',color:B_MID,fontSize:13,lineHeight:1,padding:0}}>×</button></div>)}
          <div style={{position:'relative',width:240}}>
            <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-faint)',fontSize:12}}>⌕</span>
            <input className="inp" style={{paddingLeft:30,height:34,fontSize:12}} placeholder="Buscar cliente…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>
      </div>
      <div ref={colsRef} style={{display:'flex',gap:10,overflowX:'auto',paddingBottom:16}}>
        {BKO_STAGES.map(s=>(<BKOKanbanCol key={s.id} s={s} clientes={filtered} dragId={dragId} setDragId={setDragId} dispatch={dispatch} onSelect={onSelect} profile={profile} highlight={filtroEstagio===s.id}/>))}
      </div>
    </div>
  );
}

// ── 3. CLIENTES: filtro por prefeitura ──
function BKOClientes({clientes,profile,onSelect,onNew}){
  const [search,setSearch]=useState('');
  const [estagio,setEstagio]=useState('');
  const [prefeitura,setPrefeitura]=useState('');
  const [criadoPor,setCriadoPor]=useState('');
  const [atribuidoA,setAtribuidoA]=useState('');
  const [page,setPage]=useState(1);
  const PER=50;
  const isComercial=profile?.role==='comercial';

  const prefeituras=useMemo(()=>[...new Set(clientes.map(c=>c.prefeitura).filter(Boolean))].sort(),[clientes]);
  const criadoresList=useMemo(()=>[...new Set(clientes.map(c=>c.criado_por_nome).filter(Boolean))].sort(),[clientes]);
  const atribuidosList=useMemo(()=>[...new Set(clientes.map(c=>c.atribuido_a_nome).filter(Boolean))].sort(),[clientes]);

  const filtered=useMemo(()=>clientes.filter(c=>{
    if(estagio&&c.estagio!==estagio) return false;
    if(prefeitura&&c.prefeitura!==prefeitura) return false;
    if(criadoPor&&c.criado_por_nome!==criadoPor) return false;
    if(atribuidoA&&c.atribuido_a_nome!==atribuidoA) return false;
    if(search){const s=search.toLowerCase();if(!c.nomeCliente?.toLowerCase().includes(s)&&!c.cpfCliente?.includes(s)) return false;}
    return true;
  }),[clientes,search,estagio,prefeitura,criadoPor,atribuidoA]);

  const totalPages=Math.max(1,Math.ceil(filtered.length/PER));
  const paged=filtered.slice((page-1)*PER,page*PER);
  const stgStyle=(id)=>{const s=BKO_STAGES.find(x=>x.id===id);return s?{background:s.bg,color:s.color,borderRadius:99,padding:'2px 8px',fontSize:10,fontWeight:700}:{};};
  const hasFilter=search||estagio||prefeitura||criadoPor||atribuidoA;

  return(
    <div style={{padding:'28px 32px'}}>
      <div className="fu" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:16}}>
        <div><div className="section-title">Clientes</div><div className="section-sub">{filtered.length} de {clientes.length} registros</div></div>
        <button className="btn" style={{background:B_MID,color:'#fff',boxShadow:`0 3px 14px ${B_GLOW}`}} onClick={onNew}>+ Novo Cliente</button>
      </div>
      <div className="fu1" style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <div className="search-wrap" style={{flex:1,minWidth:200}}>
          <span className="search-icon">⌕</span>
          <input className="inp" placeholder="Nome ou CPF…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
        </div>
        <select className="sel" style={{width:160}} value={estagio} onChange={e=>{setEstagio(e.target.value);setPage(1);}}>
          <option value="">Todos os estágios</option>
          {BKO_STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select className="sel" style={{width:160}} value={prefeitura} onChange={e=>{setPrefeitura(e.target.value);setPage(1);}}>
          <option value="">Todas as prefeituras</option>
          {prefeituras.map(p=><option key={p} value={p}>{p}</option>)}
        </select>
        {isComercial&&(
          <select className="sel" style={{width:150}} value={criadoPor} onChange={e=>{setCriadoPor(e.target.value);setPage(1);}}>
            <option value="">Criado por…</option>
            {criadoresList.map(n=><option key={n} value={n}>{n}</option>)}
          </select>
        )}
        {isComercial&&(
          <select className="sel" style={{width:150}} value={atribuidoA} onChange={e=>{setAtribuidoA(e.target.value);setPage(1);}}>
            <option value="">Atribuído a…</option>
            {atribuidosList.map(n=><option key={n} value={n}>{n}</option>)}
          </select>
        )}
        {hasFilter&&<button className="btn btn-ghost" onClick={()=>{setSearch('');setEstagio('');setPrefeitura('');setCriadoPor('');setAtribuidoA('');setPage(1);}}>✕ Limpar</button>}
      </div>
      <div className="fu2 card" style={{overflow:'hidden',marginBottom:14}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead>
              <tr style={{background:'rgba(0,0,0,.03)',borderBottom:'1px solid var(--border)'}}>
                {['Nome / CPF','Prefeitura','Estágio','Documento','Saldo Devedor','Criado por','Atribuído a','Entrada',''].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:9,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.08em',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map(c=>(
                <tr key={c.id} className="trow" onClick={()=>onSelect(c.id)}>
                  <td style={{padding:'11px 14px'}}><div style={{fontWeight:600}}>{c.nomeCliente}</div><div style={{fontSize:11,color:'var(--text-muted)',marginTop:1}}>{c.cpfCliente}</div></td>
                  <td style={{padding:'11px 14px',fontSize:12,color:'var(--text-secondary)'}}>{c.prefeitura||'—'}</td>
                  <td style={{padding:'11px 14px'}}><span style={stgStyle(c.estagio)}>{BKO_STAGES.find(s=>s.id===c.estagio)?.label||c.estagio}</span></td>
                  <td style={{padding:'11px 14px'}}><span style={{fontSize:11,fontWeight:600,color:c.documentoStatus==='Aprovado'?'var(--success)':c.documentoStatus==='Não solicitado'?'var(--text-faint)':'var(--amber)'}}>{c.documentoStatus}</span></td>
                  <td style={{padding:'11px 14px',fontSize:12,fontWeight:600,color:'#10B981'}}>{c.saldoDevedor||'—'}</td>
                  <td style={{padding:'11px 14px',fontSize:12,color:'var(--text-secondary)'}}>{c.criado_por_nome||'—'}</td>
                  <td style={{padding:'11px 14px'}}>{c.atribuido_a_nome?<span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99,background:B_LIGHT,color:B_MID}}>{c.atribuido_a_nome}</span>:<span style={{fontSize:11,color:'var(--text-faint)'}}>—</span>}</td>
                  <td style={{padding:'11px 14px',fontSize:11,color:'var(--text-secondary)'}}>{fmtD(c.dataEntrada)}</td>
                  <td style={{padding:'11px 14px',color:'var(--text-muted)',fontSize:15}}>›</td>
                </tr>
              ))}
              {paged.length===0&&<tr><td colSpan={9} style={{padding:'36px 0',textAlign:'center',color:'var(--text-muted)',fontSize:13}}>Nenhum cliente encontrado</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {totalPages>1&&(
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
          <button className="btn btn-ghost" style={{padding:'5px 10px',fontSize:12}} onClick={()=>setPage(1)} disabled={page===1}>«</button>
          <button className="btn btn-ghost" style={{padding:'5px 10px',fontSize:12}} onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>‹</button>
          <span style={{fontSize:12,color:'var(--text-muted)',padding:'0 8px'}}>Pág {page}/{totalPages}</span>
          <button className="btn btn-ghost" style={{padding:'5px 10px',fontSize:12}} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>›</button>
          <button className="btn btn-ghost" style={{padding:'5px 10px',fontSize:12}} onClick={()=>setPage(totalPages)} disabled={page===totalPages}>»</button>
        </div>
      )}
    </div>
  );
}

// ── 4. DETAIL: prefeitura editável, salva com botão ──
function BKODetail({cliente,profile,session,dispatch,onClose}){
  const [tab,setTab]=useState('info');
  const [es,setEs]=useState(cliente.estagio);
  const [ed,setEd]=useState(cliente.documentoStatus||'Não solicitado');
  const [saldo,setSaldo]=useState(cliente.saldoDevedor||'');
  const [obsBko,setObsBko]=useState(cliente.observacoesBko||'');
  const [prefeituraEdit,setPrefeituraEdit]=useState(cliente.prefeitura||'');
  const [docs,setDocs]=useState(cliente.documentos||[]);
  const [uploading,setUploading]=useState(false);
  const [uploadMsg,setUploadMsg]=useState(null);
  const [corbans,setCorbans]=useState([]);
  const [atribuidoId,setAtribuidoId]=useState(cliente.atribuido_a_id||'');
  const [atribuindo,setAtribuindo]=useState(false);
  const [atribMsg,setAtribMsg]=useState(null);
  const [respMsg,setRespMsg]=useState(null);
  const [salvandoResp,setSalvandoResp]=useState(false);
  const [chatMsgs,setChatMsgs]=useState([]);
  const [chatInput,setChatInput]=useState('');
  const [chatLoading,setChatLoading]=useState(false);
  const chatEndRef=useRef(null);

  const r=profile?.role;
  const isBko=r==='bko';
  const isComercial=r==='comercial';
  const euSouResponsavel=isBko&&cliente.responsavel_bko_id===profile?.id;
  const temResponsavel=!!cliente.responsavel_bko_id;

  useEffect(()=>{
    if(!isComercial) return;
    supabase.rpc('get_bko_corbans').then(({data,error})=>{if(error)console.error(error);setCorbans(data||[]);});
  },[isComercial]);

  useEffect(()=>{
    supabase.from('bko_chat').select('*').eq('cliente_id',cliente.id).order('created_at',{ascending:true}).then(({data})=>setChatMsgs(data||[]));
    const ch=supabase.channel(`chat_${cliente.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'bko_chat',filter:`cliente_id=eq.${cliente.id}`},p=>setChatMsgs(prev=>[...prev,p.new])).subscribe();
    return ()=>supabase.removeChannel(ch);
  },[cliente.id]);

  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:'smooth'});},[chatMsgs,tab]);

  const enviarChat=async()=>{
    if(!chatInput.trim()) return;
    setChatLoading(true);
    await supabase.from('bko_chat').insert({cliente_id:cliente.id,user_id:profile?.id,user_nome:profile?.nome||'Usuário',user_role:r,mensagem:chatInput.trim()});
    setChatInput('');setChatLoading(false);
  };

  const assumirResponsabilidade=async()=>{
    setSalvandoResp(true);setRespMsg(null);
    const {error}=await supabase.from('bko_clientes').update({responsavel_bko_id:profile?.id,responsavel_bko_nome:profile?.nome}).eq('id',cliente.id);
    setSalvandoResp(false);
    if(error){setRespMsg({t:'error',text:'Erro ao assumir.'});return;}
    dispatch({type:'UPD',c:{...cliente,responsavel_bko_id:profile?.id,responsavel_bko_nome:profile?.nome}});
    setRespMsg({t:'success',text:'Você é o responsável por este cliente.'});
  };

  const liberarResponsabilidade=async()=>{
    if(!confirm('Liberar responsabilidade deste cliente?')) return;
    setSalvandoResp(true);
    await supabase.from('bko_clientes').update({responsavel_bko_id:null,responsavel_bko_nome:null}).eq('id',cliente.id);
    setSalvandoResp(false);
    dispatch({type:'UPD',c:{...cliente,responsavel_bko_id:null,responsavel_bko_nome:null}});
    setRespMsg(null);
  };

  const salvarAtribuicao=async()=>{
    const corbanSel=corbans.find(c=>c.id===atribuidoId);
    setAtribuindo(true);setAtribMsg(null);
    const {error}=await supabase.from('bko_clientes').update({atribuido_a_id:atribuidoId||null,atribuido_a_nome:corbanSel?.nome||null}).eq('id',cliente.id);
    setAtribuindo(false);
    if(error){setAtribMsg({t:'error',text:'Erro ao atribuir.'});return;}
    dispatch({type:'UPD',c:{...cliente,atribuido_a_id:atribuidoId||null,atribuido_a_nome:corbanSel?.nome||null}});
    setAtribMsg({t:'success',text:`Atribuído a ${corbanSel?.nome||'ninguém'}!`});
  };

  // save inclui prefeitura
  const save=()=>{
    const upd={...cliente,estagio:es,documentoStatus:ed,saldoDevedor:saldo,observacoesBko:obsBko,documentos:docs,prefeitura:prefeituraEdit};
    if(es!==cliente.estagio) dispatch({type:'MOVE',cid:cliente.id,st:es,user:profile?.nome||'Usuário'});
    dispatch({type:'UPD',c:upd});
    onClose();
  };

  const handleUpload=async(e)=>{
    const file=e.target.files[0];if(!file) return;
    if(file.size>10*1024*1024){setUploadMsg({t:'error',text:'Máximo 10MB.'});return;}
    setUploading(true);setUploadMsg(null);
    const path=`bko/${cliente.id}/${Date.now()}_${file.name}`;
    const {error}=await supabase.storage.from('documentos').upload(path,file);
    if(error){setUploadMsg({t:'error',text:'Erro ao enviar.'});setUploading(false);return;}
    const {data:{publicUrl}}=supabase.storage.from('documentos').getPublicUrl(path);
    const novos=[...docs,{nome:file.name,path,url:publicUrl,data:TODAY,enviadoPor:profile?.nome}];
    setDocs(novos);dispatch({type:'UPD',c:{...cliente,documentos:novos}});
    setUploadMsg({t:'success',text:`"${file.name}" enviado!`});
    setUploading(false);e.target.value='';
  };

  const handleDeleteDoc=async(doc)=>{
    if(!confirm(`Remover "${doc.nome}"?`)) return;
    await supabase.storage.from('documentos').remove([doc.path]);
    const novos=docs.filter(d=>d.path!==doc.path);
    setDocs(novos);dispatch({type:'UPD',c:{...cliente,documentos:novos}});
  };

  const openDoc=async(path)=>{
    const {data}=await supabase.storage.from('documentos').createSignedUrl(path,3600);
    if(data?.signedUrl) window.open(data.signedUrl,'_blank');
  };

  const stg=BKO_STAGES.find(s=>s.id===cliente.estagio);

  return(
    <div className="spanel">
      <div style={{padding:'16px 20px 12px',borderBottom:'1px solid var(--border)',background:'var(--bg-card)',flexShrink:0}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:15,fontWeight:700,color:'var(--text-primary)',fontFamily:'var(--font-display)',marginBottom:4}}>{cliente.nomeCliente}</div>
            <div style={{fontSize:11,color:'var(--text-muted)'}}>{cliente.cpfCliente} · {cliente.telefone||'—'}</div>
            <div style={{marginTop:7,display:'flex',gap:5,flexWrap:'wrap'}}>
              {stg&&<span style={{fontSize:10,padding:'2px 8px',borderRadius:99,background:stg.bg,color:stg.color,fontWeight:700}}>{stg.label}</span>}
              {cliente.prefeitura&&<span style={{fontSize:10,padding:'2px 8px',borderRadius:99,background:'rgba(0,0,0,.05)',color:'var(--text-secondary)',fontWeight:600}}>🏛 {cliente.prefeitura}</span>}
              {cliente.atribuido_a_nome&&<span style={{fontSize:10,padding:'2px 8px',borderRadius:99,background:B_LIGHT,color:B_MID,fontWeight:700}}>→ {cliente.atribuido_a_nome}</span>}
              {cliente.responsavel_bko_nome&&<span style={{fontSize:10,padding:'2px 8px',borderRadius:99,background:'rgba(124,58,237,.1)',color:'#7C3AED',fontWeight:700}}>🔒 {cliente.responsavel_bko_nome}</span>}
              {cliente.saldoDevedor&&<span style={{fontSize:10,padding:'2px 8px',borderRadius:99,background:'rgba(16,185,129,.1)',color:'#10B981',fontWeight:700}}>💰 {cliente.saldoDevedor}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{background:'rgba(0,0,0,.06)',border:'1px solid var(--border)',borderRadius:7,cursor:'pointer',width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,color:'var(--text-muted)'}}>×</button>
        </div>
      </div>

      <div style={{display:'flex',borderBottom:'1px solid var(--border)',background:'var(--bg-card)',flexShrink:0,overflowX:'auto'}}>
        {[['info','Informações'],['bko','BKO'],['activity','Atividades'],['chat','Chat'],['docs',`Documentos${docs.length>0?` (${docs.length})`:''}`]].map(([id,lb])=>(
          <button key={id} className={`ptab ${tab===id?'on':''}`} onClick={()=>setTab(id)} style={{whiteSpace:'nowrap',fontSize:12}}>{lb}</button>
        ))}
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>

        {tab==='info'&&(
          <div>
            <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,overflow:'hidden',marginBottom:14}}>
              {[
                ['CPF',cliente.cpfCliente||'—'],
                ['Telefone',cliente.telefone||'—'],
                ['Data entrada',fmtD(cliente.dataEntrada)],
                ['Criado por',cliente.criado_por_nome||'—'],
                ['Atribuído a',cliente.atribuido_a_nome||'Não atribuído'],
                ['Responsável BKO',cliente.responsavel_bko_nome||'Sem responsável'],
                ['Último contato',fmtD(cliente.ultimoContato)],
              ].map(([k,v])=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',borderBottom:'1px solid var(--border)'}}>
                  <span style={{fontSize:11,color:'var(--text-muted)'}}>{k}</span>
                  <span style={{fontSize:11,color:'var(--text-primary)',fontWeight:500}}>{v}</span>
                </div>
              ))}
            </div>

            {/* ── Campo prefeitura editável — salva junto com "Salvar alterações" ── */}
            <div style={{marginBottom:14}}>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Prefeitura / Órgão</label>
              <input className="inp" value={prefeituraEdit} onChange={e=>setPrefeituraEdit(e.target.value)} placeholder="Nome da prefeitura…"/>
            </div>

            {isComercial&&(
              <div style={{marginBottom:16,padding:'14px',background:B_LIGHT,borderRadius:10,border:`1px solid ${B_MID}25`}}>
                <div style={{fontSize:11,fontWeight:700,color:B_MID,marginBottom:8}}>👤 Atribuir cliente a Corban</div>
                <select className="sel" style={{marginBottom:8}} value={atribuidoId} onChange={e=>setAtribuidoId(e.target.value)}>
                  <option value="">— Sem atribuição —</option>
                  {corbans.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                {atribMsg&&(<div style={{fontSize:11,fontWeight:500,padding:'6px 10px',borderRadius:7,marginBottom:8,background:atribMsg.t==='success'?'var(--success-dim)':'var(--danger-dim)',color:atribMsg.t==='success'?'var(--success)':'var(--danger)'}}>{atribMsg.text}</div>)}
                <button style={{width:'100%',padding:'8px 0',borderRadius:8,background:B_MID,color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',border:'none',opacity:atribuindo?0.7:1}} onClick={salvarAtribuicao} disabled={atribuindo}>{atribuindo?'Salvando…':'✓ Confirmar atribuição'}</button>
              </div>
            )}

            <div style={{borderTop:'1px solid var(--border)',paddingTop:14}}>
              <div className="eyebrow" style={{marginBottom:10}}>Atualizar status</div>
              <label style={{fontSize:11,color:'var(--text-muted)',display:'block',marginBottom:5}}>Estágio</label>
              <select className="sel" value={es} onChange={e=>setEs(e.target.value)} style={{marginBottom:10}}>
                {BKO_STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <label style={{fontSize:11,color:'var(--text-muted)',display:'block',marginBottom:5}}>Documento</label>
              <select className="sel" value={ed} onChange={e=>setEd(e.target.value)} style={{marginBottom:14}}>
                {DOC_STATUS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <button className="btn" style={{width:'100%',justifyContent:'center',background:B_MID,color:'#fff',boxShadow:`0 3px 12px ${B_GLOW}`}} onClick={save}>Salvar alterações</button>
            </div>
          </div>
        )}

        {tab==='bko'&&(
          <div>
            <div style={{marginBottom:16,padding:'14px',background:'rgba(124,58,237,.06)',borderRadius:10,border:'1px solid rgba(124,58,237,.2)'}}>
              <div style={{fontSize:11,fontWeight:700,color:'#7C3AED',marginBottom:8}}>🔒 Responsável BKO</div>
              {temResponsavel?(
                <div>
                  <div style={{fontSize:12,color:'var(--text-primary)',fontWeight:600,marginBottom:6}}>
                    {cliente.responsavel_bko_nome}
                    {euSouResponsavel&&<span style={{fontSize:9,marginLeft:6,padding:'1px 6px',borderRadius:99,background:'rgba(124,58,237,.1)',color:'#7C3AED',fontWeight:700}}>Você</span>}
                  </div>
                  {euSouResponsavel&&(<button onClick={liberarResponsabilidade} disabled={salvandoResp} style={{padding:'6px 12px',borderRadius:7,background:'var(--danger-dim)',color:'var(--danger)',border:'none',fontSize:11,fontWeight:600,cursor:'pointer'}}>Liberar responsabilidade</button>)}
                  {!euSouResponsavel&&isBko&&(<div style={{fontSize:10,color:'var(--text-muted)'}}>Somente {cliente.responsavel_bko_nome} pode editar os campos BKO.</div>)}
                </div>
              ):(
                isBko?(
                  <div>
                    <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:8}}>Nenhum responsável ainda. Assuma este cliente para editar os campos BKO.</div>
                    <button onClick={assumirResponsabilidade} disabled={salvandoResp} style={{width:'100%',padding:'8px 0',borderRadius:8,background:'#7C3AED',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',border:'none',opacity:salvandoResp?0.7:1}}>{salvandoResp?'Salvando…':'Assumir responsabilidade'}</button>
                  </div>
                ):(<div style={{fontSize:11,color:'var(--text-muted)'}}>Sem responsável BKO atribuído.</div>)
              )}
              {respMsg&&<div style={{fontSize:11,marginTop:8,padding:'6px 10px',borderRadius:7,background:respMsg.t==='success'?'var(--success-dim)':'var(--danger-dim)',color:respMsg.t==='success'?'var(--success)':'var(--danger)'}}>{respMsg.text}</div>}
            </div>
            <div style={{padding:'10px 12px',background:B_LIGHT,borderRadius:9,border:`1px solid ${B_MID}25`,marginBottom:14,fontSize:11,color:B_MID,fontWeight:600}}>💼 Campos BKO — visível para todos, editável apenas pelo responsável</div>
            <div style={{marginBottom:12}}>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>Saldo Devedor</label>
              <input className="inp" value={saldo} onChange={e=>setSaldo(e.target.value)} placeholder="R$ 0,00" readOnly={(!euSouResponsavel&&temResponsavel)||!isBko} style={{background:((!euSouResponsavel&&temResponsavel)||!isBko)?'var(--bg-surface)':'',cursor:((!euSouResponsavel&&temResponsavel)||!isBko)?'not-allowed':''}}/>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>Observações BKO</label>
              <textarea className="inp" value={obsBko} onChange={e=>setObsBko(e.target.value)} placeholder="Observações do backoffice…" style={{resize:'vertical',minHeight:100,fontFamily:'var(--font)',lineHeight:1.5,background:((!euSouResponsavel&&temResponsavel)||!isBko)?'var(--bg-surface)':'',cursor:((!euSouResponsavel&&temResponsavel)||!isBko)?'not-allowed':''}} readOnly={(!euSouResponsavel&&temResponsavel)||!isBko}/>
            </div>
            {(euSouResponsavel||(!temResponsavel&&isBko))&&(
              <button className="btn" style={{width:'100%',justifyContent:'center',background:'#7C3AED',color:'#fff',boxShadow:'0 3px 12px rgba(124,58,237,.3)'}} onClick={save}>Salvar campos BKO</button>
            )}
          </div>
        )}

        {tab==='activity'&&(
          <div>
            {(cliente.activities||[]).length===0&&(<div style={{textAlign:'center',padding:'32px 0',fontSize:12,color:'var(--text-muted)'}}>Nenhuma atividade registrada.</div>)}
            {[...(cliente.activities||[])].reverse().map((a,i)=>(
              <div key={a.id||i} style={{display:'flex',gap:9,marginBottom:8}}>
                <div style={{width:28,height:28,borderRadius:8,background:B_LIGHT,color:B_MID,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0}}>{a.type==='stage_change'?'⇄':'✎'}</div>
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

        {tab==='chat'&&(
          <div style={{display:'flex',flexDirection:'column',height:'100%',minHeight:300}}>
            <div style={{flex:1,overflowY:'auto',marginBottom:12,display:'flex',flexDirection:'column',gap:10}}>
              {chatMsgs.length===0&&(<div style={{textAlign:'center',padding:'32px 0',fontSize:12,color:'var(--text-muted)'}}>Nenhuma mensagem ainda. Inicie a conversa!</div>)}
              {chatMsgs.map((m,i)=>{
                const isMe=m.user_id===profile?.id;
                const roleColor=ROLE_COLORS[m.user_role]||B_MID;
                const roleLabel=ROLE_LABELS[m.user_role]||m.user_role||'';
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
                    <div style={{maxWidth:'80%',padding:'8px 12px',borderRadius:isMe?'12px 12px 4px 12px':'12px 12px 12px 4px',background:isMe?B_MID:'var(--bg-surface)',color:isMe?'#fff':'var(--text-primary)',fontSize:12,lineHeight:1.5,border:isMe?'none':'1px solid var(--border)'}}>{m.mensagem}</div>
                  </div>
                );
              })}
              <div ref={chatEndRef}/>
            </div>
            <div style={{display:'flex',gap:8,paddingTop:10,borderTop:'1px solid var(--border)',flexShrink:0}}>
              <input className="inp" style={{flex:1,height:38,fontSize:12}} placeholder="Digite uma mensagem…" value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&enviarChat()}/>
              <button onClick={enviarChat} disabled={chatLoading||!chatInput.trim()} style={{padding:'0 16px',height:38,borderRadius:8,background:B_MID,color:'#fff',border:'none',fontSize:12,fontWeight:600,cursor:'pointer',opacity:chatLoading||!chatInput.trim()?0.6:1,flexShrink:0}}>Enviar</button>
            </div>
          </div>
        )}

        {tab==='docs'&&(
          <div>
            <div style={{marginBottom:14}}>
              <div className="eyebrow" style={{marginBottom:8}}>Checklist para avançar</div>
              {[{key:'cnh',label:'CNH'},{key:'holerite1',label:'Último holerite (obrigatório)'},{key:'holerite2',label:'2º holerite (opcional)'},{key:'holerite3',label:'3º holerite (opcional)'},{key:'printMargem',label:'Print da margem'}].map(doc=>{
                const tem=docs.some(d=>d.nome?.toLowerCase().includes(doc.key)||d.categoria===doc.key);
                return(<div key={doc.key} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
                  <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${tem?'#10B981':'var(--border-mid)'}`,background:tem?'#10B981':'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#fff',flexShrink:0}}>{tem?'✓':''}</div>
                  <span style={{fontSize:12,color:tem?'var(--text-primary)':'var(--text-muted)'}}>{doc.label}</span>
                </div>);
              })}
            </div>
            <div className="eyebrow" style={{marginBottom:8}}>Enviar documento</div>
            <label style={{display:'flex',flexDirection:'column',alignItems:'center',gap:7,padding:'18px',borderRadius:10,cursor:'pointer',border:`2px dashed ${uploading?B_MID:'var(--border-mid)'}`,background:uploading?B_LIGHT:'rgba(0,0,0,.02)',marginBottom:12,transition:'all .15s'}} onMouseEnter={e=>{e.currentTarget.style.background=B_LIGHT;e.currentTarget.style.borderColor=B_MID;}} onMouseLeave={e=>{if(!uploading){e.currentTarget.style.background='rgba(0,0,0,.02)';e.currentTarget.style.borderColor='var(--border-mid)';}}}>
              <input type="file" style={{display:'none'}} onChange={handleUpload} disabled={uploading} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"/>
              <div style={{fontSize:22}}>{uploading?'⏳':'📤'}</div>
              <div style={{fontSize:12,fontWeight:600,color:'var(--text-primary)'}}>{uploading?'Enviando…':'Clique para enviar'}</div>
              <div style={{fontSize:10,color:'var(--text-muted)'}}>PDF, Word, Imagens · Máx. 10MB</div>
            </label>
            {uploadMsg&&<div style={{padding:'8px 12px',borderRadius:7,marginBottom:10,fontSize:11,fontWeight:500,background:uploadMsg.t==='success'?'var(--success-dim)':'var(--danger-dim)',color:uploadMsg.t==='success'?'var(--success)':'var(--danger)'}}>{uploadMsg.text}</div>}
            {docs.map((doc,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:9,padding:'9px 12px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:9,marginBottom:7}}>
                <span style={{fontSize:18}}>📄</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{doc.nome}</div>
                  <div style={{fontSize:10,color:'var(--text-muted)'}}>{fmtD(doc.data)} · {doc.enviadoPor}</div>
                </div>
                <button className="btn btn-ghost" style={{padding:'4px 8px',fontSize:10}} onClick={()=>openDoc(doc.path)}>↓ Abrir</button>
                <button onClick={()=>handleDeleteDoc(doc)} style={{padding:'4px 8px',borderRadius:6,fontSize:10,fontWeight:600,cursor:'pointer',background:'var(--danger-dim)',color:'var(--danger)',border:'none'}}>✕</button>
              </div>
            ))}
            {docs.length===0&&<div style={{textAlign:'center',padding:'24px 0',fontSize:12,color:'var(--text-muted)'}}>Nenhum documento ainda.</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 5. NOVO CLIENTE: campo prefeitura ──
function NovoClienteModal({profile,dispatch,clientes,onClose}){
  const [form,setForm]=useState(blankCliente());
  const [cpfAviso,setCpfAviso]=useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const handleCpf=(val)=>{
    set('cpfCliente',val);
    if(val.replace(/\D/g,'').length>=11){
      const cpfClean=val.replace(/\D/g,'');
      const existe=clientes?.find(c=>c.cpfCliente?.replace(/\D/g,'')===cpfClean);
      if(existe){setCpfAviso(true);setForm(f=>({...f,cpfCliente:val,nomeCliente:existe.nomeCliente||f.nomeCliente,telefone:existe.telefone||f.telefone}));}
      else setCpfAviso(false);
    } else setCpfAviso(false);
  };
  const save=()=>{
    if(!form.nomeCliente.trim()||!form.cpfCliente.trim()){alert('Nome e CPF são obrigatórios.');return;}
    const id=gid();
    dispatch({type:'ADD',c:{...form,id,criado_por_nome:profile?.nome,criado_por_role:profile?.role},user:profile?.nome||'Usuário'});
  };
  return(
    <div className="mbk" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="mbox" style={{maxWidth:480}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
          <div><div style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:600,color:'var(--text-primary)'}}>Novo Cliente</div><div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>Módulo BKO</div></div>
          <button onClick={onClose} style={{background:'rgba(0,0,0,.06)',border:'1px solid var(--border)',borderRadius:8,cursor:'pointer',width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,color:'var(--text-muted)'}}>×</button>
        </div>
        {cpfAviso&&<div style={{padding:'8px 12px',borderRadius:8,marginBottom:12,background:'var(--amber-dim)',border:'1px solid rgba(196,131,10,.25)',fontSize:12,color:'var(--amber)',fontWeight:500}}>⚠ CPF já cadastrado. Dados preenchidos automaticamente.</div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
          <div>
            <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>CPF *</label>
            <input className="inp" value={form.cpfCliente} onChange={e=>handleCpf(e.target.value)} placeholder="000.000.000-00" style={{borderColor:cpfAviso?'var(--amber)':''}}/>
          </div>
          <div>
            <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Nome completo *</label>
            <input className="inp" value={form.nomeCliente} onChange={e=>set('nomeCliente',e.target.value)} placeholder="Nome completo"/>
          </div>
          <div>
            <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Telefone</label>
            <input className="inp" value={form.telefone} onChange={e=>set('telefone',e.target.value)} placeholder="(00) 00000-0000"/>
          </div>
          <div>
            <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Prefeitura / Órgão</label>
            <input className="inp" value={form.prefeitura||''} onChange={e=>set('prefeitura',e.target.value)} placeholder="Nome da prefeitura"/>
          </div>
          <div style={{gridColumn:'1/-1'}}>
            <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Estágio inicial</label>
            <select className="sel" value={form.estagio} onChange={e=>set('estagio',e.target.value)}>
              {BKO_STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:18}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" style={{background:B_MID,color:'#fff',boxShadow:`0 3px 12px ${B_GLOW}`}} onClick={save}>Salvar cliente</button>
        </div>
      </div>
    </div>
  );
}

function BKOCadastrar({profile,session}){
  const [usuarios,setUsuarios]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showModal,setShowModal]=useState(false);
  const [editUser,setEditUser]=useState(null);
  const [editForm,setEditForm]=useState({nome:''});
  const [editSaving,setEditSaving]=useState(false);
  const [editMsg,setEditMsg]=useState(null);
  const [form,setForm]=useState({nome:'',email:'',senha:'',role:'corban_bko'});
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState(null);
  const [confirmDelete,setConfirmDelete]=useState(null);
  const isComercial=profile?.role==='comercial';

  const load=useCallback(async()=>{setLoading(true);const {data}=await supabase.from('allowed_users').select('*').eq('modulo','bko').order('nome');setUsuarios(data||[]);setLoading(false);},[]);
  useEffect(()=>{load();},[load]);

  const openEdit=(u)=>{setEditUser(u);setEditForm({nome:u.nome});setEditMsg(null);};

  const saveEdit=async()=>{
    if(!editForm.nome.trim()){setEditMsg({t:'error',text:'Nome é obrigatório.'});return;}
    setEditSaving(true);setEditMsg(null);
    const {error:e1}=await supabase.from('allowed_users').update({nome:editForm.nome.trim()}).eq('email',editUser.email);
    const {error:e2}=await supabase.from('profiles').update({nome:editForm.nome.trim()}).eq('email',editUser.email);
    setEditSaving(false);
    if(e1||e2){setEditMsg({t:'error',text:'Erro ao salvar. Tente novamente.'});return;}
    setEditMsg({t:'success',text:'Nome atualizado com sucesso!'});
    load();
    setTimeout(()=>setEditUser(null),900);
  };

  const save=async()=>{
    if(!form.nome.trim()||!form.email.trim()||!form.senha||form.senha.length<6){setMsg({t:'error',text:'Nome, e-mail e senha (mín. 6 caracteres) são obrigatórios.'});return;}
    setSaving(true);setMsg(null);
    const {data:{session:s}}=await supabase.auth.getSession();
    try {
      const res=await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-bko-user`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${s?.access_token}`},body:JSON.stringify({email:form.email.trim().toLowerCase(),password:form.senha,role:form.role,nome:form.nome.trim(),modulo:'bko'})});
      const result=await res.json();setSaving(false);
      if(!res.ok||result.error){setMsg({t:'error',text:result.error||'Erro ao criar usuário.'});}
      else{setMsg({t:'success',text:`✓ ${form.nome} criado! Já pode fazer login.`});setShowModal(false);setForm({nome:'',email:'',senha:'',role:'corban_bko'});load();}
    } catch(e){setSaving(false);setMsg({t:'error',text:'Erro de conexão.'});}
  };
  const remove=async(u)=>{await supabase.from('allowed_users').delete().eq('email',u.email);setConfirmDelete(null);setMsg({t:'success',text:`${u.nome} removido.`});load();};
  const grupos=[{role:'comercial',label:'Comercial'},{role:'corban_bko',label:'Corban'},{role:'bko',label:'BKO'}];
  return(
    <div style={{padding:'28px 32px'}}>
      <div className="fu" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:22}}>
        <div><div className="section-title">Cadastrar</div><div className="section-sub">Usuários do módulo BKO</div></div>
        <button className="btn" style={{background:B_MID,color:'#fff',boxShadow:`0 3px 12px ${B_GLOW}`}} onClick={()=>{setForm({nome:'',email:'',senha:'',role:'corban_bko'});setMsg(null);setShowModal(true);}}>+ Adicionar usuário</button>
      </div>
      {msg&&(<div className="fu" style={{display:'flex',alignItems:'center',gap:8,padding:'9px 14px',borderRadius:9,marginBottom:14,background:msg.t==='success'?'var(--success-dim)':'var(--danger-dim)',border:`1px solid ${msg.t==='success'?'rgba(61,155,107,.2)':'rgba(192,65,58,.2)'}`,fontSize:13,color:msg.t==='success'?'var(--success)':'var(--danger)'}}>
        {msg.t==='success'?'✓':'⚠'} {msg.text}<button onClick={()=>setMsg(null)} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'inherit',fontSize:15}}>×</button>
      </div>)}
      {loading?<div style={{textAlign:'center',padding:'40px 0',fontSize:13,color:'var(--text-muted)'}}>Carregando…</div>:(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:18,marginBottom:18}}>
          {grupos.map(g=>{const list=usuarios.filter(u=>u.role===g.role);return(
            <div key={g.role}>
              <div className="eyebrow" style={{marginBottom:8,color:ROLE_COLORS[g.role]}}>{g.label} <span style={{fontWeight:400,color:'var(--text-faint)'}}>({list.length})</span></div>
              <div className="card" style={{overflow:'hidden'}}>
                {list.length===0?<div style={{padding:'14px 16px',fontSize:12,color:'var(--text-muted)'}}>Nenhum cadastrado.</div>:list.map((u,i,arr)=>(
                  <div key={u.email} style={{display:'flex',alignItems:'center',gap:9,padding:'11px 14px',borderBottom:i<arr.length-1?'1px solid var(--border)':'none'}}>
                    <Avatar name={u.nome} size={30} color={ROLE_COLORS[u.role]}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:'var(--text-primary)'}}>{u.nome}</div>
                      <div style={{fontSize:10,color:'var(--text-muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.email}</div>
                    </div>
                    {isComercial&&(
                      <button onClick={()=>openEdit(u)} title="Editar" style={{padding:'3px 8px',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer',background:B_LIGHT,color:B_MID,border:'none',marginRight:4}}>✎</button>
                    )}
                    <button onClick={()=>setConfirmDelete(u)} style={{padding:'3px 8px',borderRadius:6,fontSize:10,fontWeight:600,cursor:'pointer',background:'var(--danger-dim)',color:'var(--danger)',border:'none'}}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          );})}
        </div>
      )}

      {/* ── MODAL EDITAR USUÁRIO (só Comercial) ── */}
      {editUser&&(
        <div className="mbk" onClick={e=>{if(e.target===e.currentTarget)setEditUser(null);}}>
          <div className="mbox" style={{maxWidth:400}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div>
                <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:600,color:'var(--text-primary)'}}>Editar usuário</div>
                <div style={{marginTop:5}}>
                  <span style={{fontSize:10,padding:'2px 8px',borderRadius:99,fontWeight:700,background:`${ROLE_COLORS[editUser.role]}18`,color:ROLE_COLORS[editUser.role]}}>{ROLE_LABELS[editUser.role]||editUser.role}</span>
                </div>
              </div>
              <button onClick={()=>setEditUser(null)} style={{background:'rgba(0,0,0,.06)',border:'1px solid var(--border)',borderRadius:8,cursor:'pointer',width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>×</button>
            </div>
            {editMsg&&<div style={{padding:'8px 12px',borderRadius:7,marginBottom:12,background:editMsg.t==='success'?'var(--success-dim)':'var(--danger-dim)',border:`1px solid ${editMsg.t==='success'?'rgba(61,155,107,.2)':'rgba(192,65,58,.2)'}`,fontSize:11,color:editMsg.t==='success'?'var(--success)':'var(--danger)'}}>{editMsg.text}</div>}
            <div style={{marginBottom:12}}>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Nome completo</label>
              <input className="inp" value={editForm.nome} onChange={e=>setEditForm(f=>({...f,nome:e.target.value}))} placeholder="Nome completo" autoFocus/>
            </div>
            <div style={{marginBottom:20}}>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>E-mail</label>
              <input className="inp" value={editUser.email} readOnly style={{background:'var(--bg-surface)',cursor:'not-allowed',color:'var(--text-muted)'}}/>
              <div style={{fontSize:10,color:'var(--text-faint)',marginTop:4}}>E-mail não pode ser alterado.</div>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="btn btn-ghost" onClick={()=>setEditUser(null)}>Cancelar</button>
              <button className="btn" style={{background:B_MID,color:'#fff',boxShadow:`0 3px 12px ${B_GLOW}`}} onClick={saveEdit} disabled={editSaving}>{editSaving?'Salvando…':'Salvar alterações'}</button>
            </div>
          </div>
        </div>
      )}

      {showModal&&(<div className="mbk" onClick={e=>{if(e.target===e.currentTarget){setShowModal(false);setMsg(null);}}}>
        <div className="mbox" style={{maxWidth:420}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <div><div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:600,color:'var(--text-primary)'}}>Novo usuário BKO</div><div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>Acesso imediato após criação</div></div>
            <button onClick={()=>{setShowModal(false);setMsg(null);}} style={{background:'rgba(0,0,0,.06)',border:'1px solid var(--border)',borderRadius:8,cursor:'pointer',width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>×</button>
          </div>
          {msg?.t==='error'&&<div style={{padding:'8px 12px',borderRadius:7,marginBottom:12,background:'var(--danger-dim)',border:'1px solid rgba(192,65,58,.2)',fontSize:11,color:'var(--danger)'}}>{msg.text}</div>}
          <div style={{marginBottom:10}}>
            <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Papel</label>
            <div style={{display:'flex',gap:6}}>{[['corban_bko','Corban'],['bko','BKO']].map(([v,l])=>(<button key={v} onClick={()=>setForm(f=>({...f,role:v}))} style={{flex:1,padding:'8px 0',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',background:form.role===v?ROLE_COLORS[v]:'rgba(0,0,0,.05)',color:form.role===v?'#fff':'var(--text-secondary)',border:form.role===v?'none':'1px solid var(--border)',transition:'all .15s'}}>{l}</button>))}</div>
          </div>
          <div style={{marginBottom:10}}><label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Nome completo</label><input className="inp" value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Nome"/></div>
          <div style={{marginBottom:10}}><label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>E-mail</label><input className="inp" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@empresa.com"/></div>
          <div style={{marginBottom:18}}><label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Senha inicial</label><input className="inp" type="password" value={form.senha} onChange={e=>setForm(f=>({...f,senha:e.target.value}))} placeholder="Mínimo 6 caracteres"/></div>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
            <button className="btn btn-ghost" onClick={()=>{setShowModal(false);setMsg(null);}}>Cancelar</button>
            <button className="btn" style={{background:B_MID,color:'#fff'}} onClick={save} disabled={saving}>{saving?'Criando…':'Criar usuário'}</button>
          </div>
        </div>
      </div>)}
      {confirmDelete&&(<div className="mbk" onClick={e=>{if(e.target===e.currentTarget)setConfirmDelete(null);}}>
        <div className="mbox" style={{maxWidth:360,textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:10}}>⚠️</div>
          <div style={{fontFamily:'var(--font-display)',fontSize:17,fontWeight:600,marginBottom:8}}>Remover {confirmDelete.nome}?</div>
          <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:20}}>O acesso será revogado imediatamente.</div>
          <div style={{display:'flex',gap:8,justifyContent:'center'}}>
            <button className="btn btn-ghost" onClick={()=>setConfirmDelete(null)}>Cancelar</button>
            <button className="btn" style={{background:'var(--danger)',color:'#fff'}} onClick={()=>remove(confirmDelete)}>Remover</button>
          </div>
        </div>
      </div>)}
    </div>
  );
}

function BKOAuditoria(){
  const [logs,setLogs]=useState([]);const [loading,setLoading]=useState(true);const [search,setSearch]=useState('');const [page,setPage]=useState(1);const PER=50;
  useEffect(()=>{
    supabase.from('bko_audit_log').select('*').order('created_at',{ascending:false}).limit(500).then(({data})=>{setLogs(data||[]);setLoading(false);});
    const ch=supabase.channel('bko_audit_rt').on('postgres_changes',{event:'INSERT',schema:'public',table:'bko_audit_log'},p=>setLogs(prev=>[p.new,...prev])).subscribe();
    return ()=>supabase.removeChannel(ch);
  },[]);
  const filtered=useMemo(()=>{if(!search) return logs;const s=search.toLowerCase();return logs.filter(l=>l.user_nome?.toLowerCase().includes(s)||l.cliente_nome?.toLowerCase().includes(s)||l.action?.toLowerCase().includes(s));},[logs,search]);
  const total=Math.max(1,Math.ceil(filtered.length/PER));const paged=filtered.slice((page-1)*PER,page*PER);
  const fmtTs=ts=>new Date(ts).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});
  return(
    <div style={{padding:'28px 32px'}}>
      <div className="fu" style={{marginBottom:18}}><div className="section-title">Auditoria</div><div className="section-sub">{filtered.length} registros · tempo real</div></div>
      <div className="fu1" style={{display:'flex',gap:8,marginBottom:14}}>
        <div className="search-wrap" style={{flex:1,maxWidth:360}}><span className="search-icon">⌕</span><input className="inp" placeholder="Filtrar por usuário, cliente, ação…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></div>
        <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--text-muted)',marginLeft:'auto'}}><div style={{width:7,height:7,borderRadius:'50%',background:'var(--success)',boxShadow:'0 0 5px var(--success)'}}/>Tempo real</div>
      </div>
      {loading?<div style={{textAlign:'center',padding:'40px 0',fontSize:13,color:'var(--text-muted)'}}>Carregando…</div>:(
        <div className="fu2 card" style={{overflow:'hidden',marginBottom:14}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr style={{background:'rgba(0,0,0,.03)',borderBottom:'1px solid var(--border)'}}>{['Data/hora','Usuário','Papel','Ação','Cliente','Detalhes'].map(h=>(<th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:9,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.08em',whiteSpace:'nowrap'}}>{h}</th>))}</tr></thead>
              <tbody>
                {paged.map((log,i)=>(
                  <tr key={log.id} style={{borderBottom:'1px solid var(--border)',background:i%2===0?'transparent':'rgba(0,0,0,.015)'}}>
                    <td style={{padding:'9px 14px',fontSize:10,color:'var(--text-muted)',whiteSpace:'nowrap'}}>{fmtTs(log.created_at)}</td>
                    <td style={{padding:'9px 14px'}}><div style={{display:'flex',alignItems:'center',gap:6}}><Avatar name={log.user_nome||'?'} size={22} color={ROLE_COLORS[log.user_role]||B_MID}/><span style={{fontSize:11,fontWeight:600}}>{log.user_nome}</span></div></td>
                    <td style={{padding:'9px 14px'}}><span style={{fontSize:10,padding:'2px 7px',borderRadius:99,background:B_LIGHT,color:B_MID,fontWeight:600}}>{ROLE_LABELS[log.user_role]||log.user_role||'—'}</span></td>
                    <td style={{padding:'9px 14px',fontSize:11}}>{log.action}</td>
                    <td style={{padding:'9px 14px',fontSize:11,fontWeight:500}}>{log.cliente_nome||'—'}</td>
                    <td style={{padding:'9px 14px',fontSize:11,color:'var(--text-secondary)',maxWidth:220}}>{log.detalhes||'—'}</td>
                  </tr>
                ))}
                {paged.length===0&&<tr><td colSpan={6} style={{padding:'32px 0',textAlign:'center',color:'var(--text-muted)',fontSize:12}}>Nenhum registro.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {total>1&&(<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
        <button className="btn btn-ghost" style={{padding:'5px 10px',fontSize:12}} onClick={()=>setPage(1)} disabled={page===1}>«</button>
        <button className="btn btn-ghost" style={{padding:'5px 10px',fontSize:12}} onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>‹</button>
        <span style={{fontSize:12,color:'var(--text-muted)',padding:'0 8px'}}>Pág {page}/{total}</span>
        <button className="btn btn-ghost" style={{padding:'5px 10px',fontSize:12}} onClick={()=>setPage(p=>Math.min(total,p+1))} disabled={page===total}>›</button>
        <button className="btn btn-ghost" style={{padding:'5px 10px',fontSize:12}} onClick={()=>setPage(total)} disabled={page===total}>»</button>
      </div>)}
    </div>
  );
}

export function BKOApp({profile,session,signOut,onAlterarSenha}){
  const [s,dispatch]=useReducer(R,INIT);
  const {clientes,view,sel,newOpen}=s;
  const [ready,setReady]=useState(false);
  const clientesRef=useRef(clientes);
  const [showAS,setShowAS]=useState(false);
  const [filtroEstagio,setFiltroEstagio]=useState(null);
  const setView=useCallback(v=>dispatch({type:'VIEW',v}),[]);
  const selected=clientes.find(c=>c.id===sel);

  useEffect(()=>{
    if(!session) return;
    supabase.from('bko_clientes').select('*').order('created_at',{ascending:false})
      .then(({data,error})=>{
        if(error){console.error('BKO load error:',error);setReady(true);return;}
        const loaded=(data||[]).map(r=>({...r.data,id:r.id,estagio:r.estagio,criado_por_id:r.criado_por_id,criado_por_nome:r.criado_por_nome,criado_por_role:r.criado_por_role,atribuido_a_id:r.atribuido_a_id||null,atribuido_a_nome:r.atribuido_a_nome||null,responsavel_bko_id:r.responsavel_bko_id||null,responsavel_bko_nome:r.responsavel_bko_nome||null}));
        dispatch({type:'SET_C',clientes:loaded});clientesRef.current=loaded;setReady(true);
      });
    const ch=supabase.channel('bko_clientes_rt')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'bko_clientes'},payload=>{const r=payload.new;const novo={...r.data,id:r.id,estagio:r.estagio,criado_por_id:r.criado_por_id,criado_por_nome:r.criado_por_nome,criado_por_role:r.criado_por_role,atribuido_a_id:r.atribuido_a_id||null,atribuido_a_nome:r.atribuido_a_nome||null,responsavel_bko_id:r.responsavel_bko_id||null,responsavel_bko_nome:r.responsavel_bko_nome||null};dispatch(prev=>prev.clientes?.find(c=>c.id===novo.id)?prev:{...prev,clientes:[novo,...(prev.clientes||[])]});})
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'bko_clientes'},payload=>{const r=payload.new;dispatch({type:'UPD',c:{...r.data,id:r.id,estagio:r.estagio,criado_por_id:r.criado_por_id,criado_por_nome:r.criado_por_nome,criado_por_role:r.criado_por_role,atribuido_a_id:r.atribuido_a_id||null,atribuido_a_nome:r.atribuido_a_nome||null,responsavel_bko_id:r.responsavel_bko_id||null,responsavel_bko_nome:r.responsavel_bko_nome||null}});})
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  },[session]);

  useEffect(()=>{
    if(!ready||!session) return;
    const prev=clientesRef.current;
    const changed=clientes.filter(c=>{const old=prev.find(p=>p.id===c.id);return old&&JSON.stringify(old)!==JSON.stringify(c);});
    if(changed.length>0){
      Promise.all(changed.map(async c=>{
        const {id,estagio,criado_por_id,criado_por_nome,criado_por_role,atribuido_a_id,atribuido_a_nome,responsavel_bko_id,responsavel_bko_nome,...data}=c;
        await supabase.from('bko_clientes').upsert({id,data:{...data,id},estagio:estagio||'clientes_novos',criado_por_id:criado_por_id||session.user.id,criado_por_nome:criado_por_nome||profile?.nome,criado_por_role:criado_por_role||profile?.role,atribuido_a_id:atribuido_a_id||null,atribuido_a_nome:atribuido_a_nome||null,responsavel_bko_id:responsavel_bko_id||null,responsavel_bko_nome:responsavel_bko_nome||null},{onConflict:'id'});
      })).then(()=>{clientesRef.current=clientes;});
    } else {clientesRef.current=clientes;}
  },[clientes,ready,session]);

  const auditedDispatch=useCallback(async(action)=>{
    dispatch(action);
    if(!session||!profile) return;
    if(action.type==='ADD'){
      const c=action.c;
      const {error}=await supabase.from('bko_clientes').insert({id:c.id,data:{...c},estagio:c.estagio||'clientes_novos',criado_por_id:session.user.id,criado_por_nome:profile.nome,criado_por_role:profile.role});
      if(error){console.error('BKO ADD error:',error);alert(`Erro: ${error.message}`);}
    }
    const auditMap={
      MOVE:()=>({action:'Moveu cliente',details:`→ "${BKO_STAGES.find(s=>s.id===action.st)?.label}"`,clienteId:action.cid}),
      UPD: ()=>({action:'Editou cliente',details:'Campos atualizados',clienteId:action.c?.id}),
      ADD: ()=>({action:'Cadastrou cliente',details:`Nome: ${action.c?.nomeCliente}`,clienteId:action.c?.id}),
    };
    const fn=auditMap[action.type];
    if(fn){
      const {action:act,details,clienteId}=fn();
      const clienteNome=action.type==='ADD'?action.c?.nomeCliente:clientes.find(c=>c.id===clienteId)?.nomeCliente||'—';
      supabase.from('bko_audit_log').insert({user_id:session.user.id,user_nome:profile.nome,user_role:profile.role,action:act,cliente_id:clienteId||null,cliente_nome:clienteNome,detalhes:details});
    }
  },[profile,clientes,session]);

  return(
    <>
      <div style={{display:'flex',minHeight:'100vh',background:'var(--bg-base)',fontFamily:'var(--font)'}}>
        <BKOSidebar view={view} setView={v=>{setView(v);if(v!=='pipeline')setFiltroEstagio(null);}} profile={profile} onLogout={signOut} onAlterarSenha={()=>setShowAS(true)}/>
        <main style={{flex:1,minWidth:0,overflowY:'auto',paddingRight:selected?490:0,transition:'padding-right .3s cubic-bezier(.4,0,.2,1)'}}>
          {view==='dashboard' && <BKODashboard clientes={clientes} setView={v=>{setView(v);}} setFiltroEstagio={setFiltroEstagio}/>}
          {view==='pipeline'  && <BKOPipeline clientes={clientes} profile={profile} dispatch={auditedDispatch} onSelect={id=>dispatch({type:'SEL',id})} filtroEstagio={filtroEstagio} setFiltroEstagio={setFiltroEstagio}/>}
          {view==='clientes'  && <BKOClientes clientes={clientes} profile={profile} onSelect={id=>dispatch({type:'SEL',id})} onNew={()=>dispatch({type:'TNEW'})}/>}
          {view==='cadastrar' && <BKOCadastrar profile={profile} session={session}/>}
          {view==='auditoria' && <BKOAuditoria/>}
        </main>
        {selected&&<BKODetail key={selected.id} cliente={selected} profile={profile} session={session} dispatch={auditedDispatch} onClose={()=>dispatch({type:'CLOSE'})}/>}
        {newOpen&&<NovoClienteModal profile={profile} dispatch={auditedDispatch} clientes={clientes} onClose={()=>dispatch({type:'TNEW'})}/>}
      </div>
      {showAS&&<AlterarSenha onClose={()=>setShowAS(false)}/>}
    </>
  );
}