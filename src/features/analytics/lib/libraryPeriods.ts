import type { BibliotecaItem } from '../../../lib/database';

export type LibraryPeriodGrouping = 'trimestre' | 'semestre' | 'ano';

export const LIBRARY_PERIOD_OPTIONS: Array<{ id: LibraryPeriodGrouping; label: string }> = [
  { id: 'trimestre', label: 'Trimestre' },
  { id: 'semestre', label: 'Semestre' },
  { id: 'ano', label: 'Ano' },
];

const COMPLETED_STATUSES = new Set<BibliotecaItem['status']>(['Lido', 'Assistido', 'Concluído']);
const BOOKISH_TYPES = new Set<BibliotecaItem['tipo']>(['livro', 'manga', 'quadrinho']);

export interface LibraryPeriodBucket {
  id: string;
  label: string;
  completed: number;
  books: number;
  pagesRead: number;
  ratedItems: number;
  averageRating: number | null;
}

/** Chave e rótulo do período a partir da data de conclusão (dataFim). */
export function periodKeyForDate(date: Date, grouping: LibraryPeriodGrouping): { id: string; label: string; sort: number } {
  const year = date.getFullYear();
  const month = date.getMonth();
  if (grouping === 'trimestre') {
    const quarter = Math.floor(month / 3) + 1;
    return { id: `${year}-T${quarter}`, label: `T${quarter} ${year}`, sort: year * 10 + quarter };
  }
  if (grouping === 'semestre') {
    const half = month < 6 ? 1 : 2;
    return { id: `${year}-S${half}`, label: `${half}º semestre ${year}`, sort: year * 10 + half };
  }
  return { id: String(year), label: String(year), sort: year * 10 };
}

/**
 * Agrupa os itens concluídos com data de conclusão pelo período escolhido.
 * Sem dataFim o item não entra (não dá para saber o período). Ordem cronológica.
 */
export function groupLibraryByPeriod(items: BibliotecaItem[], grouping: LibraryPeriodGrouping): LibraryPeriodBucket[] {
  const buckets = new Map<string, LibraryPeriodBucket & { sort: number; ratingSum: number }>();

  items.forEach(item => {
    if (!COMPLETED_STATUSES.has(item.status) || !item.dataFim) return;
    const date = new Date(item.dataFim);
    if (Number.isNaN(date.getTime())) return;
    const key = periodKeyForDate(date, grouping);
    const bucket = buckets.get(key.id) ?? {
      id: key.id, label: key.label, sort: key.sort,
      completed: 0, books: 0, pagesRead: 0, ratedItems: 0, averageRating: null, ratingSum: 0,
    };
    bucket.completed += 1;
    if (BOOKISH_TYPES.has(item.tipo)) {
      bucket.books += 1;
      bucket.pagesRead += item.totalPaginas || item.paginasLidas || 0;
    }
    if (typeof item.avaliacao === 'number' && item.avaliacao > 0) {
      bucket.ratedItems += 1;
      bucket.ratingSum += item.avaliacao;
    }
    buckets.set(key.id, bucket);
  });

  return [...buckets.values()]
    .sort((left, right) => left.sort - right.sort)
    .map(({ sort: _sort, ratingSum, ...bucket }) => ({
      ...bucket,
      averageRating: bucket.ratedItems > 0 ? ratingSum / bucket.ratedItems : null,
    }));
}
