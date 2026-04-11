import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { Partnership } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper: gera array de datas entre startDate e deadline (inclusive)
export function getEventDates(p: Partnership): string[] {
  if (!p.deadline) return [];
  const start = p.startDate ? parseISO(p.startDate) : parseISO(p.deadline);
  const end = parseISO(p.deadline);
  if (start > end) return [p.deadline];
  return eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'));
}
