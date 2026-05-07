# fix_pipeline_scroll.py
# Rode na raiz do projeto: python fix_pipeline_scroll.py

import os

path = 'src/views/bko/BKOApp.jsx'
print('\n=== Fix: Pipeline com scroll por coluna ===\n')

if not os.path.exists(path):
    print(f'ERRO: {path} não encontrado')
    exit()

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

changes = 0

# ── 1. Main: display flex + height 100vh para pipeline travar na tela ─────────
old_main = """        <main style={{flex:1,minWidth:0,overflowY:view==='pipeline'?'hidden':'auto',paddingRight:selected?490:0,transition:'padding-right .3s cubic-bezier(.4,0,.2,1)'}}>"""
new_main = """        <main style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',overflow:view==='pipeline'?'hidden':'auto',paddingRight:selected?490:0,transition:'padding-right .3s cubic-bezier(.4,0,.2,1)'}}>"""
if old_main in c:
    c = c.replace(old_main, new_main)
    print('  OK: main atualizado para flex column')
    changes += 1
else:
    print('  AVISO: main não encontrado')

# ── 2. BKOPipeline container: flex:1 + minHeight:0 ───────────────────────────
old_pipe_wrap = """    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>"""
new_pipe_wrap = """    <div style={{display:'flex',flexDirection:'column',flex:1,minHeight:0,overflow:'hidden'}}>"""
if old_pipe_wrap in c:
    c = c.replace(old_pipe_wrap, new_pipe_wrap)
    print('  OK: container do pipeline atualizado')
    changes += 1
else:
    print('  AVISO: container do pipeline não encontrado')

# ── 3. Colunas container: alignItems stretch para colunas mesma altura ─────────
old_cols = """        <div ref={colsRef} style={{display:'flex',gap:7,overflowX:'auto',overflowY:'hidden',padding:'0 20px 16px',flex:1,minHeight:0,alignItems:'flex-start',scrollbarWidth:'thin',scrollbarColor:`${BKO_STAGES[0]?.color}40 transparent`}}>"""
new_cols = """        <div ref={colsRef} style={{display:'flex',gap:7,overflowX:'auto',overflowY:'hidden',padding:'0 20px 16px',flex:1,minHeight:0,alignItems:'stretch',scrollbarWidth:'thin',scrollbarColor:`${BKO_STAGES[0]?.color}40 transparent`}}>"""
if old_cols in c:
    c = c.replace(old_cols, new_cols)
    print('  OK: container das colunas com alignItems stretch')
    changes += 1
else:
    print('  AVISO: container das colunas não encontrado')

# ── 4. Coluna kanban: display flex column para crescer na altura ───────────────
old_col_wrap = """      onDragOver={e=>{e.preventDefault();setOver(true);}}
      onDragLeave={()=>setOver(false)}
      onDrop={()=>{setOver(false);if(dragId)dispatch({type:'MOVE',cid:dragId,st:s.id,user:profile?.nome||'Usuário'});setDragId(null);}}>
      {collapsed?(
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,cursor:'pointer'}} onClick={onToggleCollapse} title={`Expandir: ${s.label}`}>"""
new_col_wrap = """      onDragOver={e=>{e.preventDefault();setOver(true);}}
      onDragLeave={()=>setOver(false)}
      onDrop={()=>{setOver(false);if(dragId)dispatch({type:'MOVE',cid:dragId,st:s.id,user:profile?.nome||'Usuário'});setDragId(null);}}>
      {collapsed?(
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,cursor:'pointer',height:'100%',justifyContent:'flex-start',paddingTop:4}}} onClick={onToggleCollapse} title={`Expandir: ${s.label}`}>"""
if old_col_wrap in c:
    c = c.replace(old_col_wrap, new_col_wrap)
    print('  OK: coluna colapsada com altura total')
    changes += 1
else:
    print('  AVISO: bloco coluna colapsada não encontrado')

