import { useState, useEffect, useReducer, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../../supabase';
import { gid, TODAY, fmtD } from '../../utils';
import { Avatar } from '../../components/shared';
import { AlterarSenha } from '../../components/AlterarSenha';
import { BKODetail } from './BKODetail';
import { BKOSearch } from './BKOSearch';
import ReactDOM from 'react-dom';

const B_DARK  = '#1C2033';
const B_MID   = '#3B5BDB';
const B_LIGHT = 'rgba(59,91,219,0.10)';
const B_GLOW  = 'rgba(59,91,219,0.28)';
const B_TEXT  = '#A5B4FC';

const ROLE_LABELS = { comercial:'Comercial', corban_bko:'Corban', bko:'BKO' };
const ROLE_COLORS = { comercial:'#3B5BDB', corban_bko:'#0EA5E9', bko:'#7C3AED' };

const BKO_STAGES = [
  { id:'clientes_novos',        label:'Clientes Novos - Corban',                color:'#3B5BDB', bg:'rgba(59,91,219,.1)'   },
  { id:'saldo_andamento',       label:'BKO - Saldo Devedor',      color:'#7C3AED', bg:'rgba(124,58,237,.1)'  },
  { id:'pendencia_financeiro',  label:'Pendência Análise Financeira',  color:'#F97316', bg:'rgba(249,115,22,.1)'  },
  { id:'em_negociacao',         label:'Em negociação (Saldo Informado) - Corban',        color:'#0EA5E9', bg:'rgba(14,165,233,.1)'  },
  { id:'abertura_conta',        label:'Abertura de conta - Interno',    color:'#10B981', bg:'rgba(16,185,129,.1)'  },
  { id:'digitar_proposta',      label:'Pronto para Digitar - Corban',     color:'#F59E0B', bg:'rgba(245,158,11,.1)'  },
  { id:'banksoft',               label:'Banksoft - Tratativas',                       color:'#EF4444', bg:'rgba(239,68,68,.1)'   },
  { id:'integrado',             label:'Finalizado - Interno',                     color:'#22C55E', bg:'rgba(34,197,94,.1)'   },
  { id:'perdido',               label:'Perdidos',                       color:'#EF4444', bg:'rgba(239,68,68,.1)'   },
];

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
    case'MOVE':      return{...s,clientes:s.clientes.map(c=>c.id!==a.cid?c:{...c,estagio:a.st,ultimoContato:TODAY,activities:[...(c.activities||[]),{id:gid(),type:'stage_change',date:TODAY,user:a.user,text:`Movido para "${BKO_STAGES.find(s=>s.id===a.st)?.label}"`}]})};
    case'MOVE_FUNIL': return{...s,clientes:s.clientes.map(c=>c.id!==a.cid?c:{...c,funil_id:a.funil_id,funil_mes:a.funil_mes,funil_nome:a.funil_nome,ultimoContato:TODAY,activities:[...(c.activities||[]),{id:gid(),type:'stage_change',date:TODAY,user:a.user,text:`Arquivado no funil "${a.funil_nome}" · ${a.funil_mes_label}`}]})};
    case'REMOVE_FUNIL': return{...s,clientes:s.clientes.map(c=>c.id!==a.cid?c:{...c,funil_id:null,funil_mes:null,funil_nome:null,ultimoContato:TODAY,activities:[...(c.activities||[]),{id:gid(),type:'stage_change',date:TODAY,user:a.user,text:'Retornou ao pipeline'}]})};
    case'UPD':   return{...s,clientes:s.clientes.map(c=>c.id!==a.c.id?c:{...c,...a.c})};
    case'ADD':   return{...s,newOpen:false,clientes:[{...a.c,activities:[{id:gid(),type:'stage_change',date:TODAY,user:a.user,text:'Cliente cadastrado'}]},...s.clientes]};
    case'RT_ADD': return s.clientes.find(c=>c.id===a.c.id)?s:{...s,clientes:[a.c,...s.clientes]};
    default:     return s;
  }
}

