# fix_origem_filter.py
# Rode na raiz do projeto: python fix_origem_filter.py

import os

path = 'src/views/bko/BKOApp.jsx'
print('\n=== Fix: Filtro de origem (Corbans / Startec / Todos) ===\n')

if not os.path.exists(path):
    print(f'ERRO: {path} não encontrado')
    exit()

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

changes = 0

# ── 1. Adicionar origemFiltro no BKOApp state ────────────────────────────────
old_state = """  const [filtroEstagio,setFiltroEstagio]=useState(null);"""
new_state = """  const [filtroEstagio,setFiltroEstagio]=useState(null);
  // Filtro de equipe (só Comercial): null=todos | 'corban'=Corbans | 'startec'=Startec
  const [origemFiltro,setOrigemFiltro]=useState(null);"""
if old_state in c:
    c = c.replace(old_state, new_state)
    print('  OK: origemFiltro state adicionado')
    changes += 1

# ── 2. Salvar origem no INSERT do auditedDispatch ────────────────────────────
old_insert = """      const autoAtrib=(profile.role==='startec');
      const {error}=await supabase.from('bko_clientes').insert({
        id:c.id,data:{...c},estagio:c.estagio||'clientes_novos',
        criado_por_id:session.user.id,criado_por_nome:profile.nome,criado_por_role:profile.role,
        atribuido_a_id:autoAtrib?session.user.id:null,
        atribuido_a_nome:autoAtrib?profile.nome:null,
      });"""
new_insert = """      const autoAtrib=(profile.role==='startec');
      const origemCliente=profile.role==='startec'?'startec':profile.role==='corban_bko'?'corban':'interno';
      const {error}=await supabase.from('bko_clientes').insert({
        id:c.id,data:{...c},estagio:c.estagio||'clientes_novos',
        criado_por_id:session.user.id,criado_por_nome:profile.nome,criado_por_role:profile.role,
        atribuido_a_id:autoAtrib?session.user.id:null,
        atribuido_a_nome:autoAtrib?profile.nome:null,
        origem:origemCliente,
      });"""
if old_insert in c:
    c = c.replace(old_insert, new_insert)
    print('  OK: origem salvo no INSERT')
    changes += 1

# ── 3. Carregar origem no SET_C e RT_ADD ────────────────────────────────────
old_load = """        const loaded=(data||[]).map(r=>({...r.data,id:r.id,estagio:r.estagio,criado_por_id:r.criado_por_id,criado_por_nome:r.criado_por_nome,criado_por_role:r.criado_por_role,atribuido_a_id:r.atribuido_a_id||null,atribuido_a_nome:r.atribuido_a_nome||null,responsavel_bko_id:r.responsavel_bko_id||null,responsavel_bko_nome:r.responsavel_bko_nome||null}));"""
new_load = """        const loaded=(data||[]).map(r=>({...r.data,id:r.id,estagio:r.estagio,criado_por_id:r.criado_por_id,criado_por_nome:r.criado_por_nome,criado_por_role:r.criado_por_role,atribuido_a_id:r.atribuido_a_id||null,atribuido_a_nome:r.atribuido_a_nome||null,responsavel_bko_id:r.responsavel_bko_id||null,responsavel_bko_nome:r.responsavel_bko_nome||null,origem:r.origem||null}));"""
if old_load in c:
    c = c.replace(old_load, new_load)
    print('  OK: origem carregado no SET_C')
    changes += 1

