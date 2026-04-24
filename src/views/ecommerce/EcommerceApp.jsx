// src/views/ecommerce/EcommerceApp.jsx
// Entry point do módulo e-commerce — análogo ao BKOApp e CorbanApp

import { useState } from 'react';
import { useEcommerce } from '../../hooks/useEcommerce';
import { AlterarSenha } from '../../components/AlterarSenha';
import { Avatar } from '../../components/shared';

import { EcommerceDashboard }  from './EcommerceDashboard';
import { OrdersKanban }        from './OrdersKanban';
import { OrdersList }          from './OrdersList';
import { PipelineBuilder }     from './PipelineBuilder';
import { ProductManager }      from './ProductManager';
import { StorefrontConfig }    from './StorefrontConfig';

// ── PALETA MODA ───────────────────────────────────────────────
// Sofisticada, editorial, atemporal
const M = {
  bg:       '#0C0C0C',   // preto editorial
  surface:  '#141414',
  card:     '#1A1A1A',
  border:   'rgba(255,255,255,0.08)',
  borderMid:'rgba(255,255,255,0.14)',
  accent:   '#C9A96E',   // dourado
  accentDim:'rgba(201,169,110,0.12)',
  accentGlow:'rgba(201,169,110,0.25)',
  text:     '#F0EDE8',   // creme
  textMid:  '#A09890',
  textFaint:'#5A524A',
  success:  '#4CAF50',
  danger:   '#EF5350',
  amber:    '#FFA726',
};

const ROLE_LABELS = {
  lojista:  'Lojista',
  gerente:  'Gerente',
  operador: 'Operador',
};

