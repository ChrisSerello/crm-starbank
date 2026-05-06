# fix_supervisor_all_teams.py
# Rode na raiz do projeto: python fix_supervisor_all_teams.py

import os

path = 'src/views/bko/BKOApp.jsx'
print('\n=== Fix: Supervisores veem todas as equipes ===\n')

if not os.path.exists(path):
    print(f'ERRO: {path} não encontrado')
    exit()

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

changes = 0

# ── 1. Carregar TODAS as equipes (não só a do supervisor logado) ──────────────
old_team_load = """  // Carregar equipe do supervisor (operadores vinculados a este supervisor)
  useEffect(()=>{
    if(!profile?.is_supervisor||!profile?.id) return;
    supabase.from('profiles')
      .select('id,nome')
      .eq('modulo','bko')
      .eq('role','startec')
      .eq('supervisor_id',profile.id)
      .then(({data})=>setSupervisorTeam((data||[]).map(o=>o.id)));
  },[profile?.id,profile?.is_supervisor]);"""

new_team_load = """  // Carregar todas as equipes startec agrupadas por supervisor
  const [allTeams,setAllTeams]=useState([]); // [{supervisor_id, supervisor_nome, operadores:[id,...]}]
  useEffect(()=>{
    if(!profile?.is_supervisor) return;
    // Buscar todos operadores startec com seus supervisores
    Promise.all([
      supabase.from('profiles').select('id,nome,supervisor_id').eq('modulo','bko').eq('role','startec'),
      supabase.from('profiles').select('id,nome').eq('modulo','bko').eq('is_supervisor',true),
    ]).then(([{data:ops},{data:sups}])=>{
      const teams=(sups||[]).map(s=>({
        supervisor_id:s.id,
        supervisor_nome:s.nome,
        operadores:(ops||[]).filter(o=>o.supervisor_id===s.id).map(o=>o.id),
      }));
      setAllTeams(teams);
      // Manter supervisorTeam com a equipe própria para compatibilidade
      const myTeam=teams.find(t=>t.supervisor_id===profile.id);
      setSupervisorTeam(myTeam?.operadores||[]);
    });
  },[profile?.id,profile?.is_supervisor]);"""

if old_team_load in c:
    c = c.replace(old_team_load, new_team_load)
    print('  OK: carregamento de todas as equipes adicionado')
    changes += 1
else:
    print('  AVISO: bloco de carregamento de equipe não encontrado')

# ── 2. Adicionar allTeams ao state inicial ────────────────────────────────────
old_team_state = """  // Equipe do supervisor: IDs dos operadores sob supervisão
  const [supervisorTeam,setSupervisorTeam]=useState([]);"""
new_team_state = """  // Equipe do supervisor: IDs dos operadores sob supervisão
  const [supervisorTeam,setSupervisorTeam]=useState([]);
  const [allTeams,setAllTeams]=useState([]);"""

# Só adicionar se allTeams não existir ainda
if 'const [allTeams,setAllTeams]=useState([]);' not in c:
    if old_team_state in c:
        c = c.replace(old_team_state, new_team_state)
        print('  OK: state allTeams adicionado')
        changes += 1

# ── 3. Passar allTeams para Dashboard, Pipeline e Clientes ───────────────────
old_dash = """          {view==='dashboard' && <BKODashboard clientes={clientes} setView={v=>{setView(v);}} setFiltroEstagio={setFiltroEstagio} profile={profile} origemFiltro={origemFiltro} setOrigemFiltro={setOrigemFiltro} supervisorTeam={supervisorTeam}/>}"""
new_dash = """          {view==='dashboard' && <BKODashboard clientes={clientes} setView={v=>{setView(v);}} setFiltroEstagio={setFiltroEstagio} profile={profile} origemFiltro={origemFiltro} setOrigemFiltro={setOrigemFiltro} supervisorTeam={supervisorTeam} allTeams={allTeams}/>}"""
if old_dash in c:
    c = c.replace(old_dash, new_dash)
    print('  OK: allTeams passado ao Dashboard')
    changes += 1

old_pipe = """          {view==='pipeline'  && <BKOPipeline  clientes={clientes} profile={profile} dispatch={auditedDispatch} onSelect={id=>dispatch({type:'SEL',id})} filtroEstagio={filtroEstagio} setFiltroEstagio={setFiltroEstagio} funis={funis} origemFiltro={origemFiltro} setOrigemFiltro={setOrigemFiltro} supervisorTeam={supervisorTeam}/>}"""
new_pipe = """          {view==='pipeline'  && <BKOPipeline  clientes={clientes} profile={profile} dispatch={auditedDispatch} onSelect={id=>dispatch({type:'SEL',id})} filtroEstagio={filtroEstagio} setFiltroEstagio={setFiltroEstagio} funis={funis} origemFiltro={origemFiltro} setOrigemFiltro={setOrigemFiltro} supervisorTeam={supervisorTeam} allTeams={allTeams}/>}"""
if old_pipe in c:
    c = c.replace(old_pipe, new_pipe)
    print('  OK: allTeams passado ao Pipeline')
    changes += 1

