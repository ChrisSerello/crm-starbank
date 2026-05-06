# fix_edit_supervisor.py
# Rode na raiz do projeto: python fix_edit_supervisor.py

import os

path = 'src/views/bko/BKOApp.jsx'
print('\n=== Fix: Campo supervisor no modal de edição ===\n')

if not os.path.exists(path):
    print(f'ERRO: {path} não encontrado')
    exit()

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

changes = 0

# ── 1. Atualizar openEdit para buscar supervisor_id atual do perfil ───────────
old_open_edit = """  const openEdit=(u)=>{setEditUser(u);setEditForm({nome:u.nome||'',novaSenha:'',confirmarSenha:''});setEditMsg(null);};"""
new_open_edit = """  const openEdit=(u)=>{
    setEditUser(u);
    setEditMsg(null);
    // Buscar supervisor_id atual do perfil para pré-preencher o campo
    supabase.from('profiles').select('supervisor_id').ilike('email',u.email).maybeSingle()
      .then(({data})=>setEditForm({nome:u.nome||'',novaSenha:'',confirmarSenha:'',supervisor_id:data?.supervisor_id||''}));
  };"""
if old_open_edit in c:
    c = c.replace(old_open_edit, new_open_edit)
    print('  OK: openEdit atualizado para buscar supervisor_id')
    changes += 1
else:
    print('  AVISO: openEdit não encontrado')

# ── 2. Inicializar editForm com supervisor_id ─────────────────────────────────
old_edit_form = """  const [editForm,setEditForm]=useState({nome:'',novaSenha:'',confirmarSenha:''});"""
new_edit_form = """  const [editForm,setEditForm]=useState({nome:'',novaSenha:'',confirmarSenha:'',supervisor_id:''});"""
if old_edit_form in c:
    c = c.replace(old_edit_form, new_edit_form)
    print('  OK: editForm inicializado com supervisor_id')
    changes += 1
else:
    print('  AVISO: editForm inicial não encontrado')

# ── 3. Salvar supervisor_id no saveEdit ───────────────────────────────────────
old_save_edit = """    setEditSaving(false);
    if(e1||e2||passwordError){setEditMsg({t:'error',text:passwordError||'Erro ao salvar. Tente novamente.'});return;}
    setEditMsg({t:'success',text:vaiAlterarSenha?'Nome e senha atualizados com sucesso!':'Nome atualizado com sucesso!'});
    load();
    setTimeout(()=>setEditUser(null),1200);
  };"""
new_save_edit = """    // Salvar supervisor_id se for startec
    if(editUser.role==='startec'){
      await supabase.from('profiles')
        .update({supervisor_id:editForm.supervisor_id||null})
        .ilike('email',editUser.email);
    }
    setEditSaving(false);
    if(e1||e2||passwordError){setEditMsg({t:'error',text:passwordError||'Erro ao salvar. Tente novamente.'});return;}
    setEditMsg({t:'success',text:vaiAlterarSenha?'Nome e senha atualizados com sucesso!':'Nome atualizado com sucesso!'});
    load();
    setTimeout(()=>setEditUser(null),1200);
  };"""
if old_save_edit in c:
    c = c.replace(old_save_edit, new_save_edit)
    print('  OK: saveEdit salva supervisor_id')
    changes += 1
else:
    print('  AVISO: bloco saveEdit não encontrado')

# ── 4. Adicionar campo Supervisor no modal de edição ─────────────────────────
old_email_block = """            <div style={{marginBottom:12}}>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>E-mail</label>
              <input className="inp" value={editUser.email} readOnly style={{background:'var(--bg-surface)',cursor:'not-allowed',color:'var(--text-muted)'}}/>
              <div style={{fontSize:10,color:'var(--text-faint)',marginTop:4}}>E-mail não pode ser alterado.</div>
            </div>
            {editUser.role==='corban_bko'&&("""
new_email_block = """            <div style={{marginBottom:12}}>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>E-mail</label>
              <input className="inp" value={editUser.email} readOnly style={{background:'var(--bg-surface)',cursor:'not-allowed',color:'var(--text-muted)'}}/>
              <div style={{fontSize:10,color:'var(--text-faint)',marginTop:4}}>E-mail não pode ser alterado.</div>
            </div>
            {editUser.role==='startec'&&(
              <div style={{marginBottom:12}}>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>Supervisor</label>
                <SupervisorSelect value={editForm.supervisor_id||''} onChange={v=>setEditForm(f=>({...f,supervisor_id:v}))}/>
                <div style={{fontSize:10,color:'var(--text-faint)',marginTop:4}}>Define em qual equipe este operador aparece.</div>
              </div>
            )}
            {editUser.role==='corban_bko'&&("""
if old_email_block in c:
    c = c.replace(old_email_block, new_email_block)
    print('  OK: campo Supervisor adicionado no modal de edição')
    changes += 1
else:
    print('  AVISO: bloco do e-mail no modal de edição não encontrado')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print(f'\n  BKOApp.jsx: {changes} alteração(ões) aplicada(s)')
print('\nPronto! Rode: npm run dev')
print('\nDepois abra cada operador Startec em Cadastrar → ✎ Editar → escolha o supervisor → Salvar.')