export type PostingWindowId = 'manha' | 'tarde' | 'noite';

export type PostingWindow = {
  id: PostingWindowId;
  label: string;
  color: string;
  defaultTime: string;
};

export const POSTING_WINDOWS: PostingWindow[] = [
  {id: 'manha', label: 'Manhã', color: 'var(--accent-blue)', defaultTime: '09:00'},
  {id: 'tarde', label: 'Tarde', color: 'var(--accent-orange)', defaultTime: '14:00'},
  {id: 'noite', label: 'Noite', color: 'var(--accent-purple)', defaultTime: '20:00'},
];

export function getPostingWindowFromTime(publishTime: string | null | undefined): PostingWindow | null {
  if (!publishTime?.trim()) return null;

  const [hoursPart] = publishTime.split(':');
  const hours = Number(hoursPart);
  if (Number.isNaN(hours)) return null;

  if (hours >= 5 && hours < 12) return POSTING_WINDOWS[0];
  if (hours >= 12 && hours < 18) return POSTING_WINDOWS[1];
  return POSTING_WINDOWS[2];
}

export function getPostingWindowById(id: PostingWindowId | ''): PostingWindow | null {
  return POSTING_WINDOWS.find(window => window.id === id) ?? null;
}
