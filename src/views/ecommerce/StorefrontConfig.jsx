// src/views/ecommerce/StorefrontConfig.jsx

import { useState } from 'react';
import { supabase } from '../../supabase';

export function StorefrontConfig({ M, config, tenant, categories, collections, products }) {
  const [form, setForm] = useState({
    nome_loja:    config?.nome_loja    || '',
    descricao_loja: config?.descricao_loja || '',
    sobre_loja:   config?.sobre_loja   || '',
    email_contato: config?.email_contato || '',
    whatsapp:     config?.whatsapp     || '',
    instagram:    config?.instagram    || '',
    cor_primaria: config?.cor_primaria  || '#0A0A0A',
    cor_secundaria: config?.cor_secundaria || '#FFFFFF',
    cor_acento:   config?.cor_acento   || '#C9A96E',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState(config?.logo_url || '');
  const [bannerUrl, setBannerUrl] = useState(config?.banner_url || '');

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('storefront_config')
      .update({ ...form, logo_url: logoUrl, banner_url: bannerUrl })
      .eq('tenant_id', tenant?.id);
    setSaving(false);
    if (!error) {
      setMsg({ type: 'success', text: 'Configurações salvas com sucesso!' });
      setTimeout(() => setMsg(null), 3000);
    } else {
      setMsg({ type: 'error', text: error.message });
    }
  };

  const handleUpload = async (e, tipo) => {
    const file = e.target.files[0];
    if (!file) return;
    if (tipo === 'logo') setUploadingLogo(true);
    const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `ecommerce/${tenant?.id}/${tipo}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from('documentos').upload(path, file);
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('documentos').getPublicUrl(path);
      if (tipo === 'logo') setLogoUrl(publicUrl);
      else setBannerUrl(publicUrl);
    }
    if (tipo === 'logo') setUploadingLogo(false);
    e.target.value = '';
  };

  const Field = ({ label, children }) => (
    <div>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: M.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>{label}</label>
      {children}
    </div>
  );

  // Preview da loja baseado nas configurações
  const Preview = () => (
    <div style={{
      background: form.cor_secundaria, borderRadius: 14, overflow: 'hidden',
      border: `1px solid ${M.border}`, fontFamily: "'Jost', sans-serif",
    }}>
      {/* Header preview */}
      <div style={{
        background: form.cor_primaria, padding: '12px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 600, color: form.cor_secundaria }}>
          {form.nome_loja || 'Nome da Loja'}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {['Início', 'Produtos', 'Sobre'].map(item => (
            <span key={item} style={{ fontSize: 10, color: `${form.cor_secundaria}99` }}>{item}</span>
          ))}
        </div>
      </div>
      {/* Banner preview */}
      <div style={{
        height: 80, background: bannerUrl ? `url(${bannerUrl}) center/cover` : `linear-gradient(135deg, ${form.cor_acento}30, ${form.cor_primaria}40)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {!bannerUrl && <div style={{ fontSize: 11, color: `${form.cor_primaria}60` }}>Banner da loja</div>}
      </div>
      {/* Produtos preview */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: form.cor_primaria, marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Em destaque
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: `${form.cor_primaria}08`, borderRadius: 8, padding: 8 }}>
              <div style={{ paddingBottom: '100%', background: `${form.cor_acento}15`, borderRadius: 6, marginBottom: 6 }}/>
              <div style={{ fontSize: 9, fontWeight: 600, color: form.cor_primaria }}>Produto {i}</div>
              <div style={{ fontSize: 9, color: form.cor_acento, fontWeight: 700 }}>R$ 99,90</div>
            </div>
          ))}
        </div>
        {/* CTA */}
        <div style={{
          marginTop: 10, padding: '8px 12px', borderRadius: 99, textAlign: 'center',
          background: form.cor_acento, fontSize: 10, fontWeight: 700, color: form.cor_primaria,
        }}>
          Ver todos os produtos
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: M.text, marginBottom: 3 }}>
          Configurar Loja
        </div>
        <div style={{ fontSize: 12, color: M.textFaint }}>
          Personalize a identidade visual e informações da sua loja
        </div>
      </div>

      {msg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9, padding: '10px 14px',
          borderRadius: 9, marginBottom: 20,
          background: msg.type === 'success' ? 'rgba(76,175,80,0.1)' : 'rgba(239,83,80,0.1)',
          border: `1px solid ${msg.type === 'success' ? 'rgba(76,175,80,0.25)' : 'rgba(239,83,80,0.25)'}`,
          fontSize: 13, color: msg.type === 'success' ? '#81C784' : '#FF8A88',
        }}>
          {msg.type === 'success' ? '✓' : '⚠'} {msg.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>
        {/* Formulário */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Identidade */}
          <div style={{ background: '#141414', border: `1px solid ${M.border}`, borderRadius: 14, padding: '20px 22px' }}>
            <div className="eco-eyebrow" style={{ marginBottom: 16 }}>Identidade da loja</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="Nome da loja *">
                <input className="eco-inp" value={form.nome_loja} onChange={e => setForm(f => ({ ...f, nome_loja: e.target.value }))} placeholder="Nome que aparece na loja"/>
              </Field>
              <Field label="Descrição curta">
                <input className="eco-inp" value={form.descricao_loja} onChange={e => setForm(f => ({ ...f, descricao_loja: e.target.value }))} placeholder="Tagline da loja"/>
              </Field>
              <Field label="Sobre a loja">
                <textarea className="eco-inp" value={form.sobre_loja} onChange={e => setForm(f => ({ ...f, sobre_loja: e.target.value }))} style={{ resize: 'vertical', minHeight: 70, fontFamily: "'Jost', sans-serif", lineHeight: 1.5 }} placeholder="História e diferenciais da marca…"/>
              </Field>
            </div>
          </div>

          {/* Identidade visual */}
          <div style={{ background: '#141414', border: `1px solid ${M.border}`, borderRadius: 14, padding: '20px 22px' }}>
            <div className="eco-eyebrow" style={{ marginBottom: 16 }}>Identidade visual</div>

            {/* Logo */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: M.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>Logo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {logoUrl && (
                  <div style={{ width: 60, height: 60, borderRadius: 10, background: '#222', overflow: 'hidden', flexShrink: 0 }}>
                    <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }}/>
                  </div>
                )}
                <label style={{
                  padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: 'rgba(255,255,255,0.05)', border: `1px solid ${M.border}`,
                  color: M.textMid, cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  <input type="file" style={{ display: 'none' }} accept=".png,.jpg,.jpeg,.svg,.webp" onChange={e => handleUpload(e, 'logo')} disabled={uploadingLogo}/>
                  {uploadingLogo ? '⏳ Enviando…' : '📷 Upload logo'}
                </label>
                {logoUrl && <button onClick={() => setLogoUrl('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: M.textFaint, fontSize: 12 }}>Remover</button>}
              </div>
            </div>

            {/* Banner */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: M.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>Banner principal</label>
              {bannerUrl && (
                <div style={{ height: 80, borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
                  <img src={bannerUrl} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                </div>
              )}
              <label style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'inline-block',
                background: 'rgba(255,255,255,0.05)', border: `1px solid ${M.border}`,
                color: M.textMid, cursor: 'pointer',
              }}>
                <input type="file" style={{ display: 'none' }} accept=".png,.jpg,.jpeg,.webp" onChange={e => handleUpload(e, 'banner')}/>
                🖼️ Upload banner
              </label>
            </div>

            {/* Cores */}
            <div className="eco-eyebrow" style={{ marginBottom: 12 }}>Paleta de cores</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                ['cor_primaria', 'Primária (fundo/texto)'],
                ['cor_secundaria', 'Secundária (contraste)'],
                ['cor_acento', 'Acento (botões/destaques)'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 10, color: M.textFaint, marginBottom: 6, letterSpacing: '0.04em' }}>{label}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="color" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${M.border}`, cursor: 'pointer', background: 'none', padding: 2 }}/>
                    <input className="eco-inp" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{ flex: 1, height: 36, padding: '0 10px', fontSize: 11, fontFamily: 'monospace' }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contato */}
          <div style={{ background: '#141414', border: `1px solid ${M.border}`, borderRadius: 14, padding: '20px 22px' }}>
            <div className="eco-eyebrow" style={{ marginBottom: 16 }}>Contato e redes sociais</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="E-mail de contato">
                <input className="eco-inp" value={form.email_contato} onChange={e => setForm(f => ({ ...f, email_contato: e.target.value }))} placeholder="contato@minhaloja.com"/>
              </Field>
              <Field label="WhatsApp">
                <input className="eco-inp" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="(00) 00000-0000"/>
              </Field>
              <Field label="Instagram">
                <input className="eco-inp" value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} placeholder="@minhaloja"/>
              </Field>
            </div>
          </div>

          {/* Salvar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="eco-btn eco-btn-primary" onClick={save} disabled={saving} style={{ minWidth: 160, justifyContent: 'center' }}>
              {saving ? 'Salvando…' : '✓ Salvar configurações'}
            </button>
          </div>
        </div>

        {/* Preview sticky */}
        <div style={{ position: 'sticky', top: 28 }}>
          <div className="eco-eyebrow" style={{ marginBottom: 12 }}>Preview da loja</div>
          <Preview/>
          <div style={{ marginTop: 10, fontSize: 11, color: M.textFaint, textAlign: 'center' }}>
            Atualiza em tempo real enquanto você edita
          </div>

          {/* Stats rápidas */}
          <div style={{ marginTop: 16, background: '#141414', border: `1px solid ${M.border}`, borderRadius: 12, overflow: 'hidden' }}>
            {[
              ['Produtos ativos', products?.filter(p => p.ativo).length || 0],
              ['Categorias', categories?.length || 0],
              ['Coleções', collections?.length || 0],
            ].map(([k, v], i, arr) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: i < arr.length - 1 ? `1px solid ${M.border}` : 'none' }}>
                <span style={{ fontSize: 12, color: M.textFaint }}>{k}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: M.text }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Link da loja */}
          {tenant?.slug && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: M.accentDim, borderRadius: 10, border: `1px solid ${M.accent}30` }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: M.accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>URL da loja</div>
              <div style={{ fontSize: 11, color: M.textMid, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                /loja/{tenant.slug}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}