# ── 5. Coluna expandida: flex column para o conteúdo scrollar ─────────────────
old_col_inner = """        <>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10,padding:'0 3px'}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:s.color,boxShadow:`0 0 5px ${s.color}60`,flexShrink:0}}/>
            <span style={{fontSize:11,fontWeight:600,color:'var(--text-secondary)',flex:1}}>{s.label}</span>
            <span style={{fontSize:10,fontWeight:700,background:s.bg,color:s.color,borderRadius:99,padding:'1px 6px'}}>{sl.length}</span>
            <button onClick={onToggleCollapse} title="Recolher coluna"
              style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-faint)',fontSize:12,padding:'0 2px',lineHeight:1}}
              onMouseEnter={e=>e.currentTarget.style.color='var(--text-secondary)'}
              onMouseLeave={e=>e.currentTarget.style.color='var(--text-faint)'}>‹</button>
          </div>
          <div style={{minHeight:40}}>
            {sl.map(c=>(
              <KCard key={c.id} c={c} onSelect={onSelect} dispatch={dispatch} profile={profile} setDragId={setDragId} funis={funis}/>
            ))}
            {sl.length===0&&<div style={{textAlign:'center',padding:'16px 0',fontSize:10,color:'var(--text-faint)'}}>Solte aqui</div>}
          </div>
        </>"""
new_col_inner = """        <>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10,padding:'0 3px',flexShrink:0}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:s.color,boxShadow:`0 0 5px ${s.color}60`,flexShrink:0}}/>
            <span style={{fontSize:11,fontWeight:600,color:'var(--text-secondary)',flex:1}}>{s.label}</span>
            <span style={{fontSize:10,fontWeight:700,background:s.bg,color:s.color,borderRadius:99,padding:'1px 6px'}}>{sl.length}</span>
            <button onClick={onToggleCollapse} title="Recolher coluna"
              style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-faint)',fontSize:12,padding:'0 2px',lineHeight:1}}
              onMouseEnter={e=>e.currentTarget.style.color='var(--text-secondary)'}
              onMouseLeave={e=>e.currentTarget.style.color='var(--text-faint)'}>‹</button>
          </div>
          <div style={{flex:1,overflowY:'auto',minHeight:40,paddingRight:2,scrollbarWidth:'thin',scrollbarColor:'rgba(0,0,0,.1) transparent'}}>
            {sl.map(c=>(
              <KCard key={c.id} c={c} onSelect={onSelect} dispatch={dispatch} profile={profile} setDragId={setDragId} funis={funis}/>
            ))}
            {sl.length===0&&<div style={{textAlign:'center',padding:'16px 0',fontSize:10,color:'var(--text-faint)'}}>Solte aqui</div>}
          </div>
        </>"""
if old_col_inner in c:
    c = c.replace(old_col_inner, new_col_inner)
    print('  OK: conteúdo da coluna com scroll vertical')
    changes += 1
else:
    print('  AVISO: conteúdo da coluna não encontrado')

# ── 6. Coluna wrapper: display flex + flexDirection column ────────────────────
old_col_div = """    <div style={{minWidth:collapsed?44:170,width:collapsed?44:201,flexShrink:0,background:highlight?`${s.color}08`:'rgba(0,0,0,.03)',border:`1px solid ${highlight?s.color+'40':'var(--border)'}`,borderRadius:12,padding:'10px 8px',transition:'all .22s cubic-bezier(.4,0,.2,1)',boxShadow:highlight?`0 0 0 2px ${s.color}30`:''}}"""
new_col_div = """    <div style={{minWidth:collapsed?44:170,width:collapsed?44:201,flexShrink:0,background:highlight?`${s.color}08`:'rgba(0,0,0,.03)',border:`1px solid ${highlight?s.color+'40':'var(--border)'}`,borderRadius:12,padding:'10px 8px',transition:'all .22s cubic-bezier(.4,0,.2,1)',boxShadow:highlight?`0 0 0 2px ${s.color}30`:'',display:'flex',flexDirection:'column'}}"""
if old_col_div in c:
    c = c.replace(old_col_div, new_col_div)
    print('  OK: wrapper da coluna com flex column')
    changes += 1
else:
    print('  AVISO: wrapper da coluna não encontrado')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print(f'\n  BKOApp.jsx: {changes} alteração(ões) aplicada(s)')
print('\nPronto! Rode: npm run dev')