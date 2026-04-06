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

      // 1. Profile já existe → retorna direto
      let {data:existing}=await supabase.from('profiles').select('*').eq('id',uid).single();
      if(existing){
        // Enriquecer com nomes de hierarquia corbans se necessário
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
        if(allowed.promotora_principal_email){
          const {data:pp}=await supabase.from('profiles')
            .select('id').ilike('email',allowed.promotora_principal_email).single();
          promotora_principal_id=pp?.id||null;
        }
        if(allowed.promotora_email){
          const {data:p}=await supabase.from('profiles')
            .select('id').ilike('email',allowed.promotora_email).single();
          promotora_id=p?.id||null;
        }
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
      setProfile(finalProfile);

    } catch(e){
      console.error('Erro ao carregar perfil:',e);
      setConfigError(true);
    }
    setAuthLoading(false);
  },[]);

  // Adiciona nomes de promotora/pp ao profile para exibição no frontend
  async function enrichCorbanProfile(prof,allowed=null){
    let promotoraNome=null;
    let promotoraPrincipalNome=null;

    if(prof.promotora_id){
      const {data:p}=await supabase.from('profiles').select('nome').eq('id',prof.promotora_id).single();
      promotoraNome=p?.nome||null;
    }
    if(prof.promotora_principal_id){
      const {data:pp}=await supabase.from('profiles').select('nome').eq('id',prof.promotora_principal_id).single();
      promotoraPrincipalNome=pp?.nome||null;
    }

    // Fallback via allowed_users emails se UUIDs ainda não resolvidos
    if(!promotoraNome&&allowed?.promotora_email){
      const {data:au}=await supabase.from('allowed_users').select('nome').ilike('email',allowed.promotora_email).single();
      promotoraNome=au?.nome||null;
    }
    if(!promotoraPrincipalNome&&allowed?.promotora_principal_email){
      const {data:au}=await supabase.from('allowed_users').select('nome').ilike('email',allowed.promotora_principal_email).single();
      promotoraPrincipalNome=au?.nome||null;
    }

    return { ...prof, promotoraNome, promotoraPrincipalNome };
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