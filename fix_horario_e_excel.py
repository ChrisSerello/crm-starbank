# fix_horario_e_excel.py
# Rode na raiz do projeto: python fix_horario_e_excel.py

import os

path = 'src/views/bko/BKOApp.jsx'
print('\n=== Fix: Horário de criação nos cards + Exportação Excel ===\n')

if not os.path.exists(path):
    print(f'ERRO: {path} não encontrado')
    exit()

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

changes = 0

# ── 1. Adicionar helper fmtDH após os imports ─────────────────────────────────
old_after_imports = """const MODULE_CONFIG = {"""
new_after_imports = """// Formata data+hora no fuso de Brasília
const fmtDH=(ts)=>{
  if(!ts) return '—';
  try{
    const d=new Date(ts);
    if(isNaN(d.getTime())) return ts;
    const data=d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',timeZone:'America/Sao_Paulo'});
    const hora=d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'});
    return `${data} às ${hora}`;
  }catch{ return '—'; }
};

const MODULE_CONFIG = {"""
if old_after_imports in c and 'const fmtDH' not in c:
    c = c.replace(old_after_imports, new_after_imports)
    print('  OK: helper fmtDH adicionado')
    changes += 1
else:
    print('  AVISO: fmtDH já existe ou ponto de inserção não encontrado')

# ── 2. Carregar created_at no SET_C ──────────────────────────────────────────
old_load = """        const loaded=(data||[]).map(r=>({...r.data,id:r.id,estagio:r.estagio,criado_por_id:r.criado_por_id,criado_por_nome:r.criado_por_nome,criado_por_role:r.criado_por_role,atribuido_a_id:r.atribuido_a_id||null,atribuido_a_nome:r.atribuido_a_nome||null,responsavel_bko_id:r.responsavel_bko_id||null,responsavel_bko_nome:r.responsavel_bko_nome||null,origem:r.origem||null}));"""
new_load = """        const loaded=(data||[]).map(r=>({...r.data,id:r.id,estagio:r.estagio,criado_por_id:r.criado_por_id,criado_por_nome:r.criado_por_nome,criado_por_role:r.criado_por_role,atribuido_a_id:r.atribuido_a_id||null,atribuido_a_nome:r.atribuido_a_nome||null,responsavel_bko_id:r.responsavel_bko_id||null,responsavel_bko_nome:r.responsavel_bko_nome||null,origem:r.origem||null,created_at:r.created_at||null}));"""
if old_load in c:
    c = c.replace(old_load, new_load)
    print('  OK: created_at carregado no SET_C')
    changes += 1
else:
    print('  AVISO: SET_C load não encontrado')

# ── 3. Carregar created_at no RT_ADD ─────────────────────────────────────────
old_rt = """        dispatch({type:'RT_ADD',c:{...r.data,id:r.id,estagio:r.estagio,criado_por_id:r.criado_por_id,criado_por_nome:r.criado_por_nome,criado_por_role:r.criado_por_role,atribuido_a_id:r.atribuido_a_id||null,atribuido_a_nome:r.atribuido_a_nome||null,responsavel_bko_id:r.responsavel_bko_id||null,responsavel_bko_nome:r.responsavel_bko_nome||null,origem:r.origem||null}});"""
new_rt = """        dispatch({type:'RT_ADD',c:{...r.data,id:r.id,estagio:r.estagio,criado_por_id:r.criado_por_id,criado_por_nome:r.criado_por_nome,criado_por_role:r.criado_por_role,atribuido_a_id:r.atribuido_a_id||null,atribuido_a_nome:r.atribuido_a_nome||null,responsavel_bko_id:r.responsavel_bko_id||null,responsavel_bko_nome:r.responsavel_bko_nome||null,origem:r.origem||null,created_at:r.created_at||null}});"""
if old_rt in c:
    c = c.replace(old_rt, new_rt)
    print('  OK: created_at carregado no RT_ADD')
    changes += 1
else:
    print('  AVISO: RT_ADD não encontrado')

