// src/views/externos/ExternosApp.jsx
// npm install xlsx  ← necessário para import/export Excel
import { useState, useEffect, useReducer, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../../supabase';
import { TODAY, fmtD, sinceD } from '../../utils';
import { Avatar } from '../../components/shared';
import { AlterarSenha } from '../../components/AlterarSenha';

const gid = () => crypto.randomUUID();

// ─── TEMA ─────────────────────────────────────────────────────────────────────
const C = {
  bg: '#EDEEF6', surface: '#F4F5FB', card: '#FFFFFF',
  accent: '#4361EE', accent2: '#6B85F4',
  accentDim: 'rgba(67,97,238,0.09)', accentPale: '#ECF0FD',
  text: '#1A1F3A', text2: '#4B5275', muted: '#8892AE',
  border: '#DDE2F0', border2: '#BCC8E8',
  success: '#10B981', sBg: 'rgba(16,185,129,0.09)',
  warn: '#F59E0B', wBg: 'rgba(245,158,11,0.09)',
  danger: '#EF4444', dBg: 'rgba(239,68,68,0.09)',
  shadow: '0 1px 4px rgba(67,97,238,0.07), 0 4px 16px rgba(67,97,238,0.07)',
  shadowLg: '0 4px 28px rgba(67,97,238,0.14)',
  sidebarW: 228,
};
const STAGE_COLORS = ['#4361EE','#7C3AED','#EC4899','#F59E0B','#10B981','#EF4444','#6B7280','#0EA5E9','#14B8A6','#F97316'];
const BUCKET = 'externos-docs';

const STATUS_CL = {
  pendente:   { label: 'Pendente',    bg: C.surface, color: C.muted,    border: C.border },
  enviado:    { label: 'Enviado',     bg: '#EEF2FF', color: C.accent,   border: '#BCC8E8' },
  em_analise: { label: 'Em análise',  bg: C.wBg,     color: C.warn,     border: 'rgba(245,158,11,.3)' },
  aprovado:   { label: 'Aprovado',    bg: C.sBg,     color: C.success,  border: 'rgba(16,185,129,.3)' },
  recusado:   { label: 'Recusado',    bg: C.dBg,     color: C.danger,   border: 'rgba(239,68,68,.3)' },
};

// ─── UTILS ────────────────────────────────────────────────────────────────────
function fmtBytes(b) {
  if (!b) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(2)} MB`;
}
function fileIcon(nome) {
  const ext = (nome || '').split('.').pop().toLowerCase();
  if (['pdf'].includes(ext))                              return { icon: '📄', bg: '#FEE2E2', color: '#DC2626', previewable: true,  type: 'pdf'   };
  if (['doc','docx'].includes(ext))                       return { icon: '📝', bg: '#DBEAFE', color: '#2563EB', previewable: false, type: 'doc'   };
  if (['xls','xlsx','csv'].includes(ext))                 return { icon: '📊', bg: '#D1FAE5', color: '#059669', previewable: false, type: 'sheet' };
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return { icon: '🖼', bg: '#EDE9FE', color: '#7C3AED', previewable: true,  type: 'image' };
  if (['zip','rar','7z','tar','gz'].includes(ext))        return { icon: '📦', bg: '#FEF3C7', color: '#D97706', previewable: false, type: 'zip'   };
  if (['mp4','mov','avi','mkv'].includes(ext))            return { icon: '🎬', bg: '#FCE7F3', color: '#DB2777', previewable: false, type: 'video' };
  return { icon: '📎', bg: C.accentPale, color: C.accent, previewable: false, type: 'other' };
}
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) || line.split(',');
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] || '').trim().replace(/^"|"$/g, '')]));
  });
}
async function parseExcel(file) {
  try {
    const XLSX = await import('xlsx');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { defval: '' });
  } catch { return null; }
}
async function exportXLSX(rows, filename) {
  try {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, filename);
  } catch { exportCSV(rows, filename.replace('.xlsx', '.csv')); }
}
function exportCSV(rows, filename) {
  if (!rows.length) return;
  const hs = Object.keys(rows[0]);
  const body = rows.map(r => hs.map(h => `"${(r[h]||'').toString().replace(/"/g,'""')}"`).join(','));
  const csv = [hs.join(','), ...body].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff'+csv], { type: 'text/csv;charset=utf-8;' }));
  a.download = filename; a.click();
}

