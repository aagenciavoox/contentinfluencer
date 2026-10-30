import type { Content } from '../../../lib/database.ts';
import { idsDaSubarvore, type SerieNo } from './serieArvore.ts';

type EpisodioContavel = Pick<Content, 'id' | 'seriesId' | 'deletedAt'>;

/** Episódios da página da série: a série, os quadros ligados e qualquer etapa, cada id uma vez. */
export function contarEpisodios(
  serieId: string,
  series: readonly SerieNo[],
  contents: readonly EpisodioContavel[],
): number {
  const sub = idsDaSubarvore(serieId, series);
  const vistos = new Set<string>();
  for (const content of contents) {
    if (content.deletedAt) continue;
    if (!content.seriesId || !sub.has(content.seriesId)) continue;
    vistos.add(content.id);
  }
  return vistos.size;
}

export function rotuloEpisodios(quantidade: number) {
  return `${quantidade} ${quantidade === 1 ? 'episódio' : 'episódios'}`;
}
