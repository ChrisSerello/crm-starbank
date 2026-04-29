# fix_bko_sidebar.py
# Rode na raiz do projeto: python fix_bko_sidebar.py
# Adiciona o module switcher na BKOSidebar e no BKOApp

import os

print('\n=== Fix: Module Switcher na BKO Sidebar ===\n')

# ─── 1. BKOApp.jsx ───────────────────────────────────────────────────────────
bko_path = 'src/views/bko/BKOApp.jsx'

if not os.path.exists(bko_path):
    print(f'ERRO: {bko_path} não encontrado')
    exit()

with open(bko_path, 'r', encoding='utf-8') as f:
    bko = f.read()

changes = 0

# 1a. Adicionar MODULE_CONFIG logo após os imports (antes de B_DARK)
module_config = """
const MODULE_CONFIG = {
  indicacoes: { label:'Indicações',  icon:'◈', color:'#6366F1' },
  bko:        { label:'BKO',         icon:'⊞', color:'#3B5BDB' },
  corbans:    { label:'Corbans',      icon:'⬡', color:'#10B981' },
  externos:   { label:'Externos',     icon:'◎', color:'#F59E0B' },
  ecommerce:  { label:'E-commerce',  icon:'◇', color:'#EC4899' },
  tv:         { label:'TV',          icon:'▣', color:'#8B5CF6' },
};

"""

old_bconst = "const B_DARK  = '#1C2033';"
if module_config.strip() not in bko and old_bconst in bko:
    bko = bko.replace(old_bconst, module_config + old_bconst)
    print('  OK: MODULE_CONFIG adicionado')
    changes += 1
else:
    print('  SKIP: MODULE_CONFIG já existe ou B_DARK não encontrado')

# 1b. Adicionar import useEffect e useRef se não existir (já tem useState)
# (já tem useState, useEffect, useReducer, useMemo, useCallback, useRef — ok)

# 1c. Adicionar componente ModuleSwitcherBKO antes de BKOSidebar
switcher_component = """
// ─── MODULE SWITCHER (multi-módulo) ──────────────────────────────────────────
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
}

"""

old_sidebar_fn = "function BKOSidebar("
if "ModuleSwitcherBKO" not in bko and old_sidebar_fn in bko:
    bko = bko.replace(old_sidebar_fn, switcher_component + old_sidebar_fn)
    print('  OK: componente ModuleSwitcherBKO adicionado')
    changes += 1
else:
    print('  SKIP: ModuleSwitcherBKO já existe ou BKOSidebar não encontrada')

# 1d. Adicionar userModules e onSwitch nos parâmetros de BKOSidebar
old_sig = "function BKOSidebar({view,setView,profile,onLogout,onAlterarSenha,onSearch,collapsed,setCollapsed}){"
new_sig = "function BKOSidebar({view,setView,profile,onLogout,onAlterarSenha,onSearch,collapsed,setCollapsed,userModules,onSwitchModule}){"
if old_sig in bko:
    bko = bko.replace(old_sig, new_sig)
    print('  OK: parâmetros userModules/onSwitchModule adicionados ao BKOSidebar')
    changes += 1
else:
    print('  SKIP: assinatura BKOSidebar não encontrada')

# 1e. Inserir <ModuleSwitcherBKO> e divisor no início do <nav> da BKOSidebar
old_nav = "      {!collapsed&&<div style={{fontSize:8,fontWeight:700,color:'rgba(255,255,255,.25)',textTransform:'uppercase',letterSpacing:'.09em',padding:'8px 8px 4px'}}>Menu</div>}"
new_nav = """      <ModuleSwitcherBKO userModules={userModules} profile={profile} onSwitch={onSwitchModule} collapsed={collapsed}/>
      {userModules && userModules.length > 1 && (
        <div style={{height:1, background:'rgba(59,91,219,.2)', margin: collapsed ? '4px 6px 4px' : '4px 8px 6px'}}/>
      )}
      {!collapsed&&<div style={{fontSize:8,fontWeight:700,color:'rgba(255,255,255,.25)',textTransform:'uppercase',letterSpacing:'.09em',padding:'8px 8px 4px'}}>Menu</div>}"""
if old_nav in bko:
    bko = bko.replace(old_nav, new_nav)
    print('  OK: ModuleSwitcherBKO inserido na nav da BKOSidebar')
    changes += 1
else:
    print('  SKIP: nav label da BKOSidebar não encontrado')

# 1f. Adicionar userModules e onSwitchModule no <BKOSidebar> dentro do BKOApp
old_use = "        <BKOSidebar view={view} setView={v=>{setView(v);if(v!=='pipeline')setFiltroEstagio(null);}} profile={profile} onLogout={signOut} onAlterarSenha={()=>setShowAS(true)} onSearch={()=>setSearchOpen(true)} collapsed={sidebarCollapsed} setCollapsed={toggleSidebar}/>"
new_use = "        <BKOSidebar view={view} setView={v=>{setView(v);if(v!=='pipeline')setFiltroEstagio(null);}} profile={profile} onLogout={signOut} onAlterarSenha={()=>setShowAS(true)} onSearch={()=>setSearchOpen(true)} collapsed={sidebarCollapsed} setCollapsed={toggleSidebar} userModules={userModules} onSwitchModule={onSwitchModule}/>"
if old_use in bko:
    bko = bko.replace(old_use, new_use)
    print('  OK: props passadas ao <BKOSidebar> no BKOApp')
    changes += 1
else:
    print('  SKIP: uso de <BKOSidebar> no BKOApp não encontrado')

# 1g. Adicionar userModules e onSwitchModule nos parâmetros do BKOApp
old_export = "export function BKOApp({profile,session,signOut,onAlterarSenha}){"
new_export = "export function BKOApp({profile,session,signOut,onAlterarSenha,userModules,onSwitchModule}){"
if old_export in bko:
    bko = bko.replace(old_export, new_export)
    print('  OK: parâmetros userModules/onSwitchModule adicionados ao BKOApp')
    changes += 1
else:
    print('  SKIP: assinatura BKOApp não encontrada')

with open(bko_path, 'w', encoding='utf-8') as f:
    f.write(bko)

print(f'\n  BKOApp.jsx: {changes} alteração(ões) aplicada(s)')

# ─── 2. App.jsx ──────────────────────────────────────────────────────────────
app_path = 'src/App.jsx'
changes2 = 0

if not os.path.exists(app_path):
    print(f'\nERRO: {app_path} não encontrado')
else:
    with open(app_path, 'r', encoding='utf-8') as f:
        app = f.read()

    old_bko_app = """      <BKOApp
        profile={profile}
        session={session}
        signOut={signOut}
        onAlterarSenha={()=>setShowAlterarSenha(true)}
      />"""
    new_bko_app = """      <BKOApp
        profile={profile}
        session={session}
        signOut={signOut}
        onAlterarSenha={()=>setShowAlterarSenha(true)}
        userModules={userModules}
        onSwitchModule={selectModule}
      />"""

    if old_bko_app in app:
        app = app.replace(old_bko_app, new_bko_app)
        print('\n  OK: props userModules/onSwitchModule adicionadas ao <BKOApp> em App.jsx')
        changes2 += 1
    else:
        print('\n  SKIP: bloco <BKOApp> em App.jsx não encontrado')

    with open(app_path, 'w', encoding='utf-8') as f:
        f.write(app)

    print(f'  App.jsx: {changes2} alteração(ões) aplicada(s)')

print('\nPronto! Rode: npm run dev')