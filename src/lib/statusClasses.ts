import { CONTENT_STATUS, DISPLAY_STATUS } from '../features/contents/lib/contentPipeline';

/** Maps content pipeline status labels to CSS token names. */
export const STATUS_TOKEN: Record<string, string> = {
  [CONTENT_STATUS.IDEIA]: 'idea',
  [CONTENT_STATUS.ROTEIRO]: 'writing',
  [CONTENT_STATUS.PRODUCAO]: 'production',
  [DISPLAY_STATUS.PROGRAMADO]: 'scheduled',
  [CONTENT_STATUS.POSTADO]: 'posted',
};

export function getStatusToken(status: string): string {
  return STATUS_TOKEN[status] ?? 'archived';
}

export function getStatusColorVar(status: string): string {
  return `var(--status-${getStatusToken(status)})`;
}

/** Colored status pill class (border + tinted background). */
export function getStatusClassName(status: string): string {
  return `status-pill status-pill-${getStatusToken(status)}`;
}

/** Tailwind-style chip classes for compact status badges. */
export function getStatusChipClass(status: string): string {
  const token = getStatusToken(status);
  if (token === 'archived') {
    return 'bg-[var(--bg-hover)] text-[var(--text-secondary)]';
  }
  return `bg-[var(--status-${token})]/10 text-[var(--status-${token})]`;
}

/** Calendar/list item tint classes when inline hex is unavailable. */
export function getStatusCalendarClass(status: string): string {
  return `status-calendar-${getStatusToken(status)}`;
}
