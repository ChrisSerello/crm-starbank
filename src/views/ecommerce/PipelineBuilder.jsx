// src/views/ecommerce/PipelineBuilder.jsx
// Editor visual de estágios — lojista cria, edita, reordena e remove

import { useState, useRef } from 'react';

const CORES_PRESET = [
  '#C9A96E', '#5B4FE8', '#1E8F5E', '#C4720A',
  '#1A9E8A', '#C4423A', '#7C72F0', '#42A5F5',
  '#EC407A', '#AB47BC', '#26A69A', '#78909C',
];

const ICONES_PRESET = [
  '🛍️','✅','👗','📦','🚚','🎉','❌','⚙️',
  '💳','🔍','📋','⭐','🔔','💬','📍','🎯',
  '👀','🕐','✉️','🔒','💎','🏷️','🛒','🎀',
];

function StageCard({ stage, index, total, onEdit, onDelete, onMoveUp, onMoveDown, M }) {
  const [hover, setHover] = useState(false);
  const isFixed = !stage.is_deletavel;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 18px',
        background: hover ? 'rgba(255,255,255,0.03)' : 'transparent',
        borderRadius: 10, transition: 'background 0.15s',
        cursor: 'default',
      }}
    >
      {/* Ordem + drag handle */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          style={{
            background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer',
            color: index === 0 ? M.textFaint : M.textMid, fontSize: 11, padding: '1px 4px',
            opacity: index === 0 ? 0.3 : 1,
          }}
        >▲</button>
        <span style={{ fontSize: 11, color: M.textFaint, fontWeight: 700, minWidth: 18, textAlign: 'center' }}>
          {index + 1}
        </span>
        <button
          onClick={onMoveDown}
          disabled={index === total - 1}
          style={{
            background: 'none', border: 'none', cursor: index === total - 1 ? 'default' : 'pointer',
            color: index === total - 1 ? M.textFaint : M.textMid, fontSize: 11, padding: '1px 4px',
            opacity: index === total - 1 ? 0.3 : 1,
          }}
        >▼</button>
      </div>

      {/* Ícone colorido */}
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: `${stage.cor}20`,
        border: `1px solid ${stage.cor}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
      }}>
        {stage.icone}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: M.text }}>{stage.nome}</div>
          {isFixed && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
              background: 'rgba(255,255,255,0.06)', color: M.textFaint,
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>FIXO</span>
          )}
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
            background: `${stage.cor}18`, color: stage.cor,
            letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>{stage.tipo}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: stage.cor, flexShrink: 0 }}/>
          <span style={{ fontSize: 11, color: M.textFaint, fontFamily: 'monospace' }}>{stage.cor}</span>
        </div>
      </div>

      {/* Ações */}
      <div style={{ display: 'flex', gap: 7, flexShrink: 0, opacity: hover ? 1 : 0.4, transition: 'opacity 0.15s' }}>
        <button
          onClick={() => onEdit(stage)}
          className="eco-btn eco-btn-ghost"
          style={{ padding: '6px 12px', fontSize: 12 }}
        >
          ✎ Editar
        </button>
        {!isFixed && (
          <button
            onClick={() => onDelete(stage)}
            style={{
              padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', border: 'none',
              background: 'rgba(239,83,80,0.1)', color: '#FF8A88',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,83,80,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,83,80,0.1)'}
          >
            ✕ Remover
          </button>
        )}
      </div>
    </div>
  );
}

function StageModal({ stage, onSave, onClose, M }) {
  const isNew = !stage?.id;
  const [nome, setNome]   = useState(stage?.nome || '');
  const [cor, setCor]     = useState(stage?.cor || '#C9A96E');
  const [icone, setIcone] = useState(stage?.icone || '📦');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleSave = async () => {
    if (!nome.trim()) { setError('O nome do estágio é obrigatório.'); return; }
    setSaving(true);
    const { error } = await onSave({ nome: nome.trim(), cor, icone });
    setSaving(false);
    if (error) setError(error.message || 'Erro ao salvar.');
    else onClose();
  };

  return (
    <div className="eco-modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="eco-modal-box" style={{ maxWidth: 460 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: M.text, marginBottom: 3 }}>
              {isNew ? 'Novo estágio' : 'Editar estágio'}
            </div>
            <div style={{ fontSize: 12, color: M.textFaint }}>
              {isNew ? 'Adicione um novo passo ao seu pipeline' : 'Altere nome, cor e ícone'}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: `1px solid ${M.border}`,
            borderRadius: 9, cursor: 'pointer', width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, color: M.textMid,
          }}>×</button>
        </div>

        {/* Preview */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
          borderRadius: 12, background: `${cor}10`, border: `1px solid ${cor}30`,
          marginBottom: 22,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 11,
            background: `${cor}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>{icone}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: M.text }}>{nome || 'Nome do estágio'}</div>
            <div style={{ fontSize: 11, color: cor, fontWeight: 600, marginTop: 2 }}>Estágio personalizado</div>
          </div>
        </div>

        {/* Nome */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: M.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>
            Nome do estágio *
          </label>
          <input
            className="eco-inp"
            value={nome}
            onChange={e => { setNome(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="Ex: Em Revisão, Aguardando Pagamento…"
            autoFocus
          />
        </div>

        {/* Ícone */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: M.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>
            Ícone
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ICONES_PRESET.map(ic => (
              <button
                key={ic}
                onClick={() => setIcone(ic)}
                style={{
                  width: 38, height: 38, borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontSize: 18, background: ic === icone ? `${cor}25` : 'rgba(255,255,255,0.04)',
                  outline: ic === icone ? `2px solid ${cor}` : 'none',
                  transition: 'all 0.12s',
                }}
              >{ic}</button>
            ))}
          </div>
        </div>

        {/* Cor */}
        <div style={{ marginBottom: error ? 12 : 22 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: M.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>
            Cor
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {CORES_PRESET.map(c => (
              <button
                key={c}
                onClick={() => setCor(c)}
                style={{
                  width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: c, flexShrink: 0,
                  outline: c === cor ? `2px solid ${M.text}` : '2px solid transparent',
                  outlineOffset: 2, transition: 'all 0.12s', transform: c === cor ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            ))}
            {/* Input hex manual */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 120 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: cor, flexShrink: 0 }}/>
              <input
                className="eco-inp"
                value={cor}
                onChange={e => setCor(e.target.value)}
                placeholder="#C9A96E"
                style={{ height: 36, padding: '0 10px', fontSize: 12, fontFamily: 'monospace' }}
              />
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '9px 12px', borderRadius: 8, marginBottom: 16,
            background: 'rgba(239,83,80,0.1)', border: '1px solid rgba(239,83,80,0.2)',
            fontSize: 12, color: '#FF8A88', display: 'flex', gap: 7, alignItems: 'center',
          }}>⚠ {error}</div>
        )}

        {/* Botões */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="eco-btn eco-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="eco-btn eco-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando…' : isNew ? '+ Criar estágio' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PipelineBuilder({
  M, stages, createStage, updateStage, deleteStage, reorderStages,
  orders,
}) {
  const [editStage, setEditStage] = useState(null); // null | stage | '__new__'
  const [confirmDel, setConfirmDel] = useState(null);
  const [msg, setMsg] = useState(null);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleSave = async (data) => {
    let result;
    if (editStage === '__new__') {
      result = await createStage(data);
      if (!result.error) showMsg('Estágio criado com sucesso!');
    } else {
      result = await updateStage(editStage.id, data);
      if (!result.error) showMsg('Estágio atualizado!');
    }
    return result;
  };

  const handleDelete = async (stage) => {
    const ordersInStage = orders.filter(o => o.stage_id === stage.id).length;
    const { error } = await deleteStage(stage.id);
    if (!error) showMsg(`"${stage.nome}" removido. ${ordersInStage > 0 ? `${ordersInStage} pedido(s) movido(s) para o primeiro estágio.` : ''}`);
    else showMsg(error.message, 'error');
    setConfirmDel(null);
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newOrder = stages.map(s => s.id);
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    reorderStages(newOrder);
  };

  const handleMoveDown = (index) => {
    if (index === stages.length - 1) return;
    const newOrder = stages.map(s => s.id);
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    reorderStages(newOrder);
  };

  const ordersPerStage = (id) => orders.filter(o => o.stage_id === id).length;

  return (
    <div style={{ padding: '28px 32px', maxWidth: 800 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: M.text, marginBottom: 4 }}>
            Configurar Pipeline
          </div>
          <div style={{ fontSize: 13, color: M.textFaint }}>
            {stages.length} estágio{stages.length !== 1 ? 's' : ''} · Arraste para reordenar
          </div>
        </div>
        <button
          className="eco-btn eco-btn-primary"
          onClick={() => setEditStage('__new__')}
        >
          + Novo estágio
        </button>
      </div>

      {/* Alerta msg */}
      {msg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9, padding: '10px 14px',
          borderRadius: 9, marginBottom: 16,
          background: msg.type === 'success' ? 'rgba(76,175,80,0.1)' : 'rgba(239,83,80,0.1)',
          border: `1px solid ${msg.type === 'success' ? 'rgba(76,175,80,0.25)' : 'rgba(239,83,80,0.25)'}`,
          fontSize: 13, color: msg.type === 'success' ? '#81C784' : '#FF8A88',
        }}>
          {msg.type === 'success' ? '✓' : '⚠'} {msg.text}
        </div>
      )}

      {/* Info visual */}
      <div style={{
        padding: '12px 16px', borderRadius: 10,
        background: M.accentDim, border: `1px solid ${M.accent}30`,
        marginBottom: 20, fontSize: 12, color: M.textMid, lineHeight: 1.7,
      }}>
        💡 Os estágios <strong style={{ color: M.text }}>FIXO</strong> não podem ser removidos — eles garantem o fluxo mínimo do pipeline.
        Você pode editar nome, cor e ícone de qualquer estágio, e criar quantos quiser.
      </div>

      {/* Lista de estágios */}
      <div style={{
        background: '#141414', border: `1px solid ${M.border}`,
        borderRadius: 14, overflow: 'hidden',
      }}>
        {stages.map((stage, i) => (
          <div key={stage.id}>
            <StageCard
              stage={stage}
              index={i}
              total={stages.length}
              M={M}
              onEdit={s => setEditStage(s)}
              onDelete={s => setConfirmDel(s)}
              onMoveUp={() => handleMoveUp(i)}
              onMoveDown={() => handleMoveDown(i)}
            />
            {/* Contador de pedidos neste estágio */}
            {ordersPerStage(stage.id) > 0 && (
              <div style={{
                marginLeft: 78, marginBottom: 8, marginTop: -4,
                fontSize: 10, color: M.textFaint,
              }}>
                {ordersPerStage(stage.id)} pedido{ordersPerStage(stage.id) !== 1 ? 's' : ''} neste estágio
              </div>
            )}
            {i < stages.length - 1 && <hr className="eco-divider"/>}
          </div>
        ))}

        {stages.length === 0 && (
          <div style={{ padding: '48px 0', textAlign: 'center', fontSize: 13, color: M.textFaint }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
            Nenhum estágio configurado. Crie o primeiro!
          </div>
        )}
      </div>

      {/* Visualização do fluxo */}
      <div style={{ marginTop: 24 }}>
        <div className="eco-eyebrow" style={{ marginBottom: 12 }}>Visualização do fluxo</div>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0, rowGap: 8 }}>
          {stages.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: `${s.cor}18`, color: s.cor,
                border: `1px solid ${s.cor}30`, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span>{s.icone}</span> {s.nome}
              </div>
              {i < stages.length - 1 && (
                <div style={{ fontSize: 12, color: M.textFaint, margin: '0 6px' }}>→</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal criar/editar */}
      {editStage && (
        <StageModal
          stage={editStage === '__new__' ? null : editStage}
          onSave={handleSave}
          onClose={() => setEditStage(null)}
          M={M}
        />
      )}

      {/* Modal confirmar deleção */}
      {confirmDel && (
        <div className="eco-modal-bg" onClick={e => { if (e.target === e.currentTarget) setConfirmDel(null); }}>
          <div className="eco-modal-box" style={{ maxWidth: 400, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: M.text, marginBottom: 8 }}>
              Remover "{confirmDel.nome}"?
            </div>
            <div style={{ fontSize: 13, color: M.textMid, lineHeight: 1.6, marginBottom: 8 }}>
              {ordersPerStage(confirmDel.id) > 0
                ? `${ordersPerStage(confirmDel.id)} pedido(s) neste estágio serão movidos para "${stages.find(s => s.tipo === 'entrada')?.nome || 'primeiro estágio'}".`
                : 'Não há pedidos neste estágio.'}
            </div>
            <div style={{ fontSize: 13, color: M.textFaint, marginBottom: 22 }}>
              Esta ação não pode ser desfeita.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="eco-btn eco-btn-ghost" onClick={() => setConfirmDel(null)}>Cancelar</button>
              <button
                className="eco-btn"
                style={{ background: '#EF5350', color: '#fff', boxShadow: '0 3px 12px rgba(239,83,80,0.3)' }}
                onClick={() => handleDelete(confirmDel)}
              >
                Sim, remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}