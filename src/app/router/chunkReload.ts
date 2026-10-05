const CHUNK_RELOAD_KEY = 'criaki-chunk-reload';

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(message);
}

export async function recoverFromChunkError(force = false): Promise<void> {
  try {
    if (!force && sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1') return;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
  } catch {
    // sessionStorage pode estar bloqueado.
  }

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
  }
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(registration => registration.unregister()));
  }
  window.location.reload();
}

function markChunksHealthy(): void {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  } catch {
    // sessionStorage pode estar bloqueado.
  }
}

/** Recarrega uma vez se o navegador ficou com um pedaço antigo depois de um deploy. */
export function importPage<T>(importer: () => Promise<T>): Promise<T> {
  return importer().then(module => {
    markChunksHealthy();
    return module;
  }).catch(error => {
    if (!isChunkLoadError(error)) throw error;
    let alreadyTried = false;
    try {
      alreadyTried = sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1';
    } catch {
      alreadyTried = false;
    }
    if (alreadyTried) throw error;
    void recoverFromChunkError();
    return new Promise<T>(() => {});
  });
}
