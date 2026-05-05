# fix_startec_bkoapp.py
# Rode na raiz do projeto: python fix_startec_bkoapp.py

import os

bko_path = 'src/views/bko/BKOApp.jsx'

print('\n=== Fix: Roles Startec no BKOApp ===\n')

if not os.path.exists(bko_path):
    print(f'ERRO: {bko_path} não encontrado')
    exit()

with open(bko_path, 'r', encoding='utf-8') as f:
    bko = f.read()

changes = 0

# ── 1. Atualizar ROLE_LABELS ──────────────────────────────────────────────────
old_labels = "const ROLE_LABELS = { comercial:'Comercial', corban_bko:'Corban', bko:'BKO' };"
new_labels = "const ROLE_LABELS = { comercial:'Comercial', corban_bko:'Corban', bko:'BKO', startec:'Startec', supervisor_startec:'Supervisor Startec' };"
if old_labels in bko:
    bko = bko.replace(old_labels, new_labels)
    print('  OK: ROLE_LABELS atualizado')
    changes += 1

# ── 2. Atualizar ROLE_COLORS ──────────────────────────────────────────────────
old_colors = "const ROLE_COLORS = { comercial:'#3B5BDB', corban_bko:'#0EA5E9', bko:'#7C3AED' };"
new_colors = "const ROLE_COLORS = { comercial:'#3B5BDB', corban_bko:'#0EA5E9', bko:'#7C3AED', startec:'#059669', supervisor_startec:'#0D9488' };"
if old_colors in bko:
    bko = bko.replace(old_colors, new_colors)
    print('  OK: ROLE_COLORS atualizado')
    changes += 1

# ── 3. Menu da sidebar — startec vê só Dashboard, Pipeline e Clientes ─────────
old_items = """  const items=[
    {id:'dashboard',icon:'◈',label:'Dashboard'},
    {id:'pipeline', icon:'⊞',label:'Pipeline'},
    {id:'clientes', icon:'≡',label:'Clientes'},
    ...(r==='comercial'||r==='corban_bko'?[{id:'cadastrar',icon:'＋',label:'Cadastrar'}]:[]),
    ...(r==='comercial'?[{id:'auditoria',icon:'🔍',label:'Auditoria'}]:[]),
  ];"""
new_items = """  const items=[
    {id:'dashboard',icon:'◈',label:'Dashboard'},
    {id:'pipeline', icon:'⊞',label:'Pipeline'},
    {id:'clientes', icon:'≡',label:'Clientes'},
    ...(r==='comercial'||r==='corban_bko'||r==='startec'||r==='supervisor_startec'?[{id:'cadastrar',icon:'＋',label:'Cadastrar'}]:[]),
    ...(r==='comercial'||r==='supervisor_startec'?[{id:'auditoria',icon:'🔍',label:'Auditoria'}]:[]),
  ];"""
if old_items in bko:
    bko = bko.replace(old_items, new_items)
    print('  OK: menu sidebar atualizado para startec')
    changes += 1

# ── 4. Filtro no BKODashboard — startec vê só os próprios ────────────────────
old_dash_fn = "function BKODashboard({clientes,setView,setFiltroEstagio}){"
new_dash_fn = """function BKODashboard({clientes,setView,setFiltroEstagio,profile}){
  // startec vê apenas seus próprios clientes
  const clientesFiltrados = (profile?.role==='startec')
    ? clientes.filter(c=>c.atribuido_a_id===profile?.id)
    : clientes;"""
if old_dash_fn in bko:
    bko = bko.replace(old_dash_fn, new_dash_fn)
    print('  OK: BKODashboard filtrado para startec')
    changes += 1

# substituir uso de `clientes` por `clientesFiltrados` dentro do BKODashboard
# apenas as linhas de counts e recent
old_dash_counts = "  const counts=useMemo(()=>{const m={};BKO_STAGES.forEach(s=>{m[s.id]=clientes.filter(c=>c.estagio===s.id).length;});return m;},[clientes]);"
new_dash_counts = "  const counts=useMemo(()=>{const m={};BKO_STAGES.forEach(s=>{m[s.id]=clientesFiltrados.filter(c=>c.estagio===s.id).length;});return m;},[clientesFiltrados]);"
if old_dash_counts in bko:
    bko = bko.replace(old_dash_counts, new_dash_counts)
    print('  OK: contagem do dashboard filtrada para startec')
    changes += 1

old_dash_recent = "  const recent=useMemo(()=>clientes.flatMap(c=>(c.activities||[]).map(a=>({...a,clienteName:c.nomeCliente}))).sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,8),[clientes]);"
new_dash_recent = "  const recent=useMemo(()=>clientesFiltrados.flatMap(c=>(c.activities||[]).map(a=>({...a,clienteName:c.nomeCliente}))).sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,8),[clientesFiltrados]);"
if old_dash_recent in bko:
    bko = bko.replace(old_dash_recent, new_dash_recent)
    print('  OK: atividade recente do dashboard filtrada para startec')
    changes += 1

