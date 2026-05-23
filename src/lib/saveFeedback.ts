export type SaveFeedbackStatus = 'idle' | 'saving' | 'success' | 'error';

export type SaveFeedbackState = {
  status: SaveFeedbackStatus;
  message: string;
  detail?: string;
  updatedAt: number;
};

const AUTO_HIDE_MS = 3200;

let state: SaveFeedbackState = {
  status: 'idle',
  message: '',
  updatedAt: 0,
};

const listeners = new Set<() => void>();
let hideTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  listeners.forEach(listener => listener());
}

export function getSaveFeedbackState(): SaveFeedbackState {
  return state;
}

export function subscribeSaveFeedback(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearSaveFeedback(): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  state = { status: 'idle', message: '', updatedAt: Date.now() };
  emit();
}

export function notifySaveFeedback(
  next: Pick<SaveFeedbackState, 'status' | 'message' | 'detail'>
): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }

  state = {
    ...next,
    updatedAt: Date.now(),
  };
  emit();

  if (next.status === 'success' || next.status === 'error') {
    hideTimer = setTimeout(() => {
      state = { status: 'idle', message: '', updatedAt: Date.now() };
      emit();
      hideTimer = null;
    }, AUTO_HIDE_MS);
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return 'Nao foi possivel salvar. Tente novamente.';
}
