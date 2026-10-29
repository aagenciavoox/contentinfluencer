import { conteudoNaSubarvore, idsDaSubarvore, type SerieNo } from './serieArvore.ts';

/** Filtra conteúdos pela série e sua subárvore. Sem serieId, devolve a lista. */
export function filtrarPorSerieSubarvore<T extends { seriesId?: string | null }>(
  items: readonly T[],
  serieId: string | null | undefined,
  series: readonly SerieNo[],
): T[] {
  if (!serieId || serieId === 'Todas') return [...items];
  const sub = idsDaSubarvore(serieId, series);
  return items.filter(item => item.seriesId && sub.has(item.seriesId));
}

export function contentPassaFiltroSerie(
  seriesId: string | null | undefined,
  filtroSerieId: string | null | undefined,
  series: readonly SerieNo[],
): boolean {
  if (!filtroSerieId || filtroSerieId === 'Todas') return true;
  return conteudoNaSubarvore(seriesId, filtroSerieId, series);
}
