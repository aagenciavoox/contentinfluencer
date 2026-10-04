/**
 * Spoken pace for a roteiro. 120 palavras por minuto matches the teleprompter
 * default, so the footer estimates how long the text takes to say.
 * A silent read at 2.5 words per second is a different measure and is not used here.
 */
export const SPOKEN_WORDS_PER_MINUTE = 120;

export function countScriptWords(value: string) {
  const text = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return 0;
  return text.split(' ').length;
}

export function spokenDurationSeconds(wordCount: number) {
  if (wordCount <= 0) return 0;
  return Math.max(1, Math.round((wordCount * 60) / SPOKEN_WORDS_PER_MINUTE));
}

export function formatSpokenDuration(wordCount: number) {
  const totalSeconds = spokenDurationSeconds(wordCount);
  if (totalSeconds === 0) return '0 segundos de fala';

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];

  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`);
  }
  if (seconds > 0) {
    parts.push(`${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`);
  }

  return `${parts.join(' e ')} de fala`;
}
