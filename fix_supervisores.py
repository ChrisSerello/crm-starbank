# fix_supervisores.py
# Rode na raiz do projeto: python fix_supervisores.py

import os

path = 'src/views/bko/BKOApp.jsx'
print('\n=== Fix: Supervisores Startec ===\n')

if not os.path.exists(path):
    print(f'ERRO: {path} não encontrado')
    exit()

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

changes = 0

# ── 1. Adicionar state e load da equipe do supervisor no BKOApp ───────────────
old_state = """  const [filtroEstagio,setFiltroEstagio]=useState(null);
  // Filtro de equipe (só Comercial): null=todos | 'corban'=Corbans | 'startec'=Startec
  const [origemFiltro,setOrigemFiltro]=useState(null);"""
new_state = """  const [filtroEstagio,setFiltroEstagio]=useState(null);
  // Filtro de equipe (só Comercial): null=todos | 'corban'=Corbans | 'startec'=Startec
  const [origemFiltro,setOrigemFiltro]=useState(null);
  // Equipe do supervisor: IDs dos operadores sob supervisão
  const [supervisorTeam,setSupervisorTeam]=useState([]);"""
if old_state in c:
    c = c.replace(old_state, new_state)
    print('  OK: supervisorTeam state adicionado')
    changes += 1

# ── 2. Carregar equipe do supervisor após login ───────────────────────────────
old_funis_load = """  useEffect(()=>{
    supabase.from('bko_funis').select('*').eq('ativo',true).order('ordem').then(({data})=>setFunis(data||[]));"""
new_funis_load = """  // Carregar equipe do supervisor (operadores vinculados a este supervisor)
  useEffect(()=>{
    if(!profile?.is_supervisor||!profile?.id) return;
    supabase.from('profiles')
      .select('id,nome')
      .eq('modulo','bko')
      .eq('role','startec')
      .eq('supervisor_id',profile.id)
      .then(({data})=>setSupervisorTeam((data||[]).map(o=>o.id)));
  },[profile?.id,profile?.is_supervisor]);

  useEffect(()=>{
    supabase.from('bko_funis').select('*').eq('ativo',true).order('ordem').then(({data})=>setFunis(data||[]));"""
if old_funis_load in c:
    c = c.replace(old_funis_load, new_funis_load)
    print('  OK: carregamento da equipe do supervisor adicionado')
    changes += 1

# ── 3. Passar supervisorTeam para Dashboard, Pipeline e Clientes ──────────────
old_dash = """          {view==='dashboard' && <BKODashboard clientes={clientes} setView={v=>{setView(v);}} setFiltroEstagio={setFiltroEstagio} profile={profile} origemFiltro={origemFiltro} setOrigemFiltro={setOrigemFiltro}/>}"""
new_dash = """          {view==='dashboard' && <BKODashboard clientes={clientes} setView={v=>{setView(v);}} setFiltroEstagio={setFiltroEstagio} profile={profile} origemFiltro={origemFiltro} setOrigemFiltro={setOrigemFiltro} supervisorTeam={supervisorTeam}/>}"""
if old_dash in c:
    c = c.replace(old_dash, new_dash)
    print('  OK: supervisorTeam passado ao Dashboard')
    changes += 1

old_pipe = """          {view==='pipeline'  && <BKOPipeline  clientes={clientes} profile={profile} dispatch={auditedDispatch} onSelect={id=>dispatch({type:'SEL',id})} filtroEstagio={filtroEstagio} setFiltroEstagio={setFiltroEstagio} funis={funis} origemFiltro={origemFiltro} setOrigemFiltro={setOrigemFiltro}/>}"""
new_pipe = """          {view==='pipeline'  && <BKOPipeline  clientes={clientes} profile={profile} dispatch={auditedDispatch} onSelect={id=>dispatch({type:'SEL',id})} filtroEstagio={filtroEstagio} setFiltroEstagio={setFiltroEstagio} funis={funis} origemFiltro={origemFiltro} setOrigemFiltro={setOrigemFiltro} supervisorTeam={supervisorTeam}/>}"""
if old_pipe in c:
    c = c.replace(old_pipe, new_pipe)
    print('  OK: supervisorTeam passado ao Pipeline')
    changes += 1

