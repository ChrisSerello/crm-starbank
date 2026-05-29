import { useState, useEffect, useReducer, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../../supabase';
import { gid, TODAY, fmtD } from '../../utils';
import { Avatar } from '../../components/shared';
import { AlterarSenha } from '../../components/AlterarSenha';
import { BKODetail } from './BKODetail';
import { BKOSearch } from './BKOSearch';
import { BKOGestaoCorbans } from './BKOGestaoCorbans';
import ReactDOM from 'react-dom';
import { BKOPipelines } from './BKOPipelines';
import { BKOConfigurarPipeline } from './BKOConfigurarPipeline';

const fmtDH=(ts)=>{
  if(!ts) return '—';
  try{
    const d=new Date(ts);
    if(isNaN(d.getTime())) return ts;
    const data=d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',timeZone:'America/Sao_Paulo'});
    const hora=d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'});
    return `${data} às ${hora}`;
  }catch{ return '—'; }
};

const MODULE_CONFIG = {
  indicacoes: { label:'Indicações',  icon:'◈', color:'#6366F1' },
  bko:        { label:'BKO',         icon:'⊞', color:'#3B5BDB' },
  corbans:    { label:'Corbans',      icon:'⬡', color:'#10B981' },
  externos:   { label:'Externos',     icon:'◎', color:'#F59E0B' },
  ecommerce:  { label:'E-commerce',  icon:'◇', color:'#EC4899' },
  tv:         { label:'TV',          icon:'▣', color:'#8B5CF6' },
};

const B_DARK  = '#1C2033';
const B_MID   = '#3B5BDB';
const B_LIGHT = 'rgba(13,27,86,0.1)';
const B_GLOW  = 'rgba(59,91,219,0.28)';
const B_TEXT  = '#A5B4FC';

const ROLE_LABELS = { comercial:'Comercial', corban_bko:'Corban', bko:'BKO', startec:'Startec' };
const ROLE_COLORS = { comercial:'#3B5BDB', corban_bko:'#0EA5E9', bko:'#7C3AED', startec:'#059669' };

const BKO_STAGES = [
  { id:'clientes_novos',       label:'Clientes Novos - Corban',              color:'#3B5BDB', bg:'rgba(59,91,219,.1)'  },
  { id:'saldo_andamento',      label:'BKO - Saldo Devedor',                  color:'#7C3AED', bg:'rgba(124,58,237,.1)' },
  { id:'pendencia_BKO',        label:'Pendência Análise BKO',                color:'#8e14b6', bg:'rgba(249,115,22,.1)' },
  { id:'pendencia_financeiro', label:'Pendência Análise Financeira',          color:'#F97316', bg:'rgba(249,115,22,.1)' },
  { id:'em_negociacao',        label:'Em negociação (Saldo Informado) - Corban', color:'#0EA5E9', bg:'rgba(14,165,233,.1)' },
  { id:'abertura_conta',       label:'Abertura de conta - Interno',           color:'#10B981', bg:'rgba(16,185,129,.1)' },
  { id:'digitar_proposta',     label:'Pronto para Digitar - Corban',          color:'#F59E0B', bg:'rgba(245,158,11,.1)' },
  { id:'banksoft',             label:'Banksoft - Tratativas',                 color:'#EF4444', bg:'rgba(239,68,68,.1)'  },
  { id:'integrado',            label:'Finalizado - Interno',                  color:'#22C55E', bg:'rgba(34,197,94,.1)'  },
  { id:'perdido',              label:'Perdidos',                              color:'#EF4444', bg:'rgba(239,68,68,.1)'  },
];

const COLUNAS_TRAVA_BKO = ['saldo_andamento', 'pendencia_BKO'];
const SUPERVISORES_BKO_EMAILS = [
  'edson@starbank.tec.br',
  'vera.marques@starbank.tec.br',
  'maria.cerqueira@starbank.tec.br',
];

function checarTravaBKO(cliente, profile, session) {
  if (!COLUNAS_TRAVA_BKO.includes(cliente.estagio)) return { travado: false };
  if (!cliente.responsavel_bko_id) return { travado: false };
  const isBko = profile?.role === 'bko';
  const euSouResponsavel = cliente.responsavel_bko_id === profile?.id;
  const isSupervisorBko = SUPERVISORES_BKO_EMAILS.includes(session?.user?.email);
  if (!isBko) return { travado: false };
  if (euSouResponsavel) return { travado: false };
  if (isSupervisorBko) return { travado: false };
  return { travado: true, motivo: cliente.responsavel_bko_nome || 'outro BKO' };
}

const blankCliente = () => ({
  nomeCliente:'', cpfCliente:'', telefone:'', prefeitura:'',
  estagio:'clientes_novos', documentoStatus:'Não solicitado',
  observacoesBko:'', saldoDevedor:'',
  activities:[], documentos:[],
  dataEntrada:TODAY, ultimoContato:TODAY,
});

const INIT = { clientes:[], view:'dashboard', sel:null, newOpen:false };

function R(s,{type:t,...a}){
  switch(t){
    case'SET_C':      return{...s,clientes:a.clientes};
    case'VIEW':       return{...s,view:a.v,sel:null};
    case'SEL':        return{...s,sel:a.id};
    case'CLOSE':      return{...s,sel:null};
    case'TNEW':       return{...s,newOpen:!s.newOpen};
    case'MOVE':       return{...s,clientes:s.clientes.map(c=>c.id!==a.cid?c:{...c,estagio:a.st,ultimoContato:TODAY,activities:[...(c.activities||[]),{id:gid(),type:'stage_change',date:TODAY,user:a.user,text:`Movido para "${BKO_STAGES.find(s=>s.id===a.st)?.label}"${a.motivo?` · Motivo: ${a.motivo}`:''}${a.obs?` · ${a.obs}`:''}`}]})};
    case'MOVE_FUNIL': return{...s,clientes:s.clientes.map(c=>c.id!==a.cid?c:{...c,funil_id:a.funil_id,funil_mes:a.funil_mes,funil_nome:a.funil_nome,ultimoContato:TODAY,activities:[...(c.activities||[]),{id:gid(),type:'stage_change',date:TODAY,user:a.user,text:`Arquivado no funil "${a.funil_nome}" · ${a.funil_mes_label}`}]})};
    case'REMOVE_FUNIL':return{...s,clientes:s.clientes.map(c=>c.id!==a.cid?c:{...c,funil_id:null,funil_mes:null,funil_nome:null,ultimoContato:TODAY,activities:[...(c.activities||[]),{id:gid(),type:'stage_change',date:TODAY,user:a.user,text:'Retornou ao pipeline'}]})};
    case'UPD':        return{...s,clientes:s.clientes.map(c=>c.id!==a.c.id?c:{...c,...a.c})};
    case'ADD':        return{...s,newOpen:false,clientes:[{...a.c,activities:[{id:gid(),type:'stage_change',date:TODAY,user:a.user,text:'Cliente cadastrado'}]},...s.clientes]};
    case'RT_ADD':     return s.clientes.find(c=>c.id===a.c.id)?s:{...s,clientes:[a.c,...s.clientes]};
    default:          return s;
  }
}

function ModuleSwitcherBKO({ userModules, profile, onSwitch, collapsed }){
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({top:0,left:0,width:0});
  const btnRef = useRef(null);
  const current = MODULE_CONFIG[profile?.modulo] || {label:profile?.modulo||'Módulo',icon:'◇',color:'#3B5BDB'};
  const others = (userModules||[]).filter(m=>m.modulo!==profile?.modulo);

  useEffect(()=>{
    const handler=(e)=>{if(btnRef.current&&!btnRef.current.closest('[data-bko-switcher]')?.contains(e.target))setOpen(false);};
    document.addEventListener('mousedown',handler);
    return()=>document.removeEventListener('mousedown',handler);
  },[]);

  const handleOpen=()=>{
    if(btnRef.current){const rect=btnRef.current.getBoundingClientRect();setDropPos({top:rect.bottom+6,left:rect.left,width:rect.width});}
    setOpen(o=>!o);
  };

  if(!userModules||userModules.length<=1) return null;

  return(
    <div data-bko-switcher="1" style={{margin:collapsed?'0 4px 4px':'0 8px 4px'}}>
      {open&&ReactDOM.createPortal(
        <div data-bko-switcher="1" onMouseDown={e=>e.stopPropagation()}
          style={{position:'fixed',top:dropPos.top,left:dropPos.left,width:collapsed?180:dropPos.width,background:'#1C2033',border:'1px solid rgba(59,91,219,.35)',borderRadius:10,padding:4,zIndex:9999,boxShadow:'0 8px 32px rgba(0,0,0,.5)'}}>
          <div style={{fontSize:9,color:'rgba(255,255,255,.35)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',padding:'5px 10px 4px'}}>Trocar módulo</div>
          {others.map(({modulo,role})=>{
            const cfg=MODULE_CONFIG[modulo]||{label:modulo,icon:'◇',color:'#3B5BDB'};
            return(
              <button key={modulo} onClick={()=>{onSwitch(modulo,role);setOpen(false);}}
                style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'9px 12px',border:'none',background:'none',cursor:'pointer',borderRadius:7,textAlign:'left',transition:'background .1s'}}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(59,91,219,.18)'}
                onMouseLeave={e=>e.currentTarget.style.background='none'}>
                <span style={{fontSize:15,width:20,textAlign:'center',color:cfg.color,flexShrink:0}}>{cfg.icon}</span>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,.85)'}}>{cfg.label}</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,.4)',marginTop:1,textTransform:'uppercase',letterSpacing:'.05em'}}>{role}</div>
                </div>
              </button>
            );
          })}
        </div>,
        document.body
      )}
      <button ref={btnRef} onClick={handleOpen} title={collapsed?`Módulo: ${current.label}`:''}
        style={{display:'flex',alignItems:'center',gap:collapsed?0:8,justifyContent:collapsed?'center':'flex-start',width:'100%',padding:collapsed?'8px 0':'8px 10px',borderRadius:8,border:'1px solid rgba(59,91,219,.25)',background:'rgba(59,91,219,.1)',cursor:'pointer',transition:'all .15s'}}
        onMouseEnter={e=>{e.currentTarget.style.background='rgba(59,91,219,.2)';e.currentTarget.style.borderColor='rgba(59,91,219,.5)';}}
        onMouseLeave={e=>{e.currentTarget.style.background='rgba(59,91,219,.1)';e.currentTarget.style.borderColor='rgba(59,91,219,.25)';}}>
        <span style={{fontSize:14,color:current.color,width:20,textAlign:'center',flexShrink:0}}>{current.icon}</span>
        {!collapsed&&<><span style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,.8)',flex:1,textAlign:'left'}}>{current.label}</span><span style={{fontSize:9,color:'rgba(255,255,255,.35)'}}>{open?'▲':'▼'}</span></>}
      </button>
    </div>
  );
}

