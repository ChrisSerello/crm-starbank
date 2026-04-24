// src/views/ecommerce/EcommerceDashboard.jsx

import { useMemo } from 'react';

const fmtBRL = v => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';
const fmtD   = d => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

export function EcommerceDashboard({
  M, orders, products, stages, metrics, config, customers,
}) {
  // ── Pedidos dos últimos 7 dias por dia ───────────────────
  const graficoSemana = useMemo(() => {
    const dias = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('pt-BR', { weekday: 'short' });
      const count = orders.filter(o => o.criado_em?.startsWith(key)).length;
      const receita = orders
        .filter(o => o.criado_em?.startsWith(key))
        .reduce((s, o) => s + (o.valor_total || 0), 0);
      dias.push({ key, label, count, receita });
    }
    return dias;
  }, [orders]);

  const maxReceita = Math.max(...graficoSemana.map(d => d.receita), 1);

  // ── Pipeline distribuição ────────────────────────────────
  const byStage = useMemo(() =>
    stages.map(s => ({
      ...s,
      count: orders.filter(o => o.stage_id === s.id).length,
    }))
  , [stages, orders]);

  // ── Pedidos recentes ─────────────────────────────────────
  const recentes = orders.slice(0, 8);

  // ── Produtos mais vendidos ───────────────────────────────
  const topProdutos = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      (o.itens || []).forEach(item => {
        if (!map[item.nome]) map[item.nome] = { nome: item.nome, qty: 0, receita: 0 };
        map[item.nome].qty += item.qty || 1;
        map[item.nome].receita += (item.preco || 0) * (item.qty || 1);
      });
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [orders]);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 28, fontWeight: 400, color: M.text,
          letterSpacing: '-0.01em', marginBottom: 4,
        }}>
          {config?.nome_loja || 'Minha Loja'}
        </div>
        <div style={{ fontSize: 13, color: M.textFaint, letterSpacing: '0.04em' }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* Métricas principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'Total de Pedidos', value: metrics.totalOrders, sub: 'Todos os tempos', color: M.accent, icon: '🛍️' },
          { label: 'Receita Total',    value: fmtBRL(metrics.totalReceita), sub: 'Faturamento bruto', color: '#4CAF50', icon: '💰' },
          { label: 'Ticket Médio',     value: fmtBRL(metrics.ticketMedio), sub: 'Por pedido', color: '#42A5F5', icon: '📊' },
          { label: 'Pedidos Ativos',   value: metrics.pedidosPendentes, sub: 'Em andamento', color: M.amber, icon: '⚡' },
        ].map((card, i) => (
          <div key={i} className="eco-card" style={{ padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', top: -20, right: -20,
              width: 80, height: 80, borderRadius: '50%',
              background: card.color, filter: 'blur(32px)', opacity: 0.15,
            }}/>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div className="eco-eyebrow">{card.label}</div>
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: `${card.color}18`, display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 15,
              }}>{card.icon}</div>
            </div>
            <div style={{
              fontSize: 26, fontWeight: 700, color: M.text,
              fontFamily: "'Playfair Display', serif", lineHeight: 1, marginBottom: 6,
            }}>{card.value}</div>
            <div style={{ fontSize: 11, color: M.textFaint }}>{card.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>

        {/* Gráfico de barras — receita por dia */}
        <div className="eco-card" style={{ padding: '20px 22px' }}>
          <div className="eco-eyebrow" style={{ marginBottom: 18 }}>Receita — últimos 7 dias</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
            {graficoSemana.map((dia, i) => (
              <div key={dia.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 9, color: M.textFaint, fontWeight: 600 }}>
                  {dia.receita > 0 ? fmtBRL(dia.receita).replace('R$\u00a0', '') : ''}
                </div>
                <div style={{
                  width: '100%', borderRadius: '4px 4px 0 0',
                  height: `${Math.max((dia.receita / maxReceita) * 76, dia.receita > 0 ? 4 : 0)}px`,
                  background: i === 6
                    ? `linear-gradient(to top, ${M.accent}, ${M.accent}99)`
                    : `rgba(201,169,110,0.25)`,
                  transition: 'height 0.6s cubic-bezier(0.4,0,0.2,1)',
                  minHeight: 2,
                }}/>
                <div style={{ fontSize: 9, color: M.textFaint, textTransform: 'capitalize' }}>{dia.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: M.textFaint }}>Hoje</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: M.accent }}>
                {fmtBRL(graficoSemana[6]?.receita || 0)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: M.textFaint }}>Pedidos hoje</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: M.text }}>
                {graficoSemana[6]?.count || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline por estágio */}
        <div className="eco-card" style={{ padding: '20px 22px' }}>
          <div className="eco-eyebrow" style={{ marginBottom: 14 }}>Pipeline por estágio</div>
          {byStage.map(s => {
            const pct = metrics.totalOrders > 0 ? (s.count / metrics.totalOrders) * 100 : 0;
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 14, width: 22, textAlign: 'center', flexShrink: 0 }}>{s.icone}</span>
                <div style={{ flex: 1, fontSize: 12, color: M.textMid, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nome}</div>
                <div style={{ width: 100, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', flexShrink: 0 }}>
                  <div style={{ height: '100%', borderRadius: 99, background: s.cor, width: `${pct}%`, transition: 'width 0.6s' }}/>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: M.text, width: 22, textAlign: 'right', flexShrink: 0 }}>{s.count}</div>
              </div>
            );
          })}
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Pedidos recentes */}
        <div className="eco-card" style={{ padding: '20px 22px' }}>
          <div className="eco-eyebrow" style={{ marginBottom: 14 }}>Pedidos Recentes</div>
          {recentes.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: M.textFaint }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🛍️</div>
              Nenhum pedido ainda
            </div>
          )}
          {recentes.map((o, i) => {
            const stage = stages.find(s => s.id === o.stage_id);
            return (
              <div key={o.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0',
                borderBottom: i < recentes.length - 1 ? `1px solid ${M.border}` : 'none',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  background: stage ? `${stage.cor}18` : M.accentDim,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                }}>
                  {stage?.icone || '🛒'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: M.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {o.cliente_nome}
                  </div>
                  <div style={{ fontSize: 11, color: M.textFaint, marginTop: 1 }}>
                    {fmtD(o.criado_em)} · {o.itens?.length || 0} item(s)
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: M.accent }}>{fmtBRL(o.valor_total)}</div>
                  {stage && (
                    <div style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, marginTop: 3,
                      background: `${stage.cor}18`, color: stage.cor,
                    }}>{stage.nome}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Top produtos */}
        <div className="eco-card" style={{ padding: '20px 22px' }}>
          <div className="eco-eyebrow" style={{ marginBottom: 14 }}>Produtos mais vendidos</div>
          {topProdutos.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: M.textFaint }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>👗</div>
              Sem vendas registradas
            </div>
          )}
          {topProdutos.map((p, i) => (
            <div key={p.nome} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 0',
              borderBottom: i < topProdutos.length - 1 ? `1px solid ${M.border}` : 'none',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: i === 0 ? M.accentDim : 'rgba(255,255,255,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                color: i === 0 ? M.accent : M.textFaint,
              }}>
                {i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: M.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</div>
                <div style={{ fontSize: 10, color: M.textFaint, marginTop: 1 }}>{p.qty} vendido{p.qty !== 1 ? 's' : ''}</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#4CAF50', flexShrink: 0 }}>{fmtBRL(p.receita)}</div>
            </div>
          ))}

          {/* Alertas de estoque */}
          {metrics.produtosEstoqueBaixo > 0 && (
            <div style={{
              marginTop: 14, padding: '10px 12px', borderRadius: 9,
              background: 'rgba(255,167,38,0.1)', border: '1px solid rgba(255,167,38,0.2)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 14 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: M.amber }}>
                  {metrics.produtosEstoqueBaixo} produto{metrics.produtosEstoqueBaixo !== 1 ? 's' : ''} com estoque baixo
                </div>
                <div style={{ fontSize: 11, color: M.textFaint }}>Verifique o catálogo</div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}