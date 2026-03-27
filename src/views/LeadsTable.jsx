import { useState, useEffect, useMemo, useRef } from 'react';
import { STAGES, PRODUCTS, OPERATORS, PER_PAGE } from '../constants';
import { sinceD, fmtD, opr } from '../utils';
import { Avatar, StageTag, AlertDot } from '../components/shared';

const PER_PAGE = 100;

export function LeadsTable({leads,dispatch,filters}){
  const [page,setPage]=useState(1);

  // Build unique orgão list for filter
  const orgaos=useMemo(()=>{
    const s=new Set(leads.map(l=>l.orgaoPrefeitura).filter(Boolean));
    return [...s].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  },[leads]);

  const flt=useMemo(()=>{
    const s=filters.search.toLowerCase();
    return leads.filter(l=>{
      if(s&&!l.nomeIndicado.toLowerCase().includes(s)&&!l.cpfIndicado.includes(s)&&!l.orgaoPrefeitura.toLowerCase().includes(s))return false;
      if(filters.product&&!l.produtosInteresse.includes(filters.product))return false;
      if(filters.operator&&l.responsavelId!==filters.operator)return false;
      if(filters.stage&&l.statusComercial!==filters.stage)return false;
      if(filters.orgao&&l.orgaoPrefeitura!==filters.orgao)return false;
      return true;
    });
  },[leads,filters]);

  // Reset to page 1 whenever filters change
  const prevFilters=useRef(filters);
  useEffect(()=>{
    if(JSON.stringify(prevFilters.current)!==JSON.stringify(filters)){
      setPage(1);
      prevFilters.current=filters;
    }
  },[filters]);

  const totalPages=Math.max(1,Math.ceil(flt.length/PER_PAGE));
  const paginated=flt.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const TH=({c})=><th style={{padding:"11px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".08em",whiteSpace:"nowrap"}}>{c}</th>;

  return(
    <div style={{padding:"28px 32px"}}>
      <div className="fu" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20}}>
        <div>
          <div className="section-title">Leads</div>
          <div className="section-sub">
            {flt.length} de {leads.length} registros
            {totalPages>1&&` · Página ${page} de ${totalPages}`}
          </div>
        </div>
        <button className="btn btn-primary" onClick={()=>dispatch({type:"TNEW"})}><span style={{fontSize:16,lineHeight:1}}>+</span> Novo Lead</button>
      </div>

      {/* Filters row */}
      <div className="fu1" style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        <div className="search-wrap">
          <span className="search-icon">⌕</span>
          <input className="inp" placeholder="Buscar por nome, CPF ou órgão…" value={filters.search} onChange={e=>dispatch({type:"FILT",k:"search",v:e.target.value})}/>
        </div>
        {[
          {k:"product", ph:"Todos produtos",   opts:PRODUCTS.map(p=>({v:p,l:p}))},
          {k:"operator",ph:"Todos operadores", opts:OPERATORS.map(o=>({v:o.id,l:o.name}))},
          {k:"stage",   ph:"Todos estágios",   opts:STAGES.map(s=>({v:s.id,l:s.label}))},
        ].map(f=>(
          <select key={f.k} className="sel" style={{width:168}} value={filters[f.k]} onChange={e=>dispatch({type:"FILT",k:f.k,v:e.target.value})}>
            <option value="">{f.ph}</option>
            {f.opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        ))}
        {/* Órgão/Prefeitura filter */}
        <select className="sel" style={{width:200}} value={filters.orgao||""} onChange={e=>dispatch({type:"FILT",k:"orgao",v:e.target.value})}>
          <option value="">Todos órgãos / prefeituras</option>
          {orgaos.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
        {/* Clear filters button */}
        {(filters.search||filters.product||filters.operator||filters.stage||filters.orgao)&&(
          <button className="btn btn-ghost" style={{fontSize:12,padding:"7px 12px"}}
            onClick={()=>{ ['search','product','operator','stage','orgao'].forEach(k=>dispatch({type:"FILT",k,v:""})); }}>
            ✕ Limpar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <div className="fu2 card" style={{overflow:"hidden",marginBottom:16}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{background:"rgba(90,70,50,.04)",borderBottom:"1px solid var(--border)"}}>
                <TH c="Nome / CPF"/><TH c="Órgão / Prefeitura"/><TH c="Produtos"/><TH c="Estágio"/><TH c="Operador"/><TH c="Último contato"/><TH c="Documento"/><TH c=""/>
              </tr>
            </thead>
            <tbody>
              {paginated.map(l=>{
                const o=opr(l.responsavelId);
                const days=sinceD(l.ultimoContato);
                return(
                  <tr key={l.id} className="trow" onClick={()=>dispatch({type:"SEL",id:l.id})}>
                    <td style={{padding:"12px 14px"}}><div style={{fontWeight:600}}>{l.nomeIndicado}</div><div style={{fontSize:11,color:"var(--text-muted)",marginTop:1}}>{l.cpfIndicado}</div></td>
                    <td style={{padding:"12px 14px",color:"var(--text-secondary)",fontSize:12}}>{l.orgaoPrefeitura}</td>
                    <td style={{padding:"12px 14px"}}><div style={{display:"flex",flexWrap:"wrap",gap:3}}>{l.produtosInteresse.slice(0,2).map(p=><span key={p} className="prod-pill" style={{fontSize:10,padding:"2px 7px"}}>{p.split(" ").slice(0,2).join(" ")}</span>)}{l.produtosInteresse.length>2&&<span style={{fontSize:10,color:"var(--text-muted)"}}>+{l.produtosInteresse.length-2}</span>}</div></td>
                    <td style={{padding:"12px 14px"}}><StageTag stageId={l.statusComercial}/></td>
                    <td style={{padding:"12px 14px"}}>{o&&<div style={{display:"flex",alignItems:"center",gap:6}}><Avatar name={o.name} size={24} color={o.color}/><span style={{fontSize:12,color:"var(--text-secondary)",fontWeight:500}}>{o.name}</span></div>}{!o&&l.responsavelId&&<span style={{fontSize:12,color:"var(--text-secondary)"}}>{l.responsavelId}</span>}</td>
                    <td style={{padding:"12px 14px"}}><div style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:12,color:days>=7?"var(--danger)":days>=3?"var(--amber)":"var(--text-secondary)"}}>{fmtD(l.ultimoContato)}</span><AlertDot days={days}/></div></td>
                    <td style={{padding:"12px 14px"}}><span style={{fontSize:11,fontWeight:600,color:l.documentoStatus==="Aprovado"?"var(--success)":l.documentoStatus==="Não solicitado"?"var(--text-faint)":"var(--amber)"}}>{l.documentoStatus}</span></td>
                    <td style={{padding:"12px 14px",color:"var(--text-muted)",fontSize:16}}>›</td>
                  </tr>
                );
              })}
              {paginated.length===0&&<tr><td colSpan={8} style={{padding:"40px 0",textAlign:"center",color:"var(--text-muted)",fontSize:13}}>Nenhum lead encontrado</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages>1&&(
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <button className="btn btn-ghost" style={{padding:"6px 12px",fontSize:12}} onClick={()=>setPage(1)} disabled={page===1}>«</button>
          <button className="btn btn-ghost" style={{padding:"6px 12px",fontSize:12}} onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>‹ Anterior</button>
          <div style={{display:"flex",gap:4}}>
            {Array.from({length:totalPages},(_,i)=>i+1)
              .filter(p=>p===1||p===totalPages||Math.abs(p-page)<=2)
              .reduce((acc,p,i,arr)=>{
                if(i>0&&p-arr[i-1]>1) acc.push('…');
                acc.push(p);
                return acc;
              },[])
              .map((p,i)=>
                p==='…'
                  ?<span key={`e${i}`} style={{padding:"6px 4px",fontSize:12,color:"var(--text-muted)"}}>…</span>
                  :<button key={p} onClick={()=>setPage(p)}
                    style={{
                      width:32,height:32,borderRadius:8,border:"none",cursor:"pointer",
                      fontSize:12,fontWeight:p===page?600:400,
                      background:p===page?"var(--accent)":"transparent",
                      color:p===page?"#fff":"var(--text-secondary)",
                      transition:"all .15s",
                    }}>{p}</button>
              )
            }
          </div>
          <button className="btn btn-ghost" style={{padding:"6px 12px",fontSize:12}} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>Próxima ›</button>
          <button className="btn btn-ghost" style={{padding:"6px 12px",fontSize:12}} onClick={()=>setPage(totalPages)} disabled={page===totalPages}>»</button>
        </div>
      )}
    </div>
  );
}