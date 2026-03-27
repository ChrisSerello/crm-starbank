import { useState } from 'react';
import { supabase } from '../supabase';

export function ResetPassword(){
  const [pass,setPass]=useState('');
  const [confirm,setConfirm]=useState('');
  const [showPass,setShowPass]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [done,setDone]=useState(false);

  const submit=async()=>{
    if(!pass||pass.length<6){setError('A senha deve ter pelo menos 6 caracteres.');return;}
    if(pass!==confirm){setError('As senhas não coincidem.');return;}
    setLoading(true);setError('');
    const {error:err}=await supabase.auth.updateUser({password:pass});
    setLoading(false);
    if(err){setError('Erro ao definir senha. Tente novamente.');return;}
    setDone(true);
    setTimeout(()=>window.location.href='/',1800);
  };

  return(
    <div style={{minHeight:"100vh",background:"var(--bg-base)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font)",padding:16}}>
      <div style={{position:"fixed",top:-100,right:-100,width:400,height:400,borderRadius:"50%",background:"rgba(91,79,232,0.07)",filter:"blur(80px)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",bottom:-80,left:-80,width:320,height:320,borderRadius:"50%",background:"rgba(26,158,138,0.07)",filter:"blur(60px)",pointerEvents:"none"}}/>
      <div style={{background:"var(--bg-elevated)",borderRadius:"var(--radius-xl)",border:"1px solid var(--border-mid)",boxShadow:"0 8px 48px rgba(60,40,20,0.14), 0 1px 0 rgba(255,255,255,0.8) inset",width:"100%",maxWidth:400,padding:"40px 36px",animation:"fadeUp .4s cubic-bezier(.4,0,.2,1) both"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:32}}>
          <div style={{width:44,height:44,borderRadius:13,background:"linear-gradient(135deg,#5B4FE8 0%,#9B8FF5 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,boxShadow:"0 4px 16px rgba(91,79,232,.35)"}}>◈</div>
          <div>
            <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,color:"var(--text-primary)"}}>Starbank</div>
            <div style={{fontSize:11,fontWeight:700,color:"var(--accent)",letterSpacing:".09em",textTransform:"uppercase"}}>CRM Indicações</div>
          </div>
        </div>

        {done?(
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:40,marginBottom:12}}>✅</div>
            <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,color:"var(--text-primary)",marginBottom:8}}>Senha definida!</div>
            <div style={{fontSize:13,color:"var(--text-muted)"}}>Redirecionando para o login…</div>
          </div>
        ):(
          <>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:22,fontWeight:600,fontFamily:"var(--font-display)",color:"var(--text-primary)",letterSpacing:"-.02em",marginBottom:4}}>Definir sua senha</div>
              <div style={{fontSize:13,color:"var(--text-muted)"}}>Crie uma senha para acessar o sistema</div>
            </div>

            <div style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>Nova senha</label>
              <div style={{position:"relative"}}>
                <input className="inp" type={showPass?"text":"password"} value={pass} onChange={e=>{setPass(e.target.value);setError('');}} placeholder="Mínimo 6 caracteres" style={{paddingRight:44}}/>
                <button onClick={()=>setShowPass(v=>!v)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:15,color:"var(--text-muted)",padding:4,lineHeight:1}}>{showPass?"🙈":"👁"}</button>
              </div>
            </div>

            <div style={{marginBottom:error?10:24}}>
              <label style={{display:"block",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>Confirmar senha</label>
              <input className="inp" type={showPass?"text":"password"} value={confirm} onChange={e=>{setConfirm(e.target.value);setError('');}} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="Repita a senha"/>
            </div>

            {error&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:8,marginBottom:16,background:"var(--danger-dim)",border:"1px solid rgba(196,66,58,.2)",fontSize:12,fontWeight:500,color:"var(--danger)"}}><span>⚠</span>{error}</div>}

            <button className="btn btn-primary" style={{width:"100%",justifyContent:"center",padding:"11px 0",fontSize:14}} onClick={submit} disabled={loading}>
              {loading?"Salvando…":"Salvar senha e entrar"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}