// ─── REDUCER ─────────────────────────────────────────────────────────────────
const INIT = { clientes: [], view: 'dashboard', sel: null, newOpen: false };
function R(s, { type: t, ...a }) {
  switch (t) {
    case 'SET_C':     return { ...s, clientes: a.clientes };
    case 'VIEW':      return { ...s, view: a.v, sel: null };
    case 'SEL':       return { ...s, sel: a.id };
    case 'CLOSE':     return { ...s, sel: null };
    case 'TNEW':      return { ...s, newOpen: !s.newOpen };
    case 'MOVE':      return { ...s, clientes: s.clientes.map(c => c.id !== a.cid ? c : { ...c, estagio_id: a.estagioId, activities: [...(c.activities||[]), { id: gid(), type:'stage', date:TODAY, user:a.user, text:`Movido para "${a.label}"` }] }) };
    case 'UPD':       return { ...s, clientes: s.clientes.map(c => c.id !== a.c.id ? c : { ...c, ...a.c }) };
    case 'ADD':       return { ...s, newOpen: false, clientes: [{ ...a.c, activities:[{ id:gid(), type:'stage', date:TODAY, user:a.user, text:'Cliente cadastrado' }] }, ...s.clientes] };
    case 'ADD_MANY':  return { ...s, clientes: [...a.clientes, ...s.clientes] };
    case 'RT_ADD':    return s.clientes.find(c => c.id === a.c.id) ? s : { ...s, clientes: [a.c, ...s.clientes] };
    case 'BULK_MOVE': {
      const ids = new Set(a.ids);
      return { ...s, clientes: s.clientes.map(c => !ids.has(c.id) ? c : { ...c, estagio_id: a.estagioId, activities: [...(c.activities||[]), { id:gid(), type:'stage', date:TODAY, user:a.user, text:`Movido para "${a.label}" (em lote)` }] }) };
    }
    case 'BULK_ASSIGN': {
      const ids = new Set(a.ids);
      return { ...s, clientes: s.clientes.map(c => !ids.has(c.id) ? c : { ...c, responsavel_interno_id: a.userId, responsavelInternoNome: a.userName, activities: [...(c.activities||[]), { id:gid(), type:'note', date:TODAY, user:a.user, text:`Responsável: ${a.userName} (em lote)` }] }) };
    }
    default: return s;
  }
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Inp({ label, value, onChange, placeholder, type='text', req }) {
  return (
    <div>
      {label && <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:5 }}>{label}{req && <span style={{ color:C.danger, marginLeft:3 }}>*</span>}</label>}
      <input type={type} value={value||''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width:'100%', padding:'10px 13px', borderRadius:9, border:`1.5px solid ${C.border}`, background:C.card, fontSize:13, color:C.text, outline:'none', transition:'border-color .15s, box-shadow .15s', boxSizing:'border-box' }}
        onFocus={e => { e.target.style.borderColor=C.accent; e.target.style.boxShadow=`0 0 0 3px ${C.accentDim}`; }}
        onBlur={e => { e.target.style.borderColor=C.border; e.target.style.boxShadow='none'; }}
      />
    </div>
  );
}
function Btn({ children, onClick, variant='primary', size='md', disabled, loading, full, style: sx={} }) {
  const base = { display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7, borderRadius:9, fontWeight:600, cursor: disabled?'not-allowed':'pointer', border:'none', fontFamily:'inherit', transition:'opacity .15s', opacity: disabled||loading ? 0.6 : 1, width: full?'100%':undefined, ...(size==='sm' ? { padding:'7px 14px', fontSize:12 } : { padding:'10px 20px', fontSize:13 }) };
  const vv = { primary:{ background:C.accent, color:'#fff' }, secondary:{ background:'transparent', color:C.text2, border:`1.5px solid ${C.border}` }, ghost:{ background:'transparent', color:C.muted }, danger:{ background:C.danger, color:'#fff' } };
  return <button onClick={onClick} disabled={disabled||loading} style={{ ...base, ...vv[variant], ...sx }} onMouseEnter={e=>{ if(!disabled) e.currentTarget.style.opacity='.82'; }} onMouseLeave={e=>{ if(!disabled) e.currentTarget.style.opacity='1'; }}>{loading?'…':children}</button>;
}
function StatusBadge({ status }) {
  const s = STATUS_CL[status] || STATUS_CL.pendente;
  return <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:s.bg, color:s.color, border:`1px solid ${s.border}`, whiteSpace:'nowrap' }}>{s.label}</span>;
}
function InactBadge({ dias, threshold }) {
  if (dias < threshold) return null;
  const color = dias >= threshold * 2 ? C.danger : C.warn;
  const bg    = dias >= threshold * 2 ? C.dBg    : C.wBg;
  return <span style={{ fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:99, background:bg, color, border:`1px solid ${color}30`, whiteSpace:'nowrap' }}>{dias}d sem contato</span>;
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
function ExternosSidebar({ view, setView, profile, onLogout, onAlterarSenha }) {
  const isInt = profile?.role === 'interno';
  const items = [
    { id:'dashboard', icon:'◈', label:'Dashboard'  },
    { id:'pipeline',  icon:'⊞', label:'Pipeline'   },
    { id:'clientes',  icon:'≡', label:'Clientes'   },
    ...(isInt ? [{ id:'cadastrar', icon:'＋', label:'Cadastrar' }] : []),
  ];
  return (
    <div style={{ width:C.sidebarW, background:C.card, borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', flexShrink:0, height:'100vh', position:'sticky', top:0 }}>
      <div style={{ padding:'22px 18px 16px', borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:C.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#fff', fontWeight:800, flexShrink:0 }}>E</div>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:C.text, letterSpacing:'-.01em' }}>Externos</div>
            <div style={{ fontSize:10, fontWeight:600, color:C.accent, textTransform:'uppercase', letterSpacing:'.08em' }}>{isInt ? 'Interno' : 'Externo'}</div>
          </div>
        </div>
      </div>
      <nav style={{ padding:'12px 8px', flex:1 }}>
        {items.map(it => (
          <button key={it.id} onClick={() => setView(it.id)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:9, width:'100%', textAlign:'left', cursor:'pointer', border:'none', fontFamily:'inherit', transition:'all .15s', fontSize:13.5, fontWeight:view===it.id?600:400, background:view===it.id?C.accentPale:'transparent', color:view===it.id?C.accent:C.text2, position:'relative', marginBottom:2 }}>
            {view===it.id && <div style={{ position:'absolute', left:0, top:'18%', bottom:'18%', width:3, background:C.accent, borderRadius:'0 3px 3px 0' }} />}
            <span style={{ fontSize:15, width:20, textAlign:'center' }}>{it.icon}</span>{it.label}
          </button>
        ))}
      </nav>
      <div style={{ padding:'13px 14px', borderTop:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:10 }}>
          <Avatar name={profile?.nome||'U'} size={30} color={C.accent} />
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:600, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{profile?.nome||'Usuário'}</div>
            <div style={{ fontSize:10, fontWeight:600, color:C.accent, textTransform:'uppercase', letterSpacing:'.06em' }}>{isInt?'Interno':'Externo'}</div>
          </div>
          <div style={{ marginLeft:'auto', width:7, height:7, borderRadius:'50%', background:C.success, flexShrink:0 }} />
        </div>
        <button onClick={onAlterarSenha} style={{ width:'100%', padding:'7px 0', borderRadius:7, background:C.surface, border:`1px solid ${C.border}`, color:C.muted, fontSize:11, fontWeight:500, cursor:'pointer', marginBottom:5, fontFamily:'inherit' }}>🔑 Alterar senha</button>
        <button onClick={onLogout} style={{ width:'100%', padding:'7px 0', borderRadius:7, background:C.dBg, border:'1px solid rgba(239,68,68,.2)', color:C.danger, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Sair da conta</button>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function ExternosDashboard({ clientes, estagios, profile, externos, alertDias }) {
  const isInt = profile?.role === 'interno';
  const total = clientes.length;
  const inativos = clientes.filter(c => sinceD(c.ultimoContato) >= alertDias);
  const porEstagio = useMemo(() => { const m={}; estagios.forEach(e=>{m[e.id]=0;}); clientes.forEach(c=>{if(m[c.estagio_id]!==undefined)m[c.estagio_id]++;}); return m; }, [clientes, estagios]);
  const recent = useMemo(() => clientes.flatMap(c=>(c.activities||[]).map(a=>({...a,clienteNome:c.nomeCliente}))).sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,7), [clientes]);

  return (
    <div style={{ padding:'28px 32px' }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:22, fontWeight:700, color:C.text, letterSpacing:'-.02em' }}>Dashboard</div>
        <div style={{ fontSize:13, color:C.muted, marginTop:3 }}>{isInt ? `${externos.length} externos · ` : ''}{total} clientes · {fmtD(TODAY)}</div>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${isInt?4:3},1fr)`, gap:14, marginBottom:20 }}>
        {[
          { label:'Total Clientes', value:total,            sub:'No seu escopo',        color:C.accent,  icon:'◈' },
          { label:'Sem atividade',  value:inativos.length,  sub:`+${alertDias} dias`,   color:C.danger,  icon:'❄' },
          ...(isInt ? [{ label:'Externos', value:externos.length, sub:'Cadastrados', color:'#7C3AED', icon:'⎇' }] : []),
          { label:'Estágios',       value:estagios.length,  sub:'Configurados',         color:C.success, icon:'⊞' },
        ].map(({ label, value, sub, color, icon }) => (
          <div key={label} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'18px 20px', position:'relative', overflow:'hidden', boxShadow:C.shadow }}>
            <div style={{ position:'absolute', top:-20, right:-20, width:80, height:80, borderRadius:'50%', background:color, opacity:.1, filter:'blur(20px)', pointerEvents:'none' }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
              <span style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.08em' }}>{label}</span>
              <div style={{ width:30, height:30, borderRadius:8, background:`${color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>{icon}</div>
            </div>
            <div style={{ fontSize:28, fontWeight:700, color:C.text, lineHeight:1 }}>{value}</div>
            <div style={{ fontSize:11, color:C.muted, marginTop:5 }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        {/* Pipeline por estágio */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'18px 20px', boxShadow:C.shadow }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:14 }}>Pipeline por estágio</div>
          {estagios.length === 0 ? <div style={{ fontSize:12, color:C.muted }}>Nenhum estágio configurado.</div>
            : estagios.map(e => {
              const count = porEstagio[e.id] || 0;
              const max = Math.max(...Object.values(porEstagio), 1);
              return (
                <div key={e.id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:9 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:e.color, flexShrink:0 }} />
                  <div style={{ flex:1, fontSize:12, color:C.text2 }}>{e.label}</div>
                  <div style={{ width:100, height:5, background:C.border, borderRadius:99, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:99, background:e.color, width:`${(count/max)*100}%`, transition:'width .5s' }} />
                  </div>
                  <div style={{ fontSize:12, fontWeight:700, color:C.text, width:22, textAlign:'right' }}>{count}</div>
                </div>
              );
            })}
        </div>
        {/* Atividade recente */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'18px 20px', boxShadow:C.shadow }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:14 }}>Atividade recente</div>
          {recent.length === 0 ? <div style={{ fontSize:12, color:C.muted }}>Nenhuma atividade ainda.</div>
            : recent.map((a,i) => (
              <div key={a.id||i} style={{ display:'flex', gap:10, padding:'7px 0', borderBottom: i<recent.length-1?`1px solid ${C.border}`:'none' }}>
                <div style={{ width:26, height:26, borderRadius:7, background:C.accentDim, color:C.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, flexShrink:0 }}>{a.type==='stage'?'⇄':'✎'}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.clienteNome}</div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>{a.text}</div>
                </div>
                <div style={{ fontSize:10, color:C.muted, flexShrink:0 }}>{fmtD(a.date)}</div>
              </div>
            ))}
        </div>
      </div>

      {/* Alertas de inatividade */}
      {inativos.length > 0 && (
        <div style={{ background:C.card, border:`1.5px solid rgba(245,158,11,.3)`, borderRadius:14, padding:'18px 20px', boxShadow:C.shadow }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:C.wBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>⚠</div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:C.warn }}>Clientes sem atividade</div>
              <div style={{ fontSize:11, color:C.muted }}>{inativos.length} cliente{inativos.length>1?'s':''} sem contato há mais de {alertDias} dias</div>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {inativos.slice(0, 6).map(c => {
              const dias = sinceD(c.ultimoContato);
              return (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:9, background:C.surface, border:`1px solid ${C.border}` }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:C.text }}>{c.nomeCliente}</div>
                    <div style={{ fontSize:11, color:C.muted }}>{c.externoNome || 'Sem externo'}</div>
                  </div>
                  <InactBadge dias={dias} threshold={alertDias} />
                  {c.responsavelInternoNome && <span style={{ fontSize:10, color:C.muted }}>{c.responsavelInternoNome}</span>}
                </div>
              );
            })}
            {inativos.length > 6 && <div style={{ fontSize:11, color:C.muted, textAlign:'center', padding:'6px 0' }}>+{inativos.length-6} mais</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── GERENCIAR ESTÁGIOS ───────────────────────────────────────────────────────
function GerenciarEstagiosModal({ estagios, onClose, onSave }) {
  const [lista, setLista] = useState(estagios.map(e=>({...e})));
  const [novoLabel, setNovoLabel] = useState('');
  const [novoCor, setNovoCor] = useState(STAGE_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const adicionar = () => { if(!novoLabel.trim()) return; setLista(l=>[...l,{id:`novo_${gid()}`,label:novoLabel.trim(),color:novoCor,ordem:l.length,isNew:true}]); setNovoLabel(''); };
  const salvar = async () => {
    setSaving(true);
    const removedIds = estagios.map(e=>e.id).filter(id=>!lista.find(e=>e.id===id));
    for(const id of removedIds) await supabase.from('externos_estagios').delete().eq('id',id);
    for(let i=0;i<lista.length;i++) {
      const e=lista[i];
      if(e.isNew) await supabase.from('externos_estagios').insert({label:e.label,color:e.color,ordem:i});
      else await supabase.from('externos_estagios').update({label:e.label,color:e.color,ordem:i}).eq('id',e.id);
    }
    setSaving(false); onSave(); onClose();
  };
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(26,31,58,0.45)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{ background:C.card, borderRadius:16, width:'100%', maxWidth:480, maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:C.shadowLg, border:`1px solid ${C.border}` }}>
        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div><div style={{ fontSize:17, fontWeight:700, color:C.text }}>Gerenciar Estágios</div><div style={{ fontSize:12, color:C.muted, marginTop:2 }}>Configure o pipeline dos externos</div></div>
          <button onClick={onClose} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, width:30, height:30, cursor:'pointer', color:C.muted, fontSize:16 }}>×</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'16px 24px' }}>
          {lista.map((e,i) => (
            <div key={e.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, border:`1px solid ${C.border}`, marginBottom:8, background:C.surface }}>
              <div style={{ position:'relative', flexShrink:0 }}>
                <div style={{ width:22, height:22, borderRadius:6, background:e.color, border:`2px solid ${C.border}` }} />
                <input type="color" value={e.color} onChange={ev=>setLista(l=>l.map((x,j)=>j===i?{...x,color:ev.target.value}:x))} style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%', height:'100%' }} />
              </div>
              <input value={e.label} onChange={ev=>setLista(l=>l.map((x,j)=>j===i?{...x,label:ev.target.value}:x))} style={{ flex:1, border:'none', background:'transparent', fontSize:13, fontWeight:600, color:C.text, outline:'none' }} />
              <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                {[['↑',()=>setLista(l=>{if(i===0)return l;const a=[...l];[a[i-1],a[i]]=[a[i],a[i-1]];return a;}),i===0],['↓',()=>setLista(l=>{if(i===l.length-1)return l;const a=[...l];[a[i],a[i+1]]=[a[i+1],a[i]];return a;}),i===lista.length-1]].map(([ch,fn,dis])=>(
                  <button key={ch} onClick={fn} disabled={dis} style={{ width:24, height:24, borderRadius:6, border:`1px solid ${C.border}`, background:'transparent', cursor:dis?'not-allowed':'pointer', color:C.muted, fontSize:11, opacity:dis?.4:1 }}>{ch}</button>
                ))}
                <button onClick={()=>setLista(l=>l.filter((_,j)=>j!==i))} style={{ width:24, height:24, borderRadius:6, border:'none', background:C.dBg, cursor:'pointer', color:C.danger, fontSize:11 }}>✕</button>
              </div>
            </div>
          ))}
          <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:12, padding:'10px 12px', borderRadius:10, border:`1.5px dashed ${C.border2}`, background:C.surface }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              <div style={{ width:22, height:22, borderRadius:6, background:novoCor, border:`2px solid ${C.border}` }} />
              <input type="color" value={novoCor} onChange={e=>setNovoCor(e.target.value)} style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%', height:'100%' }} />
            </div>
            <input value={novoLabel} onChange={e=>setNovoLabel(e.target.value)} onKeyDown={e=>e.key==='Enter'&&adicionar()} placeholder="Nome do novo estágio…" style={{ flex:1, border:'none', background:'transparent', fontSize:13, color:C.text, outline:'none' }} />
            <button onClick={adicionar} style={{ padding:'5px 12px', borderRadius:7, background:C.accentDim, border:'none', color:C.accent, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>+ Adicionar</button>
          </div>
        </div>
        <div style={{ padding:'14px 24px', borderTop:`1px solid ${C.border}`, display:'flex', gap:8, justifyContent:'flex-end' }}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={salvar} loading={saving}>Salvar</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── PIPELINE COLUNA (componente isolado para evitar hook ilegal no map) ────────
function PipelineColuna({ est, clientes: sl, dragId, setDragId, selected, toggleSel, dispatch, profile, alertDias }) {
  const [over, setOver] = useState(false);
  return (
    <div style={{ minWidth:210, width:220, flexShrink:0, background:over?`${est.color}0a`:C.surface, border:`1px solid ${over?est.color+'40':C.border}`, borderRadius:14, padding:'12px 10px', transition:'all .2s' }}
      onDragOver={e=>{e.preventDefault();setOver(true);}} onDragLeave={()=>setOver(false)}
      onDrop={()=>{setOver(false);if(dragId)dispatch({type:'MOVE',cid:dragId,estagioId:est.id,label:est.label,user:profile?.nome||'Usuário'});setDragId(null);}}>
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:11, padding:'0 3px' }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:est.color, flexShrink:0 }} />
        <span style={{ fontSize:12, fontWeight:600, color:C.text2, flex:1 }}>{est.label}</span>
        <span style={{ fontSize:11, fontWeight:700, background:`${est.color}15`, color:est.color, borderRadius:99, padding:'1px 7px' }}>{sl.length}</span>
      </div>
      <div style={{ minHeight:40 }}>
        {sl.map(c => {
          const dias = sinceD(c.ultimoContato);
          const isAlerta = dias >= alertDias;
          const isSel = selected.has(c.id);
          return (
            <div key={c.id} draggable onDragStart={()=>setDragId(c.id)}
              onClick={()=>{ if(selected.size>0){toggleSel(c.id,{stopPropagation:()=>{}});} else dispatch({type:'SEL',id:c.id}); }}
              style={{ background:isSel?C.accentPale:C.card, border:`1.5px solid ${isSel?C.accent:isAlerta?C.warn+'60':C.border}`, borderRadius:10, padding:'11px 12px', marginBottom:7, cursor:'pointer', transition:'all .15s', boxShadow:'0 1px 4px rgba(26,31,58,0.05)', position:'relative' }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=C.shadow;}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 1px 4px rgba(26,31,58,0.05)';}}>
              <div onClick={e=>toggleSel(c.id,e)} style={{ position:'absolute', top:8, right:8, width:16, height:16, borderRadius:4, border:`1.5px solid ${isSel?C.accent:C.border}`, background:isSel?C.accent:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'white', cursor:'pointer', transition:'all .15s', opacity: isSel||selected.size>0?1:0, zIndex:1 }} className="card-check">{isSel&&'✓'}</div>
              <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:3, paddingRight:20, lineHeight:1.3 }}>{c.nomeCliente}</div>
              {c.email && <div style={{ fontSize:11, color:C.muted, marginBottom:3 }}>{c.email}</div>}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:5, flexWrap:'wrap', gap:4 }}>
                {c.externoNome && <span style={{ fontSize:10, padding:'2px 7px', borderRadius:99, background:C.accentDim, color:C.accent, fontWeight:600 }}>{c.externoNome}</span>}
                {isAlerta && <InactBadge dias={dias} threshold={alertDias} />}
                {!isAlerta && <span style={{ fontSize:10, color:C.muted, marginLeft:'auto' }}>{fmtD(c.ultimoContato)}</span>}
              </div>
            </div>
          );
        })}
        {sl.length === 0 && <div style={{ textAlign:'center', padding:'18px 0', fontSize:11, color:C.muted }}>Solte aqui</div>}
      </div>
    </div>
  );
}

