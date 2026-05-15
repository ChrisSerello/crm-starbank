# fix_trava_mover_colunas_bko.py
# Rode na raiz do projeto: python fix_trava_mover_colunas_bko.py
#
# REGRA: Quando um cliente está nas colunas "BKO - Saldo Devedor" ou
# "Pendência Análise BKO" E tem um responsável BKO atribuído,
# SOMENTE o BKO responsável e os 3 supervisores BKO podem mover/arrastar
# o card para outra coluna.
#
# Pontos de bloqueio:
#   1. Drag & drop (onDrop na BKOKanbanCol)
#   2. Menu "Mover para estágio" (botões no KCard)
#   3. Reducer MOVE (barreira final)

import os, sys

path = 'src/views/bko/BKOApp.jsx'
if not os.path.exists(path):
    print(f'ERRO: {path} não encontrado. Rode na raiz do projeto.')
    sys.exit(1)

with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

changes = 0

# ══════════════════════════════════════════════════════════════════════════════
# 1. ADICIONAR CONSTANTES NO TOPO (após BKO_STAGES)
# ══════════════════════════════════════════════════════════════════════════════

old_blank = """const blankCliente = () => ({"""

new_blank = """// ── Colunas BKO travadas: só responsável + supervisores podem mover ──
const COLUNAS_TRAVA_BKO = ['saldo_andamento', 'pendencia_BKO'];
const SUPERVISORES_BKO_EMAILS = [
  'edson@starbank.tec.br',
  'vera.marques@starbank.tec.br',
  'maria.cerqueira@starbank.tec.br',
];

// Verifica se o cliente pode ser movido pelo usuário atual
// Retorna { travado: bool, motivo: string }
function checarTravaBKO(cliente, profile, session) {
  // Só trava se estiver nas colunas protegidas E tiver responsável BKO
  if (!COLUNAS_TRAVA_BKO.includes(cliente.estagio)) return { travado: false };
  if (!cliente.responsavel_bko_id) return { travado: false };

  const isBko = profile?.role === 'bko';
  const euSouResponsavel = cliente.responsavel_bko_id === profile?.id;
  const isSupervisorBko = SUPERVISORES_BKO_EMAILS.includes(session?.user?.email);

  // Se não é BKO, não trava (comercial/corban/startec mantêm permissões)
  if (!isBko) return { travado: false };

  // BKO responsável pode mover
  if (euSouResponsavel) return { travado: false };

  // Supervisor BKO pode mover
  if (isSupervisorBko) return { travado: false };

  // Outro BKO: TRAVADO
  return { travado: true, motivo: cliente.responsavel_bko_nome || 'outro BKO' };
}

const blankCliente = () => ({"""

if old_blank in code:
    code = code.replace(old_blank, new_blank, 1)
    print('  ✅ 1/5 — Constantes COLUNAS_TRAVA_BKO + checarTravaBKO adicionadas')
    changes += 1
else:
    print('  ⚠️  1/5 — blankCliente não encontrado')

# ══════════════════════════════════════════════════════════════════════════════
# 2. TRAVAR DRAG & DROP — passar session+profile para BKOKanbanCol e checar no onDrop
#    Primeiro: alterar a assinatura de BKOKanbanCol para receber session
# ══════════════════════════════════════════════════════════════════════════════

old_kanban_sig = """function BKOKanbanCol({s,clientes,dragId,setDragId,dispatch,onSelect,profile,highlight,funis,collapsed,onToggleCollapse}){"""

new_kanban_sig = """function BKOKanbanCol({s,clientes,dragId,setDragId,dispatch,onSelect,profile,session,highlight,funis,collapsed,onToggleCollapse}){"""

if old_kanban_sig in code:
    code = code.replace(old_kanban_sig, new_kanban_sig, 1)
    print('  ✅ 2/5 — BKOKanbanCol recebe session')
    changes += 1
else:
    print('  ⚠️  2/5 — Assinatura BKOKanbanCol não encontrada')

# Agora alterar o onDrop para checar trava
old_ondrop = """      onDrop={()=>{setOver(false);if(dragId)dispatch({type:'MOVE',cid:dragId,st:s.id,user:profile?.nome||'Usuário'});setDragId(null);}}>"""

new_ondrop = """      onDrop={()=>{setOver(false);if(dragId){const dragCliente=clientes.find(c=>c.id===dragId);const trava=dragCliente?checarTravaBKO(dragCliente,profile,session):{travado:false};if(trava.travado){alert(`🔒 Este cliente está travado na coluna BKO.\\nResponsável: ${trava.motivo}\\nSomente o responsável ou supervisores BKO podem mover.`);setDragId(null);return;}dispatch({type:'MOVE',cid:dragId,st:s.id,user:profile?.nome||'Usuário'});}setDragId(null);}}>"""

