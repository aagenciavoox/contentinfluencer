import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dataCache } from '../lib/dataCache';
import { ERRORS } from '../lib/uiCopy';

type PaginatedResult<T> = {
  items: T[];
  total: number;
};

type UsePaginatedQueryOptions<T, Q> = {
  namespace: string;
  query: Q;
  enabled?: boolean;
  fetchPage: (query: Q) => Promise<PaginatedResult<T>>;
};

export function usePaginatedQuery<T, Q extends { page: number; pageSize: number }>({
  namespace,
  query,
  enabled = true,
  fetchPage,
}: UsePaginatedQueryOptions<T, Q>) {
  const queryKey = useMemo(() => JSON.stringify(query), [query]);
  const fetchPageRef = useRef(fetchPage);
  fetchPageRef.current = fetchPage;

  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (options?: { background?: boolean }) => {
    if (!enabled) return;

    const cached = dataCache.getPage<T>(namespace, queryKey, query.page);
    const isFresh = dataCache.isPageFresh(namespace, queryKey, query.page);

    if (cached) {
      setItems(cached.items);
      setTotal(cached.total);
      setLoading(false);
      if (isFresh && !options?.background) return;
      setRefreshing(true);
    } else if (!options?.background) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const result = await fetchPageRef.current(query);
      dataCache.setPage(namespace, queryKey, query.page, result.items, result.total);
      setItems(result.items);
      setTotal(result.total);
      setError(null);
    } catch (err) {
      console.error(`[usePaginatedQuery:${namespace}] fetch failed:`, err);
      setError(err instanceof Error ? err.message : ERRORS.carregarDados);
      if (!cached) {
        setItems([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [enabled, namespace, query, queryKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const reload = useCallback(() => {
    dataCache.invalidatePages(namespace);
    return load({ background: true });
  }, [load, namespace]);

  return {
    items,
    total,
    loading,
    refreshing,
    error,
    reload,
  };
}