// ── SIDEBAR — sem item 'pipelines' separado ──────────────────────────────────
function BKOSidebar({view,setView,profile,onLogout,onAlterarSenha,onSearch,collapsed,setCollapsed,userModules,onSwitchModule,session}){
  const r=profile?.role;
  const SUPERVISORES_CADASTRAR=[
    'edson@starbank.tec.br',
    'vera.marques@starbank.tec.br',
    'maria.cerqueira@starbank.tec.br',
    'elisangela.pereira@starbank.tec.br',
  ];
  const isSupervisorComAcesso=SUPERVISORES_CADASTRAR.includes(session?.user?.email);
  const items=[
    {id:'dashboard',icon:'◈',label:'Dashboard'},
    {id:'pipeline', icon:'⊞',label:'Pipeline'},
    {id:'clientes', icon:'≡',label:'Clientes'},
    ...(r==='comercial'||r==='corban_bko'||r==='startec'||isSupervisorComAcesso?[{id:'cadastrar',icon:'＋',label:'Cadastrar'}]:[]),
    ...(r==='comercial'?[{id:'auditoria',icon:'🔍',label:'Auditoria'}]:[]),
    ...(profile?.acesso_gestao_corban?[{id:'gestao_corban',icon:'⬡',label:'Gestão Corban'}]:[]),
  ];

  const ROLE_LABELS_SB={comercial:'Comercial',corban_bko:'Corban',bko:'BKO',startec:'Startec',supervisor_startec:'Supervisor'};
  const W=collapsed?56:210;

  // Azul Noturno palette
  const BG='#141218';
  const ACTIVE_BG='rgba(59,91,219,.15)';
  const ACTIVE_COLOR='#C7D2FE';
  const ACTIVE_ICON='#818CF8';
  const ITEM_COLOR='rgba(255,255,255,.38)';
  const BORDER='rgba(255,255,255,.07)';
  const ACCENT='#3B5BDB';

  return(
    <div style={{width:W,minWidth:W,background:BG,borderRight:'1px solid rgba(255,255,255,.06)',display:'flex',flexDirection:'column',flexShrink:0,height:'100vh',position:'sticky',top:0,transition:'width .22s cubic-bezier(.4,0,.2,1)',overflow:'hidden'}}>

      {/* ── Logo ── */}
      <div style={{padding:collapsed?'16px 0':'18px 14px 14px',borderBottom:`1px solid ${BORDER}`,display:'flex',alignItems:'center',justifyContent:collapsed?'center':'space-between',minHeight:68,flexShrink:0,gap:8}}>
        <div style={{display:'flex',alignItems:'center',gap:9,overflow:'hidden',flex:1}}>
          <div style={{width:30,height:30,borderRadius:9,background:ACCENT,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 4px 12px rgba(59,91,219,.4)',fontSize:14,fontWeight:800,color:'#fff',fontStyle:'italic',fontFamily:'var(--font-display)'}}>S</div>
          {!collapsed&&(
            <div style={{overflow:'hidden',flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:'#EAE6F0',letterSpacing:'-.01em',whiteSpace:'nowrap'}}>StarFlow</div>
              <div style={{fontSize:9,color:'rgba(255,255,255,.2)',letterSpacing:'.1em',textTransform:'uppercase',fontFamily:'monospace',marginTop:1}}>BKO — Backoffice</div>
            </div>
          )}
        </div>
        <button onClick={()=>setCollapsed(v=>!v)} title={collapsed?'Expandir':'Recolher'}
          style={{width:22,height:22,borderRadius:5,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.09)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,.25)',fontSize:11,flexShrink:0,transition:'all .15s'}}
          onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.12)';e.currentTarget.style.color='rgba(255,255,255,.8)';}}
          onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.06)';e.currentTarget.style.color='rgba(255,255,255,.25)';}}>
          {collapsed?'›':'‹'}
        </button>
      </div>

      {/* ── Search ── */}
      <div style={{padding:collapsed?'8px 4px 0':'8px 10px 0'}}>
        <button onClick={onSearch} title={collapsed?'Buscar (Ctrl+K)':''}
          style={{display:'flex',alignItems:'center',gap:collapsed?0:8,width:'100%',padding:collapsed?'8px 0':'7px 10px',justifyContent:collapsed?'center':'flex-start',borderRadius:6,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',cursor:'pointer',color:'rgba(255,255,255,.3)',fontSize:12,fontFamily:'var(--font)',transition:'all .15s'}}
          onMouseEnter={e=>{e.currentTarget.style.background='rgba(59,91,219,.1)';e.currentTarget.style.borderColor='rgba(59,91,219,.3)';e.currentTarget.style.color='rgba(165,180,252,.8)';}}
          onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.05)';e.currentTarget.style.borderColor='rgba(255,255,255,.08)';e.currentTarget.style.color='rgba(255,255,255,.3)';}}>
          <span style={{fontSize:14,flexShrink:0}}>⌕</span>
          {!collapsed&&<><span style={{flex:1,textAlign:'left',fontSize:11.5}}>Buscar…</span><kbd style={{fontSize:8,padding:'1px 4px',borderRadius:3,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.1)',color:'rgba(255,255,255,.25)',fontFamily:'monospace'}}>K</kbd></>}
        </button>
      </div>

      {/* ── Module switcher (se tiver mais de 1 módulo) ── */}
      {userModules&&userModules.length>1&&(
        <div style={{padding:collapsed?'6px 4px 0':'6px 10px 0'}}>
          <ModuleSwitcherBKO userModules={userModules} profile={profile} onSwitch={onSwitchModule} collapsed={collapsed}/>
        </div>
      )}

      {/* ── Nav ── */}
      <nav style={{flex:1,padding:collapsed?'10px 4px':'10px 8px',overflow:'hidden'}}>
        {!collapsed&&<div style={{fontSize:9,fontWeight:600,color:'rgba(255,255,255,.18)',textTransform:'uppercase',letterSpacing:'.13em',padding:'4px 8px 8px',fontFamily:'monospace'}}>Menu</div>}
        {items.map(it=>{
          const active=view===it.id;
          return(
            <button key={it.id} onClick={()=>setView(it.id)} title={collapsed?it.label:''}
              style={{display:'flex',alignItems:'center',gap:collapsed?0:9,padding:collapsed?'9px 0':'7px 10px',justifyContent:collapsed?'center':'flex-start',borderRadius:6,fontSize:12.5,fontWeight:active?500:400,cursor:'pointer',border:'none',width:'100%',textAlign:'left',transition:'all .15s',marginBottom:2,fontFamily:'var(--font)',letterSpacing:'-.005em',
                background:active?ACTIVE_BG:'transparent',
                color:active?ACTIVE_COLOR:ITEM_COLOR,
              }}
              onMouseEnter={e=>{if(!active){e.currentTarget.style.background='rgba(255,255,255,.06)';e.currentTarget.style.color='rgba(255,255,255,.65)';}}}
              onMouseLeave={e=>{if(!active){e.currentTarget.style.background='transparent';e.currentTarget.style.color=ITEM_COLOR;}}}>
              <span style={{fontSize:14,width:20,textAlign:'center',flexShrink:0,color:active?ACTIVE_ICON:ITEM_COLOR}}>{it.icon}</span>
              {!collapsed&&<span style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{it.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div style={{padding:collapsed?'10px 4px':'10px 12px',borderTop:`1px solid ${BORDER}`,flexShrink:0}}>
        {collapsed?(
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
            <div style={{width:28,height:28,borderRadius:'50%',background:ACCENT,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#A5B4FC'}}>
              {profile?.nome?.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()||'?'}
            </div>
            <button onClick={onLogout} style={{width:30,height:26,borderRadius:6,background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.18)',color:'#FCA5A5',fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>⏻</button>
          </div>
        ):(
          <>
            {/* User row */}
            <div style={{display:'flex',alignItems:'center',gap:9,padding:'8px 10px',borderRadius:8,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.06)',marginBottom:8}}>
              <div style={{width:26,height:26,borderRadius:'50%',background:ACCENT,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9.5,fontWeight:700,color:'#A5B4FC',flexShrink:0}}>
                {profile?.nome?.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()||'?'}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:500,color:'rgba(255,255,255,.82)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.nome}</div>
                {/* Pill de role */}
                <span style={{display:'inline-block',marginTop:2,fontSize:9,fontWeight:600,padding:'1px 6px',borderRadius:99,background:'rgba(59,91,219,.22)',color:'#818CF8',fontFamily:'monospace',letterSpacing:'.04em',textTransform:'uppercase'}}>
                  {ROLE_LABELS_SB[r]||r}
                </span>
              </div>
              <div style={{width:6,height:6,borderRadius:'50%',background:'#22C55E',boxShadow:'0 0 5px #22C55E',flexShrink:0}}/>
            </div>
            {/* Ações */}
            <div style={{display:'flex',gap:6}}>
              <button onClick={onAlterarSenha} style={{flex:1,padding:'6px 0',borderRadius:6,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',color:'rgba(255,255,255,.35)',fontSize:11,fontWeight:500,cursor:'pointer',fontFamily:'var(--font)',transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.1)';e.currentTarget.style.color='rgba(255,255,255,.7)';}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.05)';e.currentTarget.style.color='rgba(255,255,255,.35)';}}>
                🔑 Senha
              </button>
              <button onClick={onLogout} style={{flex:1,padding:'6px 0',borderRadius:6,background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.16)',color:'#FCA5A5',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'var(--font)',transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(239,68,68,.16)';}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(239,68,68,.08)';}}>
                Sair
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


function StatCard({label,value,color,icon,onClick}){
  return(
    <div onClick={onClick}
      style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:'18px 20px',position:'relative',overflow:'hidden',cursor:'pointer',transition:'transform .15s, box-shadow .15s'}}
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

function filtrarClientesSupervisor(clientes, origemFiltro, allTeams){
  if(!origemFiltro) return clientes;
  if(origemFiltro==='corban') return clientes.filter(c=>c.origem==='corban');
  if(origemFiltro==='startec') return clientes.filter(c=>c.origem==='startec');
  const team=allTeams.find(t=>t.supervisor_id===origemFiltro);
  if(team) return clientes.filter(c=>c.origem==='startec'&&team.operadores.includes(c.atribuido_a_id));
  return clientes;
}

function BKODashboard({clientes,setView,setFiltroEstagio,profile,origemFiltro,setOrigemFiltro,supervisorTeam,allTeams}){
  const isComercial=profile?.role==='comercial';
  const isBkoPipeline=profile?.role==='bko';
  const isSupervisor=profile?.is_supervisor===true;
  const podeVerInsights=isComercial||isBkoPipeline;

  // Mapa de CPFs duplicados — key=cpf, value=count
  const cpfDuplicados=useMemo(()=>{
    const counts={};
    clientes.forEach(c=>{ if(c.cpfCliente){ counts[c.cpfCliente]=(counts[c.cpfCliente]||0)+1; } });
    // Retorna só os que aparecem mais de uma vez
    const dup={};
    Object.entries(counts).forEach(([cpf,n])=>{ if(n>1) dup[cpf]=n; });
    return dup;
  },[clientes]);

  const clientesFiltrados=useMemo(()=>{
    if(profile?.role==='startec'||profile?.role==='corban_bko')
      return clientes.filter(c=>c.atribuido_a_id===profile?.id||c.criado_por_id===profile?.id);
    if(isComercial){
      if(isSupervisor) return filtrarClientesSupervisor(clientes,origemFiltro,allTeams);
      if(origemFiltro) return clientes.filter(c=>c.origem===origemFiltro);
    }
    return clientes;
  },[clientes,profile,origemFiltro,supervisorTeam,allTeams]);

  // // Aplica filtro de duplicados se ativo (só para comercial e BKO)
  // const clientesParaExibir=useMemo(()=>{
  //   if(!filtroDuplicados||!podeVerInsights) return clientesFiltrados;
  //   return clientesFiltrados.filter(c=>cpfDuplicados[c.cpfCliente]);
  // },[clientesFiltrados,filtroDuplicados,cpfDuplicados,podeVerInsights]);

  const counts=useMemo(()=>{const m={};BKO_STAGES.forEach(s=>{m[s.id]=clientesFiltrados.filter(c=>c.estagio===s.id&&!c.funil_id).length;});return m;},[clientesFiltrados]);
  const handleCard=(stageId)=>{setFiltroEstagio(stageId);setView('pipeline');};
  const recent=useMemo(()=>clientesFiltrados.flatMap(c=>(c.activities||[]).map(a=>({...a,clienteName:c.nomeCliente}))).sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,8),[clientesFiltrados]);
  return(
    <div style={{padding:'28px 32px'}}>
      <div style={{marginBottom:24,display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div><div className="section-title">Dashboard</div><div className="section-sub">BKO Backoffice · {fmtD(TODAY)}</div></div>
        {isComercial&&(
          <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
            <span style={{fontSize:11,color:'var(--text-muted)',marginRight:4}}>Equipe:</span>
            {[['todos',null,'Todos'],['corban','corban','Corbans'],['startec','startec','Startec'],
              ...(isSupervisor?allTeams.map(t=>[t.supervisor_id,t.supervisor_id,`Eq. ${t.supervisor_nome?.split(' ')[0]}`]):[])
            ].map(([key,val,label])=>(
              <button key={key} onClick={()=>setOrigemFiltro(val)}
                style={{padding:'5px 14px',borderRadius:99,fontSize:12,fontWeight:600,cursor:'pointer',transition:'all .15s',
                  background:origemFiltro===val?(val==='startec'||allTeams.some(t=>t.supervisor_id===val)?'#059669':val==='corban'?B_MID:'rgba(0,0,0,.08)'):'transparent',
                  color:origemFiltro===val?'#fff':'var(--text-muted)',
                  border:`1px solid ${origemFiltro===val?(val==='startec'||allTeams.some(t=>t.supervisor_id===val)?'#059669':val==='corban'?B_MID:'rgba(0,0,0,.15)'):'var(--border)'}`,
                }}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:12}}>
        {BKO_STAGES.slice(0,4).map(s=>(
          <StatCard key={s.id} label={s.label} value={counts[s.id]||0} color={s.color}
            icon={s.id==='clientes_novos'?'👤':s.id==='saldo_andamento'?'💰':s.id==='pendencia_financeiro'?'⏳':'⟳'}
            onClick={()=>handleCard(s.id)}/>
        ))}
      </div>
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

// ─── MODAL: MOTIVO DA PERDA ──────────────────────────────────────────────────
const MOTIVOS_PERDA = [
  'Taxa alta',
  'Sem margem disponível',
  'Cliente não atendeu',
  'Cliente desistiu',
  'Concorrente mais vantajoso',
  'Documentação incompleta',
  'Reprovado na análise',
  'Outro',
];

function MotivoPerdaModal({ onConfirm, onCancel }) {
  const [motivo, setMotivo] = useState('');
  const [obs,    setObs]    = useState('');
  const [erro,   setErro]   = useState(false);

  const confirmar = () => {
    if (!motivo) { setErro(true); return; }
    onConfirm(motivo, obs.trim());
  };

  return (
    <div className="mbk" onClick={e=>{ if(e.target===e.currentTarget) onCancel(); }}>
      <div className="mbox" style={{ maxWidth:420 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:600, color:'var(--text-primary)', marginBottom:4 }}>
              Mover para Perdidos
            </div>
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>
              Informe o motivo para registrar no histórico
            </div>
          </div>
          <button onClick={onCancel} style={{ background:'rgba(0,0,0,.06)', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, color:'var(--text-muted)' }}>×</button>
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>
            Motivo da perda *
          </label>
          <select className="sel" value={motivo} onChange={e=>{ setMotivo(e.target.value); setErro(false); }}
            style={{ borderColor: erro ? 'var(--danger)' : '' }}>
            <option value="">— Selecione um motivo —</option>
            {MOTIVOS_PERDA.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {erro && <div style={{ fontSize:11, color:'var(--danger)', marginTop:5 }}>⚠ Selecione um motivo antes de continuar.</div>}
        </div>

        <div style={{ marginBottom:22 }}>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>
            Observação (opcional)
          </label>
          <textarea className="inp" value={obs} onChange={e=>setObs(e.target.value)}
            placeholder="Detalhe o motivo se necessário…"
            style={{ resize:'vertical', minHeight:72, lineHeight:1.5 }}/>
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn" style={{ background:'var(--danger)', color:'#fff' }} onClick={confirmar}>
            Confirmar perda
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── KCARD ───────────────────────────────────────────────────────────────────
function KCard({c,onSelect,dispatch,profile,session,setDragId,funis=[],setMotivoModal,cpfDuplicados={},podeVerInsights=false}){
  const [menuOpen,setMenuOpen]=useState(false);
  const [menuPos,setMenuPos]=useState({top:0,left:0});
  const btnRef=useRef(null);

  useEffect(()=>{
    if(!menuOpen) return;
    const close=(e)=>{if(btnRef.current&&!btnRef.current.closest('[data-kcard-menu]')?.contains(e.target))setMenuOpen(false);};
    document.addEventListener('mousedown',close);
    return()=>document.removeEventListener('mousedown',close);
  },[menuOpen]);

  const openMenu=(e)=>{
    e.preventDefault();e.stopPropagation();
    const rect=btnRef.current.getBoundingClientRect();
    setMenuPos({top:rect.bottom+4,left:rect.right-220});
    setMenuOpen(v=>!v);
  };

  const moverFunil=(funil)=>{
    const now=new Date();
    const funil_mes=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    dispatch({type:'MOVE_FUNIL',cid:c.id,funil_id:funil.id,funil_mes,funil_nome:funil.nome,funil_mes_label:`${meses[now.getMonth()]} ${now.getFullYear()}`,user:profile?.nome||'Usuário'});
    setMenuOpen(false);
  };

  // A: badge duplicado
  const qtdDup = podeVerInsights && c.cpfCliente ? (cpfDuplicados[c.cpfCliente]||0) : 0;
  const isDup  = qtdDup > 1;

  // D: dias sem movimentação baseado em ultimoContato
  const diasParado = (() => {
    const ref = c.ultimoContato || c.dataEntrada;
    if (!ref) return null;
    const d = new Date(ref);
    if (isNaN(d)) return null;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  })();
  const alertaParado = podeVerInsights && diasParado !== null && diasParado >= 7
    ? diasParado >= 15 ? 'red' : 'yellow'
    : null;

  return(
    <>
      <div className="kcard" style={{position:'relative',opacity:c.funil_id?0.55:1,
        borderLeft: alertaParado==='red' ? '3px solid #EF4444' : alertaParado==='yellow' ? '3px solid #F59E0B' : undefined,
      }} draggable={!checarTravaBKO(c,profile,session).travado} onDragStart={()=>{if(!checarTravaBKO(c,profile,session).travado)setDragId(c.id);}} onClick={(e)=>{if(!e.defaultPrevented)onSelect(c.id);}}>
        {/* A: Badge duplicado */}
        {isDup&&podeVerInsights&&(
          <div style={{position:'absolute',top:6,left:6,display:'flex',alignItems:'center',gap:3,padding:'1px 6px',borderRadius:99,background:'rgba(249,115,22,.12)',border:'1px solid rgba(249,115,22,.3)',fontSize:9,fontWeight:700,color:'#F97316',zIndex:1}}>
            ⚠ {qtdDup}×
          </div>
        )}
        <div style={{fontSize:12,fontWeight:600,color:'var(--text-primary)',marginBottom:4,paddingRight:20,paddingLeft:isDup&&podeVerInsights?36:0}}>{c.nomeCliente}</div>
        <div style={{fontSize:10,color:'var(--text-muted)',marginBottom:c.prefeitura?3:5}}>{c.cpfCliente||'—'}</div>
        {c.prefeitura&&<div style={{fontSize:9,color:'var(--text-muted)',marginBottom:4}}>🏛 {c.prefeitura}</div>}
        {c.saldoDevedor&&<div style={{fontSize:10,fontWeight:700,color:'#10B981',marginBottom:4}}>💰 {c.saldoDevedor}</div>}
        {c.funil_nome&&<div style={{fontSize:9,fontWeight:600,color:'var(--text-muted)',marginBottom:4}}>📦 {c.funil_nome}</div>}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:9,color:'var(--text-faint)'}}>{fmtD(c.dataEntrada)}</span>
          <span style={{fontSize:9,fontWeight:600,color:c.documentoStatus==='Aprovado'?'var(--success)':c.documentoStatus==='Não solicitado'?'var(--text-faint)':'var(--amber)'}}>{c.documentoStatus}</span>
        </div>
        {c.created_at&&<div style={{marginTop:3,fontSize:9,color:'var(--text-faint)'}}>🕐 {fmtDH(c.created_at)}</div>}
        {c.criado_por_nome&&<div style={{marginTop:5,paddingTop:5,borderTop:'1px solid var(--border)',fontSize:9,color:'var(--text-muted)'}}>{c.criado_por_nome}</div>}
        {/* D: Indicador de tempo parado */}
        {alertaParado&&podeVerInsights&&(
          <div style={{marginTop:4,display:'flex',alignItems:'center',gap:4,fontSize:9,fontWeight:700,color:alertaParado==='red'?'#EF4444':'#F59E0B'}}>
            <span>{alertaParado==='red'?'🔴':'🟡'}</span>
            {diasParado}d sem movimentação
          </div>
        )}
        <button ref={btnRef} onClick={openMenu}
          style={{position:'absolute',top:6,right:6,background:'rgba(0,0,0,.06)',border:'none',borderRadius:5,cursor:'pointer',width:20,height:20,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'var(--text-muted)',lineHeight:1,padding:0}}>⋯</button>
      </div>
      {menuOpen&&typeof document!=='undefined'&&ReactDOM.createPortal(
        <div data-kcard-menu="1" onMouseDown={e=>e.stopPropagation()}
          style={{position:'fixed',top:menuPos.top,left:Math.max(8,menuPos.left),zIndex:9999,background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,.18)',minWidth:220,overflow:'hidden'}}>
          <div style={{padding:'7px 12px',fontSize:9,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.08em',borderBottom:'1px solid var(--border)'}}>Mover para estágio…</div>
          {(()=>{const trava=checarTravaBKO(c,profile,session);return trava.travado?(
            <div style={{padding:'10px 14px',fontSize:11,color:'#F97316',background:'rgba(249,115,22,.06)'}}>
              🔒 Movimentação travada — responsável: <strong>{trava.motivo}</strong>
            </div>
          ):BKO_STAGES.filter(st=>st.id!==c.estagio).map(st=>(
            <button key={st.id}
              onMouseDown={e=>{e.stopPropagation();if(st.id==='perdido'){setMotivoModal({cid:c.id,setMenuOpen});}else{dispatch({type:'MOVE',cid:c.id,st:st.id,user:profile?.nome||'Usuário'});setMenuOpen(false);}}}
              style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'7px 12px',background:'none',border:'none',cursor:'pointer',textAlign:'left',fontSize:12,color:'var(--text-primary)',fontFamily:'var(--font)',transition:'background .1s'}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,.04)'}
              onMouseLeave={e=>e.currentTarget.style.background='none'}>
              <div style={{width:7,height:7,borderRadius:'50%',background:st.color,flexShrink:0}}/>{st.label}
            </button>
          ));})()}
          {funis.length>0&&(
            <>
              <div style={{padding:'7px 12px',fontSize:9,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.08em',borderTop:'1px solid var(--border)',borderBottom:'1px solid var(--border)'}}>Arquivar no funil…</div>
              {c.funil_id&&(
                <button onMouseDown={e=>{e.stopPropagation();dispatch({type:'REMOVE_FUNIL',cid:c.id,user:profile?.nome||'Usuário'});setMenuOpen(false);}}
                  style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'7px 12px',background:'none',border:'none',cursor:'pointer',textAlign:'left',fontSize:12,color:'var(--danger)',fontFamily:'var(--font)',transition:'background .1s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,.04)'}
                  onMouseLeave={e=>e.currentTarget.style.background='none'}>← Remover do funil</button>
              )}
              {funis.filter(f=>f.ativo).map(f=>(
                <button key={f.id} onMouseDown={e=>{e.stopPropagation();moverFunil(f);}}
                  style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'7px 12px',background:c.funil_id===f.id?`${f.cor}10`:'none',border:'none',cursor:'pointer',textAlign:'left',fontSize:12,color:c.funil_id===f.id?f.cor:'var(--text-primary)',fontFamily:'var(--font)',transition:'background .1s'}}
                  onMouseEnter={e=>e.currentTarget.style.background=`${f.cor}08`}
                  onMouseLeave={e=>e.currentTarget.style.background=c.funil_id===f.id?`${f.cor}10`:'none'}>
                  <div style={{width:7,height:7,borderRadius:'50%',background:f.cor,flexShrink:0}}/>{f.nome}
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

// ─── KANBAN COL ──────────────────────────────────────────────────────────────
function BKOKanbanCol({s,clientes,dragId,setDragId,dispatch,onSelect,profile,session,highlight,funis,collapsed,onToggleCollapse,setMotivoModal,cpfDuplicados,podeVerInsights}){
  const [over,setOver]=useState(false);
  const sl=clientes.filter(c=>c.estagio===s.id&&!c.funil_id);
  return(
    <div style={{minWidth:collapsed?44:170,width:collapsed?44:215,flexShrink:0,background:highlight?`${s.color}08`:'rgba(0,0,0,.03)',border:`1px solid ${highlight?s.color+'40':'var(--border)'}`,borderRadius:12,padding:'10px 8px',transition:'all .22s cubic-bezier(.4,0,.2,1)',boxShadow:highlight?`0 0 0 2px ${s.color}30`:'',display:'flex',flexDirection:'column'}}
      onDragOver={e=>{e.preventDefault();setOver(true);}}
      onDragLeave={()=>setOver(false)}
      onDrop={()=>{setOver(false);if(dragId){const dragCliente=clientes.find(c=>c.id===dragId);const trava=dragCliente?checarTravaBKO(dragCliente,profile,session):{travado:false};if(trava.travado){alert(`🔒 Este cliente está travado na coluna BKO.\nResponsável: ${trava.motivo}\nSomente o responsável ou supervisores BKO podem mover.`);setDragId(null);return;}if(s.id==='perdido'){setMotivoModal({cid:dragId});}else{dispatch({type:'MOVE',cid:dragId,st:s.id,user:profile?.nome||'Usuário'});}}setDragId(null);}}>
      {collapsed?(
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,cursor:'pointer',height:'100%',justifyContent:'flex-start',paddingTop:4}} onClick={onToggleCollapse} title={`Expandir: ${s.label}`}>
          <div style={{width:7,height:7,borderRadius:'50%',background:s.color,boxShadow:`0 0 5px ${s.color}60`,marginTop:2}}/>
          <span style={{fontSize:10,fontWeight:700,background:s.bg,color:s.color,borderRadius:99,padding:'2px 6px'}}>{sl.length}</span>
          <span style={{fontSize:9,color:'var(--text-faint)',writingMode:'vertical-rl',textOrientation:'mixed',transform:'rotate(180deg)',marginTop:4,maxHeight:100,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.label}</span>
        </div>
      ):(
        <>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10,padding:'0 3px',flexShrink:0}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:s.color,boxShadow:`0 0 5px ${s.color}60`,flexShrink:0}}/>
            <span style={{fontSize:11,fontWeight:600,color:'var(--text-secondary)',flex:1}}>{s.label}</span>
            <span style={{fontSize:10,fontWeight:700,background:s.bg,color:s.color,borderRadius:99,padding:'1px 6px'}}>{sl.length}</span>
            <button onClick={onToggleCollapse} title="Recolher coluna"
              style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-faint)',fontSize:12,padding:'0 2px',lineHeight:1}}
              onMouseEnter={e=>e.currentTarget.style.color='var(--text-secondary)'}
              onMouseLeave={e=>e.currentTarget.style.color='var(--text-faint)'}>‹</button>
          </div>
          <div style={{flex:1,overflowY:'auto',minHeight:40,paddingRight:2,scrollbarWidth:'thin',scrollbarColor:'rgba(0,0,0,.1) transparent'}}>
            {sl.map(c=>(
              <KCard key={c.id} c={c} onSelect={onSelect} dispatch={dispatch} profile={profile} session={session} setDragId={setDragId} funis={funis} setMotivoModal={setMotivoModal} cpfDuplicados={cpfDuplicados} podeVerInsights={podeVerInsights}/>
            ))}
            {sl.length===0&&<div style={{textAlign:'center',padding:'16px 0',fontSize:10,color:'var(--text-faint)'}}>Solte aqui</div>}
          </div>
        </>
      )}
    </div>
  );
}

// ─── FUNIL MESES ─────────────────────────────────────────────────────────────
const MESES_FULL=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
function parseMes(funil_mes){
  if(!funil_mes) return null;
  const [ano,mes]=funil_mes.split('-');
  return{ano:parseInt(ano),mes:parseInt(mes),label:`${MESES_FULL[parseInt(mes)-1]} ${ano}`};
}
function BKOFunilMeses({funil,clientes,onSelect,dispatch,profile}){
  const [search,setSearch]=useState('');
  const clientesFunil=useMemo(()=>clientes.filter(c=>c.funil_id===funil.id&&(!search.trim()||c.nomeCliente?.toLowerCase().includes(search.toLowerCase())||c.cpfCliente?.includes(search))),[clientes,funil.id,search]);
  const grupos=useMemo(()=>{
    const map={};
    clientesFunil.forEach(c=>{const key=c.funil_mes||'sem-data';if(!map[key])map[key]=[];map[key].push(c);});
    return Object.entries(map).sort(([a],[b])=>b.localeCompare(a)).map(([key,items])=>{const p=parseMes(key);return{key,label:p?p.label:'Sem data',items};});
  },[clientesFunil]);
  if(grupos.length===0) return(
    <div style={{textAlign:'center',padding:'60px 0'}}>
      <div style={{fontSize:36,marginBottom:12}}>📦</div>
      <div style={{fontSize:14,fontWeight:600,color:'var(--text-primary)',marginBottom:6}}>Nenhum cliente em <b>{funil.nome}</b></div>
      <div style={{fontSize:12,color:'var(--text-muted)'}}>Clique em ⋯ em qualquer card do pipeline → Arquivar no funil</div>
    </div>
  );
  return(
    <div style={{display:'flex',gap:10,overflowX:'auto',paddingBottom:24,alignItems:'flex-start'}}>
      {grupos.map(({key,label,items})=>(
        <div key={key} style={{minWidth:210,width:220,flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,padding:'8px 10px',background:`${funil.cor}10`,borderRadius:10,border:`1px solid ${funil.cor}30`}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:funil.cor,boxShadow:`0 0 5px ${funil.cor}80`,flexShrink:0}}/>
            <span style={{fontSize:12,fontWeight:700,color:'var(--text-primary)',flex:1}}>{label}</span>
            <span style={{fontSize:11,fontWeight:700,padding:'1px 7px',borderRadius:99,background:`${funil.cor}15`,color:funil.cor}}>{items.length}</span>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:7}}>
            {items.map(c=>(
              <div key={c.id} onClick={()=>onSelect(c.id)}
                style={{background:'var(--bg-card)',border:`1px solid ${funil.cor}25`,borderRadius:11,padding:'11px 12px',cursor:'pointer',transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=funil.cor+'60';e.currentTarget.style.boxShadow=`0 3px 10px ${funil.cor}15`;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=funil.cor+'25';e.currentTarget.style.boxShadow='';}}>
                <div style={{fontSize:12,fontWeight:700,color:'var(--text-primary)',marginBottom:3,lineHeight:1.3}}>{c.nomeCliente}</div>
                <div style={{fontSize:10,color:'var(--text-muted)',marginBottom:c.prefeitura?3:0}}>{c.cpfCliente||'—'}</div>
                {c.prefeitura&&<div style={{fontSize:9,color:'var(--text-muted)',marginBottom:3}}>🏛 {c.prefeitura}</div>}
                {c.saldoDevedor&&<div style={{fontSize:10,fontWeight:700,color:'#10B981'}}>💰 {c.saldoDevedor}</div>}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:6,paddingTop:5,borderTop:'1px solid var(--border)'}}>
                  <span style={{fontSize:9,color:'var(--text-faint)'}}>{fmtD(c.dataEntrada)}</span>
                  <button onClick={e=>{e.stopPropagation();dispatch({type:'REMOVE_FUNIL',cid:c.id,user:profile?.nome||'Usuário'});}}
                    style={{fontSize:9,padding:'1px 6px',borderRadius:5,background:'rgba(0,0,0,.05)',border:'1px solid var(--border)',color:'var(--text-muted)',cursor:'pointer'}}
                    title="Remover do funil">← pipeline</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── PIPELINE ────────────────────────────────────────────────────────────────
function BKOPipeline({clientes,profile,session,dispatch,onSelect,filtroEstagio,setFiltroEstagio,funis,origemFiltro,setOrigemFiltro,supervisorTeam,allTeams,onConfigurar}){
  const [dragId,setDragId]=useState(null);
  const [search,setSearch]=useState('');
  const [collapsedCols,setCollapsedCols]=useState(new Set());
  const toggleCol=(id)=>setCollapsedCols(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});
  const [funilSel,setFunilSel]=useState(null);
  const [funilSearch,setFunilSearch]=useState('');
  const [funilOpen,setFunilOpen]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false);         // menu ⋯ do pipeline
  const menuRef=useRef(null);
  const [filtroDuplicados,setFiltroDuplicados]=useState(false); // C: filtro duplicados
  // ── Modal motivo de perda ──
  const [motivoModal,setMotivoModal]=useState(null); // { cid, origem: 'drag'|'menu'|'painel' }
  const funilRef=useRef(null);
  const colsRef=useRef(null);

  // ── NOVO: Pipelines CRM (bko_pipelines) ──────────────────────────────────
  const [crmPipelines,setCrmPipelines]=useState([]);
  const [pipelineAtivo,setPipelineAtivo]=useState(null); // pipeline CRM selecionado

  useEffect(()=>{
    supabase.from('bko_pipelines')
      .select('*, bko_pipeline_estagios(*)')
      .eq('ativo',true).order('ordem')
      .then(({data})=>setCrmPipelines(data||[]));
  },[]);
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(()=>{
    if(filtroEstagio&&colsRef.current){const idx=BKO_STAGES.findIndex(s=>s.id===filtroEstagio);if(idx>-1)colsRef.current.scrollLeft=idx*215;}
  },[filtroEstagio]);

  useEffect(()=>{
    if(!funilOpen) return;
    const h=(e)=>{if(funilRef.current&&!funilRef.current.contains(e.target))setFunilOpen(false);};
    document.addEventListener('mousedown',h);
    return()=>document.removeEventListener('mousedown',h);
  },[funilOpen]);

  // Fechar menu ⋯ ao clicar fora
  useEffect(()=>{
    if(!menuOpen) return;
    const h=(e)=>{if(menuRef.current&&!menuRef.current.contains(e.target))setMenuOpen(false);};
    document.addEventListener('mousedown',h);
    return()=>document.removeEventListener('mousedown',h);
  },[menuOpen]);

  const isSupervisorP=profile?.is_supervisor===true;
  const clientesVisiveis=useMemo(()=>{
    if(profile?.role==='startec'||profile?.role==='corban_bko')
      return clientes.filter(c=>c.atribuido_a_id===profile?.id||c.criado_por_id===profile?.id);
    if(profile?.role==='comercial'){
      if(isSupervisorP) return filtrarClientesSupervisor(clientes,origemFiltro,allTeams);
      if(origemFiltro) return clientes.filter(c=>c.origem===origemFiltro);
    }
    return clientes;
  },[clientes,profile,origemFiltro,supervisorTeam,isSupervisorP,allTeams]);

  const funisComContagem = useMemo(() => funis.map(f => ({...f, count:clientes.filter(c=>c.funil_id===f.id).length})), [funis, clientes]);

  const podeVerInsights = profile?.role === 'comercial' || profile?.role === 'bko';

  const cpfDuplicados = useMemo(() => {
    const counts = {};
    clientesVisiveis.forEach(c => { if (c.cpfCliente) counts[c.cpfCliente] = (counts[c.cpfCliente] || 0) + 1; });
    const dup = {};
    Object.entries(counts).forEach(([cpf, n]) => { if (n > 1) dup[cpf] = n; });
    return dup;
  }, [clientesVisiveis]);
  
  const pipelineClientes = clientesVisiveis.filter(c => !c.funil_id);

  // filteredBase ANTES de filtered
  const filteredBase = search.trim()
    ? pipelineClientes.filter(c => c.nomeCliente?.toLowerCase().includes(search.toLowerCase()) || c.cpfCliente?.includes(search))
    : pipelineClientes;

  // filtered usa filteredBase, podeVerInsights e cpfDuplicados — todos já declarados acima
  const filtered = filtroDuplicados && podeVerInsights
    ? filteredBase.filter(c => cpfDuplicados[c.cpfCliente])
    : filteredBase;

  const temDropdown = crmPipelines.length > 0 || funisComContagem.length > 0;

  // Texto do breadcrumb
  const tituloAtual = pipelineAtivo
    ? pipelineAtivo.nome
    : funilSel
      ? funilSel.nome
      : null;

  return(
    <div style={{display:'flex',flexDirection:'column',flex:1,minHeight:0,overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,gap:16,flexWrap:'wrap',padding:'16px 20px 0',flexShrink:0}}>
        <div>
          {tituloAtual
            ?<>
               <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:2,cursor:'pointer'}} onClick={()=>{setPipelineAtivo(null);setFunilSel(null);setFunilSearch('');}}>← Pipeline</div>
               <div className="section-title" style={{color:pipelineAtivo?.cor||funilSel?.cor}}>{tituloAtual}</div>
               {pipelineAtivo
                 ?<div className="section-sub">{pipelineAtivo.descricao||''}</div>
                 :<div className="section-sub">{clientes.filter(c=>c.funil_id===funilSel.id).length} clientes arquivados · agrupados por mês</div>
               }
             </>
            :<><div className="section-title">Pipeline</div>
               <div className="section-sub">{pipelineClientes.length} clientes ativos · arraste para mover</div>
             </>
          }
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          {profile?.role==='comercial'&&(
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {[['todos',null,'Todos'],['corban','corban','Corbans'],['startec','startec','Startec'],
                ...(profile?.is_supervisor?allTeams.map(t=>[t.supervisor_id,t.supervisor_id,`Eq. ${t.supervisor_nome?.split(' ')[0]}`]):[])
              ].map(([key,val,label])=>(
                <button key={key} onClick={()=>setOrigemFiltro(val)}
                  style={{padding:'4px 12px',borderRadius:99,fontSize:11,fontWeight:600,cursor:'pointer',transition:'all .15s',
                    background:origemFiltro===val?(val==='startec'||allTeams.some(t=>t.supervisor_id===val)?'#059669':val==='corban'?B_MID:'rgba(0,0,0,.08)'):'transparent',
                    color:origemFiltro===val?'#fff':'var(--text-muted)',
                    border:`1px solid ${origemFiltro===val?(val==='startec'||allTeams.some(t=>t.supervisor_id===val)?'#059669':val==='corban'?B_MID:'rgba(0,0,0,.15)'):'var(--border)'}`,
                  }}>{label}</button>
              ))}
            </div>
          )}
          {!tituloAtual&&filtroEstagio&&(
            <div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:99,background:B_LIGHT,border:`1px solid ${B_MID}30`,fontSize:11,color:B_MID,fontWeight:600}}>
              {BKO_STAGES.find(s=>s.id===filtroEstagio)?.label}
              <button onClick={()=>setFiltroEstagio(null)} style={{background:'none',border:'none',cursor:'pointer',color:B_MID,fontSize:13,lineHeight:1,padding:0}}>×</button>
            </div>
          )}
          {/* Busca — div fechado corretamente */}
          {!tituloAtual&&(
            <div style={{position:'relative',width:220}}>
              <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-faint)',fontSize:12}}>⌕</span>
              <input className="inp" style={{paddingLeft:30,height:34,fontSize:12}} placeholder="Buscar cliente…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
          )}
          {/* C: Botão filtro duplicados — irmão separado, fora do div de busca */}
          {!tituloAtual&&podeVerInsights&&Object.keys(cpfDuplicados).length>0&&(
            <button onClick={()=>setFiltroDuplicados(v=>!v)}
              style={{display:'flex',alignItems:'center',gap:5,padding:'0 12px',height:34,borderRadius:8,border:`1px solid ${filtroDuplicados?'rgba(249,115,22,.5)':'var(--border)'}`,background:filtroDuplicados?'rgba(249,115,22,.1)':'var(--bg-card)',color:filtroDuplicados?'#F97316':'var(--text-muted)',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all .15s',whiteSpace:'nowrap',fontFamily:'var(--font)'}}>
              <span style={{fontSize:13}}>⚠</span>
              {filtroDuplicados?'Todos os clientes':`${Object.keys(cpfDuplicados).length} CPF${Object.keys(cpfDuplicados).length!==1?'s':''} duplicado${Object.keys(cpfDuplicados).length!==1?'s':''}`}
            </button>
          )}
          {funilSel&&!pipelineAtivo&&(
            <div style={{position:'relative',width:220}}>
              <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-faint)',fontSize:12}}>⌕</span>
              <input className="inp" style={{paddingLeft:30,height:34,fontSize:12}} placeholder="Buscar no funil…" value={funilSearch} onChange={e=>setFunilSearch(e.target.value)}/>
            </div>
          )}

          {/* ── DROPDOWN UNIFICADO: Pipelines CRM + Funis de Arquivo ── */}
          {/* ── Botão ⋯ configurar pipeline ── */}
          {(profile?.role==='comercial'||['edson@starbank.tec.br','vera.marques@starbank.tec.br','maria.cerqueira@starbank.tec.br','elisangela.pereira@starbank.tec.br'].includes(session?.user?.email))&&(
            <div ref={menuRef} style={{position:'relative'}}>
              <button onClick={()=>setMenuOpen(v=>!v)} title="Configurar Pipeline"
                style={{display:'flex',alignItems:'center',justifyContent:'center',width:34,height:34,borderRadius:8,background:'var(--bg-card)',border:'1px solid var(--border)',cursor:'pointer',fontSize:16,color:'var(--text-muted)',transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background='var(--bg-surface)';e.currentTarget.style.color='var(--text-primary)';}}
                onMouseLeave={e=>{e.currentTarget.style.background='var(--bg-card)';e.currentTarget.style.color='var(--text-muted)';}}>⋯</button>
              {menuOpen&&(
                <div style={{position:'absolute',right:0,top:'calc(100% + 6px)',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,.12)',zIndex:200,overflow:'hidden',minWidth:195}}>
                  <button onMouseDown={()=>{setMenuOpen(false);if(typeof onConfigurar==='function')onConfigurar();}}
                    style={{display:'flex',alignItems:'center',gap:9,width:'100%',padding:'10px 14px',background:'none',border:'none',cursor:'pointer',fontSize:13,color:'var(--text-primary)',fontFamily:'var(--font)',textAlign:'left'}}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--bg-surface)'}
                    onMouseLeave={e=>e.currentTarget.style.background='none'}>
                    ⚙ Configurar Pipeline
                  </button>
                </div>
              )}
            </div>
          )}

          {temDropdown&&(
            <div ref={funilRef} style={{position:'relative'}}>
              <button onClick={()=>setFunilOpen(v=>!v)}
                style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:8,
                  border:`1px solid ${pipelineAtivo?pipelineAtivo.cor+'60':funilSel?funilSel.cor+'60':'var(--border)'}`,
                  background:pipelineAtivo?`${pipelineAtivo.cor}10`:funilSel?`${funilSel.cor}10`:'var(--bg-card)',
                  color:pipelineAtivo?pipelineAtivo.cor:funilSel?funilSel.cor:'var(--text-secondary)',
                  fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'var(--font)',whiteSpace:'nowrap'}}>
                <span style={{fontSize:13}}>⬡</span> Funis de Venda
                {pipelineAtivo&&<span style={{marginLeft:4,padding:'1px 7px',borderRadius:99,background:`${pipelineAtivo.cor}20`,fontSize:11}}>{pipelineAtivo.icone} {pipelineAtivo.nome}</span>}
                {!pipelineAtivo&&funilSel&&<span style={{marginLeft:4,padding:'1px 7px',borderRadius:99,background:`${funilSel.cor}20`,fontSize:11}}>📦 {funilSel.nome}</span>}
              </button>

              {funilOpen&&(
                <div style={{position:'absolute',right:0,top:'calc(100% + 6px)',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,boxShadow:'0 8px 28px rgba(0,0,0,.14)',zIndex:300,overflow:'hidden',minWidth:240}}>

                  {/* Botão voltar (quando algo está selecionado) */}
                  {(pipelineAtivo||funilSel)&&(
                    <button onClick={()=>{setPipelineAtivo(null);setFunilSel(null);setFunilSearch('');setFunilOpen(false);}}
                      style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'10px 14px',background:'none',border:'none',borderBottom:'1px solid var(--border)',cursor:'pointer',fontFamily:'var(--font)',fontSize:12,color:'var(--text-secondary)'}}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,.04)'}
                      onMouseLeave={e=>e.currentTarget.style.background='none'}>← Pipeline (todos)</button>
                  )}

                  {/* ── Seção: Pipelines CRM ── */}
                  {crmPipelines.length>0&&(
                    <>
                      <div style={{padding:'7px 14px 4px',fontSize:9,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.08em',
                        borderBottom:'1px solid var(--border)',background:'rgba(0,0,0,.02)'}}>
                        Pipelines CRM
                      </div>
                      {crmPipelines.filter(p=>{
                        // Verificar acesso: todos, por role ou por user_id
                        if(p.acesso_todos!==false) return true;
                        const userRole=profile?.role;
                        const userId=session?.user?.id;
                        const temRole=(p.roles_acesso||[]).includes(userRole);
                        const temUser=(p.usuarios_acesso||[]).includes(userId);
                        return temRole||temUser;
                      }).map(p=>(
                        <button key={p.id} onClick={()=>{setPipelineAtivo(p);setFunilSel(null);setFiltroEstagio(null);setFunilOpen(false);}}
                          style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'10px 14px',
                            background:pipelineAtivo?.id===p.id?`${p.cor}08`:'none',
                            border:'none',cursor:'pointer',fontFamily:'var(--font)',fontSize:12,
                            fontWeight:pipelineAtivo?.id===p.id?700:400,
                            color:pipelineAtivo?.id===p.id?p.cor:'var(--text-primary)'}}
                          onMouseEnter={e=>{if(pipelineAtivo?.id!==p.id)e.currentTarget.style.background='rgba(0,0,0,.04)';}}
                          onMouseLeave={e=>{if(pipelineAtivo?.id!==p.id)e.currentTarget.style.background='none';}}>
                          <div style={{width:8,height:8,borderRadius:'50%',background:p.cor,boxShadow:`0 0 5px ${p.cor}60`,flexShrink:0}}/>
                          <span style={{flex:1,textAlign:'left'}}>{p.icone} {p.nome}</span>
                          {pipelineAtivo?.id===p.id&&<span style={{fontSize:9,color:p.cor}}>✓ ativo</span>}
                        </button>
                      ))}
                    </>
                  )}

                  {/* ── Seção: Funis de Arquivo ── */}
                  {funisComContagem.filter(f=>f.ativo).length>0&&(
                    <>
                      <div style={{padding:'7px 14px 4px',fontSize:9,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.08em',
                        borderTop:crmPipelines.length>0?'1px solid var(--border)':'none',
                        borderBottom:'1px solid var(--border)',background:'rgba(0,0,0,.02)'}}>
                        Arquivos
                      </div>
                      {funisComContagem.filter(f=>f.ativo).map(f=>(
                        <button key={f.id} onClick={()=>{setFunilSel(f);setPipelineAtivo(null);setFunilSearch('');setFiltroEstagio(null);setFunilOpen(false);}}
                          style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'10px 14px',
                            background:funilSel?.id===f.id?`${f.cor}08`:'none',
                            border:'none',cursor:'pointer',fontFamily:'var(--font)',fontSize:12,
                            fontWeight:funilSel?.id===f.id?700:400,
                            color:funilSel?.id===f.id?f.cor:'var(--text-primary)'}}
                          onMouseEnter={e=>{if(funilSel?.id!==f.id)e.currentTarget.style.background='rgba(0,0,0,.04)';}}
                          onMouseLeave={e=>{if(funilSel?.id!==f.id)e.currentTarget.style.background='none';}}>
                          <div style={{width:8,height:8,borderRadius:'50%',background:f.cor,boxShadow:`0 0 5px ${f.cor}60`,flexShrink:0}}/>
                          <span style={{flex:1,textAlign:'left'}}>📦 {f.nome}</span>
                          <span style={{fontSize:11,fontWeight:700,padding:'1px 7px',borderRadius:99,background:`${f.cor}15`,color:f.cor}}>{f.count}</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Render condicional das 3 visões ── */}

      {/* 1. Pipeline CRM ativo → key força remount quando troca de pipeline */}
      {pipelineAtivo&&(
        <BKOPipelines key={pipelineAtivo.id} profile={profile} session={session} pipelineInicial={pipelineAtivo}/>
      )}

      {/* 2. Funil de arquivo selecionado → visão por mês (comportamento original) */}
      {!pipelineAtivo&&funilSel&&(
        <BKOFunilMeses key={funilSel.id} funil={funilSel} clientes={clientes} onSelect={onSelect} dispatch={dispatch} profile={profile}/>
      )}

      {/* 3. Kanban principal (padrão) */}
      {!pipelineAtivo&&!funilSel&&(
        <div ref={colsRef} style={{display:'flex',gap:7,overflowX:'auto',overflowY:'hidden',padding:'0 20px 16px',flex:1,minHeight:0,alignItems:'stretch',scrollbarWidth:'thin',scrollbarColor:`${BKO_STAGES[0]?.color}40 transparent`}}>
          {BKO_STAGES.map(s=>(
            <BKOKanbanCol key={s.id} s={s} clientes={filtered} dragId={dragId} setDragId={setDragId}
              dispatch={dispatch} onSelect={onSelect} profile={profile} session={session}
              highlight={filtroEstagio===s.id} funis={funisComContagem}
              collapsed={collapsedCols.has(s.id)} onToggleCollapse={()=>toggleCol(s.id)} setMotivoModal={setMotivoModal} cpfDuplicados={cpfDuplicados} podeVerInsights={podeVerInsights}/>
          ))}
        </div>
      )}

      {/* ── Modal motivo de perda ── */}
      {motivoModal&&(
        <MotivoPerdaModal
          onConfirm={(motivo,obs)=>{
            dispatch({type:'MOVE',cid:motivoModal.cid,st:'perdido',user:profile?.nome||'Usuário',motivo,obs});
            if(motivoModal.setMenuOpen) motivoModal.setMenuOpen(false);
            setMotivoModal(null);
          }}
          onCancel={()=>setMotivoModal(null)}
        />
      )}
    </div>
  );
}

// ─── CLIENTES ────────────────────────────────────────────────────────────────
function exportarExcel(dados, nomeArquivo='clientes_bko'){
  try{
    const rows = dados.map(c=>({
      'Nome': c.nomeCliente||'',
      'CPF': c.cpfCliente||'',
      'Telefone': c.telefone||'',
      'Prefeitura/Órgão': c.prefeitura||'',
      'Estágio': (()=>{const s=BKO_STAGES.find(x=>x.id===c.estagio);return s?s.label:c.estagio||'';})(),
      'Status Documento': c.documentoStatus||'',
      'Saldo Devedor': c.saldoDevedor||'',
      'Criado por': c.criado_por_nome||'',
      'Atribuído a': c.atribuido_a_nome||'',
      'Origem': c.origem||'',
      'Data de entrada': c.dataEntrada||'',
      'Criado em': c.created_at?fmtDH(c.created_at):'',
    }));
    const headers = Object.keys(rows[0]||{});
    const csvRows = [
      headers.join(';'),
      ...rows.map(r=>headers.map(h=>{
        const val = String(r[h]||'').replace(/"/g,'""');
        return `"${val}"`;
      }).join(';'))
    ];
    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nomeArquivo}_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }catch(e){
    console.error('Erro ao exportar:',e);
    alert('Erro ao exportar. Tente novamente.');
  }
}

function BKOClientes({clientes,profile,onSelect,onNew,origemFiltro,setOrigemFiltro,supervisorTeam,allTeams}){
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

  const isSupervisorC=profile?.is_supervisor===true;
  const clientesBase=useMemo(()=>{
    if(profile?.role==='startec'||profile?.role==='corban_bko')
      return clientes.filter(c=>c.atribuido_a_id===profile?.id||c.criado_por_id===profile?.id);
    if(profile?.role==='comercial'){
      if(isSupervisorC) return filtrarClientesSupervisor(clientes,origemFiltro,allTeams);
      if(origemFiltro) return clientes.filter(c=>c.origem===origemFiltro);
    }
    return clientes;
  },[clientes,profile,origemFiltro,supervisorTeam,isSupervisorC,allTeams]);

  const filtered=useMemo(()=>clientesBase.filter(c=>{
    if(estagio&&c.estagio!==estagio) return false;
    if(prefeitura&&c.prefeitura!==prefeitura) return false;
    if(criadoPor&&c.criado_por_nome!==criadoPor) return false;
    if(atribuidoA&&c.atribuido_a_nome!==atribuidoA) return false;
    if(search){const s=search.toLowerCase();if(!c.nomeCliente?.toLowerCase().includes(s)&&!c.cpfCliente?.includes(s)) return false;}
    return true;
  }),[clientesBase,search,estagio,prefeitura,criadoPor,atribuidoA]);

  const totalPages=Math.max(1,Math.ceil(filtered.length/PER));
  const paged=filtered.slice((page-1)*PER,page*PER);
  const stgStyle=(id)=>{const s=BKO_STAGES.find(x=>x.id===id);return s?{background:s.bg,color:s.color,borderRadius:99,padding:'2px 8px',fontSize:10,fontWeight:700}:{};};
  const hasFilter=search||estagio||prefeitura||criadoPor||atribuidoA;

  return(
    <div style={{padding:'28px 32px'}}>
      <div className="fu" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:16,flexWrap:'wrap',gap:10}}>
        <div><div className="section-title">Clientes</div><div className="section-sub">{filtered.length} de {clientesBase.length} registros</div></div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          {profile?.role==='comercial'&&(
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {[['todos',null,'Todos'],['corban','corban','Corbans'],['startec','startec','Startec'],
                ...(profile?.is_supervisor?allTeams.map(t=>[t.supervisor_id,t.supervisor_id,`Eq. ${t.supervisor_nome?.split(' ')[0]}`]):[])
              ].map(([key,val,label])=>(
                <button key={key} onClick={()=>setOrigemFiltro(val)}
                  style={{padding:'5px 12px',borderRadius:99,fontSize:11,fontWeight:600,cursor:'pointer',transition:'all .15s',
                    background:origemFiltro===val?(val==='startec'||allTeams.some(t=>t.supervisor_id===val)?'#059669':val==='corban'?B_MID:'rgba(0,0,0,.08)'):'transparent',
                    color:origemFiltro===val?'#fff':'var(--text-muted)',
                    border:`1px solid ${origemFiltro===val?(val==='startec'||allTeams.some(t=>t.supervisor_id===val)?'#059669':val==='corban'?B_MID:'rgba(0,0,0,.15)'):'var(--border)'}`,
                  }}>{label}</button>
              ))}
            </div>
          )}
          <button onClick={()=>exportarExcel(filtered)} title="Exportar lista atual para CSV"
            style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',background:'rgba(16,185,129,.1)',color:'#059669',border:'1px solid rgba(16,185,129,.25)',transition:'all .15s'}}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(16,185,129,.2)';}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(16,185,129,.1)';}}>
            ↓ Exportar
          </button>
          <button className="btn" style={{background:B_MID,color:'#fff',boxShadow:`0 3px 14px ${B_GLOW}`}} onClick={onNew}>+ Novo Cliente</button>
        </div>
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
                {['Nome / CPF','Prefeitura','Estágio','Documento','Saldo Devedor','Criado por','Atribuído a','Entrada','Criado em',''].map(h=>(
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
                  <td style={{padding:'11px 14px',fontSize:11,color:'var(--text-secondary)'}}>{c.created_at?fmtDH(c.created_at):'—'}</td>
                  <td style={{padding:'11px 14px',color:'var(--text-muted)',fontSize:15}}>›</td>
                </tr>
              ))}
              {paged.length===0&&<tr><td colSpan={10} style={{padding:'36px 0',textAlign:'center',color:'var(--text-muted)',fontSize:13}}>Nenhum cliente encontrado</td></tr>}
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

// ─── NOVO CLIENTE MODAL ───────────────────────────────────────────────────────
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
    // ✅ Removido alert() nativo — o aviso amarelo no modal já é suficiente
  };
  const save=()=>{
    if(!form.nomeCliente.trim()||!form.cpfCliente.trim()){alert('Nome e CPF são obrigatórios.');return;}
    // ✅ CPF duplicado: apenas avisa, não bloqueia — usuário pode cadastrar mesmo assim
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

function SupervisorSelect({value,onChange}){
  const [supervisores,setSupervisores]=useState([]);
  useEffect(()=>{
    supabase.from('profiles').select('id,nome').eq('modulo','bko').eq('is_supervisor',true).order('nome')
      .then(({data})=>setSupervisores(data||[]));
  },[]);
  return(
    <select className="sel" value={value} onChange={e=>onChange(e.target.value)}>
      <option value="">— Sem supervisor —</option>
      {supervisores.map(s=><option key={s.id} value={s.id}>{s.nome}</option>)}
    </select>
  );
}

function BKOCadastrar({profile,session,funis=[],setFunis}){
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
  const [editForm,setEditForm]=useState({nome:'',novaSenha:'',confirmarSenha:'',supervisor_id:''});
  const [editSaving,setEditSaving]=useState(false);
  const [editMsg,setEditMsg]=useState(null);
  const [form,setForm]=useState({nome:'',email:'',senha:'',role:'corban_bko',supervisor_id:''});
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState(null);
  const [confirmDelete,setConfirmDelete]=useState(null);
  const isComercial=profile?.role==='comercial';
  const SUPERVISORES_AVISOS=[
    'edson@starbank.tec.br',
    'vera.marques@starbank.tec.br',
    'maria.cerqueira@starbank.tec.br',
    'elisangela.pereira@starbank.tec.br',
  ];
  const podePublicarAvisos=isComercial||SUPERVISORES_AVISOS.includes(session?.user?.email);

  const load=useCallback(async()=>{setLoading(true);const {data}=await supabase.from('allowed_users').select('*').eq('modulo','bko').order('nome');setUsuarios(data||[]);setLoading(false);},[]);
  useEffect(()=>{load();},[load]);

  const openEdit=(u)=>{
    setEditUser(u);setEditMsg(null);
    supabase.from('profiles').select('supervisor_id').ilike('email',u.email).maybeSingle()
      .then(({data})=>setEditForm({nome:u.nome||'',novaSenha:'',confirmarSenha:'',supervisor_id:data?.supervisor_id||''}));
  };

  const saveEdit=async()=>{
    if(!editForm.nome.trim()){setEditMsg({t:'error',text:'Nome é obrigatório.'});return;}
    if(profile?.role!=='comercial'){setEditMsg({t:'error',text:'Apenas o comercial pode editar usuários.'});return;}
    const vaiAlterarSenha=!!editForm.novaSenha||!!editForm.confirmarSenha;
    if(vaiAlterarSenha){
      if(editUser?.role!=='corban_bko'){setEditMsg({t:'error',text:'A redefinição de senha é permitida apenas para usuários Corban.'});return;}
      if(editForm.novaSenha.length<8){setEditMsg({t:'error',text:'A nova senha deve ter no mínimo 8 caracteres.'});return;}
      if(editForm.novaSenha!==editForm.confirmarSenha){setEditMsg({t:'error',text:'A confirmação da senha não confere.'});return;}
    }
    setEditSaving(true);setEditMsg(null);
    const {error:e1}=await supabase.from('allowed_users').update({nome:editForm.nome.trim()}).eq('email',editUser.email);
    const {error:e2}=await supabase.from('profiles').update({nome:editForm.nome.trim()}).eq('email',editUser.email);
    let passwordError=null;
    if(vaiAlterarSenha){
      try{
        const {data:{session:s}}=await supabase.auth.getSession();
        const res=await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-bko-user-password`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${s?.access_token}`},body:JSON.stringify({email:editUser.email,newPassword:editForm.novaSenha})});
        const result=await res.json().catch(()=>({}));
        if(!res.ok||result.error){passwordError=result.error||`Erro ao redefinir senha (status ${res.status}).`;}
      }catch(e){passwordError='Erro de conexão ao redefinir senha.';}
    }
    if(editUser.role==='startec'){
      await supabase.from('profiles').update({supervisor_id:editForm.supervisor_id||null}).ilike('email',editUser.email);
    }
    setEditSaving(false);
    if(e1||e2||passwordError){setEditMsg({t:'error',text:passwordError||'Erro ao salvar. Tente novamente.'});return;}
    setEditMsg({t:'success',text:vaiAlterarSenha?'Nome e senha atualizados com sucesso!':'Nome atualizado com sucesso!'});
    load();
    setTimeout(()=>setEditUser(null),1200);
  };

  const save=async()=>{
    if(!form.nome.trim()||!form.email.trim()||!form.senha||form.senha.length<6){setMsg({t:'error',text:'Nome, e-mail e senha (mín. 6 caracteres) são obrigatórios.'});return;}
    setSaving(true);setMsg(null);
    const {data:{session:s}}=await supabase.auth.getSession();
    try{
      const res=await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-bko-user`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${s?.access_token}`},body:JSON.stringify({email:form.email.trim().toLowerCase(),password:form.senha,role:form.role,nome:form.nome.trim(),modulo:'bko'})});
      const result=await res.json();setSaving(false);
      if(!res.ok||result.error){setMsg({t:'error',text:result.error||'Erro ao criar usuário.'});}
      else{
        if(form.role==='startec'&&form.supervisor_id){
          await supabase.from('profiles').update({supervisor_id:form.supervisor_id}).ilike('email',form.email.trim().toLowerCase());
        }
        setMsg({t:'success',text:`✓ ${form.nome} criado! Já pode fazer login.`});
        setShowModal(false);
        setForm({nome:'',email:'',senha:'',role:'corban_bko',supervisor_id:''});
        load();
      }
    }catch(e){setSaving(false);setMsg({t:'error',text:'Erro de conexão.'});}
  };

  const remove=async(u)=>{
    await supabase.from('profiles').delete().ilike('email',u.email);
    await supabase.from('allowed_users').delete().eq('email',u.email);
    setConfirmDelete(null);
    setMsg({t:'success',text:`${u.nome} removido.`});
    load();
  };

  const grupos=[
    {role:'comercial',label:'Comercial'},
    {role:'corban_bko',label:'Corban'},
    {role:'bko',label:'BKO'},
    {role:'startec',label:'Startec'},
  ];

  return(
    <div style={{padding:'28px 32px'}}>
      {/* ── Avisos no topo ── */}
      {podePublicarAvisos&&<AvisosSection profile={profile} session={session}/>}

      <div className="fu" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:22}}>
        <div><div className="section-title">Cadastrar</div><div className="section-sub">Usuários do módulo BKO</div></div>
        <button className="btn" style={{background:B_MID,color:'#fff',boxShadow:`0 3px 12px ${B_GLOW}`}} onClick={()=>{setForm({nome:'',email:'',senha:'',role:'corban_bko',supervisor_id:''});setMsg(null);setShowModal(true);}}>+ Adicionar usuário</button>
      </div>
      {msg&&(
        <div className="fu" style={{display:'flex',alignItems:'center',gap:8,padding:'9px 14px',borderRadius:9,marginBottom:14,background:msg.t==='success'?'var(--success-dim)':'var(--danger-dim)',border:`1px solid ${msg.t==='success'?'rgba(61,155,107,.2)':'rgba(192,65,58,.2)'}`,fontSize:13,color:msg.t==='success'?'var(--success)':'var(--danger)'}}>
          {msg.t==='success'?'✓':'⚠'} {msg.text}
          <button onClick={()=>setMsg(null)} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'inherit',fontSize:15}}>×</button>
        </div>
      )}
      {loading?<div style={{textAlign:'center',padding:'40px 0',fontSize:13,color:'var(--text-muted)'}}>Carregando…</div>:(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:18,marginBottom:18}}>
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
                    {isComercial&&<button onClick={()=>openEdit(u)} title="Editar" style={{padding:'3px 8px',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer',background:B_LIGHT,color:B_MID,border:'none',marginRight:4}}>✎</button>}
                    {isComercial&&<button onClick={()=>setConfirmDelete(u)} style={{padding:'3px 8px',borderRadius:6,fontSize:10,fontWeight:600,cursor:'pointer',background:'var(--danger-dim)',color:'var(--danger)',border:'none'}}>✕</button>}
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
            {editUser.role==='startec'&&(
              <div style={{marginBottom:12}}>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Supervisor</label>
                <SupervisorSelect value={editForm.supervisor_id||''} onChange={v=>setEditForm(f=>({...f,supervisor_id:v}))}/>
                <div style={{fontSize:10,color:'var(--text-faint)',marginTop:4}}>Define em qual equipe este operador aparece.</div>
              </div>
            )}
            {editUser.role==='corban_bko'&&(
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
      {showModal&&(
        <div className="mbk" onClick={e=>{if(e.target===e.currentTarget){setShowModal(false);setMsg(null);}}}>
          <div className="mbox" style={{maxWidth:420}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div><div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:600,color:'var(--text-primary)'}}>Novo usuário BKO</div><div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>Acesso imediato após criação</div></div>
              <button onClick={()=>{setShowModal(false);setMsg(null);}} style={{background:'rgba(0,0,0,.06)',border:'1px solid var(--border)',borderRadius:8,cursor:'pointer',width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>×</button>
            </div>
            {msg?.t==='error'&&<div style={{padding:'8px 12px',borderRadius:7,marginBottom:12,background:'var(--danger-dim)',border:'1px solid rgba(192,65,58,.2)',fontSize:11,color:'var(--danger)'}}>{msg.text}</div>}
            <div style={{marginBottom:10}}>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Papel</label>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {[['corban_bko','Corban'],['bko','BKO'],['startec','Startec']].map(([v,l])=>(
                  <button key={v} onClick={()=>setForm(f=>({...f,role:v,supervisor_id:''}))}
                    style={{flex:1,minWidth:80,padding:'8px 0',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',background:form.role===v?ROLE_COLORS[v]:'rgba(0,0,0,.05)',color:form.role===v?'#fff':'var(--text-secondary)',border:form.role===v?'none':'1px solid var(--border)',transition:'all .15s'}}>{l}</button>
                ))}
              </div>
            </div>
            {form.role==='startec'&&(
              <div style={{marginBottom:10}}>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Supervisor</label>
                <SupervisorSelect value={form.supervisor_id||''} onChange={v=>setForm(f=>({...f,supervisor_id:v}))}/>
              </div>
            )}
            <div style={{marginBottom:10}}><label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Nome completo</label><input className="inp" value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Nome"/></div>
            <div style={{marginBottom:10}}><label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>E-mail</label><input className="inp" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@empresa.com"/></div>
            <div style={{marginBottom:18}}><label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Senha inicial</label><input className="inp" type="password" value={form.senha} onChange={e=>setForm(f=>({...f,senha:e.target.value}))} placeholder="Mínimo 6 caracteres"/></div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="btn btn-ghost" onClick={()=>{setShowModal(false);setMsg(null);}}>Cancelar</button>
              <button className="btn" style={{background:B_MID,color:'#fff'}} onClick={save} disabled={saving}>{saving?'Criando…':'Criar usuário'}</button>
            </div>
          </div>
        </div>
      )}
      {confirmDelete&&(
        <div className="mbk" onClick={e=>{if(e.target===e.currentTarget)setConfirmDelete(null);}}>
          <div className="mbox" style={{maxWidth:360,textAlign:'center'}}>
            <div style={{fontSize:32,marginBottom:10}}>⚠️</div>
            <div style={{fontFamily:'var(--font-display)',fontSize:17,fontWeight:600,marginBottom:8}}>Remover {confirmDelete.nome}?</div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:20}}>O acesso será revogado imediatamente.</div>
            <div style={{display:'flex',gap:8,justifyContent:'center'}}>
              <button className="btn btn-ghost" onClick={()=>setConfirmDelete(null)}>Cancelar</button>
              <button className="btn" style={{background:'var(--danger)',color:'#fff'}} onClick={()=>remove(confirmDelete)}>Remover</button>
            </div>
          </div>
        </div>
      )}
       {/* Avisos movidos para o topo do BKOCadastrar */}

      {isComercial&&(
        <div style={{marginTop:32,paddingTop:28,borderTop:'1px solid var(--border)'}}>
          <div style={{marginBottom:18}}>
            <div className="section-title" style={{fontSize:16}}>Funis de arquivo</div>
            <div className="section-sub">Configure os funis para organizar clientes integrados, perdidos e outros</div>
          </div>
          {funilMsg&&<div style={{padding:'8px 12px',borderRadius:8,marginBottom:14,background:funilMsg.t==='success'?'var(--success-dim)':'var(--danger-dim)',border:`1px solid ${funilMsg.t==='success'?'rgba(61,155,107,.2)':'rgba(192,65,58,.2)'}`,fontSize:12,color:funilMsg.t==='success'?'var(--success)':'var(--danger)'}}>{funilMsg.text}</div>}
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
                      style={{width:20,height:20,borderRadius:'50%',background:c,cursor:'pointer',border:funilForm.cor===c?'2px solid var(--text-primary)':'2px solid transparent',transition:'all .15s'}}/>
                  ))}
                </div>
              </div>
              <button className="btn" style={{background:B_MID,color:'#fff',height:36}} onClick={salvarFunil} disabled={funilSaving}>{funilSaving?'Salvando…':'+ Criar funil'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BKOAuditoria(){
  const [logs,setLogs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState('');
  const [page,setPage]=useState(1);
  const PER=50;
  useEffect(()=>{
    supabase.from('bko_audit_log').select('*').order('created_at',{ascending:false}).limit(500).then(({data})=>{setLogs(data||[]);setLoading(false);});
    const ch=supabase.channel('bko_audit_rt').on('postgres_changes',{event:'INSERT',schema:'public',table:'bko_audit_log'},p=>setLogs(prev=>[p.new,...prev])).subscribe();
    return()=>supabase.removeChannel(ch);
  },[]);
  const filtered=useMemo(()=>{if(!search) return logs;const s=search.toLowerCase();return logs.filter(l=>l.user_nome?.toLowerCase().includes(s)||l.cliente_nome?.toLowerCase().includes(s)||l.action?.toLowerCase().includes(s));},[logs,search]);
  const total=Math.max(1,Math.ceil(filtered.length/PER));
  const paged=filtered.slice((page-1)*PER,page*PER);
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
              <thead><tr style={{background:'rgba(0,0,0,.03)',borderBottom:'1px solid var(--border)'}}>
                {['Data/hora','Usuário','Papel','Ação','Cliente','Detalhes'].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:9,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.08em',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr></thead>
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
      {total>1&&(
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
          <button className="btn btn-ghost" style={{padding:'5px 10px',fontSize:12}} onClick={()=>setPage(1)} disabled={page===1}>«</button>
          <button className="btn btn-ghost" style={{padding:'5px 10px',fontSize:12}} onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>‹</button>
          <span style={{fontSize:12,color:'var(--text-muted)',padding:'0 8px'}}>Pág {page}/{total}</span>
          <button className="btn btn-ghost" style={{padding:'5px 10px',fontSize:12}} onClick={()=>setPage(p=>Math.min(total,p+1))} disabled={page===total}>›</button>
          <button className="btn btn-ghost" style={{padding:'5px 10px',fontSize:12}} onClick={()=>setPage(total)} disabled={page===total}>»</button>
        </div>
      )}
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export function BKOApp({profile,session,signOut,onAlterarSenha,userModules,onSwitchModule}){
  const [s,dispatch]=useReducer(R,INIT);
  const {clientes,view,sel,newOpen}=s;
  const [ready,setReady]=useState(false);
  const [funis,setFunis]=useState([]);
  const [searchOpen,setSearchOpen]=useState(false);
  const [sidebarCollapsed,setSidebarCollapsed]=useState(()=>{
    try{return localStorage.getItem('bko_sidebar_collapsed')==='1';}catch{return false;}
  });
  const toggleSidebar=useCallback(v=>{
    setSidebarCollapsed(prev=>{
      const next=typeof v==='boolean'?v:!prev;
      try{localStorage.setItem('bko_sidebar_collapsed',next?'1':'0');}catch{}
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
  const [avisoAtual,setAvisoAtual]=useState(null);
  const [viewConfigurar,setViewConfigurar]=useState(false); // aviso popup
  const [origemFiltro,setOrigemFiltro]=useState(null);
  const [supervisorTeam,setSupervisorTeam]=useState([]);
  const setView=useCallback(v=>{
    dispatch({type:'VIEW',v});
    if(v==='pipeline'||v==='gestao_corban') toggleSidebar(true);
    else toggleSidebar(false);
  },[toggleSidebar]);
  const selected=clientes.find(c=>c.id===sel);

  useEffect(()=>{
    const h=e=>{if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();setSearchOpen(v=>!v);}};
    window.addEventListener('keydown',h);
    return()=>window.removeEventListener('keydown',h);
  },[]);

  const [allTeams,setAllTeams]=useState([]);
  useEffect(()=>{
    if(!profile?.is_supervisor) return;
    Promise.all([
      supabase.from('profiles').select('id,nome,supervisor_id').eq('modulo','bko').eq('role','startec'),
      supabase.from('profiles').select('id,nome').eq('modulo','bko').eq('is_supervisor',true),
    ]).then(([{data:ops},{data:sups}])=>{
      const teams=(sups||[]).map(s=>({
        supervisor_id:s.id,supervisor_nome:s.nome,
        operadores:(ops||[]).filter(o=>o.supervisor_id===s.id).map(o=>o.id),
      }));
      setAllTeams(teams);
      const myTeam=teams.find(t=>t.supervisor_id===profile.id);
      setSupervisorTeam(myTeam?.operadores||[]);
    });
  },[profile?.id,profile?.is_supervisor]);

  useEffect(()=>{
    supabase.from('bko_funis').select('*').eq('ativo',true).order('ordem').then(({data})=>setFunis(data||[]));
    const ch=supabase.channel('bko_funis_rt').on('postgres_changes',{event:'*',schema:'public',table:'bko_funis'},()=>{
      supabase.from('bko_funis').select('*').eq('ativo',true).order('ordem').then(({data})=>setFunis(data||[]));
    }).subscribe();
    return()=>supabase.removeChannel(ch);
  },[]);

  // ── Avisos: buscar pendentes + realtime ──
  useEffect(()=>{
    if(!session||!profile) return;
    const userId=session.user.id;
    const role=profile?.role;

    const carregarAvisos=async()=>{
      const {data}=await supabase.from('bko_avisos')
        .select('*')
        .eq('ativo',true)
        .or(`destinatario.eq.todos,destinatario.eq.${role},destinatario.eq.${userId}`)
        .order('created_at',{ascending:false})
        .limit(1);
      if(!data||data.length===0) return;
      const aviso=data[0];
      // Verificar se já foi visto
      const {data:visto}=await supabase.from('bko_avisos_vistos')
        .select('aviso_id').eq('aviso_id',aviso.id).eq('user_id',userId).maybeSingle();
      if(!visto) setAvisoAtual(aviso);
    };
    carregarAvisos();

    // Realtime — novo aviso publicado
    const ch=supabase.channel('bko_avisos_rt')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'bko_avisos'},async payload=>{
        const aviso=payload.new;
        const dest=aviso.destinatario;
        if(dest==='todos'||dest===role||dest===userId){
          setAvisoAtual(aviso);
        }
      }).subscribe();
    return()=>supabase.removeChannel(ch);
  },[session,profile?.role]);

  const fecharAviso=async()=>{
    if(!avisoAtual) return;
    // upsert evita erro de conflito se já existir o registro
    await supabase.from('bko_avisos_vistos').upsert(
      {aviso_id:avisoAtual.id, user_id:session.user.id},
      {onConflict:'aviso_id,user_id', ignoreDuplicates:true}
    );
    setAvisoAtual(null);
  };

  useEffect(()=>{
    if(!session) return;
    supabase.from('bko_clientes').select('*').order('created_at',{ascending:false}).limit(500)
      .then(({data,error})=>{
        if(error){console.error('BKO load error:',error);setReady(true);return;}
        const loaded=(data||[]).map(r=>({...r.data,id:r.id,estagio:r.estagio,criado_por_id:r.criado_por_id,criado_por_nome:r.criado_por_nome,criado_por_role:r.criado_por_role,atribuido_a_id:r.atribuido_a_id||null,atribuido_a_nome:r.atribuido_a_nome||null,responsavel_bko_id:r.responsavel_bko_id||null,responsavel_bko_nome:r.responsavel_bko_nome||null,origem:r.origem||null,created_at:r.created_at||null}));
        dispatch({type:'SET_C',clientes:loaded});clientesRef.current=loaded;setReady(true);
      });
    const ch=supabase.channel('bko_clientes_rt')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'bko_clientes'},payload=>{
        const r=payload.new;
        dispatch({type:'RT_ADD',c:{...r.data,id:r.id,estagio:r.estagio,criado_por_id:r.criado_por_id,criado_por_nome:r.criado_por_nome,criado_por_role:r.criado_por_role,atribuido_a_id:r.atribuido_a_id||null,atribuido_a_nome:r.atribuido_a_nome||null,responsavel_bko_id:r.responsavel_bko_id||null,responsavel_bko_nome:r.responsavel_bko_nome||null,origem:r.origem||null,created_at:r.created_at||null}});
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'bko_clientes'},payload=>{
        const r=payload.new;
        dispatch({type:'UPD',c:{...r.data,id:r.id,estagio:r.estagio,criado_por_id:r.criado_por_id,criado_por_nome:r.criado_por_nome,criado_por_role:r.criado_por_role,atribuido_a_id:r.atribuido_a_id||null,atribuido_a_nome:r.atribuido_a_nome||null,responsavel_bko_id:r.responsavel_bko_id||null,responsavel_bko_nome:r.responsavel_bko_nome||null,origem:r.origem||null,created_at:r.created_at||null}});
      })
      .subscribe();
    return()=>supabase.removeChannel(ch);
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
        const {error}=await supabase.from('bko_clientes').upsert({id,data:{...data,id},estagio:estagio||'clientes_novos',criado_por_id:criado_por_id||session.user.id,criado_por_nome:criado_por_nome||profile?.nome,criado_por_role:criado_por_role||profile?.role,atribuido_a_id:atribuido_a_id||null,atribuido_a_nome:atribuido_a_nome||null},{onConflict:'id'});
        if(error) console.error('BKO sync error:',id,error.message);
      }));
    },600);
  },[clientes,ready,session]);

  const auditedDispatch=useCallback(async(action)=>{
    if(action.type==='ADD'&&(profile?.role==='startec'||profile?.role==='corban_bko')){
      action={...action,c:{...action.c,atribuido_a_id:session?.user?.id,atribuido_a_nome:profile?.nome}};
    }
    dispatch(action);
    if(!session||!profile) return;
    if(action.type==='ADD'){
      const c=action.c;
      const autoAtrib=(profile.role==='startec'||profile.role==='corban_bko');
      const origemCliente=profile.role==='startec'?'startec':profile.role==='corban_bko'?'corban':'interno';
      const {error}=await supabase.from('bko_clientes').insert({
        id:c.id,data:{...c},estagio:c.estagio||'clientes_novos',
        criado_por_id:session.user.id,criado_por_nome:profile.nome,criado_por_role:profile.role,
        atribuido_a_id:autoAtrib?session.user.id:null,
        atribuido_a_nome:autoAtrib?profile.nome:null,
        origem:origemCliente,
      });
      if(error){console.error('BKO ADD error:',error);alert(`Erro: ${error.message}`);}
    }
    const auditMap={
      MOVE:        ()=>({action:'Moveu cliente',       details:`→ "${BKO_STAGES.find(s=>s.id===action.st)?.label}"`,   clienteId:action.cid}),
      MOVE_FUNIL:  ()=>({action:'Arquivou no funil',   details:`→ "${action.funil_nome}" · ${action.funil_mes_label}`, clienteId:action.cid}),
      REMOVE_FUNIL:()=>({action:'Removeu do funil',    details:'Retornou ao pipeline',                                  clienteId:action.cid}),
      UPD:         ()=>({action:'Editou cliente',      details:'Campos atualizados',                                    clienteId:action.c?.id}),
      ADD:         ()=>({action:'Cadastrou cliente',   details:`Nome: ${action.c?.nomeCliente}`,                       clienteId:action.c?.id}),
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
      <div style={{display:'flex',height:'100vh',overflow:'hidden',background:'var(--bg-base)',fontFamily:'var(--font)'}}>
        <BKOSidebar
          view={view}
          setView={v=>{setView(v);if(v!=='pipeline')setFiltroEstagio(null);}}
          profile={profile}
          onLogout={signOut}
          onAlterarSenha={()=>setShowAS(true)}
          onSearch={()=>setSearchOpen(true)}
          collapsed={sidebarCollapsed}
          setCollapsed={toggleSidebar}
          userModules={userModules}
          onSwitchModule={onSwitchModule}
          session={session}
        />
        <main style={{flex:1,minWidth:0,height:'100%',display:'flex',flexDirection:'column',overflow:view==='pipeline'?'hidden':'auto',paddingRight:selected?490:0,transition:'padding-right .3s cubic-bezier(.4,0,.2,1)'}}>
          {view==='dashboard' && <BKODashboard clientes={clientes} setView={v=>{setView(v);}} setFiltroEstagio={setFiltroEstagio} profile={profile} origemFiltro={origemFiltro} setOrigemFiltro={setOrigemFiltro} supervisorTeam={supervisorTeam} allTeams={allTeams}/>}
          {view==='pipeline'  && !viewConfigurar && <BKOPipeline  clientes={clientes} profile={profile} session={session} dispatch={auditedDispatch} onSelect={id=>dispatch({type:'SEL',id})} filtroEstagio={filtroEstagio} setFiltroEstagio={setFiltroEstagio} funis={funis} origemFiltro={origemFiltro} setOrigemFiltro={setOrigemFiltro} supervisorTeam={supervisorTeam} allTeams={allTeams} onConfigurar={()=>setViewConfigurar(true)}/> }
          {view==='pipeline' && viewConfigurar && <BKOConfigurarPipeline profile={profile} session={session} funis={funis} setFunis={setFunis} onVoltar={()=>setViewConfigurar(false)}/>}
          {view==='clientes'  && <BKOClientes  clientes={clientes} profile={profile} onSelect={id=>dispatch({type:'SEL',id})} onNew={()=>dispatch({type:'TNEW'})} origemFiltro={origemFiltro} setOrigemFiltro={setOrigemFiltro} supervisorTeam={supervisorTeam} allTeams={allTeams}/>}
          {view==='cadastrar' && <BKOCadastrar profile={profile} session={session} funis={funis} setFunis={setFunis}/>}
          {view==='auditoria' && <BKOAuditoria/>}
          {view==='gestao_corban' && <BKOGestaoCorbans profile={profile}/>}
        </main>
        {selected&&<BKODetail key={selected.id} cliente={selected} profile={profile} session={session} dispatch={auditedDispatch} onClose={()=>dispatch({type:'CLOSE'})}/>}
        {newOpen&&<NovoClienteModal profile={profile} dispatch={auditedDispatch} clientes={clientes} onClose={()=>dispatch({type:'TNEW'})}/>}
      </div>
      {showAS&&<AlterarSenha onClose={()=>setShowAS(false)}/>}
      {avisoAtual&&<AvisoPopup aviso={avisoAtual} onFechar={fecharAviso}/>}
      <BKOSearch
        clientes={clientes}
        open={searchOpen}
        onClose={()=>setSearchOpen(false)}
        onSelect={id=>{dispatch({type:'SEL',id});setSearchOpen(false);}}
      />
    </>
  );
}// ─── AVISOS SECTION (componente para BKOCadastrar) ───────────────────────────
function AvisosSection({ profile, session }) {
  const [titulo,    setTitulo]    = useState('Aviso');
  const [mensagem,  setMensagem]  = useState('');
  const [destGrupo, setDestGrupo] = useState('todos');
  const [destPessoa,setDestPessoa]= useState('');
  const [pessoas,   setPessoas]   = useState([]);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState(null);
  const [avisos,    setAvisos]    = useState([]);

  useEffect(()=>{
    supabase.from('bko_avisos').select('*').eq('ativo',true).order('created_at',{ascending:false}).limit(20)
      .then(({data})=>setAvisos(data||[]));
  },[]);

  // Busca pessoas do grupo selecionado
  useEffect(()=>{
    const grupos=['corban_bko','bko','startec'];
    if(!grupos.includes(destGrupo)){ setPessoas([]); setDestPessoa(''); return; }
    supabase.from('profiles').select('id,nome,email').eq('modulo','bko').eq('role',destGrupo).order('nome')
      .then(({data})=>{ setPessoas(data||[]); setDestPessoa(''); });
  },[destGrupo]);

  const destinatarioFinal = destPessoa || destGrupo;

  const publicar = async () => {
    if (!mensagem.trim()) { setMsg({t:'error',text:'A mensagem não pode estar vazia.'}); return; }
    setSaving(true); setMsg(null);
    const {data,error} = await supabase.from('bko_avisos').insert({
      titulo:     titulo.trim()||'Aviso',
      mensagem:   mensagem.trim(),
      destinatario: destinatarioFinal,
      criado_por_id:   session?.user?.id,
      criado_por_nome: profile?.nome||'Comercial',
    }).select().single();
    setSaving(false);
    if (error) { setMsg({t:'error',text:error.message}); return; }
    setAvisos(prev=>[data,...prev]);
    setMensagem(''); setTitulo('Aviso'); setDestGrupo('todos'); setDestPessoa('');
    setMsg({t:'success',text:'Aviso publicado! Os destinatários verão o pop-up em tempo real.'});
    setTimeout(()=>setMsg(null),4000);
  };

  const desativar = async (id) => {
    await supabase.from('bko_avisos').update({ativo:false}).eq('id',id);
    setAvisos(prev=>prev.filter(a=>a.id!==id));
  };

  const DEST_LABELS = {todos:'Todos',corban_bko:'Corban',bko:'BKO',startec:'Startec'};

  return (
    <div style={{marginBottom:32,paddingBottom:32,borderBottom:'1px solid var(--border)'}}>
      <div style={{marginBottom:18}}>
        <div className="section-title" style={{fontSize:16}}>Avisos</div>
        <div className="section-sub">Publique um aviso — aparece como pop-up para os destinatários em tempo real</div>
      </div>

      {msg&&(
        <div style={{padding:'9px 14px',borderRadius:9,marginBottom:14,background:msg.t==='success'?'var(--success-dim)':'var(--danger-dim)',border:`1px solid ${msg.t==='success'?'rgba(61,155,107,.2)':'rgba(192,65,58,.2)'}`,fontSize:12,color:msg.t==='success'?'var(--success)':'var(--danger)'}}>
          {msg.text}
        </div>
      )}

      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,padding:'18px 20px',marginBottom:16}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
          <div>
            <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Título</label>
            <input className="inp" value={titulo} onChange={e=>setTitulo(e.target.value)} placeholder="Ex: Atualização importante"/>
          </div>
          <div>
            <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Destinatário</label>
            <select className="sel" value={destGrupo} onChange={e=>setDestGrupo(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="corban_bko">Corban — selecionar pessoa</option>
              <option value="bko">BKO — selecionar pessoa</option>
              <option value="startec">Startec — selecionar pessoa</option>
            </select>
          </div>
        </div>

        {/* Select de pessoa específica */}
        {pessoas.length>0&&(
          <div style={{marginBottom:12,padding:'12px 14px',background:'rgba(59,91,219,.04)',borderRadius:8,border:'1px solid rgba(59,91,219,.12)'}}>
            <label style={{display:'block',fontSize:10,fontWeight:700,color:'#3B5BDB',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>
              Pessoa específica
              <span style={{fontWeight:400,color:'var(--text-muted)',textTransform:'none',letterSpacing:0,marginLeft:6}}>
                (ou deixe para enviar para todo o grupo)
              </span>
            </label>
            <select className="sel" value={destPessoa} onChange={e=>setDestPessoa(e.target.value)}>
              <option value="">— Todos do grupo ({pessoas.length} {DEST_LABELS[destGrupo]}) —</option>
              {pessoas.map(p=>(
                <option key={p.id} value={p.id}>{p.nome} · {p.email}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{marginBottom:14}}>
          <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Mensagem *</label>
          <textarea className="inp" value={mensagem} onChange={e=>setMensagem(e.target.value)}
            placeholder="Digite a mensagem do aviso…"
            style={{resize:'vertical',minHeight:80,lineHeight:1.6}}/>
        </div>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontSize:11,color:'var(--text-muted)'}}>
            Enviando para:{' '}
            <strong style={{color:'var(--text-primary)'}}>
              {destPessoa
                ? (pessoas.find(p=>p.id===destPessoa)?.nome||'Pessoa específica')
                : destGrupo==='todos'
                  ? 'Todos os usuários'
                  : `Todos os ${DEST_LABELS[destGrupo]||destGrupo} (${pessoas.length})`
              }
            </strong>
          </div>
          <button className="btn" style={{background:'#3B5BDB',color:'#fff',boxShadow:'0 3px 12px rgba(59,91,219,.28)'}} onClick={publicar} disabled={saving}>
            {saving?'Publicando…':'📢 Publicar aviso'}
          </button>
        </div>
      </div>

      {/* Avisos ativos */}
      {avisos.length>0&&(
        <div>
          <div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:10}}>Avisos ativos</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {avisos.map(a=>(
              <div key={a.id} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'12px 16px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10}}>
                <span style={{fontSize:16,flexShrink:0}}>📢</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:600,color:'var(--text-primary)'}}>{a.titulo}</span>
                    <span style={{fontSize:10,padding:'1px 7px',borderRadius:99,background:'rgba(59,91,219,.1)',color:'#3B5BDB',fontWeight:700}}>
                      {DEST_LABELS[a.destinatario]||'Pessoa específica'}
                    </span>
                  </div>
                  <div style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.5,marginBottom:4}}>{a.mensagem}</div>
                  <div style={{fontSize:10,color:'var(--text-faint)'}}>
                    {new Date(a.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})}
                  </div>
                </div>
                <button onClick={()=>desativar(a.id)} style={{padding:'4px 10px',borderRadius:6,background:'var(--danger-dim)',color:'var(--danger)',border:'none',fontSize:11,fontWeight:600,cursor:'pointer',flexShrink:0}}>Desativar</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ─── AVISO POPUP ─────────────────────────────────────────────────────────────
function AvisoPopup({ aviso, onFechar }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:20 }}>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, padding:'32px 32px 28px', width:'100%', maxWidth:460, boxShadow:'0 24px 64px rgba(0,0,0,.25)', animation:'slideUp .3s ease' }}>
        {/* Topo */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:20 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:'rgba(59,91,219,.12)', border:'1px solid rgba(59,91,219,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>📢</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--font-display)', marginBottom:3 }}>{aviso.titulo}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>
              De: <strong>{aviso.criado_por_nome}</strong> · {new Date(aviso.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})}
            </div>
          </div>
        </div>

        {/* Mensagem */}
        <div style={{ background:'rgba(59,91,219,.05)', border:'1px solid rgba(59,91,219,.1)', borderRadius:10, padding:'14px 16px', fontSize:14, color:'var(--text-primary)', lineHeight:1.65, marginBottom:24, whiteSpace:'pre-wrap' }}>
          {aviso.mensagem}
        </div>

        {/* Botão */}
        <button onClick={onFechar}
          style={{ width:'100%', padding:'11px 0', borderRadius:10, background:'#3B5BDB', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'var(--font)', letterSpacing:'-.01em', boxShadow:'0 4px 14px rgba(59,91,219,.3)', transition:'all .15s' }}
          onMouseEnter={e=>e.currentTarget.style.background='#2f4cbf'}
          onMouseLeave={e=>e.currentTarget.style.background='#3B5BDB'}>
          Entendi ✓
        </button>
      </div>
    </div>
  );
}