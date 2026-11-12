import {getDay, parseISO} from 'date-fns';
import {Clock} from 'lucide-react';
import {cn} from '../../../lib/utils';
import {
  getTimesForDay,
  getPostingTimesForPlatform,
  PostingTimesSettings,
  Weekday,
} from '../lib/postingTimes';
import type {Pilar, Platform, PostingTimeEntry} from '../../../lib/database';
import {horariosDaProgramacao} from '../lib/pilarPostingSchedule';

interface PostingTimeSuggestionsProps {
  date: string;
  selectedTime: string;
  onSelect: (time: string) => void;
  className?: string;
  postingTimeEntries?: PostingTimeEntry[];
  platformId?: string | null;
  pilar?: Pick<Pilar, 'plataformas'> | null;
  platforms?: Platform[];
  /** @deprecated Use postingTimeEntries + platformId */
  postingTimes?: PostingTimesSettings;
}

export function PostingTimeSuggestions({
  date,
  selectedTime,
  onSelect,
  className,
  postingTimeEntries,
  platformId = null,
  pilar = null,
  platforms = [],
  postingTimes,
}: PostingTimeSuggestionsProps) {
  if (!date) return null;

  let weekday: Weekday;
  try {
    weekday = getDay(parseISO(date)) as Weekday;
  } catch {
    return null;
  }

  let times: string[];
  if (postingTimeEntries && pilar) {
    // Pilar naquela conta primeiro; sem horário do pilar ali, os horários gerais da conta.
    times = horariosDaProgramacao({ pilar, postingTimeEntries, platforms, platformId, weekday }).horarios;
  } else if (postingTimeEntries) {
    const settings = getPostingTimesForPlatform(postingTimeEntries, platformId ?? null);
    times = getTimesForDay(settings, weekday);
  } else if (postingTimes) {
    times = getTimesForDay(postingTimes, weekday);
  } else {
    return null;
  }

  if (times.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <Clock className="h-3 w-3 shrink-0 text-[var(--text-tertiary)]" />
      {times.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onSelect(t)}
          className={cn(
            'rounded-[var(--radius-input)] border px-2.5 py-1 t-label tracking-wide transition-all',
            selectedTime === t
              ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
              : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]',
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
