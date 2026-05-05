import os, re

path = 'src/views/bko/BKOApp.jsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

changes = 0

# ── 1. Auto-atribuição no estado local ao criar cliente startec ───────────────
old_audited = """  const auditedDispatch=useCallback(async(action)=>{
    dispatch(action);"""
new_audited = """  const auditedDispatch=useCallback(async(action)=>{
    // Auto-atribuição local para startec — aparece sem precisar recarregar
    if(action.type==='ADD'&&(profile?.role==='startec'||profile?.role==='supervisor_startec')){
      action={...action,c:{...action.c,atribuido_a_id:session?.user?.id,atribuido_a_nome:profile?.nome}};
    }
    dispatch(action);"""
if old_audited in c:
    c = c.replace(old_audited, new_audited)
    print('  OK: auto-atribuição local para startec')
    changes += 1
else:
    print('  AVISO: auditedDispatch não encontrado')

# ── 2. Adicionar estado de colunas colapsadas no BKOPipeline ─────────────────
old_pipe_state = """  const [dragId,setDragId]=useState(null);
  const [search,setSearch]=useState('');
  const [funilSel,setFunilSel]=useState(null);"""
new_pipe_state = """  const [dragId,setDragId]=useState(null);
  const [search,setSearch]=useState('');
  const [collapsedCols,setCollapsedCols]=useState(new Set());
  const toggleCol=(id)=>setCollapsedCols(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});
  const [funilSel,setFunilSel]=useState(null);"""
if old_pipe_state in c:
    c = c.replace(old_pipe_state, new_pipe_state)
    print('  OK: estado de colunas colapsadas adicionado')
    changes += 1
else:
    print('  AVISO: estado do pipeline não encontrado')

# ── 3. Passar collapsedCols e toggleCol para BKOKanbanCol ────────────────────
old_kanban_cols = """          {BKO_STAGES.map(s=>(
            <BKOKanbanCol key={s.id} s={s} clientes={filtered} dragId={dragId} setDragId={setDragId}
              dispatch={dispatch} onSelect={onSelect} profile={profile}
              highlight={filtroEstagio===s.id} funis={funisComContagem}/>
          ))}"""
new_kanban_cols = """          {BKO_STAGES.map(s=>(
            <BKOKanbanCol key={s.id} s={s} clientes={filtered} dragId={dragId} setDragId={setDragId}
              dispatch={dispatch} onSelect={onSelect} profile={profile}
              highlight={filtroEstagio===s.id} funis={funisComContagem}
              collapsed={collapsedCols.has(s.id)} onToggleCollapse={()=>toggleCol(s.id)}/>
          ))}"""
if old_kanban_cols in c:
    c = c.replace(old_kanban_cols, new_kanban_cols)
    print('  OK: props de colapso passadas para BKOKanbanCol')
    changes += 1
else:
    print('  AVISO: mapeamento de colunas não encontrado')

# ── 4. Atualizar BKOKanbanCol para suportar colapso ──────────────────────────
old_col_fn = "function BKOKanbanCol({s,clientes,dragId,setDragId,dispatch,onSelect,profile,highlight,funis}){"
new_col_fn = "function BKOKanbanCol({s,clientes,dragId,setDragId,dispatch,onSelect,profile,highlight,funis,collapsed,onToggleCollapse}){"
if old_col_fn in c:
    c = c.replace(old_col_fn, new_col_fn)
    print('  OK: assinatura BKOKanbanCol atualizada')
    changes += 1

# ── 5. Atualizar o render da coluna para suportar colapso ────────────────────
old_col_render = """    <div style={{minWidth:170,width:201,flexShrink:0,background:highlight?`${s.color}08`:'rgba(0,0,0,.03)',border:`1px solid ${highlight?s.color+'40':'var(--border)'}`,borderRadius:12,padding:'10px 8px',transition:'all .2s',boxShadow:highlight?`0 0 0 2px ${s.color}30`:''}}
      onDragOver={e=>{e.preventDefault();setOver(true);}}
      onDragLeave={()=>setOver(false)}
      onDrop={()=>{setOver(false);if(dragId)dispatch({type:'MOVE',cid:dragId,st:s.id,user:profile?.nome||'Usuário'});setDragId(null);}}>
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10,padding:'0 3px'}}>
        <div style={{width:7,height:7,borderRadius:'50%',background:s.color,boxShadow:`0 0 5px ${s.color}60`,flexShrink:0}}/>
        <span style={{fontSize:11,fontWeight:600,color:'var(--text-secondary)',flex:1}}>{s.label}</span>
        <span style={{fontSize:10,fontWeight:700,background:s.bg,color:s.color,borderRadius:99,padding:'1px 6px'}}>{sl.length}</span>
      </div>
      <div style={{minHeight:40}}>
        {sl.map(c=>(
          <KCard key={c.id} c={c} onSelect={onSelect} dispatch={dispatch} profile={profile} setDragId={setDragId} funis={funis}/>
        ))}
        {sl.length===0&&<div style={{textAlign:'center',padding:'16px 0',fontSize:10,color:'var(--text-faint)'}}>Solte aqui</div>}
      </div>
    </div>"""
