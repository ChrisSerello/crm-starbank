# fix_sidebar_switcher.py
# Rode na raiz do projeto: python fix_sidebar_switcher.py
# Remove o ModuleSwitcher flutuante e passa userModules/onSwitchModule para o Sidebar

import os, re

filepath = 'src/App.jsx'

print('\n=== Fix: Switcher integrado na Sidebar ===\n')

if not os.path.exists(filepath):
    print(f'ERRO: {filepath} não encontrado')
    exit()

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# 1. Remover todas as ocorrências de <ModuleSwitcher ... />
before = len(content)
content = re.sub(r'\s*<ModuleSwitcher[^/]*/>', '', content)
if len(content) != before:
    print('  OK: <ModuleSwitcher .../> removido do JSX')
    changes += 1
else:
    print('  AVISO: <ModuleSwitcher .../> não encontrado')

# 2. Remover a definição da função ModuleSwitcher (do comentário até o fechamento da função)
before = len(content)
content = re.sub(
    r'// ─+ SELETOR FLUTUANTE.*?^function ModuleSwitcher.*?^\}\n',
    '',
    content,
    flags=re.DOTALL | re.MULTILINE
)
if len(content) != before:
    print('  OK: função ModuleSwitcher removida')
    changes += 1
else:
    print('  AVISO: função ModuleSwitcher não encontrada para remoção (OK se já foi removida)')

# 3. Adicionar userModules e onSwitchModule no <Sidebar> do main app
old_sidebar = """        <Sidebar
          view={view}
          dispatch={auditedDispatch}
          onLogout={signOut}
          onAlterarSenha={()=>setShowAlterarSenha(true)}
          profile={profile}
        />"""

new_sidebar = """        <Sidebar
          view={view}
          dispatch={auditedDispatch}
          onLogout={signOut}
          onAlterarSenha={()=>setShowAlterarSenha(true)}
          profile={profile}
          userModules={userModules}
          onSwitchModule={selectModule}
        />"""

if old_sidebar in content:
    content = content.replace(old_sidebar, new_sidebar)
    print('  OK: props userModules e onSwitchModule adicionadas ao Sidebar')
    changes += 1
else:
    print('  AVISO: bloco <Sidebar> não encontrado — adicione manualmente as props:')
    print('         userModules={userModules}')
    print('         onSwitchModule={selectModule}')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nPronto! {changes} alteração(ões) aplicada(s).')
print('Agora substitua src/components/Sidebar.jsx pelo arquivo novo.')
print('Depois rode: npm run dev')