old_cli = """          {view==='clientes'  && <BKOClientes  clientes={clientes} profile={profile} onSelect={id=>dispatch({type:'SEL',id})} onNew={()=>dispatch({type:'TNEW'})} origemFiltro={origemFiltro} setOrigemFiltro={setOrigemFiltro}/>}"""
new_cli = """          {view==='clientes'  && <BKOClientes  clientes={clientes} profile={profile} onSelect={id=>dispatch({type:'SEL',id})} onNew={()=>dispatch({type:'TNEW'})} origemFiltro={origemFiltro} setOrigemFiltro={setOrigemFiltro} supervisorTeam={supervisorTeam}/>}"""
if old_cli in c:
    c = c.replace(old_cli, new_cli)
    print('  OK: supervisorTeam passado ao Clientes')
    changes += 1

# ── 4. Atualizar filtro no BKODashboard ───────────────────────────────────────
old_dash_fn = """function BKODashboard({clientes,setView,setFiltroEstagio,profile,origemFiltro,setOrigemFiltro}){
  const isComercial=profile?.role==='comercial';
  const clientesFiltrados=useMemo(()=>{
    if(profile?.role==='startec'||profile?.role==='corban_bko')
      return clientes.filter(c=>c.atribuido_a_id===profile?.id);
    if(isComercial&&origemFiltro)
      return clientes.filter(c=>c.origem===origemFiltro);
    return clientes;
  },[clientes,profile,origemFiltro]);"""
