# fix_corban_startec_visibilidade.py
# Rode na raiz do projeto: python fix_corban_startec_visibilidade.py
#
# O QUE CORRIGE:
# Antes: corban_bko e startec viam APENAS clientes atribuídos a eles (atribuido_a_id)
# Depois: veem clientes que CRIARAM (criado_por_id) OU que foram ATRIBUÍDOS a eles (atribuido_a_id)
#
# Locais alterados:
# 1. BKODashboard  — filtro clientesFiltrados
# 2. BKOPipeline   — filtro clientesVisiveis
# 3. BKOClientes   — filtro clientesBase
# 4. auditedDispatch ADD — auto-atribuição local para corban_bko também

import os

path = 'src/views/bko/BKOApp.jsx'
print('\n=== Fix: Visibilidade Corban + Startec (criado_por OU atribuido_a) ===\n')

if not os.path.exists(path):
    print(f'ERRO: {path} não encontrado')
    exit()

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

changes = 0

# ══════════════════════════════════════════════════════════════════════════════
# 1. BKODashboard — filtro clientesFiltrados
# ══════════════════════════════════════════════════════════════════════════════
old_dash = """    if(profile?.role==='startec'||profile?.role==='corban_bko')
      return clientes.filter(c=>c.atribuido_a_id===profile?.id);"""

new_dash = """    if(profile?.role==='startec'||profile?.role==='corban_bko')
      return clientes.filter(c=>c.atribuido_a_id===profile?.id||c.criado_por_id===profile?.id);"""

count = c.count(old_dash)
if count > 0:
    c = c.replace(old_dash, new_dash)
    print(f'  OK: BKODashboard filtro corrigido ({count}x)')
    changes += count
else:
    print('  AVISO: filtro do BKODashboard não encontrado')

# ══════════════════════════════════════════════════════════════════════════════
# 2. BKOPipeline — filtro clientesVisiveis
#    (mesmo padrão, mas dentro de outro useMemo)
# ══════════════════════════════════════════════════════════════════════════════
# Já foi substituído acima se o padrão é igual.
# Verificar se há outra ocorrência restante:
remaining = c.count("return clientes.filter(c=>c.atribuido_a_id===profile?.id);")
if remaining > 0:
    # Substituir TODAS as ocorrências restantes do filtro simples
    c = c.replace(
        "return clientes.filter(c=>c.atribuido_a_id===profile?.id);",
        "return clientes.filter(c=>c.atribuido_a_id===profile?.id||c.criado_por_id===profile?.id);"
    )
    print(f'  OK: {remaining} ocorrência(s) restante(s) do filtro simples corrigida(s)')
    changes += remaining
else:
    print('  OK: nenhuma ocorrência restante do filtro simples')

# ══════════════════════════════════════════════════════════════════════════════
# 3. auditedDispatch ADD — auto-atribuição para corban_bko também
#    Antes: só startec tinha auto-atribuição local
#    Depois: startec E corban_bko
# ══════════════════════════════════════════════════════════════════════════════
old_auto = """    if(action.type==='ADD'&&profile?.role==='startec'){
      action={...action,c:{...action.c,atribuido_a_id:session?.user?.id,atribuido_a_nome:profile?.nome}};
    }"""

new_auto = """    if(action.type==='ADD'&&(profile?.role==='startec'||profile?.role==='corban_bko')){
      action={...action,c:{...action.c,atribuido_a_id:session?.user?.id,atribuido_a_nome:profile?.nome}};
    }"""

if old_auto in c:
    c = c.replace(old_auto, new_auto)
    print('  OK: auto-atribuição local no ADD agora inclui corban_bko')
    changes += 1
else:
    print('  AVISO: bloco de auto-atribuição local não encontrado')

# ══════════════════════════════════════════════════════════════════════════════
# 4. auditedDispatch ADD (Supabase insert) — auto-atribuição no banco
#    Antes: const autoAtrib=(profile.role==='startec');
#    Depois: inclui corban_bko
# ══════════════════════════════════════════════════════════════════════════════
old_insert = "const autoAtrib=(profile.role==='startec');"
new_insert = "const autoAtrib=(profile.role==='startec'||profile.role==='corban_bko');"

if old_insert in c:
    c = c.replace(old_insert, new_insert)
    print('  OK: auto-atribuição no INSERT do Supabase agora inclui corban_bko')
    changes += 1
else:
    print('  AVISO: autoAtrib no INSERT não encontrado')

# ══════════════════════════════════════════════════════════════════════════════
# 5. Origem do cliente — corban_bko já está mapeado corretamente
#    Verificar: origemCliente para corban_bko deve ser 'corban'
# ══════════════════════════════════════════════════════════════════════════════
if "profile.role==='corban_bko'?'corban'" in c:
    print('  OK: origem "corban" para corban_bko já está correta')
else:
    print('  AVISO: verifique a origem do cliente para corban_bko manualmente')

# ══════════════════════════════════════════════════════════════════════════════
# SALVAR
# ══════════════════════════════════════════════════════════════════════════════
with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print(f'\n  BKOApp.jsx: {changes} alteração(ões) aplicada(s)')
print('\nPronto! Rode: npm run dev')
print('\nResumo do comportamento:')
print('  Corban vê: clientes que ele CRIOU + clientes ATRIBUÍDOS a ele')
print('  Startec vê: clientes que ele CRIOU + clientes ATRIBUÍDOS a ele')
print('  Quando corban/startec cadastra um cliente, é auto-atribuído automaticamente')
print('  Comercial pode criar e ATRIBUIR a qualquer corban/startec — o cliente aparece para eles')