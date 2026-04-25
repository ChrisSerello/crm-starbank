import { useState, useReducer, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase";
import { GlobalStyles } from "./styles";
import { useAuth } from "./hooks/useAuth";
import { INIT, R } from "./store";
import { stg, TODAY } from "./utils";
import { OPERATORS } from "./constants";

// [OTM-3] Import de LEADS0 removido — seed desativado para reduzir Disk IO

import { Sidebar } from "./components/Sidebar";
import { Detail } from "./components/Detail";
import { NewLead } from "./components/NewLead";
import { Login, Unauthorized } from "./components/Login";
import { AlterarSenha } from "./components/AlterarSenha";
import { ResetPassword } from "./components/ResetPassword";

import { Dashboard } from "./views/Dashboard";
import { Kanban } from "./views/Kanban";
import { LeadsTable } from "./views/LeadsTable";
import { Attribution } from "./views/Attribution";
import { Auditoria } from "./views/Auditoria";
import { GestaoEquipe } from "./views/GestaoEquipe";
import { OperadorApp } from "./views/OperadorApp";
import { CorbanApp } from "./views/corbans/CorbanApp";
import { BKOApp } from "./views/bko/BKOApp";
import { TVApp } from "./views/tv/TVApp";

// ─── ROOT ─────────────────────────────────────────────────────────────────────

export default function App(){
  const {session,profile,authLoading,unauthorized,signOut,configError,isRecovery}=useAuth();
  const [s,dispatch]=useReducer(R,INIT);
  const {leads,view,sel,newOpen,filters,rules,dragId}=s;
  const selected=leads.find(l=>l.id===sel);
  const [showAlterarSenha,setShowAlterarSenha]=useState(false);
  const [leadsReady,setLeadsReady]=useState(false);

  // [OTM-4] Refs para fila e timer do batch de audit_log
  const auditQueueRef = useRef([]);
  const auditTimerRef = useRef(null);

  // ── Load leads from Supabase on login ──
  useEffect(()=>{
    if(!session) return;
    // [OTM-1] Limite de 500 registros para reduzir Disk IO no carregamento inicial
    supabase.from('leads').select('data').limit(500).then(async({data,error})=>{
      if(error) console.error('Erro ao carregar leads:', error);
      // [OTM-2] Bloco de seed removido — elimina upsert em chunks que esgotava o Disk IO Budget
      const remoteLeads = data?.map(r=>r.data) || [];
      dispatch({type:'SET_LEADS', leads:remoteLeads});
      setLeadsReady(true);
    });
  },[session]);

  // ── Watch leads e sync com debounce por lead (sem lock contention) ──
  const pendingSyncRef = useRef({});
  const leadsMapRef = useRef(new Map());

  useEffect(()=>{
    if(!leadsReady||!session) return;
    const prevMap = leadsMapRef.current;
    leads.forEach(l=>{
      if(prevMap.get(l.id) !== l){
        if(pendingSyncRef.current[l.id]){
          clearTimeout(pendingSyncRef.current[l.id]);
        }
        // [OTM-DEBOUNCE] Aumentado de 800ms para 3000ms — reduz upserts em ~70%
        // Usuários raramente editam o mesmo lead em menos de 3s; 
        // o dado ainda é salvo com segurança antes de qualquer navegação.
        pendingSyncRef.current[l.id] = setTimeout(async ()=>{
          const {error} = await supabase
            .from('leads')
            .upsert({id:l.id, data:l},{onConflict:'id'});
          if(error) console.error('Sync error:',l.id,error);
          delete pendingSyncRef.current[l.id];
        }, 3000); // [OTM] era 800ms
      }
    });
    leadsMapRef.current = new Map(leads.map(l=>[l.id,l]));
  },[leads,leadsReady,session]);

  const auditedDispatch=useCallback((action)=>{
    dispatch(action);
    if(session&&profile){
      const auditMap={
        MOVE:()=>({
          action:'Moveu lead no pipeline',
          leadId:action.lid,
          details:`Estágio → "${stg(action.st).label}"`,
        }),
        NOTE:()=>({
          action:'Adicionou nota',
          leadId:action.lid,
          details:action.act?.text||'',
        }),
        UPD:()=>{
          const leadAtual=leads.find(l=>l.id===action.lead?.id);
          const detalhes=[];
          if(leadAtual){
            if(action.lead.responsavelId!==undefined&&action.lead.responsavelId!==leadAtual.responsavelId){
              const antes=OPERATORS.find(o=>o.id===leadAtual.responsavelId)?.name||leadAtual.responsavelId||'Nenhum';
              const depois=OPERATORS.find(o=>o.id===action.lead.responsavelId)?.name||action.lead.responsavelId||'Nenhum';
              detalhes.push(`Responsável: ${antes} → ${depois}`);
            }
            if(action.lead.statusComercial!==undefined&&action.lead.statusComercial!==leadAtual.statusComercial){
              detalhes.push(`Estágio: "${stg(leadAtual.statusComercial).label}" → "${stg(action.lead.statusComercial).label}"`);
            }
            if(action.lead.documentoStatus!==undefined&&action.lead.documentoStatus!==leadAtual.documentoStatus){
              detalhes.push(`Documento: ${leadAtual.documentoStatus} → ${action.lead.documentoStatus}`);
            }
            if(action.lead.operadorRepassado!==undefined&&action.lead.operadorRepassado!==leadAtual.operadorRepassado){
              const antes=leadAtual.operadorRepassado||'Nenhum';
              const depois=action.lead.operadorRepassado||'Nenhum';
              detalhes.push(`Op. Repassado: ${antes} → ${depois}`);
            }
            if(action.lead.equipe!==undefined&&action.lead.equipe!==leadAtual.equipe){
              detalhes.push(`Equipe: ${leadAtual.equipe||'Nenhuma'} → ${action.lead.equipe||'Nenhuma'}`);
            }
          }
          return{
            action:'Editou informações',
            leadId:action.lead?.id,
            details:detalhes.length>0?detalhes.join(' | '):'Campos atualizados no lead',
          };
        },
        ADD:()=>({
          action:'Criou novo lead',
          leadId:null,
          details:`Nome: ${action.lead?.nomeIndicado||'—'}`,
        }),
      };
      const fn=auditMap[action.type];
      if(fn){
        const {action:act,leadId,details}=fn();
        const leadNome=action.type==='ADD'
          ?action.lead?.nomeIndicado
          :leads.find(l=>l.id===leadId)?.nomeIndicado||'—';

        // [OTM-4] Audit log em batch — acumula itens por 3s e envia em uma única requisição
        auditQueueRef.current.push({
          user_id:session.user.id,
          user_nome:profile.nome,
          action:act,
          lead_id:leadId||null,
          lead_nome:leadNome,
          detalhes:details,
        });
        clearTimeout(auditTimerRef.current);
        auditTimerRef.current = setTimeout(async () => {
          const batch = auditQueueRef.current.splice(0);
          if(batch.length === 0) return;
          const {error} = await supabase.from('audit_log').insert(batch);
          if(error) console.error('❌ Audit batch error:', error.message, error.details, error.hint);
          else console.log('✅ Audit batch saved:', batch.length, 'item(s)');
        }, 3000);
      }
    }
  },[profile,leads,session]);

  // ── Auth loading screens ──
  if(configError) return(
    <>
      <GlobalStyles/>
      <div style={{minHeight:"100vh",background:"var(--bg-base)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font)",padding:24}}>
        <div style={{maxWidth:480,background:"var(--bg-elevated)",borderRadius:"var(--radius-xl)",border:"1px solid var(--border-mid)",padding:"36px 32px",boxShadow:"0 8px 48px rgba(60,40,20,0.14)"}}>
          <div style={{fontSize:32,marginBottom:16}}>⚠️</div>
          <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,color:"var(--text-primary)",marginBottom:8}}>Supabase não configurado</div>
          <div style={{fontSize:13,color:"var(--text-secondary)",lineHeight:1.7,marginBottom:20}}>
            O arquivo <code style={{background:"rgba(90,70,50,.1)",padding:"1px 6px",borderRadius:4,fontSize:12}}>.env</code> não foi criado ou as chaves estão incorretas.
          </div>
          <div style={{background:"rgba(90,70,50,.06)",border:"1px solid var(--border-mid)",borderRadius:8,padding:"12px 14px",fontFamily:"monospace",fontSize:12,color:"var(--text-primary)",lineHeight:1.8}}>
            VITE_SUPABASE_URL=https://xxxx.supabase.co<br/>
            VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui
          </div>
        </div>
      </div>
    </>
  );

  if(isRecovery) return <><GlobalStyles/><ResetPassword/></>;

  if(authLoading) return(
    <>
      <GlobalStyles/>
      <div style={{minHeight:"100vh",background:"var(--bg-base)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font)"}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:28,marginBottom:12}}>◈</div>
          <div style={{fontSize:13,color:"var(--text-muted)"}}>Carregando…</div>
        </div>
      </div>
    </>
  );

  if(!session) return <><GlobalStyles/><Login/></>;
  if(unauthorized) return <><GlobalStyles/><Unauthorized onLogout={signOut}/></>;
  if(!profile) return(
    <><GlobalStyles/>
      <div style={{minHeight:"100vh",background:"var(--bg-base)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font)"}}>
        <div style={{fontSize:13,color:"var(--text-muted)"}}>Verificando perfil…</div>
      </div>
    </>
  );

  // ── TV Dashboard — rota /tv (exclusivo role comercial) ──
  if(window.location.pathname==='/tv') return(
    <>
      <GlobalStyles/>
      <TVApp profile={profile} session={session} signOut={signOut}/>
    </>
  );

  // ── Corbans — módulo totalmente isolado ──
  if(profile.modulo==='corbans') return(
    <>
      <GlobalStyles/>
      <CorbanApp
        profile={profile}
        session={session}
        signOut={signOut}
        onAlterarSenha={()=>setShowAlterarSenha(true)}
      />
      {showAlterarSenha && <AlterarSenha onClose={()=>setShowAlterarSenha(false)}/>}
    </>
  );

  // ── BKO — módulo totalmente isolado ──
  if(profile.modulo==='bko') return(
    <>
      <GlobalStyles/>
      <BKOApp
        profile={profile}
        session={session}
        signOut={signOut}
        onAlterarSenha={()=>setShowAlterarSenha(true)}
      />
      {showAlterarSenha&&<AlterarSenha onClose={()=>setShowAlterarSenha(false)}/>}
    </>
  );

  // ── Operador — app separado com visão filtrada ──
  if(profile.role==='operador') return(
    <>
      <GlobalStyles/>
      <OperadorApp
        leads={leads}
        profile={profile}
        dispatch={auditedDispatch}
        onLogout={signOut}
        onAlterarSenha={()=>setShowAlterarSenha(true)}
        session={session}
      />
      {showAlterarSenha && <AlterarSenha onClose={()=>setShowAlterarSenha(false)}/>}
    </>
  );

  // ── Main app ──
  return(
    <>
      <GlobalStyles/>
      <div style={{display:"flex",minHeight:"100vh",background:"var(--bg-base)",fontFamily:"var(--font)"}}>
        <Sidebar
          view={view}
          dispatch={auditedDispatch}
          onLogout={signOut}
          onAlterarSenha={()=>setShowAlterarSenha(true)}
          profile={profile}
        />
        <main style={{flex:1,minWidth:0,overflowY:"auto",paddingRight:selected?490:0,transition:"padding-right .3s cubic-bezier(.4,0,.2,1)"}}>
          {view==="dashboard"   && <Dashboard leads={leads}/>}
          {view==="kanban"      && <Kanban leads={leads} dispatch={auditedDispatch} dragId={dragId}/>}
          {view==="leads"       && <LeadsTable leads={leads} dispatch={auditedDispatch} filters={filters}/>}
          {view==="attribution" && <Attribution rules={rules} dispatch={auditedDispatch}/>}
          {view==="auditoria"   && <Auditoria/>}
          {view==="equipe"      && <GestaoEquipe/>}
        </main>
        {selected && <Detail key={selected.id} lead={selected} dispatch={auditedDispatch}/>}
        {newOpen   && <NewLead dispatch={auditedDispatch}/>}
        {showAlterarSenha && <AlterarSenha onClose={()=>setShowAlterarSenha(false)}/>}
      </div>
    </>
  );
}