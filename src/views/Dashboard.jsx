import { STAGES, PRODUCTS, OPERATORS } from '../constants';
import { sinceD, fmtD, TODAY } from '../utils';
import { StageTag, AlertDot, Bar } from '../components/shared';
import { Avatar } from '../components/shared';

export function MCard({label,value,sub,accent,icon,di=0}){
  return(
    <div className="mcard fu" style={{animationDelay:`${di}s`}}>
      <div style={{position:"absolute",top:-20,right:-20,width:90,height:90,borderRadius:"50%",background:accent,filter:"blur(36px)",opacity:.18,pointerEvents:"none"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <span className="eyebrow">{label}</span>
        <div style={{width:32,height:32,borderRadius:9,background:`${accent}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,border:`1px solid ${accent}25`}}>{icon}</div>
      </div>
      <div style={{fontSize:30,fontWeight:600,fontFamily:"var(--font-display)",color:"var(--text-primary)",letterSpacing:"-.02em",lineHeight:1}}>{value}</div>
      {sub&&<div style={{fontSize:12,color:"var(--text-muted)",marginTop:6}}>{sub}</div>}
    </div>
  );
}

export function Dashboard({leads}){
  const total=leads.length;
  const ganhos=leads.filter(l=>l.statusComercial==="ganho"||l.statusComercial==="pedido").length;
  const emNeg=leads.filter(l=>l.statusComercial==="em_negociacao").length;
  const frios=leads.filter(l=>sinceD(l.ultimoContato)>=7).length;
  const taxa=total>0?Math.round(ganhos/total*100):0;
  const byStage=STAGES.map(s=>({...s,count:leads.filter(l=>l.statusComercial===s.id).length}));
  const mxSt=Math.max(...byStage.map(s=>s.count),1);
  const byProd=PRODUCTS.map(p=>({name:p.length>19?p.slice(0,17)+"…":p,count:leads.filter(l=>(l.produtosInteresse||[]).includes(p)).length})).filter(p=>p.count>0).sort((a,b)=>b.count-a.count);
  const mxPr=Math.max(...byProd.map(p=>p.count),1);
  const byOp=OPERATORS.map(o=>({...o,count:leads.filter(l=>l.responsavelId===o.id).length}));
  const mxOp=Math.max(...byOp.map(o=>o.count),1);
  const recent=leads.flatMap(l=>(l.activities||[]).map(a=>({...a,leadName:l.nomeIndicado}))).sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,5);
  const aIcon={stage_change:"⇄",contact:"☎",doc:"📄",note:"✎"};
  const aColor={stage_change:"var(--accent)",contact:"var(--success)",doc:"var(--amber)",note:"var(--text-muted)"};
  const aBg={stage_change:"var(--accent-dim)",contact:"var(--success-dim)",doc:"var(--amber-dim)",note:"rgba(90,70,50,.06)"};
  return(
    <div style={{padding:"28px 32px",maxWidth:1120}}>
      <div className="fu" style={{marginBottom:24}}>
        <div className="section-title">Visão Geral</div>
        <div className="section-sub">Atualizado agora · {fmtD(TODAY)}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:14,marginBottom:22}}>
        <MCard label="Total de leads"  value={total}  sub="Todos os estágios"     accent="#5B4FE8" icon="◈" di={.05}/>
        <MCard label="Convertidos"     value={ganhos} sub={`${taxa}% de conversão`} accent="#1E8F5E" icon="✓" di={.1}/>
        <MCard label="Em negociação"   value={emNeg}  sub="Estágio ativo"         accent="#1A9E8A" icon="⟳" di={.15}/>
        <MCard label="Leads frios"     value={frios}  sub="Sem contato +7 dias"   accent="#C4423A" icon="❄" di={.2}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:14}}>
        {[
          {title:"Pipeline por estágio",  items:byStage.map((s,i)=>({label:s.label,val:s.count,max:mxSt,color:s.color,di:i*.04}))},
          {title:"Produtos de interesse", items:byProd.map((p,i)=>({label:p.name,val:p.count,max:mxPr,color:"var(--accent)",di:i*.04}))},
          {title:"Por operador",          items:byOp.map((o,i)=>({label:o.name,val:o.count,max:mxOp,color:o.color,di:i*.04}))},
        ].map((sec,si)=>(
          <div key={si} className="card fu" style={{padding:"18px 20px",animationDelay:`${.2+si*.06}s`}}>
            <div className="eyebrow" style={{marginBottom:14}}>{sec.title}</div>
            {sec.items.map(it=><Bar key={it.label} label={it.label} val={it.val} max={it.max} color={it.color} di={it.di}/>)}
            {sec.items.length===0&&<div style={{fontSize:12,color:"var(--text-muted)"}}>Sem dados</div>}
          </div>
        ))}
      </div>
      <div className="card fu2" style={{padding:"18px 20px"}}>
        <div className="eyebrow" style={{marginBottom:14}}>Atividade recente</div>
        {recent.map((a,i)=>(
          <div key={a.id} style={{display:"flex",gap:11,padding:"9px 0",borderBottom:i<recent.length-1?"1px solid var(--border)":"none"}}>
            <div style={{width:30,height:30,borderRadius:9,background:aBg[a.type]||aBg.note,color:aColor[a.type]||aColor.note,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>{aIcon[a.type]||"✎"}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:"var(--text-primary)"}}>{a.leadName}</div>
              <div style={{fontSize:12,color:"var(--text-muted)",marginTop:1}}>{a.text}</div>
            </div>
            <div style={{fontSize:11,color:"var(--text-faint)",flexShrink:0,marginTop:2}}>{fmtD(a.date)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}