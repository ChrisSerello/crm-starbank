# fix_doc_horario.py
# Rode na raiz do projeto: python fix_doc_horario.py

import os

path = 'src/views/bko/BKODetail.jsx'
print('\n=== Fix: Horário nos documentos ===\n')

if not os.path.exists(path):
    print(f'ERRO: {path} não encontrado')
    exit()

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

changes = 0

# ── 1. Adicionar função de formatação com horário ─────────────────────────────
# Procura pela função fmtD ou pelo início do arquivo para adicionar helper
old_import = """import { gid, TODAY, fmtD } from '../../utils';"""
new_import = """import { gid, TODAY, fmtD } from '../../utils';

// Formata data com horário para exibição nos documentos
const fmtDH=(ts)=>{
  if(!ts) return '—';
  try{
    const d=new Date(ts);
    const data=d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'});
    const hora=d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    return `${data} às ${hora}`;
  }catch{ return ts; }
};"""

if old_import in c:
    c = c.replace(old_import, new_import)
    print('  OK: função fmtDH adicionada')
    changes += 1
else:
    # Tenta sem o fmtD no import
    old_import2 = """import { gid, TODAY } from '../../utils';"""
    new_import2 = """import { gid, TODAY } from '../../utils';

const fmtDH=(ts)=>{
  if(!ts) return '—';
  try{
    const d=new Date(ts);
    const data=d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'});
    const hora=d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    return `${data} às ${hora}`;
  }catch{ return ts; }
};"""
    if old_import2 in c:
        c = c.replace(old_import2, new_import2)
        print('  OK: função fmtDH adicionada (variante)')
        changes += 1
    else:
        print('  AVISO: import não encontrado — adicione fmtDH manualmente')

# ── 2. Substituir exibição de data por data+hora nos documentos ───────────────
# Padrão mais comum: {fmtD(doc.data)} ou {doc.data}
replacements = [
    # Padrão com fmtD
    ('{fmtD(doc.data)}', '{fmtDH(doc.data||doc.created_at||doc.uploadedAt)}'),
    ('{fmtD(doc.date)}', '{fmtDH(doc.date||doc.created_at)}'),
    # Padrão direto
    ('{doc.data}', '{fmtDH(doc.data||doc.created_at)}'),
]

for old, new in replacements:
    if old in c:
        c = c.replace(old, new)
        print(f'  OK: {old} → com horário')
        changes += 1

if changes <= 1:
    print('  AVISO: padrão de data do documento não encontrado automaticamente')
    print('  Procure no BKODetail.jsx onde aparece a data do documento e substitua por:')
    print('  {fmtDH(doc.data||doc.created_at||doc.uploadedAt)}')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print(f'\n  BKODetail.jsx: {changes} alteração(ões) aplicada(s)')
print('\nPronto! Rode: npm run dev')