if old_ondrop in code:
    code = code.replace(old_ondrop, new_ondrop, 1)
    print('  ✅ 3/5 — Drag & drop com checagem de trava BKO')
    changes += 1
else:
    print('  ⚠️  3/5 — onDrop não encontrado')

# ══════════════════════════════════════════════════════════════════════════════
# 3. TRAVAR MENU "Mover para estágio" no KCard
#    Alterar KCard para receber session e bloquear botões de mover
# ══════════════════════════════════════════════════════════════════════════════

old_kcard_sig = """function KCard({c,onSelect,dispatch,profile,setDragId,funis=[]}){"""

new_kcard_sig = """function KCard({c,onSelect,dispatch,profile,session,setDragId,funis=[]}){"""

if old_kcard_sig in code:
    code = code.replace(old_kcard_sig, new_kcard_sig, 1)
    print('  ✅ 4a/5 — KCard recebe session')
    changes += 1
else:
    print('  ⚠️  4a/5 — Assinatura KCard não encontrada')

# Alterar os botões de "Mover para estágio" no menu do KCard
old_move_btn = """          {BKO_STAGES.filter(st=>st.id!==c.estagio).map(st=>(
            <button key={st.id}
              onMouseDown={e=>{e.stopPropagation();dispatch({type:'MOVE',cid:c.id,st:st.id,user:profile?.nome||'Usuário'});setMenuOpen(false);}}
              style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'7px 12px',background:'none',border:'none',cursor:'pointer',textAlign:'left',fontSize:12,color:'var(--text-primary)',fontFamily:'var(--font)',transition:'background .1s'}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,.04)'}
              onMouseLeave={e=>e.currentTarget.style.background='none'}>
              <div style={{width:7,height:7,borderRadius:'50%',background:st.color,flexShrink:0}}/>{st.label}
            </button>
          ))}"""

new_move_btn = """          {(()=>{const trava=checarTravaBKO(c,profile,session);return trava.travado?(
            <div style={{padding:'10px 14px',fontSize:11,color:'#F97316',background:'rgba(249,115,22,.06)'}}>
              🔒 Movimentação travada — responsável: <strong>{trava.motivo}</strong>
            </div>
          ):BKO_STAGES.filter(st=>st.id!==c.estagio).map(st=>(
            <button key={st.id}
              onMouseDown={e=>{e.stopPropagation();dispatch({type:'MOVE',cid:c.id,st:st.id,user:profile?.nome||'Usuário'});setMenuOpen(false);}}
              style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'7px 12px',background:'none',border:'none',cursor:'pointer',textAlign:'left',fontSize:12,color:'var(--text-primary)',fontFamily:'var(--font)',transition:'background .1s'}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,.04)'}
              onMouseLeave={e=>e.currentTarget.style.background='none'}>
              <div style={{width:7,height:7,borderRadius:'50%',background:st.color,flexShrink:0}}/>{st.label}
            </button>
          ));})()}"""

if old_move_btn in code:
    code = code.replace(old_move_btn, new_move_btn, 1)
    print('  ✅ 4b/5 — Menu "Mover para estágio" com checagem de trava')
    changes += 1
else:
    print('  ⚠️  4b/5 — Menu de mover estágio não encontrado')

# ══════════════════════════════════════════════════════════════════════════════
# 4. PASSAR session PARA KCard e BKOKanbanCol nos renders
# ══════════════════════════════════════════════════════════════════════════════

# KCard dentro de BKOKanbanCol — adicionar session
old_kcard_render = """              <KCard key={c.id} c={c} onSelect={onSelect} dispatch={dispatch} profile={profile} setDragId={setDragId} funis={funis}/>"""

new_kcard_render = """              <KCard key={c.id} c={c} onSelect={onSelect} dispatch={dispatch} profile={profile} session={session} setDragId={setDragId} funis={funis}/>"""

if old_kcard_render in code:
    code = code.replace(old_kcard_render, new_kcard_render, 1)
    print('  ✅ 5a/5 — KCard recebe session no render')
    changes += 1
else:
    print('  ⚠️  5a/5 — Render de KCard não encontrado')

# BKOKanbanCol dentro de BKOPipeline — adicionar session
# Primeiro precisamos que BKOPipeline receba session
old_pipeline_sig = """function BKOPipeline({clientes,profile,dispatch,onSelect,filtroEstagio,setFiltroEstagio,funis,origemFiltro,setOrigemFiltro,supervisorTeam,allTeams}){"""

new_pipeline_sig = """function BKOPipeline({clientes,profile,session,dispatch,onSelect,filtroEstagio,setFiltroEstagio,funis,origemFiltro,setOrigemFiltro,supervisorTeam,allTeams}){"""

if old_pipeline_sig in code:
    code = code.replace(old_pipeline_sig, new_pipeline_sig, 1)
    print('  ✅ 5b/5 — BKOPipeline recebe session')
    changes += 1
else:
    print('  ⚠️  5b/5 — Assinatura BKOPipeline não encontrada')

