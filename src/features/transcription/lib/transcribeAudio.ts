import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';
import { TranscriptionUserError } from './transcriptionErrors';
import type { Transcript, TranscriptLanguage } from './transcriptFormats';

export type { TranscriptLanguage };

export class TranscriptionRequestError extends TranscriptionUserError {}

const FALLBACK_MESSAGE = 'A transcrição não voltou desta vez. Dá para tentar de novo em instantes.';

async function toRequestError(error: unknown) {
  if (!(error instanceof FunctionsHttpError)) return new TranscriptionRequestError(FALLBACK_MESSAGE);

  const response = error.context as Response;
  const kind = response.status === 429 ? 'rate-limit' : 'other';
  try {
    const body = await response.json();
    if (typeof body?.error === 'string') return new TranscriptionRequestError(body.error, kind);
  } catch {
    // Resposta sem JSON: fica a mensagem padrão.
  }
  if (response.status === 404) {
    return new TranscriptionRequestError('A função de transcrição ainda não foi publicada no Supabase.');
  }
  return new TranscriptionRequestError(FALLBACK_MESSAGE, kind);
}

/** Manda só o áudio para a Edge Function `transcrever`, que não guarda nada. */
export async function transcribeAudio(
  audio: Blob,
  fileName: string,
  language: TranscriptLanguage,
  signal?: AbortSignal,
): Promise<Transcript> {
  if (!supabase) {
    throw new TranscriptionRequestError('O Supabase não está configurado neste ambiente.');
  }

  const body = new FormData();
  body.append('file', audio, fileName);
  body.append('language', language);

  const { data, error } = await supabase.functions.invoke<Transcript>('transcrever', { body, signal });
  if (error) {
    if (signal?.aborted) throw new DOMException('Transcrição cancelada', 'AbortError');
    throw await toRequestError(error);
  }
  if (!data) throw new TranscriptionRequestError(FALLBACK_MESSAGE);

  return {
    text: data.text ?? '',
    language: data.language ?? null,
    duration: data.duration ?? null,
    segments: Array.isArray(data.segments) ? data.segments : [],
  };
}
