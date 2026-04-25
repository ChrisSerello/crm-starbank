import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabase';

/* ─── Fontes ──────────────────────────────────────────────────────────────── */
if (!document.getElementById('tv-fonts')) {
  const link = document.createElement('link');
  link.id = 'tv-fonts';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;700&display=swap';
  document.head.appendChild(link);
}

/* ─── Paleta ──────────────────────────────────────────────────────────────── */
const C = {
  bg:'#07090F', panel:'#0D1120', border:'rgba(59,91,219,.15)',
  blue:'#3B5BDB', blueG:'rgba(59,91,219,.12)',
  green:'#22C55E', red:'#EF4444', orange:'#F97316',
  amber:'#F59E0B', purple:'#7C3AED', cyan:'#0EA5E9',
  text:'#F1F5FF', muted:'rgba(241,245,255,.5)', faint:'rgba(241,245,255,.2)',
};

/* ─── Constantes ──────────────────────────────────────────────────────────── */
const MES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const META_MENSAL = 200; // Altere conforme a meta real da equipe

const BKO_STAGES = [
  { id:'clientes_novos',       label:'Clientes Novos',           color:'#3B5BDB' },
  { id:'saldo_andamento',      label:'Saldo em Andamento',       color:'#7C3AED' },
  { id:'pendencia_financeiro', label:'Pendência Financeiro',     color:'#F97316' },
  { id:'em_negociacao',        label:'Em Negociação',            color:'#0EA5E9' },
  { id:'abertura_conta',       label:'Abertura de Conta',        color:'#10B981' },
  { id:'digitar_proposta',     label:'Digitar Proposta',         color:'#F59E0B' },
];

/* ─── Extração de estado a partir do campo prefeitura ─────────────────────── */
const ESTADO_MAP = [
  [['goiás','goias','governo de goiás','governo de goias',' go '], 'GO'],
  [['são paulo','sao paulo','taboão','taboao','salto','maringá','maringa'], 'SP'],
  [['minas gerais',' mg '], 'MG'],
  [['mato grosso do sul',' ms '], 'MS'],
  [['mato grosso',' mt '], 'MT'],
  [['pará','para ','itaituba',' pa '], 'PA'],
  [['bahia',' ba '], 'BA'],
  [['rio de janeiro',' rj '], 'RJ'],
  [['rio grande do sul',' rs '], 'RS'],
  [['paraná','parana','maringa',' pr '], 'PR'],
  [['santa catarina',' sc '], 'SC'],
  [['ceará','ceara',' ce '], 'CE'],
  [['pernambuco',' pe '], 'PE'],
  [['amazonas',' am '], 'AM'],
  [['distrito federal','brasilia','brasília',' df '], 'DF'],
  [['maranhão','maranhao','monção','moncao',' ma '], 'MA'],
  [['tocantins',' to '], 'TO'],
];

function extractEstado(prefeitura) {
  if (!prefeitura) return null;
  const l = ' ' + prefeitura.toLowerCase() + ' ';
  for (const [keys, uf] of ESTADO_MAP) {
    if (keys.some(k => l.includes(k))) return uf;
  }
  return null;
}

/* ─── Posições dos estados no mapa SVG (viewBox: 40 50 185 235) ───────────── */
const ESTADO_POS = {
  AM:{ x:72,  y:83  }, PA:{ x:128, y:68  }, TO:{ x:145, y:115 },
  MA:{ x:165, y:74  }, CE:{ x:190, y:64  }, PE:{ x:192, y:93  },
  BA:{ x:172, y:148 }, DF:{ x:143, y:168 }, GO:{ x:138, y:162 },
  MG:{ x:162, y:188 }, RJ:{ x:168, y:210 }, SP:{ x:143, y:213 },
  MT:{ x:98,  y:145 }, MS:{ x:116, y:192 },
  PR:{ x:128, y:232 }, SC:{ x:136, y:246 }, RS:{ x:125, y:262 },
};

/* ─── Hooks ───────────────────────────────────────────────────────────────── */
function useCountUp(target, dur = 1100) {
  const [val, setVal] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = target;
    if (from === target) return;
    let start = null;
    const step = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      setVal(Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, dur]);
  return val;
}

