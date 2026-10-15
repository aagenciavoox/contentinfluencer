import { formatClock, type Transcript } from './transcriptFormats';

const LANGUAGE_NAMES: Record<string, string> = {
  pt: 'português',
  portuguese: 'português',
  en: 'inglês',
  english: 'inglês',
  es: 'espanhol',
  spanish: 'espanhol',
};

/** `1:02 de áudio · português` */
export function transcriptMeta(transcript: Pick<Transcript, 'duration' | 'language'>) {
  const parts: string[] = [];
  if (transcript.duration) parts.push(`${formatClock(transcript.duration)} de áudio`);
  const language = transcript.language ? LANGUAGE_NAMES[transcript.language.toLowerCase()] : null;
  if (language) parts.push(language);
  return parts.join(' · ');
}
