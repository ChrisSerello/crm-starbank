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
      const emailLower = email.toLowerCase().trim();
      let {data}=await supabase.from('profiles').select('*').eq('id',uid).single();
      if(data){ setProfile(data); setAuthLoading(false); return; }
      // Use ilike for case-insensitive match — handles any capitalization in DB
      const {data:allowed}=await supabase.from('allowed_users').select('*').ilike('email',emailLower).single();
      if(allowed){
        const {data:created}=await supabase.from('profiles').insert({id:uid,email:emailLower,nome:allowed.nome,role:allowed.role}).select().single();
        setProfile(created);
      } else {
        setUnauthorized(true);
      }
    } catch(e) {
      console.error('Erro ao carregar perfil:', e);
      setConfigError(true);
    }
    setAuthLoading(false);
  },[]);

  useEffect(()=>{
    try {
      supabase.auth.getSession().then(({data:{session}})=>{
        setSession(session);
        if(session) loadProfile(session.user.id, session.user.email);
        else setAuthLoading(false);
      }).catch(e=>{
        console.error('Erro de conexão Supabase:', e);
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
        if(session) loadProfile(session.user.id, session.user.email);
        else { setProfile(null); setUnauthorized(false); setAuthLoading(false); }
      });
      return ()=>subscription.unsubscribe();
    } catch(e) {
      console.error('Erro fatal Supabase:', e);
      setConfigError(true);
      setAuthLoading(false);
    }
  },[loadProfile]);

  const signOut=async()=>{ try { await supabase.auth.signOut(); } catch(e){} };

  return {session,profile,authLoading,unauthorized,signOut,configError,isRecovery};
}