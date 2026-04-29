# fix_bko_switcher_dropdown.py
# Rode na raiz do projeto: python fix_bko_switcher_dropdown.py
# Corrige o dropdown do ModuleSwitcherBKO que ficava cortado pelo overflow:hidden da sidebar

import os

bko_path = 'src/views/bko/BKOApp.jsx'

print('\n=== Fix: Dropdown do ModuleSwitcherBKO ===\n')

if not os.path.exists(bko_path):
    print(f'ERRO: {bko_path} não encontrado')
    exit()

with open(bko_path, 'r', encoding='utf-8') as f:
    bko = f.read()

old_comp = """// ─── MODULE SWITCHER (multi-módulo) ──────────────────────────────────────────
function ModuleSwitcherBKO({ userModules, profile, onSwitch, collapsed }){
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = MODULE_CONFIG[profile?.modulo] || { label: profile?.modulo || 'Módulo', icon:'◇', color:'#3B5BDB' };
  const others = (userModules||[]).filter(m => m.modulo !== profile?.modulo);

  useEffect(()=>{
    const handler = (e) => { if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  },[]);

  if(!userModules || userModules.length <= 1) return null;

  return(
    <div ref={ref} style={{position:'relative', margin: collapsed ? '0 4px 4px' : '0 8px 4px'}}>
      {open && (
        <div style={{
          position:'absolute', bottom:'calc(100% + 4px)', left:0, right:0,
          background:'#1C2033', border:'1px solid rgba(59,91,219,.3)',
          borderRadius:10, padding:4, zIndex:999,
          boxShadow:'0 8px 24px rgba(0,0,0,.4)',
        }}>
          <div style={{fontSize:9,color:'rgba(255,255,255,.3)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',padding:'5px 10px 3px'}}>
            Trocar módulo
          </div>
          {others.map(({modulo, role})=>{
            const cfg = MODULE_CONFIG[modulo] || {label:modulo, icon:'◇', color:'#3B5BDB'};
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
                onMouseEnter={e=>e.currentTarget.style.background='rgba(59,91,219,.15)'}
                onMouseLeave={e=>e.currentTarget.style.background='none'}
              >
                <span style={{fontSize:14,width:18,textAlign:'center',color:cfg.color}}>{cfg.icon}</span>
                {!collapsed && (
                  <div>
                    <div style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,.85)'}}>{cfg.label}</div>
                    <div style={{fontSize:9,color:'rgba(255,255,255,.4)',marginTop:1,textTransform:'uppercase',letterSpacing:'.05em'}}>{role}</div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
      <button
        onClick={()=>setOpen(o=>!o)}
        title={collapsed ? `Módulo: ${current.label}` : ''}
        style={{
          display:'flex', alignItems:'center', gap: collapsed ? 0 : 8,
          justifyContent: collapsed ? 'center' : 'flex-start',
          width:'100%', padding: collapsed ? '8px 0' : '8px 10px',
          borderRadius:8, border:'1px solid rgba(59,91,219,.25)',
          background:'rgba(59,91,219,.1)', cursor:'pointer',
          transition:'all .15s',
        }}
        onMouseEnter={e=>{e.currentTarget.style.background='rgba(59,91,219,.2)';e.currentTarget.style.borderColor='rgba(59,91,219,.5)';}}
        onMouseLeave={e=>{e.currentTarget.style.background='rgba(59,91,219,.1)';e.currentTarget.style.borderColor='rgba(59,91,219,.25)';}}
      >
        <span style={{fontSize:14, color:current.color, width:20, textAlign:'center', flexShrink:0}}>{current.icon}</span>
        {!collapsed && (
          <>
            <span style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,.8)',flex:1,textAlign:'left'}}>{current.label}</span>
            <span style={{fontSize:9,color:'rgba(255,255,255,.35)'}}>{open?'▲':'▼'}</span>
          </>
        )}
      </button>
    </div>
  );
}"""