old_rt = """        dispatch({type:'RT_ADD',c:{...r.data,id:r.id,estagio:r.estagio,criado_por_id:r.criado_por_id,criado_por_nome:r.criado_por_nome,criado_por_role:r.criado_por_role,atribuido_a_id:r.atribuido_a_id||null,atribuido_a_nome:r.atribuido_a_nome||null,responsavel_bko_id:r.responsavel_bko_id||null,responsavel_bko_nome:r.responsavel_bko_nome||null}});"""
new_rt = """        dispatch({type:'RT_ADD',c:{...r.data,id:r.id,estagio:r.estagio,criado_por_id:r.criado_por_id,criado_por_nome:r.criado_por_nome,criado_por_role:r.criado_por_role,atribuido_a_id:r.atribuido_a_id||null,atribuido_a_nome:r.atribuido_a_nome||null,responsavel_bko_id:r.responsavel_bko_id||null,responsavel_bko_nome:r.responsavel_bko_nome||null,origem:r.origem||null}});"""
if old_rt in c:
    c = c.replace(old_rt, new_rt)
    print('  OK: origem carregado no RT_ADD')
    changes += 1

old_upd = """        dispatch({type:'UPD',c:{...r.data,id:r.id,estagio:r.estagio,criado_por_id:r.criado_por_id,criado_por_nome:r.criado_por_nome,criado_por_role:r.criado_por_role,atribuido_a_id:r.atribuido_a_id||null,atribuido_a_nome:r.atribuido_a_nome||null,responsavel_bko_id:r.responsavel_bko_id||null,responsavel_bko_nome:r.responsavel_bko_nome||null}});"""
new_upd = """        dispatch({type:'UPD',c:{...r.data,id:r.id,estagio:r.estagio,criado_por_id:r.criado_por_id,criado_por_nome:r.criado_por_nome,criado_por_role:r.criado_por_role,atribuido_a_id:r.atribuido_a_id||null,atribuido_a_nome:r.atribuido_a_nome||null,responsavel_bko_id:r.responsavel_bko_id||null,responsavel_bko_nome:r.responsavel_bko_nome||null,origem:r.origem||null}});"""
if old_upd in c:
    c = c.replace(old_upd, new_upd)
    print('  OK: origem carregado no UPD')
    changes += 1

# ── 4. Passar origemFiltro para Dashboard, Pipeline e Clientes ───────────────
old_dash_call = """          {view==='dashboard' && <BKODashboard clientes={clientes} setView={v=>{setView(v);}} setFiltroEstagio={setFiltroEstagio} profile={profile}/>}"""
new_dash_call = """          {view==='dashboard' && <BKODashboard clientes={clientes} setView={v=>{setView(v);}} setFiltroEstagio={setFiltroEstagio} profile={profile} origemFiltro={origemFiltro} setOrigemFiltro={setOrigemFiltro}/>}"""
if old_dash_call in c:
    c = c.replace(old_dash_call, new_dash_call)
    print('  OK: origemFiltro passado ao Dashboard')
    changes += 1

old_pipe_call = """          {view==='pipeline'  && <BKOPipeline  clientes={clientes} profile={profile} dispatch={auditedDispatch} onSelect={id=>dispatch({type:'SEL',id})} filtroEstagio={filtroEstagio} setFiltroEstagio={setFiltroEstagio} funis={funis}/>}"""
new_pipe_call = """          {view==='pipeline'  && <BKOPipeline  clientes={clientes} profile={profile} dispatch={auditedDispatch} onSelect={id=>dispatch({type:'SEL',id})} filtroEstagio={filtroEstagio} setFiltroEstagio={setFiltroEstagio} funis={funis} origemFiltro={origemFiltro} setOrigemFiltro={setOrigemFiltro}/>}"""
if old_pipe_call in c:
    c = c.replace(old_pipe_call, new_pipe_call)
    print('  OK: origemFiltro passado ao Pipeline')
    changes += 1

old_cli_call = """          {view==='clientes'  && <BKOClientes  clientes={clientes} profile={profile} onSelect={id=>dispatch({type:'SEL',id})} onNew={()=>dispatch({type:'TNEW'})}/>}"""
new_cli_call = """          {view==='clientes'  && <BKOClientes  clientes={clientes} profile={profile} onSelect={id=>dispatch({type:'SEL',id})} onNew={()=>dispatch({type:'TNEW'})} origemFiltro={origemFiltro} setOrigemFiltro={setOrigemFiltro}/>}"""
if old_cli_call in c:
    c = c.replace(old_cli_call, new_cli_call)
    print('  OK: origemFiltro passado ao Clientes')
    changes += 1

