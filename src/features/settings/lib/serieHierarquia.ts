import type { Serie, SerieTipoAgrupamento } from '../../../lib/database.ts';
import { formariaCicloParent } from '../../editorial/lib/serieArvore.ts';
import { tipoDaSerie } from './serieAgrupamento.ts';

/**
 * Ordem fixa: família → série → quadro. A série pode não ter família, quadros nem temporadas;
 * quadro e temporada só existem dentro de uma série.
 */
export const PAI_DO_TIPO: Record<SerieTipoAgrupamento, SerieTipoAgrupamento | null> = {
  familia: null,
  serie: 'familia',
  quadro: 'serie',
};

export const FILHO_DO_TIPO: Record<SerieTipoAgrupamento, SerieTipoAgrupamento | null> = {
  familia: 'serie',
  serie: 'quadro',
  quadro: null,
};

/** Quadro sem série não existe. Série sem família, sim. */
export function paiObrigatorio(tipo: SerieTipoAgrupamento): boolean {
  return tipo === 'quadro';
}

/** Temporadas ficam na série; os quadros dela usam as mesmas. */
export function podeTerTemporadas(tipo: SerieTipoAgrupamento): boolean {
  return tipo === 'serie';
}

type SerieNoHierarquia = Pick<Serie, 'id' | 'name' | 'parentId' | 'tipoAgrupamento'>;

/** Agrupamentos que podem receber este: só do tipo logo acima, sem formar ciclo. */
export function opcoesDePai<T extends SerieNoHierarquia>(
  tipo: SerieTipoAgrupamento,
  serieId: string,
  series: readonly T[],
): T[] {
  const tipoDoPai = PAI_DO_TIPO[tipo];
  if (!tipoDoPai) return [];
  return series
    .filter(item => item.id !== serieId)
    .filter(item => tipoDaSerie(item.id, series) === tipoDoPai)
    .filter(item => !formariaCicloParent(serieId, item.id, series))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

/** O que impede gravar este vínculo, em texto para a pessoa. Null quando está tudo certo. */
export function erroDoVinculo(
  tipo: SerieTipoAgrupamento,
  parentId: string | null | undefined,
  serieId: string,
  series: readonly SerieNoHierarquia[],
): string | null {
  const pai = parentId ? series.find(item => item.id === parentId) ?? null : null;
  if (tipo === 'familia') {
    return pai ? 'Uma família não fica dentro de outro agrupamento.' : null;
  }
  if (tipo === 'quadro' && !pai) return 'Escolha a série deste quadro.';
  if (!pai) return null;
  if (formariaCicloParent(serieId, pai.id, series)) return 'Um agrupamento não pode ficar dentro de si mesmo.';
  const tipoDoPai = tipoDaSerie(pai.id, series);
  if (tipo === 'serie' && tipoDoPai !== 'familia') return 'Uma série só pode fazer parte de uma família.';
  if (tipo === 'quadro' && tipoDoPai !== 'serie') return 'Um quadro só pode ficar dentro de uma série.';
  return null;
}

/** Rota para criar o próximo nível dentro deste agrupamento. Quadro não tem filhos. */
export function rotaParaCriarFilho(serieId: string, tipo: SerieTipoAgrupamento): string | null {
  if (tipo === 'familia') return `/series/novo?familia=${encodeURIComponent(serieId)}`;
  if (tipo === 'serie') return `/series/${encodeURIComponent(serieId)}/quadros/novo`;
  return null;
}
