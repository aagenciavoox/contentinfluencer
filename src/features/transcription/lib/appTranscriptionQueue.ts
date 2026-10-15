import { useSyncExternalStore } from 'react';
import { transcribeAudio } from './transcribeAudio';
import { createTranscriptionQueue, hasPendingWork } from './transcriptionQueue';

/** Fila única do app. Sobrevive à troca de tela; recarregar a página limpa tudo. */
export const transcriptionQueue = createTranscriptionQueue({
  // Carregado só quando o primeiro vídeo entra: a biblioteca de mídia não pesa nas outras telas.
  extract: async (file, options) => (await import('./extractAudio')).extractAudio(file, options),
  transcribe: transcribeAudio,
});

export function useTranscriptionQueue() {
  return useSyncExternalStore(transcriptionQueue.subscribe, transcriptionQueue.getState);
}

// Fechar ou recarregar a aba com vídeos na fila perderia o andamento: o navegador pergunta antes.
if (typeof window !== 'undefined') {
  let guarding = false;
  const askBeforeLeaving = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    event.returnValue = '';
  };
  transcriptionQueue.subscribe(() => {
    const pending = hasPendingWork(transcriptionQueue.getState());
    if (pending === guarding) return;
    guarding = pending;
    if (pending) window.addEventListener('beforeunload', askBeforeLeaving);
    else window.removeEventListener('beforeunload', askBeforeLeaving);
  });
}
