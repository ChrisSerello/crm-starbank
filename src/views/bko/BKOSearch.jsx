import { useState, useEffect, useRef, useMemo } from 'react';

const B_MID   = '#3B5BDB';
const B_LIGHT = 'rgba(59,91,219,.10)';

const BKO_STAGES_LABEL = {
  clientes_novos:'Clientes Novos', saldo_andamento:'Saldo em Andamento',
  pendencia_financeiro:'Pendência Financeiro', em_negociacao:'Em Negociação',
  abertura_conta:'Abertura de Conta', digitar_proposta:'Digitar Proposta',
  integrado:'Integrado', perdido:'Perdido',
};
const BKO_STAGES_COLOR = {
  clientes_novos:'#3B5BDB', saldo_andamento:'#7C3AED',
  pendencia_financeiro:'#F97316', em_negociacao:'#0EA5E9',
  abertura_conta:'#10B981', digitar_proposta:'#F59E0B',
  integrado:'#22C55E', perdido:'#EF4444',
};

/* Destaca o termo buscado no texto */
function Highlight({ text='', term='' }) {
  if (!term.trim() || !text) return <>{text}</>;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === term.toLowerCase()
          ? <mark key={i} style={{ background:'rgba(59,91,219,.18)', color:B_MID,
              borderRadius:3, padding:'0 2px', fontWeight:700 }}>{p}</mark>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}

