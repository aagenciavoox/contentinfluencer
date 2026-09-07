import type { AppData, AppDataDomain, Content } from './database';
import { readStoredJson, writeStoredJson } from './browserStorage.ts';

const STORAGE_PREFIX = 'content-os:domain:';
/** Dados persistidos ficam legíveis por até 24h; revalidação em background após 5 min. */
export const PERSISTENT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const PERSISTENT_FRESH_MS = 5 * 60 * 1000;

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
  } as Content;
}

export function readPersistedDomain(userId: string, cacheKey: string): PersistedEntry | null {
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
