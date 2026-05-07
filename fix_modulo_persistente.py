# fix_modulo_persistente.py
# Rode na raiz do projeto: python fix_modulo_persistente.py

import os

path = 'src/hooks/useAuth.js'
print('\n=== Fix: Módulo persistente no localStorage ===\n')

if not os.path.exists(path):
    print(f'ERRO: {path} não encontrado')
    exit()

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

changes = 0

# ── 1. selectModule: salvar no localStorage ao escolher ──────────────────────
old_select = """  const selectModule=useCallback(async(modulo,role)=>{
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

new_select = """  const selectModule=useCallback(async(modulo,role)=>{
    setAuthLoading(true);
    try {
      const {data:{session:s}}=await supabase.auth.getSession();
      if(s?.user?.id){
        await supabase.from('profiles').update({modulo,role}).eq('id',s.user.id);
        // Salvar módulo escolhido para não mostrar tela de seleção novamente
        try{ localStorage.setItem('sf_ultimo_modulo_'+s.user.id, modulo); }catch{}
      }
    } catch(e){ console.error('Erro ao atualizar módulo no perfil:',e); }
    setProfile(prev=>({...prev,modulo,role}));
    setNeedsModuleSelect(false);
    setAuthLoading(false);
  },[]);"""

if old_select in c:
    c = c.replace(old_select, new_select)
    print('  OK: selectModule salva no localStorage')
    changes += 1
else:
    print('  AVISO: selectModule não encontrado')

# ── 2. loadProfile: verificar localStorage antes de mostrar seleção ───────────
old_needs = """        setProfile(existing);
        if(hasMultiModule) setNeedsModuleSelect(true);
        setAuthLoading(false);
        return;"""

new_needs = """        setProfile(existing);
        if(hasMultiModule){
          // Verificar se já tem módulo salvo para este usuário
          try{
            const saved=localStorage.getItem('sf_ultimo_modulo_'+uid);
            const savedModule=modules.find(m=>m.modulo===saved);
            if(saved&&savedModule&&saved===existing.modulo){
              // Já está no módulo correto, não mostrar seleção
              setNeedsModuleSelect(false);
            } else if(saved&&savedModule&&saved!==existing.modulo){
              // Tem módulo salvo diferente do atual, mudar silenciosamente
              await supabase.from('profiles').update({modulo:savedModule.modulo,role:savedModule.role}).eq('id',uid);
              setProfile(prev=>({...prev,modulo:savedModule.modulo,role:savedModule.role}));
              setNeedsModuleSelect(false);
            } else {
              setNeedsModuleSelect(true);
            }
          }catch{
            setNeedsModuleSelect(true);
          }
        }
        setAuthLoading(false);
        return;"""

if old_needs in c:
    c = c.replace(old_needs, new_needs)
    print('  OK: loadProfile verifica localStorage antes de mostrar seleção')
    changes += 1
else:
    print('  AVISO: bloco de needsModuleSelect não encontrado')

# ── 3. signOut: limpar módulo salvo ao sair ───────────────────────────────────
old_signout = """  const signOut=async()=>{
    try {
      await supabase.auth.signOut();
      setUserModules([]);
      setNeedsModuleSelect(false);
    } catch(e){}
  };"""

new_signout = """  const signOut=async()=>{
    try {
      const {data:{session:s}}=await supabase.auth.getSession();
      if(s?.user?.id){
        try{ localStorage.removeItem('sf_ultimo_modulo_'+s.user.id); }catch{}
      }
      await supabase.auth.signOut();
      setUserModules([]);
      setNeedsModuleSelect(false);
    } catch(e){}
  };"""

if old_signout in c:
    c = c.replace(old_signout, new_signout)
    print('  OK: signOut limpa localStorage')
    changes += 1
else:
    print('  AVISO: signOut não encontrado')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print(f'\n  useAuth.js: {changes} alteração(ões) aplicada(s)')
print('\nPronto! Rode: npm run dev')
print('\nComportamento: na primeira vez aparece a seleção, nas próximas vai direto.')
print('Ao clicar Sair da conta, limpa a preferência e volta a mostrar na próxima vez.')