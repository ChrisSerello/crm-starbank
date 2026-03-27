import { useState } from 'react';
import { PRODUCTS, OPERATORS, INDICATION_TYPES } from '../constants';
import { TODAY } from '../utils';

// Field deve ficar FORA do NewLead para não ser recriado a cada keystroke(letra)
function Field({label,children}){
  return(
    <div>
      <label style={{display:"block",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:6}}>{label}</label>
      {children}
    </div>
  );
}

export function NewLead({dispatch}){
  const blank={nomeIndicado:"",cpfIndicado:"",telefone:"",nomeQuemIndicou:"",orgaoPrefeitura:"",statusIndicacao:"indicacao_com_nome",produtosInteresse:[],responsavelId:"beatriz",perfilCliente:"",secretariaAtuacao:"",observacoes:"",documentoStatus:"Não solicitado",statusComercial:"distribuido",equipe:"",resultado:"Em andamento",dataEntrada:TODAY,dataAtribuicao:TODAY,ultimoContato:TODAY,operadorRepassado:""};
  const [form,setForm]=useState(blank);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const tp=p=>set("produtosInteresse",form.produtosInteresse.includes(p)?form.produtosInteresse.filter(x=>x!==p):[...form.produtosInteresse,p]);
  return(
    <div className="mbk" onClick={e=>{if(e.target===e.currentTarget)dispatch({type:"TNEW"})}}>
      <div className="mbox">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22}}>
          <div><div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:600,color:"var(--text-primary)",letterSpacing:"-.02em"}}>Novo Lead</div><div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>Preencha os dados do indicado</div></div>
          <button onClick={()=>dispatch({type:"TNEW"})} style={{background:"rgba(90,70,50,.08)",border:"1px solid var(--border-mid)",borderRadius:9,color:"var(--text-secondary)",cursor:"pointer",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>×</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:11}}>
          <Field label="Nome do indicado *"><input className="inp" value={form.nomeIndicado} onChange={e=>set("nomeIndicado",e.target.value)} placeholder="Nome completo"/></Field>
          <Field label="CPF do indicado *"><input className="inp" value={form.cpfIndicado} onChange={e=>set("cpfIndicado",e.target.value)} placeholder="000.000.000-00"/></Field>
          <Field label="Telefone"><input className="inp" value={form.telefone} onChange={e=>set("telefone",e.target.value)} placeholder="(00) 00000-0000"/></Field>
          <Field label="Órgão / Prefeitura"><input className="inp" value={form.orgaoPrefeitura} onChange={e=>set("orgaoPrefeitura",e.target.value)} placeholder="Prefeitura de…"/></Field>
        </div>
        <div style={{marginBottom:11}}><Field label="Tipo de indicação"><select className="sel" value={form.statusIndicacao} onChange={e=>set("statusIndicacao",e.target.value)}>{INDICATION_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></Field></div>
        {form.statusIndicacao!=="indicacao_sem_nome"&&<div style={{marginBottom:11}}><Field label="Nome de quem indicou"><input className="inp" value={form.nomeQuemIndicou} onChange={e=>set("nomeQuemIndicou",e.target.value)} placeholder="Nome do indicador"/></Field></div>}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:8}}>Produtos de interesse</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {PRODUCTS.map(p=>{const sel=form.produtosInteresse.includes(p);return(<button key={p} onClick={()=>tp(p)} style={{padding:"5px 11px",borderRadius:99,fontSize:12,fontWeight:600,cursor:"pointer",background:sel?"var(--accent-dim)":"rgba(90,70,50,.07)",color:sel?"var(--accent)":"var(--text-muted)",border:sel?"1px solid rgba(91,79,232,.25)":"1px solid var(--border)",transition:"all .15s"}}>{p}</button>);})}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:11}}>
          <Field label="Operador responsável"><select className="sel" value={form.responsavelId} onChange={e=>set("responsavelId",e.target.value)}>{OPERATORS.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
          <Field label="Perfil do cliente"><input className="inp" value={form.perfilCliente} onChange={e=>set("perfilCliente",e.target.value)} placeholder="Ex: Servidor público"/></Field>
          <Field label="Secretaria de atuação"><input className="inp" value={form.secretariaAtuacao} onChange={e=>set("secretariaAtuacao",e.target.value)} placeholder="Sec. de…"/></Field>
        </div>
        <div style={{marginBottom:20}}><Field label="Observações"><textarea className="inp" value={form.observacoes} onChange={e=>set("observacoes",e.target.value)} style={{resize:"vertical",minHeight:64,fontFamily:"var(--font)",lineHeight:1.5}} placeholder="Detalhes relevantes…"/></Field></div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button className="btn btn-ghost" onClick={()=>dispatch({type:"TNEW"})}>Cancelar</button>
          <button className="btn btn-primary" onClick={()=>{if(!form.nomeIndicado.trim()||!form.cpfIndicado.trim()){alert("Nome e CPF são obrigatórios.");return;}dispatch({type:"ADD",lead:form});}}>Salvar lead</button>
        </div>
      </div>
    </div>
  );
}