# ── 5. BKODashboard: dois blocos para Comercial + receber props ──────────────
old_dash_fn = """function BKODashboard({clientes,setView,setFiltroEstagio,profile}){
  const clientesFiltrados=useMemo(()=>
    (profile?.role==='startec'||profile?.role==='corban_bko')
      ? clientes.filter(c=>c.atribuido_a_id===profile?.id)
      : clientes
  ,[clientes,profile]);"""
new_dash_fn = """function BKODashboard({clientes,setView,setFiltroEstagio,profile,origemFiltro,setOrigemFiltro}){
  const isComercial=profile?.role==='comercial';
  const clientesFiltrados=useMemo(()=>{
    if(profile?.role==='startec'||profile?.role==='corban_bko')
      return clientes.filter(c=>c.atribuido_a_id===profile?.id);
    if(isComercial&&origemFiltro)
      return clientes.filter(c=>c.origem===origemFiltro);
    return clientes;
  },[clientes,profile,origemFiltro]);"""
if old_dash_fn in c:
    c = c.replace(old_dash_fn, new_dash_fn)
    print('  OK: BKODashboard atualizado com origemFiltro')
    changes += 1

# ── 6. Adicionar blocos de equipe no Dashboard do Comercial ──────────────────
old_dash_header = """      <div style={{marginBottom:24}}><div className="section-title">Dashboard</div><div className="section-sub">BKO Backoffice · {fmtD(TODAY)}</div></div>"""
new_dash_header = """      <div style={{marginBottom:24,display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div><div className="section-title">Dashboard</div><div className="section-sub">BKO Backoffice · {fmtD(TODAY)}</div></div>
        {isComercial&&(
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
        )}
      </div>"""
if old_dash_header in c:
    c = c.replace(old_dash_header, new_dash_header)
    print('  OK: seletor de equipe adicionado no Dashboard')
    changes += 1

# ── 7. BKOPipeline: receber origemFiltro e aplicar filtro ───────────────────
old_pipe_fn = """function BKOPipeline({clientes,profile,dispatch,onSelect,filtroEstagio,setFiltroEstagio,funis}){"""
new_pipe_fn = """function BKOPipeline({clientes,profile,dispatch,onSelect,filtroEstagio,setFiltroEstagio,funis,origemFiltro,setOrigemFiltro}){"""
if old_pipe_fn in c:
    c = c.replace(old_pipe_fn, new_pipe_fn)
    print('  OK: BKOPipeline recebe origemFiltro')
    changes += 1

# Aplicar filtro de origem no pipeline (após o filtro de startec/corban)
old_pipe_filter = """  // startec e corban_bko veem só os próprios; bko e comercial veem tudo
  const clientesVisiveis=useMemo(()=>
    (profile?.role==='startec'||profile?.role==='corban_bko')
      ? clientes.filter(c=>c.atribuido_a_id===profile?.id)
      : clientes
  ,[clientes,profile]);"""
new_pipe_filter = """  // startec e corban_bko veem só os próprios; bko e comercial veem tudo
  const clientesVisiveis=useMemo(()=>{
    if(profile?.role==='startec'||profile?.role==='corban_bko')
      return clientes.filter(c=>c.atribuido_a_id===profile?.id);
    if(profile?.role==='comercial'&&origemFiltro)
      return clientes.filter(c=>c.origem===origemFiltro);
    return clientes;
  },[clientes,profile,origemFiltro]);"""
if old_pipe_filter in c:
    c = c.replace(old_pipe_filter, new_pipe_filter)
    print('  OK: filtro de origem aplicado no Pipeline')
    changes += 1

