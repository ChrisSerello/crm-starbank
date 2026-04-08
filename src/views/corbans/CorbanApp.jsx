import { useState, useEffect, useReducer, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../../supabase';
import { gid, TODAY, fmtD, sinceD, stg } from '../../utils';
import { DOC_STATUS, STAGES } from '../../constants';
import { Avatar, StageTag, AlertDot } from '../../components/shared';
import { AlterarSenha } from '../../components/AlterarSenha';

// ── CORBAN CONSTANTS ──────────────────────────────────────────────────────────
const G_DARK  = '#1A3D2B';
const G_MID   = '#2D8653';
const G_LIGHT = 'rgba(45,134,83,0.12)';
const G_GLOW  = 'rgba(45,134,83,0.35)';
const G_TEXT  = '#52B788';

// Produtos específicos do módulo Corbans
const CORBAN_PRODUCTS = [
  'Empréstimo Consignado',
  'Cartão Consignado',
  'Cartão Benefício',
];

// Estágios do Corbans — sem "Distribuído"
const CORBAN_STAGES = STAGES.filter(s => s.id !== 'distribuido');

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
  nomeCliente:'', cpfCliente:'', telefone:'',
  orgaoPrefeitura:'', produtosInteresse:[], documentoStatus:'Não solicitado',
  statusComercial:'novo_lead', observacoes:'', perfilCliente:'',
  dataEntrada:TODAY, ultimoContato:TODAY,
  resultado:'Em andamento', activities:[],
  // Proposta
  proposta_valor:'', proposta_taxa:'', proposta_prazo:'', proposta_anotacao:'',
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
function CorbanSidebar({view,setView,profile,onLogout,onAlterarSenha,notifCount,onSino}){
  const r=profile?.role;
  const items=[
    {id:'dashboard',icon:'◈',label:'Dashboard'},
    {id:'pipeline', icon:'⊞',label:'Pipeline'},
    {id:'clientes', icon:'≡',label:r==='digitalizador'?'Meus Clientes':'Clientes'},
    ...(r!=='digitalizador'?[{id:'arvore',icon:'⎇',label:'Estrutura'}]:[]),
    ...(r==='master'||r==='promotora_principal'||r==='promotora'?[{id:'estrutura',icon:'＋',label:'Cadastrar'}]:[]),
    ...(r==='master'?[{id:'auditoria',icon:'🔍',label:'Auditoria'}]:[]),
  ];
  return(
    <div style={{width:228,background:G_DARK,borderRight:'1px solid rgba(45,134,83,0.25)',display:'flex',flexDirection:'column',flexShrink:0,height:'100vh',position:'sticky',top:0}}>
      <div style={{padding:'20px 18px 16px',borderBottom:'1px solid rgba(45,134,83,0.2)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:34,height:34,borderRadius:10,background:`linear-gradient(135deg,${G_MID} 0%,#52B788 100%)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,boxShadow:`0 4px 14px ${G_GLOW}`}}>◈</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:'var(--font-display)',fontSize:15,fontWeight:600,color:'#FFF'}}>StarNexus</div>
            <div style={{fontSize:10,fontWeight:700,color:G_TEXT,letterSpacing:'.09em',textTransform:'uppercase'}}>Corbans</div>
          </div>
          {/* Sininho */}
          <button onClick={onSino} style={{position:'relative',background:'none',border:'none',cursor:'pointer',padding:4}}>
            <span style={{fontSize:18}}>🔔</span>
            {notifCount>0&&(
              <span style={{position:'absolute',top:-2,right:-2,width:16,height:16,borderRadius:'50%',background:'var(--danger)',color:'#fff',fontSize:9,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{notifCount>9?'9+':notifCount}</span>
            )}
          </button>
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

  // ── Filtro por período ──
  const [periodo,setPeriodo]=useState('todos'); // 'hoje'|'semana'|'mes'|'30d'|'todos'

  const periodoLabel={'hoje':'Hoje','semana':'Esta semana','mes':'Este mês','30d':'Últimos 30 dias','todos':'Todo período'};

  const clientesPeriodo=useMemo(()=>{
    if(periodo==='todos') return clientesFiltrados;
    const now=new Date();
    const cutoff=new Date();
    if(periodo==='hoje') cutoff.setHours(0,0,0,0);
    else if(periodo==='semana') cutoff.setDate(now.getDate()-now.getDay());
    else if(periodo==='mes') cutoff.setDate(1),cutoff.setHours(0,0,0,0);
    else if(periodo==='30d') cutoff.setDate(now.getDate()-30);
    const cutoffStr=cutoff.toISOString().split('T')[0];
    return clientesFiltrados.filter(c=>c.dataEntrada>=cutoffStr);
  },[clientesFiltrados,periodo]);

  // ── Filtro por produto ──
  const [filtroProduto,setFiltroProduto]=useState('');
  const clientesComFiltros=useMemo(()=>{
    if(!filtroProduto) return clientesPeriodo;
    return clientesPeriodo.filter(c=>(c.produtosInteresse||[]).includes(filtroProduto));
  },[clientesPeriodo,filtroProduto]);

  const total=clientesComFiltros.length;
  const ganhos=clientesComFiltros.filter(c=>c.statusComercial==='ganho'||c.statusComercial==='pedido').length;
  const emNeg=clientesComFiltros.filter(c=>c.statusComercial==='em_negociacao').length;
  const frios=clientesComFiltros.filter(c=>sinceD(c.ultimoContato)>=7).length;
  const taxa=total>0?Math.round(ganhos/total*100):0;
  const byStage=CORBAN_STAGES.map(s=>({...s,count:clientesComFiltros.filter(c=>c.statusComercial===s.id).length}));
  const recent=clientesComFiltros.flatMap(c=>(c.activities||[]).map(a=>({...a,clienteName:c.nomeCliente}))).sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,8);

  // ── Ranking de promotoras ── (só master/pp)
  const rankingPromotoras=useMemo(()=>{
    if(r==='digitalizador') return [];
    const map={};
    clientesComFiltros.forEach(c=>{
      const nome=r==='master'?(c.promotoraNome||'Sem promotora'):(c.digitalizadorNome||'Sem digitalizador');
      if(!map[nome]) map[nome]={nome,total:0,ganhos:0,emNeg:0};
      map[nome].total++;
      if(c.statusComercial==='ganho'||c.statusComercial==='pedido') map[nome].ganhos++;
      if(c.statusComercial==='em_negociacao') map[nome].emNeg++;
    });
    return Object.values(map).sort((a,b)=>b.total-a.total).slice(0,8);
  },[clientesComFiltros,r]);

  // ── Painel de prioridades (digitalizador) ──
  const prioridades=useMemo(()=>{
    if(r!=='digitalizador') return null;
    const frios7=clientes.filter(c=>sinceD(c.ultimoContato)>=7).slice(0,5);
    const docPend=clientes.filter(c=>c.documentoStatus==='Solicitado'||c.documentoStatus==='Recebido').slice(0,5);
    const negoc=clientes.filter(c=>c.statusComercial==='em_negociacao').slice(0,5);
    return {frios7,docPend,negoc};
  },[clientes,r]);

  // ── Ranking digitalizadores + inatividade (promotora) ──
  const rankingDigs=useMemo(()=>{
    if(r!=='promotora') return null;
    const semana=new Date(); semana.setDate(semana.getDate()-7);
    const semStr=semana.toISOString().split('T')[0];
    const map={};
    clientes.forEach(c=>{
      const nome=c.digitalizadorNome||'Sem digitalizador';
      if(!map[nome]) map[nome]={nome,total:0,semana:0,parados:0,ultimoCad:null};
      map[nome].total++;
      if(c.dataEntrada>=semStr) map[nome].semana++;
      if(sinceD(c.ultimoContato)>=7) map[nome].parados++;
      if(!map[nome].ultimoCad||c.dataEntrada>map[nome].ultimoCad) map[nome].ultimoCad=c.dataEntrada;
    });
    // Adicionar digitalizadores sem clientes (inativos)
    estrutura.filter(u=>u.role==='digitalizador'&&u.promotora_email===profile?.email).forEach(u=>{
      if(!map[u.nome]) map[u.nome]={nome:u.nome,total:0,semana:0,parados:0,ultimoCad:null};
    });
    return Object.values(map).sort((a,b)=>b.total-a.total);
  },[clientes,r,estrutura,profile?.email]);

  // ── Comparativo mensal por promotora (PP) ──
  const comparativoMensal=useMemo(()=>{
    if(r!=='promotora_principal') return null;
    const meses={};
    clientes.forEach(c=>{
      if(!c.dataEntrada) return;
      const mes=c.dataEntrada.substring(0,7); // YYYY-MM
      const prom=c.promotoraNome||'Sem promotora';
      if(!meses[mes]) meses[mes]={};
      if(!meses[mes][prom]) meses[mes][prom]=0;
      meses[mes][prom]++;
    });
    const mesesOrdenados=Object.keys(meses).sort().slice(-6); // últimos 6 meses
    const promotoras=[...new Set(clientes.map(c=>c.promotoraNome).filter(Boolean))];
    return {meses:mesesOrdenados,promotoras,data:meses};
  },[clientes,r]);

  // ── Exportação por período (PP) ──
  const [expDe,setExpDe]=useState('');
  const [expAte,setExpAte]=useState('');
  const [expProm,setExpProm]=useState('');
  const exportarRelatorio=()=>{
    let dados=clientes;
    if(expDe) dados=dados.filter(c=>c.dataEntrada>=expDe);
    if(expAte) dados=dados.filter(c=>c.dataEntrada<=expAte);
    if(expProm) dados=dados.filter(c=>c.promotoraNome===expProm);
    const headers=['Nome','CPF','Telefone','Órgão','Estágio','Produto','Documento','Digitalizador','Promotora','Data Entrada','Último Contato'];
    const rows=dados.map(c=>[
      c.nomeCliente||'',c.cpfCliente||'',c.telefone||'',c.orgaoPrefeitura||'',
      c.statusComercial||'',(c.produtosInteresse||[]).join('; '),
      c.documentoStatus||'',c.digitalizadorNome||'',c.promotoraNome||'',
      c.dataEntrada||'',c.ultimoContato||''
    ]);
    const csv=[headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=`relatorio_corbans_${TODAY}.csv`;a.click();
    URL.revokeObjectURL(url);
  };
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

      {/* Filtros de período e produto — abaixo do filtro de promotora */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        {/* Período */}
        <div style={{display:'flex',gap:4,background:'rgba(90,70,50,.06)',borderRadius:9,padding:3}}>
          {Object.entries(periodoLabel).map(([v,label])=>(
            <button key={v} onClick={()=>setPeriodo(v)} style={{padding:'5px 10px',borderRadius:7,fontSize:11,fontWeight:600,cursor:'pointer',border:'none',fontFamily:'var(--font)',transition:'all .12s',background:periodo===v?'var(--bg-elevated)':'transparent',color:periodo===v?'var(--text-primary)':'var(--text-muted)',boxShadow:periodo===v?'0 1px 4px rgba(60,40,20,.1)':'none'}}>{label}</button>
          ))}
        </div>
        {/* Produto */}
        <select className="sel" style={{width:190,height:34,fontSize:12}} value={filtroProduto} onChange={e=>setFiltroProduto(e.target.value)}>
          <option value="">Todos os produtos</option>
          {CORBAN_PRODUCTS.map(p=><option key={p} value={p}>{p}</option>)}
        </select>
        {(periodo!=='todos'||filtroProduto)&&(
          <button className="btn btn-ghost" style={{fontSize:11,padding:'6px 10px'}} onClick={()=>{setPeriodo('todos');setFiltroProduto('');}}>✕ Limpar</button>
        )}
        <span style={{fontSize:11,color:'var(--text-muted)',marginLeft:'auto'}}>
          {total} cliente{total!==1?'s':''}{periodo!=='todos'?` · ${periodoLabel[periodo].toLowerCase()}`:''}
        </span>
      </div>

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
      {/* Ranking por promotora/digitalizador — só master e pp */}
      {(r==='master'||r==='promotora_principal')&&rankingPromotoras.length>0&&(
        <div className="card fu3" style={{padding:'18px 20px',marginTop:14}}>
          <div className="eyebrow" style={{marginBottom:14}}>
            {r==='master'?'Ranking por Promotora':'Ranking por Digitalizador'}
          </div>
          {rankingPromotoras.map((item,i)=>{
            const maxT=rankingPromotoras[0].total||1;
            const taxa=item.total>0?Math.round(item.ganhos/item.total*100):0;
            return(
              <div key={item.nome} style={{display:'flex',alignItems:'center',gap:10,marginBottom:i<rankingPromotoras.length-1?10:0}}>
                <div style={{width:22,height:22,borderRadius:7,background:i<3?G_LIGHT:'rgba(90,70,50,.06)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:i<3?G_MID:'var(--text-muted)',flexShrink:0}}>{i+1}</div>
                <div style={{fontSize:12,fontWeight:600,color:'var(--text-primary)',width:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flexShrink:0}}>{item.nome}</div>
                <div style={{flex:1,height:7,background:'rgba(90,70,50,.08)',borderRadius:99,overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:99,background:G_MID,width:`${Math.round(item.total/maxT*100)}%`,transition:'width .6s'}}/>
                </div>
                <div style={{fontSize:12,fontWeight:700,color:'var(--text-primary)',width:28,textAlign:'right',flexShrink:0}}>{item.total}</div>
                <div style={{fontSize:11,color:'var(--success)',width:42,textAlign:'right',flexShrink:0}}>{taxa}% ✓</div>
                {item.emNeg>0&&<div style={{fontSize:10,color:'var(--accent)',flexShrink:0,background:'var(--accent-dim)',borderRadius:99,padding:'1px 6px'}}>{item.emNeg} neg.</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* ── PAINEL DE PRIORIDADES (digitalizador) ── */}
      {r==='digitalizador'&&prioridades&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginTop:14}}>
          {/* Frios */}
          <div className="card fu3" style={{padding:'16px 18px'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'var(--danger)',boxShadow:'0 0 5px var(--danger)'}}/>
              <div className="eyebrow" style={{color:'var(--danger)'}}>Sem contato +7d</div>
              <span style={{marginLeft:'auto',fontSize:11,fontWeight:700,background:'var(--danger-dim)',color:'var(--danger)',borderRadius:99,padding:'1px 8px'}}>{clientes.filter(c=>sinceD(c.ultimoContato)>=7).length}</span>
            </div>
            {prioridades.frios7.length===0
              ?<div style={{fontSize:12,color:'var(--success)'}}>✓ Todos em dia!</div>
              :prioridades.frios7.map((c,i)=>(
                <div key={c.id} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:i<prioridades.frios7.length-1?'1px solid var(--border)':'none'}}>
                  <div style={{fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'65%'}}>{c.nomeCliente}</div>
                  <span style={{fontSize:11,fontWeight:700,color:'var(--danger)',flexShrink:0}}>{sinceD(c.ultimoContato)}d</span>
                </div>
              ))
            }
          </div>
          {/* Docs pendentes */}
          <div className="card fu3" style={{padding:'16px 18px'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'var(--amber)',boxShadow:'0 0 5px var(--amber)'}}/>
              <div className="eyebrow" style={{color:'var(--amber)'}}>Docs pendentes</div>
              <span style={{marginLeft:'auto',fontSize:11,fontWeight:700,background:'var(--amber-dim)',color:'var(--amber)',borderRadius:99,padding:'1px 8px'}}>{clientes.filter(c=>c.documentoStatus==='Solicitado'||c.documentoStatus==='Recebido').length}</span>
            </div>
            {prioridades.docPend.length===0
              ?<div style={{fontSize:12,color:'var(--success)'}}>✓ Documentação em dia!</div>
              :prioridades.docPend.map((c,i)=>(
                <div key={c.id} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:i<prioridades.docPend.length-1?'1px solid var(--border)':'none'}}>
                  <div style={{fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'60%'}}>{c.nomeCliente}</div>
                  <span style={{fontSize:10,fontWeight:600,color:'var(--amber)',flexShrink:0}}>{c.documentoStatus}</span>
                </div>
              ))
            }
          </div>
          {/* Em negociação */}
          <div className="card fu3" style={{padding:'16px 18px'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'var(--accent)',boxShadow:'0 0 5px var(--accent)'}}/>
              <div className="eyebrow" style={{color:'var(--accent)'}}>Em negociação ⚡</div>
              <span style={{marginLeft:'auto',fontSize:11,fontWeight:700,background:'var(--accent-dim)',color:'var(--accent)',borderRadius:99,padding:'1px 8px'}}>{clientes.filter(c=>c.statusComercial==='em_negociacao').length}</span>
            </div>
            {prioridades.negoc.length===0
              ?<div style={{fontSize:12,color:'var(--text-muted)'}}>Nenhum em negociação.</div>
              :prioridades.negoc.map((c,i)=>(
                <div key={c.id} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:i<prioridades.negoc.length-1?'1px solid var(--border)':'none'}}>
                  <div style={{fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'65%'}}>{c.nomeCliente}</div>
                  <span style={{fontSize:10,color:'var(--text-faint)',flexShrink:0}}>{fmtD(c.ultimoContato)}</span>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ── RANKING DIGITALIZADORES + INATIVIDADE (promotora) ── */}
      {r==='promotora'&&rankingDigs&&(
        <div className="card fu3" style={{padding:'18px 20px',marginTop:14}}>
          <div className="eyebrow" style={{marginBottom:14}}>Ranking dos seus digitalizadores</div>
          {rankingDigs.length===0
            ?<div style={{fontSize:12,color:'var(--text-muted)'}}>Nenhum digitalizador ainda.</div>
            :rankingDigs.map((d,i)=>{
              const inativo=!d.ultimoCad||(new Date()-new Date(d.ultimoCad))>10*86400000;
              const semStr=new Date(Date.now()-7*86400000).toISOString().split('T')[0];
              return(
                <div key={d.nome} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:i<rankingDigs.length-1?'1px solid var(--border)':'none'}}>
                  <div style={{width:28,height:28,borderRadius:8,background:inativo?'var(--danger-dim)':i===0?G_LIGHT:'rgba(90,70,50,.06)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:inativo?'var(--danger)':i===0?G_MID:'var(--text-muted)',flexShrink:0}}>{i+1}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{fontSize:13,fontWeight:600,color:'var(--text-primary)'}}>{d.nome}</span>
                      {inativo&&<span style={{fontSize:10,fontWeight:700,background:'var(--danger-dim)',color:'var(--danger)',borderRadius:99,padding:'1px 7px'}}>⚠ Inativo +10d</span>}
                    </div>
                    <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>
                      {d.semana} essa semana · {d.parados} parados
                    </div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontSize:18,fontWeight:700,color:inativo?'var(--danger)':G_MID}}>{d.total}</div>
                    <div style={{fontSize:9,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.06em'}}>clientes</div>
                  </div>
                </div>
              );
            })
          }
        </div>
      )}

      {/* ── COMPARATIVO MENSAL + EXPORTAÇÃO (promotora_principal) ── */}
      {r==='promotora_principal'&&comparativoMensal&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:14,marginTop:14,alignItems:'start'}}>
          {/* Gráfico de barras por mês */}
          <div className="card fu3" style={{padding:'18px 20px'}}>
            <div className="eyebrow" style={{marginBottom:14}}>Cadastros por promotora — últimos 6 meses</div>
            {comparativoMensal.meses.length===0
              ?<div style={{fontSize:12,color:'var(--text-muted)'}}>Sem dados ainda.</div>
              :(()=>{
                const colors=['#2D8653','#1A9E8A','#5B4FE8','#C4720A','#C4423A','#7B6EA8'];
                const maxVal=Math.max(...comparativoMensal.meses.map(m=>
                  Math.max(...comparativoMensal.promotoras.map(p=>comparativoMensal.data[m]?.[p]||0))
                ),1);
                return(
                  <div>
                    <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:8}}>
                      {comparativoMensal.meses.map(mes=>(
                        <div key={mes} style={{flex:1,minWidth:64,textAlign:'center'}}>
                          <div style={{display:'flex',flexDirection:'column-reverse',gap:3,height:120,justifyContent:'flex-start',alignItems:'center',marginBottom:6}}>
                            {comparativoMensal.promotoras.map((p,pi)=>{
                              const val=comparativoMensal.data[mes]?.[p]||0;
                              const h=Math.round(val/maxVal*100);
                              return val>0?(
                                <div key={p} title={`${p}: ${val}`} style={{width:24,height:`${h}%`,minHeight:val>0?4:0,background:colors[pi%colors.length],borderRadius:'3px 3px 0 0',transition:'height .5s',cursor:'default'}}/>
                              ):null;
                            })}
                          </div>
                          <div style={{fontSize:10,color:'var(--text-muted)'}}>{mes.substring(5)}/{mes.substring(2,4)}</div>
                        </div>
                      ))}
                    </div>
                    {/* Legenda */}
                    <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:8}}>
                      {comparativoMensal.promotoras.map((p,pi)=>(
                        <div key={p} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'var(--text-secondary)'}}>
                          <div style={{width:10,height:10,borderRadius:3,background:colors[pi%colors.length],flexShrink:0}}/>
                          {p}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()
            }
          </div>

          {/* Exportação */}
          <div className="card fu3" style={{padding:'18px 20px',minWidth:240}}>
            <div className="eyebrow" style={{marginBottom:14}}>Exportar relatório</div>
            <label style={{fontSize:11,color:'var(--text-muted)',display:'block',marginBottom:5}}>Promotora</label>
            <select className="sel" value={expProm} onChange={e=>setExpProm(e.target.value)} style={{marginBottom:8,fontSize:12}}>
              <option value="">Todas</option>
              {comparativoMensal.promotoras.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
            <label style={{fontSize:11,color:'var(--text-muted)',display:'block',marginBottom:5}}>De</label>
            <input type="date" className="inp" style={{marginBottom:8,padding:'7px 10px',fontSize:12}} value={expDe} onChange={e=>setExpDe(e.target.value)}/>
            <label style={{fontSize:11,color:'var(--text-muted)',display:'block',marginBottom:5}}>Até</label>
            <input type="date" className="inp" style={{marginBottom:14,padding:'7px 10px',fontSize:12}} value={expAte} onChange={e=>setExpAte(e.target.value)}/>
            <button className="btn" style={{width:'100%',justifyContent:'center',background:G_MID,color:'#fff',fontSize:12}} onClick={exportarRelatorio}>
              ⬇ Exportar CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
function CorbanClientes({clientes,profile,estrutura,onSelect,onNew}){
  const [search,setSearch]=useState('');
  const [stage,setStage]=useState('');
  const [digitalizador,setDigitalizador]=useState('');
  const [promotora,setPromotora]=useState('');
  const [produto,setProduto]=useState('');
  const [dataFrom,setDataFrom]=useState('');
  const [dataTo,setDataTo]=useState('');
  const [page,setPage]=useState(1);
  const PER=50;
  const r=profile?.role;

  // Unique digitalizadores e promotoras presentes nos clientes
  const digs=useMemo(()=>[...new Set(clientes.map(c=>c.digitalizadorNome).filter(Boolean))].sort(),[clientes]);
  const proms=useMemo(()=>[...new Set(clientes.map(c=>c.promotoraNome).filter(Boolean))].sort(),[clientes]);

  const hasFilter=search||stage||digitalizador||promotora||produto||dataFrom||dataTo;

  const filtered=useMemo(()=>clientes.filter(c=>{
    if(stage&&c.statusComercial!==stage) return false;
    if(digitalizador&&c.digitalizadorNome!==digitalizador) return false;
    if(promotora&&c.promotoraNome!==promotora) return false;
    if(produto&&!(c.produtosInteresse||[]).includes(produto)) return false;
    if(dataFrom&&c.dataEntrada<dataFrom) return false;
    if(dataTo&&c.dataEntrada>dataTo) return false;
    if(search){
      const s=search.toLowerCase();
      if(!c.nomeCliente?.toLowerCase().includes(s)&&!c.cpfCliente?.includes(s)&&!c.orgaoPrefeitura?.toLowerCase().includes(s)) return false;
    }
    return true;
  }),[clientes,search,stage,digitalizador,promotora,produto,dataFrom,dataTo]);

  const totalPages=Math.max(1,Math.ceil(filtered.length/PER));
  const paged=filtered.slice((page-1)*PER,page*PER);

  const clearFilters=()=>{setSearch('');setStage('');setDigitalizador('');setPromotora('');setProduto('');setDataFrom('');setDataTo('');setPage(1);};

  // Export to CSV/Excel
  const exportCSV=()=>{
    const headers=['Nome','CPF','Órgão','Estágio','Produto','Documento','Digitalizador','Promotora','Promotora Principal','Data Entrada','Último Contato'];
    const rows=filtered.map(c=>[
      c.nomeCliente||'',c.cpfCliente||'',c.orgaoPrefeitura||'',
      c.statusComercial||'',
      (c.produtosInteresse||[]).join('; '),
      c.documentoStatus||'',
      c.digitalizadorNome||'',c.promotoraNome||'',c.promotoraPrincipalNome||'',
      c.dataEntrada||'',c.ultimoContato||''
    ]);
    const csv=[headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=`clientes_corbans_${TODAY}.csv`;a.click();
    URL.revokeObjectURL(url);
  };

  return(
    <div style={{padding:'28px 32px'}}>
      <div className="fu" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:16}}>
        <div>
          <div className="section-title">{r==='digitalizador'?'Meus Clientes':'Clientes'}</div>
          <div className="section-sub">{filtered.length} de {clientes.length} registros{totalPages>1?` · Pág ${page}/${totalPages}`:''}</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-ghost" style={{fontSize:12,padding:'7px 12px'}} onClick={exportCSV}>⬇ Exportar CSV</button>
          <button className="btn" style={{background:G_MID,color:'#fff',boxShadow:`0 3px 16px ${G_GLOW}`}} onClick={onNew}>
            <span style={{fontSize:16,lineHeight:1}}>+</span> Novo Cliente
          </button>
        </div>
      </div>

      {/* Filtros linha 1 */}
      <div className="fu1" style={{display:'flex',gap:8,marginBottom:8,flexWrap:'wrap'}}>
        <div className="search-wrap" style={{flex:1,minWidth:200}}>
          <span className="search-icon">⌕</span>
          <input className="inp" placeholder="Nome, CPF ou órgão…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
        </div>
        <select className="sel" style={{width:150}} value={stage} onChange={e=>{setStage(e.target.value);setPage(1);}}>
          <option value="">Todos estágios</option>
          {CORBAN_STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select className="sel" style={{width:150}} value={produto} onChange={e=>{setProduto(e.target.value);setPage(1);}}>
          <option value="">Todos produtos</option>
          {CORBAN_PRODUCTS.map(p=><option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Filtros linha 2 — para master, pp e promotora */}
      {(r==='master'||r==='promotora_principal'||r==='promotora')&&(
        <div style={{display:'flex',gap:8,marginBottom:8,flexWrap:'wrap'}}>
          {r==='master'&&(
            <select className="sel" style={{width:180}} value={promotora} onChange={e=>{setPromotora(e.target.value);setPage(1);}}>
              <option value="">Todas promotoras</option>
              {proms.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          )}
          <select className="sel" style={{width:200}} value={digitalizador} onChange={e=>{setDigitalizador(e.target.value);setPage(1);}}>
            <option value="">Todos digitalizadores</option>
            {digs.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <label style={{fontSize:11,color:'var(--text-muted)',whiteSpace:'nowrap'}}>De</label>
            <input type="date" className="inp" style={{width:136,padding:'8px 10px'}} value={dataFrom} onChange={e=>{setDataFrom(e.target.value);setPage(1);}}/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <label style={{fontSize:11,color:'var(--text-muted)',whiteSpace:'nowrap'}}>Até</label>
            <input type="date" className="inp" style={{width:136,padding:'8px 10px'}} value={dataTo} onChange={e=>{setDataTo(e.target.value);setPage(1);}}/>
          </div>
          {hasFilter&&<button className="btn btn-ghost" style={{fontSize:12}} onClick={clearFilters}>✕ Limpar</button>}
        </div>
      )}
      {r==='digitalizador'&&hasFilter&&<div style={{marginBottom:8}}><button className="btn btn-ghost" style={{fontSize:12}} onClick={clearFilters}>✕ Limpar filtros</button></div>}

      <div className="fu2 card" style={{overflow:'hidden',marginBottom:16}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead>
              <tr style={{background:'rgba(90,70,50,.04)',borderBottom:'1px solid var(--border)'}}>
                {['Nome / CPF','Órgão','Estágio','Produto','Documento',
                  ...(r!=='digitalizador'?['Digitalizador']:['Promotora']),
                  'Entrada',''].map(h=>(
                  <th key={h} style={{padding:'11px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.08em',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map(c=>(
                <tr key={c.id} className="trow" onClick={()=>onSelect(c.id)}>
                  <td style={{padding:'12px 14px'}}><div style={{fontWeight:600}}>{c.nomeCliente}</div><div style={{fontSize:11,color:'var(--text-muted)',marginTop:1}}>{c.cpfCliente}</div></td>
                  <td style={{padding:'12px 14px',color:'var(--text-secondary)',fontSize:12}}>{c.orgaoPrefeitura||'—'}</td>
                  <td style={{padding:'12px 14px'}}><StageTag stageId={c.statusComercial}/></td>
                  <td style={{padding:'12px 14px',fontSize:11,color:'var(--text-secondary)'}}>{(c.produtosInteresse||[]).slice(0,1).join('') ||'—'}</td>
                  <td style={{padding:'12px 14px'}}><span style={{fontSize:11,fontWeight:600,color:c.documentoStatus==='Aprovado'?'var(--success)':c.documentoStatus==='Não solicitado'?'var(--text-faint)':'var(--amber)'}}>{c.documentoStatus}</span></td>
                  <td style={{padding:'12px 14px',fontSize:12,color:'var(--text-secondary)'}}>
                    {r!=='digitalizador'
                      ?<div><div>{c.digitalizadorNome||'—'}</div><div style={{fontSize:10,color:'var(--text-faint)'}}>{c.promotoraNome||''}</div></div>
                      :<div>{c.promotoraNome||'—'}</div>
                    }
                  </td>
                  <td style={{padding:'12px 14px',fontSize:11,color:'var(--text-secondary)',whiteSpace:'nowrap'}}>{fmtD(c.dataEntrada)}</td>
                  <td style={{padding:'12px 14px',color:'var(--text-muted)',fontSize:16}}>›</td>
                </tr>
              ))}
              {paged.length===0&&<tr><td colSpan={8} style={{padding:'40px 0',textAlign:'center',color:'var(--text-muted)',fontSize:13}}>Nenhum cliente encontrado{hasFilter&&<> — <button onClick={clearFilters} style={{background:'none',border:'none',cursor:'pointer',color:G_MID,fontSize:13}}>limpar filtros</button></>}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages>1&&(
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
          <button className="btn btn-ghost" style={{padding:'6px 12px',fontSize:12}} onClick={()=>setPage(1)} disabled={page===1}>«</button>
          <button className="btn btn-ghost" style={{padding:'6px 12px',fontSize:12}} onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>‹</button>
          {Array.from({length:totalPages},(_,i)=>i+1).filter(p=>p===1||p===totalPages||Math.abs(p-page)<=2).map((p,i,arr)=>[
            i>0&&arr[i-1]!==p-1?<span key={`e${i}`} style={{padding:'0 4px',fontSize:12,color:'var(--text-muted)'}}>…</span>:null,
            <button key={p} onClick={()=>setPage(p)} style={{width:32,height:32,borderRadius:8,border:'none',cursor:'pointer',fontSize:12,fontWeight:p===page?600:400,background:p===page?G_MID:'transparent',color:p===page?'#fff':'var(--text-secondary)'}}>{p}</button>
          ])}
          <button className="btn btn-ghost" style={{padding:'6px 12px',fontSize:12}} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>›</button>
          <button className="btn btn-ghost" style={{padding:'6px 12px',fontSize:12}} onClick={()=>setPage(totalPages)} disabled={page===totalPages}>»</button>
        </div>
      )}
    </div>
  );
}

// ── DETAIL PANEL ──────────────────────────────────────────────────────────────
function CorbanDetail({cliente,profile,session,dispatch,onClose}){
  const [tab,setTab]=useState('info');
  const [note,setNote]=useState('');
  const [es,setEs]=useState(cliente.statusComercial);
  const [ed,setEd]=useState(cliente.documentoStatus);
  const [docs,setDocs]=useState(cliente.documentos||[]);
  const [uploading,setUploading]=useState(false);
  const [uploadMsg,setUploadMsg]=useState(null);
  // Proposta
  const [propValor,setPropValor]=useState(cliente.proposta_valor||'');
  const [propTaxa,setPropTaxa]=useState(cliente.proposta_taxa||'');
  const [propPrazo,setPropPrazo]=useState(cliente.proposta_prazo||'');
  const [propAnotacao,setPropAnotacao]=useState(cliente.proposta_anotacao||'');
  // Proteção de edição
  const [bloqueioModal,setBloqueioModal]=useState(null); // null | {tipo, novoValor}
  const [enviandoNotif,setEnviandoNotif]=useState(false);
  const [notifEnviada,setNotifEnviada]=useState(false);

  const days=sinceD(cliente.ultimoContato);
  const r=profile?.role;
  // Promotora e PP não podem editar diretamente clientes de digitalizadores
  const isRestrito=(r==='promotora'||r==='promotora_principal')&&!!cliente.digitalizador_id;

  const salvarProposta=()=>{
    dispatch({type:'UPD',c:{...cliente,proposta_valor:propValor,proposta_taxa:propTaxa,proposta_prazo:propPrazo,proposta_anotacao:propAnotacao}});
  };

  // Bloqueio: ao tentar mover estágio ou alterar documento, pede confirmação via notificação
  const tentarSalvar=async()=>{
    if(!isRestrito){
      // Digitalizador e master podem salvar diretamente
      const upd={...cliente,documentoStatus:ed,documentos:docs};
      if(es!==cliente.statusComercial) dispatch({type:'MOVE',cid:cliente.id,st:es,user:profile?.nome||'Usuário'});
      dispatch({type:'UPD',c:upd});
      onClose();
      return;
    }
    // Verificar se houve mudança
    const mudouEstagio=es!==cliente.statusComercial;
    const mudouDoc=ed!==cliente.documentoStatus;
    if(!mudouEstagio&&!mudouDoc){onClose();return;}
    // Mostrar modal de bloqueio
    setBloqueioModal({
      mudouEstagio,mudouDoc,
      novoEstagio:es,novoDoc:ed,
    });
  };

  const enviarSolicitacao=async()=>{
    if(!bloqueioModal||!cliente.digitalizador_id) return;
    setEnviandoNotif(true);
    const partes=[];
    if(bloqueioModal.mudouEstagio) partes.push(`mover para estágio "${CORBAN_STAGES.find(s=>s.id===bloqueioModal.novoEstagio)?.label||bloqueioModal.novoEstagio}"`);
    if(bloqueioModal.mudouDoc) partes.push(`alterar documento para "${bloqueioModal.novoDoc}"`);
    const msg=`${profile.nome} (${ROLE_LABELS[r]}) solicitou: ${partes.join(' e ')} no cliente "${cliente.nomeCliente}". Confirme ou ignore.`;
    await supabase.from('corban_notificacoes').insert({
      de_user_id:session?.user?.id,
      de_nome:profile.nome,
      de_role:profile.role,
      para_user_id:cliente.digitalizador_id,
      para_nome:cliente.digitalizadorNome||'Digitalizador',
      para_role:'digitalizador',
      mensagem:msg,
    });
    setEnviandoNotif(false);
    setNotifEnviada(true);
    setTimeout(()=>{setBloqueioModal(null);setNotifEnviada(false);onClose();},2500);
  };

  const handleUpload=async(e)=>{
    const file=e.target.files[0];
    if(!file) return;
    if(file.size>10*1024*1024){setUploadMsg({t:'error',text:'Arquivo muito grande. Máximo 10MB.'});return;}
    setUploading(true);setUploadMsg(null);
    const path=`corbans/${cliente.id}/${Date.now()}_${file.name}`;
    const {error}=await supabase.storage.from('documentos').upload(path,file);
    if(error){setUploadMsg({t:'error',text:'Erro ao enviar. Tente novamente.'});setUploading(false);return;}
    const {data:{publicUrl}}=supabase.storage.from('documentos').getPublicUrl(path);
    const novoDoc={nome:file.name,path,url:publicUrl,data:TODAY,enviadoPor:profile?.nome||'Usuário'};
    const novos=[...docs,novoDoc];
    setDocs(novos);
    dispatch({type:'UPD',c:{...cliente,documentos:novos,documentoStatus:ed}});
    setUploadMsg({t:'success',text:`"${file.name}" enviado com sucesso!`});
    setUploading(false);
    e.target.value='';
  };

  const handleDelete=async(doc)=>{
    if(!confirm(`Remover "${doc.nome}"?`)) return;
    await supabase.storage.from('documentos').remove([doc.path]);
    const novos=docs.filter(d=>d.path!==doc.path);
    setDocs(novos);
    dispatch({type:'UPD',c:{...cliente,documentos:novos}});
  };

  const openDoc=async(path)=>{
    const {data}=await supabase.storage.from('documentos').createSignedUrl(path,3600);
    if(data?.signedUrl) window.open(data.signedUrl,'_blank');
  };

  const fileIcon=(nome)=>{
    const ext=nome.split('.').pop().toLowerCase();
    if(['jpg','jpeg','png','gif','webp'].includes(ext)) return '🖼️';
    if(ext==='pdf') return '📄';
    if(['doc','docx'].includes(ext)) return '📝';
    if(['xls','xlsx'].includes(ext)) return '📊';
    return '📎';
  };

  const hasProposta=propValor||propTaxa||propPrazo;

  return(
    <>
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
              {isRestrito&&<span style={{fontSize:10,padding:'2px 8px',borderRadius:99,background:'var(--amber-dim)',color:'var(--amber)',fontWeight:600}}>👁 Somente leitura</span>}
            </div>
          </div>
          <button onClick={onClose} style={{background:'rgba(90,70,50,.08)',border:'1px solid var(--border-mid)',borderRadius:8,color:'var(--text-secondary)',cursor:'pointer',width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>×</button>
        </div>
      </div>

      <div style={{display:'flex',borderBottom:'1px solid var(--border)',background:'var(--bg-card)',overflowX:'auto'}}>
        {[
          ['info','Informações'],
          ['proposta',`Proposta${hasProposta?' ✓':''}`],
          ['activity','Atividades'],
          ['docs',`Documentos${docs.length>0?` (${docs.length})`:''}`],
        ].map(([id,lb])=>(
          <button key={id} className={`ptab ${tab===id?'on':''}`} onClick={()=>setTab(id)} style={{whiteSpace:'nowrap'}}>{lb}</button>
        ))}
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}>
        {tab==='info'&&(
          <div>
            <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,overflow:'hidden',marginBottom:16}}>
              {[
                ['Telefone',cliente.telefone||'—'],
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
              {isRestrito&&(
                <div style={{padding:'8px 12px',borderRadius:8,marginBottom:10,background:'var(--amber-dim)',border:'1px solid rgba(196,114,10,.2)',fontSize:12,color:'var(--amber)'}}>
                  ⚠ Alterações precisam ser confirmadas pelo digitalizador responsável.
                </div>
              )}
              <label style={{fontSize:12,color:'var(--text-muted)',display:'block',marginBottom:5}}>Estágio</label>
              <select className="sel" value={es} onChange={e=>setEs(e.target.value)} style={{marginBottom:10}}>
                {CORBAN_STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <label style={{fontSize:12,color:'var(--text-muted)',display:'block',marginBottom:5}}>Documento</label>
              <select className="sel" value={ed} onChange={e=>setEd(e.target.value)} style={{marginBottom:14}}>
                {DOC_STATUS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <button className="btn" style={{width:'100%',justifyContent:'center',background:isRestrito?'var(--amber)':G_MID,color:'#fff',boxShadow:`0 3px 12px ${isRestrito?'rgba(196,114,10,.35)':G_GLOW}`}} onClick={tentarSalvar}>
                {isRestrito?'📣 Solicitar alteração':'Salvar alterações'}
              </button>
            </div>
          </div>
        )}

        {tab==='proposta'&&(
          <div>
            <div style={{padding:'12px 14px',background:G_LIGHT,borderRadius:10,border:`1px solid ${G_MID}25`,marginBottom:16}}>
              <div style={{fontSize:11,color:G_MID,fontWeight:600,marginBottom:2}}>💰 Dados da Proposta</div>
              <div style={{fontSize:11,color:'var(--text-muted)'}}>Informações financeiras do cliente</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>Valor desejado</label>
                <input className="inp" value={propValor} onChange={e=>setPropValor(e.target.value)} placeholder="R$ 0,00"
                  readOnly={isRestrito} style={{background:isRestrito?'var(--bg-base)':'',cursor:isRestrito?'not-allowed':''}}/>
              </div>
              <div>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>Taxa (% ao mês)</label>
                <input className="inp" value={propTaxa} onChange={e=>setPropTaxa(e.target.value)} placeholder="0,00%"
                  readOnly={isRestrito} style={{background:isRestrito?'var(--bg-base)':'',cursor:isRestrito?'not-allowed':''}}/>
              </div>
              <div>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>Prazo (meses)</label>
                <input className="inp" type="number" value={propPrazo} onChange={e=>setPropPrazo(e.target.value)} placeholder="Ex: 48"
                  readOnly={isRestrito} style={{background:isRestrito?'var(--bg-base)':'',cursor:isRestrito?'not-allowed':''}}/>
              </div>
              {propValor&&propPrazo&&(
                <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:9,padding:'12px',display:'flex',flexDirection:'column',justifyContent:'center'}}>
                  <div style={{fontSize:9,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:4}}>Parcela estimada</div>
                  <div style={{fontSize:18,fontWeight:700,color:G_MID}}>
                    {(()=>{
                      const v=parseFloat(propValor.replace(/[^0-9,.]/g,'').replace(',','.'));
                      const n=parseInt(propPrazo);
                      const t=parseFloat(propTaxa.replace(/[^0-9,.]/g,'').replace(',','.'))/100;
                      if(!v||!n) return '—';
                      if(!t) return `R$ ${(v/n).toFixed(2).replace('.',',')}`;
                      const p=v*(t*Math.pow(1+t,n))/(Math.pow(1+t,n)-1);
                      return `R$ ${p.toFixed(2).replace('.',',')}`;
                    })()}
                  </div>
                </div>
              )}
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>Anotação</label>
              <textarea className="inp" value={propAnotacao} onChange={e=>setPropAnotacao(e.target.value)}
                placeholder="Observações sobre a proposta, condições especiais, negociações…"
                style={{resize:'vertical',minHeight:80,fontFamily:'var(--font)',lineHeight:1.5}}
                readOnly={isRestrito}/>
            </div>
            {!isRestrito&&(
              <button className="btn" style={{width:'100%',justifyContent:'center',background:G_MID,color:'#fff',boxShadow:`0 3px 12px ${G_GLOW}`}} onClick={salvarProposta}>
                Salvar proposta
              </button>
            )}
            {isRestrito&&(
              <div style={{padding:'9px 12px',borderRadius:8,background:'var(--amber-dim)',border:'1px solid rgba(196,114,10,.2)',fontSize:12,color:'var(--amber)'}}>
                👁 Você está visualizando a proposta. Apenas o digitalizador pode editar.
              </div>
            )}
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
          <div>
            <div style={{marginBottom:16}}>
              <div className="eyebrow" style={{marginBottom:10}}>Enviar documento</div>
              <label style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,padding:'22px 16px',borderRadius:12,cursor:'pointer',border:`2px dashed ${uploading?G_MID:'var(--border-mid)'}`,background:uploading?G_LIGHT:'rgba(90,70,50,.03)',transition:'all .15s'}}
                onMouseEnter={e=>{if(!uploading){e.currentTarget.style.background=G_LIGHT;e.currentTarget.style.borderColor=G_MID;}}}
                onMouseLeave={e=>{if(!uploading){e.currentTarget.style.background='rgba(90,70,50,.03)';e.currentTarget.style.borderColor='var(--border-mid)';}}}
              >
                <input type="file" style={{display:'none'}} onChange={handleUpload} disabled={uploading}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"/>
                <div style={{fontSize:26}}>{uploading?'⏳':'📤'}</div>
                <div style={{fontSize:13,fontWeight:600,color:'var(--text-primary)'}}>{uploading?'Enviando…':'Clique para enviar arquivo'}</div>
                <div style={{fontSize:11,color:'var(--text-muted)'}}>PDF, Word, Excel, Imagens · Máx. 10MB</div>
              </label>
              {uploadMsg&&(
                <div style={{marginTop:10,padding:'9px 12px',borderRadius:8,fontSize:12,fontWeight:500,background:uploadMsg.t==='success'?'var(--success-dim)':'var(--danger-dim)',color:uploadMsg.t==='success'?'var(--success)':'var(--danger)',border:`1px solid ${uploadMsg.t==='success'?'rgba(30,143,94,.2)':'rgba(196,66,58,.2)'}`}}>
                  {uploadMsg.t==='success'?'✓':'⚠'} {uploadMsg.text}
                </div>
              )}
            </div>
            <div className="eyebrow" style={{marginBottom:10}}>Documentos {docs.length>0&&<span style={{fontWeight:400,color:'var(--text-faint)'}}>({docs.length})</span>}</div>
            {docs.length===0?(
              <div style={{textAlign:'center',padding:'28px 0',fontSize:13,color:'var(--text-muted)'}}>
                <div style={{fontSize:28,marginBottom:8}}>📁</div>Nenhum documento enviado ainda.
              </div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {docs.map((doc,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,transition:'all .15s'}}>
                    <div style={{fontSize:22,flexShrink:0}}>{fileIcon(doc.nome)}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:'var(--text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{doc.nome}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)',marginTop:1}}>{fmtD(doc.data)} · {doc.enviadoPor}</div>
                    </div>
                    <div style={{display:'flex',gap:6,flexShrink:0}}>
                      <button className="btn btn-ghost" style={{padding:'5px 10px',fontSize:11}} onClick={()=>openDoc(doc.path)}>↓ Abrir</button>
                      <button onClick={()=>handleDelete(doc)} style={{padding:'5px 10px',borderRadius:7,fontSize:11,fontWeight:600,cursor:'pointer',background:'var(--danger-dim)',color:'var(--danger)',border:'1px solid rgba(196,66,58,.2)'}}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Modal de bloqueio — solicitar confirmação ao digitalizador */}
    {bloqueioModal&&(
      <div className="mbk" style={{zIndex:9999}} onClick={e=>{if(e.target===e.currentTarget){setBloqueioModal(null);}}}>
        <div className="mbox" style={{maxWidth:400}}>
          {notifEnviada?(
            <div style={{textAlign:'center',padding:'24px 0'}}>
              <div style={{fontSize:40,marginBottom:12}}>✅</div>
              <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:600,color:'var(--text-primary)',marginBottom:8}}>Solicitação enviada!</div>
              <div style={{fontSize:13,color:'var(--text-muted)',lineHeight:1.6}}>
                O digitalizador <strong>{cliente.digitalizadorNome}</strong> recebeu uma notificação e poderá confirmar a alteração.
              </div>
            </div>
          ):(
            <>
              <div style={{textAlign:'center',marginBottom:20}}>
                <div style={{fontSize:36,marginBottom:12}}>🔒</div>
                <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:600,color:'var(--text-primary)',marginBottom:8}}>Alteração restrita</div>
                <div style={{fontSize:13,color:'var(--text-muted)',lineHeight:1.6}}>
                  Você não pode editar diretamente clientes de digitalizadores.<br/>
                  Deseja enviar uma solicitação para <strong>{cliente.digitalizadorNome}</strong> confirmar?
                </div>
              </div>
              <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:9,padding:'12px 14px',marginBottom:16,fontSize:12,color:'var(--text-secondary)',lineHeight:1.7}}>
                {bloqueioModal.mudouEstagio&&<div>📌 Mover para: <strong>{CORBAN_STAGES.find(s=>s.id===bloqueioModal.novoEstagio)?.label}</strong></div>}
                {bloqueioModal.mudouDoc&&<div>📄 Documento: <strong>{bloqueioModal.novoDoc}</strong></div>}
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn btn-ghost" style={{flex:1,justifyContent:'center'}} onClick={()=>setBloqueioModal(null)}>Cancelar</button>
                <button className="btn" style={{flex:1,justifyContent:'center',background:'var(--amber)',color:'#fff'}} onClick={enviarSolicitacao} disabled={enviandoNotif}>
                  {enviandoNotif?'Enviando…':'📣 Enviar solicitação'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )}
    </>
  );
}


// ── KANBAN CORBANS ────────────────────────────────────────────────────────────
function CorbanKanban({clientes,profile,dispatch,onSelect}){
  const [dragId,setDragId]=useState(null);
  const [search,setSearch]=useState('');
  const r=profile?.role;

  const filtered=search.trim()
    ?clientes.filter(c=>
        c.nomeCliente?.toLowerCase().includes(search.toLowerCase())||
        c.cpfCliente?.includes(search)||
        c.orgaoPrefeitura?.toLowerCase().includes(search.toLowerCase()))
    :clientes;

  const isSearching=search.trim().length>0;

  return(
    <div style={{padding:'28px 32px',overflowX:'auto'}}>
      <div className="fu" style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,gap:16}}>
        <div style={{flexShrink:0}}>
          <div className="section-title">Pipeline</div>
          <div className="section-sub">
            {isSearching
              ?`${filtered.length} resultado${filtered.length!==1?'s':''} para "${search}"`
              :`${clientes.length} clientes · arraste para mover entre estágios`}
          </div>
        </div>
        <div style={{position:'relative',width:260,flexShrink:0}}>
          <span style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'var(--text-faint)',fontSize:13,pointerEvents:'none'}}>⌕</span>
          <input className="inp" style={{paddingLeft:32,paddingRight:search?32:12,fontSize:12,height:36}}
            placeholder="Buscar cliente…" value={search} onChange={e=>setSearch(e.target.value)}/>
          {search&&(
            <button onClick={()=>setSearch('')} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'rgba(90,70,50,.08)',border:'none',borderRadius:'50%',cursor:'pointer',width:18,height:18,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'var(--text-muted)'}}>×</button>
          )}
        </div>
      </div>

      <div style={{display:'flex',gap:10,alignItems:'flex-start',minWidth:'max-content',paddingBottom:16}}>
        {CORBAN_STAGES.map((s,si)=>{
          const sl=filtered.filter(c=>c.statusComercial===s.id);
          const total=clientes.filter(c=>c.statusComercial===s.id).length;
          const [over,setOver]=useState(false);
          return(
            <div key={s.id} className={`kcol ${over?'dover':''}`} style={{animationDelay:`${si*.04}s`}}
              onDragOver={e=>{e.preventDefault();setOver(true);}}
              onDragLeave={()=>setOver(false)}
              onDrop={()=>{
                setOver(false);
                if(dragId) dispatch({type:'MOVE',cid:dragId,st:s.id,user:profile?.nome||'Usuário'});
                setDragId(null);
              }}>
              <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:11,padding:'0 3px'}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:s.color,boxShadow:`0 0 5px ${s.color}60`,flexShrink:0}}/>
                <span style={{fontSize:12,fontWeight:600,color:'var(--text-secondary)',flex:1}}>{s.label}</span>
                <span style={{fontSize:11,fontWeight:700,background:s.bg,color:s.color,borderRadius:99,padding:'1px 6px'}}>
                  {isSearching?`${sl.length}/${total}`:sl.length}
                </span>
              </div>
              <div style={{minHeight:44}}>
                {sl.map(c=>(
                  <div key={c.id} className="kcard fu" draggable
                    onDragStart={()=>setDragId(c.id)}
                    onClick={()=>onSelect(c.id)}
                    style={{position:'relative',zIndex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--text-primary)',lineHeight:1.3,marginBottom:5}}>{c.nomeCliente}</div>
                    <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:6}}>{c.orgaoPrefeitura||c.cpfCliente}</div>
                    {(c.produtosInteresse||[]).length>0&&(
                      <div style={{marginBottom:7}}>
                        <span style={{fontSize:10,padding:'2px 7px',borderRadius:99,background:G_LIGHT,color:G_MID,fontWeight:600}}>
                          {c.produtosInteresse[0]}
                          {c.produtosInteresse.length>1&&` +${c.produtosInteresse.length-1}`}
                        </span>
                      </div>
                    )}
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:10,color:'var(--text-faint)'}}>{fmtD(c.ultimoContato)}</span>
                      <span style={{fontSize:10,fontWeight:600,color:c.documentoStatus==='Aprovado'?'var(--success)':c.documentoStatus==='Não solicitado'?'var(--text-faint)':'var(--amber)'}}>
                        📄 {c.documentoStatus}
                      </span>
                    </div>
                    {r!=='digitalizador'&&c.digitalizadorNome&&(
                      <div style={{marginTop:6,paddingTop:6,borderTop:'1px solid var(--border)',fontSize:10,color:'var(--text-muted)'}}>
                        {c.digitalizadorNome}
                      </div>
                    )}
                  </div>
                ))}
                {sl.length===0&&(
                  <div style={{textAlign:'center',padding:'18px 0',fontSize:11,color:'var(--text-faint)',letterSpacing:'.04em'}}>
                    {isSearching?'Sem resultado':'Solte aqui'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── SINO — NOTIFICAÇÕES ───────────────────────────────────────────────────────
function SinoModal({profile,session,estrutura,notifs,onClose,onLer,onEnviar}){
  const [aba,setAba]=useState('recebidas'); // 'recebidas' | 'enviar'
  const r=profile?.role;

  // Quem esse perfil pode notificar
  const destinatarios=useMemo(()=>{
    if(r==='master') return estrutura.filter(u=>u.role!=='master'&&u.modulo==='corbans');
    if(r==='promotora_principal') return estrutura.filter(u=>u.promotora_principal_email===profile?.email);
    if(r==='promotora') return estrutura.filter(u=>u.promotora_email===profile?.email);
    return [];
  },[estrutura,r,profile?.email]);

  const [dest,setDest]=useState('');
  const [msg,setMsg]=useState('');
  const [enviando,setEnviando]=useState(false);
  const [enviado,setEnviado]=useState(false);

  const naoLidas=notifs.filter(n=>!n.lida);
  const lidas=notifs.filter(n=>n.lida);

  const fmtTs=ts=>new Date(ts).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});

  const enviar=async()=>{
    if(!dest||!msg.trim()) return;
    setEnviando(true);
    const destUser=estrutura.find(u=>u.email===dest);
    // Buscar profile do destinatário para ter o user_id
    const {data:destProfile}=await supabase.from('profiles').select('id,nome').ilike('email',dest).single();
    if(!destProfile){setEnviando(false);alert('Usuário não encontrado.');return;}
    await supabase.from('corban_notificacoes').insert({
      de_user_id:session.user.id,
      de_nome:profile.nome,
      de_role:profile.role,
      para_user_id:destProfile.id,
      para_nome:destProfile.nome,
      para_role:destUser?.role||'',
      mensagem:msg.trim(),
    });
    setEnviando(false);setEnviado(true);setMsg('');setDest('');
    setTimeout(()=>setEnviado(false),3000);
    if(onEnviar) onEnviar();
  };

  return(
    <div className="mbk" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="mbox" style={{maxWidth:480}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div>
            <div style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:600,color:'var(--text-primary)'}}>🔔 Notificações</div>
            {naoLidas.length>0&&<div style={{fontSize:12,color:'var(--danger)',marginTop:2}}>{naoLidas.length} não lida{naoLidas.length!==1?'s':''}</div>}
          </div>
          <button onClick={onClose} style={{background:'rgba(90,70,50,.08)',border:'1px solid var(--border-mid)',borderRadius:9,color:'var(--text-secondary)',cursor:'pointer',width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>×</button>
        </div>

        <div style={{display:'flex',gap:4,marginBottom:16,background:'rgba(90,70,50,.06)',borderRadius:9,padding:3}}>
          {([['recebidas','Recebidas'],...(destinatarios.length>0?[['enviar','Enviar alerta']]:[])])
            .map(([v,l])=>(
            <button key={v} onClick={()=>setAba(v)} style={{flex:1,padding:'7px 0',borderRadius:7,fontSize:12,fontWeight:600,cursor:'pointer',border:'none',fontFamily:'var(--font)',background:aba===v?'var(--bg-elevated)':'transparent',color:aba===v?'var(--text-primary)':'var(--text-muted)',transition:'all .15s'}}>{l}</button>
          ))}
        </div>

        {aba==='recebidas'&&(
          <div style={{maxHeight:360,overflowY:'auto'}}>
            {notifs.length===0?(
              <div style={{textAlign:'center',padding:'32px 0',fontSize:13,color:'var(--text-muted)'}}>
                <div style={{fontSize:28,marginBottom:8}}>🔕</div>
                Nenhuma notificação ainda.
              </div>
            ):[...naoLidas,...lidas].map(n=>(
              <div key={n.id} style={{
                display:'flex',gap:12,padding:'12px 0',borderBottom:'1px solid var(--border)',
                opacity:n.lida?.8:1,
              }}>
                <div style={{width:36,height:36,borderRadius:10,background:n.lida?'rgba(90,70,50,.06)':G_LIGHT,color:n.lida?'var(--text-muted)':G_MID,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>📣</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                    <span style={{fontSize:12,fontWeight:600,color:'var(--text-primary)'}}>{n.de_nome}</span>
                    <span style={{fontSize:10,color:'var(--text-faint)'}}>{fmtTs(n.created_at)}</span>
                  </div>
                  <div style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.5}}>{n.mensagem}</div>
                  {!n.lida&&(
                    <button onClick={()=>onLer(n.id)} style={{marginTop:5,fontSize:11,color:G_MID,background:'none',border:'none',cursor:'pointer',fontFamily:'var(--font)',padding:0,fontWeight:600}}>Marcar como lida ✓</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {aba==='enviar'&&(
          <div>
            {enviado&&<div style={{padding:'10px 14px',background:'var(--success-dim)',borderRadius:8,marginBottom:14,fontSize:13,color:'var(--success)',fontWeight:500}}>✓ Alerta enviado com sucesso!</div>}
            <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>Destinatário</label>
            <select className="sel" value={dest} onChange={e=>setDest(e.target.value)} style={{marginBottom:12}}>
              <option value="">— Selecionar —</option>
              {destinatarios.map(u=>(
                <option key={u.email} value={u.email}>{u.nome} ({ROLE_LABELS[u.role]})</option>
              ))}
            </select>
            <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>Mensagem</label>
            <textarea className="inp" value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Digite o alerta ou mensagem…" style={{resize:'vertical',minHeight:80,fontFamily:'var(--font)',lineHeight:1.5,marginBottom:14}}/>
            <button className="btn" style={{width:'100%',justifyContent:'center',background:G_MID,color:'#fff',boxShadow:`0 3px 12px ${G_GLOW}`}} onClick={enviar} disabled={enviando||!dest||!msg.trim()}>
              {enviando?'Enviando…':'📣 Enviar alerta'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── NOVO CLIENTE MODAL (com autocomplete CPF) ─────────────────────────────────
function NovoClienteField({label,children}){
  return(
    <div>
      <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>{label}</label>
      {children}
    </div>
  );
}

function NovoClienteModal({profile,dispatch,onClose,todosClientes}){
  const [form,setForm]=useState(blankCliente());
  const [cpfAviso,setCpfAviso]=useState(null); // null | 'duplicado' | 'encontrado'
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const tp=p=>set('produtosInteresse',form.produtosInteresse.includes(p)?form.produtosInteresse.filter(x=>x!==p):[...form.produtosInteresse,p]);

  // Autocomplete CPF
  const handleCpf=(val)=>{
    set('cpfCliente',val);
    if(val.replace(/\D/g,'').length>=11){
      const cpfClean=val.replace(/\D/g,'');
      const existe=todosClientes?.find(c=>c.cpfCliente?.replace(/\D/g,'')===cpfClean);
      if(existe){
        // CPF já existe — autocompletar e avisar
        setCpfAviso('duplicado');
        setForm(f=>({...f,
          cpfCliente:val,
          nomeCliente:existe.nomeCliente||f.nomeCliente,
          telefone:existe.telefone||f.telefone,
          orgaoPrefeitura:existe.orgaoPrefeitura||f.orgaoPrefeitura,
        }));
      } else {
        setCpfAviso(null);
      }
    } else {
      setCpfAviso(null);
    }
  };

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

        {/* Aviso CPF duplicado */}
        {cpfAviso==='duplicado'&&(
          <div style={{padding:'9px 12px',borderRadius:8,marginBottom:12,background:'var(--amber-dim)',border:'1px solid rgba(196,114,10,.25)',fontSize:12,color:'var(--amber)',fontWeight:500}}>
            ⚠ CPF já cadastrado na base. Dados preenchidos automaticamente — verifique antes de salvar.
          </div>
        )}

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:11,marginBottom:11}}>
          <NovoClienteField label="CPF *">
            <input className="inp" value={form.cpfCliente} onChange={e=>handleCpf(e.target.value)} placeholder="000.000.000-00" style={{borderColor:cpfAviso==='duplicado'?'var(--amber)':'var(--border-mid)'}}/>
          </NovoClienteField>
          <NovoClienteField label="Nome do cliente *">
            <input className="inp" value={form.nomeCliente} onChange={e=>set('nomeCliente',e.target.value)} placeholder="Nome completo"/>
          </NovoClienteField>
          <NovoClienteField label="Telefone"><input className="inp" value={form.telefone} onChange={e=>set('telefone',e.target.value)} placeholder="(00) 00000-0000"/></NovoClienteField>
          <NovoClienteField label="Órgão / Prefeitura"><input className="inp" value={form.orgaoPrefeitura} onChange={e=>set('orgaoPrefeitura',e.target.value)} placeholder="Prefeitura de…"/></NovoClienteField>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:8}}>Produtos de interesse</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {CORBAN_PRODUCTS.map(p=>{const sel=form.produtosInteresse.includes(p);return(<button key={p} onClick={()=>tp(p)} style={{padding:'5px 11px',borderRadius:99,fontSize:12,fontWeight:600,cursor:'pointer',background:sel?G_LIGHT:'rgba(90,70,50,.07)',color:sel?G_MID:'var(--text-muted)',border:sel?`1px solid ${G_MID}40`:'1px solid var(--border)',transition:'all .15s'}}>{p}</button>);})}
          </div>
        </div>

        {/* Dados da proposta */}
        <div style={{padding:'12px 14px',background:G_LIGHT,borderRadius:10,border:`1px solid ${G_MID}25`,marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:700,color:G_MID,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:10}}>💰 Proposta</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
            <NovoClienteField label="Valor desejado">
              <input className="inp" value={form.proposta_valor} onChange={e=>set('proposta_valor',e.target.value)} placeholder="R$ 0,00"/>
            </NovoClienteField>
            <NovoClienteField label="Taxa (% ao mês)">
              <input className="inp" value={form.proposta_taxa} onChange={e=>set('proposta_taxa',e.target.value)} placeholder="0,00%"/>
            </NovoClienteField>
            <NovoClienteField label="Prazo (meses)">
              <input className="inp" type="number" min="1" max="120" value={form.proposta_prazo} onChange={e=>set('proposta_prazo',e.target.value)} placeholder="Ex: 48"/>
            </NovoClienteField>
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
    email:'', senha:'', role:'digitalizador',
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
    if(!form.senha||form.senha.length<6){
      setMsg({t:'error',text:'A senha deve ter no mínimo 6 caracteres.'});return;
    }

    setSaving(true);setMsg(null);
    const email=form.email.trim().toLowerCase();
    const nomeExibicao=isPJ?(form.nomeFantasia.trim()||form.razaoSocial.trim()):form.nome.trim();

    // Hierarquia
    let pp_email=form.promotora_principal_email||'';
    let p_email=form.promotora_email||'';
    if(r==='promotora_principal'){ pp_email=profile.email; }
    if(r==='promotora'){ p_email=profile.email; pp_email=profile.promotora_principal_email||''; }

    const extraData=isPJ
      ?{cnpj:form.cnpj,razaoSocial:form.razaoSocial,nomeFantasia:form.nomeFantasia,telefone:form.telefone}
      :{dataNasc:form.dataNasc,cpf:form.cpf,telefone:form.telefoneDig};

    try {
      // Chamar a Edge Function — ela tem service_role e faz tudo
      const {data:{session:s}}=await supabase.auth.getSession();
      const res=await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-corban-user`,
        {
          method:'POST',
          headers:{
            'Content-Type':'application/json',
            'Authorization':`Bearer ${s?.access_token}`,
          },
          body:JSON.stringify({
            email,
            password:form.senha,
            role:form.role,
            nome:nomeExibicao,
            promotora_principal_email:pp_email||null,
            promotora_email:p_email||null,
            extra_data:extraData,
          }),
        }
      );

      const result=await res.json();
      setSaving(false);

      if(!res.ok||result.error){
        setMsg({t:'error',text:result.error||'Erro ao criar usuário.'});
      } else {
        setMsg({t:'success',text:`✓ ${nomeExibicao} criado com sucesso! Já pode fazer login.`});
        setShowModal(false);
        // Reset form
        setForm({email:'',senha:'',role:creatableRoles[creatableRoles.length-1],promotora_principal_email:'',promotora_email:'',cnpj:'',razaoSocial:'',nomeFantasia:'',telefone:'',nome:'',dataNasc:'',cpf:'',telefoneDig:''});
        load();
      }
    } catch(e){
      setSaving(false);
      setMsg({t:'error',text:'Erro de conexão. Tente novamente.'});
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
        💡 <strong>Cadastro independente:</strong> preencha os dados e defina uma senha inicial. O usuário já consegue fazer login imediatamente após o cadastro.
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

            {/* Campo senha — comum a todos os tipos */}
            <div style={{marginTop:4,marginBottom:4,padding:'12px 14px',background:'rgba(90,70,50,.04)',borderRadius:10,border:'1px solid var(--border)'}}>
              <div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:10}}>🔐 Acesso ao sistema</div>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>Senha inicial *</label>
              <input className="inp" type="password" value={form.senha} onChange={e=>setForm(f=>({...f,senha:e.target.value}))} placeholder="Mínimo 6 caracteres"/>
              <div style={{fontSize:11,color:'var(--text-muted)',marginTop:5}}>O usuário poderá alterar a senha após o primeiro login.</div>
            </div>

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

// ── ÁRVORE VISUAL DA ESTRUTURA ────────────────────────────────────────────────
function CorbanArvore({estrutura,clientes,profile}){
  const r=profile?.role;
  const [expandedPP,setExpandedPP]=useState({});
  const [expandedP,setExpandedP]=useState({});
  const [detalhe,setDetalhe]=useState(null); // usuário selecionado para ver detalhes

  const pps=estrutura.filter(u=>u.role==='promotora_principal');
  const ps=estrutura.filter(u=>u.role==='promotora');
  const ds=estrutura.filter(u=>u.role==='digitalizador');

  const clientesDeDigitalizador=(nome)=>clientes.filter(c=>c.digitalizadorNome===nome);
  const clientesDePromotora=(nome)=>clientes.filter(c=>c.promotoraNome===nome);
  const clientesDePP=(nome)=>clientes.filter(c=>c.promotoraPrincipalNome===nome);

  const togglePP=email=>setExpandedPP(e=>({...e,[email]:!e[email]}));
  const toggleP=email=>setExpandedP(e=>({...e,[email]:!e[email]}));

  const MiniBar=({val,max,color})=>(
    <div style={{width:60,height:5,background:'rgba(90,70,50,.1)',borderRadius:99,overflow:'hidden',display:'inline-block',verticalAlign:'middle',marginLeft:6}}>
      <div style={{height:'100%',borderRadius:99,background:color,width:max>0?`${Math.round(val/max*100)}%`:'0%',transition:'width .5s'}}/>
    </div>
  );

  const maxCliDig=Math.max(...ds.map(d=>clientesDeDigitalizador(d.nome).length),1);

  const DigRow=({d})=>{
    const cs=clientesDeDigitalizador(d.nome);
    const ganhos=cs.filter(c=>c.statusComercial==='ganho'||c.statusComercial==='pedido').length;
    return(
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'9px 14px 9px 44px',borderBottom:'1px solid var(--border)',cursor:'pointer',transition:'background .12s'}}
        onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'}
        onMouseLeave={e=>e.currentTarget.style.background='transparent'}
        onClick={()=>setDetalhe(d)}>
        <div style={{width:6,height:6,borderRadius:'50%',background:ROLE_COLORS.digitalizador,flexShrink:0,marginLeft:10}}/>
        <Avatar name={d.nome} size={26} color={ROLE_COLORS.digitalizador}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:600,color:'var(--text-primary)'}}>{d.nome}</div>
          <div style={{fontSize:10,color:'var(--text-muted)'}}>{d.email}</div>
        </div>
        <div style={{textAlign:'right',flexShrink:0}}>
          <span style={{fontSize:13,fontWeight:700,color:ROLE_COLORS.digitalizador}}>{cs.length}</span>
          <span style={{fontSize:10,color:'var(--text-muted)',marginLeft:3}}>clientes</span>
          <MiniBar val={cs.length} max={maxCliDig} color={ROLE_COLORS.digitalizador}/>
        </div>
        {ganhos>0&&<span style={{fontSize:10,fontWeight:700,background:'var(--success-dim)',color:'var(--success)',borderRadius:99,padding:'2px 7px',flexShrink:0}}>{ganhos} ✓</span>}
        <span style={{fontSize:11,color:'var(--text-muted)'}}>›</span>
      </div>
    );
  };

  const PromRow=({p,pEmail})=>{
    const pDs=ds.filter(d=>d.promotora_email===pEmail);
    const cs=clientesDePromotora(p.nome);
    const expanded=expandedP[pEmail];
    return(
      <div>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px 10px 24px',borderBottom:'1px solid var(--border)',cursor:'pointer',background:expanded?'rgba(26,158,138,.04)':'transparent',transition:'background .12s'}}
          onClick={()=>{toggleP(pEmail);setDetalhe(null);}}>
          <div style={{fontSize:11,color:'var(--text-muted)',marginLeft:4,transition:'transform .2s',transform:expanded?'rotate(90deg)':'rotate(0deg)'}}>▶</div>
          <Avatar name={p.nome} size={28} color={ROLE_COLORS.promotora}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:600,color:'var(--text-primary)'}}>{p.nome}</div>
            <div style={{fontSize:10,color:'var(--text-muted)'}}>{p.email}</div>
          </div>
          <div style={{display:'flex',gap:12,flexShrink:0,alignItems:'center'}}>
            <span style={{fontSize:11,color:'var(--text-muted)'}}><strong style={{color:ROLE_COLORS.digitalizador}}>{pDs.length}</strong> dig.</span>
            <span style={{fontSize:11,color:'var(--text-muted)'}}><strong style={{color:ROLE_COLORS.promotora}}>{cs.length}</strong> cli.</span>
            <button onClick={e=>{e.stopPropagation();setDetalhe(p);}} style={{background:G_LIGHT,border:'none',borderRadius:6,padding:'3px 8px',fontSize:10,color:G_MID,cursor:'pointer',fontFamily:'var(--font)',fontWeight:600}}>detalhes</button>
          </div>
        </div>
        {expanded&&(
          <div style={{background:'rgba(26,158,138,.02)'}}>
            {pDs.length===0
              ?<div style={{padding:'10px 44px',fontSize:12,color:'var(--text-muted)'}}>Nenhum digitalizador vinculado.</div>
              :pDs.map(d=><DigRow key={d.email} d={d}/>)
            }
          </div>
        )}
      </div>
    );
  };

  // Para PP: só mostra a própria PP e abaixo
  const ppList=r==='promotora_principal'
    ?estrutura.filter(u=>u.email===profile?.email)
    :pps;

  return(
    <div style={{padding:'28px 32px'}}>
      <div className="fu" style={{marginBottom:20}}>
        <div className="section-title">Estrutura — Visão em Árvore</div>
        <div className="section-sub">
          {r==='master'?`${pps.length} Promotoras Principais · ${ps.length} Promotoras · ${ds.length} Digitalizadores · ${clientes.length} clientes totais`
            :`${ps.length} Promotoras · ${ds.length} Digitalizadores · ${clientes.length} clientes`}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:detalhe?'1fr 320px':'1fr',gap:20}}>
        <div>
          {ppList.length===0&&<div className="card" style={{padding:'32px',textAlign:'center',fontSize:13,color:'var(--text-muted)'}}>Nenhuma estrutura cadastrada ainda.</div>}
          {ppList.map(pp=>{
            const ppEmail=pp.email;
            const ppPs=ps.filter(p=>p.promotora_principal_email===ppEmail);
            const ppCs=clientesDePP(pp.nome);
            const expanded=expandedPP[ppEmail];
            return(
              <div key={ppEmail} className="card fu" style={{overflow:'hidden',marginBottom:16}}>
                {/* Cabeçalho da PP */}
                <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 18px',background:`linear-gradient(90deg,${G_DARK}08,transparent)`,borderBottom:'1px solid var(--border)',cursor:'pointer'}}
                  onClick={()=>{if(r==='master')togglePP(ppEmail);}}>
                  {r==='master'&&<div style={{fontSize:12,color:'var(--text-muted)',transition:'transform .2s',transform:expanded?'rotate(90deg)':'rotate(0deg)'}}>▶</div>}
                  <Avatar name={pp.nome} size={36} color={ROLE_COLORS.promotora_principal}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:'var(--text-primary)'}}>{pp.nome}</div>
                    <div style={{fontSize:11,color:'var(--text-muted)'}}>{pp.email}</div>
                  </div>
                  <div style={{display:'flex',gap:16,alignItems:'center'}}>
                    <div style={{textAlign:'center'}}>
                      <div style={{fontSize:18,fontWeight:700,color:ROLE_COLORS.promotora}}>{ppPs.length}</div>
                      <div style={{fontSize:9,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.06em'}}>Promotoras</div>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <div style={{fontSize:18,fontWeight:700,color:ROLE_COLORS.digitalizador}}>{ds.filter(d=>d.promotora_principal_email===ppEmail).length}</div>
                      <div style={{fontSize:9,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.06em'}}>Digitalizadores</div>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <div style={{fontSize:18,fontWeight:700,color:G_MID}}>{ppCs.length}</div>
                      <div style={{fontSize:9,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.06em'}}>Clientes</div>
                    </div>
                    <button onClick={e=>{e.stopPropagation();setDetalhe(pp);}} style={{background:G_LIGHT,border:'none',borderRadius:7,padding:'5px 10px',fontSize:11,color:G_MID,cursor:'pointer',fontFamily:'var(--font)',fontWeight:600}}>detalhes</button>
                  </div>
                </div>

                {/* Promotoras desta PP */}
                {(expanded||r==='promotora_principal')&&(
                  <div>
                    {ppPs.length===0
                      ?<div style={{padding:'12px 24px',fontSize:12,color:'var(--text-muted)'}}>Nenhuma promotora vinculada.</div>
                      :ppPs.map(p=><PromRow key={p.email} p={p} pEmail={p.email}/>)
                    }
                    {/* Digitalizadores diretos da PP (sem promotora) */}
                    {ds.filter(d=>d.promotora_principal_email===ppEmail&&!d.promotora_email).map(d=><DigRow key={d.email} d={d}/>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Painel de detalhes */}
        {detalhe&&(
          <div className="card" style={{padding:'20px',height:'fit-content',position:'sticky',top:28}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
              <div>
                <span className="tag" style={{background:ROLE_COLORS[detalhe.role]+'18',color:ROLE_COLORS[detalhe.role],fontSize:10,marginBottom:8,display:'inline-block'}}>{ROLE_LABELS[detalhe.role]}</span>
                <div style={{fontSize:15,fontWeight:700,color:'var(--text-primary)'}}>{detalhe.nome}</div>
                <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{detalhe.email}</div>
              </div>
              <button onClick={()=>setDetalhe(null)} style={{background:'rgba(90,70,50,.08)',border:'1px solid var(--border)',borderRadius:7,color:'var(--text-muted)',cursor:'pointer',width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>×</button>
            </div>

            {/* Dados extras (CNPJ, CPF etc) */}
            {detalhe.extra_data&&Object.keys(detalhe.extra_data).length>0&&(
              <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:9,overflow:'hidden',marginBottom:14}}>
                {Object.entries({
                  cnpj:'CNPJ',razaoSocial:'Razão Social',nomeFantasia:'Nome Fantasia',
                  cpf:'CPF',dataNasc:'Data Nasc.',telefone:'Telefone'
                }).filter(([k])=>detalhe.extra_data[k]).map(([k,label])=>(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',borderBottom:'1px solid var(--border)'}}>
                    <span style={{fontSize:11,color:'var(--text-muted)'}}>{label}</span>
                    <span style={{fontSize:11,color:'var(--text-primary)',fontWeight:500}}>{detalhe.extra_data[k]}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Métricas */}
            {(()=>{
              const cs=(detalhe.role==='digitalizador')
                ?clientesDeDigitalizador(detalhe.nome)
                :(detalhe.role==='promotora')
                  ?clientesDePromotora(detalhe.nome)
                  :clientesDePP(detalhe.nome);
              const ganhos=cs.filter(c=>c.statusComercial==='ganho'||c.statusComercial==='pedido').length;
              const emNeg=cs.filter(c=>c.statusComercial==='em_negociacao').length;
              const frios=cs.filter(c=>sinceD(c.ultimoContato)>=7).length;
              return(
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {[
                    {label:'Total clientes',val:cs.length,color:G_MID},
                    {label:'Convertidos',val:ganhos,color:'var(--success)'},
                    {label:'Em negociação',val:emNeg,color:'var(--accent)'},
                    {label:'Leads frios',val:frios,color:'var(--danger)'},
                  ].map(({label,val,color})=>(
                    <div key={label} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:9,padding:'10px 12px'}}>
                      <div style={{fontSize:9,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:4}}>{label}</div>
                      <div style={{fontSize:20,fontWeight:700,color}}>{val}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>
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
  const [showSino,setShowSino]=useState(false);
  const [notifs,setNotifs]=useState([]);

  // notifCount = não lidas
  const notifCount=notifs.filter(n=>!n.lida).length;

  // Hierarquia resolvida do usuário atual (UUIDs + nomes)
  const hierarchyRef=useRef({
    digitalizador_id: session?.user?.id||null,
    digitalizador_nome: profile?.nome||null,
    promotora_id: profile?.promotora_id||null,
    promotora_nome: profile?.promotoraNome||null,
    promotora_principal_id: profile?.promotora_principal_id||null,
    promotora_principal_nome: profile?.promotoraPrincipalNome||null,
  });

  const setView=useCallback(v=>dispatch({type:'VIEW',v}),[]);
  const selected=clientes.find(c=>c.id===sel);

  // ── Resolver hierarquia completa ao iniciar (garante UUIDs mesmo se profile incompleto) ──
  useEffect(()=>{
    if(!session||!profile) return;
    const resolveHierarchy=async()=>{
      let h={
        digitalizador_id: session.user.id,
        digitalizador_nome: profile.nome,
        promotora_id: profile.promotora_id||null,
        promotora_nome: profile.promotoraNome||null,
        promotora_principal_id: profile.promotora_principal_id||null,
        promotora_principal_nome: profile.promotoraPrincipalNome||null,
      };

      // Se faltar IDs, busca via allowed_users → profiles
      if(!h.promotora_id||!h.promotora_principal_id){
        const {data:au}=await supabase.from('allowed_users')
          .select('promotora_email,promotora_principal_email')
          .ilike('email',session.user.email).single();

        if(au?.promotora_email&&!h.promotora_id){
          const {data:pp}=await supabase.from('profiles')
            .select('id,nome').ilike('email',au.promotora_email).single();
          if(pp){ h.promotora_id=pp.id; h.promotora_nome=pp.nome; }
          // fallback: busca nome no allowed_users
          if(!h.promotora_nome){
            const {data:aup}=await supabase.from('allowed_users')
              .select('nome').ilike('email',au.promotora_email).single();
            h.promotora_nome=aup?.nome||null;
          }
        }
        if(au?.promotora_principal_email&&!h.promotora_principal_id){
          const {data:pp}=await supabase.from('profiles')
            .select('id,nome').ilike('email',au.promotora_principal_email).single();
          if(pp){ h.promotora_principal_id=pp.id; h.promotora_principal_nome=pp.nome; }
          if(!h.promotora_principal_nome){
            const {data:aup}=await supabase.from('allowed_users')
              .select('nome').ilike('email',au.promotora_principal_email).single();
            h.promotora_principal_nome=aup?.nome||null;
          }
        }
      }
      hierarchyRef.current=h;
    };
    resolveHierarchy();
  },[session,profile]);

  // ── Carregar clientes do Supabase (RLS filtra automaticamente) ──
  useEffect(()=>{
    if(!session) return;
    const load=async()=>{
      const {data,error}=await supabase
        .from('corban_clientes').select('*').order('created_at',{ascending:false});
      if(error){ console.error('Corban clientes load error:',error); setReady(true); return; }
      const loaded=(data||[]).map(r=>({
        ...r.data, id:r.id,
        digitalizador_id:r.digitalizador_id,
        promotora_id:r.promotora_id,
        promotora_principal_id:r.promotora_principal_id,
        digitalizadorNome:r.digitalizador_nome,
        promotoraNome:r.promotora_nome,
        promotoraPrincipalNome:r.promotora_principal_nome,
      }));
      dispatch({type:'SET_C',clientes:loaded});
      clientesRef.current=loaded;
      setReady(true);
    };
    load();

    // ── Real-time: escuta INSERT e UPDATE em corban_clientes ──
    const ch=supabase.channel('corban_clientes_rt')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'corban_clientes'},
        payload=>{
          const r=payload.new;
          const novo={...r.data,id:r.id,
            digitalizador_id:r.digitalizador_id,promotora_id:r.promotora_id,
            promotora_principal_id:r.promotora_principal_id,
            digitalizadorNome:r.digitalizador_nome,promotoraNome:r.promotora_nome,
            promotoraPrincipalNome:r.promotora_principal_nome};
          dispatch(prev=>{
            // Evitar duplicata
            if(prev.clientes?.find(c=>c.id===novo.id)) return prev;
            return{...prev,clientes:[novo,...(prev.clientes||[])]};
          });
        })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'corban_clientes'},
        payload=>{
          const r=payload.new;
          const atualizado={...r.data,id:r.id,
            digitalizador_id:r.digitalizador_id,promotora_id:r.promotora_id,
            promotora_principal_id:r.promotora_principal_id,
            digitalizadorNome:r.digitalizador_nome,promotoraNome:r.promotora_nome,
            promotoraPrincipalNome:r.promotora_principal_nome};
          dispatch({type:'UPD',c:atualizado});
        })
      .subscribe();

    return ()=>supabase.removeChannel(ch);
  },[session]);

  // ── Carregar estrutura ──
  useEffect(()=>{
    if(!session||profile?.role==='digitalizador') return;
    supabase.from('allowed_users').select('*').eq('modulo','corbans').order('nome')
      .then(({data})=>setEstrutura(data||[]));
  },[session,profile?.role]);

  // ── Carregar e escutar notificações ──
  useEffect(()=>{
    if(!session) return;
    // Carregar notificações para este usuário
    supabase.from('corban_notificacoes')
      .select('*').eq('para_user_id',session.user.id)
      .order('created_at',{ascending:false}).limit(50)
      .then(({data})=>setNotifs(data||[]));
    // Real-time
    const ch=supabase.channel('corban_notif_rt')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'corban_notificacoes',
        filter:`para_user_id=eq.${session.user.id}`},
        payload=>setNotifs(prev=>[payload.new,...prev]))
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  },[session]);

  const marcarLida=async(id)=>{
    await supabase.from('corban_notificacoes').update({lida:true}).eq('id',id);
    setNotifs(prev=>prev.map(n=>n.id===id?{...n,lida:true}:n));
  };

  // ── Sync local → Supabase (apenas mudanças, não ADD — ADD é imediato) ──
  useEffect(()=>{
    if(!ready||!session) return;
    const prev=clientesRef.current;
    const changed=clientes.filter(c=>{
      const old=prev.find(p=>p.id===c.id);
      // Só sincroniza UPD e MOVE — ADD já é salvo imediatamente no auditedDispatch
      return old&&JSON.stringify(old)!==JSON.stringify(c);
    });
    if(changed.length>0){
      const h=hierarchyRef.current;
      Promise.all(changed.map(async c=>{
        const {id,digitalizador_id,promotora_id,promotora_principal_id,
          digitalizadorNome,promotoraNome,promotoraPrincipalNome,...data}=c;
        const {error}=await supabase.from('corban_clientes').upsert({
          id,
          data:{...data,id},
          digitalizador_id:  digitalizador_id||h.digitalizador_id,
          digitalizador_nome:digitalizadorNome||h.digitalizador_nome,
          promotora_id:      promotora_id||h.promotora_id||null,
          promotora_nome:    promotoraNome||h.promotora_nome||null,
          promotora_principal_id:   promotora_principal_id||h.promotora_principal_id||null,
          promotora_principal_nome: promotoraPrincipalNome||h.promotora_principal_nome||null,
        },{onConflict:'id'});
        if(error) console.error('Sync error:',id,error);
      })).then(()=>{ clientesRef.current=clientes; });
    } else {
      clientesRef.current=clientes;
    }
  },[clientes,ready,session]);

  // ── Audited dispatch — salva ADD imediatamente no Supabase ──
  const auditedDispatch=useCallback(async(action)=>{
    dispatch(action);
    if(!session||!profile) return;

    // ADD: salva imediatamente com hierarquia completa
    if(action.type==='ADD'){
      const h=hierarchyRef.current;
      const c=action.c;
      const id=c.id||gid();
      const clienteComId={...c,id,activities:[{id:gid(),type:'stage_change',date:TODAY,user:profile.nome,text:'Cliente cadastrado'}]};

      const {error}=await supabase.from('corban_clientes').insert({
        id,
        data:{...clienteComId},
        digitalizador_id:  h.digitalizador_id,
        digitalizador_nome:h.digitalizador_nome,
        promotora_id:      h.promotora_id||null,
        promotora_nome:    h.promotora_nome||null,
        promotora_principal_id:   h.promotora_principal_id||null,
        promotora_principal_nome: h.promotora_principal_nome||null,
      });
      if(error){
        console.error('ADD error:',error);
        alert(`Erro ao salvar cliente: ${error.message}`);
        return;
      }
      // Real-time vai propagar para outros usuários
    }

    // Auditoria
    const auditMap={
      MOVE:()=>({action:'Moveu cliente no pipeline',clienteId:action.cid,details:`Estágio → "${stg(action.st).label}"`}),
      NOTE:()=>({action:'Adicionou nota',clienteId:action.cid,details:action.act?.text||''}),
      UPD: ()=>({action:'Editou informações',clienteId:action.c?.id,details:'Campos atualizados'}),
      ADD: ()=>({action:'Cadastrou novo cliente',clienteId:action.c?.id,details:`Nome: ${action.c?.nomeCliente||'—'}`}),
    };
    const fn=auditMap[action.type];
    if(fn){
      const {action:act,clienteId,details}=fn();
      const clienteNome=action.type==='ADD'
        ?action.c?.nomeCliente
        :clientes.find(c=>c.id===clienteId)?.nomeCliente||'—';
      supabase.from('corban_audit_log').insert({
        user_id:session.user.id,user_nome:profile.nome,user_role:profile.role,
        action:act,cliente_id:clienteId||null,cliente_nome:clienteNome,detalhes:details,
      });
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
          notifCount={notifCount}
          onSino={()=>setShowSino(true)}
        />
        <main style={{flex:1,minWidth:0,overflowY:'auto',paddingRight:selected?490:0,transition:'padding-right .3s cubic-bezier(.4,0,.2,1)'}}>
          {view==='dashboard' && <CorbanDashboard clientes={clientes} estrutura={estrutura} profile={profile}/>}
          {view==='pipeline'  && <CorbanKanban clientes={clientes} profile={profile} dispatch={auditedDispatch} onSelect={id=>dispatch({type:'SEL',id})}/>}
          {view==='clientes'  && <CorbanClientes clientes={clientes} profile={profile} estrutura={estrutura} onSelect={id=>dispatch({type:'SEL',id})} onNew={()=>dispatch({type:'TNEW'})}/>}
          {view==='arvore'    && <CorbanArvore estrutura={estrutura} clientes={clientes} profile={profile}/>}
          {view==='estrutura' && <CorbanEstrutura profile={profile} session={session}/>}
          {view==='auditoria' && <CorbanAuditoria/>}
        </main>
        {selected&&<CorbanDetail key={selected.id} cliente={selected} profile={profile} session={session} dispatch={auditedDispatch} onClose={()=>dispatch({type:'CLOSE'})}/>}
        {newOpen&&<NovoClienteModal profile={profile} dispatch={auditedDispatch} onClose={()=>dispatch({type:'TNEW'})} todosClientes={clientes}/>}
      </div>
      {showAS&&<AlterarSenha onClose={()=>setShowAS(false)}/>}
      {showSino&&(
        <SinoModal
          profile={profile}
          session={session}
          estrutura={estrutura}
          notifs={notifs}
          onClose={()=>setShowSino(false)}
          onLer={marcarLida}
          onEnviar={()=>{}}
        />
      )}
    </>
  );
}