old_cli = """          {view==='clientes'  && <BKOClientes  clientes={clientes} profile={profile} onSelect={id=>dispatch({type:'SEL',id})} onNew={()=>dispatch({type:'TNEW'})} origemFiltro={origemFiltro} setOrigemFiltro={setOrigemFiltro} supervisorTeam={supervisorTeam}/>}"""
new_cli = """          {view==='clientes'  && <BKOClientes  clientes={clientes} profile={profile} onSelect={id=>dispatch({type:'SEL',id})} onNew={()=>dispatch({type:'TNEW'})} origemFiltro={origemFiltro} setOrigemFiltro={setOrigemFiltro} supervisorTeam={supervisorTeam} allTeams={allTeams}/>}"""
if old_cli in c:
    c = c.replace(old_cli, new_cli)
    print('  OK: allTeams passado ao Clientes')
    changes += 1

# ── 4. Helper function para filtrar por origemFiltro com allTeams ─────────────
# Adicionar função helper antes do BKODashboard
filter_helper = """// ─── HELPER: filtra clientes para supervisor ─────────────────────────────────
function filtrarClientesSupervisor(clientes, origemFiltro, allTeams){
  if(!origemFiltro) return clientes.filter(c=>c.origem==='corban'||c.origem==='startec');
  if(origemFiltro==='corban') return clientes.filter(c=>c.origem==='corban');
  if(origemFiltro==='startec') return clientes.filter(c=>c.origem==='startec');
  // Filtro por equipe específica: origemFiltro = supervisor_id
  const team=allTeams.find(t=>t.supervisor_id===origemFiltro);
  if(team) return clientes.filter(c=>c.origem==='startec'&&team.operadores.includes(c.atribuido_a_id));
  return clientes;
}

"""

if 'filtrarClientesSupervisor' not in c:
    old_dash_fn = """function BKODashboard({clientes,setView,setFiltroEstagio,profile,origemFiltro,setOrigemFiltro,supervisorTeam}){"""
    if old_dash_fn in c:
        c = c.replace(old_dash_fn, filter_helper + old_dash_fn)
        print('  OK: helper filtrarClientesSupervisor adicionado')
        changes += 1

# ── 5. Atualizar BKODashboard ─────────────────────────────────────────────────
old_dash_fn = """function BKODashboard({clientes,setView,setFiltroEstagio,profile,origemFiltro,setOrigemFiltro,supervisorTeam}){
  const isComercial=profile?.role==='comercial';
  const isSupervisor=profile?.is_supervisor===true;
  const clientesFiltrados=useMemo(()=>{
    if(profile?.role==='startec'||profile?.role==='corban_bko')
      return clientes.filter(c=>c.atribuido_a_id===profile?.id);
    if(isComercial){
      // Supervisor: filtra por equipe própria quando 'startec', corbans quando 'corban', tudo quando null
      if(isSupervisor){
        if(origemFiltro==='startec') return clientes.filter(c=>c.origem==='startec'&&supervisorTeam.includes(c.atribuido_a_id));
        if(origemFiltro==='corban')  return clientes.filter(c=>c.origem==='corban');
        // Todos: corbans + equipe própria startec
        return clientes.filter(c=>c.origem==='corban'||(c.origem==='startec'&&supervisorTeam.includes(c.atribuido_a_id)));
      }
      if(origemFiltro) return clientes.filter(c=>c.origem===origemFiltro);
    }
    return clientes;
  },[clientes,profile,origemFiltro,supervisorTeam]);"""

new_dash_fn = """function BKODashboard({clientes,setView,setFiltroEstagio,profile,origemFiltro,setOrigemFiltro,supervisorTeam,allTeams}){
  const isComercial=profile?.role==='comercial';
  const isSupervisor=profile?.is_supervisor===true;
  const clientesFiltrados=useMemo(()=>{
    if(profile?.role==='startec'||profile?.role==='corban_bko')
      return clientes.filter(c=>c.atribuido_a_id===profile?.id);
    if(isComercial){
      if(isSupervisor) return filtrarClientesSupervisor(clientes,origemFiltro,allTeams);
      if(origemFiltro) return clientes.filter(c=>c.origem===origemFiltro);
    }
    return clientes;
  },[clientes,profile,origemFiltro,supervisorTeam,allTeams]);"""

