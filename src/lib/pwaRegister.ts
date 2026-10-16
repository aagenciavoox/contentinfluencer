import { setPwaUpdateHandler } from './pwaRefresh';
import { startVersionPolling } from './appVersion';

/**
 * PWA instalável, mas online-first: dados vêm sempre da rede (Supabase).
 * autoUpdate: o SW novo assume (skipWaiting + clientsClaim) e a página recarrega.
 * Checagem a cada hora e ao voltar para a aba/janela (Safari quase nunca checa sozinho).
 */
export function registerPwaUpdates(): void {
  if (!import.meta.env.PROD) return;

  let registrationRef: ServiceWorkerRegistration | undefined;
  const checkSw = () => {
    if (registrationRef && navigator.onLine) void registrationRef.update().catch(() => {});
  };

  // version.json cobre clientes sem SW ou com SW travado.
  startVersionPolling(checkSw);

  if (!('serviceWorker' in navigator)) return;

  void import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onRegisteredSW(_swUrl, registration) {
        registrationRef = registration;
      },
      onNeedRefresh() {
        void updateSW(true);
      },
      onOfflineReady() {
        // App exige Supabase — não promovemos modo offline.
      },
    });

    setPwaUpdateHandler(updateSW);
  });
}