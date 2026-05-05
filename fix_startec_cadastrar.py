# fix_startec_cadastrar.py
# Rode na raiz do projeto: python fix_startec_cadastrar.py
# Adiciona Startec no modal de criação e na listagem de usuários

import os

bko_path = 'src/views/bko/BKOApp.jsx'

print('\n=== Fix: Startec no BKOCadastrar ===\n')

if not os.path.exists(bko_path):
    print(f'ERRO: {bko_path} não encontrado')
    exit()

with open(bko_path, 'r', encoding='utf-8') as f:
    bko = f.read()

changes = 0

# ── 1. Adicionar Startec nos grupos da listagem ───────────────────────────────
old_grupos = "  const grupos=[{role:'comercial',label:'Comercial'},{role:'corban_bko',label:'Corban'},{role:'bko',label:'BKO'}];"
new_grupos = "  const grupos=[{role:'comercial',label:'Comercial'},{role:'supervisor_startec',label:'Supervisor Startec'},{role:'corban_bko',label:'Corban'},{role:'bko',label:'BKO'},{role:'startec',label:'Startec'}];"
if old_grupos in bko:
    bko = bko.replace(old_grupos, new_grupos)
    print('  OK: grupos da listagem atualizados com Startec')
    changes += 1
else:
    print('  AVISO: grupos não encontrados')

# ── 2. Adicionar Startec nos botões de papel do modal ────────────────────────
old_roles_modal = "          <div style={{display:'flex',gap:6}}>{[['corban_bko','Corban'],['bko','BKO']].map(([v,l])=>(<button key={v} onClick={()=>setForm(f=>({...f,role:v}))} style={{flex:1,padding:'8px 0',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',background:form.role===v?ROLE_COLORS[v]:'rgba(0,0,0,.05)',color:form.role===v?'#fff':'var(--text-secondary)',border:form.role===v?'none':'1px solid var(--border)',transition:'all .15s'}}>{l}</button>))}</div>"
new_roles_modal = "          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{[['corban_bko','Corban'],['bko','BKO'],['startec','Startec'],['supervisor_startec','Supervisor Startec']].map(([v,l])=>(<button key={v} onClick={()=>setForm(f=>({...f,role:v}))} style={{flex:1,minWidth:80,padding:'8px 0',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',background:form.role===v?ROLE_COLORS[v]:'rgba(0,0,0,.05)',color:form.role===v?'#fff':'var(--text-secondary)',border:form.role===v?'none':'1px solid var(--border)',transition:'all .15s'}}>{l}</button>))}</div>"
if old_roles_modal in bko:
    bko = bko.replace(old_roles_modal, new_roles_modal)
    print('  OK: botões Startec e Supervisor Startec adicionados ao modal')
    changes += 1
else:
    print('  AVISO: botões do modal não encontrados')

# ── 3. Permissão de edição — supervisor_startec também pode editar ────────────
old_is_comercial_edit = "  const isComercial=profile?.role==='comercial';"
new_is_comercial_edit = "  const isComercial=profile?.role==='comercial'||profile?.role==='supervisor_startec';"
if old_is_comercial_edit in bko:
    bko = bko.replace(old_is_comercial_edit, new_is_comercial_edit)
    print('  OK: supervisor_startec pode editar/remover usuários')
    changes += 1
else:
    print('  AVISO: isComercial não encontrado')

with open(bko_path, 'w', encoding='utf-8') as f:
    f.write(bko)

print(f'\n  BKOApp.jsx: {changes} alteração(ões) aplicada(s)')
print('\nPronto! Rode: npm run dev')