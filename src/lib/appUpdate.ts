import { flushUnsavedChanges, hasUnsavedChanges, subscribeUnsavedChanges } from './unsavedChanges';
import { shouldAutoApplyPendingUpdate } from './appUpdateDecision';

type ApplyUpdate = () => void | Promise<void>;

let available = false;
let applying = false;
let applyHandler: ApplyUpdate = () => window.location.reload();
let fromServiceWorker = false;
const listeners = new Set<() => void>();
let watching = false;

function emit(): void {
  listeners.forEach(listener => listener());
}

export function isAppUpdateAvailable(): boolean {
  return available;
}

export function isAppUpdateApplying(): boolean {
  return applying;
}

export function subscribeAppUpdate(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Mostra o aviso "Nova versão disponível · Atualizar" (slot próprio, não disputa com o toast de salvamento).
 * O handler do service worker tem prioridade sobre o do version.json.
 */
export function announceAppUpdate(apply: ApplyUpdate, source: 'sw' | 'version' = 'version'): void {
  if (source === 'sw') {
    applyHandler = apply;
    fromServiceWorker = true;
  } else if (!fromServiceWorker) {
    applyHandler = apply;
  }
  if (!available) {
    available = true;
    emit();
  }
  watchForSafeAutoApply();
}

/** Grava os rascunhos pendentes e só então ativa a nova versão. */
export async function applyAppUpdate(): Promise<void> {
  if (applying) return;
  applying = true;
  emit();
  try {
    await flushUnsavedChanges();
    await applyHandler();
  } catch (error) {
    console.warn('[PWA] Não atualizou:', error);
    applying = false;
    emit();
  }
}

function maybeAutoApply(): void {
  if (
    shouldAutoApplyPendingUpdate({
      updatePending: available,
      hasUnsavedChanges: hasUnsavedChanges(),
      documentHidden: document.visibilityState === 'hidden',
      applying,
    })
  ) {
    void applyAppUpdate();
  }
}

function watchForSafeAutoApply(): void {
  if (watching) return;
  watching = true;
  subscribeUnsavedChanges(maybeAutoApply);
  document.addEventListener('visibilitychange', maybeAutoApply);
}