# ── 5. Passar profile para BKODashboard ──────────────────────────────────────
old_dash_call = "{view==='dashboard' && <BKODashboard clientes={clientes} setView={v=>{setView(v);}} setFiltroEstagio={setFiltroEstagio}/>}"
new_dash_call = "{view==='dashboard' && <BKODashboard clientes={clientes} setView={v=>{setView(v);}} setFiltroEstagio={setFiltroEstagio} profile={profile}/>}"
if old_dash_call in bko:
    bko = bko.replace(old_dash_call, new_dash_call)
    print('  OK: profile passado para BKODashboard')
    changes += 1

# ── 6. Filtro no BKOPipeline — startec vê só os próprios ─────────────────────
old_pipe_filter = "  const pipelineClientes=clientes.filter(c=>!c.funil_id);"
new_pipe_filter = """  // startec vê apenas seus próprios clientes
  const clientesVisiveis = (profile?.role==='startec')
    ? clientes.filter(c=>c.atribuido_a_id===profile?.id)
    : clientes;
  const pipelineClientes=clientesVisiveis.filter(c=>!c.funil_id);"""
if old_pipe_filter in bko:
    bko = bko.replace(old_pipe_filter, new_pipe_filter)
    print('  OK: BKOPipeline filtrado para startec')
    changes += 1

# ── 7. Filtro na BKOClientes — startec vê só os próprios ─────────────────────
old_cli_filter = """  const filtered=useMemo(()=>clientes.filter(c=>{
    if(estagio&&c.estagio!==estagio) return false;
    if(prefeitura&&c.prefeitura!==prefeitura) return false;
    if(criadoPor&&c.criado_por_nome!==criadoPor) return false;
    if(atribuidoA&&c.atribuido_a_nome!==atribuidoA) return false;
    if(search){const s=search.toLowerCase();if(!c.nomeCliente?.toLowerCase().includes(s)&&!c.cpfCliente?.includes(s)) return false;}
    return true;
  }),[clientes,search,estagio,prefeitura,criadoPor,atribuidoA]);"""
new_cli_filter = """  const clientesBase = (profile?.role==='startec')
    ? clientes.filter(c=>c.atribuido_a_id===profile?.id)
    : clientes;
  const filtered=useMemo(()=>clientesBase.filter(c=>{
    if(estagio&&c.estagio!==estagio) return false;
    if(prefeitura&&c.prefeitura!==prefeitura) return false;
    if(criadoPor&&c.criado_por_nome!==criadoPor) return false;
    if(atribuidoA&&c.atribuido_a_nome!==atribuidoA) return false;
    if(search){const s=search.toLowerCase();if(!c.nomeCliente?.toLowerCase().includes(s)&&!c.cpfCliente?.includes(s)) return false;}
    return true;
  }),[clientesBase,search,estagio,prefeitura,criadoPor,atribuidoA]);"""
if old_cli_filter in bko:
    bko = bko.replace(old_cli_filter, new_cli_filter)
    print('  OK: BKOClientes filtrado para startec')
    changes += 1

# ── 8. Auto-atribuição quando startec/supervisor_startec cria cliente ─────────
old_add = """    if(action.type==='ADD'){
      const c=action.c;
      const {error}=await supabase.from('bko_clientes').insert({id:c.id,data:{...c},estagio:c.estagio||'clientes_novos',criado_por_id:session.user.id,criado_por_nome:profile.nome,criado_por_role:profile.role});"""
new_add = """    if(action.type==='ADD'){
      const c=action.c;
      // startec e supervisor_startec: auto-atribuição ao criador
      const autoAtrib = (profile.role==='startec'||profile.role==='supervisor_startec');
      const {error}=await supabase.from('bko_clientes').insert({id:c.id,data:{...c},estagio:c.estagio||'clientes_novos',criado_por_id:session.user.id,criado_por_nome:profile.nome,criado_por_role:profile.role,atribuido_a_id:autoAtrib?session.user.id:null,atribuido_a_nome:autoAtrib?profile.nome:null});"""
if old_add in bko:
    bko = bko.replace(old_add, new_add)
    print('  OK: auto-atribuição para startec/supervisor_startec ao criar cliente')
    changes += 1

with open(bko_path, 'w', encoding='utf-8') as f:
    f.write(bko)

print(f'\n  BKOApp.jsx: {changes} alteração(ões) aplicada(s)')
print('\nPróximo: python fix_startec_bkodetail.py')