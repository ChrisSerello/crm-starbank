import { STAGES, OPERATORS } from '../constants';
import { stg, sinceD, inits } from '../utils';

export function Avatar({name,size=32,color="#5B4FE8"}){
  return(
    <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,background:`${color}18`,color,border:`1.5px solid ${color}35`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.34,fontWeight:700,letterSpacing:"-.02em"}}>
      {inits(name)}
    </div>
  );
}

export function StageTag({stageId}){
  const s=stg(stageId);
  return <span className="tag" style={{background:s.bg,color:s.color}}>{s.label}</span>;
}

export function AlertDot({days}){
  if(days<3)return null;
  const c=days>=7?"var(--danger)":"var(--amber)";
  return <span className="adot" style={{width:7,height:7,background:c,marginLeft:4,flexShrink:0}} title={`${days} dias sem contato`}/>;
}

export function Bar({label,val,max,color,di=0}){
  const pct=max>0?Math.round(val/max*100):0;
  return(
    <div style={{marginBottom:9}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
        <span style={{color:"var(--text-secondary)"}}>{label}</span>
        <span style={{fontWeight:600,color:"var(--text-primary)"}}>{val}</span>
      </div>
      <div className="bar-bg" style={{height:5}}>
        <div className="bar-fill" style={{"--bw":`${pct}%`,background:color,animationDelay:`${di}s`}}/>
      </div>
    </div>
  );
}