import { announceAppUpdate } from './appUpdate';

declare const __APP_VERSION__: string;

/** Versão deste build (gerada no vite build e publicada em /version.json). */
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';

const CHECK_INTERVAL_MS = 60 * 60 * 1000;
const MIN_GAP_MS = 60 * 1000;

let started = false;
let notified = false;
let lastCheck = 0;
let reloadHandler: () => void = () => window.location.reload();

export function setAppUpdateReload(handler: () => void): void {
  reloadHandler = handler;
}

/** Aviso persistente: "Nova versão disponível · Atualizar". */
export function announceNewVersion(): void {
  if (notified) return;
  notified = true;
  announceAppUpdate(() => reloadHandler(), 'version');
}

async function checkVersion(): Promise<void> {
  const now = Date.now();
  if (notified || now - lastCheck < MIN_GAP_MS) return;
  lastCheck = now;
  try {
    const res = await fetch(`/version.json?t=${now}`, { cache: 'no-store' });
    if (!res.ok) return;
    const data = (await res.json()) as { version?: string };
    if (data.version && data.version !== APP_VERSION) announceNewVersion();
  } catch {
    // Sem rede: tenta de novo depois.
  }
}

/** Fallback para quando o service worker não detecta o deploy (ex.: Safari/PWA no Mac). */
export function startVersionPolling(onCheck?: () => void): void {
  if (!import.meta.env.PROD || started) return;
  started = true;
  const run = () => {
    onCheck?.();
    void checkVersion();
  };
  window.setInterval(run, CHECK_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') run();
  });
  window.addEventListener('focus', run);
  window.addEventListener('online', run);
}