import type { Content, Serie } from '../../lib/database.ts';
import { normalizePublicacaoStatus } from '../editorial/lib/publicacaoSituacao.ts';
import { idsDaSubarvore } from '../editorial/lib/serieArvore.ts';
import { getRollingCycleWindow } from './cycle.ts';
import {
  comparePublicationTimestamps,
  getPublicationTimestamp,
  isPostableStock,
  isPublishedContent,
  isPublishedInCycle,
  isScriptWritten,
} from './contentStock.ts';
import type { SerieProductionMetrics } from './types.ts';

/** Publicações por conta, em todos os ciclos. Não publicada e removida ficam de fora. */
function contarPublicacoes(contents: readonly Content[]): { previstas: number; realizadas: number } {
  let previstas = 0;
  let realizadas = 0;
  for (const content of contents) {
    for (const publicacao of content.plataformas ?? []) {
      const status = normalizePublicacaoStatus(publicacao.status);
      if (status === 'publicada') realizadas += 1;
      else if (status === 'prevista' || status === 'programada') previstas += 1;
    }
  }
  return { previstas, realizadas };
}

/**
 * Com `series`, soma a subárvore: os episódios dos quadros entram uma vez na série de cima.
 * Sem `series`, conta só os episódios ligados direto.
 */
export function computeSerieMetrics(
  serie: Serie,
  contents: Content[],
  now: Date = new Date(),
  series: readonly Pick<Serie, 'id' | 'parentId'>[] = [],
): SerieProductionMetrics {
  const cycle = getRollingCycleWindow(now);
  const sub = series.length > 0 ? idsDaSubarvore(serie.id, series) : new Set([serie.id]);
  const serieContents = contents.filter(
    content => content.seriesId && sub.has(content.seriesId) && !content.deletedAt && !content.archivedAt,
  );

  const scriptContents = serieContents.filter(isScriptWritten);
  const postableContents = serieContents.filter(isPostableStock);
  const publishedInCycle = serieContents.filter(content => isPublishedInCycle(content, cycle));
  const publicacoes = contarPublicacoes(serieContents);

  // Data prevista não é publicação: só o que já saiu entra em "Última publicação".
  const publishedContents = serieContents.filter(isPublishedContent);
  const ultimaPublicacao = publishedContents.reduce<string | null>((latest, content) => {
    const timestamp = getPublicationTimestamp(content);
    if (!timestamp) return latest;
    if (!latest) return timestamp;
    return comparePublicationTimestamps(timestamp, latest) > 0 ? timestamp : latest;
  }, null);

  return {
    serieId: serie.id,
    episodios: serieContents.length,
    publicacoesPrevistas: publicacoes.previstas,
    publicacoesRealizadas: publicacoes.realizadas,
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
    map.set(serie.id, computeSerieMetrics(serie, contents, now, series));
  }
  return map;
}