/* ─── Componentes visuais ─────────────────────────────────────────────────── */
function Pulse({ color = C.green, size = 10 }) {
  return (
    <span style={{ position:'relative', display:'inline-flex', width:size, height:size }}>
      <span style={{ position:'absolute', inset:0, borderRadius:'50%', background:color,
        opacity:.4, animation:'tv-ping 1.4s ease infinite' }}/>
      <span style={{ width:size, height:size, borderRadius:'50%', background:color,
        position:'relative', boxShadow:`0 0 6px ${color}` }}/>
    </span>
  );
}

function Ring({ pct, size = 130, stroke = 10, color }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(pct / 100, 1);
  const displayed = useCountUp(Math.round(pct));
  return (
    <div style={{ position:'relative', width:size, height:size }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="rgba(255,255,255,.06)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
          strokeWidth={stroke} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition:'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)',
            filter:`drop-shadow(0 0 8px ${color}70)` }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center' }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:size*.24,
          color:C.text, lineHeight:1 }}>{displayed}%</div>
        <div style={{ fontSize:size*.09, color:C.muted, marginTop:2 }}>da meta</div>
      </div>
    </div>
  );
}

/* ─── Mapa do Brasil ──────────────────────────────────────────────────────── */
function BrazilMap({ counts }) {
  const max = Math.max(...Object.values(counts), 1);
  return (
    <svg viewBox="40 50 185 225" style={{ width:'100%', height:'auto' }}>
      {/* Contorno simplificado */}
      <path d="M75,60 Q95,54 115,57 Q135,54 155,52 Q172,50 188,60 Q202,68 206,84
               Q210,100 200,114 Q206,130 196,144 Q185,160 175,172 Q180,188 174,202
               Q166,216 158,226 Q152,236 144,246 Q138,254 130,261
               Q124,270 118,280 Q112,268 106,256 Q98,244 96,230
               Q90,218 88,204 Q83,190 80,175 Q76,160 70,148
               Q60,134 56,118 Q48,102 54,88 Q60,74 75,60 Z"
        fill="rgba(59,91,219,.06)" stroke="rgba(59,91,219,.22)" strokeWidth="1.5"/>
      {Object.entries(ESTADO_POS).map(([uf, pos]) => {
        const n = counts[uf] || 0;
        if (n === 0) return null;
        const r = Math.max(6, Math.min(22, 6 + (n / max) * 16));
        const col = n > 30 ? C.blue : n > 15 ? C.cyan : '#60A5FA';
        return (
          <g key={uf}>
            <circle cx={pos.x} cy={pos.y} r={r + 4} fill={col} opacity={0.15}/>
            <circle cx={pos.x} cy={pos.y} r={r} fill={col} opacity={0.75}
              style={{ filter:`drop-shadow(0 0 4px ${col}80)` }}/>
            <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="central"
              fontSize={Math.min(r * 0.6, 9)} fill="#fff" fontWeight="700"
              fontFamily="'DM Sans',sans-serif">{n}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── TVApp principal ─────────────────────────────────────────────────────── */

/* Fora do componente — normalize não depende de estado */
const normalize = (r) => ({
  ...r.data,
  id: r.id,
  estagio: r.estagio,
  criado_por_nome: r.criado_por_nome || r.data?.criado_por_nome || null,
  criado_por_id:   r.criado_por_id   || r.data?.criado_por_id   || null,
  atribuido_a_nome:r.atribuido_a_nome|| r.data?.atribuido_a_nome|| null,
});

export function TVApp({ profile, signOut }) {
  const [clientes, setClientes] = useState([]);
  const [ready, setReady]       = useState(false);
  const [time, setTime]         = useState(new Date());
  const isComercial             = profile?.role === 'comercial';

  /* Clock — sempre roda */
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* Carregar dados — só busca se for comercial */
  useEffect(() => {
    if (!isComercial) { setReady(true); return; }

    supabase.from('bko_clientes').select('*').order('created_at', { ascending:false }).limit(1000)
      .then(({ data, error }) => {
        if (error) { console.error('TVApp load error:', error); setReady(true); return; }
        setClientes((data || []).map(normalize));
        setReady(true);
      });

    /* Realtime — UPDATE e INSERT */
    const ch = supabase.channel('tv_dash')
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'bko_clientes' }, payload => {
        const c = normalize(payload.new);
        setClientes(prev => prev.map(x => x.id === c.id ? c : x));
      })
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'bko_clientes' }, payload => {
        const c = normalize(payload.new);
        setClientes(prev => [c, ...prev]);
      })
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [isComercial]);

  /* Métricas calculadas */
  const integrados    = clientes.filter(c => c.estagio === 'integrado').length;
  const perdidos      = clientes.filter(c => c.estagio === 'perdido').length;
  const pipelineAtivo = clientes.filter(c => c.estagio !== 'integrado' && c.estagio !== 'perdido');
  const pctMeta       = Math.round(integrados / META_MENSAL * 100);

  const stageCounts = useMemo(() => {
    const m = {};
    BKO_STAGES.forEach(s => { m[s.id] = clientes.filter(c => c.estagio === s.id).length; });
    return m;
  }, [clientes]);
  const maxStage = Math.max(...Object.values(stageCounts), 1);

  /* Ranking por operador */
  const ranking = useMemo(() => {
    const m = {};
    clientes.filter(c => c.estagio === 'integrado').forEach(c => {
      const n = c.criado_por_nome || 'Sem nome';
      m[n] = (m[n] || 0) + 1;
    });
    return Object.entries(m)
      .sort(([, a], [, b]) => b - a).slice(0, 5)
      .map(([nome, count]) => ({
        nome, count,
        av: nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase(),
      }));
  }, [clientes]);

  /* Mapa — estados */
  const estadosCounts = useMemo(() => {
    const m = {};
    clientes.forEach(c => {
      const uf = extractEstado(c.prefeitura);
      if (uf) m[uf] = (m[uf] || 0) + 1;
    });
    return m;
  }, [clientes]);

  /* Atividade recente */
  const recentActivity = useMemo(() =>
    clientes
      .flatMap(c => (c.activities || []).slice(-1).map(a => ({ ...a, clienteName:c.nomeCliente })))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 7),
  [clientes]);

  /* Contadores animados */
  const integradosDisplay = useCountUp(integrados);
  const perdidosDisplay   = useCountUp(perdidos);

  /* Clock formatado */
  const pad = n => String(n).padStart(2, '0');
  const hh = pad(time.getHours()), mm = pad(time.getMinutes()), ss = pad(time.getSeconds());
  const fmtDate = time.toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' });
  const mesNome = MES_FULL[time.getMonth()];

  /* ── Tela de acesso negado — APÓS todos os hooks ── */
  if (!isComercial) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex',
      alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16,
      fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ fontSize:48 }}>🔒</div>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, color:C.text,
        letterSpacing:'.04em' }}>ACESSO RESTRITO</div>
      <div style={{ fontSize:14, color:C.muted }}>Este painel é exclusivo para o Comercial</div>
      <button onClick={signOut} style={{ marginTop:8, padding:'10px 24px', borderRadius:8,
        background:C.blueG, border:`1px solid ${C.border}`, color:C.text,
        cursor:'pointer', fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>
        Voltar ao login
      </button>
    </div>
  );

  /* Loading */
  if (!ready) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex',
      alignItems:'center', justifyContent:'center', gap:14,
      fontFamily:"'DM Sans',sans-serif" }}>
      <Pulse color={C.blue} size={12}/>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:C.muted,
        letterSpacing:'.08em' }}>CONECTANDO AO BANCO DE DADOS...</div>
    </div>
  );

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes tv-ping{0%{transform:scale(1);opacity:1}75%,100%{transform:scale(2.2);opacity:0}}
        @keyframes tv-shimmer{0%,100%{opacity:.35}50%{opacity:1}}
        .tv-card{background:${C.panel};border:1px solid ${C.border};border-radius:16px;padding:16px 18px;overflow:hidden;}
        .tv-eyebrow{font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${C.muted};margin-bottom:10px;font-family:'DM Sans',sans-serif;}
      `}</style>

      <div style={{ height:'100vh', display:'flex', flexDirection:'column',
        background:C.bg, fontFamily:"'DM Sans',sans-serif", color:C.text, overflow:'hidden' }}>

        {/* ── HEADER ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'10px 24px', borderBottom:`1px solid ${C.border}`,
          background:'rgba(13,17,32,.9)', backdropFilter:'blur(12px)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:'.06em',
              color:C.text }}>STARBANK · BKO</div>
            <div style={{ width:1, height:18, background:C.border }}/>
            <div style={{ fontSize:10, color:C.muted, letterSpacing:'.1em',
              textTransform:'uppercase' }}>Painel executivo</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:18 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
              <Pulse color={C.green}/>
              <span style={{ fontSize:10, fontWeight:700, color:C.green,
                letterSpacing:'.1em' }}>AO VIVO</span>
            </div>
            <div style={{ width:1, height:16, background:C.border }}/>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:19,
                fontWeight:700, color:C.text, lineHeight:1 }}>
                {hh}
                <span style={{ animation:'tv-shimmer 1s infinite' }}>:</span>
                {mm}
                <span style={{ animation:'tv-shimmer 1s infinite' }}>:</span>
                {ss}
              </div>
              <div style={{ fontSize:9, color:C.muted, marginTop:2,
                textTransform:'capitalize' }}>{fmtDate}</div>
            </div>
          </div>
        </div>

        {/* ── BODY: grade principal ── */}
        <div style={{ flex:1, display:'grid',
          gridTemplateColumns:'250px 1fr 1fr 250px',
          gridTemplateRows:'1fr 1fr',
          gap:10, padding:'12px 18px', overflow:'hidden' }}>

          {/* [A] Meta + Integrados + Perdidos — col 1, rows 1+2 */}
          <div style={{ gridRow:'1 / 3', display:'flex', flexDirection:'column', gap:10 }}>
            {/* Meta */}
            <div className="tv-card" style={{ flex:'0 0 auto', display:'flex',
              flexDirection:'column', alignItems:'center', padding:'16px 14px', gap:10 }}>
              <div className="tv-eyebrow">{mesNome} · meta {META_MENSAL}</div>
              <Ring pct={pctMeta}
                color={pctMeta >= 100 ? C.green : pctMeta >= 70 ? C.blue : C.amber}/>
              <div style={{ fontSize:11, color:C.muted, textAlign:'center' }}>
                {META_MENSAL - integrados > 0
                  ? `Faltam ${META_MENSAL - integrados} para a meta`
                  : '🎉 Meta atingida!'}
              </div>
            </div>
            {/* Integrados */}
            <div className="tv-card" style={{ flex:1, borderColor:'rgba(34,197,94,.28)' }}>
              <div className="tv-eyebrow">Integrados no mês</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:72, lineHeight:1,
                color:C.green, textShadow:`0 0 36px ${C.green}50` }}>{integradosDisplay}</div>
              <div style={{ width:44, height:3, borderRadius:99,
                background:C.green, marginTop:6 }}/>
            </div>
            {/* Perdidos */}
            <div className="tv-card" style={{ flex:'0 0 auto', borderColor:'rgba(239,68,68,.22)' }}>
              <div className="tv-eyebrow">Perdidos no mês</div>
              <div style={{ display:'flex', alignItems:'baseline', gap:12 }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:52,
                  lineHeight:1, color:C.red }}>{perdidosDisplay}</div>
                <div style={{ fontSize:12, color:C.muted }}>
                  Conversão:{' '}
                  <span style={{ color:C.text, fontWeight:600 }}>
                    {integrados + perdidos > 0
                      ? Math.round(integrados / (integrados + perdidos) * 100) + '%'
                      : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* [B] Pipeline — col 2, row 1 */}
          <div className="tv-card" style={{ gridColumn:'2', gridRow:'1' }}>
            <div style={{ display:'flex', justifyContent:'space-between',
              alignItems:'center', marginBottom:14 }}>
              <div className="tv-eyebrow" style={{ marginBottom:0 }}>Pipeline ativo</div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11,
                color:C.blue }}>{pipelineAtivo.length} clientes</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
              {BKO_STAGES.map(s => (
                <div key={s.id}>
                  <div style={{ display:'flex', justifyContent:'space-between',
                    alignItems:'center', marginBottom:4 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <div style={{ width:7, height:7, borderRadius:'50%', background:s.color,
                        boxShadow:`0 0 5px ${s.color}`, flexShrink:0 }}/>
                      <span style={{ fontSize:10, color:C.muted }}>{s.label}</span>
                    </div>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11,
                      fontWeight:700, color:C.text }}>{stageCounts[s.id] || 0}</span>
                  </div>
                  <div style={{ height:6, borderRadius:99,
                    background:'rgba(255,255,255,.05)', overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:99, background:s.color,
                      width:`${((stageCounts[s.id] || 0) / maxStage) * 100}%`,
                      boxShadow:`0 0 8px ${s.color}60`,
                      transition:'width .8s cubic-bezier(.4,0,.2,1)' }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* [C] Mapa — col 3, row 1 */}
          <div className="tv-card" style={{ gridColumn:'3', gridRow:'1',
            display:'flex', gap:14 }}>
            <div style={{ flex:'0 0 160px' }}>
              <div className="tv-eyebrow">Clientes por estado</div>
              <BrazilMap counts={estadosCounts}/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div className="tv-eyebrow">Top regiões</div>
              {Object.entries(estadosCounts)
                .sort(([, a], [, b]) => b - a).slice(0, 7)
                .map(([uf, n]) => (
                  <div key={uf} style={{ display:'flex', alignItems:'center',
                    gap:8, marginBottom:8 }}>
                    <div style={{ width:6, height:6, borderRadius:'50%',
                      background:C.blue, flexShrink:0 }}/>
                    <span style={{ fontSize:10, color:C.muted, minWidth:24 }}>{uf}</span>
                    <div style={{ flex:1, height:5, borderRadius:99,
                      background:'rgba(255,255,255,.05)', overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:99, background:C.blue,
                        width:`${(n / Math.max(...Object.values(estadosCounts))) * 100}%`,
                        transition:'width .8s ease' }}/>
                    </div>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace",
                      fontSize:10, color:C.text, minWidth:22, textAlign:'right' }}>{n}</span>
                  </div>
                ))}
              {Object.keys(estadosCounts).length === 0 && (
                <div style={{ fontSize:10, color:C.faint, lineHeight:1.6 }}>
                  Preencha o campo Prefeitura nos clientes para ativar o mapa
                </div>
              )}
            </div>
          </div>

          {/* [D] Ranking — col 4, row 1 */}
          <div className="tv-card" style={{ gridColumn:'4', gridRow:'1' }}>
            <div className="tv-eyebrow">Ranking · operadores</div>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {ranking.length === 0 && (
                <div style={{ fontSize:11, color:C.faint }}>Nenhum integrado ainda</div>
              )}
              {ranking.map((op, i) => (
                <div key={op.nome} style={{ display:'flex', alignItems:'center',
                  gap:9, padding:'8px 10px', borderRadius:10,
                  background:i === 0 ? C.blueG : 'rgba(255,255,255,.02)',
                  border:`1px solid ${i === 0 ? C.border : 'transparent'}` }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16,
                    color:i===0?C.amber:i===1?'#9CA3AF':i===2?'#CD7F32':C.faint,
                    width:16, textAlign:'center', flexShrink:0 }}>{i + 1}</div>
                  <div style={{ width:28, height:28, borderRadius:7, background:C.blueG,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:9, fontWeight:700, color:'#93C5FD', flexShrink:0 }}>{op.av}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:10, fontWeight:600, color:C.text,
                      overflow:'hidden', textOverflow:'ellipsis',
                      whiteSpace:'nowrap' }}>{op.nome}</div>
                  </div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22,
                    color:i === 0 ? C.green : C.muted }}>{op.count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* [E] Atividade recente — col 2, row 2 */}
          <div className="tv-card" style={{ gridColumn:'2', gridRow:'2' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <div className="tv-eyebrow" style={{ marginBottom:0 }}>Atividade em tempo real</div>
              <Pulse color={C.green} size={8}/>
            </div>
            <div style={{ display:'flex', flexDirection:'column' }}>
              {recentActivity.length === 0 && (
                <div style={{ fontSize:10, color:C.faint }}>Aguardando atividades...</div>
              )}
              {recentActivity.map((a, i) => (
                <div key={a.id || i} style={{ display:'flex', alignItems:'flex-start',
                  gap:8, padding:'7px 0',
                  borderBottom:i < recentActivity.length - 1 ? `1px solid ${C.border}` : 'none',
                  opacity:Math.max(1 - i * 0.12, 0.25) }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', marginTop:4,
                    flexShrink:0,
                    background:a.text?.includes('Integrado')?C.green
                               :a.text?.includes('Perdido')?C.red:C.blue }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:10, fontWeight:600, color:C.text,
                      overflow:'hidden', textOverflow:'ellipsis',
                      whiteSpace:'nowrap' }}>{a.clienteName}</div>
                    <div style={{ fontSize:9, color:C.muted, marginTop:1 }}>{a.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* [F] Stats adicionais — col 3+4, row 2 */}
          <div style={{ gridColumn:'3 / 5', gridRow:'2',
            display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {/* Operador do dia */}
            <div className="tv-card">
              <div className="tv-eyebrow">Destaque do dia</div>
              {ranking[0] ? (
                <>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                    <div style={{ width:44, height:44, borderRadius:12,
                      background:`linear-gradient(135deg, ${C.blue}, ${C.purple})`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:15, fontWeight:700, color:'#fff', flexShrink:0 }}>
                      {ranking[0].av}
                    </div>
                    <div>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18,
                        color:C.text, lineHeight:1 }}>{ranking[0].nome}</div>
                      <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>
                        Operador líder no mês
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:14 }}>
                    <div>
                      <div style={{ fontSize:9, color:C.muted }}>Integrados</div>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36,
                        color:C.green, lineHeight:1 }}>{ranking[0].count}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:9, color:C.muted }}>Taxa pessoal</div>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36,
                        color:C.blue, lineHeight:1 }}>
                        {Math.round(ranking[0].count / Math.max(integrados, 1) * 100)}%
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ fontSize:11, color:C.faint }}>Nenhum integrado ainda</div>
              )}
            </div>
            {/* Velocidade */}
            <div className="tv-card">
              <div className="tv-eyebrow">Ritmo do mês</div>
              {(() => {
                const diaDoMes = time.getDate();
                const diasUteis = Math.max(diaDoMes, 1);
                const porDia = (integrados / diasUteis).toFixed(1);
                const diasRestantes = 22 - diasUteis; // aprox dias úteis no mês
                const projecao = Math.round(integrados + parseFloat(porDia) * Math.max(diasRestantes, 0));
                const vaiBater = projecao >= META_MENSAL;
                return (
                  <>
                    <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:8 }}>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:48,
                        lineHeight:1, color:C.amber }}>{porDia}</div>
                      <div style={{ fontSize:12, color:C.muted }}>integ./dia</div>
                    </div>
                    <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>
                      Projeção ao fim do mês:
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28,
                        color:vaiBater ? C.green : C.orange }}>{projecao}</div>
                      <div style={{ fontSize:11, fontWeight:600, padding:'2px 9px',
                        borderRadius:99,
                        background:vaiBater ? 'rgba(34,197,94,.15)' : 'rgba(249,115,22,.12)',
                        color:vaiBater ? C.green : C.orange }}>
                        {vaiBater ? 'vai bater ✓' : `faltam ${META_MENSAL - projecao}`}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ padding:'7px 24px', borderTop:`1px solid ${C.border}`,
          display:'flex', justifyContent:'space-between', alignItems:'center',
          background:'rgba(13,17,32,.7)', flexShrink:0 }}>
          <div style={{ fontSize:9, color:C.faint,
            fontFamily:"'JetBrains Mono',monospace" }}>
            starbank.tec.br · BKO BACKOFFICE
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <Pulse color={C.green} size={8}/>
            <span style={{ fontSize:9, color:C.muted,
              fontFamily:"'JetBrains Mono',monospace" }}>
              Supabase Realtime · conectado
            </span>
          </div>
          <div style={{ fontSize:9, color:C.faint,
            fontFamily:"'JetBrains Mono',monospace" }}>
            Acesso: Comercial · /tv
          </div>
        </div>
      </div>
    </>
  );
}