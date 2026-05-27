import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase';

const C = {
  bg:          '#f0ece4',
  card:        'rgba(253,251,247,0.85)',
  border:      'rgba(180,170,152,0.25)',
  borderFocus: 'rgba(74,120,72,0.35)',
  accent:      '#3d7a48',
  accentLight: '#4a9b54',
  accentDim:   'rgba(61,122,72,0.08)',
  accentGlow:  'rgba(61,122,72,0.18)',
  danger:      '#c4503a',
  dangerDim:   'rgba(196,80,58,0.07)',
  text1:       '#2c2a25',
  text2:       '#6b665c',
  text3:       '#9e978b',
  inputBg:     'rgba(0,0,0,0.025)',
  inputBorder: 'rgba(180,170,152,0.30)',
  wave1:       'rgba(74,120,72,0.045)',
  wave2:       'rgba(160,140,100,0.035)',
  wave3:       'rgba(120,100,80,0.025)',
};

/* ── Flowing wave background ── */
function WaveBackground() {
  const cvs = useRef(null);
  const raf = useRef(null);
  const t = useRef(0);

  const draw = useCallback(() => {
    const c = cvs.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const w = c.width / devicePixelRatio;
    const h = c.height / devicePixelRatio;
    t.current += 0.003;
    const T = t.current;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const waves = [
      { color: C.wave1, amp: 55, freq: 0.0018, yBase: h * 0.38, speed: 1, phase: 0 },
      { color: C.wave2, amp: 45, freq: 0.0022, yBase: h * 0.52, speed: 0.7, phase: 1.2 },
      { color: C.wave3, amp: 35, freq: 0.0015, yBase: h * 0.65, speed: 1.3, phase: 2.8 },
      { color: 'rgba(74,120,72,0.025)', amp: 60, freq: 0.0012, yBase: h * 0.78, speed: 0.5, phase: 4.1 },
    ];
    for (const wv of waves) {
      ctx.beginPath();
      ctx.moveTo(-10, h + 10);
      for (let x = -10; x <= w + 10; x += 3) {
        const y = wv.yBase
          + Math.sin(x * wv.freq + T * wv.speed + wv.phase) * wv.amp
          + Math.sin(x * wv.freq * 1.8 + T * wv.speed * 0.6 + wv.phase + 1) * wv.amp * 0.4
          + Math.cos(x * wv.freq * 0.5 + T * wv.speed * 1.2) * wv.amp * 0.25;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w + 10, h + 10);
      ctx.closePath();
      ctx.fillStyle = wv.color;
      ctx.fill();
    }
    const circles = [
      { x: w * 0.15, y: h * 0.25, r: 180, color: 'rgba(74,120,72,0.018)' },
      { x: w * 0.80, y: h * 0.35, r: 220, color: 'rgba(180,160,100,0.015)' },
      { x: w * 0.50, y: h * 0.75, r: 160, color: 'rgba(74,120,72,0.012)' },
    ];
    for (const ci of circles) {
      const ox = Math.sin(T * 0.4 + ci.x * 0.01) * 20;
      const oy = Math.cos(T * 0.3 + ci.y * 0.01) * 15;
      const grd = ctx.createRadialGradient(ci.x + ox, ci.y + oy, 0, ci.x + ox, ci.y + oy, ci.r);
      grd.addColorStop(0, ci.color);
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(ci.x + ox, ci.y + oy, ci.r, 0, Math.PI * 2);
      ctx.fill();
    }
    raf.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const c = cvs.current;
    const resize = () => {
      c.width = window.innerWidth * devicePixelRatio;
      c.height = window.innerHeight * devicePixelRatio;
      c.style.width = window.innerWidth + 'px';
      c.style.height = window.innerHeight + 'px';
    };
    resize();
    window.addEventListener('resize', resize);
    raf.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf.current); window.removeEventListener('resize', resize); };
  }, [draw]);

  return <canvas ref={cvs} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
}

