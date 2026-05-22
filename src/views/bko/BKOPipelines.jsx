
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '../../supabase';
import { gid, TODAY, fmtD } from '../../utils';
import { Avatar } from '../../components/shared';
import ReactDOM from 'react-dom';

//Helpers
const fmtDH = (ts) => {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    const data = d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', timeZone:'America/Sao_Paulo' });
    const hora = d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', timeZone:'America/Sao_Paulo' });
    return `${data} às ${hora}`;
  } catch { return '—'; }
};

const ROLE_LABELS = { corban_bko:'Corban', bko:'BKO', comercial:'Comercial', startec:'Startec' };
const ROLE_COLORS = { corban_bko:'#0EA5E9', bko:'#7C3AED', comercial:'#3B5BDB', startec:'#059669' };

// Calcula dias no estágio atual
function diasNoEstagio(estagio_entrada_at) {
  if (!estagio_entrada_at) return 0;
  const diff = Date.now() - new Date(estagio_entrada_at).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

//Novo Registro
function NovoRegistroModal({ pipeline, estagios, profile, onClose, onSave }) {
  const [form, setForm] = useState({
    nome_cliente: '', cpf_cliente: '', telefone: '',
    prefeitura: '', email: '', indicado_por_nome: '',
    estagio_id: estagios.find(e => e.ordem === Math.min(...estagios.map(x => x.ordem)))?.id || '',
    origem: 'manual',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.nome_cliente.trim()) { setErr('Nome é obrigatório.'); return; }
    setSaving(true); setErr(null);
    //Não inclui id - banco gera UUID automaticamente via gen_random_uuid()
    const payload = {
      pipeline_id: pipeline.id,
      estagio_id: form.estagio_id,
      nome_cliente: form.nome_cliente.trim(),
      cpf_cliente: form.cpf_cliente.trim() || null,
      telefone: form.telefone.trim() || null,
      prefeitura: form.prefeitura.trim() || null,
      email: form.email.trim() || null,
      indicado_por_nome: form.indicado_por_nome.trim() || null,
      origem: form.origem,
      criado_por_id: profile?.id || null,
      criado_por_nome: profile?.nome || 'Usuário',
      estagio_entrada_at: new Date().toISOString(),
      activities: [{ type: 'criado', date: TODAY, user: profile?.nome || 'Usuário', text: 'Registro criado' }],
    };
    const { data, error } = await supabase.from('bko_pipeline_registros').insert(payload).select().single();
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSave(data); // usa o registro retornado pelo banco (com UUID gerado)
    onClose();
  };

  const isIndicacoes = pipeline.tipo === 'indicacoes';

  return (
    <div className="mbk" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mbox" style={{ maxWidth: 480 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:600, color:'var(--text-primary)' }}>
              Novo registro
            </div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
              <span style={{ padding:'2px 8px', borderRadius:99, background:`${pipeline.cor}18`, color:pipeline.cor, fontWeight:700, fontSize:10 }}>
                {pipeline.icone} {pipeline.nome}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(0,0,0,.06)', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, color:'var(--text-muted)' }}>×</button>
        </div>

        {err && <div style={{ padding:'8px 12px', borderRadius:7, marginBottom:12, background:'var(--danger-dim)', border:'1px solid rgba(192,65,58,.2)', fontSize:11, color:'var(--danger)' }}>{err}</div>}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
          <div style={{ gridColumn:'1/-1' }}>
            <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:4 }}>Nome completo *</label>
            <input className="inp" value={form.nome_cliente} onChange={e => set('nome_cliente', e.target.value)} placeholder="Nome"/>
          </div>
          <div>
            <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:4 }}>CPF</label>
            <input className="inp" value={form.cpf_cliente} onChange={e => set('cpf_cliente', e.target.value)} placeholder="000.000.000-00"/>
          </div>
          <div>
            <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:4 }}>Telefone</label>
            <input className="inp" value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(00) 00000-0000"/>
          </div>
          <div>
            <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:4 }}>Prefeitura / Órgão</label>
            <input className="inp" value={form.prefeitura} onChange={e => set('prefeitura', e.target.value)} placeholder="Prefeitura..."/>
          </div>
          <div>
            <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:4 }}>E-mail</label>
            <input className="inp" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="Ex.: christian@starbank.tec.br"/>
          </div>
          {isIndicacoes && (
            <div style={{ gridColumn:'1/-1' }}>
              <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:4 }}>Indicado por</label>
              <input className="inp" value={form.indicado_por_nome} onChange={e => set('indicado_por_nome', e.target.value)} placeholder="Nome de quem indicou"/>
            </div>
          )}
          <div style={{ gridColumn:'1/-1' }}>
            <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:4 }}>Estágio inicial</label>
            <select className="sel" value={form.estagio_id} onChange={e => set('estagio_id', e.target.value)}>
              {estagios.filter(e => !e.eh_final_sucesso && !e.eh_final_falha).map(e => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" style={{ background: pipeline.cor, color:'#fff' }} onClick={save} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar registro'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detalhe do Registro ──────────────────────────────────────────────────────
function RegistroDetalhe({ registro, pipeline, estagios, profile, onClose, onUpdate }) {
  const [estagioSel, setEstagioSel] = useState(registro.estagio_id);
  const [estagioChanged, setEstagioChanged] = useState(false);
  const [novaObs, setNovaObs] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState(null);

  const estagio = estagios.find(e => e.id === registro.estagio_id);
  const activities = registro.activities || [];

  const salvarEstagio = async () => {
    if (!estagioChanged) return;
    setSalvando(true);
    const novoEstagio = estagios.find(e => e.id === estagioSel);
    const novaActivity = { id:gid(), type:'move', date:TODAY, user:profile?.nome||'Usuário', text:`Movido para "${novoEstagio?.nome}"` };
    const updated = { ...registro, estagio_id:estagioSel, estagio_entrada_at:new Date().toISOString(), activities:[...activities, novaActivity] };
    const { error } = await supabase.from('bko_pipeline_registros')
      .update({ estagio_id:estagioSel, estagio_entrada_at:new Date().toISOString(), activities:updated.activities })
      .eq('id', registro.id);
    setSalvando(false);
    if (error) { setMsg({ t:'error', text:error.message }); return; }
    onUpdate(updated);
    setEstagioChanged(false);
    setMsg({ t:'success', text:`Movido para "${novoEstagio?.nome}"` });
    setTimeout(() => setMsg(null), 2500);
  };

  const adicionarObs = async () => {
    if (!novaObs.trim()) return;
    const entrada = { id:gid(), tipo:'obs', texto:novaObs.trim(), autor_nome:profile?.nome||'Usuário', autor_role:profile?.role, dataHora:new Date().toISOString() };
    const novoActivities = [...activities, { ...entrada, type:'obs', date:TODAY, user:profile?.nome, text:novaObs.trim() }];
    const { error } = await supabase.from('bko_pipeline_registros').update({ activities:novoActivities }).eq('id', registro.id);
    if (error) return;
    onUpdate({ ...registro, activities:novoActivities });
    setNovaObs('');
  };

  return (
    <div className="spanel">
      <div style={{ padding:'16px 20px 12px', borderBottom:'1px solid var(--border)', background:'var(--bg-card)', flexShrink:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--font-display)', marginBottom:4 }}>{registro.nome_cliente}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>{registro.cpf_cliente||'—'} · {registro.telefone||'—'}</div>
            <div style={{ marginTop:7, display:'flex', gap:5, flexWrap:'wrap' }}>
              {estagio && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:99, background:estagio.bg, color:estagio.cor, fontWeight:700 }}>{estagio.nome}</span>}
              {registro.prefeitura && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:99, background:'rgba(0,0,0,.05)', color:'var(--text-secondary)', fontWeight:600 }}>🏛 {registro.prefeitura}</span>}
              {registro.indicado_por_nome && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:99, background:'rgba(236,72,153,.1)', color:'#EC4899', fontWeight:700 }}>↗ {registro.indicado_por_nome}</span>}
              {registro.atribuido_a_nome && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:99, background:'rgba(59,91,219,.1)', color:'#3B5BDB', fontWeight:700 }}>→ {registro.atribuido_a_nome}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(0,0,0,.06)', border:'1px solid var(--border)', borderRadius:7, cursor:'pointer', width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'var(--text-muted)' }}>×</button>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>
        {msg && <div style={{ padding:'8px 12px', borderRadius:8, marginBottom:12, fontSize:11, background:msg.t==='success'?'var(--success-dim)':'var(--danger-dim)', color:msg.t==='success'?'var(--success)':'var(--danger)' }}>{msg.text}</div>}

        {/* Dados */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', marginBottom:16 }}>
          {[
            ['CPF', registro.cpf_cliente||'—'],
            ['Telefone', registro.telefone||'—'],
            ['E-mail', registro.email||'—'],
            ['Prefeitura', registro.prefeitura||'—'],
            registro.indicado_por_nome && ['Indicado por', registro.indicado_por_nome],
            ['Criado por', registro.criado_por_nome||'—'],
            ['Criado em', fmtDH(registro.created_at)],
            ['Origem', registro.origem||'—'],
          ].filter(Boolean).map(([k,v]) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 12px', borderBottom:'1px solid var(--border)' }}>
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>{k}</span>
              <span style={{ fontSize:11, color:'var(--text-primary)', fontWeight:500 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Mover estágio */}
        <div style={{ marginBottom:16, padding:14, background:'rgba(59,91,219,.06)', borderRadius:10, border:'1px solid rgba(59,91,219,.15)' }}>
          <div style={{ fontSize:11, fontWeight:700, color:pipeline.cor, marginBottom:8 }}>⇄ Mover para estágio</div>
          <select className="sel" style={{ marginBottom:10 }} value={estagioSel} onChange={e => { setEstagioSel(e.target.value); setEstagioChanged(true); }}>
            {estagios.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
          {estagioChanged && (
            <button style={{ width:'100%', padding:'8px 0', borderRadius:8, background:pipeline.cor, color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', border:'none', opacity:salvando?0.7:1 }} onClick={salvarEstagio} disabled={salvando}>
              {salvando ? 'Salvando…' : '✓ Confirmar movimentação'}
            </button>
          )}
        </div>

        {/* Observações / Atividades */}
        <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>Histórico</div>
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, marginBottom:12, maxHeight:260, overflowY:'auto' }}>
          {activities.length === 0 && (
            <div style={{ padding:'24px 0', textAlign:'center', fontSize:12, color:'var(--text-muted)' }}>Nenhuma atividade ainda.</div>
          )}
          {[...activities].reverse().map((a, i) => (
            <div key={a.id||i} style={{ display:'flex', gap:9, padding:'10px 14px', borderBottom:'1px solid var(--border)' }}>
              <div style={{ width:26, height:26, borderRadius:7, background:'rgba(59,91,219,.1)', color:'#3B5BDB', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, flexShrink:0 }}>
                {a.type==='move'?'⇄':a.type==='obs'?'✎':'●'}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--text-primary)' }}>{a.user}</div>
                <div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:1, lineHeight:1.5 }}>{a.text}</div>
              </div>
              <span style={{ fontSize:9, color:'var(--text-faint)', flexShrink:0 }}>{fmtD(a.date)}</span>
            </div>
          ))}
        </div>

        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
          <textarea value={novaObs} onChange={e => setNovaObs(e.target.value)} placeholder="Adicionar observação…"
            onKeyDown={e => { if (e.key==='Enter' && e.ctrlKey) adicionarObs(); }}
            style={{ width:'100%', display:'block', padding:'10px 14px', border:'none', outline:'none', resize:'vertical', minHeight:72, fontFamily:'var(--font)', fontSize:12, lineHeight:1.6, color:'var(--text-primary)', background:'var(--bg-card)', boxSizing:'border-box' }}/>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 14px', borderTop:'1px solid var(--border)', background:'rgba(0,0,0,.02)' }}>
            <span style={{ fontSize:10, color:'var(--text-faint)' }}>Ctrl+Enter para salvar</span>
            <button onClick={adicionarObs} disabled={!novaObs.trim()}
              style={{ padding:'6px 14px', borderRadius:7, border:'none', fontSize:12, fontWeight:600, cursor:novaObs.trim()?'pointer':'not-allowed', background:novaObs.trim()?pipeline.cor:'rgba(0,0,0,.06)', color:novaObs.trim()?'#fff':'var(--text-muted)' }}>
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Card do Kanban ───────────────────────────────────────────────────────────
function PipelineCard({ registro, estagio, pipeline, profile, onSelect, onMove, estagios, setDragId }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top:0, left:0 });
  const btnRef = useRef(null);
  const dias = diasNoEstagio(registro.estagio_entrada_at);
  const slaExcedido = estagio?.sla_dias && dias > estagio.sla_dias;
  const slaAtenção = estagio?.sla_dias && dias >= estagio.sla_dias * 0.8;

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => { if (!btnRef.current?.closest('[data-pmenu]')?.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  return (
    <>
      <div className="kcard" style={{ position:'relative', borderLeft:`3px solid ${estagio?.cor||pipeline.cor}` }}
        draggable onDragStart={() => setDragId(registro.id)}
        onClick={e => { if (!e.defaultPrevented) onSelect(registro.id); }}>
        <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', marginBottom:3, paddingRight:22 }}>{registro.nome_cliente}</div>
        {registro.cpf_cliente && <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3 }}>{registro.cpf_cliente}</div>}
        {registro.prefeitura && <div style={{ fontSize:9, color:'var(--text-muted)', marginBottom:3 }}>🏛 {registro.prefeitura}</div>}
        {registro.indicado_por_nome && <div style={{ fontSize:9, color:'#EC4899', marginBottom:3 }}>↗ {registro.indicado_por_nome}</div>}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4 }}>
          <span style={{ fontSize:9, color:'var(--text-faint)' }}>{fmtD(registro.created_at)}</span>
          {estagio?.sla_dias && (
            <span style={{ fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:99, background:slaExcedido?'rgba(239,68,68,.15)':slaAtenção?'rgba(245,158,11,.15)':'rgba(0,0,0,.05)', color:slaExcedido?'#EF4444':slaAtenção?'#F59E0B':'var(--text-faint)' }}>
              {dias}d {slaExcedido?'⚠':slaAtenção?'!':''}
            </span>
          )}
        </div>
        {registro.criado_por_nome && <div style={{ marginTop:5, paddingTop:5, borderTop:'1px solid var(--border)', fontSize:9, color:'var(--text-muted)' }}>{registro.criado_por_nome}</div>}
        <button ref={btnRef} onClick={e => { e.preventDefault(); e.stopPropagation(); const r = btnRef.current.getBoundingClientRect(); setMenuPos({ top:r.bottom+4, left:r.right-220 }); setMenuOpen(v => !v); }}
          style={{ position:'absolute', top:6, right:6, background:'rgba(0,0,0,.06)', border:'none', borderRadius:5, cursor:'pointer', width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'var(--text-muted)', padding:0 }}>⋯</button>
      </div>
      {menuOpen && ReactDOM.createPortal(
        <div data-pmenu="1" onMouseDown={e => e.stopPropagation()}
          style={{ position:'fixed', top:menuPos.top, left:Math.max(8,menuPos.left), zIndex:9999, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,.18)', minWidth:220, overflow:'hidden' }}>
          <div style={{ padding:'7px 12px', fontSize:9, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.08em', borderBottom:'1px solid var(--border)' }}>Mover para…</div>
          {estagios.filter(e => e.id !== registro.estagio_id).map(e => (
            <button key={e.id} onMouseDown={ev => { ev.stopPropagation(); onMove(registro.id, e.id); setMenuOpen(false); }}
              style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'7px 12px', background:'none', border:'none', cursor:'pointer', textAlign:'left', fontSize:12, color:'var(--text-primary)', fontFamily:'var(--font)' }}
              onMouseEnter={ev => ev.currentTarget.style.background='rgba(0,0,0,.04)'}
              onMouseLeave={ev => ev.currentTarget.style.background='none'}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:e.cor, flexShrink:0 }}/>{e.nome}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

// ─── Coluna do Kanban ─────────────────────────────────────────────────────────
function PipelineCol({ estagio, registros, pipeline, profile, onSelect, onMove, estagios, dragId, setDragId, collapsed, onToggle }) {
  const [over, setOver] = useState(false);
  const items = registros.filter(r => r.estagio_id === estagio.id);
  const slaCount = items.filter(r => estagio.sla_dias && diasNoEstagio(r.estagio_entrada_at) > estagio.sla_dias).length;

  return (
    <div style={{ minWidth:collapsed?44:170, width:collapsed?44:210, flexShrink:0, background:over?`${estagio.cor}08`:'rgba(0,0,0,.03)', border:`1px solid ${over?estagio.cor+'40':'var(--border)'}`, borderRadius:12, padding:'10px 8px', display:'flex', flexDirection:'column', transition:'all .2s' }}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={() => { setOver(false); if (dragId) onMove(dragId, estagio.id); setDragId(null); }}>
      {collapsed ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, cursor:'pointer', height:'100%', paddingTop:4 }} onClick={onToggle} title={`Expandir: ${estagio.nome}`}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:estagio.cor, marginTop:2 }}/>
          <span style={{ fontSize:10, fontWeight:700, background:estagio.bg, color:estagio.cor, borderRadius:99, padding:'2px 6px' }}>{items.length}</span>
          <span style={{ fontSize:9, color:'var(--text-faint)', writingMode:'vertical-rl', transform:'rotate(180deg)', marginTop:4, maxHeight:100, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{estagio.nome}</span>
        </div>
      ) : (
        <>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10, padding:'0 3px', flexShrink:0 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:estagio.cor, flexShrink:0 }}/>
            <span style={{ fontSize:11, fontWeight:600, color:'var(--text-secondary)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{estagio.nome}</span>
            <span style={{ fontSize:10, fontWeight:700, background:estagio.bg, color:estagio.cor, borderRadius:99, padding:'1px 6px' }}>{items.length}</span>
            {slaCount > 0 && <span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:99, background:'rgba(239,68,68,.12)', color:'#EF4444' }}>⚠{slaCount}</span>}
            <button onClick={onToggle} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-faint)', fontSize:12, padding:'0 2px' }}>‹</button>
          </div>
          {estagio.responsavel_role && (
            <div style={{ fontSize:9, padding:'2px 7px', borderRadius:99, background:`${ROLE_COLORS[estagio.responsavel_role]||'#888'}12`, color:ROLE_COLORS[estagio.responsavel_role]||'#888', fontWeight:700, marginBottom:8, alignSelf:'flex-start' }}>
              {ROLE_LABELS[estagio.responsavel_role]||estagio.responsavel_role}
            </div>
          )}
          {estagio.sla_dias && (
            <div style={{ fontSize:9, color:'var(--text-faint)', marginBottom:8 }}>SLA {estagio.sla_dias}d</div>
          )}
          <div style={{ flex:1, overflowY:'auto', minHeight:40, paddingRight:2, scrollbarWidth:'thin', scrollbarColor:'rgba(0,0,0,.1) transparent' }}>
            {items.map(r => (
              <PipelineCard key={r.id} registro={r} estagio={estagio} pipeline={pipeline} profile={profile}
                onSelect={onSelect} onMove={onMove} estagios={estagios} setDragId={setDragId}/>
            ))}
            {items.length === 0 && <div style={{ textAlign:'center', padding:'16px 0', fontSize:10, color:'var(--text-faint)' }}>Solte aqui</div>}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export function BKOPipelines({ profile, session, pipelineInicial = null }) {
  const [pipelines, setPipelines] = useState([]);
  const [pipelineSel, setPipelineSel] = useState(pipelineInicial);
  const [estagios, setEstagios] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingReg, setLoadingReg] = useState(false);
  const [novoOpen, setNovoOpen] = useState(false);
  const [selId, setSelId] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(new Set());
  const colsRef = useRef(null);

  const toggleCol = id => setCollapsed(prev => { const n = new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });

  // Carregar pipelines — se vier pipelineInicial (chamado do dropdown), usa direto sem tabs
  useEffect(() => {
    if (pipelineInicial) {
      setPipelines([pipelineInicial]);
      setLoading(false);
      return;
    }
    supabase.from('bko_pipelines').select('*').eq('ativo', true).order('ordem')
      .then(({ data }) => {
        setPipelines(data || []);
        if (data?.length > 0) setPipelineSel(data[0]);
        setLoading(false);
      });
  }, [pipelineInicial?.id]);

  // Carregar estágios e registros quando muda o pipeline
  useEffect(() => {
    if (!pipelineSel) return;
    setLoadingReg(true);
    Promise.all([
      supabase.from('bko_pipeline_estagios').select('*').eq('pipeline_id', pipelineSel.id).eq('ativo', true).order('ordem'),
      supabase.from('bko_pipeline_registros').select('*').eq('pipeline_id', pipelineSel.id).order('created_at', { ascending:false }).limit(500),
    ]).then(([{ data:e }, { data:r }]) => {
      setEstagios(e || []);
      setRegistros(r || []);
      setLoadingReg(false);
    });

    // Realtime
    const ch = supabase.channel(`pipeline_${pipelineSel.id}`)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'bko_pipeline_registros', filter:`pipeline_id=eq.${pipelineSel.id}` },
        p => setRegistros(prev => prev.find(r => r.id===p.new.id) ? prev : [p.new, ...prev]))
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'bko_pipeline_registros', filter:`pipeline_id=eq.${pipelineSel.id}` },
        p => setRegistros(prev => prev.map(r => r.id===p.new.id ? p.new : r)))
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [pipelineSel?.id]);

  const moverRegistro = useCallback(async (registroId, novoEstagioId) => {
    const reg = registros.find(r => r.id === registroId);
    const novoEstagio = estagios.find(e => e.id === novoEstagioId);
    if (!reg || !novoEstagio || reg.estagio_id === novoEstagioId) return;
    const novaActivity = { id:gid(), type:'move', date:TODAY, user:profile?.nome||'Usuário', text:`Movido para "${novoEstagio.nome}"` };
    const updated = { ...reg, estagio_id:novoEstagioId, estagio_entrada_at:new Date().toISOString(), activities:[...(reg.activities||[]), novaActivity] };
    setRegistros(prev => prev.map(r => r.id===registroId ? updated : r));
    await supabase.from('bko_pipeline_registros').update({ estagio_id:novoEstagioId, estagio_entrada_at:updated.estagio_entrada_at, activities:updated.activities }).eq('id', registroId);
  }, [registros, estagios, profile]);

  const atualizarRegistro = useCallback(updated => {
    setRegistros(prev => prev.map(r => r.id===updated.id ? updated : r));
  }, []);

  const adicionarRegistro = useCallback(reg => {
    setRegistros(prev => [reg, ...prev]);
  }, []);

  const registrosFiltrados = useMemo(() => {
    if (!search.trim()) return registros;
    const q = search.toLowerCase();
    return registros.filter(r => r.nome_cliente?.toLowerCase().includes(q) || r.cpf_cliente?.includes(q) || r.telefone?.includes(q));
  }, [registros, search]);

  const selecionado = registros.find(r => r.id === selId);

  // Métricas rápidas
  const totalAtivos = useMemo(() => registros.filter(r => {
    const e = estagios.find(x => x.id===r.estagio_id);
    return !e?.eh_final_sucesso && !e?.eh_final_falha;
  }).length, [registros, estagios]);

  const totalSlaExcedido = useMemo(() => registros.filter(r => {
    const e = estagios.find(x => x.id===r.estagio_id);
    return e?.sla_dias && diasNoEstagio(r.estagio_entrada_at) > e.sla_dias;
  }).length, [registros, estagios]);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', fontSize:13, color:'var(--text-muted)' }}>
      Carregando pipelines…
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0, overflow:'hidden' }}>

      {/* Header — título oculto quando chamado via pipelineInicial (dropdown) */}
      <div style={{ padding:'14px 20px 0', borderBottom:'1px solid var(--border)', background:'var(--bg-card)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, gap:12, flexWrap:'wrap' }}>
          {!pipelineInicial ? (
            <div>
              <div className="section-title" style={{ color: pipelineSel?.cor }}>
                {pipelineSel?.icone} {pipelineSel?.nome || 'Pipelines'}
              </div>
              <div className="section-sub">
                {totalAtivos} ativos
                {totalSlaExcedido > 0 && <span style={{ marginLeft:8, color:'#EF4444', fontWeight:700 }}>· ⚠ {totalSlaExcedido} com SLA excedido</span>}
              </div>
            </div>
          ) : (
            <div className="section-sub">
              {totalAtivos} ativos
              {totalSlaExcedido > 0 && <span style={{ marginLeft:8, color:'#EF4444', fontWeight:700 }}>· ⚠ {totalSlaExcedido} com SLA excedido</span>}
            </div>
          )}
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-faint)', fontSize:12 }}>⌕</span>
              <input className="inp" style={{ paddingLeft:30, height:34, fontSize:12, width:200 }} placeholder="Buscar…" value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
            <button className="btn" style={{ background:pipelineSel?.cor||'#3B5BDB', color:'#fff' }} onClick={() => setNovoOpen(true)}>
              + Novo
            </button>
          </div>
        </div>

        {/* Tabs de pipeline — ocultas quando chamado via dropdown (pipelineInicial) */}
        {!pipelineInicial && <div style={{ display:'flex', gap:2, overflowX:'auto', scrollbarWidth:'none' }}>
          {pipelines.map(p => (
            <button key={p.id} onClick={() => { setPipelineSel(p); setSearch(''); setSelId(null); }}
              style={{ padding:'8px 16px', fontSize:12, fontWeight:pipelineSel?.id===p.id?700:400, cursor:'pointer', border:'none', borderBottom:pipelineSel?.id===p.id?`2px solid ${p.cor}`:'2px solid transparent', background:'transparent', color:pipelineSel?.id===p.id?p.cor:'var(--text-muted)', whiteSpace:'nowrap', fontFamily:'var(--font)', transition:'all .15s', borderRadius:0 }}>
              {p.icone} {p.nome}
            </button>
          ))}
        </div>}
      </div>

      {/* Kanban */}
      <div style={{ display:'flex', flex:1, minHeight:0, overflow:'hidden', paddingRight:selecionado?490:0, transition:'padding-right .3s cubic-bezier(.4,0,.2,1)' }}>
        {loadingReg ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', flex:1, fontSize:13, color:'var(--text-muted)' }}>Carregando…</div>
        ) : (
          <div ref={colsRef} style={{ display:'flex', gap:7, overflowX:'auto', overflowY:'hidden', padding:'16px 20px', flex:1, minHeight:0, alignItems:'stretch', scrollbarWidth:'thin' }}>
            {estagios.map(e => (
              <PipelineCol key={e.id} estagio={e} registros={registrosFiltrados} pipeline={pipelineSel}
                profile={profile} onSelect={id => setSelId(id)} onMove={moverRegistro}
                estagios={estagios} dragId={dragId} setDragId={setDragId}
                collapsed={collapsed.has(e.id)} onToggle={() => toggleCol(e.id)}/>
            ))}
            {estagios.length === 0 && (
              <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, color:'var(--text-muted)' }}>
                Nenhum estágio configurado.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Painel de detalhe */}
      {selecionado && (
        <RegistroDetalhe
          registro={selecionado}
          pipeline={pipelineSel}
          estagios={estagios}
          profile={profile}
          onClose={() => setSelId(null)}
          onUpdate={atualizarRegistro}
        />
      )}

      {/* Modal novo registro */}
      {novoOpen && pipelineSel && (
        <NovoRegistroModal
          pipeline={pipelineSel}
          estagios={estagios}
          profile={profile}
          onClose={() => setNovoOpen(false)}
          onSave={adicionarRegistro}
        />
      )}
    </div>
  );
}