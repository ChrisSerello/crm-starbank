// src/views/ecommerce/OrdersKanban.jsx
// Kanban que lê estágios dinâmicos — cada coluna = 1 stage do banco

import { useState, useMemo } from 'react';

const fmtBRL = v => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';
const fmtD   = d => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

// ── Card de pedido ────────────────────────────────────────────
function OrderCard({ order, stage, onSelect, onMove, stages, M }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="eco-kcard"
      draggable
      onDragStart={e => e.dataTransfer.setData('orderId', order.id)}
      onClick={() => !menuOpen && onSelect(order.id)}
      style={{ position: 'relative', zIndex: menuOpen ? 50 : 1 }}
    >
      {/* Topo: cliente + menu */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 7 }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: M.text, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {order.cliente_nome}
          </div>
          <div style={{ fontSize: 10, color: M.textFaint, marginTop: 2 }}>
            Pedido #{order.numero || order.id?.slice(0, 6).toUpperCase()}
          </div>
        </div>
        {/* 3-dot menu para mover */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: M.textFaint, fontSize: 16, padding: '2px 5px',
              borderRadius: 5, lineHeight: 1,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >⋮</button>
          {menuOpen && (
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'absolute', top: '100%', right: 0, zIndex: 999,
                background: '#1E1E1E', border: `1px solid ${M.borderMid}`,
                borderRadius: 10, minWidth: 180, overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.7)', marginTop: 4,
              }}
            >
              <div style={{ padding: '8px 12px 6px', fontSize: 9, fontWeight: 700, color: M.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${M.border}` }}>
                Mover para
              </div>
              {stages.map(s => {
                const isCurrent = s.id === order.stage_id;
                return (
                  <button
                    key={s.id}
                    onClick={() => { onMove(order.id, s.id); setMenuOpen(false); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                      padding: '9px 12px', border: 'none', cursor: isCurrent ? 'default' : 'pointer',
                      background: isCurrent ? 'rgba(255,255,255,0.04)' : 'none',
                      fontFamily: "'Jost', sans-serif", fontSize: 12,
                      fontWeight: isCurrent ? 600 : 400,
                      color: isCurrent ? s.cor : M.text, textAlign: 'left',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                    onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'none'; }}
                  >
                    <span style={{ fontSize: 14 }}>{s.icone}</span>
                    {s.nome}
                    {isCurrent && <span style={{ marginLeft: 'auto', fontSize: 9, color: s.cor }}>✓ atual</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Itens */}
      {order.itens?.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {order.itens.slice(0, 2).map((item, i) => (
            <div key={i} style={{ fontSize: 11, color: M.textMid, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: M.textFaint, flexShrink: 0 }}/>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {item.qty}× {item.nome}
              </span>
            </div>
          ))}
          {order.itens.length > 2 && (
            <div style={{ fontSize: 10, color: M.textFaint }}>+{order.itens.length - 2} item(s)</div>
          )}
        </div>
      )}

      {/* Footer: valor + data */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: M.accent }}>{fmtBRL(order.valor_total)}</div>
        <div style={{ fontSize: 10, color: M.textFaint }}>{fmtD(order.criado_em)}</div>
      </div>

      {/* Status pagamento */}
      {order.status_pagamento && order.status_pagamento !== 'pendente' && (
        <div style={{
          marginTop: 7, paddingTop: 7, borderTop: `1px solid ${M.border}`,
          fontSize: 10, fontWeight: 600,
          color: order.status_pagamento === 'confirmado' ? '#81C784'
               : order.status_pagamento === 'recusado'   ? '#FF8A88'
               : M.textFaint,
        }}>
          💳 {order.status_pagamento}
        </div>
      )}
    </div>
  );
}

// ── Coluna ────────────────────────────────────────────────────
function KanbanColumn({ stage, orders, stages, onSelect, onMove, isSearching, allCount, M }) {
  const [over, setOver] = useState(false);
  const total = orders.reduce((s, o) => s + (o.valor_total || 0), 0);

  return (
    <div
      style={{
        minWidth: 220, width: 230, flexShrink: 0,
        background: over ? `${stage.cor}08` : 'rgba(255,255,255,0.02)',
        border: `1px solid ${over ? stage.cor + '40' : M.border}`,
        borderRadius: 14, padding: '12px 10px',
        transition: 'all 0.18s',
        boxShadow: over ? `0 0 0 2px ${stage.cor}25` : 'none',
      }}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => {
        e.preventDefault();
        setOver(false);
        const orderId = e.dataTransfer.getData('orderId');
        if (orderId) onMove(orderId, stage.id);
      }}
    >
      {/* Header da coluna */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 11, padding: '0 3px' }}>
        <span style={{ fontSize: 15, flexShrink: 0 }}>{stage.icone}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: M.textMid, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {stage.nome}
          </div>
          {total > 0 && (
            <div style={{ fontSize: 9, color: stage.cor, fontWeight: 600, marginTop: 1 }}>
              {fmtBRL(total)}
            </div>
          )}
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, background: `${stage.cor}18`, color: stage.cor,
          borderRadius: 99, padding: '2px 7px', flexShrink: 0,
        }}>
          {isSearching ? `${orders.length}/${allCount}` : orders.length}
        </span>
      </div>

      {/* Cards */}
      <div style={{ minHeight: 48 }}>
        {orders.map(o => (
          <OrderCard
            key={o.id}
            order={o}
            stage={stage}
            stages={stages}
            onSelect={onSelect}
            onMove={onMove}
            M={M}
          />
        ))}
        {orders.length === 0 && (
          <div style={{ textAlign: 'center', padding: '18px 0', fontSize: 11, color: M.textFaint, letterSpacing: '0.04em' }}>
            {isSearching ? 'Sem resultado' : 'Solte aqui'}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Kanban ───────────────────────────────────────────────
export function OrdersKanban({ M, stages, orders, moveOrder, onSelectOrder }) {
  const [search, setSearch]   = useState('');
  const [filterStage, setFilterStage] = useState('');

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    return orders.filter(o => {
      if (filterStage && o.stage_id !== filterStage) return false;
      if (!s) return true;
      return (
        o.cliente_nome?.toLowerCase().includes(s) ||
        o.cliente_email?.toLowerCase().includes(s) ||
        o.cliente_telefone?.includes(s) ||
        String(o.numero)?.includes(s)
      );
    });
  }, [orders, search, filterStage]);

  const isSearching = !!search.trim() || !!filterStage;
  const totalFiltrado = filtered.reduce((s, o) => s + (o.valor_total || 0), 0);

  return (
    <div style={{ padding: '28px 32px', overflowX: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: M.text, marginBottom: 3 }}>
            Pipeline de Pedidos
          </div>
          <div style={{ fontSize: 12, color: M.textFaint }}>
            {isSearching
              ? `${filtered.length} pedido(s) · ${fmtBRL(totalFiltrado)}`
              : `${orders.length} pedido(s) · Arraste para mover entre estágios`}
          </div>
        </div>

        {/* Busca + filtro */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {filterStage && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
              borderRadius: 99, background: M.accentDim, border: `1px solid ${M.accent}30`,
              fontSize: 11, color: M.accent, fontWeight: 600,
            }}>
              {stages.find(s => s.id === filterStage)?.nome}
              <button onClick={() => setFilterStage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: M.accent, fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
            </div>
          )}
          <div style={{ position: 'relative', width: 260 }}>
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: M.textFaint, fontSize: 13, pointerEvents: 'none' }}>⌕</span>
            <input
              className="eco-inp"
              style={{ paddingLeft: 32, paddingRight: search ? 32 : 12, height: 36, fontSize: 12 }}
              placeholder="Buscar cliente, pedido…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%',
                cursor: 'pointer', width: 18, height: 18, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 11, color: M.textMid,
              }}>×</button>
            )}
          </div>
        </div>
      </div>

      {/* Colunas */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', minWidth: 'max-content', paddingBottom: 16 }}>
        {stages.map(stage => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            stages={stages}
            orders={filtered.filter(o => o.stage_id === stage.id)}
            allCount={orders.filter(o => o.stage_id === stage.id).length}
            isSearching={isSearching}
            onSelect={onSelectOrder}
            onMove={moveOrder}
            M={M}
          />
        ))}
        {stages.length === 0 && (
          <div style={{ flex: 1, textAlign: 'center', padding: '80px 0', fontSize: 13, color: M.textFaint }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚙️</div>
            Configure os estágios do pipeline primeiro.
          </div>
        )}
      </div>
    </div>
  );
}