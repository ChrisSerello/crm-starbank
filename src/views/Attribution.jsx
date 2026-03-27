import { OPERATORS, INDICATION_TYPES } from '../constants';
import { Avatar } from '../components/shared';

export function Attribution({rules,dispatch}){
  return(
    <div style={{padding:"28px 32px",maxWidth:760}}>
      <div className="fu" style={{marginBottom:24}}><div className="section-title">Motor de Atribuição</div><div className="section-sub">Regras que determinam para qual operador/time um lead é direcionado</div></div>
      <div style={{marginBottom:22}}>
        {rules.map((r,i)=>(
          <div key={r.id} className="card fu" style={{padding:"15px 18px",marginBottom:10,opacity:r.active?1:.45,animationDelay:`${i*.07}s`}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:9,height:9,borderRadius:"50%",background:r.active?"var(--success)":"var(--text-faint)",flexShrink:0,boxShadow:r.active?"0 0 6px var(--success)":undefined}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:7}}>{r.name}</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                  <span className="tag" style={{background:"rgba(90,70,50,.07)",color:"var(--text-secondary)",fontSize:11}}>SE: {INDICATION_TYPES.find(t=>t.id===r.condition)?.label}</span>
                  <span style={{fontSize:11,color:"var(--text-muted)"}}>→</span>
                  <span className="tag" style={{background:"var(--accent-dim)",color:"var(--accent)",fontSize:11}}>{r.action.replace("team:","Time: ").replace("round_robin:","Round-robin: ")}</span>
                  <span className="tag" style={{background:r.showIndicator?"var(--success-dim)":"var(--amber-dim)",color:r.showIndicator?"var(--success)":"var(--amber)",fontSize:11}}>{r.showIndicator?"Exibe indicador":"Oculta indicador"}</span>
                </div>
              </div>
              <button className="btn btn-ghost" style={{fontSize:12,padding:"6px 12px"}} onClick={()=>dispatch({type:"TRULE",id:r.id})}>{r.active?"Desativar":"Ativar"}</button>
            </div>
          </div>
        ))}
      </div>
      <div className="card fu1" style={{padding:"18px 20px",marginBottom:14}}>
        <div className="eyebrow" style={{marginBottom:12}}>Fluxo de distribuição</div>
        <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:0,rowGap:8}}>
          {["Lead entra","Regra aplicada","Operador selecionado","Lead atribuído"].map((s,i)=>(
            <div key={s} style={{display:"flex",alignItems:"center"}}>
              <div style={{padding:"7px 12px",borderRadius:8,fontSize:12,fontWeight:600,background:"rgba(90,70,50,.06)",border:"1px solid var(--border)"}}>{s}</div>
              {i<3&&<div style={{fontSize:12,color:"var(--text-faint)",margin:"0 5px"}}>→</div>}
            </div>
          ))}
        </div>
        <div style={{marginTop:11,fontSize:12,color:"var(--text-muted)",lineHeight:1.7}}>Leads da mesa comercial alternam automaticamente entre Nair e Maicon. O sistema garante distribuição equilibrada.</div>
      </div>
      <div className="card fu2" style={{padding:"18px 20px"}}>
        <div className="eyebrow" style={{marginBottom:12}}>Operadores e times</div>
        {OPERATORS.map(o=>(
          <div key={o.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid var(--border)"}}>
            <Avatar name={o.name} size={36} color={o.color}/>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{o.name}</div><div style={{fontSize:11,color:"var(--text-muted)"}}>{o.team==="mesa"?"Mesa comercial":"Time pós-venda"}</div></div>
            <span className="tag" style={{background:`${o.color}15`,color:o.color,fontSize:11}}>{o.team==="mesa"?"Mesa":"Pós-venda"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}