new_dash_fn = """function BKODashboard({clientes,setView,setFiltroEstagio,profile,origemFiltro,setOrigemFiltro,supervisorTeam}){
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
if old_dash_fn in c:
    c = c.replace(old_dash_fn, new_dash_fn)
    print('  OK: BKODashboard atualizado com lógica de supervisor')
    changes += 1

# ── 5. Atualizar filtro no BKOPipeline ───────────────────────────────────────
old_pipe_fn = """function BKOPipeline({clientes,profile,dispatch,onSelect,filtroEstagio,setFiltroEstagio,funis,origemFiltro,setOrigemFiltro}){"""
new_pipe_fn = """function BKOPipeline({clientes,profile,dispatch,onSelect,filtroEstagio,setFiltroEstagio,funis,origemFiltro,setOrigemFiltro,supervisorTeam}){"""
if old_pipe_fn in c:
    c = c.replace(old_pipe_fn, new_pipe_fn)
    print('  OK: BKOPipeline recebe supervisorTeam')
    changes += 1

old_pipe_filter = """  // startec e corban_bko veem só os próprios; bko e comercial veem tudo
  const clientesVisiveis=useMemo(()=>{
    if(profile?.role==='startec'||profile?.role==='corban_bko')
      return clientes.filter(c=>c.atribuido_a_id===profile?.id);
    if(profile?.role==='comercial'&&origemFiltro)
      return clientes.filter(c=>c.origem===origemFiltro);
    return clientes;
  },[clientes,profile,origemFiltro]);"""
new_pipe_filter = """  // startec e corban_bko veem só os próprios; supervisor vê equipe+corbans; comercial normal vê tudo
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
if old_pipe_filter in c:
    c = c.replace(old_pipe_filter, new_pipe_filter)
    print('  OK: BKOPipeline filtro atualizado com lógica de supervisor')
    changes += 1

# ── 6. Atualizar filtro no BKOClientes ────────────────────────────────────────
old_cli_fn = """function BKOClientes({clientes,profile,onSelect,onNew,origemFiltro,setOrigemFiltro}){"""
new_cli_fn = """function BKOClientes({clientes,profile,onSelect,onNew,origemFiltro,setOrigemFiltro,supervisorTeam}){"""
if old_cli_fn in c:
    c = c.replace(old_cli_fn, new_cli_fn)
    print('  OK: BKOClientes recebe supervisorTeam')
    changes += 1

old_cli_base = """  // startec e corban_bko veem só os próprios; comercial respeita origemFiltro
  const clientesBase=useMemo(()=>{
    if(profile?.role==='startec'||profile?.role==='corban_bko')
      return clientes.filter(c=>c.atribuido_a_id===profile?.id);
    if(profile?.role==='comercial'&&origemFiltro)
      return clientes.filter(c=>c.origem===origemFiltro);
    return clientes;
  },[clientes,profile,origemFiltro]);"""
new_cli_base = """  // startec e corban_bko veem só os próprios; supervisor vê equipe+corbans
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
if old_cli_base in c:
    c = c.replace(old_cli_base, new_cli_base)
    print('  OK: BKOClientes filtro atualizado com lógica de supervisor')
    changes += 1

# ── 7. Modal de cadastro: dropdown de supervisor para startec ─────────────────
old_modal_header = """      {msg?.t==='error'&&<div style={{padding:'8px 12px',borderRadius:7,marginBottom:12,background:'var(--danger-dim)',border:'1px solid rgba(192,65,58,.2)',fontSize:11,color:'var(--danger)'}}>{msg.text}</div>}
            <div style={{marginBottom:10}}>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Papel</label>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {[['corban_bko','Corban'],['bko','BKO'],['startec','Startec']].map(([v,l])=>(
                  <button key={v} onClick={()=>setForm(f=>({...f,role:v}))}
                    style={{flex:1,minWidth:80,padding:'8px 0',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',background:form.role===v?ROLE_COLORS[v]:'rgba(0,0,0,.05)',color:form.role===v?'#fff':'var(--text-secondary)',border:form.role===v?'none':'1px solid var(--border)',transition:'all .15s'}}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:10}}><label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Nome completo</label><input className="inp" value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Nome"/></div>"""
new_modal_header = """      {msg?.t==='error'&&<div style={{padding:'8px 12px',borderRadius:7,marginBottom:12,background:'var(--danger-dim)',border:'1px solid rgba(192,65,58,.2)',fontSize:11,color:'var(--danger)'}}>{msg.text}</div>}
            <div style={{marginBottom:10}}>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Papel</label>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {[['corban_bko','Corban'],['bko','BKO'],['startec','Startec']].map(([v,l])=>(
                  <button key={v} onClick={()=>setForm(f=>({...f,role:v,supervisor_id:''}))}
                    style={{flex:1,minWidth:80,padding:'8px 0',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',background:form.role===v?ROLE_COLORS[v]:'rgba(0,0,0,.05)',color:form.role===v?'#fff':'var(--text-secondary)',border:form.role===v?'none':'1px solid var(--border)',transition:'all .15s'}}>{l}</button>
                ))}
              </div>
            </div>
            {/* Dropdown de supervisor — só aparece quando role é startec */}
            {form.role==='startec'&&(
              <div style={{marginBottom:10}}>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Supervisor</label>
                <SupervisorSelect value={form.supervisor_id||''} onChange={v=>setForm(f=>({...f,supervisor_id:v}))}/>
              </div>
            )}
            <div style={{marginBottom:10}}><label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Nome completo</label><input className="inp" value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Nome"/></div>"""
if old_modal_header in c:
    c = c.replace(old_modal_header, new_modal_header)
    print('  OK: dropdown de supervisor adicionado no modal')
    changes += 1

# ── 8. Adicionar componente SupervisorSelect antes do BKOCadastrar ────────────
old_cadastrar_fn = """// ─── CADASTRAR ───────────────────────────────────────────────────────────────
function BKOCadastrar({profile,session,funis=[],setFunis}){"""
new_cadastrar_fn = """// ─── SUPERVISOR SELECT ───────────────────────────────────────────────────────
function SupervisorSelect({value,onChange}){
  const [supervisores,setSupervisores]=useState([]);
  useEffect(()=>{
    supabase.from('profiles')
      .select('id,nome')
      .eq('modulo','bko')
      .eq('is_supervisor',true)
      .order('nome')
      .then(({data})=>setSupervisores(data||[]));
  },[]);
  return(
    <select className="sel" value={value} onChange={e=>onChange(e.target.value)}>
      <option value="">— Sem supervisor —</option>
      {supervisores.map(s=><option key={s.id} value={s.id}>{s.nome}</option>)}
    </select>
  );
}

// ─── CADASTRAR ───────────────────────────────────────────────────────────────
function BKOCadastrar({profile,session,funis=[],setFunis}){"""
if old_cadastrar_fn in c:
    c = c.replace(old_cadastrar_fn, new_cadastrar_fn)
    print('  OK: componente SupervisorSelect adicionado')
    changes += 1

# ── 9. Salvar supervisor_id após criação do usuário startec ──────────────────
old_save_success = """      else{setMsg({t:'success',text:`✓ ${form.nome} criado! Já pode fazer login.`});setShowModal(false);setForm({nome:'',email:'',senha:'',role:'corban_bko'});load();}"""
new_save_success = """      else{
          // Se for startec e tiver supervisor selecionado, vincular
          if(form.role==='startec'&&form.supervisor_id){
            await supabase.from('profiles')
              .update({supervisor_id:form.supervisor_id})
              .ilike('email',form.email.trim().toLowerCase());
          }
          setMsg({t:'success',text:`✓ ${form.nome} criado! Já pode fazer login.`});
          setShowModal(false);
          setForm({nome:'',email:'',senha:'',role:'corban_bko',supervisor_id:''});
          load();
        }"""
if old_save_success in c:
    c = c.replace(old_save_success, new_save_success)
    print('  OK: supervisor_id salvo após criação do usuário')
    changes += 1

# ── 10. Inicializar form com supervisor_id ────────────────────────────────────
old_form_init = """  const [form,setForm]=useState({nome:'',email:'',senha:'',role:'corban_bko'});"""
new_form_init = """  const [form,setForm]=useState({nome:'',email:'',senha:'',role:'corban_bko',supervisor_id:''});"""
if old_form_init in c:
    c = c.replace(old_form_init, new_form_init)
    print('  OK: form inicializado com supervisor_id')
    changes += 1

# ── 11. Resetar form corretamente ao abrir modal ──────────────────────────────
old_open_modal = """        <button className="btn" style={{background:B_MID,color:'#fff',boxShadow:`0 3px 12px ${B_GLOW}`}} onClick={()=>{setForm({nome:'',email:'',senha:'',role:'corban_bko'});setMsg(null);setShowModal(true);}}>+ Adicionar usuário</button>"""
new_open_modal = """        <button className="btn" style={{background:B_MID,color:'#fff',boxShadow:`0 3px 12px ${B_GLOW}`}} onClick={()=>{setForm({nome:'',email:'',senha:'',role:'corban_bko',supervisor_id:''});setMsg(null);setShowModal(true);}}>+ Adicionar usuário</button>"""
if old_open_modal in c:
    c = c.replace(old_open_modal, new_open_modal)
    print('  OK: abertura do modal reseta supervisor_id')
    changes += 1

# ── 12. Também resetar ao fechar modal ───────────────────────────────────────
old_close_modal = """              <button onClick={()=>{setShowModal(false);setMsg(null);}} style={{background:'rgba(0,0,0,.06)',border:'1px solid var(--border)',borderRadius:8,cursor:'pointer',width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>×</button>"""
# This one just closes, no form reset needed

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print(f'\n  BKOApp.jsx: {changes} alteração(ões) aplicada(s)')
print('\nPronto! Rode o SQL primeiro, depois: npm run dev')