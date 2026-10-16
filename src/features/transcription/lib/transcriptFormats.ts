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

/** Uma linha da transcrição. `start` é nulo quando o áudio veio sem tempos. */
export type TranscriptLine = { text: string; start: number | null };

const SENTENCE_END = /[.!?…]["'”»)]*$/;
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
  // Texto corrido numa linha só: uma frase por linha, poucas frases por parágrafo.
  const lines = blocks.length === 1 && blocks[0].length === 1
    ? chunk(blocks[0][0].split(/(?<=[.!?…])\s+/).filter(Boolean), SENTENCES_PER_TEXT_PARAGRAPH)
    : blocks;
  return lines.map(block => block.map(line => ({ text: line, start: null })));
}

/**
 * Um trecho por linha, agrupados em parágrafos: fecha o parágrafo numa pausa longa,
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

/** Texto como aparece na tela: um trecho por linha e uma linha em branco entre parágrafos. */
export function buildPlainText(transcript: Pick<Transcript, 'text' | 'segments'>) {
  return buildParagraphs(transcript)
    .map(paragraph => paragraph.map(line => line.text).join('\n'))
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
