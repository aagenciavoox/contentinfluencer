import type { Serie } from '../../../lib/database.ts';

export type SerieOpenItemKey = 'pilar' | 'funcao' | 'frequencia' | 'formato' | 'energia';

export interface SerieOpenItem {
  key: SerieOpenItemKey;
  label: string;
}

const OPEN_ITEM_LABELS: Record<SerieOpenItemKey, string> = {
  pilar: 'pilar',
  funcao: 'função',
  frequencia: 'frequência',
  formato: 'formato visual',
  energia: 'energia',
};

type SerieCompletenessFields = Pick<
  Serie,
  'pilarIds' | 'funcaoPadrao' | 'frequenciaRecomendada' | 'formatoVisualPadrao' | 'energiaPadrao'
>;

/** O que ainda falta na série para ela orientar a criação sem ajustes manuais. */
export function getSerieOpenItems(serie: SerieCompletenessFields): SerieOpenItem[] {
  const missing: SerieOpenItemKey[] = [];
  if (serie.pilarIds.length === 0) missing.push('pilar');
  if (!serie.funcaoPadrao) missing.push('funcao');
  if (!serie.frequenciaRecomendada?.trim()) missing.push('frequencia');
  if (!serie.formatoVisualPadrao?.trim()) missing.push('formato');
  if (!serie.energiaPadrao) missing.push('energia');
  return missing.map(key => ({ key, label: OPEN_ITEM_LABELS[key] }));
}

/** "pilar, função e energia" */
export function formatOpenItems(items: SerieOpenItem[]): string {
  const labels = items.map(item => item.label);
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`;
}
