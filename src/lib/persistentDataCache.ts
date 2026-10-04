import type { AppData, AppDataDomain, Content } from './database';
import { readStoredJson, writeStoredJson } from './browserStorage.ts';

const STORAGE_PREFIX = 'content-os:domain:';
const EPOCH_KEY = 'content-os:domain-epoch';
/** Trocar este valor descarta a lista local de roteiros/ideias na próxima abertura. */
const DOMAIN_CACHE_EPOCH = '2026-10-02-clear-creations';
/** Dados persistidos ficam legíveis por até 24h; revalidação em background após 5 min. */
export const PERSISTENT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const PERSISTENT_FRESH_MS = 5 * 60 * 1000;

/** Apaga o cache de domínio de versões anteriores. A lista guardava títulos sem o corpo. */
export function discardObsoleteDomainCache(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.localStorage.getItem(EPOCH_KEY) === DOMAIN_CACHE_EPOCH) return false;
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) keysToRemove.push(key);
    }
    keysToRemove.forEach(key => window.localStorage.removeItem(key));
    window.localStorage.setItem(EPOCH_KEY, DOMAIN_CACHE_EPOCH);
    return true;
  } catch {
    return false;
  }
}

type PersistedEntry = {
  payload: Partial<AppData>;
  fetchedAt: number;
};

/**
 * Domínios de lista (`content`, `content-schedule`, `content-summary`) usam select leve
 * sem roteiro; o corpo é hidratado sob demanda em detalhe/gravação.
 * Qualquer payload com `contents` (mesmo sanitizado) satisfaz esses pedidos.
 */
export function canDomainPayloadSatisfyRequest(
  domains: readonly AppDataDomain[],
  payload: Partial<AppData>,
) {
  const needsContents =
    domains.includes('content')
    || domains.includes('content-schedule')
    || domains.includes('content-summary');
  if (!needsContents) return true;
  return Array.isArray(payload.contents);
}

function storageKey(userId: string, cacheKey: string) {
  return `${STORAGE_PREFIX}${userId}:${cacheKey}`;
}

/** Remove campos pesados antes de gravar no localStorage. */
export function sanitizeDomainPayload(payload: Partial<AppData>): Partial<AppData> {
  if (!payload.contents?.length) return payload;

  return {
    ...payload,
    contents: payload.contents.map(stripContentForCache),
  };
}

function stripContentForCache(content: Content): Content {
  return {
    ...content,
    // `undefined` diferencia "campo não carregado" de um roteiro carregado e vazio.
    // JSON.stringify omite essas chaves e força o detalhe a buscar o corpo no servidor.
    script: undefined,
    scriptNotes: [],
    notes: undefined,
    referencias: undefined,
    writingNotes: undefined,
  } as Content;
}

export function readPersistedDomain(userId: string, cacheKey: string): PersistedEntry | null {
  discardObsoleteDomainCache();
  const entry = readStoredJson<PersistedEntry | null>(storageKey(userId, cacheKey), null);
  if (!entry?.payload) return null;
  if (Date.now() - entry.fetchedAt > PERSISTENT_MAX_AGE_MS) {
    clearPersistedDomain(userId, cacheKey);
    return null;
  }
  return {
    ...entry,
    // Normaliza também caches gravados por versões anteriores, que usavam `null`.
    payload: sanitizeDomainPayload(entry.payload),
  };
}

export function writePersistedDomain(userId: string, cacheKey: string, payload: Partial<AppData>) {
  writeStoredJson(storageKey(userId, cacheKey), {
    payload: sanitizeDomainPayload(payload),
    fetchedAt: Date.now(),
  } satisfies PersistedEntry);
}

export function clearPersistedDomain(userId: string, cacheKey: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(userId, cacheKey));
  } catch {
    // ignore
  }
}

export function clearPersistedDomainsForUser(userId: string) {
  if (typeof window === 'undefined') return;
  try {
    const prefix = `${STORAGE_PREFIX}${userId}:`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(prefix)) keysToRemove.push(key);
    }
    keysToRemove.forEach(key => window.localStorage.removeItem(key));
  } catch {
    // ignore
  }
}

export function isPersistedDomainFresh(entry: PersistedEntry): boolean {
  return Date.now() - entry.fetchedAt <= PERSISTENT_FRESH_MS;
}

// Primeira página de listas paginadas (ex.: Biblioteca), para a lista aparecer na hora.

/** Consultas guardadas por lista. Buscas digitadas não enchem o armazenamento. */
export const PERSISTED_PAGE_LIMIT = 4;
const PAGE_SEGMENT = ':page:';

export type PersistedPageEntry<T> = {
  items: T[];
  total: number;
  fetchedAt: number;
};

/**
 * `persistKey` começa com o id do usuário (ex.: `${userId}:library`). A chave fica sob o
 * mesmo prefixo dos domínios, então o logout e a troca de época apagam estas páginas junto.
 */
function pageStorageKey(persistKey: string, queryKey: string) {
  return `${STORAGE_PREFIX}${persistKey}${PAGE_SEGMENT}${queryKey}`;
}

export function readPersistedPage<T>(persistKey: string, queryKey: string): PersistedPageEntry<T> | null {
  discardObsoleteDomainCache();
  const key = pageStorageKey(persistKey, queryKey);
  const entry = readStoredJson<PersistedPageEntry<T> | null>(key, null);
  if (
    !entry
    || !Array.isArray(entry.items)
    || typeof entry.total !== 'number'
    || typeof entry.fetchedAt !== 'number'
  ) {
    return null;
  }
  if (Date.now() - entry.fetchedAt > PERSISTENT_MAX_AGE_MS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    return null;
  }
  return entry;
}

export function writePersistedPage<T>(persistKey: string, queryKey: string, items: T[], total: number) {
  writeStoredJson(pageStorageKey(persistKey, queryKey), {
    items,
    total,
    fetchedAt: Date.now(),
  } satisfies PersistedPageEntry<T>);
  prunePersistedPages(persistKey);
}

/** Apaga as páginas guardadas do usuário. Usado depois de uma alteração local nos itens da lista. */
export function clearPersistedPagesForUser(userId: string) {
  if (typeof window === 'undefined') return;
  try {
    const prefix = `${STORAGE_PREFIX}${userId}:`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(prefix) && key.includes(PAGE_SEGMENT)) keysToRemove.push(key);
    }
    keysToRemove.forEach(key => window.localStorage.removeItem(key));
  } catch {
    // ignore
  }
}

/** Chaves a apagar: ficam só as `limit` gravadas por último. */
export function selectPersistedPagesToPrune(
  entries: ReadonlyArray<{ key: string; fetchedAt: number }>,
  limit: number,
): string[] {
  if (entries.length <= limit) return [];
  return [...entries]
    .sort((left, right) => right.fetchedAt - left.fetchedAt)
    .slice(limit)
    .map(entry => entry.key);
}

function prunePersistedPages(persistKey: string) {
  if (typeof window === 'undefined') return;
  try {
    const prefix = `${STORAGE_PREFIX}${persistKey}${PAGE_SEGMENT}`;
    const entries: Array<{ key: string; fetchedAt: number }> = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      const entry = readStoredJson<{ fetchedAt?: number } | null>(key, null);
      entries.push({ key, fetchedAt: entry?.fetchedAt ?? 0 });
    }
    selectPersistedPagesToPrune(entries, PERSISTED_PAGE_LIMIT)
      .forEach(key => window.localStorage.removeItem(key));
  } catch {
    // ignore
  }
}
