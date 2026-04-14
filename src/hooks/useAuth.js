import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

export function useAuth(){
  const [session,setSession]=useState(null);
  const [profile,setProfile]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);
  const [unauthorized,setUnauthorized]=useState(false);
  const [configError,setConfigError]=useState(false);
  const [isRecovery,setIsRecovery]=useState(false);

  const loadProfile=useCallback(async(uid,email)=>{
    try {
      const emailLower=email.toLowerCase().trim();

      // 1. Profile já existe
      let {data:existing}=await supabase.from('profiles').select('*').eq('id',uid).single();
      if(existing){
        // Verificar se modulo está correto cruzando com allowed_users
        const {data:au}=await supabase.from('allowed_users').select('modulo,role').ilike('email',emailLower).single();
        if(au&&au.modulo&&au.modulo!==existing.modulo){
          // Corrigir modulo e role desatualizados
          await supabase.from('profiles').update({modulo:au.modulo,role:au.role}).eq('id',uid);
          existing={...existing,modulo:au.modulo,role:au.role};
        }
        if(existing.modulo==='corbans'){
          existing=await enrichCorbanProfile(existing);
        }
        setProfile(existing);
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
        // [OTM-AUTH] Queries em paralelo — era sequencial (2 awaits separados = 2x mais lento)
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

      // 5. Enriquecer com nomes para exibição
      let finalProfile=created||newProfile;
      if(modulo==='corbans'){
        finalProfile=await enrichCorbanProfile(finalProfile,allowed);
      }
      // BKO não precisa de enriquecimento adicional
      setProfile(finalProfile);

    } catch(e){
      console.error('Erro ao carregar perfil:',e);
      setConfigError(true);
    }
    setAuthLoading(false);
  },[]);

  // [OTM-AUTH] Queries em paralelo — era sequencial (até 4 awaits encadeados)
  // Antes: 4 queries sequenciais (~400-800ms total)
  // Depois: 2 queries paralelas (~100-200ms total)
  async function enrichCorbanProfile(prof, allowed=null){
    // Buscar nomes de promotora e PP em paralelo
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
        else { setProfile(null); setUnauthorized(false); setAuthLoading(false); }
      });

      return ()=>subscription.unsubscribe();
    } catch(e){
      console.error('Erro fatal Supabase:',e);
      setConfigError(true);
      setAuthLoading(false);
    }
  },[loadProfile]);

  const signOut=async()=>{ try { await supabase.auth.signOut(); } catch(e){} };

  return {session,profile,authLoading,unauthorized,signOut,configError,isRecovery};
}