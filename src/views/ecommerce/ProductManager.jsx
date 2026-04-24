// src/views/ecommerce/ProductManager.jsx

import { useState, useMemo } from 'react';
import { supabase } from '../../supabase';

const fmtBRL = v => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';

const TAMANHOS_MODA   = ['PP', 'P', 'M', 'G', 'GG', 'XG', '36', '38', '40', '42', '44', '46', '48'];
const CORES_MODA      = ['Preto', 'Branco', 'Cinza', 'Azul', 'Azul Marinho', 'Vermelho', 'Rosa', 'Verde', 'Bege', 'Caramelo', 'Marrom', 'Lilás', 'Amarelo', 'Laranja'];
const GENEROS_MODA    = ['Feminino', 'Masculino', 'Unissex', 'Infantil'];

function ProductCard({ product, onEdit, onToggle, onDelete, M, categories, collections }) {
  const cat = categories.find(c => c.id === product.category_id);
  const col = collections.find(c => c.id === product.collection_id);
  const [hover, setHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? 'rgba(255,255,255,0.03)' : '#141414',
        border: `1px solid ${hover ? M.borderMid : M.border}`,
        borderRadius: 12, overflow: 'hidden', transition: 'all 0.18s',
        opacity: product.ativo ? 1 : 0.5,
      }}
    >
      {/* Foto */}
      <div style={{ position: 'relative', paddingBottom: '100%', background: 'rgba(255,255,255,0.03)' }}>
        {product.fotos?.[0] ? (
          <img src={product.fotos[0]} alt={product.nome} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}/>
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: M.textFaint }}>
            👗
          </div>
        )}
        {/* Badges */}
        <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {product.lancamento && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: M.accent, color: '#0C0C0C' }}>NOVO</span>}
          {product.destaque   && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.85)', color: '#0C0C0C' }}>⭐</span>}
          {!product.ativo     && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(239,83,80,0.85)', color: '#fff' }}>INATIVO</span>}
        </div>
        {/* Estoque baixo */}
        {!product.tem_variacoes && product.estoque <= product.estoque_minimo && (
          <div style={{ position: 'absolute', bottom: 8, right: 8 }}>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,167,38,0.9)', color: '#0C0C0C' }}>
              Estoque: {product.estoque}
            </span>
          </div>
        )}
        {/* Ações hover */}
        {hover && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <button className="eco-btn eco-btn-ghost" style={{ padding: '7px 14px', fontSize: 12 }} onClick={() => onEdit(product)}>✎ Editar</button>
            <button
              onClick={() => onToggle(product)}
              style={{
                padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: 'none', fontFamily: "'Jost', sans-serif",
                background: product.ativo ? 'rgba(239,83,80,0.85)' : 'rgba(76,175,80,0.85)',
                color: '#fff',
              }}
            >
              {product.ativo ? 'Pausar' : 'Ativar'}
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '12px 13px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: M.text, marginBottom: 4, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {product.nome}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: M.accent }}>{fmtBRL(product.preco)}</span>
          {product.preco_original && product.preco_original > product.preco && (
            <span style={{ fontSize: 11, color: M.textFaint, textDecoration: 'line-through' }}>{fmtBRL(product.preco_original)}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {cat && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', color: M.textFaint }}>{cat.nome}</span>}
          {col && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: M.accentDim, color: M.accent }}>{col.nome}</span>}
          {product.tem_variacoes && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', color: M.textFaint }}>variações</span>}
        </div>
      </div>
    </div>
  );
}

// ── MODAL DE PRODUTO ──────────────────────────────────────────
function ProductModal({ product, categories, collections, onSave, onClose, M, tenant }) {
  const isNew = !product?.id;
  const [form, setForm] = useState({
    nome: product?.nome || '',
    descricao: product?.descricao || '',
    descricao_curta: product?.descricao_curta || '',
    preco: product?.preco || '',
    preco_original: product?.preco_original || '',
    estoque: product?.estoque ?? 0,
    estoque_minimo: product?.estoque_minimo ?? 0,
    category_id: product?.category_id || '',
    collection_id: product?.collection_id || '',
    ativo: product?.ativo ?? true,
    destaque: product?.destaque ?? false,
    lancamento: product?.lancamento ?? false,
    frete_gratis: product?.frete_gratis ?? false,
    tem_variacoes: product?.tem_variacoes ?? false,
    variacoes_config: product?.variacoes_config || [],
    fotos: product?.fotos || [],
    tags: product?.tags || [],
  });
  const [tab, setTab] = useState('basico');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Variações predefinidas para moda
  const addVariacaoModa = (tipo) => {
    const configs = {
      tamanho: { nome: 'Tamanho', opcoes: TAMANHOS_MODA },
      cor:     { nome: 'Cor',     opcoes: CORES_MODA     },
      genero:  { nome: 'Gênero',  opcoes: GENEROS_MODA   },
    };
    const nova = configs[tipo];
    if (!nova) return;
    setForm(f => ({
      ...f,
      tem_variacoes: true,
      variacoes_config: [...f.variacoes_config.filter(v => v.nome !== nova.nome), nova],
    }));
  };

  const handleUploadFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `ecommerce/${tenant?.id}/produtos/${Date.now()}_${safeName}`;
    const { error: upErr } = await supabase.storage.from('documentos').upload(path, file);
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage.from('documentos').getPublicUrl(path);
      setForm(f => ({ ...f, fotos: [...f.fotos, publicUrl] }));
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { setError('Nome do produto é obrigatório.'); return; }
    if (!form.preco || Number(form.preco) <= 0) { setError('Preço inválido.'); return; }
    setSaving(true);
    const { error } = await onSave({
      ...form,
      preco: Number(form.preco),
      preco_original: form.preco_original ? Number(form.preco_original) : null,
      estoque: Number(form.estoque),
      estoque_minimo: Number(form.estoque_minimo),
      slug: form.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now(),
    });
    setSaving(false);
    if (error) setError(error.message || 'Erro ao salvar.');
    else onClose();
  };

  return (
    <div className="eco-modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="eco-modal-box" style={{ maxWidth: 580 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: M.text }}>
              {isNew ? 'Novo produto' : 'Editar produto'}
            </div>
            <div style={{ fontSize: 12, color: M.textFaint, marginTop: 3 }}>Catálogo de moda</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${M.border}`, borderRadius: 9, cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: M.textMid }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${M.border}`, marginBottom: 20 }}>
          {[['basico', 'Básico'], ['fotos', 'Fotos'], ['variacoes', 'Variações'], ['config', 'Config']].map(([id, lb]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '9px 16px', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: "'Jost', sans-serif", fontSize: 13, fontWeight: tab === id ? 600 : 400,
              color: tab === id ? M.accent : M.textFaint,
              borderBottom: `2px solid ${tab === id ? M.accent : 'transparent'}`,
            }}>{lb}</button>
          ))}
        </div>

        {/* ── ABA BÁSICO ── */}
        {tab === 'basico' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: M.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Nome *</label>
              <input className="eco-inp" value={form.nome} onChange={e => { setForm(f => ({ ...f, nome: e.target.value })); setError(''); }} placeholder="Nome do produto"/>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: M.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Descrição curta</label>
              <input className="eco-inp" value={form.descricao_curta} onChange={e => setForm(f => ({ ...f, descricao_curta: e.target.value }))} placeholder="Resumo para listagem"/>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: M.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Descrição completa</label>
              <textarea className="eco-inp" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} style={{ resize: 'vertical', minHeight: 80, fontFamily: "'Jost', sans-serif", lineHeight: 1.5 }} placeholder="Detalhes do produto…"/>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: M.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Preço *</label>
                <input className="eco-inp" type="number" step="0.01" value={form.preco} onChange={e => { setForm(f => ({ ...f, preco: e.target.value })); setError(''); }} placeholder="99.90"/>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: M.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Preço original (De)</label>
                <input className="eco-inp" type="number" step="0.01" value={form.preco_original} onChange={e => setForm(f => ({ ...f, preco_original: e.target.value }))} placeholder="129.90"/>
              </div>
            </div>
            {!form.tem_variacoes && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: M.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Estoque</label>
                  <input className="eco-inp" type="number" value={form.estoque} onChange={e => setForm(f => ({ ...f, estoque: e.target.value }))} placeholder="0"/>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: M.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Alerta mínimo</label>
                  <input className="eco-inp" type="number" value={form.estoque_minimo} onChange={e => setForm(f => ({ ...f, estoque_minimo: e.target.value }))} placeholder="5"/>
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: M.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Categoria</label>
                <select className="eco-sel" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                  <option value="">Sem categoria</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: M.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Coleção</label>
                <select className="eco-sel" value={form.collection_id} onChange={e => setForm(f => ({ ...f, collection_id: e.target.value }))}>
                  <option value="">Sem coleção</option>
                  {collections.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ── ABA FOTOS ── */}
        {tab === 'fotos' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
              {form.fotos.map((url, i) => (
                <div key={i} style={{ position: 'relative', paddingBottom: '100%', borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
                  <img src={url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}/>
                  <button
                    onClick={() => setForm(f => ({ ...f, fotos: f.fotos.filter((_, j) => j !== i) }))}
                    style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >✕</button>
                  {i === 0 && <span style={{ position: 'absolute', bottom: 6, left: 6, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: M.accent, color: '#0C0C0C' }}>CAPA</span>}
                </div>
              ))}
              {/* Upload */}
              <label style={{
                paddingBottom: '100%', position: 'relative', borderRadius: 10,
                border: `2px dashed ${uploading ? M.accent : M.border}`,
                background: 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = M.accent; }}
                onMouseLeave={e => { if (!uploading) e.currentTarget.style.borderColor = M.border; }}
              >
                <input type="file" style={{ display: 'none' }} accept=".jpg,.jpeg,.png,.webp" onChange={handleUploadFoto} disabled={uploading}/>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <span style={{ fontSize: 22 }}>{uploading ? '⏳' : '📷'}</span>
                  <span style={{ fontSize: 10, color: M.textFaint }}>{uploading ? 'Enviando…' : 'Adicionar'}</span>
                </div>
              </label>
            </div>
            <div style={{ fontSize: 11, color: M.textFaint }}>A primeira foto é usada como capa. Arraste para reordenar (em breve).</div>
          </div>
        )}

        {/* ── ABA VARIAÇÕES ── */}
        {tab === 'variacoes' && (
          <div>
            <div style={{ padding: '10px 14px', borderRadius: 9, background: M.accentDim, border: `1px solid ${M.accent}30`, marginBottom: 16, fontSize: 12, color: M.textMid }}>
              💡 Variações permitem definir estoque por combinação (ex: Preto/M, Branco/G).
            </div>
            <div className="eco-eyebrow" style={{ marginBottom: 10 }}>Adicionar variação pré-definida (moda)</div>
            <div style={{ display: 'flex', gap: 7, marginBottom: 18 }}>
              {[['tamanho', 'Tamanhos PP→XG'], ['cor', 'Cores'], ['genero', 'Gênero']].map(([tipo, label]) => (
                <button key={tipo} className="eco-btn eco-btn-ghost" style={{ fontSize: 11 }} onClick={() => addVariacaoModa(tipo)}>
                  + {label}
                </button>
              ))}
            </div>
            {form.variacoes_config.map((vari, vi) => (
              <div key={vi} style={{ background: '#141414', border: `1px solid ${M.border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: M.text }}>{vari.nome}</div>
                  <button onClick={() => setForm(f => ({ ...f, variacoes_config: f.variacoes_config.filter((_, i) => i !== vi) }))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: M.textFaint, fontSize: 14 }}>✕</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {vari.opcoes.map(op => (
                    <span key={op} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.07)', color: M.textMid }}>
                      {op}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {form.variacoes_config.length === 0 && (
              <div style={{ textAlign: 'center', padding: '28px 0', fontSize: 12, color: M.textFaint }}>
                Nenhuma variação adicionada. Produto com estoque único.
              </div>
            )}
          </div>
        )}

        {/* ── ABA CONFIG ── */}
        {tab === 'config' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              ['ativo',       'Produto ativo (visível na loja)'],
              ['destaque',    'Produto em destaque'],
              ['lancamento',  'Marcar como lançamento'],
              ['frete_gratis','Frete grátis'],
            ].map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '12px 14px', borderRadius: 9, background: 'rgba(255,255,255,0.02)', border: `1px solid ${M.border}` }}>
                <div
                  onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))}
                  style={{
                    width: 44, height: 24, borderRadius: 99, flexShrink: 0,
                    background: form[key] ? M.accent : 'rgba(255,255,255,0.08)',
                    position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 3, left: form[key] ? 23 : 3,
                    width: 18, height: 18, borderRadius: '50%',
                    background: form[key] ? '#0C0C0C' : M.textFaint,
                    transition: 'left 0.2s',
                  }}/>
                </div>
                <span style={{ fontSize: 13, color: M.textMid }}>{label}</span>
              </label>
            ))}
            {/* Tags */}
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: M.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>Tags</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {form.tags.map((tag, i) => (
                  <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.07)', color: M.textMid, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {tag}
                    <button onClick={() => setForm(f => ({ ...f, tags: f.tags.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: M.textFaint, fontSize: 12, padding: 0 }}>×</button>
                  </span>
                ))}
              </div>
              <input className="eco-inp" value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                    e.preventDefault();
                    setForm(f => ({ ...f, tags: [...f.tags, tagInput.trim()] }));
                    setTagInput('');
                  }
                }}
                placeholder="Digite e pressione Enter…" style={{ height: 36 }}/>
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: '9px 12px', borderRadius: 8, marginTop: 16, background: 'rgba(239,83,80,0.1)', border: '1px solid rgba(239,83,80,0.2)', fontSize: 12, color: '#FF8A88' }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 22 }}>
          <button className="eco-btn eco-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="eco-btn eco-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando…' : isNew ? 'Criar produto' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────
export function ProductManager({ M, products, categories, collections, createProduct, updateProduct, deleteProduct, createCategory, createCollection, tenant }) {
  const [viewMode, setViewMode]   = useState('grid'); // grid | list
  const [editProd, setEditProd]   = useState(null);
  const [search, setSearch]       = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterCol, setFilterCol] = useState('');
  const [filterAtivo, setFilterAtivo] = useState('');
  const [showCatModal, setShowCatModal] = useState(false);
  const [showColModal, setShowColModal] = useState(false);
  const [catForm, setCatForm]     = useState({ nome: '', descricao: '' });
  const [colForm, setColForm]     = useState({ nome: '', descricao: '', destaque: false });

  const filtered = useMemo(() => products.filter(p => {
    if (filterCat  && p.category_id   !== filterCat)   return false;
    if (filterCol  && p.collection_id !== filterCol)    return false;
    if (filterAtivo === 'ativo'   && !p.ativo)          return false;
    if (filterAtivo === 'inativo' && p.ativo)           return false;
    if (search) {
      const s = search.toLowerCase();
      if (!p.nome?.toLowerCase().includes(s) && !(p.tags || []).some(t => t.toLowerCase().includes(s))) return false;
    }
    return true;
  }), [products, search, filterCat, filterCol, filterAtivo]);

  const handleSaveProd = async (data) => {
    if (editProd?.id) return updateProduct(editProd.id, data);
    return createProduct(data);
  };

  const handleSaveCat = async () => {
    if (!catForm.nome.trim()) return;
    const slug = catForm.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
    await createCategory({ ...catForm, slug });
    setCatForm({ nome: '', descricao: '' });
    setShowCatModal(false);
  };

  const handleSaveCol = async () => {
    if (!colForm.nome.trim()) return;
    const slug = colForm.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    await createCollection({ ...colForm, slug });
    setColForm({ nome: '', descricao: '', destaque: false });
    setShowColModal(false);
  };

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: M.text, marginBottom: 3 }}>Catálogo</div>
          <div style={{ fontSize: 12, color: M.textFaint }}>
            {filtered.length} produto{filtered.length !== 1 ? 's' : ''} · {categories.length} categorias · {collections.length} coleções
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="eco-btn eco-btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowCatModal(true)}>+ Categoria</button>
          <button className="eco-btn eco-btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowColModal(true)}>+ Coleção</button>
          <button className="eco-btn eco-btn-primary" onClick={() => setEditProd('__new__')}>+ Novo produto</button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: M.textFaint, fontSize: 13 }}>⌕</span>
          <input className="eco-inp" style={{ paddingLeft: 32 }} placeholder="Buscar produto, tag…" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <select className="eco-sel" style={{ width: 160 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">Todas categorias</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select className="eco-sel" style={{ width: 160 }} value={filterCol} onChange={e => setFilterCol(e.target.value)}>
          <option value="">Todas coleções</option>
          {collections.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select className="eco-sel" style={{ width: 130 }} value={filterAtivo} onChange={e => setFilterAtivo(e.target.value)}>
          <option value="">Todos</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>
        {/* Toggle grid/list */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: `1px solid ${M.border}`, overflow: 'hidden' }}>
          {[['grid', '⊞'], ['list', '≡']].map(([v, ic]) => (
            <button key={v} onClick={() => setViewMode(v)} style={{
              padding: '9px 14px', border: 'none', cursor: 'pointer', fontSize: 15,
              background: viewMode === v ? M.accentDim : 'none',
              color: viewMode === v ? M.accent : M.textFaint,
              transition: 'all 0.15s',
            }}>{ic}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {viewMode === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          {filtered.map(p => (
            <ProductCard key={p.id} product={p} M={M} categories={categories} collections={collections}
              onEdit={p => setEditProd(p)}
              onToggle={p => updateProduct(p.id, { ativo: !p.ativo })}
              onDelete={p => deleteProduct(p.id)}
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', fontSize: 13, color: M.textFaint }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>👗</div>
              Nenhum produto encontrado.
            </div>
          )}
        </div>
      )}

      {/* Lista */}
      {viewMode === 'list' && (
        <div style={{ background: '#141414', border: `1px solid ${M.border}`, borderRadius: 14, overflow: 'hidden' }}>
          {filtered.map((p, i) => {
            const cat = categories.find(c => c.id === p.category_id);
            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
                borderBottom: i < filtered.length - 1 ? `1px solid ${M.border}` : 'none',
                opacity: p.ativo ? 1 : 0.5, transition: 'background 0.12s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: 48, height: 48, borderRadius: 8, flexShrink: 0, overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
                  {p.fotos?.[0] ? <img src={p.fotos[0]} alt={p.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>👗</div>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: M.text }}>{p.nome}</div>
                  {cat && <div style={{ fontSize: 11, color: M.textFaint, marginTop: 1 }}>{cat.nome}</div>}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: M.accent, flexShrink: 0 }}>{fmtBRL(p.preco)}</div>
                {!p.tem_variacoes && (
                  <div style={{ fontSize: 11, color: p.estoque <= p.estoque_minimo ? M.amber : M.textFaint, flexShrink: 0, width: 70, textAlign: 'center' }}>
                    Estoque: {p.estoque}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button className="eco-btn eco-btn-ghost" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => setEditProd(p)}>✎</button>
                  <button onClick={() => updateProduct(p.id, { ativo: !p.ativo })} style={{ padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', background: p.ativo ? 'rgba(239,83,80,0.1)' : 'rgba(76,175,80,0.1)', color: p.ativo ? '#FF8A88' : '#81C784' }}>
                    {p.ativo ? 'Pausar' : 'Ativar'}
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: '48px 0', textAlign: 'center', fontSize: 13, color: M.textFaint }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>👗</div>
              Nenhum produto encontrado.
            </div>
          )}
        </div>
      )}

      {/* Modal produto */}
      {editProd && (
        <ProductModal
          product={editProd === '__new__' ? null : editProd}
          categories={categories}
          collections={collections}
          onSave={handleSaveProd}
          onClose={() => setEditProd(null)}
          M={M}
          tenant={tenant}
        />
      )}

      {/* Modal categoria */}
      {showCatModal && (
        <div className="eco-modal-bg" onClick={e => { if (e.target === e.currentTarget) setShowCatModal(false); }}>
          <div className="eco-modal-box" style={{ maxWidth: 420 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: M.text, marginBottom: 20 }}>Nova categoria</div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: M.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Nome *</label>
              <input className="eco-inp" value={catForm.nome} onChange={e => setCatForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Vestidos, Camisetas, Acessórios…" autoFocus/>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: M.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Descrição</label>
              <input className="eco-inp" value={catForm.descricao} onChange={e => setCatForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição opcional"/>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="eco-btn eco-btn-ghost" onClick={() => setShowCatModal(false)}>Cancelar</button>
              <button className="eco-btn eco-btn-primary" onClick={handleSaveCat}>Criar categoria</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal coleção */}
      {showColModal && (
        <div className="eco-modal-bg" onClick={e => { if (e.target === e.currentTarget) setShowColModal(false); }}>
          <div className="eco-modal-box" style={{ maxWidth: 420 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: M.text, marginBottom: 20 }}>Nova coleção</div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: M.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Nome *</label>
              <input className="eco-inp" value={colForm.nome} onChange={e => setColForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Verão 2025, Casual Chic…" autoFocus/>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: M.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Descrição</label>
              <input className="eco-inp" value={colForm.descricao} onChange={e => setColForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição opcional"/>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 20 }}>
              <div onClick={() => setColForm(f => ({ ...f, destaque: !f.destaque }))} style={{ width: 40, height: 22, borderRadius: 99, background: colForm.destaque ? M.accent : 'rgba(255,255,255,0.08)', position: 'relative', transition: 'background 0.2s', cursor: 'pointer' }}>
                <div style={{ position: 'absolute', top: 2, left: colForm.destaque ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: colForm.destaque ? '#0C0C0C' : M.textFaint, transition: 'left 0.2s' }}/>
              </div>
              <span style={{ fontSize: 13, color: M.textMid }}>Coleção em destaque</span>
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="eco-btn eco-btn-ghost" onClick={() => setShowColModal(false)}>Cancelar</button>
              <button className="eco-btn eco-btn-primary" onClick={handleSaveCol}>Criar coleção</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}