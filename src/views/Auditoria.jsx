import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { Avatar } from '../components/shared';

export function Auditoria(){
  const [logs,setLogs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [filter,setFilter]=useState('');

  useEffect(()=>{
    supabase.from('audit_log').select('*').order('created_at',{ascending:false}).limit(300)
      .then(({data})=>{ setLogs(data||[]); setLoading(false); });

    const ch=supabase.channel('audit_realtime')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'audit_log'},
        payload=>setLogs(prev=>[payload.new,...prev]))
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  },[]);

  const filtered=useMemo(()=>{
    if(!filter) return logs;
    const s=filter.toLowerCase();
    return logs.filter(l=>
      l.user_nome?.toLowerCase().includes(s)||
      l.lead_nome?.toLowerCase().includes(s)||
      l.action?.toLowerCase().includes(s)||
      l.detalhes?.toLowerCase().includes(s)
    );
  },[logs,filter]);

  const actionColor={
    'Moveu lead no pipeline':'var(--accent)',
    'Criou novo lead':'var(--success)',
    'Adicionou nota':'var(--amber)',
    'Editou informações':'var(--teal)',
  };

  const fmtTs=ts=>{
    if(!ts) return '—';
    const d=new Date(ts);
    return d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});
  };

  return(
    <div style={{padding:"28px 32px"}}>
      <div className="fu" style={{marginBottom:24}}>
        <div className="section-title">Auditoria</div>
        <div className="section-sub">Registro de todas as ações realizadas pela equipe pós-venda</div>
      </div>

      <div className="fu1" style={{display:"flex",gap:8,marginBottom:16}}>
        <div className="search-wrap" style={{maxWidth:360}}>
          <span className="search-icon">⌕</span>
          <input className="inp" placeholder="Filtrar por usuário, lead, ação…" value={filter} onChange={e=>setFilter(e.target.value)}/>
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6,fontSize:12,color:"var(--text-muted)"}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:"var(--success)",boxShadow:"0 0 5px var(--success)"}}/>
          Atualizando em tempo real
        </div>
      </div>

      {loading?(
        <div style={{textAlign:"center",padding:"40px 0",fontSize:13,color:"var(--text-muted)"}}>Carregando registros…</div>
      ):(
        <div className="fu2 card" style={{overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:"rgba(90,70,50,.04)",borderBottom:"1px solid var(--border)"}}>
                  {["Data/hora","Usuário","Ação","Lead","Detalhes"].map(h=>(
                    <th key={h} style={{padding:"11px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".08em",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((log,i)=>(
                  <tr key={log.id} style={{borderBottom:"1px solid var(--border)",background:i%2===0?"transparent":"rgba(90,70,50,.015)"}}>
                    <td style={{padding:"10px 14px",fontSize:11,color:"var(--text-muted)",whiteSpace:"nowrap"}}>{fmtTs(log.created_at)}</td>
                    <td style={{padding:"10px 14px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        <Avatar name={log.user_nome||"?"} size={24} color="#5B4FE8"/>
                        <span style={{fontSize:12,fontWeight:600,color:"var(--text-primary)"}}>{log.user_nome}</span>
                      </div>
                    </td>
                    <td style={{padding:"10px 14px"}}>
                      <span className="tag" style={{background:`${actionColor[log.action]||"var(--accent)"}18`,color:actionColor[log.action]||"var(--accent)",fontSize:11}}>{log.action}</span>
                    </td>
                    <td style={{padding:"10px 14px",fontSize:12,color:"var(--text-primary)",fontWeight:500}}>{log.lead_nome||"—"}</td>
                    <td style={{padding:"10px 14px",fontSize:12,color:"var(--text-secondary)",maxWidth:280}}>{log.detalhes||"—"}</td>
                  </tr>
                ))}
                {filtered.length===0&&<tr><td colSpan={5} style={{padding:"40px 0",textAlign:"center",color:"var(--text-muted)",fontSize:13}}>Nenhum registro encontrado</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}