/* ── 3D Tilt Card ── */
function TiltCard({ children, style, shaking }) {
  const ref = useRef(null);
  const glareRef = useRef(null);
  const current = useRef({ rx: 0, ry: 0, gx: 50, gy: 50, go: 0 });
  const target = useRef({ rx: 0, ry: 0, gx: 50, gy: 50, go: 0 });
  const raf = useRef(null);
  const isOver = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const lerp = (a, b, t) => a + (b - a) * t;

    const animate = () => {
      const c = current.current;
      const t = target.current;
      const speed = 0.08;
      c.rx = lerp(c.rx, t.rx, speed);
      c.ry = lerp(c.ry, t.ry, speed);
      c.gx = lerp(c.gx, t.gx, speed);
      c.gy = lerp(c.gy, t.gy, speed);
      c.go = lerp(c.go, t.go, speed);

      el.style.transform = `perspective(800px) rotateX(${c.rx}deg) rotateY(${c.ry}deg) scale3d(${isOver.current ? 1.02 : 1}, ${isOver.current ? 1.02 : 1}, 1)`;

      if (glareRef.current) {
        glareRef.current.style.background = `radial-gradient(circle at ${c.gx}% ${c.gy}%, rgba(255,255,255,${c.go}), transparent 65%)`;
      }

      raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);

    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const maxTilt = 8;
      target.current.rx = (0.5 - y) * maxTilt;
      target.current.ry = (x - 0.5) * maxTilt;
      target.current.gx = x * 100;
      target.current.gy = y * 100;
      target.current.go = 0.18;
    };

    const onEnter = () => {
      isOver.current = true;
    };

    const onLeave = () => {
      isOver.current = false;
      target.current.rx = 0;
      target.current.ry = 0;
      target.current.gx = 50;
      target.current.gy = 50;
      target.current.go = 0;
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);

    return () => {
      cancelAnimationFrame(raf.current);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{
        ...style,
        willChange: 'transform',
        transformStyle: 'preserve-3d',
        transition: shaking ? undefined : 'box-shadow 0.4s ease',
        animation: shaking ? 'shake 0.5s ease' : undefined,
        cursor: 'default',
      }}
    >
      {/* glare overlay */}
      <div ref={glareRef} style={{
        position: 'absolute', inset: 0, borderRadius: 22,
        pointerEvents: 'none', zIndex: 10,
        background: 'transparent',
        transition: 'background 0.1s ease',
      }} />
      {children}
    </div>
  );
}

/* ── Input ── */
function Field({ label, type = 'text', value, onChange, onKeyDown, placeholder, autoComplete, suffix }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{
        display: 'block', fontSize: 10.5, fontWeight: 700,
        color: focused ? C.accent : C.text3,
        textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 7,
        transition: 'color 0.3s',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={type} value={value} onChange={onChange} onKeyDown={onKeyDown}
          placeholder={placeholder} autoComplete={autoComplete}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '12px 16px', paddingRight: suffix ? 48 : 16,
            background: focused ? 'rgba(255,255,255,0.7)' : C.inputBg,
            border: `1.5px solid ${focused ? C.borderFocus : C.inputBorder}`,
            borderRadius: 11, color: C.text1,
            fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif",
            outline: 'none', transition: 'all 0.3s ease',
            boxShadow: focused ? `0 0 0 3px ${C.accentDim}, 0 2px 8px rgba(0,0,0,0.04)` : '0 1px 3px rgba(0,0,0,0.03)',
          }}
        />
        {suffix}
      </div>
    </div>
  );
}

