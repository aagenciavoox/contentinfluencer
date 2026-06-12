// Dias da semana usados como chaves (0 = domingo ... 6 = sábado)
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// Até 3 horários por dia no formato "HH:MM"
export type DayTimes = [string?, string?, string?];

export type PostingTimesSettings = Record<Weekday, DayTimes>;

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
  6: 'Sáb',
};

export const DEFAULT_POSTING_TIMES: PostingTimesSettings = {
  0: [],
  1: [],
  2: [],
  3: [],
  4: [],
  5: [],
  6: [],
};

export function getPostingTimes(
  preferences: Record<string, unknown> | null | undefined,
): PostingTimesSettings {
  const raw = preferences?.[POSTING_TIMES_PREFERENCE_KEY];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return DEFAULT_POSTING_TIMES;
  }

  const saved = raw as Record<string, unknown>;
  const result = {...DEFAULT_POSTING_TIMES};

  for (const key of Object.keys(result) as unknown as Weekday[]) {
    const dayRaw = saved[key];
    if (Array.isArray(dayRaw)) {
      result[key] = dayRaw
        .filter((t): t is string => typeof t === 'string' && /^\d{2}:\d{2}$/.test(t))
        .slice(0, 3) as DayTimes;
    }
  }

  return result;
}

/** Retorna todos os horários configurados para um dia da semana (0–6) em ordem. */
export function getTimesForDay(
  settings: PostingTimesSettings,
  weekday: Weekday,
): string[] {
  return (settings[weekday] ?? []).filter(Boolean) as string[];
}
