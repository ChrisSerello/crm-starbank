import os

path = 'src/views/bko/BKODetail.jsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# Fix 1: Corban block deve chamar salvarAtribuicao (não salvarAtribuicaoStartecDireto)
c = c.replace(
    "}} onClick={salvarAtribuicaoStartecDireto} disabled={atribuindo}>{atribuindo ? 'Salvando…' : '✓ Confirmar atribuição'}</button>",
    "}} onClick={salvarAtribuicao} disabled={atribuindo}>{atribuindo ? 'Salvando…' : '✓ Confirmar atribuição'}</button>"
)

# Fix 2: salvarAtribuicaoStartec deve salvar em atribuido_a_id (não atribuido_startec_id)
old_fn = """  const salvarAtribuicaoStartec = async () => {
    const opSel = operadoresStartec.find(o => o.id === atribStartecId);
    setAtribuindoStartec(true);
    setAtribStartecMsg(null);
    const { error } = await supabase.from('bko_clientes')
      .update({ atribuido_startec_id: atribStartecId || null, atribuido_startec_nome: opSel?.nome || null })
      .eq('id', cliente.id);
    setAtribuindoStartec(false);
    if (error) { setAtribStartecMsg({ t: 'error', text: 'Erro ao atribuir.' }); return; }
    dispatch({ type: 'UPD', c: { ...cliente, atribuido_startec_id: atribStartecId || null, atribuido_startec_nome: opSel?.nome || null } });
    setAtribStartecMsg({ t: 'success', text: `Operação atribuída a ${opSel?.nome || 'ninguém'}!` });
  };"""

new_fn = """  const salvarAtribuicaoStartec = async () => {
    const opSel = operadoresStartec.find(o => o.id === atribStartecId);
    setAtribuindoStartec(true);
    setAtribStartecMsg(null);
    const { error } = await supabase.from('bko_clientes')
      .update({ atribuido_a_id: atribStartecId || null, atribuido_a_nome: opSel?.nome || null })
      .eq('id', cliente.id);
    setAtribuindoStartec(false);
    if (error) { setAtribStartecMsg({ t: 'error', text: 'Erro ao atribuir.' }); return; }
    dispatch({ type: 'UPD', c: { ...cliente, atribuido_a_id: atribStartecId || null, atribuido_a_nome: opSel?.nome || null } });
    setAtribStartecMsg({ t: 'success', text: `Atribuído a ${opSel?.nome || 'ninguém'}!` });
  };"""

if old_fn in c:
    c = c.replace(old_fn, new_fn)
    print('OK: salvarAtribuicaoStartec corrigido para usar atribuido_a_id')
else:
    print('AVISO: função não encontrada')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print('Pronto!')