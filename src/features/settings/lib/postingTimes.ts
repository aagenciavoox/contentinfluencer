import type { PostingTimeEntry } from '../../../lib/database';

// Dias da semana usados como chaves (0 = domingo ... 6 = sabado)
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// Ate 3 horarios por dia no formato "HH:MM"
export type DayTimes = [string?, string?, string?];

export type PostingTimesSettings = Record<Weekday, DayTimes>;

/** @deprecated Usado so para migracao do blob antigo em user_preferences */
export const POSTING_TIMES_PREFERENCE_KEY = 'posting_times';

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
};

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sab',
};

export const DEFAULT_POSTING_TIMES: PostingTimesSettings = {
  0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
};

export const WEEKDAYS_ORDERED: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

// --- Nova API: baseada em PostingTimeEntry (tabela real) ---

/**
 * Dado o array de entries do banco, retorna o PostingTimesSettings
 * para uma plataforma especifica, fazendo fallback para entradas globais
 * (platformId === null) quando nao ha configuracao especifica para o dia.
 */
export function getPostingTimesForPlatform(
  entries: PostingTimeEntry[],
  platformId: string | null,
): PostingTimesSettings {
  const result = { ...DEFAULT_POSTING_TIMES } as Record<Weekday, string[]>;

  const globalEntries = entries.filter(function(e) { return e.platformId === null; });
  const specificEntries = platformId
    ? entries.filter(function(e) { return e.platformId === platformId; })
    : [];

  const weekdays: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
  for (let i = 0; i < weekdays.length; i++) {
    const wd = weekdays[i];
    const platTimes = specificEntries
      .filter(function(e) { return e.weekday === wd; })
      .map(function(e) { return e.time; })
      .sort();
    if (platTimes.length > 0) {
      result[wd] = platTimes;
    } else {
      result[wd] = globalEntries
        .filter(function(e) { return e.weekday === wd; })
        .map(function(e) { return e.time; })
        .sort();
    }
  }

  return result as PostingTimesSettings;
}

/** Retorna todos os horarios configurados para um dia da semana (0-6) em ordem. */
export function getTimesForDay(
  settings: PostingTimesSettings,
  weekday: Weekday,
): string[] {
  return (settings[weekday] ?? []).filter(Boolean) as string[];
}

/** Retorna horarios do dia a partir de entries + platformId diretamente. */
export function getTimesForDayFromEntries(
  entries: PostingTimeEntry[],
  platformId: string | null,
  weekday: Weekday,
): string[] {
  return getTimesForDay(getPostingTimesForPlatform(entries, platformId), weekday);
}

// --- Legacy API: baseada em user_preferences (blob JSON) ---
// Mantida para compatibilidade com codigo que ainda nao foi migrado.

/** @deprecated Use getPostingTimesForPlatform com postingTimeEntries do AppContext */
export function getPostingTimes(
  preferences: Record<string, unknown> | null | undefined,
): PostingTimesSettings {
  const raw = preferences?.[POSTING_TIMES_PREFERENCE_KEY];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return DEFAULT_POSTING_TIMES;
  }

  const saved = raw as Record<string, unknown>;
  const result = { ...DEFAULT_POSTING_TIMES };

  const keys: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const dayRaw = saved[key];
    if (Array.isArray(dayRaw)) {
      result[key] = dayRaw
        .filter(function(t): t is string { return typeof t === 'string' && /^\d{2}:\d{2}$/.test(t); })
        .slice(0, 3) as DayTimes;
    }
  }

  return result;
}
