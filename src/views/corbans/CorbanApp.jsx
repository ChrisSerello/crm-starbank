import { useState, useEffect, useReducer, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../../supabase';
import { gid, TODAY, fmtD, sinceD, stg } from '../../utils';
import { STAGES, PRODUCTS, DOC_STATUS, INDICATION_TYPES, OPERATORS, OPERADORES_REPASSADOS } from '../../constants';
import { Avatar, StageTag, AlertDot } from '../../components/shared';
import { AlterarSenha } from '../../components/AlterarSenha';

// ── CORBAN CONSTANTS ──────────────────────────────────────────────────────────
const G_DARK  = '#1A3D2B';
const G_MID   = '#2D8653';
const G_LIGHT = 'rgba(45,134,83,0.12)';
const G_GLOW  = 'rgba(45,134,83,0.35)';
const G_TEXT  = '#52B788';

const ROLE_LABELS = {
  master: 'Corban Master',
  promotora_principal: 'Promotora Principal',
  promotora: 'Promotora',
  digitalizador: 'Digitalizador',
};
const ROLE_COLORS = {
  master: '#C4720A',
  promotora_principal: '#2D8653',
  promotora: '#1A9E8A',
  digitalizador: '#5B4FE8',
};

const blankCliente = () => ({
  nomeCliente:'', cpfCliente:'', telefone:'', nomeQuemIndicou:'',
  orgaoPrefeitura:'', produtosInteresse:[], documentoStatus:'Não solicitado',
  statusComercial:'distribuido', observacoes:'', perfilCliente:'',
  secretariaAtuacao:'', dataEntrada:TODAY, ultimoContato:TODAY,
  resultado:'Em andamento', activities:[], statusIndicacao:'indicacao_com_nome',
});

// ── REDUCER ───────────────────────────────────────────────────────────────────
const INIT = { clientes:[], view:'dashboard', sel:null, newOpen:false, filters:{search:'',stage:'',produto:''} };

function R(s,{type:t,...a}){
  switch(t){
    case'SET_C':  return{...s,clientes:a.clientes};
    case'VIEW':   return{...s,view:a.v,sel:null};
    case'SEL':    return{...s,sel:a.id};
    case'CLOSE':  return{...s,sel:null};
    case'TNEW':   return{...s,newOpen:!s.newOpen};
    case'FILT':   return{...s,filters:{...s.filters,[a.k]:a.v}};
    case'MOVE':   return{...s,clientes:s.clientes.map(c=>c.id!==a.cid?c:{...c,statusComercial:a.st,activities:[...(c.activities||[]),{id:gid(),type:'stage_change',date:TODAY,user:a.user,text:`Movido para "${stg(a.st).label}"`}]})};
    case'NOTE':   return{...s,clientes:s.clientes.map(c=>c.id!==a.cid?c:{...c,ultimoContato:TODAY,activities:[...(c.activities||[]),a.act]})};
    case'UPD':    return{...s,clientes:s.clientes.map(c=>c.id!==a.c.id?c:{...c,...a.c})};
    case'ADD':    return{...s,newOpen:false,clientes:[{...a.c,activities:[{id:gid(),type:'stage_change',date:TODAY,user:a.user,text:'Cliente cadastrado'}]},...s.clientes]};
    default:      return s;
  }
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
function CorbanSidebar({view,setView,profile,onLogout,onAlterarSenha}){
  const r=profile?.role;
  const items=[
    {id:'dashboard',icon:'◈',label:'Dashboard'},
    {id:'clientes', icon:'≡',label:r==='digitalizador'?'Meus Clientes':'Clientes'},
    ...(r!=='digitalizador'?[{id:'estrutura',icon:'⎇',label:'Estrutura'}]:[]),
    ...(r==='master'?[{id:'auditoria',icon:'🔍',label:'Auditoria'}]:[]),
  ];
  return(
    <div style={{width:228,background:G_DARK,borderRight:'1px solid rgba(45,134,83,0.25)',display:'flex',flexDirection:'column',flexShrink:0,height:'100vh',position:'sticky',top:0}}>
      <div style={{padding:'20px 18px 16px',borderBottom:'1px solid rgba(45,134,83,0.2)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:34,height:34,borderRadius:10,background:`linear-gradient(135deg,${G_MID} 0%,#52B788 100%)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,boxShadow:`0 4px 14px ${G_GLOW}`}}>◈</div>
          <div>
            <div style={{fontFamily:'var(--font-display)',fontSize:15,fontWeight:600,color:'#FFF'}}>StarNexus</div>
            <div style={{fontSize:10,fontWeight:700,color:G_TEXT,letterSpacing:'.09em',textTransform:'uppercase'}}>Corbans</div>
          </div>
        </div>
      </div>
      <nav style={{padding:'10px 8px',flex:1}}>
        <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'.09em',padding:'10px 8px 6px'}}>Menu</div>
        {items.map(it=>(
          <button key={it.id} onClick={()=>setView(it.id)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 13px',borderRadius:8,fontSize:13.5,fontWeight:view===it.id?600:400,cursor:'pointer',border:'none',width:'100%',textAlign:'left',transition:'all .15s',position:'relative',background:view===it.id?G_LIGHT:'transparent',color:view===it.id?G_TEXT:'rgba(255,255,255,0.55)',fontFamily:'var(--font)'}}>
            {view===it.id&&<div style={{position:'absolute',left:0,top:'18%',bottom:'18%',width:3,background:G_MID,borderRadius:'0 3px 3px 0'}}/>}
            <span style={{fontSize:15,width:20,textAlign:'center'}}>{it.icon}</span>{it.label}
          </button>
        ))}
      </nav>
      <div style={{padding:'13px 15px',borderTop:'1px solid rgba(45,134,83,0.2)'}}>
        <div style={{display:'flex',alignItems:'center',gap:9}}>
          <Avatar name={profile?.nome||'U'} size={30} color={ROLE_COLORS[r]||G_MID}/>
          <div style={{minWidth:0}}>
            <div style={{fontSize:12,fontWeight:600,color:'#FFF',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.nome||'Usuário'}</div>
            <div style={{fontSize:10,fontWeight:700,color:G_TEXT,textTransform:'uppercase',letterSpacing:'.06em'}}>{ROLE_LABELS[r]||r}</div>
          </div>
          <div style={{marginLeft:'auto',width:7,height:7,flexShrink:0,borderRadius:'50%',background:'var(--success)',boxShadow:'0 0 5px var(--success)'}}/>
        </div>
        <button onClick={onAlterarSenha} style={{marginTop:8,width:'100%',padding:'7px 0',borderRadius:7,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.55)',fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'var(--font)'}}>🔑 Alterar senha</button>
        <button onClick={onLogout} style={{marginTop:6,width:'100%',padding:'7px 0',borderRadius:7,background:'rgba(196,66,58,.1)',border:'1px solid rgba(196,66,58,.25)',color:'#F08080',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'var(--font)'}}>Sair da conta</button>
      </div>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function StatCard({label,value,sub,color,icon}){
  return(
    <div className="mcard" style={{position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:-20,right:-20,width:80,height:80,borderRadius:'50%',background:color,filter:'blur(32px)',opacity:.2,pointerEvents:'none'}}/>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
        <span className="eyebrow">{label}</span>
        <div style={{width:32,height:32,borderRadius:9,background:`${color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,border:`1px solid ${color}25`}}>{icon}</div>
      </div>
      <div style={{fontSize:30,fontWeight:600,fontFamily:'var(--font-display)',color:'var(--text-primary)',lineHeight:1}}>{value}</div>
      {sub&&<div style={{fontSize:12,color:'var(--text-muted)',marginTop:6}}>{sub}</div>}
    </div>
  );
}

function CorbanDashboard({clientes,estrutura,profile}){
  const r=profile?.role;

  // ── Filtro por promotora (Master only) ──
  const [filtroTipo,setFiltroTipo]=useState('todos'); // 'todos' | 'promotora_principal' | 'promotora'
  const [filtroId,setFiltroId]=useState('');

  const promotoras_principais=useMemo(()=>estrutura.filter(u=>u.role==='promotora_principal'),[estrutura]);
  const promotoras=useMemo(()=>estrutura.filter(u=>u.role==='promotora'),[estrutura]);

  // Filtrar clientes pelo escopo selecionado
  const clientesFiltrados=useMemo(()=>{
    if(r!=='master'||filtroTipo==='todos'||!filtroId) return clientes;
    if(filtroTipo==='promotora_principal'){
      // Encontrar email da PP selecionada
      const pp=estrutura.find(u=>u.email===filtroId&&u.role==='promotora_principal');
      if(!pp) return clientes;
      return clientes.filter(c=>c.promotoraPrincipalNome===pp.nome);
    }
    if(filtroTipo==='promotora'){
      const p=estrutura.find(u=>u.email===filtroId&&u.role==='promotora');
      if(!p) return clientes;
      return clientes.filter(c=>c.promotoraNome===p.nome);
    }
    return clientes;
  },[clientes,estrutura,r,filtroTipo,filtroId]);

  const total=clientesFiltrados.length;
  const ganhos=clientesFiltrados.filter(c=>c.statusComercial==='ganho'||c.statusComercial==='pedido').length;
  const emNeg=clientesFiltrados.filter(c=>c.statusComercial==='em_negociacao').length;
  const frios=clientesFiltrados.filter(c=>sinceD(c.ultimoContato)>=7).length;
  const taxa=total>0?Math.round(ganhos/total*100):0;
  const byStage=STAGES.map(s=>({...s,count:clientesFiltrados.filter(c=>c.statusComercial===s.id).length}));
  const recent=clientesFiltrados.flatMap(c=>(c.activities||[]).map(a=>({...a,clienteName:c.nomeCliente}))).sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,8);

  // Estrutura stats
  const pps=estrutura.filter(u=>u.role==='promotora_principal').length;
  const ps=estrutura.filter(u=>u.role==='promotora').length;
  const ds=estrutura.filter(u=>u.role==='digitalizador').length;

  const isFiltrado=r==='master'&&filtroTipo!=='todos'&&filtroId;
  const labelFiltro=isFiltrado
    ?estrutura.find(u=>u.email===filtroId)?.nome||'—'
    :'Visão geral — todos os clientes';

  return(
    <div style={{padding:'28px 32px'}}>
      <div className="fu" style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20,gap:16}}>
        <div>
          <div className="section-title">Dashboard</div>
          <div className="section-sub">{ROLE_LABELS[r]} · {fmtD(TODAY)}</div>
        </div>

        {/* Filtro por promotora — só para Master */}
        {r==='master'&&(
          <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',justifyContent:'flex-end'}}>
            {/* Tipo */}
            <div style={{display:'flex',gap:4}}>
              {[
                {v:'todos',label:'Todos'},
                {v:'promotora_principal',label:'Por PP'},
                {v:'promotora',label:'Por Promotora'},
              ].map(opt=>(
                <button key={opt.v} onClick={()=>{setFiltroTipo(opt.v);setFiltroId('');}} style={{
                  padding:'6px 12px',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer',
                  border:'none',fontFamily:'var(--font)',transition:'all .15s',
                  background:filtroTipo===opt.v?G_MID:'rgba(90,70,50,.07)',
                  color:filtroTipo===opt.v?'#fff':'var(--text-secondary)',
                }}>{opt.label}</button>
              ))}
            </div>

            {/* Seletor de promotora específica */}
            {filtroTipo==='promotora_principal'&&(
              <select className="sel" style={{width:200,fontSize:12,height:34}} value={filtroId} onChange={e=>setFiltroId(e.target.value)}>
                <option value="">— Selecionar PP —</option>
                {promotoras_principais.map(u=><option key={u.email} value={u.email}>{u.nome}</option>)}
              </select>
            )}
            {filtroTipo==='promotora'&&(
              <select className="sel" style={{width:200,fontSize:12,height:34}} value={filtroId} onChange={e=>setFiltroId(e.target.value)}>
                <option value="">— Selecionar Promotora —</option>
                {promotoras.map(u=><option key={u.email} value={u.email}>{u.nome}</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Label do filtro ativo */}
      {isFiltrado&&(
        <div className="fu" style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',borderRadius:9,marginBottom:16,background:G_LIGHT,border:`1px solid ${G_MID}30`,fontSize:12,color:G_MID}}>
          <span style={{fontWeight:700}}>Filtrando:</span> {labelFiltro}
          <span style={{color:'var(--text-muted)',marginLeft:4}}>· {total} clientes</span>
          <button onClick={()=>{setFiltroTipo('todos');setFiltroId('');}} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:G_MID,fontSize:14,fontWeight:700}}>×</button>
        </div>
      )}

      {/* Stats grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:14,marginBottom:20}}>
        <StatCard label="Total Clientes" value={total}  sub={isFiltrado?labelFiltro:'No seu escopo'}     color={G_MID}    icon="◈"/>
        <StatCard label="Convertidos"    value={ganhos} sub={`${taxa}% conversão`}                        color="#1E8F5E" icon="✓"/>
        <StatCard label="Em Negociação"  value={emNeg}  sub="Estágio ativo"                               color="#5B4FE8" icon="⟳"/>
        <StatCard label="Leads Frios"    value={frios}  sub="Sem contato +7 dias"                         color="#C4423A" icon="❄"/>
      </div>

      {/* Estrutura stats — só para Master e PP (apenas quando não há filtro ativo) */}
      {(r==='master'||r==='promotora_principal')&&!isFiltrado&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:14,marginBottom:20}}>
          {r==='master'&&<StatCard label="Promotoras Principais" value={pps} sub="Cadastradas" color={G_MID}    icon="⎇"/>}
          <StatCard label="Promotoras"      value={ps} sub="Vinculadas" color="#1A9E8A" icon="⎇"/>
          <StatCard label="Digitalizadores" value={ds} sub="Ativos"     color="#5B4FE8" icon="⎇"/>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        {/* Pipeline */}
        <div className="card fu1" style={{padding:'18px 20px'}}>
          <div className="eyebrow" style={{marginBottom:14}}>Pipeline por estágio{isFiltrado&&<span style={{marginLeft:6,color:G_MID,fontWeight:400,textTransform:'none',fontSize:10}}>— {labelFiltro}</span>}</div>
          {byStage.map(s=>(
            <div key={s.id} style={{display:'flex',alignItems:'center',gap:10,marginBottom:9}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:s.color,flexShrink:0}}/>
              <div style={{flex:1,fontSize:12,color:'var(--text-secondary)'}}>{s.label}</div>
              <div style={{width:110,height:6,background:'rgba(90,70,50,.1)',borderRadius:99,overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:99,background:s.color,width:`${Math.max(s.count/Math.max(...byStage.map(x=>x.count),1)*100,0)}%`,transition:'width .6s'}}/>
              </div>
              <div style={{fontSize:12,fontWeight:600,color:'var(--text-primary)',width:22,textAlign:'right'}}>{s.count}</div>
            </div>
          ))}
        </div>

        {/* Atividade recente */}
        <div className="card fu2" style={{padding:'18px 20px'}}>
          <div className="eyebrow" style={{marginBottom:14}}>Atividade recente</div>
          {recent.length===0?(
            <div style={{fontSize:12,color:'var(--text-muted)'}}>Nenhuma atividade ainda.</div>
          ):recent.map((a,i)=>(
            <div key={a.id||i} style={{display:'flex',gap:10,padding:'7px 0',borderBottom:i<recent.length-1?'1px solid var(--border)':'none'}}>
              <div style={{width:28,height:28,borderRadius:8,background:G_LIGHT,color:G_MID,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0}}>⇄</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:'var(--text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.clienteName}</div>
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

// ── CLIENTES LIST ─────────────────────────────────────────────────────────────
function CorbanClientes({clientes,profile,onSelect,onNew}){
  const [search,setSearch]=useState('');
  const [stage,setStage]=useState('');
  const [page,setPage]=useState(1);
  const PER=50;

  const filtered=useMemo(()=>clientes.filter(c=>{
    if(stage&&c.statusComercial!==stage) return false;
    if(search){
      const s=search.toLowerCase();
      if(!c.nomeCliente?.toLowerCase().includes(s)&&!c.cpfCliente?.includes(s)&&!c.orgaoPrefeitura?.toLowerCase().includes(s)) return false;
    }
    return true;
  }),[clientes,search,stage]);

  const total=Math.max(1,Math.ceil(filtered.length/PER));
  const paged=filtered.slice((page-1)*PER,page*PER);
  const r=profile?.role;

  return(
    <div style={{padding:'28px 32px'}}>
      <div className="fu" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:20}}>
        <div>
          <div className="section-title">{r==='digitalizador'?'Meus Clientes':'Clientes'}</div>
          <div className="section-sub">{filtered.length} de {clientes.length} registros{total>1?` · Pág ${page}/${total}`:''}</div>
        </div>
        <button className="btn" style={{background:G_MID,color:'#fff',boxShadow:`0 3px 16px ${G_GLOW}`}} onClick={onNew}>
          <span style={{fontSize:16,lineHeight:1}}>+</span> Novo Cliente
        </button>
      </div>

      <div className="fu1" style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        <div className="search-wrap" style={{flex:1,minWidth:220}}>
          <span className="search-icon">⌕</span>
          <input className="inp" placeholder="Buscar por nome, CPF ou órgão…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
        </div>
        <select className="sel" style={{width:168}} value={stage} onChange={e=>{setStage(e.target.value);setPage(1);}}>
          <option value="">Todos os estágios</option>
          {STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        {(search||stage)&&<button className="btn btn-ghost" onClick={()=>{setSearch('');setStage('');setPage(1);}}>✕ Limpar</button>}
      </div>

      <div className="fu2 card" style={{overflow:'hidden',marginBottom:16}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead>
              <tr style={{background:'rgba(90,70,50,.04)',borderBottom:'1px solid var(--border)'}}>
                {['Nome / CPF','Órgão','Estágio','Documento','Digitalizador','Último contato',''].map(h=>(
                  <th key={h} style={{padding:'11px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.08em',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map(c=>(
                <tr key={c.id} className="trow" onClick={()=>onSelect(c.id)}>
                  <td style={{padding:'12px 14px'}}><div style={{fontWeight:600}}>{c.nomeCliente}</div><div style={{fontSize:11,color:'var(--text-muted)',marginTop:1}}>{c.cpfCliente}</div></td>
                  <td style={{padding:'12px 14px',color:'var(--text-secondary)',fontSize:12}}>{c.orgaoPrefeitura}</td>
                  <td style={{padding:'12px 14px'}}><StageTag stageId={c.statusComercial}/></td>
                  <td style={{padding:'12px 14px'}}><span style={{fontSize:11,fontWeight:600,color:c.documentoStatus==='Aprovado'?'var(--success)':c.documentoStatus==='Não solicitado'?'var(--text-faint)':'var(--amber)'}}>{c.documentoStatus}</span></td>
                  <td style={{padding:'12px 14px',fontSize:12,color:'var(--text-secondary)'}}>{c.digitalizadorNome||'—'}</td>
                  <td style={{padding:'12px 14px',fontSize:12,color:'var(--text-secondary)'}}>{fmtD(c.ultimoContato)}</td>
                  <td style={{padding:'12px 14px',color:'var(--text-muted)',fontSize:16}}>›</td>
                </tr>
              ))}
              {paged.length===0&&<tr><td colSpan={7} style={{padding:'40px 0',textAlign:'center',color:'var(--text-muted)',fontSize:13}}>Nenhum cliente encontrado</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {total>1&&(
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
          <button className="btn btn-ghost" style={{padding:'6px 12px',fontSize:12}} onClick={()=>setPage(1)} disabled={page===1}>«</button>
          <button className="btn btn-ghost" style={{padding:'6px 12px',fontSize:12}} onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>‹ Anterior</button>
          {Array.from({length:total},(_,i)=>i+1).filter(p=>p===1||p===total||Math.abs(p-page)<=2).map((p,i,arr)=>[
            i>0&&arr[i-1]!==p-1?<span key={`e${i}`} style={{padding:'6px 4px',fontSize:12,color:'var(--text-muted)'}}>…</span>:null,
            <button key={p} onClick={()=>setPage(p)} style={{width:32,height:32,borderRadius:8,border:'none',cursor:'pointer',fontSize:12,fontWeight:p===page?600:400,background:p===page?G_MID:'transparent',color:p===page?'#fff':'var(--text-secondary)',transition:'all .15s'}}>{p}</button>
          ])}
          <button className="btn btn-ghost" style={{padding:'6px 12px',fontSize:12}} onClick={()=>setPage(p=>Math.min(total,p+1))} disabled={page===total}>Próxima ›</button>
          <button className="btn btn-ghost" style={{padding:'6px 12px',fontSize:12}} onClick={()=>setPage(total)} disabled={page===total}>»</button>
        </div>
      )}
    </div>
  );
}

// ── DETAIL PANEL ──────────────────────────────────────────────────────────────
function CorbanDetail({cliente,profile,dispatch,onClose}){
  const [tab,setTab]=useState('info');
  const [note,setNote]=useState('');
  const [es,setEs]=useState(cliente.statusComercial);
  const [ed,setEd]=useState(cliente.documentoStatus);
  const days=sinceD(cliente.ultimoContato);

  const save=()=>{
    const upd={...cliente,documentoStatus:ed};
    if(es!==cliente.statusComercial) dispatch({type:'MOVE',cid:cliente.id,st:es,user:profile?.nome||'Usuário'});
    dispatch({type:'UPD',c:upd});
    onClose();
  };

  return(
    <div className="spanel">
      <div style={{padding:'18px 22px 14px',borderBottom:'1px solid var(--border)',background:'var(--bg-card)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <div style={{fontSize:16,fontWeight:600,color:'var(--text-primary)',fontFamily:'var(--font-display)'}}>{cliente.nomeCliente}</div>
              <AlertDot days={days}/>
            </div>
            <div style={{fontSize:12,color:'var(--text-muted)'}}>{cliente.orgaoPrefeitura} · {cliente.cpfCliente}</div>
            <div style={{marginTop:8,display:'flex',gap:6,flexWrap:'wrap'}}>
              <StageTag stageId={cliente.statusComercial}/>
              {cliente.digitalizadorNome&&<span style={{fontSize:10,padding:'2px 8px',borderRadius:99,background:G_LIGHT,color:G_MID,fontWeight:600}}>{cliente.digitalizadorNome}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{background:'rgba(90,70,50,.08)',border:'1px solid var(--border-mid)',borderRadius:8,color:'var(--text-secondary)',cursor:'pointer',width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>×</button>
        </div>
      </div>

      <div style={{display:'flex',borderBottom:'1px solid var(--border)',background:'var(--bg-card)'}}>
        {[['info','Informações'],['activity','Atividades'],['docs','Documentos']].map(([id,lb])=>(
          <button key={id} className={`ptab ${tab===id?'on':''}`} onClick={()=>setTab(id)}>{lb}</button>
        ))}
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}>
        {tab==='info'&&(
          <div>
            <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,overflow:'hidden',marginBottom:16}}>
              {[
                ['Telefone',cliente.telefone||'—'],
                ['Quem indicou',cliente.nomeQuemIndicou||'—'],
                ['Órgão',cliente.orgaoPrefeitura||'—'],
                ['CPF',cliente.cpfCliente||'—'],
                ['Perfil',cliente.perfilCliente||'—'],
                ['Observações',cliente.observacoes||'—'],
                ['Digitalizador',cliente.digitalizadorNome||'—'],
                ['Promotora',cliente.promotoraNome||'—'],
                ['Promotora Principal',cliente.promotoraPrincipalNome||'—'],
                ['Data entrada',fmtD(cliente.dataEntrada)],
                ['Último contato',fmtD(cliente.ultimoContato)],
              ].map(([k,v])=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'9px 12px',borderBottom:'1px solid var(--border)'}}>
                  <span style={{fontSize:12,color:'var(--text-muted)'}}>{k}</span>
                  <span style={{fontSize:12,color:'var(--text-primary)',fontWeight:500,textAlign:'right',maxWidth:'60%'}}>{v}</span>
                </div>
              ))}
            </div>

            {cliente.produtosInteresse?.length>0&&(
              <div style={{marginBottom:14}}>
                <div className="eyebrow" style={{marginBottom:8}}>Produtos de interesse</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:5}}>{cliente.produtosInteresse.map(p=><span key={p} className="prod-pill">{p}</span>)}</div>
              </div>
            )}

            <div style={{borderTop:'1px solid var(--border)',paddingTop:16}}>
              <div className="eyebrow" style={{marginBottom:10}}>Atualizar status</div>
              <label style={{fontSize:12,color:'var(--text-muted)',display:'block',marginBottom:5}}>Estágio</label>
              <select className="sel" value={es} onChange={e=>setEs(e.target.value)} style={{marginBottom:10}}>
                {STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <label style={{fontSize:12,color:'var(--text-muted)',display:'block',marginBottom:5}}>Documento</label>
              <select className="sel" value={ed} onChange={e=>setEd(e.target.value)} style={{marginBottom:14}}>
                {DOC_STATUS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <button className="btn" style={{width:'100%',justifyContent:'center',background:G_MID,color:'#fff',boxShadow:`0 3px 12px ${G_GLOW}`}} onClick={save}>Salvar alterações</button>
            </div>
          </div>
        )}

        {tab==='activity'&&(
          <div>
            <div style={{marginBottom:16}}>
              <textarea className="inp" value={note} onChange={e=>setNote(e.target.value)} placeholder="Registrar ligação, reunião, observação…" style={{resize:'vertical',minHeight:70,fontFamily:'var(--font)',lineHeight:1.5,marginBottom:8}}/>
              <button className="btn" style={{width:'100%',justifyContent:'center',background:G_MID,color:'#fff'}} onClick={()=>{
                if(!note.trim()) return;
                dispatch({type:'NOTE',cid:cliente.id,act:{id:gid(),type:'note',date:TODAY,user:profile?.nome||'Usuário',text:note.trim()}});
                setNote('');
              }}>+ Registrar atividade</button>
            </div>
            {[...(cliente.activities||[])].reverse().map((a,i)=>(
              <div key={a.id||i} style={{display:'flex',gap:10,marginBottom:8}}>
                <div style={{width:30,height:30,borderRadius:9,background:G_LIGHT,color:G_MID,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0}}>
                  {a.type==='stage_change'?'⇄':a.type==='contact'?'☎':'✎'}
                </div>
                <div style={{flex:1,paddingBottom:10,borderBottom:'1px solid var(--border)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                    <span style={{fontSize:12,fontWeight:600}}>{a.user}</span>
                    <span style={{fontSize:11,color:'var(--text-faint)'}}>{fmtD(a.date)}</span>
                  </div>
                  <div style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.5}}>{a.text}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==='docs'&&(
          <div style={{textAlign:'center',padding:'32px 0'}}>
            <div style={{fontSize:32,marginBottom:12}}>📁</div>
            <div style={{fontSize:13,fontWeight:600,color:'var(--text-primary)',marginBottom:4}}>Upload de documentos</div>
            <div style={{fontSize:12,color:'var(--text-muted)'}}>Disponível em breve</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── NOVO CLIENTE MODAL ────────────────────────────────────────────────────────
function NovoClienteField({label,children}){
  return(
    <div>
      <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>{label}</label>
      {children}
    </div>
  );
}

function NovoClienteModal({profile,dispatch,onClose}){
  const [form,setForm]=useState(blankCliente());
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const tp=p=>set('produtosInteresse',form.produtosInteresse.includes(p)?form.produtosInteresse.filter(x=>x!==p):[...form.produtosInteresse,p]);

  const save=()=>{
    if(!form.nomeCliente.trim()||!form.cpfCliente.trim()){alert('Nome e CPF são obrigatórios.');return;}
    const id=gid();
    dispatch({type:'ADD',c:{...form,id,digitalizadorNome:profile?.nome,promotoraNome:profile?.promotoraNome,promotoraPrincipalNome:profile?.promotoraPrincipalNome},user:profile?.nome||'Usuário'});
  };

  return(
    <div className="mbk" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="mbox">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:22}}>
          <div>
            <div style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:600,color:'var(--text-primary)'}}>Novo Cliente</div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>Preencha os dados do cliente</div>
          </div>
          <button onClick={onClose} style={{background:'rgba(90,70,50,.08)',border:'1px solid var(--border-mid)',borderRadius:9,color:'var(--text-secondary)',cursor:'pointer',width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>×</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:11,marginBottom:11}}>
          <NovoClienteField label="Nome do cliente *"><input className="inp" value={form.nomeCliente} onChange={e=>set('nomeCliente',e.target.value)} placeholder="Nome completo"/></NovoClienteField>
          <NovoClienteField label="CPF *"><input className="inp" value={form.cpfCliente} onChange={e=>set('cpfCliente',e.target.value)} placeholder="000.000.000-00"/></NovoClienteField>
          <NovoClienteField label="Telefone"><input className="inp" value={form.telefone} onChange={e=>set('telefone',e.target.value)} placeholder="(00) 00000-0000"/></NovoClienteField>
          <NovoClienteField label="Órgão / Prefeitura"><input className="inp" value={form.orgaoPrefeitura} onChange={e=>set('orgaoPrefeitura',e.target.value)} placeholder="Prefeitura de…"/></NovoClienteField>
        </div>
        <div style={{marginBottom:11}}><NovoClienteField label="Nome de quem indicou"><input className="inp" value={form.nomeQuemIndicou} onChange={e=>set('nomeQuemIndicou',e.target.value)} placeholder="Nome do indicador"/></NovoClienteField></div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:8}}>Produtos de interesse</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {PRODUCTS.map(p=>{const sel=form.produtosInteresse.includes(p);return(<button key={p} onClick={()=>tp(p)} style={{padding:'5px 11px',borderRadius:99,fontSize:12,fontWeight:600,cursor:'pointer',background:sel?G_LIGHT:'rgba(90,70,50,.07)',color:sel?G_MID:'var(--text-muted)',border:sel?`1px solid ${G_MID}40`:'1px solid var(--border)',transition:'all .15s'}}>{p}</button>);})}
          </div>
        </div>
        <div style={{marginBottom:20}}><NovoClienteField label="Observações"><textarea className="inp" value={form.observacoes} onChange={e=>set('observacoes',e.target.value)} style={{resize:'vertical',minHeight:64,fontFamily:'var(--font)',lineHeight:1.5}} placeholder="Detalhes relevantes…"/></NovoClienteField></div>
        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" style={{background:G_MID,color:'#fff',boxShadow:`0 3px 12px ${G_GLOW}`}} onClick={save}>Salvar cliente</button>
        </div>
      </div>
    </div>
  );
}

// ── ESTRUTURA ─────────────────────────────────────────────────────────────────
function CorbanEstrutura({profile,session}){
  const [usuarios,setUsuarios]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showModal,setShowModal]=useState(false);
  const [form,setForm]=useState({
    // campos comuns
    email:'', role:'digitalizador',
    promotora_principal_email:'', promotora_email:'',
    // campos pessoa jurídica (PP e Promotora)
    cnpj:'', razaoSocial:'', nomeFantasia:'', telefone:'',
    // campos pessoa física (Digitalizador)
    nome:'', dataNasc:'', cpf:'', telefoneDig:'',
  });
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState(null);
  const [confirmDelete,setConfirmDelete]=useState(null);

  const r=profile?.role;

  const load=useCallback(async()=>{
    setLoading(true);
    let q=supabase.from('allowed_users').select('*').eq('modulo','corbans').order('nome');
    // Filter by hierarchy for non-masters
    const {data}=await q;
    let filtered=(data||[]);
    if(r==='promotora_principal'){
      filtered=filtered.filter(u=>u.promotora_principal_email===profile.email||u.email===profile.email);
    } else if(r==='promotora'){
      filtered=filtered.filter(u=>u.promotora_email===profile.email||u.email===profile.email);
    }
    setUsuarios(filtered);
    setLoading(false);
  },[r,profile?.email]);

  useEffect(()=>{ load(); },[load]);

  const save=async()=>{
    const isPJ=form.role==='promotora_principal'||form.role==='promotora';
    const isPF=form.role==='digitalizador';

    // Validações por tipo
    if(isPJ){
      if(!form.email.trim()||!form.razaoSocial.trim()||!form.cnpj.trim()){
        setMsg({t:'error',text:'CNPJ, Razão Social e E-mail são obrigatórios.'});return;
      }
    }
    if(isPF){
      if(!form.email.trim()||!form.nome.trim()||!form.cpf.trim()){
        setMsg({t:'error',text:'Nome, CPF e E-mail são obrigatórios.'});return;
      }
    }

    setSaving(true);setMsg(null);
    const email=form.email.trim().toLowerCase();

    // Nome para exibição: PJ usa Nome Fantasia ou Razão Social; PF usa nome
    const nomeExibicao=isPJ?(form.nomeFantasia.trim()||form.razaoSocial.trim()):form.nome.trim();

    // Hierarquia
    let pp_email=form.promotora_principal_email||'';
    let p_email=form.promotora_email||'';
    if(r==='promotora_principal'){ pp_email=profile.email; }
    if(r==='promotora'){ p_email=profile.email; pp_email=profile.promotora_principal_email||''; }

    // Dados extras salvos em metadata JSON no campo `extra_data` (vamos adicionar no allowed_users)
    const extraData=isPJ
      ?{cnpj:form.cnpj,razaoSocial:form.razaoSocial,nomeFantasia:form.nomeFantasia,telefone:form.telefone}
      :{dataNasc:form.dataNasc,cpf:form.cpf,telefone:form.telefoneDig};

    const {error}=await supabase.from('allowed_users').insert({
      email, nome:nomeExibicao, role:form.role, modulo:'corbans',
      promotora_principal_email:pp_email||null,
      promotora_email:p_email||null,
      extra_data:extraData,
    });
    setSaving(false);
    if(error){setMsg({t:'error',text:error.message});}
    else{
      setMsg({t:'success',text:`${nomeExibicao} adicionado! Crie o acesso no Supabase Auth.`});
      setShowModal(false);
      load();
    }
  };

  const remove=async(u)=>{
    await supabase.from('allowed_users').delete().eq('email',u.email);
    setConfirmDelete(null);setMsg({t:'success',text:`${u.nome} removido.`});load();
  };

  // Roles that this user can create
  const creatableRoles=r==='master'
    ?['promotora_principal','promotora','digitalizador']
    :r==='promotora_principal'?['promotora','digitalizador']
    :['digitalizador'];

  // Group by role
  const groups=[
    {role:'master',label:'Corban Master'},
    {role:'promotora_principal',label:'Promotoras Principais'},
    {role:'promotora',label:'Promotoras'},
    {role:'digitalizador',label:'Digitalizadores'},
  ].filter(g=>r==='master'||g.role!=='master');

  return(
    <div style={{padding:'28px 32px'}}>
      <div className="fu" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:24}}>
        <div>
          <div className="section-title">Estrutura</div>
          <div className="section-sub">Hierarquia do módulo Corbans</div>
        </div>
        <button className="btn" style={{background:G_MID,color:'#fff',boxShadow:`0 3px 12px ${G_GLOW}`}} onClick={()=>{setForm({email:'',nome:'',role:creatableRoles[creatableRoles.length-1],promotora_principal_email:'',promotora_email:''});setShowModal(true);}}>
          + Adicionar usuário
        </button>
      </div>

      {msg&&(
        <div className="fu" style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',borderRadius:9,marginBottom:16,background:msg.t==='success'?'var(--success-dim)':'var(--danger-dim)',border:`1px solid ${msg.t==='success'?'rgba(30,143,94,.2)':'rgba(196,66,58,.2)'}`,fontSize:13,color:msg.t==='success'?'var(--success)':'var(--danger)'}}>
          <span>{msg.t==='success'?'✓':'⚠'}</span>{msg.text}
          <button onClick={()=>setMsg(null)} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'inherit',fontSize:16}}>×</button>
        </div>
      )}

      {loading?<div style={{textAlign:'center',padding:'40px 0',fontSize:13,color:'var(--text-muted)'}}>Carregando…</div>:(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
          {groups.map(g=>{
            const list=usuarios.filter(u=>u.role===g.role);
            return(
              <div key={g.role}>
                <div className="eyebrow" style={{marginBottom:10,color:ROLE_COLORS[g.role]}}>
                  {g.label} <span style={{fontWeight:400,color:'var(--text-faint)'}}>({list.length})</span>
                </div>
                <div className="card" style={{overflow:'hidden'}}>
                  {list.length===0?(
                    <div style={{padding:'16px 18px',fontSize:13,color:'var(--text-muted)'}}>Nenhum cadastrado.</div>
                  ):list.map((u,i,arr)=>(
                    <div key={u.email} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',borderBottom:i<arr.length-1?'1px solid var(--border)':'none'}}>
                      <Avatar name={u.nome} size={34} color={ROLE_COLORS[u.role]}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:'var(--text-primary)'}}>{u.nome}</div>
                        <div style={{fontSize:11,color:'var(--text-muted)',marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.email}</div>
                        {u.promotora_email&&<div style={{fontSize:10,color:'var(--text-faint)',marginTop:1}}>Promotora: {u.promotora_email}</div>}
                        {u.promotora_principal_email&&!u.promotora_email&&<div style={{fontSize:10,color:'var(--text-faint)',marginTop:1}}>PP: {u.promotora_principal_email}</div>}
                      </div>
                      <button onClick={()=>setConfirmDelete(u)} style={{padding:'4px 9px',borderRadius:7,fontSize:11,fontWeight:600,cursor:'pointer',background:'var(--danger-dim)',color:'var(--danger)',border:'1px solid rgba(196,66,58,.2)'}}>Remover</button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{padding:'12px 16px',background:'rgba(45,134,83,.06)',borderRadius:10,border:`1px solid rgba(45,134,83,.2)`,fontSize:12,color:'var(--text-muted)',lineHeight:1.7}}>
        💡 <strong>Para dar acesso:</strong> adicione aqui primeiro, depois vá em <strong>Supabase → Authentication → Users → Create new user</strong> com o mesmo e-mail e uma senha inicial.
      </div>

      {showModal&&(
        <div className="mbk" onClick={e=>{if(e.target===e.currentTarget){setShowModal(false);setMsg(null);}}}>
          <div className="mbox" style={{maxWidth:480}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22}}>
              <div>
                <div style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:600,color:'var(--text-primary)'}}>Adicionar usuário</div>
                <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>Módulo Corbans</div>
              </div>
              <button onClick={()=>{setShowModal(false);setMsg(null);}} style={{background:'rgba(90,70,50,.08)',border:'1px solid var(--border-mid)',borderRadius:9,color:'var(--text-secondary)',cursor:'pointer',width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>×</button>
            </div>

            {msg?.t==='error'&&<div style={{padding:'9px 12px',borderRadius:8,marginBottom:14,background:'var(--danger-dim)',border:'1px solid rgba(196,66,58,.2)',fontSize:12,color:'var(--danger)'}}>{msg.text}</div>}

            {/* Seletor de papel */}
            <div style={{marginBottom:16}}>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>Tipo de usuário</label>
              <div style={{display:'flex',gap:6}}>
                {creatableRoles.map(cr=>(
                  <button key={cr} onClick={()=>setForm(f=>({...f,role:cr}))} style={{flex:1,padding:'9px 0',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer',background:form.role===cr?ROLE_COLORS[cr]:'rgba(90,70,50,.06)',color:form.role===cr?'#fff':'var(--text-secondary)',border:form.role===cr?'none':'1px solid var(--border)',transition:'all .15s'}}>{ROLE_LABELS[cr]}</button>
                ))}
              </div>
            </div>

            {/* ── CAMPOS PESSOA JURÍDICA (PP ou Promotora) ── */}
            {(form.role==='promotora_principal'||form.role==='promotora')&&(
              <>
                <div style={{padding:'10px 12px',background:G_LIGHT,borderRadius:8,marginBottom:14,fontSize:11,color:G_MID,fontWeight:600}}>
                  🏢 Dados da empresa
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:11,marginBottom:11}}>
                  <div style={{gridColumn:'1/-1'}}>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>CNPJ *</label>
                    <input className="inp" value={form.cnpj} onChange={e=>setForm(f=>({...f,cnpj:e.target.value}))} placeholder="00.000.000/0001-00"/>
                  </div>
                  <div style={{gridColumn:'1/-1'}}>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>Razão Social *</label>
                    <input className="inp" value={form.razaoSocial} onChange={e=>setForm(f=>({...f,razaoSocial:e.target.value}))} placeholder="Razão Social Ltda."/>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>Nome Fantasia</label>
                    <input className="inp" value={form.nomeFantasia} onChange={e=>setForm(f=>({...f,nomeFantasia:e.target.value}))} placeholder="Nome comercial"/>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>Telefone</label>
                    <input className="inp" value={form.telefone} onChange={e=>setForm(f=>({...f,telefone:e.target.value}))} placeholder="(00) 00000-0000"/>
                  </div>
                  <div style={{gridColumn:'1/-1'}}>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>E-mail *</label>
                    <input className="inp" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@empresa.com"/>
                  </div>
                </div>

                {/* Vínculo hierárquico para Promotora */}
                {form.role==='promotora'&&r==='master'&&(
                  <div style={{marginBottom:11}}>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>Vinculada à Promotora Principal</label>
                    <select className="sel" value={form.promotora_principal_email} onChange={e=>setForm(f=>({...f,promotora_principal_email:e.target.value}))}>
                      <option value="">— Selecionar —</option>
                      {usuarios.filter(u=>u.role==='promotora_principal').map(u=><option key={u.email} value={u.email}>{u.nome}</option>)}
                    </select>
                  </div>
                )}
              </>
            )}

            {/* ── CAMPOS PESSOA FÍSICA (Digitalizador) ── */}
            {form.role==='digitalizador'&&(
              <>
                <div style={{padding:'10px 12px',background:'rgba(91,79,232,.08)',borderRadius:8,marginBottom:14,fontSize:11,color:'var(--accent)',fontWeight:600}}>
                  👤 Dados do digitalizador
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:11,marginBottom:11}}>
                  <div style={{gridColumn:'1/-1'}}>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>Nome completo *</label>
                    <input className="inp" value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Nome completo"/>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>CPF *</label>
                    <input className="inp" value={form.cpf} onChange={e=>setForm(f=>({...f,cpf:e.target.value}))} placeholder="000.000.000-00"/>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>Data de Nascimento</label>
                    <input className="inp" type="date" value={form.dataNasc} onChange={e=>setForm(f=>({...f,dataNasc:e.target.value}))}/>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>Telefone</label>
                    <input className="inp" value={form.telefoneDig} onChange={e=>setForm(f=>({...f,telefoneDig:e.target.value}))} placeholder="(00) 00000-0000"/>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>E-mail *</label>
                    <input className="inp" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@exemplo.com"/>
                  </div>
                </div>

                {/* Vínculo hierárquico para Digitalizador */}
                {r==='master'&&(
                  <>
                    <div style={{marginBottom:11}}>
                      <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>Vinculado à Promotora</label>
                      <select className="sel" value={form.promotora_email} onChange={e=>setForm(f=>({...f,promotora_email:e.target.value}))}>
                        <option value="">— Selecionar —</option>
                        {usuarios.filter(u=>u.role==='promotora').map(u=><option key={u.email} value={u.email}>{u.nome}</option>)}
                      </select>
                    </div>
                    <div style={{marginBottom:11}}>
                      <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>Vinculado à Promotora Principal</label>
                      <select className="sel" value={form.promotora_principal_email} onChange={e=>setForm(f=>({...f,promotora_principal_email:e.target.value}))}>
                        <option value="">— Selecionar —</option>
                        {usuarios.filter(u=>u.role==='promotora_principal').map(u=><option key={u.email} value={u.email}>{u.nome}</option>)}
                      </select>
                    </div>
                  </>
                )}
                {r==='promotora_principal'&&(
                  <div style={{marginBottom:11}}>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>Vinculado à Promotora</label>
                    <select className="sel" value={form.promotora_email} onChange={e=>setForm(f=>({...f,promotora_email:e.target.value}))}>
                      <option value="">— Selecionar —</option>
                      {usuarios.filter(u=>u.role==='promotora').map(u=><option key={u.email} value={u.email}>{u.nome}</option>)}
                    </select>
                  </div>
                )}
              </>
            )}

            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:20}}>
              <button className="btn btn-ghost" onClick={()=>{setShowModal(false);setMsg(null);}}>Cancelar</button>
              <button className="btn" style={{background:G_MID,color:'#fff',boxShadow:`0 3px 12px ${G_GLOW}`}} onClick={save} disabled={saving}>{saving?'Salvando…':'Adicionar'}</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete&&(
        <div className="mbk" onClick={e=>{if(e.target===e.currentTarget)setConfirmDelete(null);}}>
          <div className="mbox" style={{maxWidth:380}}>
            <div style={{textAlign:'center',padding:'8px 0 16px'}}>
              <div style={{fontSize:36,marginBottom:12}}>⚠️</div>
              <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:600,color:'var(--text-primary)',marginBottom:8}}>Remover {confirmDelete.nome}?</div>
              <div style={{fontSize:13,color:'var(--text-muted)',lineHeight:1.6,marginBottom:20}}>Esta pessoa perderá acesso ao sistema imediatamente.</div>
              <div style={{display:'flex',gap:8,justifyContent:'center'}}>
                <button className="btn btn-ghost" onClick={()=>setConfirmDelete(null)}>Cancelar</button>
                <button className="btn" style={{background:'var(--danger)',color:'#fff'}} onClick={()=>remove(confirmDelete)}>Sim, remover</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── AUDITORIA (MASTER ONLY) ───────────────────────────────────────────────────
function CorbanAuditoria(){
  const [logs,setLogs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState('');
  const [page,setPage]=useState(1);
  const PER=50;

  useEffect(()=>{
    supabase.from('corban_audit_log').select('*').order('created_at',{ascending:false}).limit(500)
      .then(({data})=>{ setLogs(data||[]); setLoading(false); });
    const ch=supabase.channel('corban_audit_rt')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'corban_audit_log'},
        payload=>setLogs(prev=>[payload.new,...prev]))
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  },[]);

  const filtered=useMemo(()=>{
    if(!search) return logs;
    const s=search.toLowerCase();
    return logs.filter(l=>l.user_nome?.toLowerCase().includes(s)||l.cliente_nome?.toLowerCase().includes(s)||l.action?.toLowerCase().includes(s)||l.detalhes?.toLowerCase().includes(s));
  },[logs,search]);

  const total=Math.max(1,Math.ceil(filtered.length/PER));
  const paged=filtered.slice((page-1)*PER,page*PER);
  const fmtTs=ts=>{ if(!ts)return'—'; return new Date(ts).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}); };

  return(
    <div style={{padding:'28px 32px'}}>
      <div className="fu" style={{marginBottom:20}}>
        <div className="section-title">Auditoria — Corbans</div>
        <div className="section-sub">{filtered.length} registros{total>1?` · Pág ${page}/${total}`:''}</div>
      </div>
      <div className="fu1" style={{display:'flex',gap:8,marginBottom:16,alignItems:'center'}}>
        <div className="search-wrap" style={{flex:1,maxWidth:360}}>
          <span className="search-icon">⌕</span>
          <input className="inp" placeholder="Filtrar por usuário, cliente, ação…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
        </div>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--text-muted)'}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:'var(--success)',boxShadow:'0 0 5px var(--success)'}}/>
          Tempo real
        </div>
      </div>
      {loading?<div style={{textAlign:'center',padding:'40px 0',fontSize:13,color:'var(--text-muted)'}}>Carregando…</div>:(
        <div className="fu2 card" style={{overflow:'hidden',marginBottom:16}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead>
                <tr style={{background:'rgba(90,70,50,.04)',borderBottom:'1px solid var(--border)'}}>
                  {['Data/hora','Usuário','Papel','Ação','Cliente','Detalhes'].map(h=>(
                    <th key={h} style={{padding:'11px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.08em',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((log,i)=>(
                  <tr key={log.id} style={{borderBottom:'1px solid var(--border)',background:i%2===0?'transparent':'rgba(90,70,50,.015)'}}>
                    <td style={{padding:'10px 14px',fontSize:11,color:'var(--text-muted)',whiteSpace:'nowrap'}}>{fmtTs(log.created_at)}</td>
                    <td style={{padding:'10px 14px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:7}}>
                        <Avatar name={log.user_nome||'?'} size={24} color={ROLE_COLORS[log.user_role]||G_MID}/>
                        <span style={{fontSize:12,fontWeight:600,color:'var(--text-primary)'}}>{log.user_nome}</span>
                      </div>
                    </td>
                    <td style={{padding:'10px 14px'}}><span className="tag" style={{background:G_LIGHT,color:G_MID,fontSize:11}}>{ROLE_LABELS[log.user_role]||log.user_role||'—'}</span></td>
                    <td style={{padding:'10px 14px'}}><span style={{fontSize:12,color:'var(--text-primary)'}}>{log.action}</span></td>
                    <td style={{padding:'10px 14px',fontSize:12,color:'var(--text-primary)',fontWeight:500}}>{log.cliente_nome||'—'}</td>
                    <td style={{padding:'10px 14px',fontSize:12,color:'var(--text-secondary)',maxWidth:260}}>{log.detalhes||'—'}</td>
                  </tr>
                ))}
                {paged.length===0&&<tr><td colSpan={6} style={{padding:'40px 0',textAlign:'center',color:'var(--text-muted)',fontSize:13}}>Nenhum registro encontrado</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {total>1&&(
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
          <button className="btn btn-ghost" style={{padding:'6px 12px',fontSize:12}} onClick={()=>setPage(1)} disabled={page===1}>«</button>
          <button className="btn btn-ghost" style={{padding:'6px 12px',fontSize:12}} onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>‹</button>
          <button className="btn btn-ghost" style={{padding:'6px 12px',fontSize:12}} onClick={()=>setPage(p=>Math.min(total,p+1))} disabled={page===total}>›</button>
          <button className="btn btn-ghost" style={{padding:'6px 12px',fontSize:12}} onClick={()=>setPage(total)} disabled={page===total}>»</button>
          <span style={{fontSize:12,color:'var(--text-muted)'}}>Pág {page}/{total}</span>
        </div>
      )}
    </div>
  );
}

// ── MAIN CORBAN APP ───────────────────────────────────────────────────────────
export function CorbanApp({profile,session,signOut,onAlterarSenha}){
  const [s,dispatch]=useReducer(R,INIT);
  const {clientes,view,sel,newOpen}=s;
  const [estrutura,setEstrutura]=useState([]);
  const [ready,setReady]=useState(false);
  const clientesRef=useRef(clientes);
  const [showAS,setShowAS]=useState(false);

  const setView=useCallback(v=>dispatch({type:'VIEW',v}),[]);
  const selected=clientes.find(c=>c.id===sel);

  // Load clientes from Supabase (RLS filters automatically)
  useEffect(()=>{
    if(!session) return;
    supabase.from('corban_clientes').select('*').order('created_at',{ascending:false})
      .then(({data,error})=>{
        if(error){console.error('Corban clientes error:',error);setReady(true);return;}
        const loaded=(data||[]).map(r=>({...r.data,id:r.id,digitalizador_id:r.digitalizador_id,promotora_id:r.promotora_id,promotora_principal_id:r.promotora_principal_id,digitalizadorNome:r.digitalizador_nome,promotoraNome:r.promotora_nome,promotoraPrincipalNome:r.promotora_principal_nome}));
        dispatch({type:'SET_C',clientes:loaded});
        setReady(true);
      });
  },[session]);

  // Load estrutura (only for roles that need it)
  useEffect(()=>{
    if(!session||profile?.role==='digitalizador') return;
    supabase.from('allowed_users').select('*').eq('modulo','corbans').order('nome')
      .then(({data})=>setEstrutura(data||[]));
  },[session,profile?.role]);

  // Sync clientes changes to Supabase
  useEffect(()=>{
    if(!ready||!session) return;
    const prev=clientesRef.current;
    const changed=clientes.filter(c=>{
      const old=prev.find(p=>p.id===c.id);
      return !old||JSON.stringify(old)!==JSON.stringify(c);
    });
    if(changed.length>0){
      Promise.all(changed.map(c=>{
        const {id,digitalizador_id,promotora_id,promotora_principal_id,digitalizadorNome,promotoraNome,promotoraPrincipalNome,...data}=c;
        return supabase.from('corban_clientes').upsert({
          id,data:{...data,id},
          digitalizador_id:digitalizador_id||session.user.id,
          digitalizador_nome:digitalizadorNome||profile?.nome,
          promotora_id:promotora_id||profile?.promotora_id||null,
          promotora_nome:promotoraNome||profile?.promotoraNome||null,
          promotora_principal_id:promotora_principal_id||profile?.promotora_principal_id||null,
          promotora_principal_nome:promotoraPrincipalNome||profile?.promotoraPrincipalNome||null,
        },{onConflict:'id'});
      }));
    }
    clientesRef.current=clientes;
  },[clientes,ready,session,profile]);

  // Audited dispatch
  const auditedDispatch=useCallback((action)=>{
    dispatch(action);
    if(!session||!profile) return;
    const auditMap={
      MOVE:()=>({action:'Moveu cliente no pipeline',clienteId:action.cid,details:`Estágio → "${stg(action.st).label}"`}),
      NOTE:()=>({action:'Adicionou nota',clienteId:action.cid,details:action.act?.text||''}),
      UPD: ()=>({action:'Editou informações',clienteId:action.c?.id,details:'Campos atualizados'}),
      ADD: ()=>({action:'Cadastrou novo cliente',clienteId:null,details:`Nome: ${action.c?.nomeCliente||'—'}`}),
    };
    const fn=auditMap[action.type];
    if(fn){
      const {action:act,clienteId,details}=fn();
      const clienteNome=action.type==='ADD'?action.c?.nomeCliente:clientes.find(c=>c.id===clienteId)?.nomeCliente||'—';
      supabase.from('corban_audit_log').insert({
        user_id:session.user.id,user_nome:profile.nome,user_role:profile.role,
        action:act,cliente_id:clienteId||null,cliente_nome:clienteNome,detalhes:details,
      }).then(({error})=>{ if(error) console.error('Corban audit error:',error); });
    }
  },[profile,clientes,session]);

  return(
    <>
      <div style={{display:'flex',minHeight:'100vh',background:'var(--bg-base)',fontFamily:'var(--font)'}}>
        <CorbanSidebar
          view={view}
          setView={v=>{setView(v);}}
          profile={profile}
          onLogout={signOut}
          onAlterarSenha={()=>setShowAS(true)}
        />
        <main style={{flex:1,minWidth:0,overflowY:'auto',paddingRight:selected?490:0,transition:'padding-right .3s cubic-bezier(.4,0,.2,1)'}}>
          {view==='dashboard' && <CorbanDashboard clientes={clientes} estrutura={estrutura} profile={profile}/>}
          {view==='clientes'  && <CorbanClientes clientes={clientes} profile={profile} onSelect={id=>dispatch({type:'SEL',id})} onNew={()=>dispatch({type:'TNEW'})}/>}
          {view==='estrutura' && <CorbanEstrutura profile={profile} session={session}/>}
          {view==='auditoria' && <CorbanAuditoria/>}
        </main>
        {selected&&<CorbanDetail key={selected.id} cliente={selected} profile={profile} dispatch={auditedDispatch} onClose={()=>dispatch({type:'CLOSE'})}/>}
        {newOpen&&<NovoClienteModal profile={profile} dispatch={auditedDispatch} onClose={()=>dispatch({type:'TNEW'})}/>}
      </div>
      {showAS&&<AlterarSenha onClose={()=>setShowAS(false)}/>}
    </>
  );
}