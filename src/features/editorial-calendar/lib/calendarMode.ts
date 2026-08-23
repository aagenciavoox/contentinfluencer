export const CALENDAR_PATH = '/calendario';
export const CALENDAR_MODE_QUERY = 'modo';

export const CALENDAR_MODES = ['ver', 'agendar'] as const;
export type CalendarMode = (typeof CALENDAR_MODES)[number];

export const CALENDAR_MODE_OPTIONS: Array<{id: CalendarMode; label: string}> = [
  {id: 'ver', label: 'Ver'},
  {id: 'agendar', label: 'Agendar'},
];

export function parseCalendarMode(value: string | null | undefined): CalendarMode {
  return value === 'agendar' ? 'agendar' : 'ver';
}

export function buildCalendarPath(mode: CalendarMode = 'ver'): string {
  if (mode === 'agendar') {
    return `${CALENDAR_PATH}?${CALENDAR_MODE_QUERY}=agendar`;
  }
  return CALENDAR_PATH;
}
