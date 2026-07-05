import type { Serie } from '../../lib/database.ts';
import type { SerieProductionMetrics } from './types.ts';
import { comparePublicationTimestamps } from './contentStock.ts';

export interface RankedSerie {
  serie: Serie;
  metrics: SerieProductionMetrics;
}

function compareRankedSeries(left: RankedSerie, right: RankedSerie): number {
  if (left.metrics.gravadosProntos !== right.metrics.gravadosProntos) {
    return right.metrics.gravadosProntos - left.metrics.gravadosProntos;
  }
  if (left.metrics.publicadosNoCiclo !== right.metrics.publicadosNoCiclo) {
    return left.metrics.publicadosNoCiclo - right.metrics.publicadosNoCiclo;
  }
  const publicationCompare = comparePublicationTimestamps(
    left.metrics.ultimaPublicacao,
    right.metrics.ultimaPublicacao,
  );
  if (publicationCompare !== 0) return publicationCompare;
  return right.metrics.roteirosEscritos - left.metrics.roteirosEscritos;
}

export function rankSeriesForPilar(
  pilarId: string,
  series: Serie[],
  metricsBySerieId: Map<string, SerieProductionMetrics>,
): RankedSerie[] {
  return series
    .filter(serie => serie.ativa && serie.pilarIds.includes(pilarId))
    .map(serie => ({
      serie,
      metrics: metricsBySerieId.get(serie.id) ?? {
        serieId: serie.id,
        roteirosEscritos: 0,
        gravadosProntos: 0,
        publicadosNoCiclo: 0,
        ultimaPublicacao: null,
        ativa: serie.ativa,
        postableContentIds: [],
        scriptContentIds: [],
      },
    }))
    .sort(compareRankedSeries);
}