if old_dash_fn in c:
    c = c.replace(old_dash_fn, new_dash_fn)
    print('  OK: BKODashboard filtro atualizado')
    changes += 1

# ── 6. Atualizar botões de filtro no Dashboard para supervisores ──────────────
old_dash_buttons = """        {isComercial&&(
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            <span style={{fontSize:11,color:'var(--text-muted)',marginRight:4}}>Equipe:</span>
            {[['todos',null,'Todos'],['corban','corban','Corbans'],['startec','startec','Startec']].map(([key,val,label])=>(
              <button key={key} onClick={()=>setOrigemFiltro(val)}
                style={{padding:'5px 14px',borderRadius:99,fontSize:12,fontWeight:600,cursor:'pointer',transition:'all .15s',
                  background:origemFiltro===val?(val==='startec'?'#059669':val==='corban'?B_MID:'rgba(0,0,0,.08)'):'transparent',
                  color:origemFiltro===val?'#fff':'var(--text-muted)',
                  border:`1px solid ${origemFiltro===val?(val==='startec'?'#059669':val==='corban'?B_MID:'rgba(0,0,0,.15)'):'var(--border)'}`,
                }}>
                {label}
              </button>
            ))}
          </div>
        )}"""

new_dash_buttons = """        {isComercial&&(
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
        )}"""

if old_dash_buttons in c:
    c = c.replace(old_dash_buttons, new_dash_buttons)
    print('  OK: botões de equipe no Dashboard atualizados')
    changes += 1

# ── 7. Atualizar BKOPipeline ──────────────────────────────────────────────────
old_pipe_fn = """function BKOPipeline({clientes,profile,dispatch,onSelect,filtroEstagio,setFiltroEstagio,funis,origemFiltro,setOrigemFiltro,supervisorTeam}){"""
new_pipe_fn = """function BKOPipeline({clientes,profile,dispatch,onSelect,filtroEstagio,setFiltroEstagio,funis,origemFiltro,setOrigemFiltro,supervisorTeam,allTeams}){"""
if old_pipe_fn in c:
    c = c.replace(old_pipe_fn, new_pipe_fn)
    print('  OK: BKOPipeline recebe allTeams')
    changes += 1

old_pipe_filter = """  // startec e corban_bko veem só os próprios; supervisor vê equipe+corbans; comercial normal vê tudo
  const isSupervisorP=profile?.is_supervisor===true;
  const clientesVisiveis=useMemo(()=>{
    if(profile?.role==='startec'||profile?.role==='corban_bko')
      return clientes.filter(c=>c.atribuido_a_id===profile?.id);
    if(profile?.role==='comercial'){
      if(isSupervisorP){
        if(origemFiltro==='startec') return clientes.filter(c=>c.origem==='startec'&&supervisorTeam.includes(c.atribuido_a_id));
        if(origemFiltro==='corban')  return clientes.filter(c=>c.origem==='corban');
        return clientes.filter(c=>c.origem==='corban'||(c.origem==='startec'&&supervisorTeam.includes(c.atribuido_a_id)));
      }
      if(origemFiltro) return clientes.filter(c=>c.origem===origemFiltro);
    }
    return clientes;
  },[clientes,profile,origemFiltro,supervisorTeam,isSupervisorP]);"""

new_pipe_filter = """  // startec e corban_bko veem só os próprios; supervisor vê todas as equipes; comercial normal vê tudo
  const isSupervisorP=profile?.is_supervisor===true;
  const clientesVisiveis=useMemo(()=>{
    if(profile?.role==='startec'||profile?.role==='corban_bko')
      return clientes.filter(c=>c.atribuido_a_id===profile?.id);
    if(profile?.role==='comercial'){
      if(isSupervisorP) return filtrarClientesSupervisor(clientes,origemFiltro,allTeams);
      if(origemFiltro) return clientes.filter(c=>c.origem===origemFiltro);
    }
    return clientes;
  },[clientes,profile,origemFiltro,supervisorTeam,isSupervisorP,allTeams]);"""

if old_pipe_filter in c:
    c = c.replace(old_pipe_filter, new_pipe_filter)
    print('  OK: BKOPipeline filtro atualizado')
    changes += 1

