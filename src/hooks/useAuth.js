import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

export function useAuth(){
  const [session,setSession]=useState(null);
  const [profile,setProfile]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);
  const [unauthorized,setUnauthorized]=useState(false);
  const [configError,setConfigError]=useState(false);
  const [isRecovery,setIsRecovery]=useState(false);

  // ── Multi-módulo ──────────────────────────────────────────
  const [userModules,setUserModules]=useState([]);       // [{modulo, role}]
  const [needsModuleSelect,setNeedsModuleSelect]=useState(false);

  // Chamado quando o usuário clica em um módulo na tela de seleção
  const selectModule=useCallback(async(modulo,role)=>{
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
  },[]);
  // ─────────────────────────────────────────────────────────

  const loadProfile=useCallback(async(uid,email)=>{
    try {
      const emailLower=email.toLowerCase().trim();

      // ── Carregar módulos disponíveis (paralelo com o resto) ──
      const modulesPromise=supabase
        .from('user_modules')
        .select('modulo,role')
        .ilike('email',emailLower);

      // 1. Profile já existe
      let {data:existing}=await supabase.from('profiles').select('*').eq('id',uid).single();

      // Resolver módulos enquanto o profile carregava
      const {data:modules}=await modulesPromise;
      const hasMultiModule=modules&&modules.length>1;

      if(hasMultiModule){
        setUserModules(modules);
      } else if(modules&&modules.length===1){
        setUserModules(modules);
      }

      if(existing){
        // Verificar se modulo está correto cruzando com allowed_users
        const {data:au}=await supabase.from('allowed_users').select('modulo,role').ilike('email',emailLower).single();
        if(au&&au.modulo&&au.modulo!==existing.modulo){
          await supabase.from('profiles').update({modulo:au.modulo,role:au.role}).eq('id',uid);
          existing={...existing,modulo:au.modulo,role:au.role};
        }
        if(existing.modulo==='corbans'){
          existing=await enrichCorbanProfile(existing);
        }
        setProfile(existing);
        if(hasMultiModule) setNeedsModuleSelect(true);
        setAuthLoading(false);
        return;
      }

      // 2. Procura em allowed_users (case-insensitive)
      const {data:allowed}=await supabase.from('allowed_users').select('*').ilike('email',emailLower).single();
      if(!allowed){ setUnauthorized(true); setAuthLoading(false); return; }

      // 3. Resolve hierarquia corbans (emails → UUIDs de profiles)
      let promotora_principal_id=null;
      let promotora_id=null;
      const modulo=allowed.modulo||'indicacoes';

      if(modulo==='corbans'){
        const [ppResult, pResult] = await Promise.all([
          allowed.promotora_principal_email
            ? supabase.from('profiles').select('id').ilike('email',allowed.promotora_principal_email).single()
            : Promise.resolve({data:null}),
          allowed.promotora_email
            ? supabase.from('profiles').select('id').ilike('email',allowed.promotora_email).single()
            : Promise.resolve({data:null}),
        ]);
        promotora_principal_id = ppResult.data?.id || null;
        promotora_id = pResult.data?.id || null;
      }

      // 4. Cria profile
      const newProfile={
        id:uid, email:emailLower, nome:allowed.nome, role:allowed.role,
        modulo, promotora_principal_id, promotora_id,
      };
      const {data:created}=await supabase.from('profiles').insert(newProfile).select().single();

      let finalProfile=created||newProfile;
      if(modulo==='corbans'){
        finalProfile=await enrichCorbanProfile(finalProfile,allowed);
      }
      setProfile(finalProfile);
      if(hasMultiModule) setNeedsModuleSelect(true);

    } catch(e){
      console.error('Erro ao carregar perfil:',e);
      setConfigError(true);
    }
    setAuthLoading(false);
  },[]);

  async function enrichCorbanProfile(prof, allowed=null){
    const [promResult, ppResult] = await Promise.all([
      prof.promotora_id
        ? supabase.from('profiles').select('nome').eq('id',prof.promotora_id).single()
        : allowed?.promotora_email
          ? supabase.from('allowed_users').select('nome').ilike('email',allowed.promotora_email).single()
          : Promise.resolve({data:null}),
      prof.promotora_principal_id
        ? supabase.from('profiles').select('nome').eq('id',prof.promotora_principal_id).single()
        : allowed?.promotora_principal_email
          ? supabase.from('allowed_users').select('nome').ilike('email',allowed.promotora_principal_email).single()
          : Promise.resolve({data:null}),
    ]);

    return {
      ...prof,
      promotoraNome: promResult.data?.nome || null,
      promotoraPrincipalNome: ppResult.data?.nome || null,
    };
  }

  useEffect(()=>{
    try {
      supabase.auth.getSession().then(({data:{session}})=>{
        setSession(session);
        if(session) loadProfile(session.user.id,session.user.email);
        else setAuthLoading(false);
      }).catch(e=>{
        console.error('Erro de conexão Supabase:',e);
        setConfigError(true);
        setAuthLoading(false);
      });

      const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
        if(event==='PASSWORD_RECOVERY'||event==='SIGNED_IN'&&window.location.hash.includes('type=recovery')){
          setIsRecovery(true);
          setSession(session);
          setAuthLoading(false);
          return;
        }
        setSession(session);
        if(session) loadProfile(session.user.id,session.user.email);
        else {
          setProfile(null);
          setUnauthorized(false);
          setUserModules([]);
          setNeedsModuleSelect(false);
          setAuthLoading(false);
        }
      });

      return ()=>subscription.unsubscribe();
    } catch(e){
      console.error('Erro fatal Supabase:',e);
      setConfigError(true);
      setAuthLoading(false);
    }
  },[loadProfile]);

  const signOut=async()=>{
    try {
      await supabase.auth.signOut();
      setUserModules([]);
      setNeedsModuleSelect(false);
    } catch(e){}
  };

  return {
    session,profile,authLoading,unauthorized,signOut,configError,isRecovery,
    // Multi-módulo
    userModules,needsModuleSelect,selectModule,
  };
}