new_col_render = """    <div style={{minWidth:collapsed?44:170,width:collapsed?44:201,flexShrink:0,background:highlight?`${s.color}08`:'rgba(0,0,0,.03)',border:`1px solid ${highlight?s.color+'40':'var(--border)'}`,borderRadius:12,padding:'10px 8px',transition:'all .22s cubic-bezier(.4,0,.2,1)',boxShadow:highlight?`0 0 0 2px ${s.color}30`:''}}
      onDragOver={e=>{e.preventDefault();setOver(true);}}
      onDragLeave={()=>setOver(false)}
      onDrop={()=>{setOver(false);if(dragId)dispatch({type:'MOVE',cid:dragId,st:s.id,user:profile?.nome||'Usuário'});setDragId(null);}}>
      {collapsed?(
        // Coluna colapsada — só mostra ponto colorido, contador e botão expandir
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,cursor:'pointer'}} onClick={onToggleCollapse} title={`Expandir: ${s.label}`}>
          <div style={{width:7,height:7,borderRadius:'50%',background:s.color,boxShadow:`0 0 5px ${s.color}60`,marginTop:2}}/>
          <span style={{fontSize:10,fontWeight:700,background:s.bg,color:s.color,borderRadius:99,padding:'2px 6px'}}>{sl.length}</span>
          <span style={{fontSize:9,color:'var(--text-faint)',writingMode:'vertical-rl',textOrientation:'mixed',transform:'rotate(180deg)',marginTop:4,maxHeight:100,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.label}</span>
        </div>
      ):(
        <>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10,padding:'0 3px'}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:s.color,boxShadow:`0 0 5px ${s.color}60`,flexShrink:0}}/>
            <span style={{fontSize:11,fontWeight:600,color:'var(--text-secondary)',flex:1}}>{s.label}</span>
            <span style={{fontSize:10,fontWeight:700,background:s.bg,color:s.color,borderRadius:99,padding:'1px 6px'}}>{sl.length}</span>
            <button onClick={onToggleCollapse} title="Recolher coluna" style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-faint)',fontSize:12,padding:'0 2px',lineHeight:1}} onMouseEnter={e=>e.currentTarget.style.color='var(--text-secondary)'} onMouseLeave={e=>e.currentTarget.style.color='var(--text-faint)'}>‹</button>
          </div>
          <div style={{minHeight:40}}>
            {sl.map(c=>(
              <KCard key={c.id} c={c} onSelect={onSelect} dispatch={dispatch} profile={profile} setDragId={setDragId} funis={funis}/>
            ))}
            {sl.length===0&&<div style={{textAlign:'center',padding:'16px 0',fontSize:10,color:'var(--text-faint)'}}>Solte aqui</div>}
          </div>
        </>
      )}
    </div>"""
if old_col_render in c:
    c = c.replace(old_col_render, new_col_render)
    print('  OK: render da coluna atualizado com colapso')
    changes += 1
else:
    print('  AVISO: render da coluna não encontrado')

# ── 6. Scroll horizontal fixo no pipeline ────────────────────────────────────
old_cols_wrap = """      {/* ── Kanban principal ── */}
      {!funilSel&&(
        <div ref={colsRef} style={{display:'flex',gap:7,overflowX:'auto',overflowY:'hidden',padding:'0 20px 16px',flex:1,minHeight:0,alignItems:'flex-start'}}>"""
new_cols_wrap = """      {/* ── Kanban principal ── */}
      {!funilSel&&(
        <div ref={colsRef} style={{display:'flex',gap:7,overflowX:'auto',overflowY:'hidden',padding:'0 20px 16px',flex:1,minHeight:0,alignItems:'flex-start',scrollbarWidth:'thin',scrollbarColor:`${BKO_STAGES[0]?.color}40 transparent`}}>"""
if old_cols_wrap in c:
    c = c.replace(old_cols_wrap, new_cols_wrap)
    print('  OK: scrollbar estilizada no pipeline')
    changes += 1
else:
    print('  AVISO: wrapper do kanban não encontrado')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print(f'\n  BKOApp.jsx: {changes} alteração(ões) aplicada(s)')
print('Pronto! Rode: npm run dev')