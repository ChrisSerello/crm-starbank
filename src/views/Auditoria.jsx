import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabase';
import { Avatar } from '../components/shared';

// [OTM] Reduzido de 50 para 50 (mantido) — mas o fetch foi de 1000 → 100 registros
const PER_PAGE = 50;

export function Auditoria(){
  const [logs,setLogs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState('');
  const [dateFrom,setDateFrom]=useState('');
  const [dateTo,setDateTo]=useState('');
  const [filterUser,setFilterUser]=useState('');
  const [filterAction,setFilterAction]=useState('');
  const [page,setPage]=useState(1);

  useEffect(()=>{
    // [OTM-AUDIT] Reduzido de limit(1000) + select('*') para limit(100) + colunas específicas.
    // A auditoria raramente precisa de mais de 100 registros na tela.
    // O realtime continua adicionando novos registros em tempo real.
    supabase
      .from('audit_log')
      .select('id, created_at, user_nome, action, lead_id, lead_nome, detalhes')
      .order('created_at',{ascending:false})
      .limit(100)
      .then(({data})=>{ setLogs(data||[]); setLoading(false); });

    const ch=supabase.channel('audit_realtime')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'audit_log'},
        payload=>setLogs(prev=>[payload.new,...prev]))
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  },[]);

  // Reset page on filter change
  const prevFilters=useRef({search,dateFrom,dateTo,filterUser,filterAction});
  useEffect(()=>{
    const cur={search,dateFrom,dateTo,filterUser,filterAction};
    if(JSON.stringify(cur)!==JSON.stringify(prevFilters.current)){
      setPage(1);
      prevFilters.current=cur;
    }
  },[search,dateFrom,dateTo,filterUser,filterAction]);

  // Unique users and actions for dropdowns
  const users=useMemo(()=>[...new Set(logs.map(l=>l.user_nome).filter(Boolean))].sort(),[logs]);
  const actions=useMemo(()=>[...new Set(logs.map(l=>l.action).filter(Boolean))].sort(),[logs]);

  const filtered=useMemo(()=>{
    return logs.filter(l=>{
      if(search){
        const s=search.toLowerCase();
        if(!l.user_nome?.toLowerCase().includes(s)&&!l.lead_nome?.toLowerCase().includes(s)&&!l.action?.toLowerCase().includes(s)&&!l.detalhes?.toLowerCase().includes(s)) return false;
      }
      if(filterUser && l.user_nome!==filterUser) return false;
      if(filterAction && l.action!==filterAction) return false;
      if(dateFrom){
        const from=new Date(dateFrom+'T00:00:00');
        if(new Date(l.created_at)<from) return false;
      }
      if(dateTo){
        const to=new Date(dateTo+'T23:59:59');
        if(new Date(l.created_at)>to) return false;
      }
      return true;
    });
  },[logs,search,dateFrom,dateTo,filterUser,filterAction]);

  const totalPages=Math.max(1,Math.ceil(filtered.length/PER_PAGE));
  const paginated=filtered.slice((page-1)*PER_PAGE,page*PER_PAGE);

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

  const hasFilters=search||dateFrom||dateTo||filterUser||filterAction;
  const clearFilters=()=>{setSearch('');setDateFrom('');setDateTo('');setFilterUser('');setFilterAction('');};

  return(
    <div style={{padding:"28px 32px"}}>
      <div className="fu" style={{marginBottom:20}}>
        <div className="section-title">Auditoria</div>
        <div className="section-sub">
          {filtered.length} de {logs.length} registros (últimos 100)
          {totalPages>1?` · Página ${page} de ${totalPages}`:''}
        </div>
      </div>

      {/* Filtros */}
      <div className="fu1" style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        {/* Busca */}
        <div className="search-wrap" style={{minWidth:220,flex:1}}>
          <span className="search-icon">⌕</span>
          <input className="inp" placeholder="Buscar por usuário, lead, ação…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>

        {/* Filtro usuário */}
        <select className="sel" style={{width:160}} value={filterUser} onChange={e=>setFilterUser(e.target.value)}>
          <option value="">Todos usuários</option>
          {users.map(u=><option key={u} value={u}>{u}</option>)}
        </select>

        {/* Filtro ação */}
        <select className="sel" style={{width:170}} value={filterAction} onChange={e=>setFilterAction(e.target.value)}>
          <option value="">Todas as ações</option>
          {actions.map(a=><option key={a} value={a}>{a}</option>)}
        </select>

        {/* Filtro data de */}
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <label style={{fontSize:11,color:"var(--text-muted)",whiteSpace:"nowrap"}}>De</label>
          <input type="date" className="inp" style={{width:140,padding:"8px 10px"}} value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/>
        </div>

        {/* Filtro data até */}
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <label style={{fontSize:11,color:"var(--text-muted)",whiteSpace:"nowrap"}}>Até</label>
          <input type="date" className="inp" style={{width:140,padding:"8px 10px"}} value={dateTo} onChange={e=>setDateTo(e.target.value)}/>
        </div>

        {/* Limpar filtros */}
        {hasFilters&&(
          <button className="btn btn-ghost" style={{fontSize:12,padding:"7px 12px",whiteSpace:"nowrap"}} onClick={clearFilters}>
            ✕ Limpar
          </button>
        )}

        {/* Tempo real */}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6,fontSize:12,color:"var(--text-muted)",whiteSpace:"nowrap"}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:"var(--success)",boxShadow:"0 0 5px var(--success)"}}/>
          Tempo real
        </div>
      </div>

      {loading?(
        <div style={{textAlign:"center",padding:"40px 0",fontSize:13,color:"var(--text-muted)"}}>Carregando registros…</div>
      ):(
        <>
          <div className="fu2 card" style={{overflow:"hidden",marginBottom:16}}>
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
                  {paginated.map((log,i)=>(
                    <tr key={log.id} style={{borderBottom:"1px solid var(--border)",background:i%2===0?"transparent":"rgba(90,70,50,.015)"}}>
                      <td style={{padding:"10px 14px",fontSize:11,color:"var(--text-muted)",whiteSpace:"nowrap"}}>{fmtTs(log.created_at)}</td>
                      <td style={{padding:"10px 14px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:7}}>
                          <Avatar name={log.user_nome||"?"} size={24} color="#5B4FE8"/>
                          <span style={{fontSize:12,fontWeight:600,color:"var(--text-primary)"}}>{log.user_nome}</span>
                        </div>
                      </td>
                      <td style={{padding:"10px 14px"}}>
                        <span className="tag" style={{background:`${actionColor[log.action]||"var(--accent)"}18`,color:actionColor[log.action]||"var(--accent)",fontSize:11,whiteSpace:"nowrap"}}>{log.action}</span>
                      </td>
                      <td style={{padding:"10px 14px",fontSize:12,color:"var(--text-primary)",fontWeight:500,whiteSpace:"nowrap"}}>{log.lead_nome||"—"}</td>
                      <td style={{padding:"10px 14px",fontSize:12,color:"var(--text-secondary)",maxWidth:320}}>{log.detalhes||"—"}</td>
                    </tr>
                  ))}
                  {paginated.length===0&&(
                    <tr><td colSpan={5} style={{padding:"40px 0",textAlign:"center",color:"var(--text-muted)",fontSize:13}}>
                      Nenhum registro encontrado
                      {hasFilters&&<span> — <button onClick={clearFilters} style={{background:"none",border:"none",cursor:"pointer",color:"var(--accent)",fontSize:13}}>limpar filtros</button></span>}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginação */}
          {totalPages>1&&(
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <button className="btn btn-ghost" style={{padding:"6px 12px",fontSize:12}} onClick={()=>setPage(1)} disabled={page===1}>«</button>
              <button className="btn btn-ghost" style={{padding:"6px 12px",fontSize:12}} onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>‹ Anterior</button>
              <div style={{display:"flex",gap:4}}>
                {Array.from({length:totalPages},(_,i)=>i+1)
                  .filter(p=>p===1||p===totalPages||Math.abs(p-page)<=2)
                  .reduce((acc,p,i,arr)=>{
                    if(i>0&&p-arr[i-1]>1) acc.push('…');
                    acc.push(p);
                    return acc;
                  },[])
                  .map((p,i)=>
                    p==='…'
                      ?<span key={`e${i}`} style={{padding:"6px 4px",fontSize:12,color:"var(--text-muted)"}}>…</span>
                      :<button key={p} onClick={()=>setPage(p)} style={{
                          width:32,height:32,borderRadius:8,border:"none",cursor:"pointer",
                          fontSize:12,fontWeight:p===page?600:400,
                          background:p===page?"var(--accent)":"transparent",
                          color:p===page?"#fff":"var(--text-secondary)",
                          transition:"all .15s",
                        }}>{p}</button>
                  )
                }
              </div>
              <button className="btn btn-ghost" style={{padding:"6px 12px",fontSize:12}} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>Próxima ›</button>
              <button className="btn btn-ghost" style={{padding:"6px 12px",fontSize:12}} onClick={()=>setPage(totalPages)} disabled={page===totalPages}>»</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}