import {Check, Clock} from 'lucide-react';
import {PlatformIcon} from '../../../components/ui/PlatformIcon';
import type {CalendarEntry} from './MonthlyCalendarView';

/** Ícones do item: ✓ para postado, relógio para programado e as redes. */
export function calendarEntryIcon(entry: Pick<CalendarEntry, 'platformNames' | 'posted' | 'scheduled'>) {
  if (!entry.platformNames?.length && !entry.posted && !entry.scheduled) return undefined;
  return <CalendarNetworkIcons names={entry.platformNames} posted={entry.posted} scheduled={entry.scheduled} />;
}

export function CalendarNetworkIcons({
  names = [],
  posted = false,
  scheduled = false,
}: {
  names?: string[];
  posted?: boolean;
  scheduled?: boolean;
}) {
  if (names.length === 0 && !posted && !scheduled) return null;
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {posted ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
      {scheduled ? <Clock className="h-3 w-3" strokeWidth={2.5} /> : null}
      {names.map(name => (
        <PlatformIcon key={name} platform={name} className="h-3 w-3" />
      ))}
    </span>
  );
}