# ── 4. Carregar created_at no UPD ─────────────────────────────────────────────
old_upd = """        dispatch({type:'UPD',c:{...r.data,id:r.id,estagio:r.estagio,criado_por_id:r.criado_por_id,criado_por_nome:r.criado_por_nome,criado_por_role:r.criado_por_role,atribuido_a_id:r.atribuido_a_id||null,atribuido_a_nome:r.atribuido_a_nome||null,responsavel_bko_id:r.responsavel_bko_id||null,responsavel_bko_nome:r.responsavel_bko_nome||null,origem:r.origem||null}});"""
new_upd = """        dispatch({type:'UPD',c:{...r.data,id:r.id,estagio:r.estagio,criado_por_id:r.criado_por_id,criado_por_nome:r.criado_por_nome,criado_por_role:r.criado_por_role,atribuido_a_id:r.atribuido_a_id||null,atribuido_a_nome:r.atribuido_a_nome||null,responsavel_bko_id:r.responsavel_bko_id||null,responsavel_bko_nome:r.responsavel_bko_nome||null,origem:r.origem||null,created_at:r.created_at||null}});"""
if old_upd in c:
    c = c.replace(old_upd, new_upd)
    print('  OK: created_at carregado no UPD')
    changes += 1
else:
    print('  AVISO: UPD não encontrado')

# ── 5. Adicionar horário de criação no KCard ──────────────────────────────────
old_kcard_footer = """        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:9,color:'var(--text-faint)'}}>{fmtD(c.dataEntrada)}</span>
          <span style={{fontSize:9,fontWeight:600,color:c.documentoStatus==='Aprovado'?'var(--success)':c.documentoStatus==='Não solicitado'?'var(--text-faint)':'var(--amber)'}}>{c.documentoStatus}</span>
        </div>
        {c.criado_por_nome&&<div style={{marginTop:5,paddingTop:5,borderTop:'1px solid var(--border)',fontSize:9,color:'var(--text-muted)'}}>{c.criado_por_nome}</div>}"""
new_kcard_footer = """        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:9,color:'var(--text-faint)'}}>{fmtD(c.dataEntrada)}</span>
          <span style={{fontSize:9,fontWeight:600,color:c.documentoStatus==='Aprovado'?'var(--success)':c.documentoStatus==='Não solicitado'?'var(--text-faint)':'var(--amber)'}}>{c.documentoStatus}</span>
        </div>
        {c.created_at&&<div style={{marginTop:3,fontSize:9,color:'var(--text-faint)'}}>🕐 {fmtDH(c.created_at)}</div>}
        {c.criado_por_nome&&<div style={{marginTop:5,paddingTop:5,borderTop:'1px solid var(--border)',fontSize:9,color:'var(--text-muted)'}}>{c.criado_por_nome}</div>}"""
if old_kcard_footer in c:
    c = c.replace(old_kcard_footer, new_kcard_footer)
    print('  OK: horário de criação adicionado no KCard')
    changes += 1
else:
    print('  AVISO: footer do KCard não encontrado')

