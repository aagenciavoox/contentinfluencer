import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { fetchContentsByIds } from '../lib/database';
import { isContentBodyLoaded, upsertContents } from '../features/contents/lib/contentBody';

type BodyHydrationState = {
  /** IDs currently being fetched. */
  loadingIds: Set<string>;
  /** IDs that failed to hydrate. */
  errorIds: Set<string>;
};

/**
 * Batch-hydrate content bodies for visible queue IDs.
 * Tracks per-id loading/error so UI never sticks on "Carregando..." after failure.
 */
export function useHydrateContentBodies(contentIds: readonly string[]) {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const contentsRef = useRef(state.contents);
  contentsRef.current = state.contents;

  const [hydration, setHydration] = useState<BodyHydrationState>({
    loadingIds: new Set(),
    errorIds: new Set(),
  });

  const missingIds = useMemo(() => {
    const missing: string[] = [];
    for (const id of contentIds) {
      const content = state.contents.find(item => item.id === id);
      if (!content || isContentBodyLoaded(content)) continue;
      if (hydration.errorIds.has(id)) continue;
      missing.push(id);
    }
    return missing;
  }, [contentIds, hydration.errorIds, state.contents]);

  const missingKey = missingIds.slice().sort().join(',');

  useEffect(() => {
    if (!user || missingIds.length === 0) return;

    let cancelled = false;
    const ids = [...missingIds];

    setHydration(previous => {
      const loadingIds = new Set(previous.loadingIds);
      for (const id of ids) loadingIds.add(id);
      return { ...previous, loadingIds };
    });

    void fetchContentsByIds(user.id, ids)
      .then(async fetched => {
        if (cancelled) return;
        const fetchedIds = new Set(fetched.map(item => item.id));
        if (fetched.length > 0) {
          await dispatch({
            type: 'SET_DATA',
            payload: { contents: upsertContents(contentsRef.current, fetched) },
          });
        }
        setHydration(previous => {
          const loadingIds = new Set(previous.loadingIds);
          const errorIds = new Set(previous.errorIds);
          for (const id of ids) {
            loadingIds.delete(id);
            if (!fetchedIds.has(id)) errorIds.add(id);
            else errorIds.delete(id);
          }
          return { loadingIds, errorIds };
        });
      })
      .catch(() => {
        if (cancelled) return;
        setHydration(previous => {
          const loadingIds = new Set(previous.loadingIds);
          const errorIds = new Set(previous.errorIds);
          for (const id of ids) {
            loadingIds.delete(id);
            errorIds.add(id);
          }
          return { loadingIds, errorIds };
        });
      });

    return () => {
      cancelled = true;
    };
    // missingKey captures the set of ids; avoid re-running on identity-only changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, missingKey, user]);

  const retry = (id: string) => {
    setHydration(previous => {
      const errorIds = new Set(previous.errorIds);
      errorIds.delete(id);
      return { ...previous, errorIds };
    });
  };

  return {
    isHydrating: (id: string) => hydration.loadingIds.has(id),
    hasHydrationError: (id: string) => hydration.errorIds.has(id),
    retryHydration: retry,
  };
}
