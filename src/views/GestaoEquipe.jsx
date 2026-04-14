import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Avatar } from '../components/shared';
import { withCache, invalidateCache } from '../cache';

// [OTM-CACHE] Cache de 5 minutos para a lista de usuários.
// A lista de equipe muda raramente (add/remove usuário).
// Ao salvar/deletar, o cache é invalidado para que o próximo load busque dados frescos.
const CACHE_KEY = 'gestao_equipe_allowed_users';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export function GestaoEquipe(){
  const [pessoas,setPessoas]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showModal,setShowModal]=useState(false);
  const [editing,setEditing]=useState(null);
  const [saving,setSaving]=useState(false);
  const [confirmDelete,setConfirmDelete]=useState(null);
  const [form,setForm]=useState({email:'',nome:'',role:'pos_venda'});
  const [msg,setMsg]=useState(null);

  const load=async()=>{
    setLoading(true);
    // [OTM] withCache evita re-fetch ao alternar entre views
    const data = await withCache(CACHE_KEY, CACHE_TTL, async () => {
      const {data} = await supabase.from('allowed_users').select('*').order('nome');
      return data || [];
    });
    setPessoas(data);
    setLoading(false);
  };

  useEffect(()=>{ load(); },[]);

  const openNew=()=>{
    setEditing(null);
    setForm({email:'',nome:'',role:'pos_venda'});
    setShowModal(true);
  };

  const openEdit=(p)=>{
    setEditing(p);
    setForm({email:p.email,nome:p.nome,role:p.role});
    setShowModal(true);
  };

  const save=async()=>{
    if(!form.email.trim()||!form.nome.trim()){setMsg({type:'error',text:'E-mail e nome são obrigatórios.'});return;}
    const emailLower=form.email.trim().toLowerCase();
    setSaving(true);setMsg(null);
    if(editing){
      const {error}=await supabase.from('allowed_users')
        .update({email:emailLower,nome:form.nome.trim(),role:form.role})
        .eq('email',editing.email);
      await supabase.from('profiles')
        .update({email:emailLower,nome:form.nome.trim(),role:form.role})
        .ilike('email',editing.email);
      if(error){setMsg({type:'error',text:'Erro ao salvar. Verifique os dados.'});}
      else{
        invalidateCache(CACHE_KEY); // [OTM] invalida cache após edição
        setMsg({type:'success',text:`${form.nome} atualizado com sucesso!`});
        setShowModal(false);
        load();
      }
    } else {
      const {data:exists}=await supabase.from('allowed_users').select('email').ilike('email',emailLower).single();
      if(exists){setSaving(false);setMsg({type:'error',text:'Este e-mail já está cadastrado.'});return;}
      const {error}=await supabase.from('allowed_users').insert({email:emailLower,nome:form.nome.trim(),role:form.role});
      if(error){setMsg({type:'error',text:'Erro ao adicionar. Tente novamente.'});}
      else{
        invalidateCache(CACHE_KEY); // [OTM] invalida cache após inserção
        setMsg({type:'success',text:`${form.nome} adicionado! Crie o acesso no Supabase Auth.`});
        setShowModal(false);
        load();
      }
    }
    setSaving(false);
  };

  const remove=async(pessoa)=>{
    await supabase.from('profiles').delete().ilike('email',pessoa.email);
    await supabase.from('allowed_users').delete().eq('email',pessoa.email);
    invalidateCache(CACHE_KEY); // [OTM] invalida cache após remoção
    setConfirmDelete(null);
    setMsg({type:'success',text:`${pessoa.nome} removido do sistema.`});
    load();
  };

  const roleLabel={admin:'Admin',pos_venda:'Pós-venda',operador:'Operador'};
  const roleColor={admin:'var(--amber)',pos_venda:'var(--accent)',operador:'var(--teal)'};
  const roleBg={admin:'var(--amber-dim)',pos_venda:'var(--accent-dim)',operador:'var(--teal-dim)'};

  return(
    <div style={{padding:"28px 32px"}}>
      <div className="fu" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24}}>
        <div>
          <div className="section-title">Gestão de Equipe</div>
          <div className="section-sub">Gerencie quem tem acesso ao sistema</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Adicionar pessoa</button>
      </div>

      {msg&&(
        <div className="fu" style={{
          display:"flex",alignItems:"center",gap:8,padding:"10px 14px",borderRadius:9,marginBottom:16,
          background:msg.type==='success'?"var(--success-dim)":"var(--danger-dim)",
          border:`1px solid ${msg.type==='success'?"rgba(30,143,94,.2)":"rgba(196,66,58,.2)"}`,
          fontSize:13,color:msg.type==='success'?"var(--success)":"var(--danger)",
        }}>
          <span>{msg.type==='success'?'✓':'⚠'}</span>{msg.text}
          <button onClick={()=>setMsg(null)} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:"inherit",fontSize:16}}>×</button>
        </div>
      )}

      {loading?(
        <div style={{textAlign:"center",padding:"40px 0",fontSize:13,color:"var(--text-muted)"}}>Carregando equipe…</div>
      ):(
        <>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginBottom:24}}>
            {/* Coluna esquerda: Admin + Pós-venda */}
            <div>
              {['admin','pos_venda'].map(roleGroup=>(
                <div key={roleGroup} style={{marginBottom:24}}>
                  <div className="eyebrow" style={{marginBottom:12}}>
                    {roleGroup==='admin'?'Administradores':'Time Pós-venda'}
                    <span style={{marginLeft:8,fontWeight:400,color:"var(--text-faint)"}}>
                      ({pessoas.filter(p=>p.role===roleGroup).length})
                    </span>
                  </div>
                  <div className="card" style={{overflow:"hidden"}}>
                    {pessoas.filter(p=>p.role===roleGroup).length===0?(
                      <div style={{padding:"20px 18px",fontSize:13,color:"var(--text-muted)"}}>Nenhuma pessoa neste grupo.</div>
                    ):(
                      pessoas.filter(p=>p.role===roleGroup).map((p,i,arr)=>(
                        <div key={p.email} style={{
                          display:"flex",alignItems:"center",gap:12,padding:"13px 18px",
                          borderBottom:i<arr.length-1?"1px solid var(--border)":"none",
                          transition:"background .15s",
                        }}>
                          <Avatar name={p.nome} size={38} color={roleColor[p.role]}/>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:600,color:"var(--text-primary)"}}>{p.nome}</div>
                            <div style={{fontSize:12,color:"var(--text-muted)",marginTop:1}}>{p.email}</div>
                          </div>
                          <span className="tag" style={{background:roleBg[p.role],color:roleColor[p.role],fontSize:11}}>
                            {roleLabel[p.role]}
                          </span>
                          <div style={{display:"flex",gap:6,marginLeft:8}}>
                            <button className="btn btn-ghost" style={{padding:"5px 11px",fontSize:12}}
                              onClick={()=>openEdit(p)}>Editar</button>
                            <button onClick={()=>setConfirmDelete(p)} style={{
                              padding:"5px 11px",borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer",
                              background:"var(--danger-dim)",color:"var(--danger)",
                              border:"1px solid rgba(196,66,58,.2)",transition:"all .15s",
                            }}>Remover</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Coluna direita: Operadores */}
            <div>
              <div className="eyebrow" style={{marginBottom:12}}>
                Operadores
                <span style={{marginLeft:8,fontWeight:400,color:"var(--text-faint)"}}>
                  ({pessoas.filter(p=>p.role==='operador').length})
                </span>
              </div>
              <div className="card" style={{overflow:"hidden"}}>
                {pessoas.filter(p=>p.role==='operador').length===0?(
                  <div style={{padding:"20px 18px",fontSize:13,color:"var(--text-muted)"}}>Nenhum operador cadastrado.</div>
                ):(
                  pessoas.filter(p=>p.role==='operador').map((p,i,arr)=>(
                    <div key={p.email} style={{
                      display:"flex",alignItems:"center",gap:12,padding:"13px 18px",
                      borderBottom:i<arr.length-1?"1px solid var(--border)":"none",
                      transition:"background .15s",
                    }}>
                      <Avatar name={p.nome} size={38} color={roleColor['operador']}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:"var(--text-primary)"}}>{p.nome}</div>
                        <div style={{fontSize:12,color:"var(--text-muted)",marginTop:1}}>{p.email}</div>
                      </div>
                      <span className="tag" style={{background:roleBg['operador'],color:roleColor['operador'],fontSize:11}}>
                        Operador
                      </span>
                      <div style={{display:"flex",gap:6,marginLeft:8}}>
                        <button className="btn btn-ghost" style={{padding:"5px 11px",fontSize:12}}
                          onClick={()=>openEdit(p)}>Editar</button>
                        <button onClick={()=>setConfirmDelete(p)} style={{
                          padding:"5px 11px",borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer",
                          background:"var(--danger-dim)",color:"var(--danger)",
                          border:"1px solid rgba(196,66,58,.2)",transition:"all .15s",
                        }}>Remover</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div style={{padding:"12px 16px",background:"rgba(90,70,50,.05)",borderRadius:10,border:"1px solid var(--border)",fontSize:12,color:"var(--text-muted)",lineHeight:1.7}}>
            💡 <strong>Para dar acesso a uma nova pessoa:</strong> adicione aqui primeiro, depois vá em{' '}
            <strong>Supabase → Authentication → Users → Add user → Create new user</strong> e crie o usuário com o mesmo e-mail e uma senha inicial.
          </div>
        </>
      )}

      {/* Modal Add/Edit */}
      {showModal&&(
        <div className="mbk" onClick={e=>{if(e.target===e.currentTarget){setShowModal(false);setMsg(null);}}}>
          <div className="mbox" style={{maxWidth:440}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
              <div>
                <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,color:"var(--text-primary)"}}>
                  {editing?'Editar pessoa':'Adicionar pessoa'}
                </div>
                <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>
                  {editing?'Atualize os dados da pessoa':'Preencha os dados da nova pessoa'}
                </div>
              </div>
              <button onClick={()=>{setShowModal(false);setMsg(null);}} style={{background:"rgba(90,70,50,.08)",border:"1px solid var(--border-mid)",borderRadius:9,color:"var(--text-secondary)",cursor:"pointer",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>×</button>
            </div>

            {msg&&<div style={{padding:"9px 12px",borderRadius:8,marginBottom:14,background:"var(--danger-dim)",border:"1px solid rgba(196,66,58,.2)",fontSize:12,color:"var(--danger)"}}>{msg.text}</div>}

            <div style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:6}}>Nome completo</label>
              <input className="inp" value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Nome da pessoa"/>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:6}}>E-mail</label>
              <input className="inp" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}
                placeholder="email@exemplo.com" disabled={!!editing}
                style={{opacity:editing?0.6:1}}/>
              {editing&&<div style={{fontSize:11,color:"var(--text-muted)",marginTop:4}}>O e-mail não pode ser alterado após o cadastro.</div>}
            </div>
            <div style={{marginBottom:22}}>
              <label style={{display:"block",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:6}}>Papel no sistema</label>
              <div style={{display:"flex",gap:8}}>
                {[{v:'pos_venda',l:'Pós-venda'},{v:'admin',l:'Administrador'},{v:'operador',l:'Operador'}].map(opt=>{
                  const sel=form.role===opt.v;
                  return(
                    <button key={opt.v} onClick={()=>setForm(f=>({...f,role:opt.v}))} style={{
                      flex:1,padding:"9px 0",borderRadius:9,fontSize:13,fontWeight:600,cursor:"pointer",
                      background:sel?roleColor[opt.v]:"rgba(90,70,50,.06)",
                      color:sel?"#fff":"var(--text-secondary)",
                      border:sel?"none":"1px solid var(--border)",
                      transition:"all .15s",
                    }}>{opt.l}</button>
                  );
                })}
              </div>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>{setShowModal(false);setMsg(null);}}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving?"Salvando…":editing?"Salvar alterações":"Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete&&(
        <div className="mbk" onClick={e=>{if(e.target===e.currentTarget)setConfirmDelete(null);}}>
          <div className="mbox" style={{maxWidth:400}}>
            <div style={{textAlign:"center",padding:"8px 0 20px"}}>
              <div style={{fontSize:36,marginBottom:12}}>⚠️</div>
              <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,color:"var(--text-primary)",marginBottom:8}}>
                Remover {confirmDelete.nome}?
              </div>
              <div style={{fontSize:13,color:"var(--text-muted)",lineHeight:1.6,marginBottom:24}}>
                Esta pessoa perderá acesso ao sistema imediatamente.<br/>
                O histórico de ações dela na auditoria será mantido.
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"center"}}>
                <button className="btn btn-ghost" onClick={()=>setConfirmDelete(null)}>Cancelar</button>
                <button className="btn" style={{background:"var(--danger)",color:"#fff",boxShadow:"0 3px 12px rgba(196,66,58,.3)"}}
                  onClick={()=>remove(confirmDelete)}>Sim, remover acesso</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}