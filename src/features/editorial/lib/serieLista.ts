import type { Serie } from '../../../lib/database.ts';
import { filhosDaSerie, seriesRaiz } from './serieArvore.ts';

export type SerieListaModo = 'agrupada' | 'lista';

export type SerieListaNo = {
  serie: Serie;
  profundidade: number;
  filhos: SerieListaNo[];
};

/** Árvore para visualização agrupada. Não altera vínculos. */
export function arvoreSeriesLista(series: readonly Serie[]): SerieListaNo[] {
  const build = (serie: Serie, profundidade: number): SerieListaNo => ({
    serie,
    profundidade,
    filhos: filhosDaSerie(serie.id, series).map(filho => {
      const completa = series.find(item => item.id === filho.id)!;
      return build(completa, profundidade + 1);
    }),
  });
  return seriesRaiz(series)
    .map(raiz => series.find(item => item.id === raiz.id)!)
    .filter(Boolean)
    .map(raiz => build(raiz, 0));
}

/** Lista plana na ordem visual (pai, depois filhos). */
export function achatarArvore(nos: readonly SerieListaNo[]): SerieListaNo[] {
  const out: SerieListaNo[] = [];
  const walk = (lista: readonly SerieListaNo[]) => {
    for (const no of lista) {
      out.push(no);
      walk(no.filhos);
    }
  };
  walk(nos);
  return out;
}

export function seriesParaExibir(
  series: readonly Serie[],
  modo: SerieListaModo,
): SerieListaNo[] {
  if (modo === 'lista') {
    return [...series]
      .sort((a, b) => Number(b.ativa) - Number(a.ativa) || a.name.localeCompare(b.name, 'pt-BR'))
      .map(serie => ({ serie, profundidade: 0, filhos: [] }));
  }
  return achatarArvore(arvoreSeriesLista(series));
}

/**
 * Árvore de visualização. Um quadro cujo pai ficou de fora do filtro
 * aparece na raiz, sem alterar o parentId gravado.
 */
export function exibirSeriesVisiveis(
  series: readonly Serie[],
  modo: SerieListaModo,
): SerieListaNo[] {
  if (modo === 'lista') return seriesParaExibir(series, 'lista');
  const ids = new Set(series.map(item => item.id));
  const ajustadas = series.map(item =>
    item.parentId && !ids.has(item.parentId) ? { ...item, parentId: null } : item,
  );
  return seriesParaExibir(ajustadas, 'agrupada');
}