function BKOSidebar({view,setView,profile,onLogout,onAlterarSenha,onSearch,collapsed,setCollapsed}){
  const r=profile?.role;
  const items=[
    {id:'dashboard',icon:'◈',label:'Dashboard'},
    {id:'pipeline', icon:'⊞',label:'Pipeline'},
    {id:'clientes', icon:'≡',label:'Clientes'},
    ...(r==='comercial'||r==='corban_bko'?[{id:'cadastrar',icon:'＋',label:'Cadastrar'}]:[]),
    ...(r==='comercial'?[{id:'auditoria',icon:'🔍',label:'Auditoria'}]:[]),
  ];
  const W = collapsed ? 56 : 200;
  return(
    <div style={{width:W,minWidth:W,background:B_DARK,borderRight:'1px solid rgba(59,91,219,.2)',display:'flex',flexDirection:'column',flexShrink:0,height:'100vh',position:'sticky',top:0,transition:'width .22s cubic-bezier(.4,0,.2,1)',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding: collapsed?'12px 0':'16px 14px 12px',borderBottom:'1px solid rgba(59,91,219,.15)',display:'flex',alignItems:'center',justifyContent:collapsed?'center':'space-between',gap:8,flexShrink:0,minHeight:64}}>
        {!collapsed&&(
          <div style={{flex:1,overflow:'hidden',minWidth:0}}>
            <div style={{borderRadius:7,overflow:'hidden',width:'100%'}}>
              <img src="/starflow.gif" alt="StarFlow" style={{display:'block',width:'100%',height:'auto',maxHeight:38,objectFit:'cover',objectPosition:'center'}}/>
            </div>
            <div style={{marginTop:6,fontSize:8,fontWeight:700,color:B_TEXT,letterSpacing:'.12em',textTransform:'uppercase',whiteSpace:'nowrap'}}>BKO — Backoffice</div>
          </div>
        )}
        <button
          onClick={()=>setCollapsed(v=>!v)}
          title={collapsed?'Expandir menu':'Recolher menu'}
          style={{background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.1)',borderRadius:7,cursor:'pointer',width:26,height:26,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'rgba(255,255,255,.5)',flexShrink:0,transition:'all .15s'}}
          onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.14)';e.currentTarget.style.color='#fff';}}
          onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.07)';e.currentTarget.style.color='rgba(255,255,255,.5)';}}>
          {collapsed?'›':'‹'}
        </button>
      </div>
      {/* Botão de busca */}
      <div style={{padding:collapsed?'8px 4px 0':'8px 8px 0'}}>
        <button onClick={onSearch} title={collapsed?'Buscar cliente (Ctrl+K)':''} style={{display:'flex',alignItems:'center',gap:collapsed?0:8,width:'100%',padding:collapsed?'8px 0':'7px 10px',justifyContent:collapsed?'center':'flex-start',borderRadius:8,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',cursor:'pointer',color:'rgba(255,255,255,.45)',fontSize:12,fontFamily:'var(--font)',transition:'all .15s'}}
          onMouseEnter={e=>{e.currentTarget.style.background='rgba(59,91,219,.18)';e.currentTarget.style.color=B_TEXT;}}
          onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.05)';e.currentTarget.style.color='rgba(255,255,255,.45)';}}>
          <span style={{fontSize:15,flexShrink:0}}>⌕</span>
          {!collapsed&&<><span style={{flex:1,textAlign:'left',fontSize:11}}>Buscar…</span><kbd style={{fontSize:8,padding:'1px 4px',borderRadius:4,background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.12)',color:'rgba(255,255,255,.4)'}}>K</kbd></>}
        </button>
      </div>
      {/* Nav */}
      <nav style={{padding:collapsed?'8px 4px':'8px',flex:1,overflow:'hidden'}}>
        {!collapsed&&<div style={{fontSize:8,fontWeight:700,color:'rgba(255,255,255,.25)',textTransform:'uppercase',letterSpacing:'.09em',padding:'8px 8px 4px'}}>Menu</div>}
        {items.map(it=>(
          <button key={it.id} onClick={()=>setView(it.id)}
            title={collapsed?it.label:''}
            style={{display:'flex',alignItems:'center',gap:collapsed?0:9,padding:collapsed?'9px 0':'8px 10px',justifyContent:collapsed?'center':'flex-start',borderRadius:8,fontSize:12,fontWeight:view===it.id?600:400,cursor:'pointer',border:'none',width:'100%',textAlign:'left',transition:'all .15s',position:'relative',background:view===it.id?B_LIGHT:'transparent',color:view===it.id?B_TEXT:'rgba(255,255,255,.5)',fontFamily:'var(--font)',marginBottom:2}}
            onMouseEnter={e=>{if(view!==it.id){e.currentTarget.style.background='rgba(255,255,255,.05)';e.currentTarget.style.color='rgba(255,255,255,.75)';}}}
            onMouseLeave={e=>{if(view!==it.id){e.currentTarget.style.background='transparent';e.currentTarget.style.color='rgba(255,255,255,.5)';}}}
          >
            {view===it.id&&<div style={{position:'absolute',left:0,top:'20%',bottom:'20%',width:3,background:B_MID,borderRadius:'0 3px 3px 0'}}/>}
            <span style={{fontSize:15,width:20,textAlign:'center',flexShrink:0}}>{it.icon}</span>
            {!collapsed&&<span style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{it.label}</span>}
          </button>
        ))}
      </nav>
      {/* Footer */}
      <div style={{padding:collapsed?'10px 4px':'10px 12px',borderTop:'1px solid rgba(59,91,219,.15)',flexShrink:0}}>
        {collapsed?(
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
            <Avatar name={profile?.nome||'U'} size={26} color={ROLE_COLORS[r]||B_MID}/>
            <div style={{width:6,height:6,borderRadius:'50%',background:'#22C55E',boxShadow:'0 0 5px #22C55E'}}/>
            <button onClick={onAlterarSenha} title="Alterar senha" style={{width:30,height:26,borderRadius:6,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',color:'rgba(255,255,255,.5)',fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>🔑</button>
            <button onClick={onLogout} title="Sair" style={{width:30,height:26,borderRadius:6,background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.2)',color:'#FCA5A5',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>⏻</button>
          </div>
        ):(
          <>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <Avatar name={profile?.nome||'U'} size={26} color={ROLE_COLORS[r]||B_MID}/>
              <div style={{minWidth:0}}>
                <div style={{fontSize:10,fontWeight:600,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.nome}</div>
                <div style={{fontSize:8,fontWeight:700,color:B_TEXT,textTransform:'uppercase',letterSpacing:'.07em'}}>{ROLE_LABELS[r]||r}</div>
              </div>
              <div style={{marginLeft:'auto',width:6,height:6,borderRadius:'50%',background:'#22C55E',boxShadow:'0 0 5px #22C55E',flexShrink:0}}/>
            </div>
            <button onClick={onAlterarSenha} style={{width:'100%',padding:'5px 0',borderRadius:6,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',color:'rgba(255,255,255,.5)',fontSize:10,fontWeight:500,cursor:'pointer',fontFamily:'var(--font)',marginBottom:4}}>🔑 Alterar senha</button>
            <button onClick={onLogout} style={{width:'100%',padding:'5px 0',borderRadius:6,background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.2)',color:'#FCA5A5',fontSize:10,fontWeight:600,cursor:'pointer',fontFamily:'var(--font)'}}>Sair da conta</button>
          </>
        )}
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
      {/* Linha 1: primeiros 4 estágios */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:12}}>
        {BKO_STAGES.slice(0,4).map(s=>(
          <StatCard key={s.id} label={s.label} value={counts[s.id]||0} color={s.color}
            icon={s.id==='clientes_novos'?'👤':s.id==='saldo_andamento'?'💰':s.id==='pendencia_financeiro'?'⏳':'⟳'}
            onClick={()=>handleCard(s.id)}/>
        ))}
      </div>
      {/* Linha 2: últimos 4 estágios */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {BKO_STAGES.slice(4).map(s=>(
          <StatCard key={s.id} label={s.label} value={counts[s.id]||0} color={s.color}
            icon={s.id==='abertura_conta'?'🏦':s.id==='digitar_proposta'?'📝':s.id==='integrado'?'✓':'✕'}
            onClick={()=>handleCard(s.id)}/>
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

function KCard({c, onSelect, dispatch, profile, setDragId, funis=[]}){
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({top:0, left:0});
  const btnRef = useRef(null);

  useEffect(()=>{
    if(!menuOpen) return;
    const close = (e)=>{
      if(btnRef.current && !btnRef.current.closest('[data-kcard-menu]')?.contains(e.target)){
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return ()=>document.removeEventListener('mousedown', close);
  },[menuOpen]);

  const openMenu = (e)=>{
    e.preventDefault();
    e.stopPropagation();
    const rect = btnRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 220 });
    setMenuOpen(v=>!v);
  };

  const moverFunil = (funil) => {
    const now = new Date();
    const funil_mes = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const funil_mes_label = `${meses[now.getMonth()]} ${now.getFullYear()}`;
    dispatch({type:'MOVE_FUNIL', cid:c.id, funil_id:funil.id, funil_mes, funil_nome:funil.nome, funil_mes_label, user:profile?.nome||'Usuário'});
    setMenuOpen(false);
  };

  return(
    <>
      <div className="kcard" style={{position:'relative', opacity:c.funil_id?0.55:1}} draggable onDragStart={()=>setDragId(c.id)} onClick={(e)=>{if(!e.defaultPrevented)onSelect(c.id);}}>
        <div style={{fontSize:12,fontWeight:600,color:'var(--text-primary)',marginBottom:4,paddingRight:20}}>{c.nomeCliente}</div>
        <div style={{fontSize:10,color:'var(--text-muted)',marginBottom:c.prefeitura?3:5}}>{c.cpfCliente||'—'}</div>
        {c.prefeitura&&<div style={{fontSize:9,color:'var(--text-muted)',marginBottom:4}}>🏛 {c.prefeitura}</div>}
        {c.saldoDevedor&&<div style={{fontSize:10,fontWeight:700,color:'#10B981',marginBottom:4}}>💰 {c.saldoDevedor}</div>}
        {c.funil_nome&&<div style={{fontSize:9,fontWeight:600,color:'var(--text-muted)',marginBottom:4}}>📦 {c.funil_nome}</div>}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:9,color:'var(--text-faint)'}}>{fmtD(c.dataEntrada)}</span>
          <span style={{fontSize:9,fontWeight:600,color:c.documentoStatus==='Aprovado'?'var(--success)':c.documentoStatus==='Não solicitado'?'var(--text-faint)':'var(--amber)'}}>{c.documentoStatus}</span>
        </div>
        {c.criado_por_nome&&<div style={{marginTop:5,paddingTop:5,borderTop:'1px solid var(--border)',fontSize:9,color:'var(--text-muted)'}}>{c.criado_por_nome}</div>}

        <button
          ref={btnRef}
          onClick={openMenu}
          style={{position:'absolute',top:6,right:6,background:'rgba(0,0,0,.06)',border:'none',borderRadius:5,cursor:'pointer',width:20,height:20,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'var(--text-muted)',lineHeight:1,padding:0}}
        >⋯</button>
      </div>

      {menuOpen && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div
          data-kcard-menu="1"
          onMouseDown={e=>e.stopPropagation()}
          style={{position:'fixed',top:menuPos.top,left:Math.max(8,menuPos.left),zIndex:9999,background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,.18)',minWidth:220,overflow:'hidden'}}
        >
          {/* Mover para estágio */}
          <div style={{padding:'7px 12px',fontSize:9,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.08em',borderBottom:'1px solid var(--border)'}}>Mover para estágio…</div>
          {BKO_STAGES.filter(st=>st.id!==c.estagio).map(st=>(
            <button
              key={st.id}
              onMouseDown={e=>{e.stopPropagation();dispatch({type:'MOVE',cid:c.id,st:st.id,user:profile?.nome||'Usuário'});setMenuOpen(false);}}
              style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'7px 12px',background:'none',border:'none',cursor:'pointer',textAlign:'left',fontSize:12,color:'var(--text-primary)',fontFamily:'var(--font)',transition:'background .1s'}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,.04)'}
              onMouseLeave={e=>e.currentTarget.style.background='none'}
            >
              <div style={{width:7,height:7,borderRadius:'50%',background:st.color,flexShrink:0}}/>
              {st.label}
            </button>
          ))}

          {/* Mover para funil */}
          {funis.length > 0 && (
            <>
              <div style={{padding:'7px 12px',fontSize:9,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.08em',borderTop:'1px solid var(--border)',borderBottom:'1px solid var(--border)'}}>Arquivar no funil…</div>
              {c.funil_id && (
                <button
                  onMouseDown={e=>{e.stopPropagation();dispatch({type:'REMOVE_FUNIL',cid:c.id,user:profile?.nome||'Usuário'});setMenuOpen(false);}}
                  style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'7px 12px',background:'none',border:'none',cursor:'pointer',textAlign:'left',fontSize:12,color:'var(--danger)',fontFamily:'var(--font)',transition:'background .1s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,.04)'}
                  onMouseLeave={e=>e.currentTarget.style.background='none'}
                >
                  ← Remover do funil
                </button>
              )}
              {funis.filter(f=>f.ativo).map(f=>(
                <button
                  key={f.id}
                  onMouseDown={e=>{e.stopPropagation();moverFunil(f);}}
                  style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'7px 12px',background:c.funil_id===f.id?`${f.cor}10`:'none',border:'none',cursor:'pointer',textAlign:'left',fontSize:12,color:c.funil_id===f.id?f.cor:'var(--text-primary)',fontFamily:'var(--font)',transition:'background .1s'}}
                  onMouseEnter={e=>e.currentTarget.style.background=`${f.cor}08`}
                  onMouseLeave={e=>e.currentTarget.style.background=c.funil_id===f.id?`${f.cor}10`:'none'}
                >
                  <div style={{width:7,height:7,borderRadius:'50%',background:f.cor,flexShrink:0}}/>
                  {f.nome}
                  {c.funil_id===f.id&&<span style={{marginLeft:'auto',fontSize:9,color:f.cor}}>✓ atual</span>}
                </button>
              ))}
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

function BKOKanbanCol({s,clientes,dragId,setDragId,dispatch,onSelect,profile,highlight,funis}){
  const [over,setOver]=useState(false);
  const sl=clientes.filter(c=>c.estagio===s.id&&!c.funil_id);
  return(
    <div style={{minWidth:170,width:201,flexShrink:0,background:highlight?`${s.color}08`:'rgba(0,0,0,.03)',border:`1px solid ${highlight?s.color+'40':'var(--border)'}`,borderRadius:12,padding:'10px 8px',transition:'all .2s',boxShadow:highlight?`0 0 0 2px ${s.color}30`:''}}
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
          <KCard key={c.id} c={c} onSelect={onSelect} dispatch={dispatch} profile={profile} setDragId={setDragId} funis={funis}/>
        ))}
        {sl.length===0&&<div style={{textAlign:'center',padding:'16px 0',fontSize:10,color:'var(--text-faint)'}}>Solte aqui</div>}
      </div>
    </div>
  );
}


// ─── HELPERS DE MÊS ──────────────────────────────────────────────────────────
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function parseMes(funil_mes){
  if(!funil_mes) return null;
  const [ano,mes]=funil_mes.split('-');
  return{ano:parseInt(ano),mes:parseInt(mes),label:`${MESES_FULL[parseInt(mes)-1]} ${ano}`};
}

// ─── FUNIL POR MESES ─────────────────────────────────────────────────────────
function BKOFunilMeses({funil,clientes,onSelect,dispatch,profile}){
  const [search,setSearch]=useState('');

  const clientesFunil=useMemo(()=>
    clientes.filter(c=>c.funil_id===funil.id&&(
      !search.trim()||
      c.nomeCliente?.toLowerCase().includes(search.toLowerCase())||
      c.cpfCliente?.includes(search)
    ))
  ,[clientes,funil.id,search]);

  // Agrupa por funil_mes, ordena desc (mais recente primeiro)
  const grupos=useMemo(()=>{
    const map={};
    clientesFunil.forEach(c=>{
      const key=c.funil_mes||'sem-data';
      if(!map[key]) map[key]=[];
      map[key].push(c);
    });
    return Object.entries(map)
      .sort(([a],[b])=>b.localeCompare(a))
      .map(([key,items])=>{
        const p=parseMes(key);
        return{key,label:p?p.label:'Sem data',items};
      });
  },[clientesFunil]);

  if(grupos.length===0) return(
    <div style={{textAlign:'center',padding:'60px 0'}}>
      <div style={{fontSize:36,marginBottom:12}}>📦</div>
      <div style={{fontSize:14,fontWeight:600,color:'var(--text-primary)',marginBottom:6}}>
        Nenhum cliente em <b>{funil.nome}</b>
      </div>
      <div style={{fontSize:12,color:'var(--text-muted)'}}>
        Clique em ⋯ em qualquer card do pipeline → Arquivar no funil
      </div>
    </div>
  );

  return(
    <>
      <div style={{display:'flex',gap:10,overflowX:'auto',paddingBottom:24,alignItems:'flex-start'}}>
        {grupos.map(({key,label,items})=>(
          <div key={key} style={{minWidth:210,width:220,flexShrink:0}}>
            {/* Cabeçalho do mês */}
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,padding:'8px 10px',background:`${funil.cor}10`,borderRadius:10,border:`1px solid ${funil.cor}30`}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:funil.cor,boxShadow:`0 0 5px ${funil.cor}80`,flexShrink:0}}/>
              <span style={{fontSize:12,fontWeight:700,color:'var(--text-primary)',flex:1}}>{label}</span>
              <span style={{fontSize:11,fontWeight:700,padding:'1px 7px',borderRadius:99,background:`${funil.cor}15`,color:funil.cor}}>{items.length}</span>
            </div>
            {/* Cards */}
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              {items.map(c=>(
                <div key={c.id}
                  onClick={()=>onSelect(c.id)}
                  style={{background:'var(--bg-card)',border:`1px solid ${funil.cor}25`,borderRadius:11,padding:'11px 12px',cursor:'pointer',transition:'all .15s'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=funil.cor+'60';e.currentTarget.style.boxShadow=`0 3px 10px ${funil.cor}15`;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=funil.cor+'25';e.currentTarget.style.boxShadow='';}}>
                  <div style={{fontSize:12,fontWeight:700,color:'var(--text-primary)',marginBottom:3,lineHeight:1.3}}>{c.nomeCliente}</div>
                  <div style={{fontSize:10,color:'var(--text-muted)',marginBottom:c.prefeitura?3:0}}>{c.cpfCliente||'—'}</div>
                  {c.prefeitura&&<div style={{fontSize:9,color:'var(--text-muted)',marginBottom:3}}>🏛 {c.prefeitura}</div>}
                  {c.saldoDevedor&&<div style={{fontSize:10,fontWeight:700,color:'#10B981'}}>💰 {c.saldoDevedor}</div>}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:6,paddingTop:5,borderTop:'1px solid var(--border)'}}>
                    <span style={{fontSize:9,color:'var(--text-faint)'}}>{fmtD(c.dataEntrada)}</span>
                    <button
                      onClick={e=>{e.stopPropagation();dispatch({type:'REMOVE_FUNIL',cid:c.id,user:profile?.nome||'Usuário'});}}
                      style={{fontSize:9,padding:'1px 6px',borderRadius:5,background:'rgba(0,0,0,.05)',border:'1px solid var(--border)',color:'var(--text-muted)',cursor:'pointer'}}
                      title="Remover do funil">← pipeline</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── PIPELINE ────────────────────────────────────────────────────────────────
function BKOPipeline({clientes,profile,dispatch,onSelect,filtroEstagio,setFiltroEstagio,funis}){
  const [dragId,setDragId]=useState(null);
  const [search,setSearch]=useState('');
  const [funilSel,setFunilSel]=useState(null); // funil selecionado (objeto) ou null
  const [funilSearch,setFunilSearch]=useState('');
  const [funilOpen,setFunilOpen]=useState(false);
  const funilRef=useRef(null);
  const colsRef=useRef(null);

  useEffect(()=>{
    if(filtroEstagio&&colsRef.current){
      const idx=BKO_STAGES.findIndex(s=>s.id===filtroEstagio);
      if(idx>-1) colsRef.current.scrollLeft=idx*215;
    }
  },[filtroEstagio]);

  useEffect(()=>{
    if(!funilOpen) return;
    const h=(e)=>{if(funilRef.current&&!funilRef.current.contains(e.target)) setFunilOpen(false);};
    document.addEventListener('mousedown',h);
    return ()=>document.removeEventListener('mousedown',h);
  },[funilOpen]);

  const pipelineClientes=clientes.filter(c=>!c.funil_id);
  const filtered=search.trim()
    ?pipelineClientes.filter(c=>c.nomeCliente?.toLowerCase().includes(search.toLowerCase())||c.cpfCliente?.includes(search))
    :pipelineClientes;

  // Contagem de arquivados nos funis
  const funisComContagem=useMemo(()=>funis.map(f=>({
    ...f,
    count:clientes.filter(c=>c.funil_id===f.id).length,
  })),[funis,clientes]);

  return(
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* ── Header ── */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,gap:16,flexWrap:'wrap',padding:'16px 20px 0',flexShrink:0}}>
        <div>
          {funilSel
            ?<><div style={{fontSize:11,color:'var(--text-muted)',marginBottom:2,cursor:'pointer'}} onClick={()=>setFunilSel(null)}>← Pipeline</div>
               <div className="section-title" style={{color:funilSel.cor}}>{funilSel.nome}</div>
               <div className="section-sub">{clientes.filter(c=>c.funil_id===funilSel.id).length} clientes arquivados · agrupados por mês</div></>
            :<><div className="section-title">Pipeline</div>
               <div className="section-sub">{pipelineClientes.length} clientes ativos · arraste para mover</div></>
          }
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          {/* Filtro de estágio */}
          {!funilSel&&filtroEstagio&&(
            <div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:99,background:B_LIGHT,border:`1px solid ${B_MID}30`,fontSize:11,color:B_MID,fontWeight:600}}>
              {BKO_STAGES.find(s=>s.id===filtroEstagio)?.label}
              <button onClick={()=>setFiltroEstagio(null)} style={{background:'none',border:'none',cursor:'pointer',color:B_MID,fontSize:13,lineHeight:1,padding:0}}>×</button>
            </div>
          )}
          {/* Busca */}
          {!funilSel&&(
            <div style={{position:'relative',width:220}}>
              <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-faint)',fontSize:12}}>⌕</span>
              <input className="inp" style={{paddingLeft:30,height:34,fontSize:12}} placeholder="Buscar cliente…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
          )}
          {/* Busca no funil */}
          {funilSel&&(
            <div style={{position:'relative',width:220}}>
              <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-faint)',fontSize:12}}>⌕</span>
              <input className="inp" style={{paddingLeft:30,height:34,fontSize:12}} placeholder="Buscar no funil…" value={funilSearch} onChange={e=>setFunilSearch(e.target.value)}/>
            </div>
          )}
          {/* Dropdown Funis */}
          {funisComContagem.length>0&&(
            <div ref={funilRef} style={{position:'relative'}}>
              <button
                onClick={()=>setFunilOpen(v=>!v)}
                style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:8,
                  border:`1px solid ${funilSel?funilSel.cor+'60':'var(--border)'}`,
                  background:funilSel?`${funilSel.cor}10`:'var(--bg-card)',
                  color:funilSel?funilSel.cor:'var(--text-secondary)',
                  fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'var(--font)',whiteSpace:'nowrap'}}>
                <span style={{fontSize:13}}></span> Funis de Venda
                {funilSel&&<span style={{marginLeft:4,padding:'1px 7px',borderRadius:99,background:`${funilSel.cor}20`,fontSize:11}}>{funilSel.nome}</span>}
              </button>
              {funilOpen&&(
                <div style={{position:'absolute',right:0,top:'calc(100% + 6px)',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,boxShadow:'0 8px 28px rgba(0,0,0,.14)',zIndex:300,overflow:'hidden',minWidth:220}}>
                  <div style={{padding:'8px 12px',fontSize:9,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.08em',borderBottom:'1px solid var(--border)'}}>Funis de arquivo</div>
                  {funilSel&&(
                    <button onClick={()=>{setFunilSel(null);setFunilSearch('');setFunilOpen(false);}}
                      style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'10px 14px',background:'none',border:'none',cursor:'pointer',fontFamily:'var(--font)',fontSize:12,color:'var(--text-secondary)'}}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,.04)'}
                      onMouseLeave={e=>e.currentTarget.style.background='none'}>
                      ← Pipeline (todos)
                    </button>
                  )}
                  {funisComContagem.filter(f=>f.ativo).map(f=>(
                    <button key={f.id}
                      onClick={()=>{setFunilSel(f);setFunilSearch('');setFiltroEstagio(null);setFunilOpen(false);}}
                      style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'10px 14px',
                        background:funilSel?.id===f.id?`${f.cor}08`:'none',border:'none',cursor:'pointer',
                        fontFamily:'var(--font)',fontSize:12,fontWeight:funilSel?.id===f.id?700:400,
                        color:funilSel?.id===f.id?f.cor:'var(--text-primary)'}}
                      onMouseEnter={e=>{if(funilSel?.id!==f.id)e.currentTarget.style.background='rgba(0,0,0,.04)';}}
                      onMouseLeave={e=>{if(funilSel?.id!==f.id)e.currentTarget.style.background='none';}}>
                      <div style={{width:8,height:8,borderRadius:'50%',background:f.cor,boxShadow:`0 0 5px ${f.cor}60`,flexShrink:0}}/>
                      <span style={{flex:1,textAlign:'left'}}>{f.nome}</span>
                      <span style={{fontSize:11,fontWeight:700,padding:'1px 7px',borderRadius:99,background:`${f.cor}15`,color:f.cor}}>{f.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Kanban principal ── */}
      {!funilSel&&(
        <div ref={colsRef} style={{display:'flex',gap:7,overflowX:'auto',overflowY:'hidden',padding:'0 20px 16px',flex:1,minHeight:0,alignItems:'flex-start'}}>
          {BKO_STAGES.map(s=>(
            <BKOKanbanCol key={s.id} s={s} clientes={filtered} dragId={dragId} setDragId={setDragId}
              dispatch={dispatch} onSelect={onSelect} profile={profile}
              highlight={filtroEstagio===s.id} funis={funisComContagem}/>
          ))}
        </div>
      )}

      {/* ── Vista de funil por meses ── */}
      {funilSel&&(
        <BKOFunilMeses
          key={funilSel.id}
          funil={funilSel}
          clientes={clientes}
          onSelect={onSelect}
          dispatch={dispatch}
          profile={profile}
        />
      )}
    </div>
  );
}

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
    if(cpfAviso){alert('Este CPF já está cadastrado. Verifique os dados antes de continuar.');return;}
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

function BKOCadastrar({profile,session,funis=[],setFunis}){
  /* ── Gestão de funis ── */
  const [funilForm,setFunilForm]=useState({nome:'',cor:'#3B5BDB'});
  const [funilSaving,setFunilSaving]=useState(false);
  const [funilMsg,setFunilMsg]=useState(null);
  const CORES_FUNIL=['#3B5BDB','#22C55E','#EF4444','#F59E0B','#7C3AED','#0EA5E9','#F97316','#10B981','#EC4899'];

  const salvarFunil=async()=>{
    if(!funilForm.nome.trim()){setFunilMsg({t:'error',text:'Nome do funil é obrigatório.'});return;}
    setFunilSaving(true);setFunilMsg(null);
    const {data,error}=await supabase.from('bko_funis').insert({nome:funilForm.nome.trim(),cor:funilForm.cor,ordem:funis.length+1}).select().single();
    setFunilSaving(false);
    if(error){setFunilMsg({t:'error',text:error.message});return;}
    setFunis(prev=>[...prev,data]);
    setFunilForm({nome:'',cor:'#3B5BDB'});
    setFunilMsg({t:'success',text:`Funil "${data.nome}" criado!`});
  };

  const arquivarFunil=async(f)=>{
    await supabase.from('bko_funis').update({ativo:false}).eq('id',f.id);
    setFunis(prev=>prev.filter(x=>x.id!==f.id));
  };
  const [usuarios,setUsuarios]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showModal,setShowModal]=useState(false);
  const [editUser,setEditUser]=useState(null);
  const [editForm,setEditForm]=useState({nome:'', novaSenha:'', confirmarSenha:'',});
  const [editSaving,setEditSaving]=useState(false);
  const [editMsg,setEditMsg]=useState(null);
  const [form,setForm]=useState({nome:'',email:'',senha:'',role:'corban_bko'});
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState(null);
  const [confirmDelete,setConfirmDelete]=useState(null);
  const isComercial=profile?.role==='comercial';

  const load=useCallback(async()=>{setLoading(true);const {data}=await supabase.from('allowed_users').select('*').eq('modulo','bko').order('nome');setUsuarios(data||[]);setLoading(false);},[]);
  useEffect(()=>{load();},[load]);

  const openEdit=(u)=>{
    setEditUser(u);
    setEditForm({ nome:u.nome || '', novaSenha:'', confirmarSenha:'', });
    setEditMsg(null);
  };

  const saveEdit = async () => {
    if (!editForm.nome.trim()) { setEditMsg({ t:'error', text:'Nome é obrigatório.' }); return; }
    if (profile?.role !== 'comercial') { setEditMsg({ t:'error', text:'Apenas o comercial pode editar usuários.' }); return; }
    const vaiAlterarSenha = !!editForm.novaSenha || !!editForm.confirmarSenha;
    if (vaiAlterarSenha) {
      if (editUser?.role !== 'corban_bko') { setEditMsg({ t:'error', text:'A redefinição de senha é permitida apenas para usuários Corban.' }); return; }
      if (editForm.novaSenha.length < 8) { setEditMsg({ t:'error', text:'A nova senha deve ter no mínimo 8 caracteres.' }); return; }
      if (editForm.novaSenha !== editForm.confirmarSenha) { setEditMsg({ t:'error', text:'A confirmação da senha não confere.' }); return; }
    }
    setEditSaving(true); setEditMsg(null);
    const { error:e1 } = await supabase.from('allowed_users').update({ nome: editForm.nome.trim() }).eq('email', editUser.email);
    const { error:e2 } = await supabase.from('profiles').update({ nome: editForm.nome.trim() }).eq('email', editUser.email);
    let passwordError = null;
    if (vaiAlterarSenha) {
      try {
        const { data:{ session:s } } = await supabase.auth.getSession();
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-bko-user-password`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${s?.access_token}`},body: JSON.stringify({email: editUser.email,newPassword: editForm.novaSenha})});
        const result = await res.json().catch(()=> ({}));
        if (!res.ok || result.error) { passwordError = result.error || `Erro ao redefinir senha (status ${res.status}).`; }
      } catch (e) { passwordError = 'Erro de conexão ao redefinir senha.'; }
    }
    setEditSaving(false);
    if (e1 || e2 || passwordError) { setEditMsg({ t:'error', text: passwordError || 'Erro ao salvar. Tente novamente.' }); return; }
    setEditMsg({ t:'success', text: vaiAlterarSenha ? 'Nome e senha atualizados com sucesso!' : 'Nome atualizado com sucesso!' });
    load();
    setTimeout(() => setEditUser(null), 1200);
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
  const remove=async(u)=>{
    // Deletar em ambas as tabelas para revogar o acesso completamente
    await supabase.from('profiles').delete().ilike('email', u.email);
    await supabase.from('allowed_users').delete().eq('email', u.email);
    setConfirmDelete(null);
    setMsg({t:'success',text:`${u.nome} removido.`});
    load();
  };
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
                    {isComercial&&(
                      <button onClick={()=>setConfirmDelete(u)} style={{padding:'3px 8px',borderRadius:6,fontSize:10,fontWeight:600,cursor:'pointer',background:'var(--danger-dim)',color:'var(--danger)',border:'none'}}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );})}
        </div>
      )}

      {editUser&&(
        <div className="mbk" onClick={e=>{if(e.target===e.currentTarget)setEditUser(null);}}>
          <div className="mbox" style={{maxWidth:400}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div>
                <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:600,color:'var(--text-primary)'}}>Editar usuário</div>
                <div style={{marginTop:5}}><span style={{fontSize:10,padding:'2px 8px',borderRadius:99,fontWeight:700,background:`${ROLE_COLORS[editUser.role]}18`,color:ROLE_COLORS[editUser.role]}}>{ROLE_LABELS[editUser.role]||editUser.role}</span></div>
              </div>
              <button onClick={()=>setEditUser(null)} style={{background:'rgba(0,0,0,.06)',border:'1px solid var(--border)',borderRadius:8,cursor:'pointer',width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>×</button>
            </div>
            {editMsg&&<div style={{padding:'8px 12px',borderRadius:7,marginBottom:12,background:editMsg.t==='success'?'var(--success-dim)':'var(--danger-dim)',border:`1px solid ${editMsg.t==='success'?'rgba(61,155,107,.2)':'rgba(192,65,58,.2)'}`,fontSize:11,color:editMsg.t==='success'?'var(--success)':'var(--danger)'}}>{editMsg.text}</div>}
            <div style={{marginBottom:12}}>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Nome completo</label>
              <input className="inp" value={editForm.nome} onChange={e=>setEditForm(f=>({...f,nome:e.target.value}))} placeholder="Nome completo" autoFocus/>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>E-mail</label>
              <input className="inp" value={editUser.email} readOnly style={{background:'var(--bg-surface)',cursor:'not-allowed',color:'var(--text-muted)'}}/>
              <div style={{fontSize:10,color:'var(--text-faint)',marginTop:4}}>E-mail não pode ser alterado.</div>
            </div>
            {editUser.role === 'corban_bko' && (
              <>
                <div style={{marginBottom:12}}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Nova senha do Corban</label>
                  <input className="inp" type="password" value={editForm.novaSenha} onChange={e=>setEditForm(f=>({...f,novaSenha:e.target.value}))} placeholder="Mínimo 8 caracteres"/>
                </div>
                <div style={{marginBottom:20}}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Confirmar nova senha</label>
                  <input className="inp" type="password" value={editForm.confirmarSenha} onChange={e=>setEditForm(f=>({...f,confirmarSenha:e.target.value}))} placeholder="Repita a nova senha"/>
                  <div style={{fontSize:10,color:'var(--text-faint)',marginTop:4}}>Preencha apenas se quiser redefinir a senha deste Corban.</div>
                </div>
              </>
            )}
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

      {/* ── Gestão de Funis (só Comercial) ── */}
      {isComercial&&(
        <div style={{marginTop:32,paddingTop:28,borderTop:'1px solid var(--border)'}}>
          <div style={{marginBottom:18}}>
            <div className="section-title" style={{fontSize:16}}>Funis de arquivo</div>
            <div className="section-sub">Configure os funis para organizar clientes integrados, perdidos e outros</div>
          </div>
          {funilMsg&&<div style={{padding:'8px 12px',borderRadius:8,marginBottom:14,background:funilMsg.t==='success'?'var(--success-dim)':'var(--danger-dim)',border:`1px solid ${funilMsg.t==='success'?'rgba(61,155,107,.2)':'rgba(192,65,58,.2)'}`,fontSize:12,color:funilMsg.t==='success'?'var(--success)':'var(--danger)'}}>{funilMsg.text}</div>}
          {/* Lista de funis */}
          <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
            {funis.length===0&&<div style={{fontSize:12,color:'var(--text-muted)',padding:'12px 0'}}>Nenhum funil cadastrado ainda.</div>}
            {funis.map(f=>(
              <div key={f.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:10,background:'var(--bg-card)',border:'1px solid var(--border)'}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:f.cor,boxShadow:`0 0 5px ${f.cor}60`,flexShrink:0}}/>
                <div style={{fontWeight:600,fontSize:13,flex:1}}>{f.nome}</div>
                <button onClick={()=>arquivarFunil(f)} style={{fontSize:10,padding:'3px 10px',borderRadius:6,background:'var(--danger-dim)',color:'var(--danger)',border:'none',cursor:'pointer'}}>Arquivar</button>
              </div>
            ))}
          </div>
          {/* Criar novo funil */}
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,padding:'16px 18px'}}>
            <div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:12}}>Novo funil</div>
            <div style={{display:'flex',gap:10,alignItems:'flex-end',flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:160}}>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Nome</label>
                <input className="inp" value={funilForm.nome} onChange={e=>setFunilForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Integrados 2026"/>
              </div>
              <div>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Cor</label>
                <div style={{display:'flex',gap:5}}>
                  {CORES_FUNIL.map(c=>(
                    <div key={c} onClick={()=>setFunilForm(f=>({...f,cor:c}))}
                      style={{width:20,height:20,borderRadius:'50%',background:c,cursor:'pointer',
                        border:funilForm.cor===c?'2px solid var(--text-primary)':'2px solid transparent',
                        transition:'all .15s'}}/>
                  ))}
                </div>
              </div>
              <button className="btn" style={{background:B_MID,color:'#fff',height:36}} onClick={salvarFunil} disabled={funilSaving}>
                {funilSaving?'Salvando…':'+ Criar funil'}
              </button>
            </div>
          </div>
        </div>
      )}
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
  const [funis,setFunis]=useState([]);
  const [searchOpen,setSearchOpen]=useState(false);
  // Sidebar: inicia recolhida se já tiver preferência salva, senão expandida
  const [sidebarCollapsed,setSidebarCollapsed]=useState(()=>{
    try{ return localStorage.getItem('bko_sidebar_collapsed')==='1'; }catch{ return false; }
  });
  const toggleSidebar=useCallback(v=>{
    setSidebarCollapsed(prev=>{
      const next=typeof v==='boolean'?v:!prev;
      try{ localStorage.setItem('bko_sidebar_collapsed',next?'1':'0'); }catch{}
      return next;
    });
  },[]);
  const clientesRef=useRef(clientes);
  const syncTimerRef=useRef(null);
  const syncQueueRef=useRef(new Map());
  const auditTimerRef=useRef(null);
  const auditQueueRef=useRef([]);
  const [showAS,setShowAS]=useState(false);
  const [filtroEstagio,setFiltroEstagio]=useState(null);
  const setView=useCallback(v=>{
    dispatch({type:'VIEW',v});
    // Auto-colapsa ao entrar no pipeline para ganhar espaço
    if(v==='pipeline') toggleSidebar(true);
    else toggleSidebar(false);
  },[toggleSidebar]);
  const selected=clientes.find(c=>c.id===sel);

  /* Shortcut Ctrl/Cmd+K para busca */
  useEffect(()=>{
    const h=e=>{if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();setSearchOpen(v=>!v);}};
    window.addEventListener('keydown',h);
    return ()=>window.removeEventListener('keydown',h);
  },[]);

  /* Carregar funis */
  useEffect(()=>{
    supabase.from('bko_funis').select('*').eq('ativo',true).order('ordem').then(({data})=>setFunis(data||[]));
    const ch=supabase.channel('bko_funis_rt')
      .on('postgres_changes',{event:'*',schema:'public',table:'bko_funis'},()=>{
        supabase.from('bko_funis').select('*').eq('ativo',true).order('ordem').then(({data})=>setFunis(data||[]));
      }).subscribe();
    return ()=>supabase.removeChannel(ch);
  },[]);

  useEffect(()=>{
    if(!session) return;
    supabase.from('bko_clientes').select('*').order('created_at',{ascending:false}).limit(500)
      .then(({data,error})=>{
        if(error){console.error('BKO load error:',error);setReady(true);return;}
        const loaded=(data||[]).map(r=>({...r.data,id:r.id,estagio:r.estagio,criado_por_id:r.criado_por_id,criado_por_nome:r.criado_por_nome,criado_por_role:r.criado_por_role,atribuido_a_id:r.atribuido_a_id||null,atribuido_a_nome:r.atribuido_a_nome||null,responsavel_bko_id:r.responsavel_bko_id||null,responsavel_bko_nome:r.responsavel_bko_nome||null}));
        dispatch({type:'SET_C',clientes:loaded});clientesRef.current=loaded;setReady(true);
      });
    const ch=supabase.channel('bko_clientes_rt')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'bko_clientes'},payload=>{const r=payload.new;const novo={...r.data,id:r.id,estagio:r.estagio,criado_por_id:r.criado_por_id,criado_por_nome:r.criado_por_nome,criado_por_role:r.criado_por_role,atribuido_a_id:r.atribuido_a_id||null,atribuido_a_nome:r.atribuido_a_nome||null,responsavel_bko_id:r.responsavel_bko_id||null,responsavel_bko_nome:r.responsavel_bko_nome||null};dispatch({type:'RT_ADD',c:novo});})
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'bko_clientes'},payload=>{const r=payload.new;dispatch({type:'UPD',c:{...r.data,id:r.id,estagio:r.estagio,criado_por_id:r.criado_por_id,criado_por_nome:r.criado_por_nome,criado_por_role:r.criado_por_role,atribuido_a_id:r.atribuido_a_id||null,atribuido_a_nome:r.atribuido_a_nome||null,responsavel_bko_id:r.responsavel_bko_id||null,responsavel_bko_nome:r.responsavel_bko_nome||null}});})
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  },[session]);

  useEffect(()=>{
    if(!ready||!session) return;
    const prev=clientesRef.current;
    clientesRef.current=clientes;
    const prevMap=new Map(prev.map(c=>[c.id,c]));
    const changed=clientes.filter(c=>{const old=prevMap.get(c.id);return old&&JSON.stringify(old)!==JSON.stringify(c);});
    if(changed.length===0) return;
    changed.forEach(c=>syncQueueRef.current.set(c.id,c));
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current=setTimeout(async()=>{
      const toSync=[...syncQueueRef.current.values()];
      syncQueueRef.current.clear();
      await Promise.all(toSync.map(async c=>{
        const {id,estagio,criado_por_id,criado_por_nome,criado_por_role,atribuido_a_id,atribuido_a_nome,responsavel_bko_id,responsavel_bko_nome,...data}=c;
        const {error}=await supabase.from('bko_clientes').upsert({id,data:{...data,id},estagio:estagio||'clientes_novos',criado_por_id:criado_por_id||session.user.id,criado_por_nome:criado_por_nome||profile?.nome,criado_por_role:criado_por_role||profile?.role,atribuido_a_id:atribuido_a_id||null,atribuido_a_nome:atribuido_a_nome||null,responsavel_bko_id:responsavel_bko_id||null,responsavel_bko_nome:responsavel_bko_nome||null},{onConflict:'id'});
        if(error) console.error('BKO sync error:',id,error.message);
      }));
    },600);
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
      MOVE:      ()=>({action:'Moveu cliente',details:`→ "${BKO_STAGES.find(s=>s.id===action.st)?.label}"`,clienteId:action.cid}),
      MOVE_FUNIL:()=>({action:'Arquivou no funil',details:`→ "${action.funil_nome}" · ${action.funil_mes_label}`,clienteId:action.cid}),
      REMOVE_FUNIL:()=>({action:'Removeu do funil',details:'Retornou ao pipeline',clienteId:action.cid}),
      UPD:       ()=>({action:'Editou cliente',details:'Campos atualizados',clienteId:action.c?.id}),
      ADD:       ()=>({action:'Cadastrou cliente',details:`Nome: ${action.c?.nomeCliente}`,clienteId:action.c?.id}),
    };
    const fn=auditMap[action.type];
    if(fn){
      const {action:act,details,clienteId}=fn();
      const clienteNome=action.type==='ADD'?action.c?.nomeCliente:clientes.find(c=>c.id===clienteId)?.nomeCliente||'—';
      auditQueueRef.current.push({user_id:session.user.id,user_nome:profile.nome,user_role:profile.role,action:act,cliente_id:clienteId||null,cliente_nome:clienteNome,detalhes:details});
      clearTimeout(auditTimerRef.current);
      auditTimerRef.current=setTimeout(async()=>{
        const batch=auditQueueRef.current.splice(0);
        if(batch.length===0) return;
        const {error}=await supabase.from('bko_audit_log').insert(batch);
        if(error) console.error('BKO audit batch error:',error.message);
      },3000);
    }
  },[profile,clientes,session]);

  return(
    <>
      <div style={{display:'flex',minHeight:'100vh',background:'var(--bg-base)',fontFamily:'var(--font)'}}>
        <BKOSidebar view={view} setView={v=>{setView(v);if(v!=='pipeline')setFiltroEstagio(null);}} profile={profile} onLogout={signOut} onAlterarSenha={()=>setShowAS(true)} onSearch={()=>setSearchOpen(true)} collapsed={sidebarCollapsed} setCollapsed={toggleSidebar}/>
        <main style={{flex:1,minWidth:0,overflowY:view==='pipeline'?'hidden':'auto',paddingRight:selected?490:0,transition:'padding-right .3s cubic-bezier(.4,0,.2,1)'}}>
          {view==='dashboard' && <BKODashboard clientes={clientes} setView={v=>{setView(v);}} setFiltroEstagio={setFiltroEstagio}/>}
          {view==='pipeline'  && <BKOPipeline clientes={clientes} profile={profile} dispatch={auditedDispatch} onSelect={id=>dispatch({type:'SEL',id})} filtroEstagio={filtroEstagio} setFiltroEstagio={setFiltroEstagio} funis={funis}/>}
          {view==='clientes'  && <BKOClientes clientes={clientes} profile={profile} onSelect={id=>dispatch({type:'SEL',id})} onNew={()=>dispatch({type:'TNEW'})}/>}
          {view==='cadastrar' && <BKOCadastrar profile={profile} session={session} funis={funis} setFunis={setFunis}/>}
          {view==='auditoria' && <BKOAuditoria/>}
        </main>
        {selected&&<BKODetail key={selected.id} cliente={selected} profile={profile} session={session} dispatch={auditedDispatch} onClose={()=>dispatch({type:'CLOSE'})}/>}
        {newOpen&&<NovoClienteModal profile={profile} dispatch={auditedDispatch} clientes={clientes} onClose={()=>dispatch({type:'TNEW'})}/>}
      </div>
      {showAS&&<AlterarSenha onClose={()=>setShowAS(false)}/>}
      <BKOSearch
        clientes={clientes}
        open={searchOpen}
        onClose={()=>setSearchOpen(false)}
        onSelect={id=>{dispatch({type:'SEL',id});setSearchOpen(false);}}
      />
    </>
  );
}