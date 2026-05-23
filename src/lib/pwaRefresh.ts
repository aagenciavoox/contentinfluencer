import { notifySaveFeedback } from './saveFeedback';

let applyPwaUpdate: ((reloadPage?: boolean) => Promise<void>) | null = null;

export function setPwaUpdateHandler(handler: (reloadPage?: boolean) => Promise<void>): void {
  applyPwaUpdate = handler;
}

export async function checkForPwaUpdate(): Promise<boolean> {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;

    await registration.update();

    if (registration.waiting) {
      if (applyPwaUpdate) {
        await applyPwaUpdate(true);
      } else {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
      return true;
    }

    return false;
  } catch (error) {
    console.warn('[PWA] Update check failed:', error);
    return false;
  }
}

export async function forceMobileRefresh(syncData: () => Promise<void>): Promise<void> {
  await syncData();

  const reloaded = await checkForPwaUpdate();
  if (reloaded) return;

  notifySaveFeedback({ status: 'success', message: 'Atualizado' });
}
