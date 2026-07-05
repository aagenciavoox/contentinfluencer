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
import {getCrossedPostingTimesForPilar} from '../lib/pilarPostingSchedule';

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
    times = getCrossedPostingTimesForPilar(pilar, postingTimeEntries, platforms, weekday);
    if (platformId) {
      const platformTimes = getPostingTimesForPlatform(postingTimeEntries, platformId);
      const allowed = new Set(getTimesForDay(platformTimes, weekday));
      times = times.filter(time => allowed.has(time));
    }
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
      <Clock className="h-3 w-3 shrink-0 text-[var(--text-tertiary)] opacity-40" />
      {times.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onSelect(t)}
          className={cn(
            'rounded-lg border px-2.5 py-1 text-xs font-semibold tracking-wide transition-all',
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
