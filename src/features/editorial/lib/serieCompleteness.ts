import type { Content, Serie } from '../../../lib/database.ts';
import { pilarPrincipalDaSerie } from './pilarDaSerie.ts';

export type SerieOpenItemKey = 'pilar' | 'funcao' | 'frequencia' | 'formato' | 'energia';

export interface SerieOpenItem {
  key: SerieOpenItemKey;
  label: string;
}

const OPEN_ITEM_LABELS: Record<SerieOpenItemKey, string> = {
  pilar: 'pilar',
  funcao: 'função',
  frequencia: 'recorrência',
  formato: 'formato',
  energia: 'esforço',
};

type SerieCompletenessFields = Partial<Pick<
  Serie,
  | 'id'
  | 'parentId'
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
    series?: readonly Pick<Serie, 'id' | 'parentId'>[];
    contents?: readonly Pick<Content, 'seriesId' | 'deletedAt'>[];
  },
): SerieOpenItem[] {
  const soAgrupa = opts?.series
    ? serieSoAgrupa(serie as Pick<Serie, 'id'>, opts.series, opts.contents ?? [])
    : false;
  const missing: SerieOpenItemKey[] = [];
  if (!pilarPrincipalDaSerie(serie)) missing.push('pilar');
  if (!serie.funcaoPadrao) missing.push('funcao');
  if (!serie.frequenciaRecomendada?.trim()) missing.push('frequencia');
  // Só-agrupadora não cobra modelo, formato nem esforço.
  if (!soAgrupa) {
    if (!(serie.formatoVisualPadrao ?? []).some(item => item.trim())) missing.push('formato');
    if (!serie.energiaPadrao) missing.push('energia');
  }
  return missing.map(key => ({ key, label: OPEN_ITEM_LABELS[key] }));
}

/** "pilar, função e energia" */
export function formatOpenItems(items: SerieOpenItem[]): string {
  const labels = items.map(item => item.label);
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`;
}
