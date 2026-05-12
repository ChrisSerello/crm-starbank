# fix_detail_criado_em.py
# Rode na raiz do projeto: python fix_detail_criado_em.py

import os

path = 'src/views/bko/BKODetail.jsx'
print('\n=== Fix: Campo "Criado em" no BKODetail ===\n')

if not os.path.exists(path):
    print(f'ERRO: {path} não encontrado')
    exit()

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

changes = 0

# ── Adicionar "Criado em" na lista de campos da aba Informações ───────────────
old_fields = """                ['Data entrada',    fmtD(cliente.dataEntrada)],
                ['Criado por',      cliente.criado_por_nome || '—'],"""
new_fields = """                ['Data entrada',    fmtD(cliente.dataEntrada)],
                ['Criado em',       cliente.created_at ? fmtDH(cliente.created_at) : '—'],
                ['Criado por',      cliente.criado_por_nome || '—'],"""

if old_fields in c:
    c = c.replace(old_fields, new_fields)
    print('  OK: campo "Criado em" adicionado na aba Informações')
    changes += 1
else:
    print('  AVISO: bloco de campos não encontrado')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print(f'\n  BKODetail.jsx: {changes} alteração(ões) aplicada(s)')
print('\nPronto! Rode: npm run dev')