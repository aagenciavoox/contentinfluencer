/// <reference types="vite/client" />
import {createClient, SupabaseClient} from '@supabase/supabase-js';
import {notifyTableWrite, writtenTable} from './tableWrites.ts';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY?.trim();

export const supabaseConfigStatus = {
  url: Boolean(supabaseUrl),
  anonKey: Boolean(supabaseAnonKey),
};

export const isSupabaseConfigured =
  supabaseConfigStatus.url && supabaseConfigStatus.anonKey;

// O banco (plano pequeno) tem poucas conexões. Disparar 15–20 consultas de uma vez na abertura,
// em 2–3 abas, esgotava o pool (PGRST003 / 504). Aqui:
//  - no máximo MAX_IN_FLIGHT chamadas REST/RPC ao mesmo tempo (auth e realtime ficam de fora);
//  - leituras idênticas em voo (GET/HEAD com a mesma URL) viram uma só;
//  - 503/504/PGRST003 em leitura: até 2 novas tentativas com espera crescente e aleatória.
const MAX_IN_FLIGHT = 4;
const MAX_READ_RETRIES = 2;
let inFlight = 0;
const waiting: Array<() => void> = [];
const sharedReads = new Map<string, Promise<Response>>();

async function acquireSlot() {
  if (inFlight < MAX_IN_FLIGHT) {
    inFlight += 1;
    return;
  }
  await new Promise<void>(resolve => waiting.push(resolve));
  inFlight += 1;
}

function releaseSlot() {
  inFlight -= 1;
  const next = waiting.shift();
  if (next) next();
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function isThrottledPath(url: string) {
  return url.includes('/rest/v1/');
}

function backoffMs(attempt: number) {
  // 1ª: ~1–2 s, 2ª: ~2–4 s. Nunca tenta de novo na hora: o pool precisa de folga.
  const base = 1000 * 2 ** attempt;
  return base + Math.random() * base;
}

async function isPoolExhausted(response: Response) {
  if (response.status === 503 || response.status === 504) return true;
  if (response.status < 500) return false;
  try {
    const body = await response.clone().text();
    return body.includes('PGRST003') || body.includes('57014');
  } catch {
    return false;
  }
}

async function throttledFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = requestUrl(input);
  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const isRead = method === 'GET' || method === 'HEAD';

  for (let attempt = 0; ; attempt += 1) {
    await acquireSlot();
    let response: Response;
    try {
      response = await fetch(input, { ...init, cache: 'no-store' });
    } finally {
      releaseSlot();
    }
    if (!isRead || attempt >= MAX_READ_RETRIES || init?.signal?.aborted || !(await isPoolExhausted(response))) {
      return response;
    }
    await new Promise(resolve => setTimeout(resolve, backoffMs(attempt)));
  }
}

const fetchWithoutHttpCache: typeof fetch = (input, init) => {
  const url = requestUrl(input);
  if (!isThrottledPath(url)) {
    return fetch(input, { ...init, cache: 'no-store' });
  }
  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  if ((method !== 'GET' && method !== 'HEAD') || init?.signal) {
    const table = writtenTable(url, method);
    const pending = throttledFetch(input, init);
    if (!table) return pending;
    // Gravação confirmada avisa as outras abas e aparelhos (Broadcast em AppContext).
    return pending.then(response => {
      if (response.ok) notifyTableWrite(table);
      return response;
    });
  }
  const headers = new Headers(init?.headers);
  // Mesma URL com usuário/contagem diferente não pode virar a mesma resposta.
  const key = `${method} ${url} ${headers.get('Authorization') ?? ''} ${headers.get('Prefer') ?? ''} ${headers.get('Range') ?? ''}`;
  let shared = sharedReads.get(key);
  if (!shared) {
    shared = throttledFetch(input, init).finally(() => sharedReads.delete(key));
    sharedReads.set(key, shared);
  }
  return shared.then(response => response.clone());
};

export const supabase: SupabaseClient | null =
  isSupabaseConfigured
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        global: {
          fetch: fetchWithoutHttpCache,
        },
      })
    : null;

// Id da sessao atual, mantido pelo evento de auth. Ler daqui evita chamar
// auth.getUser() a cada consulta/gravacao: cada chamada disputa o lock do token
// e, com gravacoes em paralelo, o lock estourava ("Lock broken ... steal").
let cachedUserId: string | null = null;
if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    cachedUserId = session?.user?.id ?? null;
  });
}

export function getCachedUserId(): string | null {
  return cachedUserId;
}
