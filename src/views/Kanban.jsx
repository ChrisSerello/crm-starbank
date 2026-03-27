import { useState, useEffect, useRef } from 'react';
import { STAGES, OPERATORS } from '../constants';
import { sinceD, stg, opr } from '../utils';
import { Avatar, StageTag, AlertDot } from '../components/shared';

export function KCard({lead,dispatch}){
  const [menuOpen,setMenuOpen]=useState(false);
  const menuRef=useRef(null);
  const days=sinceD(lead.ultimoContato);
  const o=opr(lead.responsavelId);
  const currentStage=stg(lead.statusComercial);

  useEffect(()=>{
    if(!menuOpen) return;
    const close=(e)=>{ if(menuRef.current&&!menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown',close);
    return()=>document.removeEventListener('mousedown',close);
  },[menuOpen]);

  return(
    <div className="kcard fu" draggable onDragStart={()=>dispatch({type:"DRAG",id:lead.id})}
      onClick={e=>{ if(!menuOpen) dispatch({type:"SEL",id:lead.id}); }}
      style={{position:"relative", zIndex:menuOpen?50:1}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
        <div style={{fontSize:13,fontWeight:600,color:"var(--text-primary)",lineHeight:1.3,flex:1,minWidth:0,paddingRight:6}}>{lead.nomeIndicado}</div>
        <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
          <AlertDot days={days}/>
          {/* 3-dot menu */}
          <div ref={menuRef} style={{position:"relative"}}>
            <button
              onClick={e=>{e.stopPropagation();setMenuOpen(v=>!v);}}
              style={{
                background:"none",border:"none",cursor:"pointer",padding:"2px 4px",
                borderRadius:5,color:"var(--text-muted)",fontSize:16,lineHeight:1,
                display:"flex",alignItems:"center",justifyContent:"center",
                transition:"background .15s",
              }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(90,70,50,.1)"}
              onMouseLeave={e=>e.currentTarget.style.background="none"}
              title="Mover para estágio"
            >⋮</button>
            {menuOpen&&(
              <div onClick={e=>e.stopPropagation()} style={{
                position:"absolute",top:"100%",right:0,zIndex:999,
                background:"var(--bg-elevated)",border:"1px solid var(--border-mid)",
                borderRadius:10,boxShadow:"0 8px 32px rgba(60,40,20,0.18)",
                minWidth:180,overflow:"hidden",marginTop:4,
                animation:"fadeUp .15s cubic-bezier(.4,0,.2,1)",
              }}>
                <div style={{padding:"8px 12px 6px",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".08em",borderBottom:"1px solid var(--border)"}}>
                  Mover para estágio
                </div>
                {STAGES.map(s=>{
                  const isCurrent=s.id===lead.statusComercial;
                  return(
                    <button key={s.id}
                      onClick={e=>{
                        e.stopPropagation();
                        if(!isCurrent) dispatch({type:"MOVE",lid:lead.id,st:s.id});
                        setMenuOpen(false);
                      }}
                      style={{
                        width:"100%",display:"flex",alignItems:"center",gap:9,
                        padding:"9px 12px",background:isCurrent?"rgba(90,70,50,.06)":"none",
                        border:"none",cursor:isCurrent?"default":"pointer",
                        fontFamily:"var(--font)",fontSize:12,fontWeight:isCurrent?600:400,
                        color:isCurrent?s.color:"var(--text-primary)",
                        textAlign:"left",transition:"background .12s",
                      }}
                      onMouseEnter={e=>{ if(!isCurrent) e.currentTarget.style.background="rgba(90,70,50,.06)"; }}
                      onMouseLeave={e=>{ if(!isCurrent) e.currentTarget.style.background="none"; }}
                    >
                      <div style={{width:8,height:8,borderRadius:"50%",background:s.color,flexShrink:0}}/>
                      {s.label}
                      {isCurrent&&<span style={{marginLeft:"auto",fontSize:10,color:s.color}}>✓ atual</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:8}}>{lead.orgaoPrefeitura}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
        {lead.produtosInteresse.slice(0,2).map(p=><span key={p} className="prod-pill" style={{fontSize:10,padding:"2px 7px"}}>{p.split(" ").slice(0,2).join(" ")}</span>)}
        {lead.produtosInteresse.length>2&&<span style={{fontSize:10,color:"var(--text-muted)",alignSelf:"center"}}>+{lead.produtosInteresse.length-2}</span>}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        {o&&<div style={{display:"flex",alignItems:"center",gap:5}}><Avatar name={o.name} size={18} color={o.color}/><span style={{fontSize:10,color:"var(--text-muted)",fontWeight:500}}>{o.name}</span></div>}
        {!o&&<div/>}
        <span style={{fontSize:10,fontWeight:600,color:lead.documentoStatus==="Aprovado"?"var(--success)":lead.documentoStatus==="Não solicitado"?"var(--text-faint)":"var(--amber)"}}>📄 {lead.documentoStatus}</span>
      </div>
    </div>
  );
}

export function Kanban({leads,dispatch,dragId}){
  return(
    <div style={{padding:"28px 32px",overflowX:"auto"}}>
      <div className="fu" style={{marginBottom:20}}>
        <div className="section-title">Pipeline</div>
        <div className="section-sub">Arraste os cards para mover entre estágios</div>
      </div>
      <div style={{display:"flex",gap:10,alignItems:"flex-start",minWidth:"max-content",paddingBottom:16}}>
        {STAGES.map((s,si)=>{
          const sl=leads.filter(l=>l.statusComercial===s.id);
          const [over,setOver]=useState(false);
          return(
            <div key={s.id} className={`kcol ${over?"dover":""}`} style={{animationDelay:`${si*.04}s`}}
              onDragOver={e=>{e.preventDefault();setOver(true)}} onDragLeave={()=>setOver(false)}
              onDrop={()=>{setOver(false);if(dragId)dispatch({type:"MOVE",lid:dragId,st:s.id});dispatch({type:"DRAG",id:null});}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:11,padding:"0 3px"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:s.color,boxShadow:`0 0 5px ${s.color}60`,flexShrink:0}}/>
                <span style={{fontSize:12,fontWeight:600,color:"var(--text-secondary)",flex:1}}>{s.label}</span>
                <span style={{fontSize:11,fontWeight:700,background:s.bg,color:s.color,borderRadius:99,padding:"1px 6px"}}>{sl.length}</span>
              </div>
              <div style={{minHeight:44}}>
                {sl.map(l=><KCard key={l.id} lead={l} dispatch={dispatch}/>)}
                {sl.length===0&&<div style={{textAlign:"center",padding:"18px 0",fontSize:11,color:"var(--text-faint)",letterSpacing:".04em"}}>Solte aqui</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}