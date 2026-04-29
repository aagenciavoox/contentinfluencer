import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { Projeto } from '../lib/database';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper: gera array de datas entre dataInicio e dataFim (inclusive)
export function getEventDates(p: Projeto): string[] {
  if (!p.dataFim) return [];
  const start = p.dataInicio ? parseISO(p.dataInicio) : parseISO(p.dataFim);
  const end = parseISO(p.dataFim);
  if (start > end) return [p.dataFim];
  return eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'));
}
