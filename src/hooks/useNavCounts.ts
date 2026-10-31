import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataCache } from '../lib/dataCache';
import { fetchContentStats } from '../lib/database';

type NavCounts = {
  editorialCount: number;
  libraryCount: number;
};

// Sidebar e menu mobile usam o hook ao mesmo tempo: uma contagem em voo por usuário.
const inFlight = new Map<string, Promise<NavCounts>>();

function loadNavCounts(userId: string): Promise<NavCounts> {
  let pending = inFlight.get(userId);
  if (!pending) {
    pending = fetchContentStats(userId)
      .then(stats => ({ editorialCount: stats.editorialCount, libraryCount: stats.libraryCount }))
      .finally(() => inFlight.delete(userId));
    inFlight.set(userId, pending);
  }
  return pending;
}

export function useNavCounts(libraryCountFallback = 0) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  // O fallback muda a cada item da biblioteca carregado; não pode disparar nova contagem no banco.
  const fallbackRef = useRef(libraryCountFallback);
  fallbackRef.current = libraryCountFallback;
  const [counts, setCounts] = useState<NavCounts>({
    editorialCount: 0,
    libraryCount: libraryCountFallback,
  });

  useEffect(() => {
    if (!userId) return;

    let active = true;
    const cacheKey = `stats:nav:${userId}`;
    const cached = dataCache.getValue<NavCounts>(cacheKey);

    if (cached) {
      setCounts(prev => ({
        editorialCount: cached.editorialCount,
        libraryCount: cached.libraryCount || prev.libraryCount,
      }));
      if (dataCache.isValueFresh(cacheKey)) return;
    }

    void loadNavCounts(userId).then(stats => {
      dataCache.setValue(cacheKey, stats);
      if (!active) return;
      setCounts({
        editorialCount: stats.editorialCount,
        libraryCount: stats.libraryCount || fallbackRef.current,
      });
    }).catch(err => {
      // Contador do menu: se a carga não vier, fica o último valor.
      console.warn('[useNavCounts] contagem não veio', err);
    });

    return () => {
      active = false;
    };
  }, [userId]);

  return counts.libraryCount ? counts : { ...counts, libraryCount: libraryCountFallback };
}