// ─── PIPELINE ─────────────────────────────────────────────────────────────────
function ExternosPipeline({ clientes, estagios, profile, dispatch, onReloadEstagios, alertDias }) {
  const [dragId, setDragId] = useState(null);
  const [search, setSearch] = useState('');
  const [showGerenciar, setShowGerenciar] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const isInt = profile?.role === 'interno';
  const filtered = search.trim() ? clientes.filter(c => [c.nomeCliente,c.email,c.cpf].some(v=>v?.toLowerCase().includes(search.toLowerCase()))) : clientes;
  const toggleSel = (id, e) => { e.stopPropagation(); setSelected(s=>{const ns=new Set(s); ns.has(id)?ns.delete(id):ns.add(id); return ns;}); };

  return (
    <div style={{ padding:'28px 32px', overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, gap:16 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700, color:C.text, letterSpacing:'-.02em' }}>Pipeline</div>
          <div style={{ fontSize:13, color:C.muted, marginTop:3 }}>{clientes.length} clientes{selected.size>0?` · ${selected.size} selecionado${selected.size>1?'s':''}`:''}</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {isInt && <Btn variant="secondary" size="sm" onClick={()=>setShowGerenciar(true)}>⚙ Estágios</Btn>}
          {selected.size > 0 && <Btn variant="secondary" size="sm" onClick={()=>setSelected(new Set())}>✕ Limpar seleção</Btn>}
          <div style={{ position:'relative', width:240 }}>
            <span style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:C.muted, fontSize:13, pointerEvents:'none' }}>⌕</span>
            <input style={{ width:'100%', padding:'8px 12px 8px 32px', borderRadius:9, border:`1.5px solid ${C.border}`, background:C.card, fontSize:12, color:C.text, outline:'none', boxSizing:'border-box' }} placeholder="Buscar cliente…" value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {estagios.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0' }}>
          <div style={{ fontSize:36, marginBottom:12 }}>⊞</div>
          <div style={{ fontSize:15, fontWeight:600, color:C.text, marginBottom:6 }}>Nenhum estágio configurado</div>
          <div style={{ fontSize:13, color:C.muted }}>{isInt ? 'Clique em "⚙ Estágios" para criar o pipeline.' : 'Aguardando configuração pelo administrador.'}</div>
        </div>
      ) : (
        <div style={{ display:'flex', gap:12, overflowX:'auto', paddingBottom: selected.size > 0 ? 80 : 16, alignItems:'flex-start' }}>
          {estagios.map(est => (
            <PipelineColuna
              key={est.id}
              est={est}
              clientes={filtered.filter(c => c.estagio_id === est.id)}
              dragId={dragId}
              setDragId={setDragId}
              selected={selected}
              toggleSel={toggleSel}
              dispatch={dispatch}
              profile={profile}
              alertDias={alertDias}
            />
          ))}
        </div>
      )}

      {/* Barra de bulk actions */}
      {selected.size > 0 && (
        <BulkActionBar ids={[...selected]} estagios={estagios} profile={profile} dispatch={dispatch} onClear={()=>setSelected(new Set())} />
      )}

      <style>{`.card-check{opacity:0}.card-check:hover{opacity:1!important}`}</style>
      {showGerenciar && <GerenciarEstagiosModal estagios={estagios} onClose={()=>setShowGerenciar(false)} onSave={onReloadEstagios} />}
    </div>
  );
}

// ─── BULK ACTION BAR ──────────────────────────────────────────────────────────
function BulkActionBar({ ids, estagios, profile, dispatch, onClear, internos = [] }) {
  const [estagioSel, setEstagioSel] = useState('');
  const [respSel, setRespSel] = useState('');
  const apply = () => {
    if (estagioSel) {
      const label = estagios.find(e=>e.id===estagioSel)?.label || '';
      dispatch({ type:'BULK_MOVE', ids, estagioId:estagioSel, label, user:profile?.nome||'Usuário' });
    }
    if (respSel) {
      const u = internos.find(u=>u.id===respSel);
      dispatch({ type:'BULK_ASSIGN', ids, userId:respSel, userName:u?.nome||'', user:profile?.nome||'Usuário' });
    }
    onClear();
  };
  return (
    <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:C.text, color:'#fff', borderRadius:14, padding:'12px 20px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 8px 32px rgba(26,31,58,0.3)', zIndex:150, whiteSpace:'nowrap' }}>
      <span style={{ fontSize:13, fontWeight:600 }}>{ids.length} selecionado{ids.length>1?'s':''}</span>
      <div style={{ width:1, height:20, background:'rgba(255,255,255,.2)' }} />
      <select value={estagioSel} onChange={e=>setEstagioSel(e.target.value)} style={{ padding:'6px 10px', borderRadius:7, border:'1px solid rgba(255,255,255,.2)', background:'rgba(255,255,255,.12)', color:'#fff', fontSize:12, outline:'none', cursor:'pointer' }}>
        <option value="">Mover para estágio…</option>
        {estagios.map(e=><option key={e.id} value={e.id}>{e.label}</option>)}
      </select>
      <button onClick={apply} disabled={!estagioSel&&!respSel} style={{ padding:'7px 16px', borderRadius:8, background:C.accent, border:'none', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', opacity:!estagioSel&&!respSel?.5:1 }}>Aplicar</button>
      <button onClick={onClear} style={{ padding:'7px 12px', borderRadius:8, background:'rgba(255,255,255,.1)', border:'none', color:'rgba(255,255,255,.7)', fontSize:12, cursor:'pointer' }}>✕</button>
    </div>
  );
}

