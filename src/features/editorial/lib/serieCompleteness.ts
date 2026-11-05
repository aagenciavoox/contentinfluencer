import type { Content, Serie } from '../../../lib/database.ts';
import { pilarPrincipalDaSerie } from './pilarDaSerie.ts';

export type SerieOpenItemKey = 'pilar' | 'funcao' | 'frequencia' | 'formato' | 'energia';

export interface SerieOpenItem {
  key: SerieOpenItemKey;
  label: string;
}

const OPEN_ITEM_LABELS: Record<SerieOpenItemKey, string> = {
  pilar: 'pilar',
  funcao: 'objetivo',
  frequencia: 'recorrência',
  formato: 'formato',
  energia: 'esforço',
};

type SerieCompletenessFields = Partial<Pick<
  Serie,
  | 'id'
  | 'parentId'
  | 'tipoAgrupamento'
  | 'semPilar'
  | 'pilarIds'
  | 'pilarPrincipalId'
  | 'funcaoPadrao'
  | 'frequenciaRecomendada'
  | 'formatoVisualPadrao'
  | 'energiaPadrao'
>>;

/** Série só-agrupadora: tem filhos e nenhum episódio direto. */
export function serieSoAgrupa(
  serie: Pick<Serie, 'id'>,
  series: readonly Pick<Serie, 'id' | 'parentId'>[],
  contents: readonly Pick<Content, 'seriesId' | 'deletedAt'>[] = [],
): boolean {
  const temFilho = series.some(item => item.parentId === serie.id);
  if (!temFilho) return false;
  return !contents.some(content => content.seriesId === serie.id && !content.deletedAt);
}

/** O que ainda falta na série para ela orientar a criação sem ajustes manuais. */
export function getSerieOpenItems(
  serie: SerieCompletenessFields,
  opts?: {
    series?: readonly SerieCompletenessFields[];
    contents?: readonly Pick<Content, 'seriesId' | 'deletedAt'>[];
  },
): SerieOpenItem[] {
  if (serie.tipoAgrupamento === 'familia') return [];

  const pai = serie.parentId && opts?.series
    ? opts.series.find(item => item.id === serie.parentId) ?? null
    : null;
  const paiEhSerie = pai && pai.tipoAgrupamento !== 'familia' ? pai : null;

  const soAgrupa = opts?.series && serie.id
    ? serieSoAgrupa(
      { id: serie.id },
      opts.series.filter((item): item is Pick<Serie, 'id' | 'parentId'> => Boolean(item.id)),
      opts.contents ?? [],
    )
    : false;

  const temPilar = Boolean(
    pilarPrincipalDaSerie(serie)
    || serie.semPilar
    || (paiEhSerie && (pilarPrincipalDaSerie(paiEhSerie) || paiEhSerie.semPilar)),
  );
  const temFuncao = Boolean(serie.funcaoPadrao || paiEhSerie?.funcaoPadrao);
  const temFrequencia = Boolean(
    serie.frequenciaRecomendada?.trim()
    || paiEhSerie?.frequenciaRecomendada?.trim(),
  );
  const temFormato = Boolean(
    (serie.formatoVisualPadrao ?? []).some(item => item.trim())
    || (paiEhSerie?.formatoVisualPadrao ?? []).some(item => item.trim()),
  );
  const temEnergia = Boolean(serie.energiaPadrao || paiEhSerie?.energiaPadrao);

  const missing: SerieOpenItemKey[] = [];
  if (!temPilar) missing.push('pilar');
  if (!temFuncao) missing.push('funcao');
  if (!temFrequencia) missing.push('frequencia');
  // Só-agrupadora não cobra modelo, formato nem esforço.
  if (!soAgrupa) {
    if (!temFormato) missing.push('formato');
    if (!temEnergia) missing.push('energia');
  }
  return missing.map(key => ({ key, label: OPEN_ITEM_LABELS[key] }));
}

/** "pilar, objetivo e energia" */
export function formatOpenItems(items: SerieOpenItem[]): string {
  const labels = items.map(item => item.label);
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`;
}
