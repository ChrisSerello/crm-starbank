# fix_bkodetail_erros.py
# Rode na raiz do projeto: python fix_bkodetail_erros.py

import os, sys

path = 'src/views/bko/BKODetail.jsx'
if not os.path.exists(path):
    print(f'ERRO: {path} não encontrado.')
    sys.exit(1)

with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

changes = 0

# ══════════════════════════════════════════════════════════════
# ERRO 1: Banner "Cliente travado" DUPLICADO (aparece 2x)
# Remover a segunda ocorrência
# ══════════════════════════════════════════════════════════════

banner = """      {/* Banner de trava BKO */}
      {bkoTravado && (
        <div style={{ padding: '10px 20px', background: 'rgba(249,115,22,.08)', borderBottom: '1px solid rgba(249,115,22,.2)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 14 }}>🔒</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#F97316' }}>Cliente travado</div>
            <div style={{ fontSize: 11, color: '#F97316' }}>Sendo atendido por <strong>{cliente.responsavel_bko_nome}</strong>. Você pode visualizar mas não editar.</div>
          </div>
        </div>
      )}"""

count = code.count(banner)
if count == 2:
    # Remover a segunda ocorrência: substituir as duas por uma
    first_pos = code.find(banner)
    second_pos = code.find(banner, first_pos + len(banner))
    code = code[:second_pos] + code[second_pos + len(banner):]
    print('  ✅ 1/2 — Banner duplicado removido')
    changes += 1
elif count == 1:
    print('  ✅ 1/2 — Banner: apenas 1 (OK)')
else:
    print(f'  ⚠️  1/2 — Banner encontrado {count}x')

# ══════════════════════════════════════════════════════════════
# ERRO 2: Ternário aninhado quebrado no botão "Salvar alterações"
# O código tem {bkoTravado ? (...) : ( {bkoTravado ? ... } )} — duplo!
# Linha 523: Expected ',' or '}' but found '?'
# ══════════════════════════════════════════════════════════════

errado = """              {bkoTravado ? (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(249,115,22,.08)', border: '1px solid rgba(249,115,22,.2)', fontSize: 11, color: '#F97316', textAlign: 'center' }}>
                  🔒 Cliente travado — sendo atendido por <strong>{cliente.responsavel_bko_nome}</strong>
                </div>
              ) : (
                {bkoTravado ? (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(249,115,22,.08)', border: '1px solid rgba(249,115,22,.2)', fontSize: 11, color: '#F97316', textAlign: 'center' }}>
                  🔒 Cliente travado — sendo atendido por <strong>{cliente.responsavel_bko_nome}</strong>
                </div>
              ) : (
                <button className="btn" style={{ width: '100%', justifyContent: 'center', background: B_MID, color: '#fff', boxShadow: `0 3px 12px ${B_GLOW}` }} onClick={salvarInfo}>Salvar alterações</button>
              )}
              )}"""

correto = """              {bkoTravado ? (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(249,115,22,.08)', border: '1px solid rgba(249,115,22,.2)', fontSize: 11, color: '#F97316', textAlign: 'center' }}>
                  🔒 Cliente travado — sendo atendido por <strong>{cliente.responsavel_bko_nome}</strong>
                </div>
              ) : (
                <button className="btn" style={{ width: '100%', justifyContent: 'center', background: B_MID, color: '#fff', boxShadow: `0 3px 12px ${B_GLOW}` }} onClick={salvarInfo}>Salvar alterações</button>
              )}"""

if errado in code:
    code = code.replace(errado, correto)
    print('  ✅ 2/2 — Ternário duplicado do botão Salvar corrigido')
    changes += 1
else:
    print('  ⚠️  2/2 — Bloco errado não encontrado (pode já estar correto)')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print(f'\n  TOTAL: {changes} correção(ões)')
print(f'  Rode: npm run dev')