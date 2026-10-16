import { setPwaUpdateHandler } from './pwaRefresh';
import { startVersionPolling } from './appVersion';
import { announceAppUpdate } from './appUpdate';
import { decideOnNewVersion } from './appUpdateDecision';
import { hasUnsavedChanges } from './unsavedChanges';

/**
 * PWA instalável, mas online-first: dados vêm sempre da rede (Supabase).
 * Fluxo "prompt": o SW novo fica esperando até chamarmos updateSW(true)
 * (SKIP_WAITING + reload quando ele assume). Sem rascunho pendente, isso é imediato;
 * com rascunho, mostramos o aviso e gravamos tudo antes de trocar.
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
    let activating = false;
    const activate = async () => {
      // updateSW(true) só recarrega quando o SW em espera assume: sem SW novo, não há loop.
      if (activating) return;
      activating = true;
      await updateSW(true);
    };

    const updateSW = registerSW({
      immediate: true,
      onRegisteredSW(_swUrl, registration) {
        registrationRef = registration;
      },
      onNeedRefresh() {
        if (decideOnNewVersion({ hasUnsavedChanges: hasUnsavedChanges() }) === 'reload') {
          void activate();
          return;
        }
        announceAppUpdate(activate, 'sw');
      },
      onOfflineReady() {
        // App exige Supabase — não promovemos modo offline.
      },
    });

    setPwaUpdateHandler(updateSW);
  });
}