# ── 8. Atualizar botões no Pipeline ──────────────────────────────────────────
old_pipe_buttons = """          {/* Badge de filtro de equipe */}
          {profile?.role==='comercial'&&(
            <div style={{display:'flex',gap:5}}>
              {[['todos',null,'Todos'],['corban','corban','Corbans'],['startec','startec','Startec']].map(([key,val,label])=>(
                <button key={key} onClick={()=>setOrigemFiltro(val)}
                  style={{padding:'4px 12px',borderRadius:99,fontSize:11,fontWeight:600,cursor:'pointer',transition:'all .15s',
                    background:origemFiltro===val?(val==='startec'?'#059669':val==='corban'?B_MID:'rgba(0,0,0,.08)'):'transparent',
                    color:origemFiltro===val?'#fff':'var(--text-muted)',
                    border:`1px solid ${origemFiltro===val?(val==='startec'?'#059669':val==='corban'?B_MID:'rgba(0,0,0,.15)'):'var(--border)'}`,
                  }}>{label}</button>
              ))}
            </div>
          )}"""

new_pipe_buttons = """          {/* Badge de filtro de equipe */}
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
          )}"""

if old_pipe_buttons in c:
    c = c.replace(old_pipe_buttons, new_pipe_buttons)
    print('  OK: botões de equipe no Pipeline atualizados')
    changes += 1

# ── 9. Atualizar BKOClientes ──────────────────────────────────────────────────
old_cli_fn = """function BKOClientes({clientes,profile,onSelect,onNew,origemFiltro,setOrigemFiltro,supervisorTeam}){"""
new_cli_fn = """function BKOClientes({clientes,profile,onSelect,onNew,origemFiltro,setOrigemFiltro,supervisorTeam,allTeams}){"""
if old_cli_fn in c:
    c = c.replace(old_cli_fn, new_cli_fn)
    print('  OK: BKOClientes recebe allTeams')
    changes += 1

old_cli_base = """  // startec e corban_bko veem só os próprios; supervisor vê equipe+corbans
  const isSupervisorC=profile?.is_supervisor===true;
  const clientesBase=useMemo(()=>{
    if(profile?.role==='startec'||profile?.role==='corban_bko')
      return clientes.filter(c=>c.atribuido_a_id===profile?.id);
    if(profile?.role==='comercial'){
      if(isSupervisorC){
        if(origemFiltro==='startec') return clientes.filter(c=>c.origem==='startec'&&supervisorTeam.includes(c.atribuido_a_id));
        if(origemFiltro==='corban')  return clientes.filter(c=>c.origem==='corban');
        return clientes.filter(c=>c.origem==='corban'||(c.origem==='startec'&&supervisorTeam.includes(c.atribuido_a_id)));
      }
      if(origemFiltro) return clientes.filter(c=>c.origem===origemFiltro);
    }
    return clientes;
  },[clientes,profile,origemFiltro,supervisorTeam,isSupervisorC]);"""

new_cli_base = """  // startec e corban_bko veem só os próprios; supervisor vê todas as equipes
  const isSupervisorC=profile?.is_supervisor===true;
  const clientesBase=useMemo(()=>{
    if(profile?.role==='startec'||profile?.role==='corban_bko')
      return clientes.filter(c=>c.atribuido_a_id===profile?.id);
    if(profile?.role==='comercial'){
      if(isSupervisorC) return filtrarClientesSupervisor(clientes,origemFiltro,allTeams);
      if(origemFiltro) return clientes.filter(c=>c.origem===origemFiltro);
    }
    return clientes;
  },[clientes,profile,origemFiltro,supervisorTeam,isSupervisorC,allTeams]);"""

if old_cli_base in c:
    c = c.replace(old_cli_base, new_cli_base)
    print('  OK: BKOClientes filtro atualizado')
    changes += 1

# ── 10. Atualizar botões no Clientes ─────────────────────────────────────────
old_cli_buttons = """          {profile?.role==='comercial'&&(
            <div style={{display:'flex',gap:5}}>
              {[['todos',null,'Todos'],['corban','corban','Corbans'],['startec','startec','Startec']].map(([key,val,label])=>(
                <button key={key} onClick={()=>setOrigemFiltro(val)}
                  style={{padding:'5px 12px',borderRadius:99,fontSize:11,fontWeight:600,cursor:'pointer',transition:'all .15s',
                    background:origemFiltro===val?(val==='startec'?'#059669':val==='corban'?B_MID:'rgba(0,0,0,.08)'):'transparent',
                    color:origemFiltro===val?'#fff':'var(--text-muted)',
                    border:`1px solid ${origemFiltro===val?(val==='startec'?'#059669':val==='corban'?B_MID:'rgba(0,0,0,.15)'):'var(--border)'}`,
                  }}>{label}</button>
              ))}
            </div>
          )}"""

new_cli_buttons = """          {profile?.role==='comercial'&&(
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
          )}"""

if old_cli_buttons in c:
    c = c.replace(old_cli_buttons, new_cli_buttons)
    print('  OK: botões de equipe no Clientes atualizados')
    changes += 1

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print(f'\n  BKOApp.jsx: {changes} alteração(ões) aplicada(s)')
print('\nPronto! Rode: npm run dev')