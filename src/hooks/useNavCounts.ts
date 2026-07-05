import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataCache } from '../lib/dataCache';
import { fetchContentStats } from '../lib/database';

type NavCounts = {
  editorialCount: number;
  libraryCount: number;
};

export function useNavCounts(libraryCountFallback = 0) {
  const { user } = useAuth();
  const [counts, setCounts] = useState<NavCounts>({
    editorialCount: 0,
    libraryCount: libraryCountFallback,
  });

  useEffect(() => {
    if (!user) return;

    let active = true;
    const cacheKey = `stats:nav:${user.id}`;
    const cached = dataCache.getValue<NavCounts>(cacheKey);

    if (cached) {
      setCounts(prev => ({
        editorialCount: cached.editorialCount,
        libraryCount: cached.libraryCount || prev.libraryCount,
      }));
      if (dataCache.isValueFresh(cacheKey)) return;
    }

    void fetchContentStats(user.id).then(stats => {
      if (!active) return;
      const next = {
        editorialCount: stats.editorialCount,
        libraryCount: stats.libraryCount || libraryCountFallback,
      };
      dataCache.setValue(cacheKey, next);
      setCounts(next);
    });

    return () => {
      active = false;
    };
  }, [libraryCountFallback, user]);

  return counts;
}
