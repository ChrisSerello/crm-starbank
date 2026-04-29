# fix_timing.py
# Rode na raiz do projeto: python fix_timing.py
# Corrige race condition: BKOApp carregava dados antes do banco ser atualizado

import os

filepath = 'src/hooks/useAuth.js'

old = """  const selectModule=useCallback(async(modulo,role)=>{
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

new = """  const selectModule=useCallback(async(modulo,role)=>{
    // Mostra loading enquanto atualiza o banco
    // (o módulo só renderiza depois que o banco confirmar — evita race condition com RLS)
    setAuthLoading(true);
    try {
      const {data:{session:s}}=await supabase.auth.getSession();
      if(s?.user?.id){
        await supabase.from('profiles').update({modulo,role}).eq('id',s.user.id);
      }
    } catch(e){ console.error('Erro ao atualizar módulo no perfil:',e); }
    setProfile(prev=>({...prev,modulo,role}));
    setNeedsModuleSelect(false);
    setAuthLoading(false);
  },[]);"""

print('\n=== Fix: timing do selectModule ===\n')

if not os.path.exists(filepath):
    print(f'ERRO: {filepath} não encontrado')
else:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if old in content:
        content = content.replace(old, new)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print('OK: selectModule corrigido — banco atualiza antes do módulo renderizar')
    else:
        print('AVISO: trecho não encontrado. Faça manualmente:')
        print('Em useAuth.js, no selectModule, mova o setProfile e setNeedsModuleSelect')
        print('para DEPOIS do await supabase.from(profiles).update(...)')

print('\nPronto! Rode: npm run dev')