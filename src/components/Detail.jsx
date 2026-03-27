import { useState } from 'react';
import { STAGES, OPERATORS, EQUIPES, OPERADORES_REPASSADOS, INDICATION_TYPES, DOC_STATUS } from '../constants';
import { sinceD, fmtD, stg, opr, gid, TODAY } from '../utils';
import { Avatar, StageTag, AlertDot } from './shared';

export function Detail({lead,dispatch}){
  const [tab,setTab]=useState("info");
  const [note,setNote]=useState("");
  const [es,setEs]=useState(lead.statusComercial);
  const [ed,setEd]=useState(lead.documentoStatus);
  const [eq,setEq]=useState(lead.equipe||"");
  const [or,setOr]=useState(lead.operadorRepassado||"");
  const [resp,setResp]=useState(lead.responsavelId||"");
  const o=opr(lead.responsavelId);
  const days=sinceD(lead.ultimoContato);
  const save=()=>{
    const updated={...lead,documentoStatus:ed,equipe:eq,operadorRepassado:or,responsavelId:resp};
    if(es!==lead.statusComercial)dispatch({type:"MOVE",lid:lead.id,st:es});
    dispatch({type:"UPD",lead:updated});
  };
  const AS={stage_change:{ic:"⇄",bg:"var(--accent-dim)",cl:"var(--accent)"},contact:{ic:"☎",bg:"var(--success-dim)",cl:"var(--success)"},doc:{ic:"📄",bg:"var(--amber-dim)",cl:"var(--amber)"},note:{ic:"✎",bg:"rgba(90,70,50,.07)",cl:"var(--text-muted)"}};
  return(
    <div className="spanel">
      <div style={{padding:"18px 22px 14px",borderBottom:"1px solid var(--border)",background:"var(--bg-card)"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
          <Avatar name={lead.nomeIndicado} size={44} color="#5B4FE8"/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{fontSize:16,fontWeight:600,color:"var(--text-primary)",fontFamily:"var(--font-display)",letterSpacing:"-.01em"}}>{lead.nomeIndicado}</div>
              <AlertDot days={days}/>
            </div>
            <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>{lead.orgaoPrefeitura} · {lead.cpfIndicado}</div>
            <div style={{marginTop:8}}><StageTag stageId={lead.statusComercial}/></div>
          </div>
          <button onClick={()=>dispatch({type:"CLOSE"})} style={{background:"rgba(90,70,50,.08)",border:"1px solid var(--border-mid)",borderRadius:8,color:"var(--text-secondary)",cursor:"pointer",width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>×</button>
        </div>
      </div>
      <div style={{display:"flex",borderBottom:"1px solid var(--border)",background:"var(--bg-card)"}}>
        {[["info","Informações"],["activity","Atividades"],["docs","Documentos"]].map(([id,lb])=>(
          <button key={id} className={`ptab ${tab===id?"on":""}`} onClick={()=>setTab(id)}>{lb}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"18px 22px"}}>
        {tab==="info"&&(
          <div>
            <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:10,overflow:"hidden",marginBottom:16}}>
              {[["Telefone",lead.telefone||"—"],["Quem indicou",lead.nomeQuemIndicou||<em style={{color:"var(--text-faint)"}}>Não informado</em>],["Tipo indicação",INDICATION_TYPES.find(t=>t.id===lead.statusIndicacao)?.label||"—"],["Perfil",lead.perfilCliente||"—"],["Secretaria",lead.secretariaAtuacao||"—"],["Responsável",opr(lead.responsavelId)?.name||<em style={{color:"var(--text-faint)"}}>Não definido</em>],["Equipe",lead.equipe||<em style={{color:"var(--text-faint)"}}>Não definida</em>],["Op. Repassado",lead.operadorRepassado||<em style={{color:"var(--text-faint)"}}>Não definido</em>],["Data entrada",fmtD(lead.dataEntrada)],["Atribuído em",fmtD(lead.dataAtribuicao)],["Último contato",fmtD(lead.ultimoContato)]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"9px 12px",borderBottom:"1px solid var(--border)"}}>
                  <span style={{fontSize:12,color:"var(--text-muted)"}}>{k}</span>
                  <span style={{fontSize:12,color:"var(--text-primary)",fontWeight:500,textAlign:"right",maxWidth:"58%"}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{marginBottom:14}}><div className="eyebrow" style={{marginBottom:8}}>Produtos de interesse</div><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{lead.produtosInteresse.map(p=><span key={p} className="prod-pill">{p}</span>)}</div></div>
            {o&&<div style={{padding:"11px 13px",background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:10,display:"flex",alignItems:"center",gap:10,marginBottom:14}}><Avatar name={o.name} size={34} color={o.color}/><div><div style={{fontSize:13,fontWeight:600}}>{o.name}</div><div style={{fontSize:11,color:"var(--text-muted)"}}>{o.team==="mesa"?"Mesa comercial":"Time pós-venda"}</div></div></div>}
            {lead.observacoes&&<div style={{padding:"10px 12px",background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:8,fontSize:12,color:"var(--text-secondary)",lineHeight:1.6,marginBottom:14}}>{lead.observacoes}</div>}
            <div style={{borderTop:"1px solid var(--border)",paddingTop:16}}>
              <div className="eyebrow" style={{marginBottom:10}}>Edição rápida</div>
              <label style={{fontSize:12,color:"var(--text-muted)",display:"block",marginBottom:5}}>Estágio</label>
              <select className="sel" value={es} onChange={e=>setEs(e.target.value)} style={{marginBottom:10}}>{STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>
              <label style={{fontSize:12,color:"var(--text-muted)",display:"block",marginBottom:5}}>Documento</label>
              <select className="sel" value={ed} onChange={e=>setEd(e.target.value)} style={{marginBottom:10}}>{DOC_STATUS.map(s=><option key={s} value={s}>{s}</option>)}</select>
              <label style={{fontSize:12,color:"var(--text-muted)",display:"block",marginBottom:5}}>Responsável (Pós-venda)</label>
              <select className="sel" value={resp} onChange={e=>setResp(e.target.value)} style={{marginBottom:10}}>
                <option value="">— Selecionar responsável —</option>
                {OPERATORS.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <label style={{fontSize:12,color:"var(--text-muted)",display:"block",marginBottom:5}}>Equipe</label>
              <select className="sel" value={eq} onChange={e=>setEq(e.target.value)} style={{marginBottom:10}}>
                <option value="">— Selecionar equipe —</option>
                {EQUIPES.map(e=><option key={e} value={e}>{e}</option>)}
              </select>
              <label style={{fontSize:12,color:"var(--text-muted)",display:"block",marginBottom:5}}>Operador Repassado</label>
              <select className="sel" value={or} onChange={e=>setOr(e.target.value)} style={{marginBottom:12}}>
                <option value="">— Selecionar operador —</option>
                {OPERADORES_REPASSADOS.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
              <button className="btn btn-primary" style={{width:"100%"}} onClick={save}>Salvar alterações</button>
            </div>
          </div>
        )}
        {tab==="activity"&&(
          <div>
            <div style={{marginBottom:16}}>
              <textarea className="inp" value={note} onChange={e=>setNote(e.target.value)} placeholder="Registrar ligação, reunião, observação…" style={{resize:"vertical",minHeight:70,fontFamily:"var(--font)",lineHeight:1.5,marginBottom:8}}/>
              <button className="btn btn-primary" style={{width:"100%"}} onClick={()=>{if(!note.trim())return;dispatch({type:"NOTE",lid:lead.id,act:{id:gid(),type:"note",date:TODAY,user:"Usuário",text:note.trim()}});setNote("");}}>+ Registrar atividade</button>
            </div>
            {[...lead.activities].reverse().map((a,i)=>{const s=AS[a.type]||AS.note;return(
              <div key={a.id} style={{display:"flex",gap:10}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                  <div style={{width:30,height:30,borderRadius:9,background:s.bg,color:s.cl,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>{s.ic}</div>
                  {i<lead.activities.length-1&&<div className="activity-line"/>}
                </div>
                <div style={{flex:1,paddingBottom:13}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:12,fontWeight:600}}>{a.user}</span><span style={{fontSize:11,color:"var(--text-faint)"}}>{fmtD(a.date)}</span></div>
                  <div style={{fontSize:12,color:"var(--text-secondary)",lineHeight:1.5}}>{a.text}</div>
                </div>
              </div>
            );})}
          </div>
        )}
        {tab==="docs"&&(
          <div>
            <div style={{marginBottom:18}}>
              <div className="eyebrow" style={{marginBottom:12}}>Progresso</div>
              <div style={{display:"flex"}}>{DOC_STATUS.map((s,i)=>{const idx=DOC_STATUS.indexOf(lead.documentoStatus);const done=i<=idx;return(<div key={s} style={{flex:1,textAlign:"center"}}><div style={{height:4,background:done?"var(--success)":"rgba(90,70,50,.12)",transition:"background .4s",borderRadius:i===0?"3px 0 0 3px":i===4?"0 3px 3px 0":0}}/><div style={{fontSize:9,fontWeight:700,marginTop:5,color:done?"var(--success)":"var(--text-faint)",letterSpacing:".03em"}}>{s.split(" ").join("\n")}</div></div>);})}</div>
            </div>
            <div style={{background:"var(--bg-surface)",border:"1px dashed var(--border-mid)",borderRadius:12,padding:"26px 16px",textAlign:"center",marginBottom:14}}><div style={{fontSize:26,marginBottom:8}}>📁</div><div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Upload de documentos</div><div style={{fontSize:12,color:"var(--text-muted)"}}>Disponível após integração com backend</div></div>
            <div className="eyebrow" style={{marginBottom:10}}>Documentos esperados</div>
            {["RG ou CNH","Comprovante de renda","Comprovante de endereço","Contracheque","Margem consignável"].map(doc=>(
              <div key={doc} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid var(--border)"}}>
                <div style={{width:28,height:28,borderRadius:7,background:"var(--amber-dim)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>📄</div>
                <span style={{fontSize:13,flex:1}}>{doc}</span>
                <span style={{fontSize:11,fontWeight:600,color:"var(--text-muted)"}}>Pendente</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}