import type {CalendarEntry} from '../../features/editorial-calendar/components/MonthlyCalendarView';

/** Editorial calendar entry type → CSS color token for pills. */
export const EDITORIAL_PILL_COLORS: Record<CalendarEntry['type'], string> = {
  recording: 'var(--accent-orange)',
  publish: 'var(--accent-purple)',
  project: 'var(--accent-blue)',
  agenda: 'var(--accent-green)',
};

export function editorialPillStyle(color?: string | null, type?: CalendarEntry['type']) {
  const base = color || (type ? EDITORIAL_PILL_COLORS[type] : 'var(--accent-blue)');
  return {
    backgroundColor: `color-mix(in srgb, ${base} 22%, transparent)`,
    color: base,
  } as const;
}

/** Publicação que já foi ao ar usa a cor de Postado. */
export function calendarEntryPillStyle(entry: Pick<CalendarEntry, 'type' | 'color' | 'posted'>) {
  if (entry.posted) return editorialPillStyle('var(--status-posted)', entry.type);
  const useCustomColor = entry.color && (entry.type === 'project' || entry.type === 'agenda');
  return editorialPillStyle(useCustomColor ? entry.color : null, entry.type);
}
