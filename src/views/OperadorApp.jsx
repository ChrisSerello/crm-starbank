import { useState, useMemo, useCallback } from 'react';
import { supabase } from '../supabase';
import { STAGES, DOC_STATUS, INDICATION_TYPES } from '../constants';
import { sinceD, fmtD, stg, gid, TODAY } from '../utils';
import { Avatar, StageTag, AlertDot } from '../components/shared';

// ─── SIDEBAR DO OPERADOR ──────────────────────────────────────────────────────

function OperadorSidebar({ view, setView, profile, onLogout, onAlterarSenha }) {
  const items = [
    { id: 'dashboard', icon: '◈', label: 'Meu Dashboard' },
    { id: 'pipeline',  icon: '⊞', label: 'Meu Pipeline'  },
    { id: 'leads',     icon: '≡', label: 'Meus Leads'    },
  ];
  return (
    <div style={{width:228,background:"var(--bg-surface)",borderRight:"1px solid var(--border)",display:"flex",flexDirection:"column",flexShrink:0,height:"100vh",position:"sticky",top:0}}>
      <div style={{padding:"20px 18px 16px",borderBottom:"1px solid var(--border)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,borderRadius:10,background:"linear-gradient(135deg,#1A9E8A 0%,#4DC4B0 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:"0 4px 14px rgba(26,158,138,.3)"}}>◈</div>
          <div>
            <div style={{fontFamily:"var(--font-display)",fontSize:15,fontWeight:600,color:"var(--text-primary)"}}>CRM</div>
            <div style={{fontSize:10,fontWeight:700,color:"var(--teal)",letterSpacing:".09em",textTransform:"uppercase"}}>Operador</div>
          </div>
        </div>
      </div>
      <nav style={{padding:"10px 8px",flex:1}}>
        <div style={{fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".09em",padding:"10px 8px 6px"}}>Menu</div>
        {items.map(it=>(
          <button key={it.id}
            className={`nav-item ${view===it.id?"active":""}`}
            onClick={()=>setView(it.id)}
          >
            <span style={{fontSize:15,width:20,textAlign:"center"}}>{it.icon}</span>{it.label}
          </button>
        ))}
      </nav>
      <div style={{padding:"13px 15px",borderBottom:"1px solid var(--border)",marginBottom:0}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <Avatar name={profile?.nome||"O"} size={30} color="#1A9E8A"/>
          <div style={{minWidth:0}}>
            <div style={{fontSize:12,fontWeight:600,color:"var(--text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{profile?.nome||"Operador"}</div>
            <div style={{fontSize:10,fontWeight:700,color:"var(--teal)",textTransform:"uppercase",letterSpacing:".06em"}}>Operador</div>
          </div>
          <div style={{marginLeft:"auto",width:7,height:7,flexShrink:0,borderRadius:"50%",background:"var(--success)",boxShadow:"0 0 5px var(--success)"}}/>
        </div>
        <button onClick={onAlterarSenha} style={{marginTop:8,width:"100%",padding:"7px 0",borderRadius:7,background:"rgba(90,70,50,.06)",border:"1px solid var(--border)",color:"var(--text-muted)",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"var(--font)"}}>🔑 Alterar senha</button>
        <button onClick={onLogout} style={{marginTop:6,width:"100%",padding:"7px 0",borderRadius:7,background:"rgba(196,66,58,.08)",border:"1px solid rgba(196,66,58,.18)",color:"var(--danger)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"var(--font)"}}>Sair da conta</button>
      </div>
    </div>
  );
}

// ─── DASHBOARD DO OPERADOR ────────────────────────────────────────────────────

function OperadorDashboard({ leads, profile }) {
  const nome = profile?.nome || '';
  const meus = leads.filter(l => l.operadorRepassado === nome);
  const total = meus.length;
  const ganhos = meus.filter(l => l.statusComercial === 'ganho' || l.statusComercial === 'pedido').length;
  const emNeg = meus.filter(l => l.statusComercial === 'em_negociacao').length;
  const frios = meus.filter(l => sinceD(l.ultimoContato) >= 7).length;
  const taxa = total > 0 ? Math.round(ganhos / total * 100) : 0;
  const byStage = STAGES.map(s => ({ ...s, count: meus.filter(l => l.statusComercial === s.id).length }));
  const recent = meus.flatMap(l => (l.activities||[]).map(a => ({ ...a, leadName: l.nomeIndicado }))).sort((a,b) => (b.date||'').localeCompare(a.date||'')).slice(0, 8);

  const StatCard = ({ label, value, sub, color, icon }) => (
    <div className="mcard fu" style={{position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:color,filter:"blur(32px)",opacity:.18,pointerEvents:"none"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <span className="eyebrow">{label}</span>
        <div style={{width:32,height:32,borderRadius:9,background:`${color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,border:`1px solid ${color}25`}}>{icon}</div>
      </div>
      <div style={{fontSize:30,fontWeight:600,fontFamily:"var(--font-display)",color:"var(--text-primary)",lineHeight:1}}>{value}</div>
      {sub && <div style={{fontSize:12,color:"var(--text-muted)",marginTop:6}}>{sub}</div>}
    </div>
  );

  return (
    <div style={{padding:"28px 32px"}}>
      <div className="fu" style={{marginBottom:6}}>
        <div className="section-title">Meu Dashboard</div>
        <div className="section-sub">Leads atribuídos a você · {fmtD(TODAY)}</div>
      </div>

      {total === 0 ? (
        <div className="card fu1" style={{padding:"48px 32px",textAlign:"center",marginTop:24}}>
          <div style={{fontSize:36,marginBottom:12}}>📋</div>
          <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,color:"var(--text-primary)",marginBottom:8}}>Nenhum lead atribuído ainda</div>
          <div style={{fontSize:13,color:"var(--text-muted)"}}>Quando a equipe pós-venda repassar leads para você, eles aparecerão aqui.</div>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"1fr 360px",gap:20,marginTop:20}}>

          {/* Coluna esquerda */}
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14,marginBottom:20}}>
              <StatCard label="Meus leads"      value={total}  sub="Total atribuído"       color="#1A9E8A" icon="◈"/>
              <StatCard label="Convertidos"     value={ganhos} sub={`${taxa}% conversão`}  color="#1E8F5E" icon="✓"/>
              <StatCard label="Em negociação"   value={emNeg}  sub="Estágio ativo"          color="#5B4FE8" icon="⟳"/>
              <StatCard label="Leads frios"     value={frios}  sub="Sem contato +7 dias"    color="#C4423A" icon="❄"/>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              {/* Pipeline por estágio */}
              <div className="card fu1" style={{padding:"18px 20px"}}>
                <div className="eyebrow" style={{marginBottom:14}}>Pipeline por estágio</div>
                {byStage.map(s => (
                  <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:s.color,flexShrink:0}}/>
                    <div style={{flex:1,fontSize:12,color:"var(--text-secondary)"}}>{s.label}</div>
                    <div style={{width:80,height:6,background:"rgba(90,70,50,.1)",borderRadius:99,overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:99,background:s.color,width:`${Math.max(s.count/Math.max(...byStage.map(x=>x.count),1)*100,0)}%`,transition:"width .6s"}}/>
                    </div>
                    <div style={{fontSize:12,fontWeight:600,color:"var(--text-primary)",width:20,textAlign:"right"}}>{s.count}</div>
                  </div>
                ))}
              </div>

              {/* Atividade recente */}
              <div className="card fu2" style={{padding:"18px 20px"}}>
                <div className="eyebrow" style={{marginBottom:14}}>Atividade recente</div>
                {recent.length === 0 ? (
                  <div style={{fontSize:12,color:"var(--text-muted)"}}>Nenhuma atividade ainda.</div>
                ) : recent.map((a,i) => (
                  <div key={a.id||i} style={{display:"flex",gap:10,padding:"7px 0",borderBottom:i<recent.length-1?"1px solid var(--border)":"none"}}>
                    <div style={{width:28,height:28,borderRadius:8,background:"var(--accent-dim)",color:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0}}>⇄</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:"var(--text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.leadName}</div>
                      <div style={{fontSize:11,color:"var(--text-muted)",marginTop:1}}>{a.text}</div>
                    </div>
                    <div style={{fontSize:10,color:"var(--text-faint)",flexShrink:0}}>{fmtD(a.date)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna direita — Leads que precisam de atenção */}
          <div style={{display:"flex",flexDirection:"column",gap:14}}>

            {/* Sem contato +7 dias */}
            {(()=>{
              const frios7 = meus.filter(l=>sinceD(l.ultimoContato)>=7).slice(0,5);
              return(
                <div className="card fu1" style={{padding:"16px 18px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:"var(--danger)",boxShadow:"0 0 5px var(--danger)"}}/>
                    <div className="eyebrow" style={{color:"var(--danger)"}}>Sem contato +7 dias</div>
                    <span style={{marginLeft:"auto",fontSize:11,fontWeight:700,background:"var(--danger-dim)",color:"var(--danger)",borderRadius:99,padding:"1px 8px"}}>{meus.filter(l=>sinceD(l.ultimoContato)>=7).length}</span>
                  </div>
                  {frios7.length===0?(
                    <div style={{fontSize:12,color:"var(--success)",display:"flex",alignItems:"center",gap:6}}>✓ Nenhum lead frio. Bom trabalho!</div>
                  ):frios7.map((l,i)=>(
                    <div key={l.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<frios7.length-1?"1px solid var(--border)":"none"}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600,color:"var(--text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.nomeIndicado}</div>
                        <div style={{fontSize:11,color:"var(--text-muted)"}}>{l.orgaoPrefeitura}</div>
                      </div>
                      <span style={{fontSize:11,fontWeight:700,color:"var(--danger)",flexShrink:0}}>{sinceD(l.ultimoContato)}d</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Documentos pendentes */}
            {(()=>{
              const docPend = meus.filter(l=>l.documentoStatus==="Solicitado"||l.documentoStatus==="Recebido").slice(0,5);
              return(
                <div className="card fu2" style={{padding:"16px 18px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:"var(--amber)",boxShadow:"0 0 5px var(--amber)"}}/>
                    <div className="eyebrow" style={{color:"var(--amber)"}}>Documentos pendentes</div>
                    <span style={{marginLeft:"auto",fontSize:11,fontWeight:700,background:"var(--amber-dim)",color:"var(--amber)",borderRadius:99,padding:"1px 8px"}}>{meus.filter(l=>l.documentoStatus==="Solicitado"||l.documentoStatus==="Recebido").length}</span>
                  </div>
                  {docPend.length===0?(
                    <div style={{fontSize:12,color:"var(--success)",display:"flex",alignItems:"center",gap:6}}>✓ Documentação em dia!</div>
                  ):docPend.map((l,i)=>(
                    <div key={l.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<docPend.length-1?"1px solid var(--border)":"none"}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600,color:"var(--text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.nomeIndicado}</div>
                        <div style={{fontSize:11,color:"var(--text-muted)"}}>{l.orgaoPrefeitura}</div>
                      </div>
                      <span style={{fontSize:11,fontWeight:600,color:"var(--amber)",flexShrink:0}}>{l.documentoStatus}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Em negociação */}
            {(()=>{
              const negoc = meus.filter(l=>l.statusComercial==="em_negociacao").slice(0,5);
              return(
                <div className="card fu3" style={{padding:"16px 18px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:"var(--accent)",boxShadow:"0 0 5px var(--accent)"}}/>
                    <div className="eyebrow" style={{color:"var(--accent)"}}>Em negociação ⚡</div>
                    <span style={{marginLeft:"auto",fontSize:11,fontWeight:700,background:"var(--accent-dim)",color:"var(--accent)",borderRadius:99,padding:"1px 8px"}}>{meus.filter(l=>l.statusComercial==="em_negociacao").length}</span>
                  </div>
                  {negoc.length===0?(
                    <div style={{fontSize:12,color:"var(--text-muted)"}}>Nenhum lead em negociação.</div>
                  ):negoc.map((l,i)=>(
                    <div key={l.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<negoc.length-1?"1px solid var(--border)":"none"}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600,color:"var(--text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.nomeIndicado}</div>
                        <div style={{fontSize:11,color:"var(--text-muted)"}}>{l.orgaoPrefeitura}</div>
                      </div>
                      <span style={{fontSize:11,color:"var(--text-faint)",flexShrink:0}}>{fmtD(l.ultimoContato)}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

          </div>
        </div>
      )}
    </div>
  );
}

// ─── PIPELINE DO OPERADOR ─────────────────────────────────────────────────────

function OperadorKanban({ leads, profile, onSelect, onMove }) {
  const nome = profile?.nome || '';
  const meus = leads.filter(l => l.operadorRepassado === nome);
  const [dragId, setDragId] = useState(null);

  return (
    <div style={{padding:"28px 32px",overflowX:"auto"}}>
      <div className="fu" style={{marginBottom:20}}>
        <div className="section-title">Meu Pipeline</div>
        <div className="section-sub">{meus.length} leads atribuídos a você</div>
      </div>
      {meus.length === 0 ? (
        <div className="card" style={{padding:"48px 32px",textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:12}}>📋</div>
          <div style={{fontSize:14,color:"var(--text-muted)"}}>Nenhum lead atribuído a você ainda.</div>
        </div>
      ) : (
        <div style={{display:"flex",gap:10,alignItems:"flex-start",minWidth:"max-content",paddingBottom:16}}>
          {STAGES.map(s => {
            const sl = meus.filter(l => l.statusComercial === s.id);
            const [over, setOver] = useState(false);
            return (
              <div key={s.id} className={`kcol ${over?"dover":""}`}
                onDragOver={e=>{e.preventDefault();setOver(true)}}
                onDragLeave={()=>setOver(false)}
                onDrop={()=>{setOver(false);if(dragId)onMove(dragId,s.id);setDragId(null);}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:11,padding:"0 3px"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:s.color,flexShrink:0}}/>
                  <span style={{fontSize:12,fontWeight:600,color:"var(--text-secondary)",flex:1}}>{s.label}</span>
                  <span style={{fontSize:11,fontWeight:700,background:s.bg,color:s.color,borderRadius:99,padding:"1px 6px"}}>{sl.length}</span>
                </div>
                <div style={{minHeight:44}}>
                  {sl.map(l => (
                    <div key={l.id} className="kcard fu" draggable
                      onDragStart={()=>setDragId(l.id)}
                      onClick={()=>onSelect(l.id)}
                      style={{position:"relative",zIndex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:"var(--text-primary)",lineHeight:1.3,marginBottom:6}}>{l.nomeIndicado}</div>
                      <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:8}}>{l.orgaoPrefeitura}</div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:10,color:"var(--text-faint)"}}>{fmtD(l.ultimoContato)}</span>
                        <span style={{fontSize:10,fontWeight:600,color:l.documentoStatus==="Aprovado"?"var(--success)":l.documentoStatus==="Não solicitado"?"var(--text-faint)":"var(--amber)"}}>{l.documentoStatus}</span>
                      </div>
                    </div>
                  ))}
                  {sl.length===0&&<div style={{textAlign:"center",padding:"18px 0",fontSize:11,color:"var(--text-faint)"}}>Solte aqui</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── LEADS TABLE DO OPERADOR ──────────────────────────────────────────────────

function OperadorLeads({ leads, profile, onSelect }) {
  const nome = profile?.nome || '';
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [page, setPage] = useState(1);
  const PER = 50;

  const meus = useMemo(() => {
    return leads.filter(l => {
      if (l.operadorRepassado !== nome) return false;
      if (stage && l.statusComercial !== stage) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!l.nomeIndicado?.toLowerCase().includes(s) && !l.cpfIndicado?.includes(s) && !l.orgaoPrefeitura?.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [leads, nome, search, stage]);

  const total = Math.max(1, Math.ceil(meus.length / PER));
  const paged = meus.slice((page-1)*PER, page*PER);

  return (
    <div style={{padding:"28px 32px"}}>
      <div className="fu" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20}}>
        <div>
          <div className="section-title">Meus Leads</div>
          <div className="section-sub">{meus.length} leads atribuídos a você{total>1?` · Pág ${page}/${total}`:""}</div>
        </div>
      </div>

      <div className="fu1" style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        <div className="search-wrap" style={{maxWidth:320}}>
          <span className="search-icon">⌕</span>
          <input className="inp" placeholder="Buscar por nome, CPF ou órgão…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
        </div>
        <select className="sel" style={{width:168}} value={stage} onChange={e=>{setStage(e.target.value);setPage(1);}}>
          <option value="">Todos os estágios</option>
          {STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      <div className="fu2 card" style={{overflow:"hidden",marginBottom:16}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{background:"rgba(90,70,50,.04)",borderBottom:"1px solid var(--border)"}}>
                {["Nome / CPF","Órgão","Estágio","Documento","Último contato",""].map(h=>(
                  <th key={h} style={{padding:"11px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".08em",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map(l => (
                <tr key={l.id} className="trow" onClick={()=>onSelect(l.id)}>
                  <td style={{padding:"12px 14px"}}><div style={{fontWeight:600}}>{l.nomeIndicado}</div><div style={{fontSize:11,color:"var(--text-muted)",marginTop:1}}>{l.cpfIndicado}</div></td>
                  <td style={{padding:"12px 14px",color:"var(--text-secondary)",fontSize:12}}>{l.orgaoPrefeitura}</td>
                  <td style={{padding:"12px 14px"}}><StageTag stageId={l.statusComercial}/></td>
                  <td style={{padding:"12px 14px"}}><span style={{fontSize:11,fontWeight:600,color:l.documentoStatus==="Aprovado"?"var(--success)":l.documentoStatus==="Não solicitado"?"var(--text-faint)":"var(--amber)"}}>{l.documentoStatus}</span></td>
                  <td style={{padding:"12px 14px",fontSize:12,color:"var(--text-secondary)"}}>{fmtD(l.ultimoContato)}</td>
                  <td style={{padding:"12px 14px",color:"var(--text-muted)",fontSize:16}}>›</td>
                </tr>
              ))}
              {paged.length===0&&<tr><td colSpan={6} style={{padding:"40px 0",textAlign:"center",color:"var(--text-muted)",fontSize:13}}>Nenhum lead encontrado</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {total > 1 && (
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <button className="btn btn-ghost" style={{padding:"6px 12px",fontSize:12}} onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>‹ Anterior</button>
          {Array.from({length:total},(_,i)=>i+1).map(p=>(
            <button key={p} onClick={()=>setPage(p)} style={{width:32,height:32,borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:p===page?600:400,background:p===page?"var(--teal)":"transparent",color:p===page?"#fff":"var(--text-secondary)"}}>{p}</button>
          ))}
          <button className="btn btn-ghost" style={{padding:"6px 12px",fontSize:12}} onClick={()=>setPage(p=>Math.min(total,p+1))} disabled={page===total}>Próxima ›</button>
        </div>
      )}
    </div>
  );
}

// ─── PAINEL DE DETALHES DO OPERADOR ──────────────────────────────────────────

function OperadorDetail({ lead, profile, dispatch, onClose }) {
  const [tab, setTab] = useState('info');
  const [note, setNote] = useState('');
  const [es, setEs] = useState(lead.statusComercial);
  const [ed, setEd] = useState(lead.documentoStatus);
  const [docs, setDocs] = useState(lead.documentos||[]);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);
  const days = sinceD(lead.ultimoContato);

  const save = () => {
    const updated = { ...lead, documentoStatus: ed, documentos: docs };
    if (es !== lead.statusComercial) dispatch({ type:'MOVE', lid:lead.id, st:es });
    dispatch({ type:'UPD', lead: updated });
    onClose();
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setUploadMsg({type:'error',text:'Arquivo muito grande. Máximo 10MB.'}); return; }

    setUploading(true);
    setUploadMsg(null);
    const path = `leads/${lead.id}/${Date.now()}_${file.name}`;

    const { error } = await supabase.storage.from('documentos').upload(path, file);
    if (error) {
      setUploadMsg({type:'error', text:'Erro ao enviar arquivo. Tente novamente.'});
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('documentos').getPublicUrl(path);
    const novoDoc = { nome: file.name, path, url: publicUrl, data: TODAY, enviadoPor: profile?.nome||'Operador' };
    const novosDoc = [...docs, novoDoc];
    setDocs(novosDoc);

    // Salva imediatamente no lead
    dispatch({ type:'UPD', lead: { ...lead, documentos: novosDoc, documentoStatus: ed } });
    setUploadMsg({type:'success', text:`"${file.name}" enviado com sucesso!`});
    setUploading(false);
    e.target.value = '';
  };

  const handleDelete = async (doc) => {
    if (!confirm(`Remover "${doc.nome}"?`)) return;
    await supabase.storage.from('documentos').remove([doc.path]);
    const novosDoc = docs.filter(d => d.path !== doc.path);
    setDocs(novosDoc);
    dispatch({ type:'UPD', lead: { ...lead, documentos: novosDoc } });
  };

  const getSignedUrl = async (path) => {
    const { data } = await supabase.storage.from('documentos').createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const fileIcon = (nome) => {
    const ext = nome.split('.').pop().toLowerCase();
    if (['jpg','jpeg','png','gif','webp'].includes(ext)) return '🖼️';
    if (ext === 'pdf') return '📄';
    if (['doc','docx'].includes(ext)) return '📝';
    if (['xls','xlsx'].includes(ext)) return '📊';
    return '📎';
  };

  return (
    <div className="spanel">
      <div style={{padding:"18px 22px 14px",borderBottom:"1px solid var(--border)",background:"var(--bg-card)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <div style={{fontSize:16,fontWeight:600,color:"var(--text-primary)",fontFamily:"var(--font-display)"}}>{lead.nomeIndicado}</div>
              <AlertDot days={days}/>
            </div>
            <div style={{fontSize:12,color:"var(--text-muted)"}}>{lead.orgaoPrefeitura} · {lead.cpfIndicado}</div>
            <div style={{marginTop:8}}><StageTag stageId={lead.statusComercial}/></div>
          </div>
          <button onClick={onClose} style={{background:"rgba(90,70,50,.08)",border:"1px solid var(--border-mid)",borderRadius:8,color:"var(--text-secondary)",cursor:"pointer",width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>×</button>
        </div>
      </div>

      <div style={{display:"flex",borderBottom:"1px solid var(--border)",background:"var(--bg-card)"}}>
        {[["info","Informações"],["docs","Documentos"],["activity","Atividades"]].map(([id,lb])=>(
          <button key={id} className={`ptab ${tab===id?"on":""}`} onClick={()=>setTab(id)}>{lb}</button>
        ))}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"18px 22px"}}>
        {tab==="info" && (
          <div>
            <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:10,overflow:"hidden",marginBottom:16}}>
              {[
                ["Telefone", lead.telefone||"—"],
                ["Órgão", lead.orgaoPrefeitura||"—"],
                ["CPF", lead.cpfIndicado||"—"],
                ["Tipo indicação", INDICATION_TYPES.find(t=>t.id===lead.statusIndicacao)?.label||"—"],
                ["Observações", lead.observacoes||"—"],
                ["Último contato", fmtD(lead.ultimoContato)],
              ].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"9px 12px",borderBottom:"1px solid var(--border)"}}>
                  <span style={{fontSize:12,color:"var(--text-muted)"}}>{k}</span>
                  <span style={{fontSize:12,color:"var(--text-primary)",fontWeight:500,textAlign:"right",maxWidth:"60%"}}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{borderTop:"1px solid var(--border)",paddingTop:16}}>
              <div className="eyebrow" style={{marginBottom:10}}>Atualizar status</div>
              <label style={{fontSize:12,color:"var(--text-muted)",display:"block",marginBottom:5}}>Estágio</label>
              <select className="sel" value={es} onChange={e=>setEs(e.target.value)} style={{marginBottom:10}}>
                {STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <label style={{fontSize:12,color:"var(--text-muted)",display:"block",marginBottom:5}}>Documento</label>
              <select className="sel" value={ed} onChange={e=>setEd(e.target.value)} style={{marginBottom:14}}>
                {DOC_STATUS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <button className="btn btn-primary" style={{width:"100%"}} onClick={save}>Salvar alterações</button>
            </div>
          </div>
        )}

        {tab==="docs" && (
          <div>
            {/* Upload area */}
            <div style={{marginBottom:16}}>
              <div className="eyebrow" style={{marginBottom:10}}>Enviar documento</div>
              <label style={{
                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                gap:8,padding:"24px 16px",borderRadius:12,cursor:"pointer",
                border:"2px dashed var(--border-mid)",background:"rgba(90,70,50,.03)",
                transition:"all .15s",
              }}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(91,79,232,.05)";e.currentTarget.style.borderColor="var(--accent)";}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(90,70,50,.03)";e.currentTarget.style.borderColor="var(--border-mid)";}}
              >
                <input type="file" style={{display:"none"}} onChange={handleUpload} disabled={uploading}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"/>
                <div style={{fontSize:28}}>{uploading?"⏳":"📤"}</div>
                <div style={{fontSize:13,fontWeight:600,color:"var(--text-primary)"}}>
                  {uploading?"Enviando…":"Clique para enviar arquivo"}
                </div>
                <div style={{fontSize:11,color:"var(--text-muted)"}}>PDF, Word, Excel, Imagens · Máx. 10MB</div>
              </label>

              {uploadMsg&&(
                <div style={{
                  marginTop:10,padding:"9px 12px",borderRadius:8,fontSize:12,fontWeight:500,
                  background:uploadMsg.type==='success'?"var(--success-dim)":"var(--danger-dim)",
                  color:uploadMsg.type==='success'?"var(--success)":"var(--danger)",
                  border:`1px solid ${uploadMsg.type==='success'?"rgba(30,143,94,.2)":"rgba(196,66,58,.2)"}`,
                }}>
                  {uploadMsg.type==='success'?'✓':'⚠'} {uploadMsg.text}
                </div>
              )}
            </div>

            {/* Documentos enviados */}
            <div className="eyebrow" style={{marginBottom:10}}>
              Documentos ({docs.length})
            </div>
            {docs.length===0?(
              <div style={{textAlign:"center",padding:"32px 0",fontSize:13,color:"var(--text-muted)"}}>
                <div style={{fontSize:28,marginBottom:8}}>📁</div>
                Nenhum documento enviado ainda.
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {docs.map((doc,i)=>(
                  <div key={i} style={{
                    display:"flex",alignItems:"center",gap:10,padding:"11px 14px",
                    background:"var(--bg-card)",border:"1px solid var(--border)",
                    borderRadius:10,transition:"all .15s",
                  }}>
                    <div style={{fontSize:22,flexShrink:0}}>{fileIcon(doc.nome)}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:"var(--text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{doc.nome}</div>
                      <div style={{fontSize:11,color:"var(--text-muted)",marginTop:1}}>
                        {fmtD(doc.data)} · {doc.enviadoPor}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,flexShrink:0}}>
                      <button className="btn btn-ghost" style={{padding:"5px 10px",fontSize:11}}
                        onClick={()=>getSignedUrl(doc.path)}>
                        ↓ Abrir
                      </button>
                      <button onClick={()=>handleDelete(doc)} style={{
                        padding:"5px 10px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",
                        background:"var(--danger-dim)",color:"var(--danger)",
                        border:"1px solid rgba(196,66,58,.2)",
                      }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab==="activity" && (
          <div>
            <div style={{marginBottom:16}}>
              <textarea className="inp" value={note} onChange={e=>setNote(e.target.value)}
                placeholder="Registrar ligação, reunião, observação…"
                style={{resize:"vertical",minHeight:70,fontFamily:"var(--font)",lineHeight:1.5,marginBottom:8}}/>
              <button className="btn btn-primary" style={{width:"100%"}} onClick={()=>{
                if(!note.trim()) return;
                dispatch({type:"NOTE",lid:lead.id,act:{id:gid(),type:"note",date:TODAY,user:profile?.nome||"Operador",text:note.trim()}});
                setNote('');
              }}>+ Registrar atividade</button>
            </div>
            {[...(lead.activities||[])].reverse().map((a,i)=>(
              <div key={a.id||i} style={{display:"flex",gap:10,marginBottom:8}}>
                <div style={{width:30,height:30,borderRadius:9,background:"var(--accent-dim)",color:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>
                  {a.type==="stage_change"?"⇄":a.type==="contact"?"☎":"✎"}
                </div>
                <div style={{flex:1,paddingBottom:10,borderBottom:"1px solid var(--border)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                    <span style={{fontSize:12,fontWeight:600}}>{a.user}</span>
                    <span style={{fontSize:11,color:"var(--text-faint)"}}>{fmtD(a.date)}</span>
                  </div>
                  <div style={{fontSize:12,color:"var(--text-secondary)",lineHeight:1.5}}>{a.text}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── APP DO OPERADOR (ENTRY POINT) ────────────────────────────────────────────

export function OperadorApp({ leads, profile, dispatch, onLogout, onAlterarSenha, session }) {
  const [view, setView] = useState('dashboard');
  const [sel, setSel] = useState(null);
  const selected = leads.find(l => l.id === sel);

  const auditLog = useCallback((action, leadId, leadNome, details) => {
    if (!session || !profile) return;
    supabase.from('audit_log').insert({
      user_id: session.user.id,
      user_nome: profile.nome,
      action, lead_id: leadId||null, lead_nome: leadNome||'—', detalhes: details||'',
    }).then(({error})=>{
      if(error) console.error('❌ Audit log error (operador):', error.message, error.details, error.hint);
      else console.log('✅ Audit log saved (operador):', action, leadNome);
    });
  }, [session, profile]);

  const handleMove = (lid, st) => {
    const lead = leads.find(l => l.id === lid);
    dispatch({ type:'MOVE', lid, st });
    auditLog('Moveu lead no pipeline', lid, lead?.nomeIndicado, `Estágio → "${stg(st).label}"`);
  };

  return (
    <div style={{display:"flex",minHeight:"100vh",background:"var(--bg-base)",fontFamily:"var(--font)"}}>
      <OperadorSidebar
        view={view}
        setView={v=>{setView(v);setSel(null);}}
        profile={profile}
        onLogout={onLogout}
        onAlterarSenha={onAlterarSenha}
      />
      <main style={{flex:1,minWidth:0,overflowY:"auto",paddingRight:selected?490:0,transition:"padding-right .3s cubic-bezier(.4,0,.2,1)"}}>
        {view==="dashboard" && <OperadorDashboard leads={leads} profile={profile}/>}
        {view==="pipeline"  && <OperadorKanban leads={leads} profile={profile} onSelect={setSel} onMove={handleMove}/>}
        {view==="leads"     && <OperadorLeads leads={leads} profile={profile} onSelect={setSel}/>}
      </main>
      {selected && (
        <OperadorDetail
          key={selected.id}
          lead={selected}
          profile={profile}
          dispatch={dispatch}
          onClose={()=>setSel(null)}
        />
      )}
    </div>
  );
}