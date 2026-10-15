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

/** Texto corrido, um trecho por linha, para copiar ou baixar em .txt. */
export function buildPlainText(transcript: Pick<Transcript, 'text' | 'segments'>) {
  if (transcript.segments.length > 0) {
    return transcript.segments.map(segment => segment.text.trim()).filter(Boolean).join('\n');
  }
  return transcript.text.trim();
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
