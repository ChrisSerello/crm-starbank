import { useState } from 'react';
import { supabase } from '../supabase';

export function AlterarSenha({onClose}){
  const [atual,setAtual]=useState('');
  const [nova,setNova]=useState('');
  const [confirmar,setConfirmar]=useState('');
  const [showAtual,setShowAtual]=useState(false);
  const [showNova,setShowNova]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [done,setDone]=useState(false);

  const submit=async()=>{
    if(!atual){setError('Digite sua senha atual.');return;}
    if(!nova||nova.length<6){setError('A nova senha deve ter pelo menos 6 caracteres.');return;}
    if(nova===atual){setError('A nova senha deve ser diferente da atual.');return;}
    if(nova!==confirmar){setError('As senhas não coincidem.');return;}
    setLoading(true);setError('');
    // Re-authenticate first
    const {data:sessionData}=await supabase.auth.getSession();
    const userEmail=sessionData?.session?.user?.email;
    const {error:authErr}=await supabase.auth.signInWithPassword({email:userEmail,password:atual});
    if(authErr){setLoading(false);setError('Senha atual incorreta.');return;}
    // Update password
    const {error:updErr}=await supabase.auth.updateUser({password:nova});
    setLoading(false);
    if(updErr){setError('Erro ao alterar senha. Tente novamente.');}
    else{setDone(true);}
  };

  return(
    <div className="mbk" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="mbox" style={{maxWidth:420}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <div>
            <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,color:"var(--text-primary)"}}>Alterar senha</div>
            <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>Crie uma nova senha de acesso</div>
          </div>
          <button onClick={onClose} style={{background:"rgba(90,70,50,.08)",border:"1px solid var(--border-mid)",borderRadius:9,color:"var(--text-secondary)",cursor:"pointer",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>×</button>
        </div>

        {done?(
          <div style={{textAlign:"center",padding:"16px 0 8px"}}>
            <div style={{fontSize:40,marginBottom:12}}>✅</div>
            <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,color:"var(--text-primary)",marginBottom:8}}>Senha alterada!</div>
            <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:20}}>Sua senha foi atualizada com sucesso.</div>
            <button className="btn btn-primary" style={{justifyContent:"center"}} onClick={onClose}>Fechar</button>
          </div>
        ):(
          <>
            <div style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:6}}>Senha atual</label>
              <div style={{position:"relative"}}>
                <input className="inp" type={showAtual?"text":"password"} value={atual} onChange={e=>{setAtual(e.target.value);setError('');}} placeholder="Sua senha atual" style={{paddingRight:44}}/>
                <button onClick={()=>setShowAtual(v=>!v)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:14,color:"var(--text-muted)",padding:4}}>{showAtual?"🙈":"👁"}</button>
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:6}}>Nova senha</label>
              <div style={{position:"relative"}}>
                <input className="inp" type={showNova?"text":"password"} value={nova} onChange={e=>{setNova(e.target.value);setError('');}} placeholder="Mínimo 6 caracteres" style={{paddingRight:44}}/>
                <button onClick={()=>setShowNova(v=>!v)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:14,color:"var(--text-muted)",padding:4}}>{showNova?"🙈":"👁"}</button>
              </div>
            </div>
            <div style={{marginBottom:error?10:20}}>
              <label style={{display:"block",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:6}}>Confirmar nova senha</label>
              <input className="inp" type={showNova?"text":"password"} value={confirmar} onChange={e=>{setConfirmar(e.target.value);setError('');}} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="Repita a nova senha"/>
            </div>
            {error&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:8,marginBottom:14,background:"var(--danger-dim)",border:"1px solid rgba(196,66,58,.2)",fontSize:12,color:"var(--danger)"}}><span>⚠</span>{error}</div>}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
              <button className="btn btn-primary" onClick={submit} disabled={loading}>{loading?"Salvando…":"Alterar senha"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}