# ── 6. Exportação Excel no BKOClientes ───────────────────────────────────────
# Adicionar função de exportação antes da definição do BKOClientes
old_clientes_fn = """function BKOClientes({clientes,profile,onSelect,onNew,origemFiltro,setOrigemFiltro,supervisorTeam,allTeams}){"""
new_clientes_fn = """function exportarExcel(dados, nomeArquivo='clientes_bko'){
  try{
    // Montar linhas
    const rows = dados.map(c=>({
      'Nome': c.nomeCliente||'',
      'CPF': c.cpfCliente||'',
      'Telefone': c.telefone||'',
      'Prefeitura/Órgão': c.prefeitura||'',
      'Estágio': (()=>{const s=BKO_STAGES.find(x=>x.id===c.estagio);return s?s.label:c.estagio||'';})(),
      'Status Documento': c.documentoStatus||'',
      'Saldo Devedor': c.saldoDevedor||'',
      'Criado por': c.criado_por_nome||'',
      'Atribuído a': c.atribuido_a_nome||'',
      'Origem': c.origem||'',
      'Data de entrada': c.dataEntrada||'',
      'Criado em': c.created_at?fmtDH(c.created_at):'',
    }));

    // Criar workbook via dados CSV simples (sem dependência externa)
    const headers = Object.keys(rows[0]||{});
    const csvRows = [
      headers.join(';'),
      ...rows.map(r=>headers.map(h=>{
        const val = String(r[h]||'').replace(/"/g,'""');
        return `"${val}"`;
      }).join(';'))
    ];
    const csvContent = '\uFEFF' + csvRows.join('\n'); // BOM para Excel reconhecer UTF-8
    const blob = new Blob([csvContent], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nomeArquivo}_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }catch(e){
    console.error('Erro ao exportar:',e);
    alert('Erro ao exportar. Tente novamente.');
  }
}

function BKOClientes({clientes,profile,onSelect,onNew,origemFiltro,setOrigemFiltro,supervisorTeam,allTeams}){"""
if old_clientes_fn in c:
    c = c.replace(old_clientes_fn, new_clientes_fn)
    print('  OK: função exportarExcel adicionada')
    changes += 1
else:
    print('  AVISO: BKOClientes não encontrado')

# ── 7. Adicionar botão Exportar no header de BKOClientes ──────────────────────
old_clientes_header = """        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {profile?.role==='comercial'&&(
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {[['todos',null,'Todos'],['corban','corban','Corbans'],['startec','startec','Startec'],
                ...(profile?.is_supervisor?allTeams.map(t=>[t.supervisor_id,t.supervisor_id,`Eq. ${t.supervisor_nome?.split(' ')[0]}`]):[])
              ].map(([key,val,label])=>(
                <button key={key} onClick={()=>setOrigemFiltro(val)}
                  style={{padding:'5px 12px',borderRadius:99,fontSize:11,fontWeight:600,cursor:'pointer',transition:'all .15s',
                    background:origemFiltro===val?(val==='startec'||allTeams.some(t=>t.supervisor_id===val)?'#059669':val==='corban'?B_MID:'rgba(0,0,0,.08)'):'transparent',
                    color:origemFiltro===val?'#fff':'var(--text-muted)',
                    border:`1px solid ${origemFiltro===val?(val==='startec'||allTeams.some(t=>t.supervisor_id===val)?'#059669':val==='corban'?B_MID:'rgba(0,0,0,.15)'):'var(--border)'}`,
                  }}>{label}</button>
              ))}
            </div>
          )}
          <button className="btn" style={{background:B_MID,color:'#fff',boxShadow:`0 3px 14px ${B_GLOW}`}} onClick={onNew}>+ Novo Cliente</button>
        </div>"""
new_clientes_header = """        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          {profile?.role==='comercial'&&(
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {[['todos',null,'Todos'],['corban','corban','Corbans'],['startec','startec','Startec'],
                ...(profile?.is_supervisor?allTeams.map(t=>[t.supervisor_id,t.supervisor_id,`Eq. ${t.supervisor_nome?.split(' ')[0]}`]):[])
              ].map(([key,val,label])=>(
                <button key={key} onClick={()=>setOrigemFiltro(val)}
                  style={{padding:'5px 12px',borderRadius:99,fontSize:11,fontWeight:600,cursor:'pointer',transition:'all .15s',
                    background:origemFiltro===val?(val==='startec'||allTeams.some(t=>t.supervisor_id===val)?'#059669':val==='corban'?B_MID:'rgba(0,0,0,.08)'):'transparent',
                    color:origemFiltro===val?'#fff':'var(--text-muted)',
                    border:`1px solid ${origemFiltro===val?(val==='startec'||allTeams.some(t=>t.supervisor_id===val)?'#059669':val==='corban'?B_MID:'rgba(0,0,0,.15)'):'var(--border)'}`,
                  }}>{label}</button>
              ))}
            </div>
          )}
          <button
            onClick={()=>exportarExcel(filtered)}
            title="Exportar lista atual para CSV (abre no Excel)"
            style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',background:'rgba(16,185,129,.1)',color:'#059669',border:'1px solid rgba(16,185,129,.25)',transition:'all .15s'}}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(16,185,129,.2)';}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(16,185,129,.1)';}}>
            ↓ Exportar
          </button>
          <button className="btn" style={{background:B_MID,color:'#fff',boxShadow:`0 3px 14px ${B_GLOW}`}} onClick={onNew}>+ Novo Cliente</button>
        </div>"""
