export type TranscriptLanguage = 'pt' | 'en' | 'es' | 'auto';

export type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
};

export type Transcript = {
  text: string;
  language: string | null;
  duration: number | null;
  segments: TranscriptSegment[];
};

function pad(value: number, size = 2) {
  return String(value).padStart(size, '0');
}

/** `00:01:02,345` — formato de tempo do SubRip. */
export function formatSrtTime(seconds: number) {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const secs = Math.floor((totalMs % 60_000) / 1000);
  const ms = totalMs % 1000;
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(ms, 3)}`;
}

/** `1:02` ou `1:01:02`, para mostrar na tela. */
export function formatClock(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
}

export function buildSrt(segments: readonly TranscriptSegment[]) {
  return segments
    .filter(segment => segment.text.trim())
    .map((segment, index) => {
      const end = Math.max(segment.end, segment.start);
      return `${index + 1}\n${formatSrtTime(segment.start)} --> ${formatSrtTime(end)}\n${segment.text.trim()}\n`;
    })
    .join('\n');
}

/**
 * Legenda para o editor: cada linha cabe na tela e cada bloco tem no máximo
 * duas, com a quebra escrita no arquivo.
 */
export const CAPTION_MAX_CHARS = 37;
export const CAPTION_MAX_WORDS = 6;
const CAPTION_LINES_PER_CUE = 2;

const SENTENCE_END = /[.!?…]["'”»)]*$/;
const CLAUSE_END = /[,;:—–]$/;

const LINE_END_STOPWORDS = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos',
  'e', 'ou', 'que', 'se', 'por', 'pra', 'pro', 'para', 'com', 'sem', 'mas', 'ao', 'à', 'num', 'numa',
]);

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

function measure(words: readonly string[]) {
  return words.join(' ').length;
}

function isWeakLineEnd(word: string) {
  const normalized = word.toLocaleLowerCase('pt-BR').replace(/[^\p{L}']/gu, '');
  return LINE_END_STOPWORDS.has(normalized);
}

function fits(line: readonly string[], word: string) {
  const next = [...line, word];
  return next.length <= CAPTION_MAX_WORDS && measure(next) <= CAPTION_MAX_CHARS;
}

/** Tira do fim da linha uma palavra que pede a seguinte, quando ainda há texto. */
function withoutWeakEnding(words: string[]) {
  const line = [...words];
  const carry: string[] = [];
  while (line.length > 1 && isWeakLineEnd(line[line.length - 1])) carry.unshift(line.pop()!);
  return { line, carry };
}

/** Uma frase longa vira linhas curtas, quebrando em pontuação e fora de "de", "que", "o". */
function captionLines(text: string) {
  const pending = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[][] = [];

  while (pending.length > 0) {
    const current: string[] = [];
    while (pending.length > 0 && fits(current, pending[0])) {
      current.push(pending.shift()!);
      const last = current[current.length - 1];
      const clauseReady = CLAUSE_END.test(last) && current.length >= 3;
      if ((clauseReady || SENTENCE_END.test(last)) && pending.length > 0) break;
    }

    if (current.length === 0) {
      lines.push([pending.shift()!]);
      continue;
    }

    const { line, carry } = withoutWeakEnding(current);
    if (carry.length > 0 && pending.length > 0) pending.unshift(...carry);
    lines.push(carry.length > 0 && pending.length === 0 ? [...line, ...carry] : line);
  }

  return lines.map(line => line.join(' ')).filter(Boolean);
}

/** Até duas linhas por bloco. A quebra fica no texto, que é o que o editor lê. */
function captionCues(text: string) {
  const lines = captionLines(text);
  const cues: string[] = [];
  for (let index = 0; index < lines.length; index += CAPTION_LINES_PER_CUE) {
    cues.push(lines.slice(index, index + CAPTION_LINES_PER_CUE).join('\n'));
  }
  return cues;
}

/**
 * Reparte cada trecho do Whisper em blocos de legenda e divide o tempo do trecho
 * na proporção das palavras de cada bloco.
 */
export function buildTimedSegments(segments: readonly TranscriptSegment[]) {
  return segments.flatMap(segment => {
    const cues = captionCues(segment.text);
    if (cues.length === 0) return [];

    const start = segment.start;
    const end = Math.max(segment.end, segment.start);
    if (cues.length === 1) return [{ start, end, text: cues[0] }];

    const weights = cues.map(countWords);
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    if (total === 0) return [{ start, end, text: cues.join('\n') }];

    const duration = end - start;
    let consumed = 0;
    return cues.map((cue, index) => {
      const cueStart = start + (duration * consumed) / total;
      consumed += weights[index];
      const cueEnd = index === cues.length - 1 ? end : start + (duration * consumed) / total;
      return { start: cueStart, end: Math.max(cueStart, cueEnd), text: cue };
    });
  });
}

/** Uma linha da transcrição. `start` é nulo quando o áudio veio sem tempos. */
export type TranscriptLine = { text: string; start: number | null };

/** Silêncio entre dois trechos que já fecha o parágrafo. */
const PARAGRAPH_PAUSE_SECONDS = 1.2;
/** A partir de quantas linhas um fim de frase fecha o parágrafo. */
const LINES_BEFORE_SENTENCE_BREAK = 3;
const MAX_PARAGRAPH_LINES = 6;
const SENTENCES_PER_TEXT_PARAGRAPH = 3;

function chunk<T>(items: readonly T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

function paragraphsFromText(text: string): TranscriptLine[][] {
  const blocks = text
    .split(/\n\s*\n/)
    .map(block => block.split('\n').map(line => line.trim()).filter(Boolean))
    .filter(block => block.length > 0);
  // Texto corrido numa linha só: poucas frases por parágrafo.
  const lines = blocks.length === 1 && blocks[0].length === 1
    ? chunk(blocks[0][0].split(/(?<=[.!?…])\s+/).filter(Boolean), SENTENCES_PER_TEXT_PARAGRAPH)
    : blocks;
  return lines.map(block => block.map(line => ({ text: line, start: null })));
}

/**
 * Agrupa os trechos em parágrafos: fecha o parágrafo numa pausa longa,
 * num fim de frase depois de algumas linhas, ou quando ele fica comprido demais.
 */
export function buildParagraphs(transcript: Pick<Transcript, 'text' | 'segments'>): TranscriptLine[][] {
  const segments = transcript.segments
    .map(segment => ({ ...segment, text: segment.text.trim() }))
    .filter(segment => segment.text);
  if (segments.length === 0) return paragraphsFromText(transcript.text);

  const paragraphs: TranscriptLine[][] = [];
  let current: TranscriptLine[] = [];
  segments.forEach((segment, index) => {
    const previous = segments[index - 1];
    if (previous && current.length > 0) {
      const paused = segment.start - previous.end >= PARAGRAPH_PAUSE_SECONDS;
      const sentenceDone = current.length >= LINES_BEFORE_SENTENCE_BREAK && SENTENCE_END.test(previous.text);
      if (paused || sentenceDone || current.length >= MAX_PARAGRAPH_LINES) {
        paragraphs.push(current);
        current = [];
      }
    }
    current.push({ text: segment.text, start: segment.start });
  });
  if (current.length > 0) paragraphs.push(current);
  return paragraphs;
}

/** Texto como aparece na tela: trechos seguidos no parágrafo e uma linha em branco entre parágrafos. */
export function buildPlainText(transcript: Pick<Transcript, 'text' | 'segments'>) {
  return buildParagraphs(transcript)
    .map(paragraph => paragraph.map(line => line.text).join(' '))
    .join('\n\n');
}

/** `meu vídeo.mp4` → `meu vídeo.txt`. */
export function transcriptFileName(sourceName: string, extension: 'txt' | 'srt') {
  const base = sourceName.replace(/\.[^./\\]+$/, '').trim() || 'transcricao';
  return `${base}.${extension}`;
}

export type NamedTranscript = { fileName: string; transcript: Pick<Transcript, 'text' | 'segments'> };

/** Várias transcrições num .txt só, cada uma abaixo do nome do vídeo. */
export function buildCombinedText(items: readonly NamedTranscript[]) {
  return items
    .map(item => `${item.fileName}\n\n${buildPlainText(item.transcript)}`)
    .join('\n\n\n');
}
