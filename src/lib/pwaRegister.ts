import { setPwaUpdateHandler } from './pwaRefresh';

/**
 * PWA instalável, mas online-first: dados vêm sempre da rede (Supabase).
 * autoUpdate recarrega quando um novo build é publicado.
 */
export function registerPwaUpdates(): void {
  if (!import.meta.env.PROD) return;

  void import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;
        // Checa nova versão a cada hora (útil com app instalado na home)
        window.setInterval(() => {
          void registration.update();
        }, 60 * 60 * 1000);
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
