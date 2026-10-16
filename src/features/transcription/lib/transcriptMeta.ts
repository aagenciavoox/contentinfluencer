import { formatClock, type Transcript } from './transcriptFormats';

const LANGUAGE_NAMES: Record<string, string> = {
  pt: 'Português',
  portuguese: 'Português',
  en: 'Inglês',
  english: 'Inglês',
  es: 'Espanhol',
  spanish: 'Espanhol',
};

/** `1:02 de áudio · Português` */
export function transcriptMeta(transcript: Pick<Transcript, 'duration' | 'language'>) {
  const parts: string[] = [];
  if (transcript.duration) parts.push(`${formatClock(transcript.duration)} de áudio`);
  const language = transcript.language ? LANGUAGE_NAMES[transcript.language.toLowerCase()] : null;
  if (language) parts.push(language);
  return parts.join(' · ');
}
