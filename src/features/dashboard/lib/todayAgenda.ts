import type { AgendaItem } from '../../../lib/database.ts';
import { eventoCobreDia } from '../../projects/lib/agendaEventos.ts';

/** Filtra o dia antes de limitar; eventos longos também pertencem à agenda de hoje. */
export function getTodayAgenda(items: readonly AgendaItem[], day: string): AgendaItem[] {
  return items.filter(item => eventoCobreDia(item, day))
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99') || a.title.localeCompare(b.title));
}
