const FRESH_TTL_MS = 5 * 60 * 1000;

type CacheEntry<T> = {
  value: T;
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

export async function getCachedPlatforms<T>(
  userId: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const entry = cache.get(userId);
  if (entry && Date.now() - entry.fetchedAt <= FRESH_TTL_MS) {
    return entry.value as T;
  }

  const value = await fetcher();
  cache.set(userId, { value, fetchedAt: Date.now() });
  return value;
}

export function invalidatePlatformsCache(userId?: string) {
  if (!userId) {
    cache.clear();
    return;
  }
  cache.delete(userId);
}