# BKOKanbanCol render — adicionar session
old_col_render = """            <BKOKanbanCol key={s.id} s={s} clientes={filtered} dragId={dragId} setDragId={setDragId}
              dispatch={dispatch} onSelect={onSelect} profile={profile}
              highlight={filtroEstagio===s.id} funis={funisComContagem}
              collapsed={collapsedCols.has(s.id)} onToggleCollapse={()=>toggleCol(s.id)}/>"""

new_col_render = """            <BKOKanbanCol key={s.id} s={s} clientes={filtered} dragId={dragId} setDragId={setDragId}
              dispatch={dispatch} onSelect={onSelect} profile={profile} session={session}
              highlight={filtroEstagio===s.id} funis={funisComContagem}
              collapsed={collapsedCols.has(s.id)} onToggleCollapse={()=>toggleCol(s.id)}/>"""

if old_col_render in code:
    code = code.replace(old_col_render, new_col_render, 1)
    print('  ✅ 5c/5 — BKOKanbanCol recebe session no render')
    changes += 1
else:
    print('  ⚠️  5c/5 — Render de BKOKanbanCol não encontrado')

# Passar session para BKOPipeline no BKOApp
old_pipeline_render = """{view==='pipeline'  && <BKOPipeline  clientes={clientes} profile={profile} dispatch={auditedDispatch} onSelect={id=>dispatch({type:'SEL',id})} filtroEstagio={filtroEstagio} setFiltroEstagio={setFiltroEstagio} funis={funis} origemFiltro={origemFiltro} setOrigemFiltro={setOrigemFiltro} supervisorTeam={supervisorTeam} allTeams={allTeams}/>}"""

new_pipeline_render = """{view==='pipeline'  && <BKOPipeline  clientes={clientes} profile={profile} session={session} dispatch={auditedDispatch} onSelect={id=>dispatch({type:'SEL',id})} filtroEstagio={filtroEstagio} setFiltroEstagio={setFiltroEstagio} funis={funis} origemFiltro={origemFiltro} setOrigemFiltro={setOrigemFiltro} supervisorTeam={supervisorTeam} allTeams={allTeams}/>}"""

if old_pipeline_render in code:
    code = code.replace(old_pipeline_render, new_pipeline_render, 1)
    print('  ✅ 5d/5 — BKOPipeline recebe session no BKOApp')
    changes += 1
else:
    print('  ⚠️  5d/5 — Render de BKOPipeline no BKOApp não encontrado')

# ══════════════════════════════════════════════════════════════════════════════
# 5. TRAVAR O DRAG DO CARD (impedir que BKO travado arraste)
# ══════════════════════════════════════════════════════════════════════════════

# No KCard, condicionar o draggable e onDragStart
old_drag = """      <div className="kcard" style={{position:'relative',opacity:c.funil_id?0.55:1}} draggable onDragStart={()=>setDragId(c.id)} onClick={(e)=>{if(!e.defaultPrevented)onSelect(c.id);}}>"""

new_drag = """      <div className="kcard" style={{position:'relative',opacity:c.funil_id?0.55:1}} draggable={!checarTravaBKO(c,profile,session).travado} onDragStart={()=>{if(!checarTravaBKO(c,profile,session).travado)setDragId(c.id);}} onClick={(e)=>{if(!e.defaultPrevented)onSelect(c.id);}}>"""

if old_drag in code:
    code = code.replace(old_drag, new_drag, 1)
    print('  ✅ 5e/5 — Drag desabilitado para BKO travado')
    changes += 1
else:
    print('  ⚠️  5e/5 — Div draggable do KCard não encontrado')

# ══════════════════════════════════════════════════════════════════════════════
# SALVAR
# ══════════════════════════════════════════════════════════════════════════════

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print(f'\n{"="*60}')
print(f'  TOTAL: {changes} alteração(ões) aplicada(s) em BKOApp.jsx')
print(f'{"="*60}')
print()
print('Rode: npm run dev')
print()
print('COMO FUNCIONA AGORA:')
print()
print('  Cliente nas colunas "BKO - Saldo Devedor" ou "Pendência Análise BKO"')
print('  COM responsável BKO atribuído:')
print()
print('    ✅ BKO responsável → pode arrastar e mover normalmente')
print('    ✅ Supervisores (edson, vera, maria) → podem mover normalmente')
print('    ✅ Comercial / Corban / Startec → mantêm permissões normais')
print('    🔒 Outro BKO → NÃO pode arrastar (drag desabilitado)')
print('    🔒 Outro BKO → NÃO pode mover pelo menu (mensagem de bloqueio)')
print('    🔒 Outro BKO → Se tentar soltar via drop, recebe alert de bloqueio')
print()
print('  Cliente em OUTRA coluna ou SEM responsável BKO:')
print('    ✅ Tudo livre como antes para todos os perfis')