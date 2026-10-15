import {Check, Clock} from 'lucide-react';
import {PlatformIcon} from '../../../components/ui/PlatformIcon';
import {editorialPillStyle} from '../../../components/calendar/calendarPillStyles';
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
    <span className="inline-flex items-center gap-1" aria-hidden>
      {posted ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : null}
      {scheduled ? <Clock className="h-3.5 w-3.5" strokeWidth={2.25} /> : null}
      {names.map(name => (
        <PlatformIcon key={name} platform={name} className="h-3.5 w-3.5" />
      ))}
    </span>
  );
}
/** Legenda da grade do mês: o que o ✓, o relógio e o círculo do dia querem dizer. */
export function CalendarLegend() {
  const swatch = 'inline-flex h-5 w-5 items-center justify-center rounded-full';
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 t-secondary text-[var(--text-secondary)]" aria-label="Legenda do calendário">
      <li className="inline-flex items-center gap-2">
        <span className={swatch} style={editorialPillStyle('var(--status-posted)')} aria-hidden>
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
        Publicado
      </li>
      <li className="inline-flex items-center gap-2">
        <span className={swatch} style={editorialPillStyle(null, 'publish')} aria-hidden>
          <Clock className="h-3 w-3" strokeWidth={2.5} />
        </span>
        Programado
      </li>
      <li className="inline-flex items-center gap-2">
        <span className="h-3.5 w-3.5 rounded-full bg-[var(--accent)]" aria-hidden />
        Hoje
      </li>
    </ul>
  );
}
