/**
 * Cache em memória simples para evitar re-fetches desnecessários no Supabase.
 * Não persiste entre reloads (proposital — dados frescos ao abrir o app).
 *
 * Uso:
 *   import { withCache } from '../cache';
 *   const data = await withCache('chave', 5 * 60 * 1000, () => supabase.from(...));
 */

const _cache = {};

/**
 * @param {string} key - Chave única do cache
 * @param {number} ttlMs - Tempo de vida em ms (ex: 5 * 60 * 1000 = 5 minutos)
 * @param {() => Promise<any>} fetchFn - Função que busca os dados
 */
export function withCache(key, ttlMs, fetchFn) {
  const now = Date.now();
  if (_cache[key] && now - _cache[key].ts < ttlMs) {
    return Promise.resolve(_cache[key].data);
  }
  return fetchFn().then(data => {
    _cache[key] = { data, ts: now };
    return data;
  });
}

/**
 * Invalida uma chave específica do cache (use após criar/editar/deletar dados)
 */
export function invalidateCache(key) {
  delete _cache[key];
}

/**
 * Invalida todas as chaves que começam com um prefixo
 */
export function invalidateCachePrefix(prefix) {
  Object.keys(_cache).forEach(k => {
    if (k.startsWith(prefix)) delete _cache[k];
  });
}