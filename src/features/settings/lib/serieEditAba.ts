import type { SerieOpenItemKey } from '../../editorial/lib/serieCompleteness.ts';

export type AbaEdicaoSerie = 'sobre' | 'roteiros' | 'publicacao';

const ABAS: readonly AbaEdicaoSerie[] = ['sobre', 'roteiros', 'publicacao'];

/** Lê `?aba=` da edição. Valor desconhecido abre Sobre. */
export function lerAbaEdicaoSerie(value: string | null | undefined): AbaEdicaoSerie {
  return ABAS.includes(value as AbaEdicaoSerie) ? (value as AbaEdicaoSerie) : 'sobre';
}

/** Onde cada informação em aberto é preenchida no formulário. */
const ABA_DO_ITEM: Record<SerieOpenItemKey, AbaEdicaoSerie> = {
  pilar: 'sobre',
  funcao: 'sobre',
  frequencia: 'sobre',
  formato: 'sobre',
  energia: 'sobre',
};

export function abaDoItemAberto(key: SerieOpenItemKey): AbaEdicaoSerie {
  return ABA_DO_ITEM[key];
}
