import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';
import { TranscriptionUserError } from './transcriptionErrors';
import type { Transcript } from './transcriptFormats';

export type TranscriptLanguage = 'pt' | 'en' | 'es' | 'auto';

export class TranscriptionRequestError extends TranscriptionUserError {}

const FALLBACK_MESSAGE = 'A transcrição não voltou desta vez. Dá para tentar de novo em instantes.';

async function readFunctionError(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await (error.context as Response).json();
      if (typeof body?.error === 'string') return body.error;
    } catch {
      // Resposta sem JSON: fica a mensagem padrão.
    }
    const status = (error.context as Response).status;
    if (status === 404) {
      return 'A função de transcrição ainda não foi publicada no Supabase.';
    }
  }
  return FALLBACK_MESSAGE;
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
    throw new TranscriptionRequestError(await readFunctionError(error));
  }
  if (!data) throw new TranscriptionRequestError(FALLBACK_MESSAGE);

  return {
    text: data.text ?? '',
    language: data.language ?? null,
    duration: data.duration ?? null,
    segments: Array.isArray(data.segments) ? data.segments : [],
  };
}
