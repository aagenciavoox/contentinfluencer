import type { Content, Serie } from '../../lib/database.ts';
import { getRollingCycleWindow } from './cycle.ts';
import {
  comparePublicationTimestamps,
  getPublicationTimestamp,
  isPostableStock,
  isPublishedInCycle,
  isScriptWritten,
} from './contentStock.ts';
import type { SerieProductionMetrics } from './types.ts';

export function computeSerieMetrics(
  serie: Serie,
  contents: Content[],
  now: Date = new Date(),
): SerieProductionMetrics {
  const cycle = getRollingCycleWindow(now);
  const serieContents = contents.filter(content => content.seriesId === serie.id);

  const scriptContents = serieContents.filter(isScriptWritten);
  const postableContents = serieContents.filter(isPostableStock);
  const publishedInCycle = serieContents.filter(content => isPublishedInCycle(content, cycle));

  const publishedContents = serieContents.filter(
    content => content.postedAt || content.publishDate,
  );
  const ultimaPublicacao = publishedContents.reduce<string | null>((latest, content) => {
    const timestamp = getPublicationTimestamp(content);
    if (!timestamp) return latest;
    if (!latest) return timestamp;
    return comparePublicationTimestamps(timestamp, latest) > 0 ? timestamp : latest;
  }, null);

  return {
    serieId: serie.id,
    roteirosEscritos: scriptContents.length,
    gravadosProntos: postableContents.length,
    publicadosNoCiclo: publishedInCycle.length,
    ultimaPublicacao,
    ativa: serie.ativa,
    postableContentIds: postableContents.map(content => content.id),
    scriptContentIds: scriptContents.map(content => content.id),
  };
}

export function computeAllSerieMetrics(
  series: Serie[],
  contents: Content[],
  now: Date = new Date(),
): Map<string, SerieProductionMetrics> {
  const map = new Map<string, SerieProductionMetrics>();
  for (const serie of series) {
    map.set(serie.id, computeSerieMetrics(serie, contents, now));
  }
  return map;
}
