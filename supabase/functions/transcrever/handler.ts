// Recebe o áudio já separado do vídeo no navegador, repassa para o Whisper do Groq
// e devolve o texto. Nada é gravado: nem Storage, nem tabela, nem log com o conteúdo.
// Sem imports de Deno aqui, para o teste rodar no Node (`npm test`).

export const GROQ_TRANSCRIPTION_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
export const DEFAULT_TRANSCRIPTION_MODEL = 'whisper-large-v3-turbo';
/** Limite de arquivo do plano gratuito do Groq. */
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

const SUPPORTED_LANGUAGES = new Set(['pt', 'en', 'es']);

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export type TranscriptionSegment = {
  start: number;
  end: number;
  text: string;
};

export type TranscriptionResult = {
  text: string;
  language: string | null;
  duration: number | null;
  segments: TranscriptionSegment[];
};

export type HandlerEnv = (name: string) => string | undefined;

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function errorResponse(status: number, message: string, extraHeaders: Record<string, string> = {}) {
  return json({ error: message }, status, extraHeaders);
}

async function isSignedIn(authorization: string | null, env: HandlerEnv, fetchImpl: typeof fetch) {
  const supabaseUrl = env('SUPABASE_URL');
  const anonKey = env('SUPABASE_ANON_KEY');
  if (!authorization?.startsWith('Bearer ') || !supabaseUrl || !anonKey) return false;

  const response = await fetchImpl(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey: anonKey },
  });
  return response.ok;
}

function toSegments(raw: unknown): TranscriptionSegment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(segment => ({
      start: Number(segment?.start),
      end: Number(segment?.end),
      text: typeof segment?.text === 'string' ? segment.text.trim() : '',
    }))
    .filter(segment => Number.isFinite(segment.start) && Number.isFinite(segment.end) && segment.text);
}

export async function handleTranscriptionRequest(
  req: Request,
  env: HandlerEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse(405, 'Use POST para enviar o áudio.');

  if (!(await isSignedIn(req.headers.get('Authorization'), env, fetchImpl))) {
    return errorResponse(401, 'Entre na sua conta para transcrever.');
  }

  const apiKey = env('GROQ_API_KEY');
  if (!apiKey) {
    return errorResponse(503, 'A transcrição ainda não foi configurada no servidor (falta a GROQ_API_KEY).');
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return errorResponse(400, 'Não deu para ler o áudio enviado.');
  }

  const audio = form.get('file');
  if (!(audio instanceof Blob) || audio.size === 0) {
    return errorResponse(400, 'Nenhum áudio chegou junto com o pedido.');
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return errorResponse(413, 'O áudio passou de 25 MB, o limite do plano gratuito.');
  }

  const language = String(form.get('language') ?? '');
  const fileName = audio instanceof File && audio.name ? audio.name : 'audio.ogg';

  const groqForm = new FormData();
  groqForm.append('file', audio, fileName);
  groqForm.append('model', env('GROQ_TRANSCRIPTION_MODEL') || DEFAULT_TRANSCRIPTION_MODEL);
  groqForm.append('response_format', 'verbose_json');
  groqForm.append('temperature', '0');
  if (SUPPORTED_LANGUAGES.has(language)) groqForm.append('language', language);

  let groqResponse: Response;
  try {
    groqResponse = await fetchImpl(GROQ_TRANSCRIPTION_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: groqForm,
    });
  } catch {
    return errorResponse(502, 'O serviço de transcrição não respondeu. Dá para tentar de novo em instantes.');
  }

  if (groqResponse.status === 429) {
    const retryAfter = groqResponse.headers.get('retry-after');
    return errorResponse(
      429,
      'O limite gratuito de transcrição chegou ao teto por agora. Dá para tentar de novo daqui a pouco.',
      retryAfter ? { 'Retry-After': retryAfter } : {},
    );
  }
  if (groqResponse.status === 401 || groqResponse.status === 403) {
    return errorResponse(503, 'A chave do Groq configurada no servidor não foi aceita.');
  }
  if (!groqResponse.ok) {
    return errorResponse(502, 'O serviço de transcrição não conseguiu ler este áudio.');
  }

  const data = await groqResponse.json();
  const result: TranscriptionResult = {
    text: typeof data?.text === 'string' ? data.text.trim() : '',
    language: typeof data?.language === 'string' ? data.language : null,
    duration: Number.isFinite(Number(data?.duration)) ? Number(data.duration) : null,
    segments: toSegments(data?.segments),
  };
  return json(result);
}
