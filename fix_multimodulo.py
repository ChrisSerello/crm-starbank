# fix_multimodulo.py
# Rode na raiz do projeto: python fix_multimodulo.py
# Corrige dois problemas:
# 1. selectModule agora atualiza o perfil no banco (fix RLS BKO/Corbans)
# 2. Leads só carregam/sincronizam no módulo indicacoes (fix 401 spam)

import os

def fix_useauth(content):
    # Substitui selectModule para também atualizar o perfil no banco
    old = """  const selectModule=useCallback((modulo,role)=>{
    setProfile(prev=>({...prev,modulo,role}));
    setNeedsModuleSelect(false);
  },[]);"""

    new = """  const selectModule=useCallback(async(modulo,role)=>{
    setProfile(prev=>({...prev,modulo,role}));
    setNeedsModuleSelect(false);
    // Atualiza perfil no banco para que as políticas RLS funcionem corretamente
    try {
      const {data:{session:s}}=await supabase.auth.getSession();
      if(s?.user?.id){
        await supabase.from('profiles').update({modulo,role}).eq('id',s.user.id);
      }
    } catch(e){ console.error('Erro ao atualizar módulo no perfil:',e); }
  },[]);"""

    if old in content:
        content = content.replace(old, new)
        print('  OK: selectModule atualizado para gravar no banco')
    else:
        print('  AVISO: selectModule não encontrado — verifique manualmente')
    return content


def fix_appjsx(content):
    # 1. Guard no carregamento de leads — só roda em indicacoes
    old_load = """  // ── Load leads from Supabase on login ──
  useEffect(()=>{
    if(!session) return;
    supabase.from('leads').select('data').limit(500).then(async({data,error})=>{"""

    new_load = """  // ── Load leads from Supabase on login ──
  useEffect(()=>{
    if(!session||!profile) return;
    // BKO, Corbans e Externos têm seus próprios dados — não usam a tabela de leads
    if(profile.modulo&&profile.modulo!=='indicacoes') return;
    supabase.from('leads').select('data').limit(500).then(async({data,error})=>{"""

    if old_load in content:
        content = content.replace(old_load, new_load)
        print('  OK: guard de carregamento de leads adicionado')
    else:
        print('  AVISO: guard de carregamento não encontrado — verifique manualmente')

    # 2. Guard no sync de leads — só roda em indicacoes
    old_sync = """  useEffect(()=>{
    if(!leadsReady||!session) return;"""

    new_sync = """  useEffect(()=>{
    if(!leadsReady||!session) return;
    // Só sincroniza leads no módulo indicacoes
    if(profile?.modulo&&profile.modulo!=='indicacoes') return;"""

    if old_sync in content:
        content = content.replace(old_sync, new_sync)
        print('  OK: guard de sincronização de leads adicionado')
    else:
        print('  AVISO: guard de sync não encontrado — verifique manualmente')

    # 3. Adicionar profile?.modulo na dependência do useEffect de load
    old_dep = "},[session]);  // leads load"
    # Pode não existir como comentário, tentamos ambas as formas
    old_dep2 = "  },[session]);\n\n  // ── Watch leads"
    new_dep2 = "  },[session,profile?.modulo]);\n\n  // ── Watch leads"

    if old_dep2 in content:
        content = content.replace(old_dep2, new_dep2)
        print('  OK: dependência profile?.modulo adicionada no useEffect de load')

    return content


files = {
    'src/hooks/useAuth.js': fix_useauth,
    'src/App.jsx': fix_appjsx,
}

print('\n=== Fix: Multi-módulo RLS + leads sync ===\n')

for filepath, fn in files.items():
    if not os.path.exists(filepath):
        print(f'  ERRO: {filepath} não encontrado')
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    print(f'Processando: {filepath}')
    new_content = fn(content)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print()

print('Pronto! Rode: npm run dev')