/* ── Main ── */
export function Login() {
  const [screen, setScreen] = useState('login');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const attempt = async () => {
    if (!email.trim() || !pass) { setError('Preencha e-mail e senha.'); return; }
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pass });
    setLoading(false);
    if (err) { setError('E-mail ou senha incorretos.'); setShaking(true); setTimeout(() => setShaking(false), 550); }
  };

  const sendReset = async () => {
    if (!email.trim()) { setError('Digite seu e-mail para continuar.'); return; }
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/`,
    });
    setLoading(false);
    if (err) { setError('Erro ao enviar e-mail. Verifique o endereço.'); }
    else { setScreen('sent'); }
  };

  const Logo = () => (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 30 }}>
      <img src="/logoFlow.png" alt="StarFlow" style={{
        width: '100%', maxWidth: 200, height: 'auto', maxHeight: 52,
        objectFit: 'contain', objectPosition: 'center', display: 'block',
      }} />
    </div>
  );

  const cardStyle = {
    position: 'relative', zIndex: 1,
    background: C.card,
    backdropFilter: 'blur(24px) saturate(1.3)',
    WebkitBackdropFilter: 'blur(24px) saturate(1.3)',
    borderRadius: 22,
    border: `1px solid ${C.border}`,
    boxShadow: '0 20px 60px rgba(100,90,70,0.10), 0 1px 0 rgba(255,255,255,0.7) inset, 0 0 0 0.5px rgba(255,255,255,0.3) inset',
    width: '100%', maxWidth: 410,
    padding: '42px 38px',
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(18px)',
    transition: 'opacity 0.6s cubic-bezier(.4,0,.2,1), transform 0.6s cubic-bezier(.4,0,.2,1)',
    overflow: 'hidden',
  };

  const btnPrimary = {
    width: '100%', padding: '13px 0', border: 'none', borderRadius: 11,
    background: `linear-gradient(135deg, ${C.accent}, ${C.accentLight})`,
    color: '#fff', fontSize: 13.5, fontWeight: 700,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    cursor: loading ? 'wait' : 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: `0 4px 16px ${C.accentGlow}, 0 1px 3px rgba(0,0,0,0.08)`,
    letterSpacing: '0.015em',
    position: 'relative', overflow: 'hidden',
  };

  const eyeBtn = (
    <button onClick={() => setShowPass(v => !v)} style={{
      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
      background: 'none', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 1,
      color: C.text3, fontSize: 15, transition: 'color 0.2s',
    }}>{showPass ? '◡' : '◎'}</button>
  );

  const errorBox = error && (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 14px', borderRadius: 10, marginBottom: 18,
      background: C.dangerDim, border: '1px solid rgba(196,80,58,0.12)',
      fontSize: 12, fontWeight: 500, color: C.danger,
    }}><span style={{ fontSize: 13, lineHeight: 1 }}>✕</span>{error}</div>
  );

  const spinner = loading && (
    <span style={{
      display: 'inline-block', width: 15, height: 15,
      border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
      borderRadius: '50%', marginRight: 8, verticalAlign: 'middle',
      animation: 'spin 0.6s linear infinite',
    }} />
  );

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Plus Jakarta Sans', sans-serif", padding: 20,
      position: 'relative', overflow: 'hidden',
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes shake{0%,100%{transform:translateX(0)}15%,45%,75%{transform:translateX(-10px)}30%,60%,90%{transform:translateX(10px)}}
        @keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
        @keyframes btnShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
        input::placeholder{color:${C.text3};}
        *{box-sizing:border-box;margin:0;padding:0;}
      `}</style>

      <WaveBackground />

      {screen === 'login' && (
        <TiltCard style={cardStyle} shaking={shaking}>
          <Logo />
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <div style={{ fontSize: 23, fontWeight: 800, color: C.text1, letterSpacing: '-0.03em', marginBottom: 5 }}>
              Bem-vindo de volta
            </div>
            <div style={{ fontSize: 13, color: C.text2 }}>Acesso restrito à equipe Starbank</div>
          </div>

          <Field label="E-mail" type="email" value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && attempt()}
            placeholder="seu@email.com" autoComplete="email" />
          <Field label="Senha" type={showPass ? 'text' : 'password'} value={pass}
            onChange={e => { setPass(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && attempt()}
            placeholder="••••••••" autoComplete="current-password" suffix={eyeBtn} />

          <div style={{ textAlign: 'right', marginTop: -10, marginBottom: error ? 10 : 22 }}>
            <button onClick={() => { setScreen('forgot'); setError(''); }} style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 12,
              color: C.accent, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
            }}>Esqueci minha senha</button>
          </div>

          {errorBox}

          <button onClick={attempt} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.75 : 1 }}>
            {spinner}
            {loading ? 'Entrando…' : 'Entrar no sistema'}
            {!loading && <div style={{
              position: 'absolute', inset: 0, borderRadius: 11, overflow: 'hidden', pointerEvents: 'none',
            }}><div style={{
              position: 'absolute', top: 0, left: 0, width: '40%', height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
              animation: 'btnShimmer 3.5s ease-in-out infinite',
            }} /></div>}
          </button>

          <div style={{
            marginTop: 22, padding: '11px 14px', borderRadius: 11,
            background: 'rgba(0,0,0,0.02)', border: `1px solid ${C.border}`,
            textAlign: 'center',
          }}>
            <span style={{ fontSize: 11, color: C.text3, lineHeight: 1.7 }}>
              🔒 Acesso por convite. Não tem conta? Fale com um administrador.
            </span>
          </div>
        </TiltCard>
      )}

      {screen === 'forgot' && (
        <TiltCard style={cardStyle}>
          <Logo />
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <div style={{ fontSize: 23, fontWeight: 800, color: C.text1, letterSpacing: '-0.03em', marginBottom: 5 }}>
              Redefinir senha
            </div>
            <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.6 }}>
              Digite seu e-mail e enviaremos um link para redefinir sua senha.
            </div>
          </div>
          <Field label="E-mail" type="email" value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && sendReset()}
            placeholder="seu@email.com" autoComplete="email" />
          {errorBox}
          <button onClick={sendReset} disabled={loading} style={{ ...btnPrimary, marginBottom: 12 }}>
            {spinner}{loading ? 'Enviando…' : 'Enviar link de redefinição'}
          </button>
          <button onClick={() => { setScreen('login'); setError(''); }} style={{
            width: '100%', padding: '10px 0', background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 13, color: C.text2,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>← Voltar ao login</button>
        </TiltCard>
      )}

      {screen === 'sent' && (
        <TiltCard style={{ ...cardStyle, textAlign: 'center' }}>
          <Logo />
          <div style={{
            width: 60, height: 60, borderRadius: 16, margin: '0 auto 18px',
            background: C.accentDim, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, boxShadow: `0 6px 24px ${C.accentDim}`,
          }}>📬</div>
          <div style={{ fontSize: 21, fontWeight: 800, color: C.text1, marginBottom: 10, letterSpacing: '-0.02em' }}>
            E-mail enviado!
          </div>
          <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.8, marginBottom: 26 }}>
            Enviamos um link de redefinição para<br />
            <strong style={{ color: C.accent }}>{email}</strong><br />
            Verifique sua caixa de entrada e spam.
          </div>
          <button onClick={() => { setScreen('login'); setError(''); }} style={{
            background: 'none', border: `1.5px solid ${C.inputBorder}`,
            borderRadius: 11, padding: '10px 24px', cursor: 'pointer',
            fontSize: 13, color: C.accent, fontWeight: 700,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>← Voltar ao login</button>
        </TiltCard>
      )}
    </div>
  );
}

export function Unauthorized({ onLogout }) {
  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <WaveBackground />
      <div style={{
        textAlign: 'center', padding: 40, position: 'relative', zIndex: 1,
        background: C.card, backdropFilter: 'blur(24px)',
        borderRadius: 22, border: `1px solid ${C.border}`,
        boxShadow: '0 20px 60px rgba(100,90,70,0.10), 0 1px 0 rgba(255,255,255,0.7) inset',
      }}>
        <div style={{ fontSize: 42, marginBottom: 16 }}>🚫</div>
        <div style={{ fontSize: 21, fontWeight: 800, color: C.text1, marginBottom: 10 }}>
          Acesso não autorizado
        </div>
        <div style={{ fontSize: 13, color: C.text2, marginBottom: 26, lineHeight: 1.7 }}>
          Este e-mail não tem permissão para acessar o sistema.<br />
          Entre em contato com um administrador.
        </div>
        <button onClick={onLogout} style={{
          padding: '10px 28px', borderRadius: 11,
          background: 'none', border: `1.5px solid ${C.inputBorder}`,
          color: C.text2, fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>Voltar ao login</button>
      </div>
    </div>
  );
}