# Badge de filtro ativo no Pipeline header
old_pipe_badge = """          {!funilSel&&filtroEstagio&&(
            <div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:99,background:B_LIGHT,border:`1px solid ${B_MID}30`,fontSize:11,color:B_MID,fontWeight:600}}>
              {BKO_STAGES.find(s=>s.id===filtroEstagio)?.label}
              <button onClick={()=>setFiltroEstagio(null)} style={{background:'none',border:'none',cursor:'pointer',color:B_MID,fontSize:13,lineHeight:1,padding:0}}>×</button>
            </div>
          )}"""
new_pipe_badge = """          {/* Badge de filtro de equipe */}
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
          )}
          {!funilSel&&filtroEstagio&&(
            <div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:99,background:B_LIGHT,border:`1px solid ${B_MID}30`,fontSize:11,color:B_MID,fontWeight:600}}>
              {BKO_STAGES.find(s=>s.id===filtroEstagio)?.label}
              <button onClick={()=>setFiltroEstagio(null)} style={{background:'none',border:'none',cursor:'pointer',color:B_MID,fontSize:13,lineHeight:1,padding:0}}>×</button>
            </div>
          )}"""
if old_pipe_badge in c:
    c = c.replace(old_pipe_badge, new_pipe_badge)
    print('  OK: badge de equipe adicionado no Pipeline')
    changes += 1

# ── 8. BKOClientes: receber e aplicar origemFiltro ───────────────────────────
old_cli_fn = """function BKOClientes({clientes,profile,onSelect,onNew}){"""
new_cli_fn = """function BKOClientes({clientes,profile,onSelect,onNew,origemFiltro,setOrigemFiltro}){"""
if old_cli_fn in c:
    c = c.replace(old_cli_fn, new_cli_fn)
    print('  OK: BKOClientes recebe origemFiltro')
    changes += 1

old_cli_base = """  // startec e corban_bko veem só os próprios
  const clientesBase=useMemo(()=>
    (profile?.role==='startec'||profile?.role==='corban_bko')
      ? clientes.filter(c=>c.atribuido_a_id===profile?.id)
      : clientes
  ,[clientes,profile]);"""
new_cli_base = """  // startec e corban_bko veem só os próprios; comercial respeita origemFiltro
  const clientesBase=useMemo(()=>{
    if(profile?.role==='startec'||profile?.role==='corban_bko')
      return clientes.filter(c=>c.atribuido_a_id===profile?.id);
    if(profile?.role==='comercial'&&origemFiltro)
      return clientes.filter(c=>c.origem===origemFiltro);
    return clientes;
  },[clientes,profile,origemFiltro]);"""
if old_cli_base in c:
    c = c.replace(old_cli_base, new_cli_base)
    print('  OK: filtro de origem aplicado no Clientes')
    changes += 1

# Adicionar seletor de equipe no header do Clientes
old_cli_header = """      <div className="fu" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:16}}>
        <div><div className="section-title">Clientes</div><div className="section-sub">{filtered.length} de {clientesBase.length} registros</div></div>
        <button className="btn" style={{background:B_MID,color:'#fff',boxShadow:`0 3px 14px ${B_GLOW}`}} onClick={onNew}>+ Novo Cliente</button>
      </div>"""
new_cli_header = """      <div className="fu" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:16,flexWrap:'wrap',gap:10}}>
        <div><div className="section-title">Clientes</div><div className="section-sub">{filtered.length} de {clientesBase.length} registros</div></div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {profile?.role==='comercial'&&(
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
          )}
          <button className="btn" style={{background:B_MID,color:'#fff',boxShadow:`0 3px 14px ${B_GLOW}`}} onClick={onNew}>+ Novo Cliente</button>
        </div>
      </div>"""
if old_cli_header in c:
    c = c.replace(old_cli_header, new_cli_header)
    print('  OK: seletor de equipe adicionado no Clientes')
    changes += 1

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print(f'\n  BKOApp.jsx: {changes} alteração(ões) aplicada(s)')
print('\nPronto! Rode: npm run dev')