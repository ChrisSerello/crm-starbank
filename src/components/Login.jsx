import { useState } from 'react';
import { supabase } from '../supabase';

export function Login(){
  const [screen,setScreen]=useState('login'); // 'login' | 'forgot' | 'sent'
  const [email,setEmail]=useState('');
  const [pass,setPass]=useState('');
  const [showPass,setShowPass]=useState(false);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const [shaking,setShaking]=useState(false);

  const attempt=async()=>{
    if(!email.trim()||!pass){setError('Preencha e-mail e senha.');return;}
    setLoading(true);setError('');
    const {error:err}=await supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password:pass});
    setLoading(false);
    if(err){setError('E-mail ou senha incorretos.');setShaking(true);setTimeout(()=>setShaking(false),500);}
  };

  const sendReset=async()=>{
    if(!email.trim()){setError('Digite seu e-mail para continuar.');return;}
    setLoading(true);setError('');
    const {error:err}=await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(),{
      redirectTo:`${window.location.origin}/`,
    });
    setLoading(false);
    if(err){setError('Erro ao enviar e-mail. Verifique o endereço.');}
    else{setScreen('sent');}
  };

  const Logo=()=>(
    <div style={{display:"flex",justifyContent:"center",marginBottom:28}}>
      <img
        src="/starflow.gif"
        alt="StarFlow"
        style={{
          width:"100%",
          maxWidth:220,
          height:"auto",
          maxHeight:100,
          objectFit:"contain",
          objectPosition:"center",
          display:"block",
        }}
      />
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:"var(--bg-base)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font)",padding:16}}>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}.shake{animation:shake .45s both;}`}</style>
      <div style={{position:"fixed",top:-100,right:-100,width:400,height:400,borderRadius:"50%",background:"rgba(91,79,232,0.07)",filter:"blur(80px)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",bottom:-80,left:-80,width:320,height:320,borderRadius:"50%",background:"rgba(26,158,138,0.07)",filter:"blur(60px)",pointerEvents:"none"}}/>

      {/* ── Login ── */}
      {screen==='login'&&(
        <div className={shaking?"shake":""} style={{background:"var(--bg-elevated)",borderRadius:"var(--radius-xl)",border:"1px solid var(--border-mid)",boxShadow:"0 8px 48px rgba(60,40,20,0.14), 0 1px 0 rgba(255,255,255,0.8) inset",width:"100%",maxWidth:400,padding:"40px 36px",animation:"fadeUp .4s cubic-bezier(.4,0,.2,1) both"}}>
          <Logo/>
          <div style={{marginBottom:24}}>
            <div style={{fontSize:22,fontWeight:600,fontFamily:"var(--font-display)",color:"var(--text-primary)",letterSpacing:"-.02em",marginBottom:4}}>Bem-vindo de volta</div>
            <div style={{fontSize:13,color:"var(--text-muted)"}}>Acesso restrito à equipe Starbank</div>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{display:"block",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>E-mail</label>
            <input className="inp" type="email" value={email} onChange={e=>{setEmail(e.target.value);setError('');}} onKeyDown={e=>e.key==="Enter"&&attempt()} placeholder="seu@email.com" autoComplete="email"/>
          </div>
          <div style={{marginBottom:6}}>
            <label style={{display:"block",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>Senha</label>
            <div style={{position:"relative"}}>
              <input className="inp" type={showPass?"text":"password"} value={pass} onChange={e=>{setPass(e.target.value);setError('');}} onKeyDown={e=>e.key==="Enter"&&attempt()} placeholder="••••••••" autoComplete="current-password" style={{paddingRight:44}}/>
              <button onClick={()=>setShowPass(v=>!v)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:15,color:"var(--text-muted)",padding:4,lineHeight:1}}>{showPass?"🙈":"👁"}</button>
            </div>
          </div>
          {/* Forgot password link */}
          <div style={{textAlign:"right",marginBottom:error?10:20}}>
            <button onClick={()=>{setScreen('forgot');setError('');}} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:"var(--accent)",fontFamily:"var(--font)",fontWeight:500}}>
              Esqueci minha senha
            </button>
          </div>
          {error&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:8,marginBottom:16,background:"var(--danger-dim)",border:"1px solid rgba(196,66,58,.2)",fontSize:12,fontWeight:500,color:"var(--danger)"}}><span>⚠</span>{error}</div>}
          <button className="btn btn-primary" style={{width:"100%",justifyContent:"center",padding:"11px 0",fontSize:14}} onClick={attempt} disabled={loading}>
            {loading?"Entrando…":"Entrar no sistema"}
          </button>
          <div style={{marginTop:20,padding:"12px 14px",background:"rgba(90,70,50,.05)",borderRadius:10,border:"1px solid var(--border)"}}>
            <div style={{fontSize:11,color:"var(--text-muted)",lineHeight:1.7}}>🔒 Acesso por convite. Não tem conta? Fale com um administrador.</div>
          </div>
        </div>
      )}

      {/* ── Esqueci minha senha ── */}
      {screen==='forgot'&&(
        <div style={{background:"var(--bg-elevated)",borderRadius:"var(--radius-xl)",border:"1px solid var(--border-mid)",boxShadow:"0 8px 48px rgba(60,40,20,0.14), 0 1px 0 rgba(255,255,255,0.8) inset",width:"100%",maxWidth:400,padding:"40px 36px",animation:"fadeUp .4s cubic-bezier(.4,0,.2,1) both"}}>
          <Logo/>
          <div style={{marginBottom:24}}>
            <div style={{fontSize:22,fontWeight:600,fontFamily:"var(--font-display)",color:"var(--text-primary)",letterSpacing:"-.02em",marginBottom:4}}>Redefinir senha</div>
            <div style={{fontSize:13,color:"var(--text-muted)"}}>Digite seu e-mail e enviaremos um link para redefinir sua senha.</div>
          </div>
          <div style={{marginBottom:error?10:24}}>
            <label style={{display:"block",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>E-mail</label>
            <input className="inp" type="email" value={email} onChange={e=>{setEmail(e.target.value);setError('');}} onKeyDown={e=>e.key==="Enter"&&sendReset()} placeholder="seu@email.com" autoComplete="email"/>
          </div>
          {error&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:8,marginBottom:16,background:"var(--danger-dim)",border:"1px solid rgba(196,66,58,.2)",fontSize:12,fontWeight:500,color:"var(--danger)"}}><span>⚠</span>{error}</div>}
          <button className="btn btn-primary" style={{width:"100%",justifyContent:"center",padding:"11px 0",fontSize:14,marginBottom:12}} onClick={sendReset} disabled={loading}>
            {loading?"Enviando…":"Enviar link de redefinição"}
          </button>
          <button onClick={()=>{setScreen('login');setError('');}} style={{width:"100%",padding:"9px 0",background:"none",border:"none",cursor:"pointer",fontSize:13,color:"var(--text-muted)",fontFamily:"var(--font)"}}>
            ← Voltar ao login
          </button>
        </div>
      )}

      {/* ── E-mail enviado ── */}
      {screen==='sent'&&(
        <div style={{background:"var(--bg-elevated)",borderRadius:"var(--radius-xl)",border:"1px solid var(--border-mid)",boxShadow:"0 8px 48px rgba(60,40,20,0.14), 0 1px 0 rgba(255,255,255,0.8) inset",width:"100%",maxWidth:400,padding:"40px 36px",animation:"fadeUp .4s cubic-bezier(.4,0,.2,1) both",textAlign:"center"}}>
          <Logo/>
          <div style={{fontSize:48,marginBottom:16}}>📬</div>
          <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,color:"var(--text-primary)",marginBottom:10}}>E-mail enviado!</div>
          <div style={{fontSize:13,color:"var(--text-muted)",lineHeight:1.7,marginBottom:24}}>
            Enviamos um link de redefinição para<br/>
            <strong style={{color:"var(--text-primary)"}}>{email}</strong><br/>
            Verifique sua caixa de entrada e spam.
          </div>
          <button onClick={()=>{setScreen('login');setError('');}} style={{width:"100%",padding:"9px 0",background:"none",border:"none",cursor:"pointer",fontSize:13,color:"var(--accent)",fontFamily:"var(--font)",fontWeight:600}}>
            ← Voltar ao login
          </button>
        </div>
      )}
    </div>
  );
}

export function Unauthorized({onLogout}){
  return(
    <div style={{minHeight:"100vh",background:"var(--bg-base)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font)"}}>
      <div style={{textAlign:"center",padding:32}}>
        <div style={{fontSize:40,marginBottom:16}}>🚫</div>
        <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,color:"var(--text-primary)",marginBottom:8}}>Acesso não autorizado</div>
        <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:24}}>Este e-mail não tem permissão para acessar o sistema.<br/>Entre em contato com um administrador.</div>
        <button className="btn btn-ghost" onClick={onLogout}>Voltar ao login</button>
      </div>
    </div>
  );
}