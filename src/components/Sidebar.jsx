import { useState, useEffect, useRef } from 'react';
import { Avatar } from './shared';

const MODULE_CONFIG = {
  indicacoes: { label:'Indicações',  icon:'◈', color:'#6366F1' },
  bko:        { label:'BKO',         icon:'⊞', color:'#0EA5E9' },
  corbans:    { label:'Corbans',      icon:'⬡', color:'#10B981' },
  externos:   { label:'Externos',     icon:'◎', color:'#F59E0B' },
  ecommerce:  { label:'E-commerce',  icon:'◇', color:'#EC4899' },
  tv:         { label:'TV Dashboard',icon:'▣', color:'#8B5CF6' },
};

function ModuleSwitcherItem({ userModules, profile, onSwitch }){
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = MODULE_CONFIG[profile?.modulo] || { label: profile?.modulo || 'Módulo', icon:'◇', color:'#6366F1' };
  const others = userModules.filter(m => m.modulo !== profile?.modulo);

  useEffect(()=>{
    const handler = (e) => { if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  },[]);

  if(!userModules || userModules.length <= 1) return null;

  return(
    <div ref={ref} style={{position:'relative', marginBottom:4}}>
      {/* Dropdown */}
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 4px)', left:0, right:0,
          background:'var(--bg-elevated,var(--bg-surface))',
          border:'1px solid var(--border)',
          borderRadius:10, padding:4, zIndex:999,
          boxShadow:'0 8px 24px rgba(0,0,0,.2)',
        }}>
          <div style={{fontSize:10,color:'var(--text-muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',padding:'5px 10px 3px'}}>
            Trocar módulo
          </div>
          {others.map(({modulo, role})=>{
            const cfg = MODULE_CONFIG[modulo] || {label:modulo, icon:'◇', color:'#6366F1'};
            return(
              <button
                key={modulo}
                onClick={()=>{ onSwitch(modulo, role); setOpen(false); }}
                style={{
                  display:'flex', alignItems:'center', gap:8, width:'100%',
                  padding:'8px 10px', border:'none', background:'none',
                  cursor:'pointer', borderRadius:7, textAlign:'left',
                  transition:'background .1s',
                }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.06)'}
                onMouseLeave={e=>e.currentTarget.style.background='none'}
              >
                <span style={{fontSize:14,width:18,textAlign:'center',color:cfg.color}}>{cfg.icon}</span>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:'var(--text-primary)'}}>{cfg.label}</div>
                  <div style={{fontSize:10,color:'var(--text-muted)',marginTop:1,textTransform:'uppercase',letterSpacing:'.05em'}}>{role}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Botão atual — parece um nav-item */}
      <button
        onClick={()=>setOpen(o=>!o)}
        className="nav-item"
        style={{width:'100%', display:'flex', alignItems:'center', gap:8, justifyContent:'space-between'}}
      >
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <span style={{fontSize:15, width:20, textAlign:'center', color:current.color}}>{current.icon}</span>
          <span>{current.label}</span>
        </div>
        <span style={{fontSize:9, color:'var(--text-muted)', marginLeft:'auto'}}>{open?'▲':'▼'}</span>
      </button>
    </div>
  );
}

export function Sidebar({view, dispatch, onLogout, onAlterarSenha, profile, userModules, onSwitchModule}){
  const isAdmin = profile?.role === 'admin';
  const items=[
    {id:"dashboard",  icon:"◈",   label:"Dashboard"},
    {id:"kanban",     icon:"⊞",   label:"Pipeline"},
    {id:"leads",      icon:"≡",   label:"Leads"},
    {id:"attribution",icon:"⇋",   label:"Atribuição"},
    ...(isAdmin ? [
      {id:"auditoria", icon:"⌕",   label:"Auditoria"},
      {id:"equipe",    icon:"●●●", label:"Gestão de Equipe"},
    ] : []),
  ];

  return(
    <div style={{width:228,background:"var(--bg-surface)",borderRight:"1px solid var(--border)",display:"flex",flexDirection:"column",flexShrink:0,height:"100vh",position:"sticky",top:0}}>
      {/* Logo */}
      <div style={{padding:"20px 18px 16px",borderBottom:"1px solid var(--border)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,borderRadius:10,background:"linear-gradient(135deg,#5B4FE8 0%,#9B8FF5 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:"0 4px 14px rgba(91,79,232,.3), 0 1px 0 rgba(255,255,255,.25) inset"}}>◈</div>
          <div>
            <div style={{fontFamily:"var(--font-display)",fontSize:15,fontWeight:600,color:"var(--text-primary)",letterSpacing:"-.01em"}}>StarNexus</div>
            <div style={{fontSize:10,fontWeight:700,color:"var(--accent)",letterSpacing:".09em",textTransform:"uppercase"}}>CRM</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{padding:"10px 8px",flex:1}}>
        <div className="eyebrow" style={{padding:"10px 8px 6px"}}>Menu</div>

        {/* Switcher de módulo — aparece só para quem tem 2+ módulos */}
        <ModuleSwitcherItem
          userModules={userModules||[]}
          profile={profile}
          onSwitch={onSwitchModule}
        />

        {/* Divisor só aparece se tiver switcher */}
        {userModules && userModules.length > 1 && (
          <div style={{height:1,background:'var(--border)',margin:'4px 8px 8px'}}/>
        )}

        {items.map(it=>(
          <button key={it.id} className={`nav-item ${view===it.id?"active":""}`} onClick={()=>dispatch({type:"VIEW",v:it.id})}>
            <span style={{fontSize:15,width:20,textAlign:"center"}}>{it.icon}</span>{it.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
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