// ── SIDEBAR ───────────────────────────────────────────────────
function EcommerceSidebar({ view, setView, profile, config, onLogout, onAlterarSenha }) {
  const items = [
    { id: 'dashboard',  icon: '◈', label: 'Dashboard'    },
    { id: 'kanban',     icon: '⊞', label: 'Pipeline'     },
    { id: 'orders',     icon: '≡', label: 'Pedidos'      },
    { id: 'products',   icon: '◻', label: 'Produtos'     },
    { id: 'pipeline',   icon: '⚙', label: 'Config. Pipeline' },
    { id: 'storefront', icon: '🏪', label: 'Minha Loja'  },
  ];

  return (
    <div style={{
      width: 232, flexShrink: 0, height: '100vh', position: 'sticky', top: 0,
      background: M.bg, borderRight: `1px solid ${M.border}`,
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Jost', sans-serif",
    }}>
      {/* Logo / Nome da loja */}
      <div style={{ padding: '22px 20px 18px', borderBottom: `1px solid ${M.border}` }}>
        {config?.logo_url ? (
          <img src={config.logo_url} alt={config.nome_loja}
            style={{ maxHeight: 36, maxWidth: 160, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}/>
        ) : (
          <div>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 17, fontWeight: 600, color: M.text, letterSpacing: '0.02em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {config?.nome_loja || 'Minha Loja'}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: M.accent, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 3 }}>
              E-COMMERCE CRM
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 10px', flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: M.textFaint, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '8px 8px 6px' }}>
          Navegação
        </div>
        {items.map(it => (
          <button
            key={it.id}
            onClick={() => setView(it.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 11,
              padding: '10px 12px', borderRadius: 8, width: '100%', textAlign: 'left',
              border: 'none', cursor: 'pointer', fontFamily: "'Jost', sans-serif",
              fontSize: 13.5, fontWeight: view === it.id ? 600 : 400,
              transition: 'all 0.15s',
              position: 'relative',
              background: view === it.id ? M.accentDim : 'transparent',
              color: view === it.id ? M.accent : M.textMid,
            }}
            onMouseEnter={e => { if (view !== it.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { if (view !== it.id) e.currentTarget.style.background = 'transparent'; }}
          >
            {view === it.id && (
              <div style={{
                position: 'absolute', left: 0, top: '18%', bottom: '18%',
                width: 3, background: M.accent, borderRadius: '0 3px 3px 0',
              }}/>
            )}
            <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>{it.icon}</span>
            {it.label}
          </button>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: '14px 16px', borderTop: `1px solid ${M.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Avatar name={profile?.nome || 'U'} size={30} color={M.accent}/>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: M.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.nome || 'Usuário'}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: M.accent, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {ROLE_LABELS[profile?.role] || 'Lojista'}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: M.success, boxShadow: `0 0 5px ${M.success}`, flexShrink: 0 }}/>
        </div>
        <button
          onClick={onAlterarSenha}
          style={{
            width: '100%', padding: '7px 0', borderRadius: 7, marginBottom: 5,
            background: 'rgba(255,255,255,0.05)', border: `1px solid ${M.border}`,
            color: M.textMid, fontSize: 12, fontWeight: 500, cursor: 'pointer',
            fontFamily: "'Jost', sans-serif", transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
        >
          🔑 Alterar senha
        </button>
        <button
          onClick={onLogout}
          style={{
            width: '100%', padding: '7px 0', borderRadius: 7,
            background: 'rgba(239,83,80,0.1)', border: '1px solid rgba(239,83,80,0.25)',
            color: '#FF8A88', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: "'Jost', sans-serif", transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,83,80,0.18)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,83,80,0.1)'}
        >
          Sair da conta
        </button>
      </div>
    </div>
  );
}

// ── LOADING / ERRO ────────────────────────────────────────────
function EcommerceLoading() {
  return (
    <div style={{
      minHeight: '100vh', background: M.bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Jost', sans-serif",
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: M.accent, marginBottom: 12, letterSpacing: '0.04em' }}>
          ◈
        </div>
        <div style={{ fontSize: 13, color: M.textFaint, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Carregando loja…
        </div>
      </div>
    </div>
  );
}

function EcommerceError({ message }) {
  return (
    <div style={{
      minHeight: '100vh', background: M.bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Jost', sans-serif",
    }}>
      <div style={{ textAlign: 'center', maxWidth: 360, padding: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: M.text, marginBottom: 8 }}>
          Erro ao carregar
        </div>
        <div style={{ fontSize: 13, color: M.textMid, lineHeight: 1.6 }}>{message}</div>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────
export function EcommerceApp({ profile, session, signOut, onAlterarSenha }) {
  const [view, setView]       = useState('dashboard');
  const [showAS, setShowAS]   = useState(false);
  const [selOrder, setSelOrder] = useState(null);

  const ecommerce = useEcommerce(profile, session);
  const {
    tenant, config, stages, orders, leads,
    products, categories, collections, customers,
    metrics, loading, error,
    createStage, updateStage, deleteStage, reorderStages,
    createOrder, moveOrder, updateOrder,
    createProduct, updateProduct, deleteProduct,
    createCategory, createCollection,
    stageById,
  } = ecommerce;

  // Injetar fontes moda no head (uma vez)
  if (typeof document !== 'undefined' && !document.getElementById('ecommerce-fonts')) {
    const link = document.createElement('link');
    link.id = 'ecommerce-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Jost:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(link);
  }

  if (loading) return <EcommerceLoading />;
  if (error)   return <EcommerceError message={error} />;

  const sharedProps = {
    tenant, config, stages, orders, leads,
    products, categories, collections, customers,
    metrics, profile, session,
    createStage, updateStage, deleteStage, reorderStages,
    createOrder, moveOrder, updateOrder,
    createProduct, updateProduct, deleteProduct,
    createCategory, createCollection,
    stageById,
    M,     // paleta de cores — todos os componentes filhos usam
    onSelectOrder: setSelOrder,
    selectedOrder: selOrder,
  };

  return (
    <>
      {/* Injetar estilos globais do módulo e-commerce */}
      <style>{`
        .eco-card {
          background: ${M.card};
          border: 1px solid ${M.border};
          border-radius: 14px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .eco-card:hover {
          border-color: ${M.borderMid};
          box-shadow: 0 4px 24px rgba(0,0,0,0.4);
        }
        .eco-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 10px 20px; border-radius: 8px;
          font-family: 'Jost', sans-serif; font-size: 13px; font-weight: 600;
          cursor: pointer; border: none; transition: all 0.15s;
          letter-spacing: 0.02em;
        }
        .eco-btn-primary {
          background: ${M.accent};
          color: #0C0C0C;
          box-shadow: 0 3px 16px ${M.accentGlow};
        }
        .eco-btn-primary:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
          box-shadow: 0 6px 24px ${M.accentGlow};
        }
        .eco-btn-ghost {
          background: rgba(255,255,255,0.05);
          color: ${M.textMid};
          border: 1px solid ${M.border} !important;
        }
        .eco-btn-ghost:hover {
          background: rgba(255,255,255,0.09);
          color: ${M.text};
        }
        .eco-inp {
          width: 100%; background: rgba(255,255,255,0.04);
          border: 1px solid ${M.border}; border-radius: 8px;
          padding: 10px 13px; font-family: 'Jost', sans-serif;
          font-size: 13px; color: ${M.text}; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .eco-inp::placeholder { color: ${M.textFaint}; }
        .eco-inp:focus {
          border-color: ${M.accent};
          box-shadow: 0 0 0 3px ${M.accentDim};
        }
        .eco-sel {
          width: 100%; background: rgba(255,255,255,0.04);
          border: 1px solid ${M.border}; border-radius: 8px;
          padding: 10px 32px 10px 13px; font-family: 'Jost', sans-serif;
          font-size: 13px; color: ${M.text}; outline: none; cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%235A524A' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 12px center;
          transition: border-color 0.2s;
        }
        .eco-sel:focus { border-color: ${M.accent}; }
        .eco-sel option { background: #1A1A1A; color: ${M.text}; }
        .eco-tag {
          display: inline-flex; align-items: center;
          padding: 3px 10px; border-radius: 99px;
          font-size: 11px; font-weight: 600;
          font-family: 'Jost', sans-serif;
        }
        .eco-kcard {
          background: ${M.card}; border: 1px solid ${M.border};
          border-radius: 10px; padding: 13px 14px; margin-bottom: 7px;
          cursor: pointer; transition: all 0.18s;
        }
        .eco-kcard:hover {
          border-color: ${M.accent}40;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.5);
        }
        .eco-divider { border: none; border-top: 1px solid ${M.border}; margin: 0; }
        .eco-eyebrow {
          font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: ${M.textFaint};
          font-family: 'Jost', sans-serif;
        }
        .eco-modal-bg {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.75); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          z-index: 300; animation: ecoFadeIn 0.2s ease;
        }
        .eco-modal-box {
          background: ${M.surface}; border: 1px solid ${M.borderMid};
          border-radius: 18px; width: 540px; max-height: 88vh;
          overflow-y: auto; padding: 28px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.8);
          animation: ecoFadeUp 0.3s cubic-bezier(0.4,0,0.2,1);
        }
        .eco-side-panel {
          position: fixed; top: 0; right: 0; bottom: 0; width: 500px;
          background: ${M.surface}; border-left: 1px solid ${M.borderMid};
          display: flex; flex-direction: column; z-index: 100;
          box-shadow: -8px 0 40px rgba(0,0,0,0.6);
          animation: ecoSlideIn 0.3s cubic-bezier(0.4,0,0.2,1);
        }
        @keyframes ecoFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ecoFadeUp  { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ecoSlideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes ecoPulse   { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>

      <div style={{
        display: 'flex', minHeight: '100vh',
        background: M.bg, fontFamily: "'Jost', sans-serif",
      }}>
        <EcommerceSidebar
          view={view}
          setView={v => { setView(v); setSelOrder(null); }}
          profile={profile}
          config={config}
          onLogout={signOut}
          onAlterarSenha={() => setShowAS(true)}
        />

        <main style={{
          flex: 1, minWidth: 0, overflowY: 'auto',
          paddingRight: selOrder ? 500 : 0,
          transition: 'padding-right 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {view === 'dashboard'  && <EcommerceDashboard  {...sharedProps} />}
          {view === 'kanban'     && <OrdersKanban        {...sharedProps} />}
          {view === 'orders'     && <OrdersList          {...sharedProps} />}
          {view === 'products'   && <ProductManager      {...sharedProps} />}
          {view === 'pipeline'   && <PipelineBuilder     {...sharedProps} />}
          {view === 'storefront' && <StorefrontConfig    {...sharedProps} />}
        </main>
      </div>

      {showAS && <AlterarSenha onClose={() => setShowAS(false)} />}
    </>
  );
}