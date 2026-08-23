import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Content, Pilar, Serie } from '../../lib/database.ts';
import { computeAllPilarMetrics } from './computePilarMetrics.ts';
import { computeAllSerieMetrics } from './computeSerieMetrics.ts';
import { rankSeriesForPilar } from './rankSeriesForPilar.ts';
import type { DailyRecommendation } from './types.ts';

export interface RecommendDailyActionInput {
  pilares: Pilar[];
  series: Serie[];
  contents: Content[];
  now?: Date;
}

function buildPilarSnapshot(pilar: Pilar, totalDisponivel: number, gapCiclo: number | null) {
  return {
    id: pilar.id,
    nome: pilar.nome,
    cor: pilar.cor,
    gapCiclo,
    totalDisponivel,
    metaCiclo: pilar.metaCiclo,
  };
}

function formatLastPublication(timestamp: string | null): string {
  if (!timestamp) return 'ainda não saiu neste ciclo';
  return `última publicação ${formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: ptBR })}`;
}

export function recommendDailyAction({
  pilares,
  series,
  contents,
  now = new Date(),
}: RecommendDailyActionInput): DailyRecommendation | null {
  const activePilares = pilares.filter(pilar => pilar.ativo);
  if (activePilares.length === 0) return null;

  const pilarMetrics = computeAllPilarMetrics(activePilares, contents);
  const serieMetrics = computeAllSerieMetrics(series, contents, now);

  const pilaresWithoutMeta = activePilares.filter(pilar => pilar.metaCiclo == null);
  if (pilaresWithoutMeta.length === activePilares.length) {
    const first = pilaresWithoutMeta[0];
    const metrics = pilarMetrics.get(first.id)!;
    return {
      kind: 'configure_meta',
      pilar: buildPilarSnapshot(first, metrics.totalDisponivel, metrics.gapCiclo),
      message: `Defina a meta do ciclo em "${first.nome}" para o sistema indicar o que falta produzir ou postar.`,
      href: `/configuracoes/pilares/${first.id}/editar`,
    };
  }

  const pilaresWithGap = activePilares
    .map(pilar => ({
      pilar,
      metrics: pilarMetrics.get(pilar.id)!,
      rankedSeries: rankSeriesForPilar(pilar.id, series, serieMetrics),
    }))
    .filter(entry => (entry.metrics.gapCiclo ?? 0) > 0)
    .sort((left, right) => {
      const gapDiff = (right.metrics.gapCiclo ?? 0) - (left.metrics.gapCiclo ?? 0);
      if (gapDiff !== 0) return gapDiff;
      const leftTop = left.rankedSeries[0]?.metrics.gravadosProntos ?? 0;
      const rightTop = right.rankedSeries[0]?.metrics.gravadosProntos ?? 0;
      return rightTop - leftTop;
    });

  if (pilaresWithGap.length > 0) {
    const { pilar, metrics, rankedSeries } = pilaresWithGap[0];
    const gap = metrics.gapCiclo ?? 0;
    const postCandidate = rankedSeries.find(entry => entry.metrics.gravadosProntos > 0);

    if (postCandidate) {
      return {
        kind: 'post',
        pilar: buildPilarSnapshot(pilar, metrics.totalDisponivel, metrics.gapCiclo),
        serie: {
          id: postCandidate.serie.id,
          name: postCandidate.serie.name,
          gravadosProntos: postCandidate.metrics.gravadosProntos,
          roteirosEscritos: postCandidate.metrics.roteirosEscritos,
        },
        contentIds: postCandidate.metrics.postableContentIds,
        message: `"${pilar.nome}" precisa de mais ${gap} no ciclo. A série "${postCandidate.serie.name}" tem ${postCandidate.metrics.gravadosProntos} prontos e ${formatLastPublication(postCandidate.metrics.ultimaPublicacao)}.`,
        href: '/calendario?modo=agendar',
      };
    }

    const recordCandidate = rankedSeries.find(entry => entry.metrics.roteirosEscritos > 0);
    if (recordCandidate) {
      return {
        kind: 'record',
        pilar: buildPilarSnapshot(pilar, metrics.totalDisponivel, metrics.gapCiclo),
        serie: {
          id: recordCandidate.serie.id,
          name: recordCandidate.serie.name,
          gravadosProntos: recordCandidate.metrics.gravadosProntos,
          roteirosEscritos: recordCandidate.metrics.roteirosEscritos,
        },
        contentIds: recordCandidate.metrics.scriptContentIds,
        message: `"${pilar.nome}" tem gap de ${gap}, mas nada gravado pronto. "${recordCandidate.serie.name}" tem ${recordCandidate.metrics.roteirosEscritos} roteiros — vale gravar primeiro.`,
        href: `/gravacao?seriesId=${recordCandidate.serie.id}`,
      };
    }
  }

  const configuredPilar = activePilares.find(pilar => pilar.metaCiclo != null) ?? activePilares[0];
  const configuredMetrics = pilarMetrics.get(configuredPilar.id)!;
  return {
    kind: 'on_track',
    pilar: buildPilarSnapshot(
      configuredPilar,
      configuredMetrics.totalDisponivel,
      configuredMetrics.gapCiclo,
    ),
    message: 'O estoque cobre as metas do ciclo. Você pode seguir com o próximo passo do dia.',
    href: '/criacao',
  };
}
