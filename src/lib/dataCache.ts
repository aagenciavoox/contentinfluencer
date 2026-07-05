const FRESH_TTL_MS = 5 * 60 * 1000;
const STALE_TTL_MS = 30 * 60 * 1000;

type DomainCacheEntry = {
  payload: unknown;
  fetchedAt: number;
};

type PageCacheBucket = {
  queryKey: string;
  pages: Map<number, { items: unknown[]; total: number; fetchedAt: number }>;
  fetchedAt: number;
};

class DataCache {
  private domainEntries = new Map<string, DomainCacheEntry>();
  private pageBuckets = new Map<string, PageCacheBucket>();
  private valueEntries = new Map<string, DomainCacheEntry>();

  getDomain<T>(key: string): T | null {
    const entry = this.domainEntries.get(key);
    if (!entry) return null;
    if (Date.now() - entry.fetchedAt > STALE_TTL_MS) {
      this.domainEntries.delete(key);
      return null;
    }
    return entry.payload as T;
  }

  setDomain(key: string, payload: unknown) {
    this.domainEntries.set(key, { payload, fetchedAt: Date.now() });
  }

  isDomainFresh(key: string): boolean {
    const entry = this.domainEntries.get(key);
    if (!entry) return false;
    return Date.now() - entry.fetchedAt <= FRESH_TTL_MS;
  }

  getValue<T>(key: string): T | null {
    const entry = this.valueEntries.get(key);
    if (!entry) return null;
    if (Date.now() - entry.fetchedAt > STALE_TTL_MS) {
      this.valueEntries.delete(key);
      return null;
    }
    return entry.payload as T;
  }

  setValue(key: string, payload: unknown) {
    this.valueEntries.set(key, { payload, fetchedAt: Date.now() });
  }

  isValueFresh(key: string): boolean {
    const entry = this.valueEntries.get(key);
    if (!entry) return false;
    return Date.now() - entry.fetchedAt <= FRESH_TTL_MS;
  }

  getPage<T>(namespace: string, queryKey: string, page: number): { items: T[]; total: number } | null {
    const bucket = this.pageBuckets.get(`${namespace}:${queryKey}`);
    if (!bucket) return null;
    const entry = bucket.pages.get(page);
    if (!entry) return null;
    if (Date.now() - entry.fetchedAt > STALE_TTL_MS) {
      bucket.pages.delete(page);
      return null;
    }
    return { items: entry.items as T[], total: entry.total };
  }

  isPageFresh(namespace: string, queryKey: string, page: number): boolean {
    const bucket = this.pageBuckets.get(`${namespace}:${queryKey}`);
    const entry = bucket?.pages.get(page);
    if (!entry) return false;
    return Date.now() - entry.fetchedAt <= FRESH_TTL_MS;
  }

  setPage(namespace: string, queryKey: string, page: number, items: unknown[], total: number) {
    const bucketKey = `${namespace}:${queryKey}`;
    const bucket = this.pageBuckets.get(bucketKey) ?? {
      queryKey,
      pages: new Map(),
      fetchedAt: Date.now(),
    };
    bucket.pages.set(page, { items, total, fetchedAt: Date.now() });
    bucket.fetchedAt = Date.now();
    this.pageBuckets.set(bucketKey, bucket);
  }

  invalidateDomain(prefix?: string) {
    if (!prefix) {
      this.domainEntries.clear();
      return;
    }
    for (const key of this.domainEntries.keys()) {
      if (key.includes(prefix)) this.domainEntries.delete(key);
    }
  }

  invalidateValue(prefix?: string) {
    if (!prefix) {
      this.valueEntries.clear();
      return;
    }
    for (const key of this.valueEntries.keys()) {
      if (key.startsWith(prefix)) this.valueEntries.delete(key);
    }
  }

  invalidatePages(namespace?: string) {
    if (!namespace) {
      this.pageBuckets.clear();
      return;
    }
    for (const key of this.pageBuckets.keys()) {
      if (key.startsWith(`${namespace}:`)) this.pageBuckets.delete(key);
    }
  }

  invalidateAll() {
    this.domainEntries.clear();
    this.pageBuckets.clear();
    this.valueEntries.clear();
  }
}

export const dataCache = new DataCache();

export function buildDomainCacheKey(domains: readonly string[]) {
  return `domain:${[...domains].sort().join('|')}`;
}