new_comp = """// ─── MODULE SWITCHER (multi-módulo) ──────────────────────────────────────────
function ModuleSwitcherBKO({ userModules, profile, onSwitch, collapsed }){
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({top:0, left:0, width:0});
  const btnRef = useRef(null);
  const current = MODULE_CONFIG[profile?.modulo] || { label: profile?.modulo || 'Módulo', icon:'◇', color:'#3B5BDB' };
  const others = (userModules||[]).filter(m => m.modulo !== profile?.modulo);

  useEffect(()=>{
    const handler = (e) => {
      if(btnRef.current && !btnRef.current.closest('[data-bko-switcher]')?.contains(e.target))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  },[]);

  const handleOpen = () => {
    if(btnRef.current){
      const rect = btnRef.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    }
    setOpen(o => !o);
  };

  if(!userModules || userModules.length <= 1) return null;

  return(
    <div data-bko-switcher="1" style={{margin: collapsed ? '0 4px 4px' : '0 8px 4px'}}>
      {/* Dropdown em portal com position:fixed — escapa do overflow:hidden da sidebar */}
      {open && ReactDOM.createPortal(
        <div
          data-bko-switcher="1"
          onMouseDown={e=>e.stopPropagation()}
          style={{
            position:'fixed', top:dropPos.top, left:dropPos.left, width: collapsed ? 180 : dropPos.width,
            background:'#1C2033', border:'1px solid rgba(59,91,219,.35)',
            borderRadius:10, padding:4, zIndex:9999,
            boxShadow:'0 8px 32px rgba(0,0,0,.5)',
          }}
        >
          <div style={{fontSize:9,color:'rgba(255,255,255,.35)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',padding:'5px 10px 4px'}}>
            Trocar módulo
          </div>
          {others.map(({modulo, role})=>{
            const cfg = MODULE_CONFIG[modulo] || {label:modulo, icon:'◇', color:'#3B5BDB'};
            return(
              <button
                key={modulo}
                onClick={()=>{ onSwitch(modulo, role); setOpen(false); }}
                style={{
                  display:'flex', alignItems:'center', gap:10, width:'100%',
                  padding:'9px 12px', border:'none', background:'none',
                  cursor:'pointer', borderRadius:7, textAlign:'left',
                  transition:'background .1s',
                }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(59,91,219,.18)'}
                onMouseLeave={e=>e.currentTarget.style.background='none'}
              >
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

      <button
        ref={btnRef}
        onClick={handleOpen}
        title={collapsed ? `Módulo: ${current.label}` : ''}
        style={{
          display:'flex', alignItems:'center', gap: collapsed ? 0 : 8,
          justifyContent: collapsed ? 'center' : 'flex-start',
          width:'100%', padding: collapsed ? '8px 0' : '8px 10px',
          borderRadius:8, border:'1px solid rgba(59,91,219,.25)',
          background:'rgba(59,91,219,.1)', cursor:'pointer',
          transition:'all .15s',
        }}
        onMouseEnter={e=>{e.currentTarget.style.background='rgba(59,91,219,.2)';e.currentTarget.style.borderColor='rgba(59,91,219,.5)';}}
        onMouseLeave={e=>{e.currentTarget.style.background='rgba(59,91,219,.1)';e.currentTarget.style.borderColor='rgba(59,91,219,.25)';}}
      >
        <span style={{fontSize:14, color:current.color, width:20, textAlign:'center', flexShrink:0}}>{current.icon}</span>
        {!collapsed && (
          <>
            <span style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,.8)',flex:1,textAlign:'left'}}>{current.label}</span>
            <span style={{fontSize:9,color:'rgba(255,255,255,.35)'}}>{open?'▲':'▼'}</span>
          </>
        )}
      </button>
    </div>
  );
}"""

if old_comp in bko:
    bko = bko.replace(old_comp, new_comp)
    print('  OK: ModuleSwitcherBKO atualizado para usar position:fixed com portal')
else:
    print('  AVISO: componente antigo não encontrado — verifique se fix_bko_sidebar.py foi aplicado antes')

with open(bko_path, 'w', encoding='utf-8') as f:
    f.write(bko)

print('\nPronto! Rode: npm run dev')