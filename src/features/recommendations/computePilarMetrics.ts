import type { Content, Pilar } from '../../lib/database.ts';
import { isPostableStock } from './contentStock.ts';
import type { PilarCycleMetrics } from './types.ts';

export function computePilarMetrics(pilar: Pilar, contents: Content[]): PilarCycleMetrics {
  const pilarContents = contents.filter(content => content.pilarId === pilar.id);
  const postableContents = pilarContents.filter(isPostableStock);

  const totalDisponivel = postableContents.length;
  const metaCiclo = pilar.metaCiclo;
  const gapCiclo =
    metaCiclo == null ? null : Math.max(0, metaCiclo - totalDisponivel);

  return {
    pilarId: pilar.id,
    totalDisponivel,
    gapCiclo,
    metaCiclo,
    postableContentIds: postableContents.map(content => content.id),
  };
}

export function computeAllPilarMetrics(
  pilares: Pilar[],
  contents: Content[],
): Map<string, PilarCycleMetrics> {
  const map = new Map<string, PilarCycleMetrics>();
  for (const pilar of pilares) {
    map.set(pilar.id, computePilarMetrics(pilar, contents));
  }
  return map;
}
