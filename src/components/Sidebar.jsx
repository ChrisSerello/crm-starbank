import { useState } from 'react';
import { Avatar } from './shared';

export function Sidebar({view,dispatch,onLogout,onAlterarSenha,profile}){
  const isAdmin = profile?.role === 'admin';
  const items=[
    {id:"dashboard",icon:"◈",label:"Dashboard"},
    {id:"kanban",   icon:"⊞",label:"Pipeline"},
    {id:"leads",    icon:"≡",label:"Leads"},
    {id:"attribution",icon:"⇋",label:"Atribuição"},
    ...(isAdmin ? [
      {id:"auditoria", icon:"⌕", label:"Auditoria"},
      {id:"equipe",    icon:"●●●", label:"Gestão de Equipe"},
    ] : []),
  ];
  return(
    <div style={{width:228,background:"var(--bg-surface)",borderRight:"1px solid var(--border)",display:"flex",flexDirection:"column",flexShrink:0,height:"100vh",position:"sticky",top:0}}>
      <div style={{padding:"20px 18px 16px",borderBottom:"1px solid var(--border)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,borderRadius:10,background:"linear-gradient(135deg,#5B4FE8 0%,#9B8FF5 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:"0 4px 14px rgba(91,79,232,.3), 0 1px 0 rgba(255,255,255,.25) inset"}}>◈</div>
          <div>
            <div style={{fontFamily:"var(--font-display)",fontSize:15,fontWeight:600,color:"var(--text-primary)",letterSpacing:"-.01em"}}>CRM</div>
            <div style={{fontSize:10,fontWeight:700,color:"var(--accent)",letterSpacing:".09em",textTransform:"uppercase"}}>Indicações</div>
          </div>
        </div>
      </div>
      <nav style={{padding:"10px 8px",flex:1}}>
        <div className="eyebrow" style={{padding:"10px 8px 6px"}}>Menu</div>
        {items.map(it=>(
          <button key={it.id} className={`nav-item ${view===it.id?"active":""}`} onClick={()=>dispatch({type:"VIEW",v:it.id})}>
            <span style={{fontSize:15,width:20,textAlign:"center"}}>{it.icon}</span>{it.label}
          </button>
        ))}
      </nav>
      <div style={{padding:"13px 15px",borderTop:"1px solid var(--border)"}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <Avatar name={profile?.nome||"U"} size={30} color={profile?.role==="admin"?"#C4720A":"#5B4FE8"}/>
          <div style={{minWidth:0}}>
            <div style={{fontSize:12,fontWeight:600,color:"var(--text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{profile?.nome||"Usuário"}</div>
            <div style={{fontSize:10,fontWeight:700,color:profile?.role==="admin"?"var(--amber)":"var(--accent)",textTransform:"uppercase",letterSpacing:".06em"}}>{profile?.role==="admin"?"Admin":"Pós-venda"}</div>
          </div>
          <div style={{marginLeft:"auto",width:7,height:7,flexShrink:0,borderRadius:"50%",background:"var(--success)",boxShadow:"0 0 5px var(--success)"}}/>
        </div>
        <button
          onClick={onLogout}
          style={{marginTop:10,width:"100%",padding:"7px 0",borderRadius:7,background:"rgba(196,66,58,.08)",border:"1px solid rgba(196,66,58,.18)",color:"var(--danger)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"var(--font)",transition:"all .15s"}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(196,66,58,.14)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(196,66,58,.08)"}
        >Sair da conta</button>
        <button
          onClick={onAlterarSenha}
          style={{marginTop:6,width:"100%",padding:"7px 0",borderRadius:7,background:"rgba(90,70,50,.06)",border:"1px solid var(--border)",color:"var(--text-muted)",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"var(--font)",transition:"all .15s"}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(90,70,50,.1)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(90,70,50,.06)"}
        >🔑 Alterar senha</button>
      </div>
    </div>
  );
}