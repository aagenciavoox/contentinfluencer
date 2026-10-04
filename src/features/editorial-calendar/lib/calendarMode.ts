export const CALENDAR_PATH = '/calendario';
export const CALENDAR_VIEW_QUERY = 'vista';

export const CALENDAR_VIEW_MODES = ['month', 'week', 'agenda', 'timeline'] as const;
export type CalendarViewMode = (typeof CALENDAR_VIEW_MODES)[number];

export function parseCalendarViewMode(value: string | null | undefined): CalendarViewMode {
  if (value === 'week' || value === 'agenda' || value === 'timeline' || value === 'month') {
    return value;
  }
  return 'month';
}

export function buildCalendarPath(view?: CalendarViewMode | null): string {
  const params = new URLSearchParams();
  if (view && view !== 'month') {
    params.set(CALENDAR_VIEW_QUERY, view);
  }
  const query = params.toString();
  return query ? `${CALENDAR_PATH}?${query}` : CALENDAR_PATH;
}