// ─── CLIENTES ─────────────────────────────────────────────────────────────────
function ExternosClientes({ clientes, estagios, profile, dispatch, externos, onShowImportar, onShowExportar, alertDias }) {
  const [search, setSearch] = useState('');
  const [filtroEstagio, setFiltroEstagio] = useState('');
  const [filtroExterno, setFiltroExterno] = useState('');
  const [page, setPage] = useState(1);
  const PER = 50;
  const isInt = profile?.role === 'interno';
  const estagioMap = Object.fromEntries(estagios.map(e=>[e.id,e]));
  const filtered = useMemo(() => clientes.filter(c => {
    if(filtroEstagio && c.estagio_id!==filtroEstagio) return false;
    if(filtroExterno && c.externo_id!==filtroExterno) return false;
    if(search){const s=search.toLowerCase();return [c.nomeCliente,c.email,c.cpf].some(v=>v?.toLowerCase().includes(s));}
    return true;
  }), [clientes,search,filtroEstagio,filtroExterno]);
  const totalPages = Math.max(1, Math.ceil(filtered.length/PER));
  const paged = filtered.slice((page-1)*PER, page*PER);

  return (
    <div style={{ padding:'28px 32px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700, color:C.text, letterSpacing:'-.02em' }}>Clientes</div>
          <div style={{ fontSize:13, color:C.muted, marginTop:3 }}>{filtered.length} de {clientes.length} registros{totalPages>1?` · Pág ${page}/${totalPages}`:''}</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {isInt && <Btn variant="secondary" size="sm" onClick={onShowImportar}>⬆ Importar</Btn>}
          <Btn variant="secondary" size="sm" onClick={()=>onShowExportar(filtered, estagioMap)}>⬇ Exportar</Btn>
          <Btn onClick={()=>dispatch({type:'TNEW'})}>+ Novo Cliente</Btn>
        </div>
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <span style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:C.muted, fontSize:13, pointerEvents:'none' }}>⌕</span>
          <input style={{ width:'100%', padding:'9px 12px 9px 32px', borderRadius:9, border:`1.5px solid ${C.border}`, background:C.card, fontSize:13, color:C.text, outline:'none', boxSizing:'border-box' }} placeholder="Buscar nome, e-mail, CPF…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} />
        </div>
        <select style={{ padding:'9px 12px', borderRadius:9, border:`1.5px solid ${C.border}`, background:C.card, fontSize:13, color:C.text, outline:'none' }} value={filtroEstagio} onChange={e=>{setFiltroEstagio(e.target.value);setPage(1);}}>
          <option value="">Todos os estágios</option>
          {estagios.map(e=><option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
        {isInt && <select style={{ padding:'9px 12px', borderRadius:9, border:`1.5px solid ${C.border}`, background:C.card, fontSize:13, color:C.text, outline:'none' }} value={filtroExterno} onChange={e=>{setFiltroExterno(e.target.value);setPage(1);}}>
          <option value="">Todos externos</option>
          {externos.map(ex=><option key={ex.id} value={ex.id}>{ex.nome}</option>)}
        </select>}
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden', boxShadow:C.shadow }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:C.surface, borderBottom:`1px solid ${C.border}` }}>
                {['Nome / E-mail','Estágio',...(isInt?['Externo','Responsável']:[]),'Atividade',''].map(h=>(
                  <th key={h} style={{ padding:'11px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.07em', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map(c => {
                const est = estagioMap[c.estagio_id];
                const dias = sinceD(c.ultimoContato);
                return (
                  <tr key={c.id} onClick={()=>dispatch({type:'SEL',id:c.id})} style={{ borderBottom:`1px solid ${C.border}`, cursor:'pointer', transition:'background .1s' }} onMouseEnter={e=>e.currentTarget.style.background=C.accentPale} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ fontWeight:600, color:C.text }}>{c.nomeCliente}</div>
                      <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>{c.email||c.cpf||'—'}</div>
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      {est?<span style={{ fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:99, background:`${est.color}15`, color:est.color }}>{est.label}</span>:<span style={{ color:C.muted,fontSize:12 }}>—</span>}
                    </td>
                    {isInt&&<><td style={{ padding:'12px 14px', fontSize:12, color:C.text2 }}>{c.externoNome||'—'}</td><td style={{ padding:'12px 14px', fontSize:12, color:c.responsavelInternoNome?C.success:C.muted }}>{c.responsavelInternoNome||'Não atribuído'}</td></>}
                    <td style={{ padding:'12px 14px' }}><InactBadge dias={dias} threshold={alertDias} />{dias < alertDias && <span style={{ fontSize:11, color:C.muted }}>{fmtD(c.ultimoContato)}</span>}</td>
                    <td style={{ padding:'12px 14px', color:C.muted, fontSize:16 }}>›</td>
                  </tr>
                );
              })}
              {paged.length===0&&<tr><td colSpan={7} style={{ padding:'40px 0', textAlign:'center', color:C.muted, fontSize:13 }}>Nenhum cliente encontrado</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {totalPages>1&&<div style={{ display:'flex', gap:6, justifyContent:'center', marginTop:16 }}>
        <Btn variant="secondary" size="sm" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>‹ Anterior</Btn>
        {Array.from({length:Math.min(totalPages,7)},(_,i)=>i+1).map(p=><button key={p} onClick={()=>setPage(p)} style={{ width:32, height:32, borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:p===page?700:400, background:p===page?C.accent:'transparent', color:p===page?'#fff':C.text2 }}>{p}</button>)}
        <Btn variant="secondary" size="sm" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>Próxima ›</Btn>
      </div>}
    </div>
  );
}

// ─── CADASTRAR ────────────────────────────────────────────────────────────────
function ExternosCadastrar({ profile, session, onSuccess }) {
  const [externos, setExternos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nome:'', email:'', senha:'', telefone:'' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const load = useCallback(async()=>{setLoading(true);const{data}=await supabase.from('profiles').select('id,nome,email').eq('modulo','externos').eq('role','externo').order('nome');setExternos(data||[]);setLoading(false);},[]);
  useEffect(()=>{load();},[load]);
  const save = async()=>{
    if(!form.nome.trim()||!form.email.trim()||!form.senha||form.senha.length<6){setMsg({t:'error',text:'Nome, e-mail e senha (mín. 6 caracteres) são obrigatórios.'});return;}
    setSaving(true);setMsg(null);
    try{
      const{data:{session:s}}=await supabase.auth.getSession();
      const res=await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-externo-user`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${s?.access_token}`},body:JSON.stringify({email:form.email.trim().toLowerCase(),password:form.senha,nome:form.nome.trim(),telefone:form.telefone})});
      const result=await res.json();
      if(!res.ok||result.error){setMsg({t:'error',text:result.error||'Erro ao criar usuário.'});}
      else{setMsg({t:'success',text:`✓ ${form.nome} cadastrado!`});setShowModal(false);setForm({nome:'',email:'',senha:'',telefone:''});load();if(onSuccess)onSuccess();}
    }catch{setMsg({t:'error',text:'Erro de conexão.'});}
    setSaving(false);
  };
  const remove=async u=>{await supabase.from('allowed_users').delete().eq('email',u.email);await supabase.from('profiles').delete().eq('id',u.id);setConfirmDel(null);setMsg({t:'success',text:`${u.nome} removido.`});load();};
  return (
    <div style={{ padding:'28px 32px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:22 }}>
        <div><div style={{ fontSize:22, fontWeight:700, color:C.text, letterSpacing:'-.02em' }}>Cadastrar Externos</div><div style={{ fontSize:13, color:C.muted, marginTop:3 }}>Gerencie os usuários externos do portal</div></div>
        <Btn onClick={()=>{setForm({nome:'',email:'',senha:'',telefone:''});setMsg(null);setShowModal(true);}}>+ Novo Externo</Btn>
      </div>
      {msg&&<div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:9, marginBottom:14, background:msg.t==='success'?C.sBg:C.dBg, border:`1px solid ${msg.t==='success'?'rgba(16,185,129,.2)':'rgba(239,68,68,.2)'}`, fontSize:13, color:msg.t==='success'?C.success:C.danger }}>{msg.text}<button onClick={()=>setMsg(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'inherit', fontSize:16 }}>×</button></div>}
      {loading?<div style={{ textAlign:'center', padding:'40px 0', color:C.muted }}>Carregando…</div>:(
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden', boxShadow:C.shadow }}>
          {externos.length===0?<div style={{ padding:'40px 0', textAlign:'center', color:C.muted, fontSize:13 }}>Nenhum externo cadastrado ainda.</div>
            :externos.map((u,i,arr)=>(
              <div key={u.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', borderBottom:i<arr.length-1?`1px solid ${C.border}`:'none' }}>
                <Avatar name={u.nome} size={36} color={C.accent} />
                <div style={{ flex:1, minWidth:0 }}><div style={{ fontSize:13, fontWeight:600, color:C.text }}>{u.nome}</div><div style={{ fontSize:11, color:C.muted, marginTop:1 }}>{u.email}</div></div>
                <span style={{ fontSize:10, fontWeight:600, padding:'3px 9px', borderRadius:99, background:'rgba(124,58,237,.1)', color:'#7C3AED' }}>Externo</span>
                <button onClick={()=>setConfirmDel(u)} style={{ padding:'5px 10px', borderRadius:7, background:C.dBg, border:'none', color:C.danger, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Remover</button>
              </div>
            ))}
        </div>
      )}
      {showModal&&(
        <div style={{ position:'fixed', inset:0, background:'rgba(26,31,58,0.45)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }} onClick={e=>{if(e.target===e.currentTarget){setShowModal(false);setMsg(null);}}}>
          <div style={{ background:C.card, borderRadius:16, width:'100%', maxWidth:420, padding:'28px', boxShadow:C.shadowLg, border:`1px solid ${C.border}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div style={{ fontSize:18, fontWeight:700, color:C.text }}>Novo Externo</div>
              <button onClick={()=>{setShowModal(false);setMsg(null);}} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, width:28, height:28, cursor:'pointer', color:C.muted, fontSize:16 }}>×</button>
            </div>
            {msg?.t==='error'&&<div style={{ padding:'9px 12px', borderRadius:8, marginBottom:14, background:C.dBg, fontSize:12, color:C.danger }}>{msg.text}</div>}
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:20 }}>
              <Inp label="Nome completo" value={form.nome} onChange={v=>setForm(f=>({...f,nome:v}))} placeholder="Nome" req />
              <Inp label="E-mail" type="email" value={form.email} onChange={v=>setForm(f=>({...f,email:v}))} placeholder="email@exemplo.com" req />
              <Inp label="Senha inicial" type="password" value={form.senha} onChange={v=>setForm(f=>({...f,senha:v}))} placeholder="Mínimo 6 caracteres" req />
              <Inp label="Telefone" value={form.telefone} onChange={v=>setForm(f=>({...f,telefone:v}))} placeholder="(00) 00000-0000" />
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}><Btn variant="secondary" onClick={()=>{setShowModal(false);setMsg(null);}}>Cancelar</Btn><Btn onClick={save} loading={saving}>Cadastrar</Btn></div>
          </div>
        </div>
      )}
      {confirmDel&&(
        <div style={{ position:'fixed', inset:0, background:'rgba(26,31,58,0.45)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }} onClick={e=>{if(e.target===e.currentTarget)setConfirmDel(null);}}>
          <div style={{ background:C.card, borderRadius:16, padding:'28px', maxWidth:360, width:'100%', textAlign:'center', boxShadow:C.shadowLg }}>
            <div style={{ fontSize:36, marginBottom:12 }}>⚠️</div>
            <div style={{ fontSize:17, fontWeight:700, color:C.text, marginBottom:8 }}>Remover {confirmDel.nome}?</div>
            <div style={{ fontSize:13, color:C.muted, lineHeight:1.6, marginBottom:20 }}>O acesso será revogado imediatamente.</div>
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}><Btn variant="secondary" onClick={()=>setConfirmDel(null)}>Cancelar</Btn><Btn variant="danger" onClick={()=>remove(confirmDel)}>Remover</Btn></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PREVIEW MODAL ────────────────────────────────────────────────────────────
function PreviewModal({ url, nome, tipo, onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(10,14,36,0.85)', backdropFilter:'blur(8px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:400 }} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', width:'100%', maxWidth:900, marginBottom:8 }}>
        <span style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,.8)', flex:1 }}>{nome}</span>
        <a href={url} target="_blank" rel="noreferrer" style={{ padding:'6px 14px', borderRadius:8, background:'rgba(255,255,255,.12)', color:'#fff', fontSize:12, fontWeight:600, textDecoration:'none', border:'1px solid rgba(255,255,255,.2)' }}>↓ Baixar</a>
        <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, background:'rgba(255,255,255,.12)', border:'none', cursor:'pointer', color:'rgba(255,255,255,.7)', fontSize:18 }}>×</button>
      </div>
      <div style={{ background:'#fff', borderRadius:12, overflow:'hidden', maxWidth:900, width:'calc(100% - 40px)', maxHeight:'calc(100vh - 120px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        {tipo === 'pdf'
          ? <iframe src={url} title={nome} style={{ width:'100%', height:'calc(100vh - 160px)', border:'none' }} />
          : <img src={url} alt={nome} style={{ maxWidth:'100%', maxHeight:'calc(100vh - 160px)', objectFit:'contain' }} />
        }
      </div>
    </div>
  );
}

// ─── DOCS TAB ─────────────────────────────────────────────────────────────────
function DocsTab({ cliente, profile }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [err, setErr] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [preview, setPreview] = useState(null);
  const inputRef = useRef(null);

  const loadDocs = useCallback(async()=>{
    setLoading(true);
    const{data,error}=await supabase.from('externos_documentos').select('*').eq('cliente_id',cliente.id).order('created_at',{ascending:false});
    if(!error) setDocs(data||[]);
    setLoading(false);
  },[cliente.id]);
  useEffect(()=>{loadDocs();},[loadDocs]);

  const upload = async(files)=>{
    if(!files||files.length===0) return;
    setUploading(true); setErr(null);
    for(const file of Array.from(files)){
      if(file.size>20971520){setErr(`${file.name} excede 20MB.`);continue;}
      const path=`clientes/${cliente.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
      const{error:sErr}=await supabase.storage.from(BUCKET).upload(path,file,{upsert:false});
      if(sErr){setErr(`Erro: ${sErr.message}`);continue;}
      const{error:dErr}=await supabase.from('externos_documentos').insert({cliente_id:cliente.id,externo_id:cliente.externo_id,nome:file.name,path,size:file.size,tipo:file.type,enviado_por:profile?.nome||'Usuário',enviado_por_id:profile?.id||null});
      if(dErr){await supabase.storage.from(BUCKET).remove([path]);setErr(`Erro ao registrar ${file.name}.`);}
    }
    setUploading(false); loadDocs();
  };

  const download = async(doc)=>{
    const{data,error}=await supabase.storage.from(BUCKET).createSignedUrl(doc.path,3600);
    if(error||!data?.signedUrl){setErr('Erro ao gerar link.');return;}
    window.open(data.signedUrl,'_blank');
  };

  const openPreview = async(doc)=>{
    const{data,error}=await supabase.storage.from(BUCKET).createSignedUrl(doc.path,3600);
    if(error||!data?.signedUrl){setErr('Erro ao gerar preview.');return;}
    const{type}=fileIcon(doc.nome);
    setPreview({url:data.signedUrl,nome:doc.nome,tipo:type});
  };

  const remove = async(doc)=>{
    await supabase.storage.from(BUCKET).remove([doc.path]);
    await supabase.from('externos_documentos').delete().eq('id',doc.id);
    setConfirmDel(null); loadDocs();
  };

  return (
    <div>
      <div onClick={()=>inputRef.current?.click()} onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);upload(e.dataTransfer.files);}}
        style={{ border:`2px dashed ${dragOver?C.accent:C.border2}`, borderRadius:12, padding:'22px 16px', textAlign:'center', cursor:'pointer', background:dragOver?C.accentPale:C.surface, transition:'all .2s', marginBottom:14, userSelect:'none' }}>
        <input ref={inputRef} type="file" multiple style={{ display:'none' }} onChange={e=>upload(e.target.files)} />
        <div style={{ fontSize:22, marginBottom:6 }}>{uploading?'⏳':'📂'}</div>
        <div style={{ fontSize:13, fontWeight:600, color:dragOver?C.accent:C.text2 }}>{uploading?'Enviando…':'Arraste arquivos ou clique para selecionar'}</div>
        <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>PDF, Word, Excel, imagens, ZIP — até 20MB cada</div>
      </div>
      {err&&<div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', borderRadius:8, marginBottom:12, background:C.dBg, fontSize:12, color:C.danger }}>{err}<button onClick={()=>setErr(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'inherit' }}>×</button></div>}
      {loading?<div style={{ textAlign:'center', padding:'24px 0', color:C.muted, fontSize:13 }}>Carregando…</div>
        :docs.length===0?<div style={{ textAlign:'center', padding:'30px 0' }}><div style={{ fontSize:28, marginBottom:8 }}>🗂</div><div style={{ fontSize:13, color:C.muted }}>Nenhum documento ainda.</div></div>
        :<div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {docs.map(doc=>{
            const{icon,bg,color,previewable,type}=fileIcon(doc.nome);
            const canDel = profile?.role==='interno'||doc.enviado_por_id===profile?.id;
            return(
              <div key={doc.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 12px', borderRadius:10, border:`1px solid ${C.border}`, background:C.card, transition:'box-shadow .15s' }} onMouseEnter={e=>e.currentTarget.style.boxShadow=C.shadow} onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
                <div style={{ width:36, height:36, borderRadius:9, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0 }}>{icon}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={doc.nome}>{doc.nome}</div>
                  <div style={{ fontSize:10, color:C.muted, marginTop:2, display:'flex', gap:6 }}><span style={{ fontWeight:600 }}>{fmtBytes(doc.size)}</span><span>·</span><span>{doc.enviado_por}</span><span>·</span><span>{fmtD(doc.created_at?.slice(0,10))}</span></div>
                </div>
                <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                  {previewable&&<button onClick={()=>openPreview(doc)} title="Visualizar" style={{ width:28, height:28, borderRadius:7, border:`1px solid ${C.border}`, background:'transparent', cursor:'pointer', color:'#7C3AED', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>👁</button>}
                  <button onClick={()=>download(doc)} title="Baixar" style={{ width:28, height:28, borderRadius:7, border:`1px solid ${C.border}`, background:'transparent', cursor:'pointer', color:C.accent, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>↓</button>
                  {canDel&&<button onClick={()=>setConfirmDel(doc)} title="Excluir" style={{ width:28, height:28, borderRadius:7, border:'none', background:C.dBg, cursor:'pointer', color:C.danger, fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>}
                </div>
              </div>
            );
          })}
        </div>}
      {confirmDel&&(
        <div style={{ position:'fixed', inset:0, background:'rgba(26,31,58,0.5)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }} onClick={e=>{if(e.target===e.currentTarget)setConfirmDel(null);}}>
          <div style={{ background:C.card, borderRadius:16, padding:'28px', maxWidth:340, width:'100%', textAlign:'center', boxShadow:C.shadowLg, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:32, marginBottom:10 }}>🗑</div>
            <div style={{ fontSize:16, fontWeight:700, color:C.text, marginBottom:6 }}>Excluir documento?</div>
            <div style={{ fontSize:12, color:C.muted, fontWeight:500, marginBottom:4 }}>{confirmDel.nome}</div>
            <div style={{ fontSize:12, color:C.muted, marginBottom:20 }}>Esta ação não pode ser desfeita.</div>
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}><Btn variant="secondary" onClick={()=>setConfirmDel(null)}>Cancelar</Btn><Btn variant="danger" onClick={()=>remove(confirmDel)}>Excluir</Btn></div>
          </div>
        </div>
      )}
      {preview&&<PreviewModal {...preview} onClose={()=>setPreview(null)} />}
    </div>
  );
}

// ─── CHECKLIST TAB ────────────────────────────────────────────────────────────
const STATUS_FLOW_INT = { pendente:['enviado','em_analise'], enviado:['em_analise','aprovado','recusado'], em_analise:['aprovado','recusado'], aprovado:['recusado'], recusado:['enviado','aprovado'] };
const STATUS_FLOW_EXT = { pendente:['enviado'], enviado:[], em_analise:[], aprovado:[], recusado:['enviado'] };

function ChecklistTab({ cliente, profile }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novoLabel, setNovoLabel] = useState('');
  const [notaEdit, setNotaEdit] = useState({});  // { [id]: string }
  const [saving, setSaving] = useState(null);
  const isInt = profile?.role === 'interno';

  const load = useCallback(async()=>{
    setLoading(true);
    const{data}=await supabase.from('externos_checklist').select('*').eq('cliente_id',cliente.id).order('created_at',{ascending:true});
    setItems(data||[]);
    setLoading(false);
  },[cliente.id]);
  useEffect(()=>{load();},[load]);

  const addItem = async()=>{
    if(!novoLabel.trim()) return;
    const{data}=await supabase.from('externos_checklist').insert({cliente_id:cliente.id,label:novoLabel.trim(),status:'pendente',criado_por:profile?.nome||'Usuário'}).select().single();
    if(data){setItems(i=>[...i,data]);setNovoLabel('');}
  };

  const changeStatus = async(item, newStatus)=>{
    setSaving(item.id);
    await supabase.from('externos_checklist').update({status:newStatus,atualizado_por:profile?.nome||'Usuário'}).eq('id',item.id);
    setItems(it=>it.map(x=>x.id===item.id?{...x,status:newStatus}:x));
    setSaving(null);
  };

  const saveNota = async(item)=>{
    const nota = notaEdit[item.id] ?? item.nota ?? '';
    setSaving(item.id);
    await supabase.from('externos_checklist').update({nota}).eq('id',item.id);
    setItems(it=>it.map(x=>x.id===item.id?{...x,nota}:x));
    setNotaEdit(n=>{ const nn={...n}; delete nn[item.id]; return nn; });
    setSaving(null);
  };

  const removeItem = async(id)=>{
    await supabase.from('externos_checklist').delete().eq('id',id);
    setItems(it=>it.filter(x=>x.id!==id));
  };

  const summary = useMemo(()=>({ total:items.length, aprovados:items.filter(i=>i.status==='aprovado').length, pendentes:items.filter(i=>i.status==='pendente').length, recusados:items.filter(i=>i.status==='recusado').length }),[items]);

  return (
    <div>
      {/* Resumo */}
      {items.length > 0 && (
        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          {[
            { label:`${summary.aprovados}/${summary.total} aprovados`, color:C.success, bg:C.sBg },
            ...(summary.pendentes>0?[{ label:`${summary.pendentes} pendente${summary.pendentes>1?'s':''}`, color:C.muted, bg:C.surface }]:[]),
            ...(summary.recusados>0?[{ label:`${summary.recusados} recusado${summary.recusados>1?'s':''}`, color:C.danger, bg:C.dBg }]:[]),
          ].map(x=>(
            <span key={x.label} style={{ fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:99, background:x.bg, color:x.color }}>{x.label}</span>
          ))}
          {/* barra de progresso */}
          <div style={{ flex:1, height:6, background:C.border, borderRadius:99, alignSelf:'center', overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:99, background:C.success, width:`${summary.total>0?(summary.aprovados/summary.total)*100:0}%`, transition:'width .4s' }} />
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? <div style={{ textAlign:'center', padding:'24px 0', color:C.muted, fontSize:13 }}>Carregando…</div>
        : items.length === 0 ? (
          <div style={{ textAlign:'center', padding:'20px 0', marginBottom:14 }}>
            <div style={{ fontSize:24, marginBottom:6 }}>📋</div>
            <div style={{ fontSize:12, color:C.muted }}>Nenhum item na checklist.</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
            {items.map(item=>{
              const st = STATUS_CL[item.status]||STATUS_CL.pendente;
              const flow = (isInt?STATUS_FLOW_INT:STATUS_FLOW_EXT)[item.status]||[];
              const isEditingNota = notaEdit[item.id] !== undefined;
              return (
                <div key={item.id} style={{ borderRadius:11, border:`1px solid ${st.border}`, background:st.bg, overflow:'hidden', transition:'all .2s' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 13px' }}>
                    {/* ícone de status */}
                    <div style={{ width:26, height:26, borderRadius:7, background:`${st.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:st.color, flexShrink:0 }}>
                      {{ pendente:'○', enviado:'→', em_analise:'⏳', aprovado:'✓', recusado:'✗' }[item.status]}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:C.text, lineHeight:1.3 }}>{item.label}</div>
                      {item.nota && !isEditingNota && <div style={{ fontSize:11, color:C.text2, marginTop:2, fontStyle:'italic' }}>{item.nota}</div>}
                      {isEditingNota && (
                        <div style={{ marginTop:6, display:'flex', gap:6 }}>
                          <input value={notaEdit[item.id]} onChange={e=>setNotaEdit(n=>({...n,[item.id]:e.target.value}))} placeholder="Adicionar observação…" style={{ flex:1, padding:'5px 9px', borderRadius:6, border:`1px solid ${C.border}`, fontSize:11, outline:'none' }} />
                          <button onClick={()=>saveNota(item)} disabled={saving===item.id} style={{ padding:'5px 10px', borderRadius:6, background:C.accent, border:'none', color:'#fff', fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>{saving===item.id?'…':'OK'}</button>
                          <button onClick={()=>setNotaEdit(n=>{const nn={...n};delete nn[item.id];return nn;})} style={{ padding:'5px 8px', borderRadius:6, background:C.surface, border:`1px solid ${C.border}`, color:C.muted, fontSize:11, cursor:'pointer' }}>✕</button>
                        </div>
                      )}
                    </div>
                    <StatusBadge status={item.status} />
                    {/* ações */}
                    <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                      {!isEditingNota && <button onClick={()=>setNotaEdit(n=>({...n,[item.id]:item.nota||''}))} title="Nota" style={{ width:24, height:24, borderRadius:6, border:`1px solid ${C.border}`, background:'transparent', cursor:'pointer', color:C.muted, fontSize:11 }}>✎</button>}
                      {isInt && <button onClick={()=>removeItem(item.id)} style={{ width:24, height:24, borderRadius:6, border:'none', background:C.dBg, cursor:'pointer', color:C.danger, fontSize:11 }}>✕</button>}
                    </div>
                  </div>
                  {/* Botões de transição de status */}
                  {flow.length > 0 && (
                    <div style={{ display:'flex', gap:6, padding:'8px 13px', borderTop:`1px solid ${st.border}`, background:'rgba(255,255,255,0.5)' }}>
                      <span style={{ fontSize:10, color:C.muted, alignSelf:'center', marginRight:4 }}>Marcar como:</span>
                      {flow.map(ns=>{
                        const ns_s=STATUS_CL[ns];
                        return(
                          <button key={ns} onClick={()=>changeStatus(item,ns)} disabled={saving===item.id} style={{ padding:'4px 11px', borderRadius:99, border:`1px solid ${ns_s.border}`, background:ns_s.bg, color:ns_s.color, fontSize:10, fontWeight:600, cursor:'pointer', fontFamily:'inherit', opacity:saving===item.id?.6:1 }}>{ns_s.label}</button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      {/* Adicionar novo item (só interno) */}
      {isInt && (
        <div style={{ display:'flex', gap:8, padding:'10px 12px', borderRadius:10, border:`1.5px dashed ${C.border2}`, background:C.surface }}>
          <input value={novoLabel} onChange={e=>setNovoLabel(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addItem()} placeholder="Novo documento na checklist…" style={{ flex:1, border:'none', background:'transparent', fontSize:13, color:C.text, outline:'none' }} />
          <button onClick={addItem} style={{ padding:'6px 14px', borderRadius:7, background:C.accentDim, border:'none', color:C.accent, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>+ Adicionar</button>
        </div>
      )}
    </div>
  );
}

// ─── DETAIL PANEL ─────────────────────────────────────────────────────────────
function ExternosDetail({ cliente, estagios, profile, externos, internos, dispatch, onClose }) {
  const [tab, setTab] = useState('info');
  const [note, setNote] = useState('');
  const [estagioId, setEstagioId] = useState(cliente.estagio_id||'');
  const [responsavelId, setResponsavelId] = useState(cliente.responsavel_interno_id||'');
  const [nome, setNome] = useState(cliente.nomeCliente||'');
  const [email, setEmail] = useState(cliente.email||'');
  const [telefone, setTelefone] = useState(cliente.telefone||'');
  const [cpf, setCpf] = useState(cliente.cpf||'');
  const [obs, setObs] = useState(cliente.observacoes||'');
  const isInt = profile?.role==='interno';
  const estAtual = estagios.find(e=>e.id===cliente.estagio_id);

  const salvar = ()=>{
    const respNome = internos.find(u=>u.id===responsavelId)?.nome||null;
    if(estagioId&&estagioId!==cliente.estagio_id){const label=estagios.find(e=>e.id===estagioId)?.label||'';dispatch({type:'MOVE',cid:cliente.id,estagioId,label,user:profile?.nome||'Usuário'});}
    dispatch({type:'UPD',c:{...cliente,nomeCliente:nome,email,telefone,cpf,observacoes:obs,estagio_id:estagioId||null,responsavel_interno_id:responsavelId||null,responsavelInternoNome:respNome}});
    onClose();
  };

  const addNote = ()=>{
    if(!note.trim()) return;
    const acts=[...(cliente.activities||[]),{id:gid(),type:'note',date:TODAY,user:profile?.nome||'Usuário',text:note.trim()}];
    dispatch({type:'UPD',c:{...cliente,activities:acts,ultimoContato:TODAY}});
    setNote('');
  };

  return (
    <div style={{ position:'fixed', top:0, right:0, bottom:0, width:480, background:C.card, borderLeft:`1px solid ${C.border}`, display:'flex', flexDirection:'column', zIndex:100, boxShadow:`-4px 0 32px rgba(67,97,238,0.1)`, animation:'slideIn .3s cubic-bezier(.4,0,.2,1)' }}>
      <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
      {/* Header */}
      <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{ flex:1, minWidth:0, paddingRight:10 }}>
            <div style={{ fontSize:16, fontWeight:700, color:C.text }}>{cliente.nomeCliente}</div>
            <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>{cliente.email||cliente.telefone||'—'}</div>
            <div style={{ marginTop:7, display:'flex', gap:5, flexWrap:'wrap' }}>
              {estAtual&&<span style={{ fontSize:10, padding:'2px 8px', borderRadius:99, background:`${estAtual.color}15`, color:estAtual.color, fontWeight:600 }}>{estAtual.label}</span>}
              {cliente.externoNome&&<span style={{ fontSize:10, padding:'2px 8px', borderRadius:99, background:C.accentDim, color:C.accent, fontWeight:600 }}>→ {cliente.externoNome}</span>}
              {cliente.responsavelInternoNome&&<span style={{ fontSize:10, padding:'2px 8px', borderRadius:99, background:C.sBg, color:C.success, fontWeight:600 }}>✓ {cliente.responsavelInternoNome}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, width:28, height:28, cursor:'pointer', color:C.muted, fontSize:16, flexShrink:0 }}>×</button>
        </div>
      </div>
      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, background:C.card, flexShrink:0 }}>
        {[['info','Informações'],['checklist','Checklist'],['docs','Documentos'],['activity','Atividades']].map(([id,lb])=>(
          <button key={id} onClick={()=>setTab(id)} style={{ flex:1, padding:'10px 0', background:'none', border:'none', cursor:'pointer', fontSize:11.5, fontWeight:tab===id?600:400, color:tab===id?C.accent:C.muted, borderBottom:`2px solid ${tab===id?C.accent:'transparent'}`, transition:'all .15s', fontFamily:'inherit' }}>{lb}</button>
        ))}
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>
        {tab==='info'&&(
          <div>
            <div style={{ display:'flex', flexDirection:'column', gap:11, marginBottom:16 }}>
              <Inp label="Nome" value={nome} onChange={setNome} />
              <Inp label="E-mail" type="email" value={email} onChange={setEmail} />
              <Inp label="Telefone" value={telefone} onChange={setTelefone} />
              <Inp label="CPF / CNPJ" value={cpf} onChange={setCpf} />
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:5 }}>Estágio</label>
              <select value={estagioId} onChange={e=>setEstagioId(e.target.value)} style={{ width:'100%', padding:'10px 13px', borderRadius:9, border:`1.5px solid ${C.border}`, background:C.card, fontSize:13, color:C.text, outline:'none' }}>
                <option value="">— Sem estágio —</option>
                {estagios.map(e=><option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </div>
            {isInt&&<div style={{ marginBottom:12 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:5 }}>Responsável Interno</label>
              <select value={responsavelId} onChange={e=>setResponsavelId(e.target.value)} style={{ width:'100%', padding:'10px 13px', borderRadius:9, border:`1.5px solid ${C.border}`, background:C.card, fontSize:13, color:C.text, outline:'none' }}>
                <option value="">— Não atribuído —</option>
                {internos.map(u=><option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>}
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:5 }}>Observações</label>
              <textarea value={obs} onChange={e=>setObs(e.target.value)} rows={3} style={{ width:'100%', padding:'10px 13px', borderRadius:9, border:`1.5px solid ${C.border}`, background:C.card, fontSize:13, color:C.text, outline:'none', resize:'vertical', fontFamily:'inherit', boxSizing:'border-box' }} />
            </div>
            <Btn full onClick={salvar}>Salvar alterações</Btn>
          </div>
        )}
        {tab==='checklist'&&<ChecklistTab cliente={cliente} profile={profile} />}
        {tab==='docs'&&<DocsTab cliente={cliente} profile={profile} />}
        {tab==='activity'&&(
          <div>
            <div style={{ marginBottom:14 }}>
              <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Registrar observação, ligação, reunião…" rows={3} style={{ width:'100%', padding:'10px 13px', borderRadius:9, border:`1.5px solid ${C.border}`, background:C.card, fontSize:13, color:C.text, outline:'none', resize:'none', fontFamily:'inherit', marginBottom:8, boxSizing:'border-box' }} />
              <Btn full onClick={addNote}>+ Registrar</Btn>
            </div>
            {[...(cliente.activities||[])].reverse().map((a,i,arr)=>(
              <div key={a.id||i} style={{ display:'flex', gap:10, marginBottom:8 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:C.accentDim, color:C.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0 }}>{a.type==='stage'?'⇄':'✎'}</div>
                <div style={{ flex:1, paddingBottom:8, borderBottom:i<arr.length-1?`1px solid ${C.border}`:'none' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:C.text }}>{a.user}</span>
                    <span style={{ fontSize:11, color:C.muted }}>{fmtD(a.date)}</span>
                  </div>
                  <div style={{ fontSize:12, color:C.text2, lineHeight:1.5 }}>{a.text}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── NOVO CLIENTE MODAL ───────────────────────────────────────────────────────
function NovoClienteModal({ profile, estagios, externos, dispatch, onClose }) {
  const isInt = profile?.role==='interno';
  const [form, setForm] = useState({ nomeCliente:'', email:'', telefone:'', cpf:'', observacoes:'', estagio_id:estagios[0]?.id||'', externoId:'' });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const salvar = ()=>{
    if(!form.nomeCliente.trim()){alert('Nome é obrigatório.');return;}
    const extSel = isInt ? externos.find(ex=>ex.id===form.externoId) : null;
    dispatch({ type:'ADD', c:{ ...form, id:gid(), externo_id:isInt?(form.externoId||null):profile.id, externoNome:isInt?(extSel?.nome||null):profile.nome, responsavel_interno_id:null, responsavelInternoNome:null, dataEntrada:TODAY, ultimoContato:TODAY, activities:[] }, user:profile?.nome||'Usuário' });
  };
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(26,31,58,0.45)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{ background:C.card, borderRadius:16, width:'100%', maxWidth:460, padding:'28px', boxShadow:C.shadowLg, border:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div><div style={{ fontSize:18, fontWeight:700, color:C.text }}>Novo Cliente</div><div style={{ fontSize:12, color:C.muted, marginTop:2 }}>Preencha os dados do cliente</div></div>
          <button onClick={onClose} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, width:28, height:28, cursor:'pointer', color:C.muted, fontSize:16 }}>×</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div style={{ gridColumn:'1/-1' }}><Inp label="Nome *" value={form.nomeCliente} onChange={v=>set('nomeCliente',v)} placeholder="Nome completo" req /></div>
          <Inp label="E-mail" type="email" value={form.email} onChange={v=>set('email',v)} placeholder="email@exemplo.com" />
          <Inp label="Telefone" value={form.telefone} onChange={v=>set('telefone',v)} placeholder="(00) 00000-0000" />
          <Inp label="CPF / CNPJ" value={form.cpf} onChange={v=>set('cpf',v)} placeholder="000.000.000-00" />
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:5 }}>Estágio inicial</label>
            <select value={form.estagio_id} onChange={e=>set('estagio_id',e.target.value)} style={{ width:'100%', padding:'10px 13px', borderRadius:9, border:`1.5px solid ${C.border}`, background:C.card, fontSize:13, color:C.text, outline:'none' }}>
              <option value="">— Sem estágio —</option>
              {estagios.map(e=><option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
          </div>
          {isInt&&<div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:5 }}>Externo</label>
            <select value={form.externoId} onChange={e=>set('externoId',e.target.value)} style={{ width:'100%', padding:'10px 13px', borderRadius:9, border:`1.5px solid ${C.border}`, background:C.card, fontSize:13, color:C.text, outline:'none' }}>
              <option value="">— Sem externo —</option>
              {externos.map(ex=><option key={ex.id} value={ex.id}>{ex.nome}</option>)}
            </select>
          </div>}
          <div style={{ gridColumn:'1/-1' }}>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:5 }}>Observações</label>
            <textarea value={form.observacoes} onChange={e=>set('observacoes',e.target.value)} rows={2} style={{ width:'100%', padding:'10px 13px', borderRadius:9, border:`1.5px solid ${C.border}`, background:C.card, fontSize:13, color:C.text, outline:'none', resize:'none', fontFamily:'inherit', boxSizing:'border-box' }} />
          </div>
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn onClick={salvar}>Salvar cliente</Btn></div>
      </div>
    </div>
  );
}

// ─── IMPORTAR CLIENTES ────────────────────────────────────────────────────────
const CAMPOS = [
  { key:'nomeCliente', label:'Nome *', req:true },
  { key:'email',       label:'E-mail'           },
  { key:'telefone',    label:'Telefone'          },
  { key:'cpf',         label:'CPF / CNPJ'        },
  { key:'observacoes', label:'Observações'       },
];

function ImportarClientesModal({ profile, estagios, externos, dispatch, onClose }) {
  const [step, setStep] = useState(1); // 1: upload, 2: mapeamento, 3: resultado
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapa, setMapa] = useState({});   // { nomeCliente: 'Coluna A', ... }
  const [estagioId, setEstagioId] = useState(estagios[0]?.id||'');
  const [externoId, setExternoId] = useState('');
  const [importing, setImporting] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [err, setErr] = useState(null);
  const inputRef = useRef(null);
  const isInt = profile?.role==='interno';

  const loadFile = async(file)=>{
    setErr(null);
    const ext = file.name.split('.').pop().toLowerCase();
    let data;
    if(['xlsx','xls'].includes(ext)){
      data = await parseExcel(file);
      if(!data){setErr('Instale xlsx: npm install xlsx');return;}
    } else if(ext==='csv'){
      const text = await file.text();
      data = parseCSV(text);
    } else {setErr('Use arquivos .csv, .xlsx ou .xls');return;}
    if(!data||data.length===0){setErr('Arquivo vazio ou inválido.');return;}
    const hs = Object.keys(data[0]);
    setHeaders(hs);
    setRows(data);
    // Auto-mapear por similaridade de nome
    const autoMapa = {};
    CAMPOS.forEach(({key})=>{
      const match = hs.find(h=>{
        const n=h.toLowerCase().trim();
        return n.includes(key.toLowerCase())||key.toLowerCase().includes(n)||
          (key==='nomeCliente'&&(n.includes('nome')||n.includes('client')))||
          (key==='cpf'&&(n.includes('cpf')||n.includes('cnpj')))||
          (key==='telefone'&&(n.includes('tel')||n.includes('phone')||n.includes('fone')||n.includes('cel')));
      });
      if(match) autoMapa[key]=match;
    });
    setMapa(autoMapa);
    setStep(2);
  };

  const importar = async()=>{
    setImporting(true);
    const extSel = isInt ? externos.find(ex=>ex.id===externoId) : null;
    const novos = rows.map(row=>({
      id: gid(),
      nomeCliente: (mapa.nomeCliente?row[mapa.nomeCliente]:'').trim(),
      email:       mapa.email       ? row[mapa.email]       : '',
      telefone:    mapa.telefone    ? row[mapa.telefone]     : '',
      cpf:         mapa.cpf         ? row[mapa.cpf]          : '',
      observacoes: mapa.observacoes ? row[mapa.observacoes]  : '',
      estagio_id:  estagioId||null,
      externo_id:  isInt?(externoId||null):profile.id,
      externoNome: isInt?(extSel?.nome||null):profile.nome,
      responsavel_interno_id: null, responsavelInternoNome: null,
      dataEntrada: TODAY, ultimoContato: TODAY, activities:[{id:gid(),type:'stage',date:TODAY,user:profile?.nome||'Usuário',text:'Importado via planilha'}],
    })).filter(c=>c.nomeCliente);

    if(novos.length===0){setErr('Nenhum registro com nome válido encontrado.');setImporting(false);return;}

    let ok=0, erros=0;
    for(const c of novos){
      const{id,externo_id,externoNome,responsavel_interno_id,responsavelInternoNome,estagio_id,...data}=c;
      const{error}=await supabase.from('externos_clientes').upsert({id,data,estagio_id:estagio_id||null,externo_id:externo_id||null,externo_nome:externoNome||null,responsavel_interno_id:null,responsavel_interno_nome:null},{onConflict:'id'});
      if(error) erros++; else ok++;
    }
    dispatch({type:'ADD_MANY', clientes: novos.slice(0,ok)});
    setResultado({total:rows.length,importados:ok,erros,ignorados:rows.length-novos.length});
    setImporting(false);
    setStep(3);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(26,31,58,0.45)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{ background:C.card, borderRadius:16, width:'100%', maxWidth:560, maxHeight:'88vh', display:'flex', flexDirection:'column', boxShadow:C.shadowLg, border:`1px solid ${C.border}` }}>
        {/* Header */}
        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:17, fontWeight:700, color:C.text }}>Importar Clientes</div>
            <div style={{ display:'flex', gap:6, marginTop:6 }}>
              {['Upload','Mapeamento','Conclusão'].map((l,i)=>(
                <span key={l} style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:step===i+1?C.accent:step>i+1?C.sBg:C.surface, color:step===i+1?'#fff':step>i+1?C.success:C.muted }}>{step>i+1?'✓ ':''}{l}</span>
              ))}
            </div>
          </div>
          <button onClick={onClose} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, width:30, height:30, cursor:'pointer', color:C.muted, fontSize:16 }}>×</button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          {step===1&&(
            <div>
              <div onClick={()=>inputRef.current?.click()} onDragOver={e=>{e.preventDefault();}} onDrop={e=>{e.preventDefault();loadFile(e.dataTransfer.files[0]);}}
                style={{ border:`2px dashed ${C.border2}`, borderRadius:12, padding:'40px 20px', textAlign:'center', cursor:'pointer', background:C.surface, marginBottom:16 }}>
                <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display:'none' }} onChange={e=>e.target.files[0]&&loadFile(e.target.files[0])} />
                <div style={{ fontSize:32, marginBottom:10 }}>📊</div>
                <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:6 }}>Arraste ou selecione a planilha</div>
                <div style={{ fontSize:12, color:C.muted }}>Formatos aceitos: .csv, .xlsx, .xls</div>
              </div>
              {err&&<div style={{ padding:'9px 12px', borderRadius:8, background:C.dBg, fontSize:12, color:C.danger }}>{err}</div>}
              <div style={{ background:C.surface, borderRadius:10, padding:'14px 16px', border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:12, fontWeight:600, color:C.text, marginBottom:8 }}>📋 Dicas para a planilha</div>
                <div style={{ fontSize:12, color:C.muted, lineHeight:1.7 }}>
                  • Primeira linha deve ser o cabeçalho (Nome, E-mail, Telefone…)<br/>
                  • Coluna <b>Nome</b> é obrigatória — linhas sem nome serão ignoradas<br/>
                  • Mapeamento de colunas é feito na próxima etapa<br/>
                  • Dados existentes não serão sobrescritos
                </div>
              </div>
            </div>
          )}

          {step===2&&(
            <div>
              <div style={{ padding:'10px 14px', borderRadius:9, background:C.sBg, border:'1px solid rgba(16,185,129,.2)', fontSize:12, color:C.success, marginBottom:16 }}>
                ✓ {rows.length} linhas detectadas · {headers.length} colunas
              </div>
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:10 }}>Mapear colunas</div>
                {CAMPOS.map(({key,label,req})=>(
                  <div key={key} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:8, alignItems:'center' }}>
                    <div style={{ fontSize:13, fontWeight:500, color:C.text }}>{label}</div>
                    <select value={mapa[key]||''} onChange={e=>setMapa(m=>({...m,[key]:e.target.value||undefined}))} style={{ padding:'8px 10px', borderRadius:8, border:`1.5px solid ${req&&!mapa[key]?C.danger:C.border}`, background:C.card, fontSize:12, color:C.text, outline:'none' }}>
                      <option value="">— Ignorar —</option>
                      {headers.map(h=><option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:5 }}>Estágio inicial</label>
                  <select value={estagioId} onChange={e=>setEstagioId(e.target.value)} style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:`1.5px solid ${C.border}`, background:C.card, fontSize:13, color:C.text, outline:'none' }}>
                    <option value="">— Sem estágio —</option>
                    {estagios.map(e=><option key={e.id} value={e.id}>{e.label}</option>)}
                  </select>
                </div>
                {isInt&&<div>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:5 }}>Atribuir a externo</label>
                  <select value={externoId} onChange={e=>setExternoId(e.target.value)} style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:`1.5px solid ${C.border}`, background:C.card, fontSize:13, color:C.text, outline:'none' }}>
                    <option value="">— Sem externo —</option>
                    {externos.map(ex=><option key={ex.id} value={ex.id}>{ex.nome}</option>)}
                  </select>
                </div>}
              </div>
              {/* Preview */}
              <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>Prévia (primeiras 3 linhas)</div>
              <div style={{ overflowX:'auto', background:C.surface, borderRadius:9, border:`1px solid ${C.border}` }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>
                    {CAMPOS.filter(c=>mapa[c.key]).map(c=><th key={c.key} style={{ padding:'7px 12px', textAlign:'left', color:C.muted, fontWeight:700, whiteSpace:'nowrap' }}>{c.label}</th>)}
                  </tr></thead>
                  <tbody>{rows.slice(0,3).map((r,i)=>(
                    <tr key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
                      {CAMPOS.filter(c=>mapa[c.key]).map(c=><td key={c.key} style={{ padding:'7px 12px', color:C.text, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r[mapa[c.key]]||'—'}</td>)}
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              {err&&<div style={{ padding:'9px 12px', borderRadius:8, background:C.dBg, fontSize:12, color:C.danger, marginTop:10 }}>{err}</div>}
            </div>
          )}

          {step===3&&resultado&&(
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <div style={{ fontSize:44, marginBottom:12 }}>{resultado.erros===0?'🎉':'⚠️'}</div>
              <div style={{ fontSize:18, fontWeight:700, color:C.text, marginBottom:16 }}>{resultado.erros===0?'Importação concluída!':'Importação com alertas'}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, maxWidth:320, margin:'0 auto', marginBottom:20 }}>
                {[
                  { label:'Importados', value:resultado.importados, color:C.success, bg:C.sBg },
                  { label:'Erros',      value:resultado.erros,      color:resultado.erros>0?C.danger:C.muted, bg:resultado.erros>0?C.dBg:C.surface },
                  { label:'Total',      value:resultado.total,      color:C.text,   bg:C.surface },
                  { label:'Ignorados',  value:resultado.ignorados,  color:C.muted,  bg:C.surface },
                ].map(x=>(
                  <div key={x.label} style={{ padding:'14px', borderRadius:10, background:x.bg, textAlign:'center' }}>
                    <div style={{ fontSize:22, fontWeight:700, color:x.color }}>{x.value}</div>
                    <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{x.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding:'14px 24px', borderTop:`1px solid ${C.border}`, display:'flex', gap:8, justifyContent:'flex-end' }}>
          {step===1&&<Btn variant="secondary" onClick={onClose}>Cancelar</Btn>}
          {step===2&&<><Btn variant="secondary" onClick={()=>setStep(1)}>← Voltar</Btn><Btn onClick={importar} loading={importing} disabled={!mapa.nomeCliente}>Importar {rows.length} clientes</Btn></>}
          {step===3&&<Btn onClick={onClose}>Fechar</Btn>}
        </div>
      </div>
    </div>
  );
}

// ─── EXPORTAR RELATÓRIO ───────────────────────────────────────────────────────
function ExportarRelatorioModal({ clientes, estagios, externos, estagioMap, onClose }) {
  const [filtroEstagio, setFiltroEstagio] = useState('');
  const [filtroExterno, setFiltroExterno] = useState('');
  const [formato, setFormato] = useState('xlsx');
  const [colunas, setColunas] = useState({ nome:true, email:true, telefone:true, cpf:false, estagio:true, externo:true, responsavel:true, ultimoContato:true, observacoes:false });
  const toggle = k => setColunas(c=>({...c,[k]:!c[k]}));

  const filtered = useMemo(() => clientes.filter(c => {
    if(filtroEstagio&&c.estagio_id!==filtroEstagio) return false;
    if(filtroExterno&&c.externo_id!==filtroExterno) return false;
    return true;
  }), [clientes,filtroEstagio,filtroExterno]);

  const exportar = async()=>{
    const rows = filtered.map(c=>({
      ...(colunas.nome&&{'Nome':c.nomeCliente||''}),
      ...(colunas.email&&{'E-mail':c.email||''}),
      ...(colunas.telefone&&{'Telefone':c.telefone||''}),
      ...(colunas.cpf&&{'CPF/CNPJ':c.cpf||''}),
      ...(colunas.estagio&&{'Estágio':estagioMap[c.estagio_id]?.label||'—'}),
      ...(colunas.externo&&{'Externo':c.externoNome||'—'}),
      ...(colunas.responsavel&&{'Responsável':c.responsavelInternoNome||'—'}),
      ...(colunas.ultimoContato&&{'Último Contato':c.ultimoContato||'—'}),
      ...(colunas.observacoes&&{'Observações':c.observacoes||''}),
    }));
    const ts = new Date().toISOString().slice(0,10);
    if(formato==='xlsx') await exportXLSX(rows, `externos_clientes_${ts}.xlsx`);
    else exportCSV(rows, `externos_clientes_${ts}.csv`);
    onClose();
  };

  const ColCheck = ({k,label}) => (
    <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:colunas[k]?C.text:C.muted, userSelect:'none', padding:'5px 0' }}>
      <div onClick={()=>toggle(k)} style={{ width:18, height:18, borderRadius:5, border:`1.5px solid ${colunas[k]?C.accent:C.border}`, background:colunas[k]?C.accent:'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#fff', flexShrink:0, cursor:'pointer' }}>{colunas[k]&&'✓'}</div>
      {label}
    </label>
  );

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(26,31,58,0.45)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{ background:C.card, borderRadius:16, width:'100%', maxWidth:460, boxShadow:C.shadowLg, border:`1px solid ${C.border}` }}>
        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div><div style={{ fontSize:17, fontWeight:700, color:C.text }}>Exportar Relatório</div><div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{filtered.length} cliente{filtered.length!==1?'s':''} selecionado{filtered.length!==1?'s':''}</div></div>
          <button onClick={onClose} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, width:30, height:30, cursor:'pointer', color:C.muted, fontSize:16 }}>×</button>
        </div>
        <div style={{ padding:'20px 24px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:18 }}>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:5 }}>Filtrar por estágio</label>
              <select value={filtroEstagio} onChange={e=>setFiltroEstagio(e.target.value)} style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:`1.5px solid ${C.border}`, background:C.card, fontSize:13, color:C.text, outline:'none' }}>
                <option value="">Todos</option>
                {estagios.map(e=><option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:5 }}>Filtrar por externo</label>
              <select value={filtroExterno} onChange={e=>setFiltroExterno(e.target.value)} style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:`1.5px solid ${C.border}`, background:C.card, fontSize:13, color:C.text, outline:'none' }}>
                <option value="">Todos</option>
                {externos.map(ex=><option key={ex.id} value={ex.id}>{ex.nome}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom:18 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:10 }}>Colunas a incluir</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0 }}>
              {[['nome','Nome'],['email','E-mail'],['telefone','Telefone'],['cpf','CPF/CNPJ'],['estagio','Estágio'],['externo','Externo'],['responsavel','Responsável'],['ultimoContato','Último Contato'],['observacoes','Observações']].map(([k,l])=><ColCheck key={k} k={k} label={l} />)}
            </div>
          </div>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:10 }}>Formato</div>
            <div style={{ display:'flex', gap:8 }}>
              {['xlsx','csv'].map(f=>(
                <button key={f} onClick={()=>setFormato(f)} style={{ flex:1, padding:'10px', borderRadius:9, border:`1.5px solid ${formato===f?C.accent:C.border}`, background:formato===f?C.accentPale:'transparent', color:formato===f?C.accent:C.text2, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }}>
                  {f==='xlsx'?'📊 Excel (.xlsx)':'📄 CSV (.csv)'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding:'14px 24px', borderTop:`1px solid ${C.border}`, display:'flex', gap:8, justifyContent:'flex-end' }}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={exportar} disabled={filtered.length===0}>⬇ Exportar {filtered.length} registros</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export function ExternosApp({ profile, session, signOut, onAlterarSenha }) {
  const [s, dispatch] = useReducer(R, INIT);
  const { clientes, view, sel, newOpen } = s;
  const [estagios, setEstagios] = useState([]);
  const [externos, setExternos] = useState([]);
  const [internos, setInternos] = useState([]);
  const [ready, setReady] = useState(false);
  const [showAS, setShowAS] = useState(false);
  const [showImportar, setShowImportar] = useState(false);
  const [exportPayload, setExportPayload] = useState(null);  // { filtered, estagioMap }
  const [alertDias, setAlertDias] = useState(7);
  const syncTimerRef = useRef(null);
  const syncQueueRef = useRef(new Map());
  const clientesRef = useRef(clientes);
  const isInt = profile?.role === 'interno';

  const setView = useCallback(v => dispatch({ type:'VIEW', v }), []);
  const selected = clientes.find(c => c.id === sel);

  const loadEstagios = useCallback(async()=>{const{data}=await supabase.from('externos_estagios').select('*').order('ordem');setEstagios(data||[]);},[]);
  const loadExternos = useCallback(async()=>{const{data}=await supabase.from('profiles').select('id,nome,email').eq('modulo','externos').eq('role','externo').order('nome');setExternos(data||[]);},[]);
  const loadInternos = useCallback(async()=>{const{data}=await supabase.from('profiles').select('id,nome').eq('modulo','externos').eq('role','interno').order('nome');setInternos(data||[]);},[]);

  useEffect(()=>{
    if(!session) return;
    const load = async()=>{
      const{data,error}=await supabase.from('externos_clientes').select('*').order('created_at',{ascending:false});
      if(error){console.error(error);setReady(true);return;}
      const loaded=(data||[]).map(r=>({...r.data,id:r.id,estagio_id:r.estagio_id,externo_id:r.externo_id,externoNome:r.externo_nome,responsavel_interno_id:r.responsavel_interno_id,responsavelInternoNome:r.responsavel_interno_nome}));
      dispatch({type:'SET_C',clientes:loaded});
      clientesRef.current=loaded;
      setReady(true);
    };
    load(); loadEstagios(); loadExternos();
    if(isInt) loadInternos();

    const ch = supabase.channel('externos_rt')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'externos_clientes'},p=>{const r=p.new;dispatch({type:'RT_ADD',c:{...r.data,id:r.id,estagio_id:r.estagio_id,externo_id:r.externo_id,externoNome:r.externo_nome,responsavel_interno_id:r.responsavel_interno_id,responsavelInternoNome:r.responsavel_interno_nome}});})
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'externos_clientes'},p=>{const r=p.new;dispatch({type:'UPD',c:{...r.data,id:r.id,estagio_id:r.estagio_id,externo_id:r.externo_id,externoNome:r.externo_nome,responsavel_interno_id:r.responsavel_interno_id,responsavelInternoNome:r.responsavel_interno_nome}});})
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  },[session,isInt]);

  // Sync debounce → Supabase
  useEffect(()=>{
    if(!ready||!session) return;
    const prev=clientesRef.current; clientesRef.current=clientes;
    const prevMap=new Map(prev.map(c=>[c.id,c]));
    const toSync=clientes.filter(c=>{const old=prevMap.get(c.id);return !old||JSON.stringify(old)!==JSON.stringify(c);});
    if(toSync.length===0) return;
    toSync.forEach(c=>syncQueueRef.current.set(c.id,c));
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current=setTimeout(async()=>{
      const items=[...syncQueueRef.current.values()]; syncQueueRef.current.clear();
      for(const c of items){
        const{id,estagio_id,externo_id,externoNome,responsavel_interno_id,responsavelInternoNome,...data}=c;
        await supabase.from('externos_clientes').upsert({id,data,estagio_id:estagio_id||null,externo_id:externo_id||(isInt?null:session.user.id),externo_nome:externoNome||(isInt?null:profile?.nome),responsavel_interno_id:responsavel_interno_id||null,responsavel_interno_nome:responsavelInternoNome||null},{onConflict:'id'});
      }
    },800);
  },[clientes,ready,session]);

  if(!ready) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:28, color:C.accent, marginBottom:10 }}>◈</div>
        <div style={{ fontSize:13, color:C.muted }}>Carregando…</div>
      </div>
    </div>
  );

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:C.bg, fontFamily:'inherit' }}>
      <ExternosSidebar view={view} setView={setView} profile={profile} onLogout={signOut} onAlterarSenha={()=>setShowAS(true)} />
      {/* Alert dias config — flutuante discreto no topo */}
      <main style={{ flex:1, minWidth:0, overflowY:'auto', paddingRight: selected?480:0, transition:'padding-right .3s cubic-bezier(.4,0,.2,1)', position:'relative' }}>
        <div style={{ position:'sticky', top:0, zIndex:50, display:'flex', justifyContent:'flex-end', padding:'8px 32px 0', background:'transparent', pointerEvents:'none' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, background:C.card, border:`1px solid ${C.border}`, borderRadius:99, padding:'5px 12px', boxShadow:C.shadow, pointerEvents:'all', fontSize:11, color:C.muted }}>
            <span>⚠ Alerta de inatividade:</span>
            {[3,7,14,30].map(d=>(
              <button key={d} onClick={()=>setAlertDias(d)} style={{ padding:'2px 8px', borderRadius:99, border:'none', background:alertDias===d?C.accent:'transparent', color:alertDias===d?'#fff':C.muted, fontSize:11, fontWeight:alertDias===d?700:400, cursor:'pointer', fontFamily:'inherit' }}>{d}d</button>
            ))}
          </div>
        </div>
        {view==='dashboard'&&<ExternosDashboard clientes={clientes} estagios={estagios} profile={profile} externos={externos} alertDias={alertDias} />}
        {view==='pipeline' &&<ExternosPipeline  clientes={clientes} estagios={estagios} profile={profile} dispatch={dispatch} onReloadEstagios={loadEstagios} alertDias={alertDias} />}
        {view==='clientes' &&<ExternosClientes  clientes={clientes} estagios={estagios} profile={profile} dispatch={dispatch} externos={externos} alertDias={alertDias} onShowImportar={()=>setShowImportar(true)} onShowExportar={(filtered,estagioMap)=>setExportPayload({filtered,estagioMap})} />}
        {view==='cadastrar'&&isInt&&<ExternosCadastrar profile={profile} session={session} onSuccess={loadExternos} />}
      </main>
      {selected&&<ExternosDetail key={selected.id} cliente={selected} estagios={estagios} profile={profile} externos={externos} internos={internos} dispatch={dispatch} onClose={()=>dispatch({type:'CLOSE'})} />}
      {newOpen&&<NovoClienteModal profile={profile} estagios={estagios} externos={externos} dispatch={dispatch} onClose={()=>dispatch({type:'TNEW'})} />}
      {showImportar&&<ImportarClientesModal profile={profile} estagios={estagios} externos={externos} dispatch={dispatch} onClose={()=>setShowImportar(false)} />}
      {exportPayload&&<ExportarRelatorioModal clientes={exportPayload.filtered} estagios={estagios} externos={externos} estagioMap={exportPayload.estagioMap} onClose={()=>setExportPayload(null)} />}
      {showAS&&<AlterarSenha onClose={()=>setShowAS(false)} />}
    </div>
  );
}