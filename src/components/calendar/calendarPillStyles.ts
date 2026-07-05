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
