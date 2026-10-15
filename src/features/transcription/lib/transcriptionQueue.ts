import { TranscriptionUserError } from './transcriptionErrors.ts';
import type { Transcript, TranscriptLanguage } from './transcriptFormats.ts';

export type QueueItemStatus = 'waiting' | 'extracting' | 'transcribing' | 'done' | 'error';

export type QueueItem = {
  id: string;
  file: File;
  language: TranscriptLanguage;
  status: QueueItemStatus;
  /** 0–1, só enquanto o áudio é separado. */
  progress: number;
  transcript: Transcript | null;
  error: string | null;
};

export type QueueState = {
  items: QueueItem[];
  /** Mensagem do limite gratuito; com ela a fila espera alguém tocar em Retomar. */
  pausedMessage: string | null;
};

export type QueueDeps = {
  extract: (
    file: File,
    options: { signal: AbortSignal; onProgress: (progress: number) => void },
  ) => Promise<{ blob: Blob; fileName: string }>;
  transcribe: (
    audio: Blob,
    fileName: string,
    language: TranscriptLanguage,
    signal: AbortSignal,
  ) => Promise<Transcript>;
  createId?: () => string;
};

const FALLBACK_MESSAGE = {
  extracting: 'O navegador não conseguiu ler o som deste vídeo. Exportar de novo em MP4 costuma resolver.',
  transcribing: 'A transcrição não voltou desta vez. Dá para tentar de novo em instantes.',
} as const;

export function isQueueItemActive(item: QueueItem) {
  return item.status === 'extracting' || item.status === 'transcribing';
}

export function hasPendingWork(state: QueueState) {
  return state.items.some(item => item.status === 'waiting' || isQueueItemActive(item));
}

/** Posição de cada vídeo que ainda espera a vez (1 = o próximo). */
export function waitingPositions(items: readonly QueueItem[]) {
  const positions = new Map<string, number>();
  for (const item of items) {
    if (item.status === 'waiting') positions.set(item.id, positions.size + 1);
  }
  return positions;
}

/**
 * Fila que transcreve um vídeo por vez, na ordem em que entraram.
 * Vive fora do React: dá para sair da tela e voltar sem perder o andamento.
 * Nada é gravado; recarregar a página limpa a fila.
 */
export function createTranscriptionQueue(deps: QueueDeps) {
  const createId = deps.createId ?? (() => crypto.randomUUID());
  const listeners = new Set<() => void>();
  let state: QueueState = { items: [], pausedMessage: null };
  let active: { id: string; controller: AbortController } | null = null;

  const setState = (next: QueueState) => {
    state = next;
    for (const listener of listeners) listener();
  };

  const patchItem = (id: string, changes: Partial<QueueItem>) => {
    if (!state.items.some(item => item.id === id)) return;
    setState({
      ...state,
      items: state.items.map(item => (item.id === id ? { ...item, ...changes } : item)),
    });
  };

  async function processNext() {
    if (active || state.pausedMessage) return;
    const next = state.items.find(item => item.status === 'waiting');
    if (!next) return;

    const controller = new AbortController();
    active = { id: next.id, controller };
    let step: 'extracting' | 'transcribing' = 'extracting';
    patchItem(next.id, { status: 'extracting', progress: 0, error: null });

    try {
      let shownPercent = 0;
      const audio = await deps.extract(next.file, {
        signal: controller.signal,
        // O progresso chega milhares de vezes; o estado só muda quando o número inteiro muda.
        onProgress: progress => {
          const percent = Math.floor(progress * 100);
          if (controller.signal.aborted || percent === shownPercent) return;
          shownPercent = percent;
          patchItem(next.id, { progress: percent / 100 });
        },
      });
      if (controller.signal.aborted) return;

      step = 'transcribing';
      patchItem(next.id, { status: 'transcribing' });
      const transcript = await deps.transcribe(audio.blob, audio.fileName, next.language, controller.signal);
      if (controller.signal.aborted) return;
      patchItem(next.id, { status: 'done', transcript });
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = error instanceof TranscriptionUserError ? error.message : FALLBACK_MESSAGE[step];
      if (error instanceof TranscriptionUserError && error.kind === 'rate-limit') {
        // Volta para a fila no mesmo lugar e espera; os próximos bateriam no mesmo limite.
        patchItem(next.id, { status: 'waiting', progress: 0 });
        setState({ ...state, pausedMessage: message });
      } else {
        patchItem(next.id, { status: 'error', error: message });
      }
    } finally {
      if (active?.id === next.id) active = null;
      void processNext();
    }
  }

  return {
    getState: () => state,

    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    addFiles(files: readonly File[], language: TranscriptLanguage) {
      if (files.length === 0) return;
      const added: QueueItem[] = files.map(file => ({
        id: createId(),
        file,
        language,
        status: 'waiting',
        progress: 0,
        transcript: null,
        error: null,
      }));
      setState({ ...state, items: [...state.items, ...added] });
      void processNext();
    },

    /** Tira da fila; se for o vídeo em andamento, interrompe e segue para o próximo. */
    remove(id: string) {
      if (active?.id === id) {
        active.controller.abort();
        active = null;
      }
      setState({ ...state, items: state.items.filter(item => item.id !== id) });
      void processNext();
    },

    retry(id: string) {
      patchItem(id, { status: 'waiting', progress: 0, error: null, transcript: null });
      void processNext();
    },

    resume() {
      setState({ ...state, pausedMessage: null });
      void processNext();
    },

    clearDone() {
      setState({ ...state, items: state.items.filter(item => item.status !== 'done') });
    },
  };
}

export type TranscriptionQueue = ReturnType<typeof createTranscriptionQueue>;

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/** `2 prontas · 1 em andamento · 3 na fila` */
export function queueSummary(items: readonly QueueItem[]) {
  const count = (test: (item: QueueItem) => boolean) => items.filter(test).length;
  const done = count(item => item.status === 'done');
  const active = count(isQueueItemActive);
  const waiting = count(item => item.status === 'waiting');
  const errors = count(item => item.status === 'error');
  return [
    done ? plural(done, 'pronta', 'prontas') : null,
    active ? `${active} em andamento` : null,
    waiting ? `${waiting} na fila` : null,
    errors ? `${errors} para tentar de novo` : null,
  ].filter(Boolean).join(' · ');
}
