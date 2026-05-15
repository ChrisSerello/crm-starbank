# fix_duplicata_checarTravaBKO.py
# Rode na raiz do projeto: python fix_duplicata_checarTravaBKO.py

import os, sys

path = 'src/views/bko/BKOApp.jsx'
if not os.path.exists(path):
    print(f'ERRO: {path} não encontrado.')
    sys.exit(1)

with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# A função duplicada (segunda ocorrência) — remover inteira
duplicata = """// Verifica se o cliente pode ser movido pelo usuário atual
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

const blankCliente"""

substituicao = """const blankCliente"""

count = code.count('function checarTravaBKO')
print(f'  Encontradas {count} declarações de checarTravaBKO')

if count == 2 and duplicata in code:
    code = code.replace(duplicata, substituicao, 1)
    print('  ✅ Duplicata removida com sucesso!')
elif count == 2:
    # Tentar abordagem alternativa: encontrar e remover a segunda ocorrência
    first = code.find('function checarTravaBKO')
    second = code.find('function checarTravaBKO', first + 1)
    if second > 0:
        # Encontrar o fim da segunda função (próximo "const " ou "function " no nível do módulo)
        end = code.find('\nconst blankCliente', second)
        if end > 0:
            code = code[:second] + code[end+1:]
            print('  ✅ Segunda ocorrência removida (abordagem alternativa)')
        else:
            print('  ⚠️  Não consegui encontrar o fim da duplicata')
            sys.exit(1)
    else:
        print('  ⚠️  Não encontrei a segunda ocorrência')
        sys.exit(1)
elif count == 1:
    print('  ✅ Já está correto — só tem uma declaração')
else:
    print(f'  ⚠️  Situação inesperada: {count} ocorrências')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

# Verificação final
with open(path, 'r', encoding='utf-8') as f:
    final = f.read()

final_count = final.count('function checarTravaBKO')
print(f'\n  Verificação final: {final_count} declaração(ões) de checarTravaBKO')
if final_count == 1:
    print('  ✅ Arquivo corrigido! Rode: npm run dev')
else:
    print('  ⚠️  Ainda há problema — verifique manualmente')