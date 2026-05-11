# fix_gestao_corbans.py
# Rode na raiz do projeto: python fix_gestao_corbans.py

import os

path = 'src/views/bko/BKOApp.jsx'
print('\n=== Fix: Gestão de Corbans ===\n')

if not os.path.exists(path):
    print(f'ERRO: {path} não encontrado')
    exit()

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

changes = 0

# ── 1. Adicionar import do componente ─────────────────────────────────────────
old_import = """import { BKOSearch } from './BKOSearch';"""
new_import = """import { BKOSearch } from './BKOSearch';
import { BKOGestaoCorbans } from './BKOGestaoCorbans';"""
if old_import in c:
    c = c.replace(old_import, new_import)
    print('  OK: import adicionado')
    changes += 1

# ── 2. Adicionar item no menu da sidebar ──────────────────────────────────────
old_items = """    ...(r==='comercial'?[{id:'auditoria',icon:'🔍',label:'Auditoria'}]:[]),"""
new_items = """    ...(r==='comercial'?[{id:'auditoria',icon:'🔍',label:'Auditoria'}]:[]),
    ...(profile?.acesso_gestao_corban?[{id:'gestao_corban',icon:'⬡',label:'Gestão Corban'}]:[]),"""
if old_items in c:
    c = c.replace(old_items, new_items)
    print('  OK: item Gestão Corban adicionado no sidebar')
    changes += 1

# ── 3. Adicionar view no main ─────────────────────────────────────────────────
old_view = """          {view==='auditoria' && <BKOAuditoria/>}"""
new_view = """          {view==='auditoria' && <BKOAuditoria/>}
          {view==='gestao_corban' && <BKOGestaoCorbans profile={profile}/>}"""
if old_view in c:
    c = c.replace(old_view, new_view)
    print('  OK: view gestao_corban adicionada')
    changes += 1

# ── 4. Carregar acesso_gestao_corban no profile (SET_C e loadProfile) ─────────
# O profile já carrega tudo da tabela profiles, então acesso_gestao_corban
# deve vir automaticamente. Só precisamos garantir que o pipeline não
# auto-colapsa ao entrar em gestao_corban
old_setview = """    if(v==='pipeline') toggleSidebar(true);
    else toggleSidebar(false);"""
new_setview = """    if(v==='pipeline'||v==='gestao_corban') toggleSidebar(true);
    else toggleSidebar(false);"""
if old_setview in c:
    c = c.replace(old_setview, new_setview)
    print('  OK: sidebar auto-colapsa em gestao_corban também')
    changes += 1

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print(f'\n  BKOApp.jsx: {changes} alteração(ões) aplicada(s)')
print('\nPronto! Rode: npm run dev')