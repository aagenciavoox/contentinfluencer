import type { AppData, Platform } from './database';
import { BOOTSTRAP_DATA_DOMAINS, CRITICAL_BOOTSTRAP_DOMAINS, type AppDataDomain } from './database';
import { buildDomainCacheKey, dataCache } from './dataCache';
import { readPersistedDomain, writePersistedDomain } from './persistentDataCache';

const STORAGE_PREFIX = 'content-os:domain:';

const DOMAIN_SETS_WITH_PLATFORMS: readonly (readonly AppDataDomain[])[] = [
  ['bootstrap'],
  CRITICAL_BOOTSTRAP_DOMAINS,
  BOOTSTRAP_DATA_DOMAINS,
];

const DOMAIN_SETS_WITH_CONTENTS: readonly (readonly AppDataDomain[])[] = [
  ['bootstrap'],
  CRITICAL_BOOTSTRAP_DOMAINS,
  BOOTSTRAP_DATA_DOMAINS,
  ['content-schedule'],
  ['content-schedule', 'rules'],
  ['content-schedule', 'agenda', 'projects'],
  ['content'],
  ['content-summary'],
  ['production', 'content'],
  ['production', 'library', 'recording', 'content'],
  ['rules', 'production', 'content'],
  ['production', 'content', 'bootstrap'],
  ['production', 'library'],
  ['ideas', 'production', 'library'],
];

function patchDomainCache(userId: string, cacheKey: string, patch: Partial<AppData>) {
  const memory = dataCache.getDomain<Partial<AppData>>(cacheKey);
  const persisted = readPersistedDomain(userId, cacheKey);
  if (!memory && !persisted) return;

  const base = memory ?? persisted!.payload;
  const next = { ...base, ...patch };
  dataCache.setDomain(cacheKey, next);
  writePersistedDomain(userId, cacheKey, next);
}

function collectDomainCacheKeys(domainSets: readonly (readonly AppDataDomain[])[]): Set<string> {
  const keys = new Set<string>();
  domainSets.forEach(domains => keys.add(buildDomainCacheKey(domains)));
  return keys;
}

function patchPersistedDomainCachesScan(userId: string, patch: Partial<AppData>) {
  if (typeof window === 'undefined') return;

  const prefix = `${STORAGE_PREFIX}${userId}:domain:`;
  const keysToPatch: string[] = [];

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const storageKey = window.localStorage.key(index);
      if (!storageKey?.startsWith(prefix)) continue;
      keysToPatch.push(storageKey.slice(prefix.length));
    }
  } catch {
    return;
  }

  keysToPatch.forEach(cacheKey => patchDomainCache(userId, cacheKey, patch));
}

function patchDomainCaches(userId: string, domainSets: readonly (readonly AppDataDomain[])[], patch: Partial<AppData>) {
  const keys = collectDomainCacheKeys(domainSets);
  keys.forEach(cacheKey => patchDomainCache(userId, cacheKey, patch));
  patchPersistedDomainCachesScan(userId, patch);
}

/** Mantém caches alinhados após mutações de plataforma. */
export function patchPlatformsInDomainCaches(userId: string, platforms: Platform[]) {
  patchDomainCaches(userId, DOMAIN_SETS_WITH_PLATFORMS, { platforms });
}

/** Mantém caches alinhados após mutações de conteúdo (grade, postados, roteiros). */
export function patchContentsInDomainCaches(userId: string, contents: AppData['contents']) {
  patchDomainCaches(userId, DOMAIN_SETS_WITH_CONTENTS, { contents });
}

const DOMAIN_SETS_WITH_SERIES: readonly (readonly AppDataDomain[])[] = [
  ['bootstrap'],
  ['production'],
  CRITICAL_BOOTSTRAP_DOMAINS,
  BOOTSTRAP_DATA_DOMAINS,
];

function patchSeriesDomainCache(userId: string, cacheKey: string, series: AppData['series']) {
  const memory = dataCache.getDomain<Partial<AppData>>(cacheKey);
  const persisted = readPersistedDomain(userId, cacheKey);
  const base = memory ?? persisted?.payload ?? null;
  if (!base || !Array.isArray(base.series)) return;

  const next = { ...base, series };
  dataCache.setDomain(cacheKey, next);
  writePersistedDomain(userId, cacheKey, next);
}

/** Mantém o catálogo de temas nos mesmos caches da produção, sem misturar com série. */
export function patchTemasInDomainCaches(userId: string, temas: AppData['temas']) {
  const keys = collectDomainCacheKeys(DOMAIN_SETS_WITH_SERIES);

  if (typeof window !== 'undefined') {
    const prefix = `${STORAGE_PREFIX}${userId}:domain:`;
    try {
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const storageKey = window.localStorage.key(index);
        if (storageKey?.startsWith(prefix)) keys.add(storageKey.slice(prefix.length));
      }
    } catch {
      // localStorage indisponível: os conjuntos conhecidos ainda são atualizados.
    }
  }

  keys.forEach(cacheKey => {
    const memory = dataCache.getDomain<Partial<AppData>>(cacheKey);
    const persisted = readPersistedDomain(userId, cacheKey);
    const base = memory ?? persisted?.payload ?? null;
    if (!base || (!Array.isArray(base.series) && !Array.isArray(base.temas))) return;
    const next = { ...base, temas };
    dataCache.setDomain(cacheKey, next);
    writePersistedDomain(userId, cacheKey, next);
  });
}

/** Mantém caches que já guardam séries alinhados após criar, editar ou apagar. */
export function patchSeriesInDomainCaches(userId: string, series: AppData['series']) {
  const keys = collectDomainCacheKeys(DOMAIN_SETS_WITH_SERIES);

  if (typeof window !== 'undefined') {
    const prefix = `${STORAGE_PREFIX}${userId}:domain:`;
    try {
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const storageKey = window.localStorage.key(index);
        if (storageKey?.startsWith(prefix)) keys.add(storageKey.slice(prefix.length));
      }
    } catch {
      // localStorage indisponível: os conjuntos conhecidos ainda são atualizados.
    }
  }

  keys.forEach(cacheKey => patchSeriesDomainCache(userId, cacheKey, series));
}

export { mergeFetchedAppData } from './domainCacheMerge';
