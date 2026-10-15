import { buildGradeEntries, type GradeContent, type GradeSerie } from './gradeEntries.ts';
import type { DestinoPlataforma } from './destinations.ts';

type PostItComData = {
  contentId: string | null;
  date: string | null;
};

function dia(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match?.[1] ?? null;
}

/**
 * Dias em que cada conteúdo aparece na grade, pela mesma regra da contagem do período:
 * a publicação de referência (ou o dia em que foi ao ar) e o dia de cada post-it ligado.
 * Conteúdo fora do mapa, ou com a lista vazia, está sem data.
 */
export function datasNaGrade({
  contents,
  series,
  postIts,
  redeReferenciaId,
  platforms = [],
}: {
  contents: readonly GradeContent[];
  series: readonly GradeSerie[];
  postIts: readonly PostItComData[];
  redeReferenciaId: string | null;
  platforms?: readonly DestinoPlataforma[];
}): Map<string, string[]> {
  const datas = new Map<string, string[]>();
  const acrescentar = (contentId: string, data: string | null) => {
    if (!data) return;
    const lista = datas.get(contentId) ?? [];
    if (!lista.includes(data)) lista.push(data);
    datas.set(contentId, lista);
  };

  const entries = buildGradeEntries({ contents, series, settings: { redeReferenciaId }, platforms });
  for (const entry of entries) {
    if (entry.tipo !== 'original') continue;
    acrescentar(entry.contentId, entry.data);
  }
  for (const postIt of postIts) {
    if (postIt.contentId) acrescentar(postIt.contentId, dia(postIt.date));
  }
  return datas;
}

export type FiltroData =
  | { modo: 'sem-data' }
  | { modo: 'intervalo'; inicio: string; fim: string };

/** Algum dia do conteúdo cai no intervalo (inclusivo), ou ele não tem dia nenhum. */
export function passaNoFiltroData(datas: readonly string[] | undefined, filtro: FiltroData | null): boolean {
  if (!filtro) return true;
  if (filtro.modo === 'sem-data') return !datas || datas.length === 0;
  return (datas ?? []).some(data => data >= filtro.inicio && data <= filtro.fim);
}