if old_clientes_header in c:
    c = c.replace(old_clientes_header, new_clientes_header)
    print('  OK: botão Exportar adicionado no header de Clientes')
    changes += 1
else:
    print('  AVISO: header de Clientes não encontrado')

# ── 8. Adicionar coluna "Criado em" na tabela de clientes ────────────────────
old_table_headers = """                {['Nome / CPF','Prefeitura','Estágio','Documento','Saldo Devedor','Criado por','Atribuído a','Entrada',''].map(h=>("""
new_table_headers = """                {['Nome / CPF','Prefeitura','Estágio','Documento','Saldo Devedor','Criado por','Atribuído a','Entrada','Criado em',''].map(h=>("""
if old_table_headers in c:
    c = c.replace(old_table_headers, new_table_headers)
    print('  OK: coluna Criado em adicionada no header da tabela')
    changes += 1
else:
    print('  AVISO: headers da tabela não encontrados')

# ── 9. Adicionar célula "Criado em" nas linhas da tabela ──────────────────────
old_table_row = """                  <td style={{padding:'11px 14px',fontSize:11,color:'var(--text-secondary)'}}>{fmtD(c.dataEntrada)}</td>
                  <td style={{padding:'11px 14px',color:'var(--text-muted)',fontSize:15}}>›</td>"""
new_table_row = """                  <td style={{padding:'11px 14px',fontSize:11,color:'var(--text-secondary)'}}>{fmtD(c.dataEntrada)}</td>
                  <td style={{padding:'11px 14px',fontSize:11,color:'var(--text-secondary)'}}>{c.created_at?fmtDH(c.created_at):'—'}</td>
                  <td style={{padding:'11px 14px',color:'var(--text-muted)',fontSize:15}}>›</td>"""
if old_table_row in c:
    c = c.replace(old_table_row, new_table_row)
    print('  OK: célula Criado em adicionada nas linhas da tabela')
    changes += 1
else:
    print('  AVISO: linha da tabela não encontrada')

# ── 10. Corrigir colSpan da tabela (era 9, agora é 10) ───────────────────────
old_colspan = """              {paged.length===0&&<tr><td colSpan={9} style={{padding:'36px 0',textAlign:'center',color:'var(--text-muted)',fontSize:13}}>Nenhum cliente encontrado</td></tr>}"""
new_colspan = """              {paged.length===0&&<tr><td colSpan={10} style={{padding:'36px 0',textAlign:'center',color:'var(--text-muted)',fontSize:13}}>Nenhum cliente encontrado</td></tr>}"""
if old_colspan in c:
    c = c.replace(old_colspan, new_colspan)
    print('  OK: colSpan corrigido para 10')
    changes += 1
else:
    print('  AVISO: colSpan não encontrado')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print(f'\n  BKOApp.jsx: {changes} alteração(ões) aplicada(s)')
print('\nPronto! Rode: npm run dev')
print('\nO que foi implementado:')
print('  1. Horário de criação nos cards do pipeline (🕐 DD/MM/AA às HH:MM)')
print('  2. Coluna "Criado em" na tabela de Clientes')
print('  3. Botão "↓ Exportar" que baixa os clientes filtrados em CSV (abre no Excel)')
print('  4. Exportação inclui: Nome, CPF, Telefone, Prefeitura, Estágio, Documento,')
print('     Saldo, Criado por, Atribuído a, Origem, Data entrada, Criado em')