export function BKOSearch({ clientes = [], onSelect, open, onClose }) {
  const [query, setQuery]     = useState('');
  const [active, setActive]   = useState(-1);
  const inputRef              = useRef(null);
  const listRef               = useRef(null);

  /* Foco automático ao abrir */
  useEffect(() => {
    if (open) { setQuery(''); setActive(-1); setTimeout(() => inputRef.current?.focus(), 60); }
  }, [open]);

  /* Fechar com Escape */
  useEffect(() => {
    if (!open) return;
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  /* Resultados filtrados */
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return clientes
      .filter(c =>
        c.nomeCliente?.toLowerCase().includes(q) ||
        c.cpfCliente?.replace(/\D/g,'').includes(q.replace(/\D/g,'')) ||
        c.telefone?.replace(/\D/g,'').includes(q.replace(/\D/g,'')) ||
        c.prefeitura?.toLowerCase().includes(q) ||
        c.criado_por_nome?.toLowerCase().includes(q) ||
        c.saldoDevedor?.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [query, clientes]);

  /* Navegação com teclado */
  const handleKey = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    if (e.key === 'Enter' && active >= 0 && results[active]) {
      onSelect(results[active].id); onClose();
    }
  };

  /* Scroll do item ativo na lista */
  useEffect(() => {
    if (active < 0 || !listRef.current) return;
    const item = listRef.current.children[active];
    item?.scrollIntoView({ block:'nearest' });
  }, [active]);

  if (!open) return null;

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:'fixed', inset:0, zIndex:8000,
        background:'rgba(0,0,0,.45)', backdropFilter:'blur(4px)',
        display:'flex', alignItems:'flex-start', justifyContent:'center',
        paddingTop:'12vh' }}>

      <div style={{ width:'100%', maxWidth:620, background:'var(--bg-card)',
        border:'1px solid var(--border)', borderRadius:16,
        boxShadow:'0 24px 60px rgba(0,0,0,.22)', overflow:'hidden' }}>

        {/* Campo de busca */}
        <div style={{ display:'flex', alignItems:'center', gap:10,
          padding:'14px 18px', borderBottom: results.length > 0 ? '1px solid var(--border)' : 'none' }}>
          <span style={{ fontSize:18, color:'var(--text-muted)' }}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setActive(-1); }}
            onKeyDown={handleKey}
            placeholder="Buscar por nome, CPF, telefone, prefeitura, operador…"
            style={{ flex:1, border:'none', outline:'none', fontSize:15,
              background:'transparent', color:'var(--text-primary)',
              fontFamily:'var(--font)' }}
          />
          {query && (
            <button onClick={() => { setQuery(''); setActive(-1); inputRef.current?.focus(); }}
              style={{ background:'none', border:'none', cursor:'pointer',
                fontSize:16, color:'var(--text-muted)', lineHeight:1 }}>×</button>
          )}
          <kbd style={{ padding:'3px 8px', borderRadius:5, fontSize:10,
            background:'var(--bg-surface)', border:'1px solid var(--border)',
            color:'var(--text-muted)' }}>ESC</kbd>
        </div>

        {/* Resultados */}
        {query.length >= 2 && (
          <div ref={listRef}
            style={{ maxHeight:440, overflowY:'auto' }}>

            {results.length === 0 && (
              <div style={{ padding:'28px 0', textAlign:'center',
                color:'var(--text-muted)', fontSize:13 }}>
                Nenhum cliente encontrado para "<strong>{query}</strong>"
              </div>
            )}

            {results.length > 0 && (
              <div style={{ padding:'6px 0' }}>
                <div style={{ padding:'6px 18px 4px',
                  fontSize:9, fontWeight:700, letterSpacing:'.1em',
                  textTransform:'uppercase', color:'var(--text-muted)' }}>
                  {results.length} resultado{results.length > 1 ? 's' : ''}
                </div>
                {results.map((c, i) => {
                  const stgColor = BKO_STAGES_COLOR[c.estagio] || '#888';
                  const stgLabel = BKO_STAGES_LABEL[c.estagio] || c.estagio;
                  const isActive = i === active;
                  return (
                    <div
                      key={c.id}
                      onClick={() => { onSelect(c.id); onClose(); }}
                      onMouseEnter={() => setActive(i)}
                      style={{
                        display:'flex', alignItems:'center', gap:12,
                        padding:'10px 18px', cursor:'pointer',
                        background: isActive ? 'var(--bg-surface)' : 'transparent',
                        transition:'background .1s',
                      }}>

                      {/* Ícone estágio */}
                      <div style={{ width:34, height:34, borderRadius:9, flexShrink:0,
                        background:`${stgColor}15`,
                        display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <div style={{ width:8, height:8, borderRadius:'50%',
                          background:stgColor, boxShadow:`0 0 5px ${stgColor}60` }}/>
                      </div>

                      {/* Dados */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600,
                          color:'var(--text-primary)', marginBottom:2,
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          <Highlight text={c.nomeCliente || '—'} term={query}/>
                        </div>
                        <div style={{ display:'flex', gap:8, alignItems:'center',
                          flexWrap:'wrap' }}>
                          {c.cpfCliente && (
                            <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                              <Highlight text={c.cpfCliente} term={query}/>
                            </span>
                          )}
                          {c.prefeitura && (
                            <span style={{ fontSize:10, color:'var(--text-muted)' }}>
                              🏛 <Highlight text={c.prefeitura} term={query}/>
                            </span>
                          )}
                          {c.criado_por_nome && (
                            <span style={{ fontSize:10, color:'var(--text-muted)' }}>
                              · <Highlight text={c.criado_por_nome} term={query}/>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Badge estágio + funil */}
                      <div style={{ display:'flex', flexDirection:'column',
                        alignItems:'flex-end', gap:4, flexShrink:0 }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px',
                          borderRadius:99, background:`${stgColor}15`, color:stgColor }}>
                          {stgLabel}
                        </span>
                        {c.funil_nome && (
                          <span style={{ fontSize:9, padding:'1px 6px',
                            borderRadius:99, background:'rgba(0,0,0,.05)',
                            color:'var(--text-muted)' }}>
                            📦 {c.funil_nome}
                          </span>
                        )}
                      </div>

                      {/* Seta */}
                      <span style={{ fontSize:14, color:'var(--text-faint)', flexShrink:0 }}>›</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Dica inicial */}
        {query.length < 2 && (
          <div style={{ padding:'20px 18px', display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>Dicas de busca:</div>
            {[
              ['Nome', 'Amanda Coutinho'],
              ['CPF', '027.123.031-21'],
              ['Prefeitura', 'Governo de Goiás'],
              ['Operador', 'Brenda Pimenta'],
            ].map(([tipo, ex]) => (
              <div key={tipo} style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px',
                  borderRadius:99, background:B_LIGHT, color:B_MID,
                  minWidth:70, textAlign:'center' }}>{tipo}</span>
                <span style={{ fontSize:12, color:'var(--text-secondary)',
                  fontStyle:'italic' }}>{ex}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}