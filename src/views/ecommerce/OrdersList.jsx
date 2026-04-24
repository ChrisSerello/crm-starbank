// src/views/ecommerce/OrdersList.jsx

import { useState, useMemo, useCallback } from 'react';

const fmtBRL = v => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';
const fmtD   = d => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const fmtTS  = d => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

// ── PAINEL LATERAL DE DETALHE DO PEDIDO ──────────────────────
export function OrderDetail({ order, stages, M, updateOrder, moveOrder, onClose }) {
  const [tab, setTab]             = useState('info');
  const [nota, setNota]           = useState('');
  const [editStatus, setEditStatus] = useState(order.status_pagamento);
  const [editRastreio, setEditRastreio] = useState(order.codigo_rastreio || '');
  const [editTransp, setEditTransp]     = useState(order.transportadora || '');
  const [saving, setSaving]       = useState(false);

  const stage = stages.find(s => s.id === order.stage_id);

  const save = async () => {
    setSaving(true);
    await updateOrder(order.id, {
      status_pagamento: editStatus,
      codigo_rastreio: editRastreio,
      transportadora: editTransp,
    });
    setSaving(false);
    onClose();
  };

  const addNota = async () => {
    if (!nota.trim()) return;
    const novaAct = {
      id: Math.random().toString(36).slice(2, 9),
      type: 'note', date: new Date().toISOString().split('T')[0],
      user: 'Equipe', text: nota.trim(),
    };
    const lead = { activities: [] }; // would come from leads array in real usage
    await updateOrder(order.id, { notas_internas: (order.notas_internas ? order.notas_internas + '\n' : '') + nota.trim() });
    setNota('');
  };

  return (
    <div className="eco-side-panel">
      {/* Cabeçalho */}
      <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${M.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: M.text, marginBottom: 3 }}>
              {order.cliente_nome}
            </div>
            <div style={{ fontSize: 11, color: M.textFaint }}>
              Pedido #{order.numero || order.id?.slice(0, 6).toUpperCase()} · {fmtTS(order.criado_em)}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {stage && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: `${stage.cor}18`, color: stage.cor }}>
                  {stage.icone} {stage.nome}
                </span>
              )}
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
                background: order.status_pagamento === 'confirmado' ? 'rgba(76,175,80,0.15)'
                          : order.status_pagamento === 'recusado'   ? 'rgba(239,83,80,0.15)'
                          : 'rgba(255,255,255,0.06)',
                color: order.status_pagamento === 'confirmado' ? '#81C784'
                     : order.status_pagamento === 'recusado'   ? '#FF8A88'
                     : M.textMid,
              }}>
                💳 {order.status_pagamento}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: M.accent }}>
                {fmtBRL(order.valor_total)}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: `1px solid ${M.border}`,
            borderRadius: 8, cursor: 'pointer', width: 30, height: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, color: M.textMid, flexShrink: 0,
          }}>×</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${M.border}`, flexShrink: 0 }}>
        {[['info', 'Pedido'], ['entrega', 'Entrega'], ['notas', 'Notas']].map(([id, lb]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              flex: 1, padding: '11px 0', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: "'Jost', sans-serif", fontSize: 13, fontWeight: tab === id ? 600 : 400,
              color: tab === id ? M.accent : M.textFaint,
              borderBottom: `2px solid ${tab === id ? M.accent : 'transparent'}`,
              transition: 'all 0.15s',
            }}
          >{lb}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
        {/* ── ABA: PEDIDO ── */}
        {tab === 'info' && (
          <div>
            {/* Itens */}
            <div className="eco-eyebrow" style={{ marginBottom: 10 }}>Itens do pedido</div>
            <div style={{ background: '#141414', border: `1px solid ${M.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 18 }}>
              {(order.itens || []).map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderBottom: i < order.itens.length - 1 ? `1px solid ${M.border}` : 'none',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                    background: 'rgba(255,255,255,0.04)',
                    overflow: 'hidden',
                  }}>
                    {item.foto ? (
                      <img src={item.foto} alt={item.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👗</div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: M.text }}>{item.nome}</div>
                    {item.variacao && <div style={{ fontSize: 10, color: M.textFaint }}>{item.variacao}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: M.text }}>× {item.qty}</div>
                    <div style={{ fontSize: 11, color: M.accent }}>{fmtBRL(item.preco)}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Financeiro */}
            <div style={{ background: '#141414', border: `1px solid ${M.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 18 }}>
              {[
                ['Subtotal', fmtBRL(order.valor_subtotal)],
                ['Frete',    fmtBRL(order.valor_frete)],
                order.valor_desconto > 0 && ['Desconto', `-${fmtBRL(order.valor_desconto)}`],
              ].filter(Boolean).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', borderBottom: `1px solid ${M.border}` }}>
                  <span style={{ fontSize: 12, color: M.textFaint }}>{k}</span>
                  <span style={{ fontSize: 12, color: M.textMid }}>{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 12px' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: M.text }}>Total</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: M.accent }}>{fmtBRL(order.valor_total)}</span>
              </div>
            </div>

            {/* Dados do cliente */}
            <div className="eco-eyebrow" style={{ marginBottom: 8 }}>Dados do cliente</div>
            <div style={{ background: '#141414', border: `1px solid ${M.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 18 }}>
              {[
                ['Nome', order.cliente_nome],
                ['E-mail', order.cliente_email || '—'],
                ['Telefone', order.cliente_telefone || '—'],
                order.cliente_cpf && ['CPF', order.cliente_cpf],
              ].filter(Boolean).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', borderBottom: `1px solid ${M.border}` }}>
                  <span style={{ fontSize: 11, color: M.textFaint }}>{k}</span>
                  <span style={{ fontSize: 11, color: M.text, fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Mover estágio */}
            <div className="eco-eyebrow" style={{ marginBottom: 8 }}>Mover para estágio</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
              {stages.map(s => (
                <button
                  key={s.id}
                  onClick={() => moveOrder(order.id, s.id)}
                  style={{
                    padding: '6px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                    cursor: s.id === order.stage_id ? 'default' : 'pointer',
                    border: 'none',
                    background: s.id === order.stage_id ? `${s.cor}25` : 'rgba(255,255,255,0.05)',
                    color: s.id === order.stage_id ? s.cor : M.textMid,
                    outline: s.id === order.stage_id ? `1px solid ${s.cor}50` : 'none',
                    transition: 'all 0.12s',
                  }}
                >
                  {s.icone} {s.nome}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── ABA: ENTREGA ── */}
        {tab === 'entrega' && (
          <div>
            {/* Endereço */}
            <div className="eco-eyebrow" style={{ marginBottom: 8 }}>Endereço de entrega</div>
            <div style={{ background: '#141414', border: `1px solid ${M.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 18 }}>
              {order.endereco && Object.entries({
                'Rua': `${order.endereco.rua}, ${order.endereco.numero}${order.endereco.complemento ? ` — ${order.endereco.complemento}` : ''}`,
                'Bairro': order.endereco.bairro,
                'Cidade': order.endereco.cidade,
                'Estado': order.endereco.estado,
                'CEP': order.endereco.cep,
              }).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', borderBottom: `1px solid ${M.border}` }}>
                  <span style={{ fontSize: 11, color: M.textFaint }}>{k}</span>
                  <span style={{ fontSize: 11, color: M.text }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Rastreio */}
            <div className="eco-eyebrow" style={{ marginBottom: 8 }}>Rastreamento</div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 10, color: M.textFaint, marginBottom: 5 }}>Transportadora</label>
              <input className="eco-inp" value={editTransp} onChange={e => setEditTransp(e.target.value)} placeholder="Correios, Jadlog, Loggi…"/>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 10, color: M.textFaint, marginBottom: 5 }}>Código de rastreio</label>
              <input className="eco-inp" value={editRastreio} onChange={e => setEditRastreio(e.target.value)} placeholder="BR123456789BR"/>
            </div>

            {/* Status pagamento */}
            <div className="eco-eyebrow" style={{ marginBottom: 8 }}>Status do pagamento</div>
            <select className="eco-sel" value={editStatus} onChange={e => setEditStatus(e.target.value)} style={{ marginBottom: 18 }}>
              {['pendente', 'confirmado', 'recusado', 'estornado'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <button className="eco-btn eco-btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={save} disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        )}

        {/* ── ABA: NOTAS ── */}
        {tab === 'notas' && (
          <div>
            {order.notas_internas && (
              <div style={{ marginBottom: 16, padding: '12px 14px', background: '#141414', border: `1px solid ${M.border}`, borderRadius: 10, fontSize: 12, color: M.textMid, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {order.notas_internas}
              </div>
            )}
            <textarea
              className="eco-inp"
              value={nota}
              onChange={e => setNota(e.target.value)}
              placeholder="Adicionar nota interna…"
              style={{ resize: 'vertical', minHeight: 80, marginBottom: 10, fontFamily: "'Jost', sans-serif", lineHeight: 1.5 }}
            />
            <button className="eco-btn eco-btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={addNota}>
              + Adicionar nota
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── TABELA DE PEDIDOS ─────────────────────────────────────────
export function OrdersList({
  M, orders, stages, moveOrder, updateOrder,
  onSelectOrder, selectedOrder,
}) {
  const [search, setSearch]       = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterPag, setFilterPag] = useState('');
  const [page, setPage]           = useState(1);
  const [showNew, setShowNew]     = useState(false);
  const PER = 50;

  const filtered = useMemo(() => orders.filter(o => {
    if (filterStage && o.stage_id !== filterStage) return false;
    if (filterPag   && o.status_pagamento !== filterPag) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!o.cliente_nome?.toLowerCase().includes(s) &&
          !o.cliente_email?.toLowerCase().includes(s) &&
          !String(o.numero)?.includes(s)) return false;
    }
    return true;
  }), [orders, search, filterStage, filterPag]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice((page - 1) * PER, page * PER);

  const totalReceita = filtered.reduce((s, o) => s + (o.valor_total || 0), 0);
  const hasFilter = search || filterStage || filterPag;

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: M.text, marginBottom: 3 }}>
            Pedidos
          </div>
          <div style={{ fontSize: 12, color: M.textFaint }}>
            {filtered.length} pedido{filtered.length !== 1 ? 's' : ''} · {fmtBRL(totalReceita)}
            {totalPages > 1 && ` · Pág ${page}/${totalPages}`}
          </div>
        </div>
        <button className="eco-btn eco-btn-primary" onClick={() => setShowNew(true)}>
          + Novo pedido
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: M.textFaint, fontSize: 13 }}>⌕</span>
          <input className="eco-inp" style={{ paddingLeft: 32 }} placeholder="Buscar cliente, nº do pedido…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/>
        </div>
        <select className="eco-sel" style={{ width: 180 }} value={filterStage} onChange={e => { setFilterStage(e.target.value); setPage(1); }}>
          <option value="">Todos os estágios</option>
          {stages.map(s => <option key={s.id} value={s.id}>{s.icone} {s.nome}</option>)}
        </select>
        <select className="eco-sel" style={{ width: 160 }} value={filterPag} onChange={e => { setFilterPag(e.target.value); setPage(1); }}>
          <option value="">Todos pagamentos</option>
          {['pendente', 'confirmado', 'recusado', 'estornado'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {hasFilter && (
          <button className="eco-btn eco-btn-ghost" onClick={() => { setSearch(''); setFilterStage(''); setFilterPag(''); setPage(1); }}>
            ✕ Limpar
          </button>
        )}
      </div>

      {/* Tabela */}
      <div style={{ background: '#141414', border: `1px solid ${M.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${M.border}` }}>
                {['Pedido', 'Cliente', 'Itens', 'Estágio', 'Pagamento', 'Total', 'Data', ''].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: M.textFaint, textTransform: 'uppercase', letterSpacing: '0.09em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((o, i) => {
                const stage = stages.find(s => s.id === o.stage_id);
                return (
                  <tr
                    key={o.id}
                    onClick={() => onSelectOrder(o.id)}
                    style={{
                      borderBottom: i < paged.length - 1 ? `1px solid ${M.border}` : 'none',
                      cursor: 'pointer', transition: 'background 0.12s',
                      background: selectedOrder === o.id ? 'rgba(201,169,110,0.06)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (selectedOrder !== o.id) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={e => { if (selectedOrder !== o.id) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 11, color: M.textFaint }}>
                      #{o.numero || o.id?.slice(0, 6).toUpperCase()}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, color: M.text }}>{o.cliente_nome}</div>
                      {o.cliente_email && <div style={{ fontSize: 11, color: M.textFaint, marginTop: 1 }}>{o.cliente_email}</div>}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: M.textMid }}>
                      {o.itens?.length || 0} item{o.itens?.length !== 1 ? 's' : ''}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {stage && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: `${stage.cor}18`, color: stage.cor }}>
                          {stage.icone} {stage.nome}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                        background: o.status_pagamento === 'confirmado' ? 'rgba(76,175,80,0.15)'
                                  : o.status_pagamento === 'recusado'   ? 'rgba(239,83,80,0.15)'
                                  : 'rgba(255,255,255,0.06)',
                        color: o.status_pagamento === 'confirmado' ? '#81C784'
                             : o.status_pagamento === 'recusado'   ? '#FF8A88'
                             : M.textMid,
                      }}>
                        {o.status_pagamento}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: M.accent }}>{fmtBRL(o.valor_total)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11, color: M.textFaint, whiteSpace: 'nowrap' }}>{fmtD(o.criado_em)}</td>
                    <td style={{ padding: '12px 14px', color: M.textFaint, fontSize: 16 }}>›</td>
                  </tr>
                );
              })}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '48px 0', textAlign: 'center', color: M.textFaint, fontSize: 13 }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🛍️</div>
                    Nenhum pedido encontrado
                    {hasFilter && (
                      <button onClick={() => { setSearch(''); setFilterStage(''); setFilterPag(''); }} style={{ display: 'block', margin: '8px auto 0', background: 'none', border: 'none', cursor: 'pointer', color: M.accent, fontSize: 13, fontFamily: "'Jost', sans-serif" }}>
                        Limpar filtros
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <button className="eco-btn eco-btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setPage(1)} disabled={page === 1}>«</button>
          <button className="eco-btn eco-btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹ Anterior</button>
          <span style={{ fontSize: 12, color: M.textFaint, padding: '0 8px' }}>Pág {page}/{totalPages}</span>
          <button className="eco-btn eco-btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Próxima ›</button>
          <button className="eco-btn eco-btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
        </div>
      )}

      {/* Painel detalhe */}
      {selectedOrder && (() => {
        const order = orders.find(o => o.id === selectedOrder);
        return order ? (
          <OrderDetail
            key={order.id}
            order={order}
            stages={stages}
            M={M}
            updateOrder={updateOrder}
            moveOrder={moveOrder}
            onClose={() => onSelectOrder(null)}
          />
        ) : null;
      })()}
    </div>
  );
}