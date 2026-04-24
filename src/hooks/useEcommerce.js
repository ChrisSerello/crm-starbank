// src/hooks/useEcommerce.js
// Hook central do módulo e-commerce — carrega tenant, stages, orders, leads

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase';

export function useEcommerce(profile, session) {
  const [tenant, setTenant]       = useState(null);
  const [config, setConfig]       = useState(null);
  const [stages, setStages]       = useState([]);
  const [orders, setOrders]       = useState([]);
  const [leads, setLeads]         = useState([]);
  const [products, setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const syncTimerRef = useRef(null);
  const syncQueueRef = useRef(new Map());

  // ── Carregar tudo ao iniciar ──────────────────────────────
  const loadAll = useCallback(async () => {
    if (!session || !profile) return;
    setLoading(true);
    try {
      // 1. Tenant do usuário
      const { data: tenantData, error: tenantErr } = await supabase
        .from('tenants')
        .select('*')
        .eq('owner_id', profile.id)
        .single();

      if (tenantErr || !tenantData) {
        setError('Loja não encontrada. Contate o administrador.');
        setLoading(false);
        return;
      }
      setTenant(tenantData);
      const tid = tenantData.id;

      // 2. Carrega em paralelo para performance
      const [
        { data: cfgData },
        { data: stagesData },
        { data: ordersData },
        { data: leadsData },
        { data: productsData },
        { data: catsData },
        { data: colsData },
        { data: customersData },
      ] = await Promise.all([
        supabase.from('storefront_config').select('*').eq('tenant_id', tid).single(),
        supabase.from('pipeline_stages').select('*').eq('tenant_id', tid).order('ordem'),
        supabase.from('orders').select('*').eq('tenant_id', tid).order('criado_em', { ascending: false }).limit(500),
        supabase.from('ecommerce_leads').select('*').eq('tenant_id', tid).order('criado_em', { ascending: false }).limit(500),
        supabase.from('products').select('*').eq('tenant_id', tid).order('criado_em', { ascending: false }),
        supabase.from('product_categories').select('*').eq('tenant_id', tid).order('ordem'),
        supabase.from('product_collections').select('*').eq('tenant_id', tid).order('ordem'),
        supabase.from('store_customers').select('*').eq('tenant_id', tid).order('criado_em', { ascending: false }).limit(500),
      ]);

      setConfig(cfgData || null);
      setStages(stagesData || []);
      setOrders(ordersData || []);
      setLeads(leadsData || []);
      setProducts(productsData || []);
      setCategories(catsData || []);
      setCollections(colsData || []);
      setCustomers(customersData || []);

    } catch (e) {
      console.error('useEcommerce loadAll error:', e);
      setError('Erro ao carregar dados da loja.');
    }
    setLoading(false);
  }, [session, profile]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Realtime ──────────────────────────────────────────────
  useEffect(() => {
    if (!tenant) return;
    const tid = tenant.id;

    const ch = supabase.channel(`ecommerce_rt_${tid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tid}` },
        p => setOrders(prev => [p.new, ...prev]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tid}` },
        p => setOrders(prev => prev.map(o => o.id === p.new.id ? p.new : o)))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ecommerce_leads', filter: `tenant_id=eq.${tid}` },
        p => setLeads(prev => [p.new, ...prev]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ecommerce_leads', filter: `tenant_id=eq.${tid}` },
        p => setLeads(prev => prev.map(l => l.id === p.new.id ? p.new : l)))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'products', filter: `tenant_id=eq.${tid}` },
        p => setProducts(prev => [p.new, ...prev]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products', filter: `tenant_id=eq.${tid}` },
        p => setProducts(prev => prev.map(pr => pr.id === p.new.id ? p.new : pr)))
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [tenant]);

  // ── Ações: STAGES ─────────────────────────────────────────

  const createStage = useCallback(async ({ nome, cor, icone }) => {
    const maxOrdem = stages.length > 0 ? Math.max(...stages.map(s => s.ordem)) : -1;
    // Insere antes do "Cancelado" (último tipo cancelado)
    const cancelIdx = stages.findIndex(s => s.tipo === 'cancelado');
    const novaOrdem = cancelIdx >= 0 ? stages[cancelIdx].ordem : maxOrdem + 1;

    // Shift: empurra cancelado para frente
    if (cancelIdx >= 0) {
      await supabase.from('pipeline_stages')
        .update({ ordem: novaOrdem + 1 })
        .eq('id', stages[cancelIdx].id);
    }

    const { data, error } = await supabase.from('pipeline_stages').insert({
      tenant_id: tenant.id, nome, cor, icone, ordem: novaOrdem, tipo: 'custom', is_deletavel: true,
    }).select().single();

    if (!error) {
      setStages(prev => {
        const updated = prev.map(s => s.tipo === 'cancelado' ? { ...s, ordem: novaOrdem + 1 } : s);
        return [...updated, data].sort((a, b) => a.ordem - b.ordem);
      });
    }
    return { data, error };
  }, [stages, tenant]);

  const updateStage = useCallback(async (id, updates) => {
    const { error } = await supabase.from('pipeline_stages').update(updates).eq('id', id);
    if (!error) setStages(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    return { error };
  }, []);

  const deleteStage = useCallback(async (id) => {
    const stage = stages.find(s => s.id === id);
    if (!stage?.is_deletavel) return { error: { message: 'Este estágio não pode ser removido.' } };

    // Move pedidos deste estágio para o primeiro estágio (entrada)
    const entrada = stages.find(s => s.tipo === 'entrada');
    if (entrada) {
      await supabase.from('orders').update({ stage_id: entrada.id }).eq('stage_id', id);
      await supabase.from('ecommerce_leads').update({ stage_id: entrada.id }).eq('stage_id', id);
    }

    const { error } = await supabase.from('pipeline_stages').delete().eq('id', id);
    if (!error) setStages(prev => prev.filter(s => s.id !== id));
    return { error };
  }, [stages]);

  const reorderStages = useCallback(async (newOrder) => {
    // newOrder: array de IDs na nova ordem
    setStages(prev => {
      const map = new Map(prev.map(s => [s.id, s]));
      return newOrder.map((id, idx) => ({ ...map.get(id), ordem: idx }));
    });
    // Persiste no banco em paralelo
    await Promise.all(newOrder.map((id, idx) =>
      supabase.from('pipeline_stages').update({ ordem: idx }).eq('id', id)
    ));
  }, []);

  // ── Ações: ORDERS ─────────────────────────────────────────

  const createOrder = useCallback(async (orderData) => {
    const entrada = stages.find(s => s.tipo === 'entrada');
    const { data, error } = await supabase.from('orders').insert({
      ...orderData,
      tenant_id: tenant.id,
      stage_id: entrada?.id || stages[0]?.id,
    }).select().single();
    if (!error) setOrders(prev => [data, ...prev]);
    return { data, error };
  }, [tenant, stages]);

  const moveOrder = useCallback(async (orderId, stageId) => {
    const { error } = await supabase.from('orders').update({ stage_id: stageId }).eq('id', orderId);
    if (!error) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, stage_id: stageId } : o));
      // Lead é atualizado pelo trigger do banco automaticamente
    }
    return { error };
  }, []);

  const updateOrder = useCallback(async (id, updates) => {
    const { error } = await supabase.from('orders').update(updates).eq('id', id);
    if (!error) setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
    return { error };
  }, []);

  // ── Ações: PRODUTOS ───────────────────────────────────────

  const createProduct = useCallback(async (productData) => {
    const { data, error } = await supabase.from('products').insert({
      ...productData,
      tenant_id: tenant.id,
    }).select().single();
    if (!error) setProducts(prev => [data, ...prev]);
    return { data, error };
  }, [tenant]);

  const updateProduct = useCallback(async (id, updates) => {
    const { error } = await supabase.from('products').update(updates).eq('id', id);
    if (!error) setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    return { error };
  }, []);

  const deleteProduct = useCallback(async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) setProducts(prev => prev.filter(p => p.id !== id));
    return { error };
  }, []);

  // ── Ações: CATEGORIAS ─────────────────────────────────────

  const createCategory = useCallback(async (data) => {
    const { data: cat, error } = await supabase.from('product_categories').insert({
      ...data, tenant_id: tenant.id,
    }).select().single();
    if (!error) setCategories(prev => [...prev, cat]);
    return { data: cat, error };
  }, [tenant]);

  const createCollection = useCallback(async (data) => {
    const { data: col, error } = await supabase.from('product_collections').insert({
      ...data, tenant_id: tenant.id,
    }).select().single();
    if (!error) setCollections(prev => [...prev, col]);
    return { data: col, error };
  }, [tenant]);

  // ── Métricas computadas ───────────────────────────────────
  const metrics = {
    totalOrders: orders.length,
    totalReceita: orders.reduce((s, o) => s + (o.valor_total || 0), 0),
    pedidosPendentes: orders.filter(o => {
      const stage = stages.find(s => s.id === o.stage_id);
      return stage?.tipo !== 'finalizado' && stage?.tipo !== 'cancelado';
    }).length,
    pedidosConcluidos: orders.filter(o => stages.find(s => s.id === o.stage_id)?.tipo === 'finalizado').length,
    ticketMedio: orders.length > 0
      ? orders.reduce((s, o) => s + (o.valor_total || 0), 0) / orders.length
      : 0,
    totalProdutos: products.filter(p => p.ativo).length,
    produtosEstoqueBaixo: products.filter(p => p.estoque <= p.estoque_minimo && !p.tem_variacoes).length,
  };

  return {
    // dados
    tenant, config, stages, orders, leads,
    products, categories, collections, customers,
    metrics, loading, error,
    // ações stages
    createStage, updateStage, deleteStage, reorderStages,
    // ações orders
    createOrder, moveOrder, updateOrder,
    // ações produtos
    createProduct, updateProduct, deleteProduct,
    // ações catálogo
    createCategory, createCollection,
    // utilitários
    reload: loadAll,
    stageById: (id) => stages.find(s => s.id === id),
  };
}