export const CALENDAR_PATH = '/calendario';
export const CALENDAR_MODE_QUERY = 'modo';
export const CALENDAR_VIEW_QUERY = 'vista';

export const CALENDAR_MODES = ['ver', 'agendar'] as const;
export type CalendarMode = (typeof CALENDAR_MODES)[number];

export const CALENDAR_VIEW_MODES = ['month', 'week', 'agenda', 'timeline'] as const;
export type CalendarViewMode = (typeof CALENDAR_VIEW_MODES)[number];

export const CALENDAR_MODE_OPTIONS: Array<{id: CalendarMode; label: string}> = [
  {id: 'ver', label: 'Ver'},
  {id: 'agendar', label: 'Agendar'},
];

export function parseCalendarMode(value: string | null | undefined): CalendarMode {
  return value === 'agendar' ? 'agendar' : 'ver';
}

export function parseCalendarViewMode(value: string | null | undefined): CalendarViewMode {
  if (value === 'week' || value === 'agenda' || value === 'timeline' || value === 'month') {
    return value;
  }
  return 'month';
}

export function buildCalendarPath(
  mode: CalendarMode = 'ver',
  view?: CalendarViewMode | null,
): string {
  const params = new URLSearchParams();
  if (mode === 'agendar') {
    params.set(CALENDAR_MODE_QUERY, 'agendar');
  }
  if (view && view !== 'month' && mode === 'ver') {
    params.set(CALENDAR_VIEW_QUERY, view);
  }
  const query = params.toString();
  return query ? `${CALENDAR_PATH}?${query}` : CALENDAR_PATH;
}
