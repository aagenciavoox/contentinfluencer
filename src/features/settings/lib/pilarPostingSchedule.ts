import type { Pilar, PilarPlataforma, Platform, PostingTimeEntry } from '../../../lib/database';
import {
  getTimesForDayFromEntries,
  WEEKDAY_SHORT,
  type Weekday,
} from './postingTimes.ts';

export type PilarPlatformSchedule = Pick<
  PilarPlataforma,
  'melhoresDias' | 'janelaHorarioInicio' | 'janelaHorarioFim'
>;

export function createEmptyPilarPlataforma(pilarId: string, platformId: string): PilarPlataforma {
  return {
    pilarId,
    platformId,
    hashtags: '',
    melhoresDias: [],
    janelaHorarioInicio: null,
    janelaHorarioFim: null,
  };
}

export function hasPilarPlatformSchedule(config: PilarPlatformSchedule): boolean {
  return (
    config.melhoresDias.length > 0 ||
    Boolean(config.janelaHorarioInicio) ||
    Boolean(config.janelaHorarioFim)
  );
}

export function shouldPersistPilarPlataforma(config: PilarPlataforma): boolean {
  return Boolean(config.hashtags.trim()) || hasPilarPlatformSchedule(config);
}

export function resolvePlatformUuid(platforms: Platform[], platformRef: string): string | null {
  const match = platforms.find(
    platform => platform.id === platformRef || platform.nome === platformRef,
  );
  return match?.id ?? null;
}

function timeToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10);
}

export function isTimeWithinWindow(
  time: string,
  start: string | null,
  end: string | null,
): boolean {
  if (!start && !end) return true;
  const minutes = timeToMinutes(time);
  const startMinutes = start ? timeToMinutes(start) : null;
  const endMinutes = end ? timeToMinutes(end) : null;
  if (minutes == null) return false;
  if (startMinutes != null && minutes < startMinutes) return false;
  if (endMinutes != null && minutes > endMinutes) return false;
  return true;
}

export function isWeekdayAllowed(weekday: Weekday, melhoresDias: Weekday[]): boolean {
  if (melhoresDias.length === 0) return true;
  return melhoresDias.includes(weekday);
}

export function getCrossedPostingTimesForPilarPlatform(
  schedule: PilarPlatformSchedule,
  postingTimeEntries: PostingTimeEntry[],
  platformUuid: string | null,
  weekday: Weekday,
): string[] {
  if (!isWeekdayAllowed(weekday, schedule.melhoresDias)) return [];

  return getTimesForDayFromEntries(postingTimeEntries, platformUuid, weekday).filter(time =>
    isTimeWithinWindow(time, schedule.janelaHorarioInicio, schedule.janelaHorarioFim),
  );
}

export function getCrossedPostingTimesForPilar(
  pilar: Pick<Pilar, 'plataformas'>,
  postingTimeEntries: PostingTimeEntry[],
  platforms: Platform[],
  weekday: Weekday,
): string[] {
  const merged = new Set<string>();

  for (const plataforma of pilar.plataformas) {
    if (!hasPilarPlatformSchedule(plataforma)) continue;
    const platformUuid = resolvePlatformUuid(platforms, plataforma.platformId);
    getCrossedPostingTimesForPilarPlatform(
      plataforma,
      postingTimeEntries,
      platformUuid,
      weekday,
    ).forEach(time => merged.add(time));
  }

  if (merged.size > 0) {
    return [...merged].sort();
  }

  return getTimesForDayFromEntries(postingTimeEntries, null, weekday);
}

export function formatCrossedPostingPreview(
  times: string[],
  weekday: Weekday,
): string {
  if (times.length === 0) {
    return `Nenhum horário de ${WEEKDAY_SHORT[weekday]} cruza com esta janela.`;
  }
  return `${WEEKDAY_SHORT[weekday]}: ${times.join(', ')}`;
}
