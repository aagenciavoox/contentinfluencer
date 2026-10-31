import type {
  EnergiaNivel,
  FuncaoEditorial,
  FuncaoPadraoSerie,
  PilarOrigem,
  Serie,
  SeriePlataforma,
} from '../../../lib/database.ts';
import { isFuncaoEditorial } from './funcoes.ts';
import { pilarPrincipalDaSerie } from './pilarDaSerie.ts';
import { ancestraisDaSerie, caminhoDaSerie, type SerieNo } from './serieArvore.ts';

export type SerieHeranca = Pick<
  Serie,
  | 'id'
  | 'parentId'
  | 'name'
  | 'template'
  | 'funcaoPadrao'
  | 'pilarPrincipalId'
  | 'pilarIds'
  | 'legendaBase'
  | 'plataformas'
  | 'formatoVisualPadrao'
  | 'energiaPadrao'
  | 'ativa'
  | 'semPilar'
> & SerieNo;

export type ConteudoHeranca = {
  pilarId?: string | null;
  pilarOrigem?: PilarOrigem | null;
  funcao?: FuncaoEditorial | null;
  funcaoOrigem?: string | null;
  classificacaoCongeladaEm?: string | null;
  script?: string | null;
  scriptOrigem?: string | null;
  legendaBase?: string | null;
  formatoVisual?: string | null;
  energiaNecessaria?: EnergiaNivel | null;
  seriesId?: string | null;
};

function seriePorId(series: readonly SerieHeranca[]): Map<string, SerieHeranca> {
  return new Map(series.map(serie => [serie.id, serie]));
}

function cadeia(serieId: string, series: readonly SerieHeranca[]): SerieHeranca[] {
  const porId = seriePorId(series);
  return caminhoDaSerie(serieId, series)
    .map(no => porId.get(no.id))
    .filter((serie): serie is SerieHeranca => Boolean(serie));
}

/** Da própria série aos ancestrais (próxima primeiro na subida). */
function propriaEAncestrais(serieId: string, series: readonly SerieHeranca[]): SerieHeranca[] {
  const porId = seriePorId(series);
  const propria = porId.get(serieId);
  const acima = ancestraisDaSerie(serieId, series)
    .map(no => porId.get(no.id))
    .filter((serie): serie is SerieHeranca => Boolean(serie));
  return propria ? [propria, ...acima] : acima;
}

export type PilarResolvido = {
  pilarId: string | null;
  /** Série de onde veio o pilar, ou null se veio do episódio. */
  origemSerieId: string | null;
  estado: 'escolhida' | 'nenhuma' | 'herdada' | 'congelada' | 'vazia';
};

/** Pilar: escolha no episódio para; senão primeiro ancestral com pilar. */
export function resolverPilar(
  content: ConteudoHeranca,
  series: readonly SerieHeranca[],
): PilarResolvido {
  if (content.classificacaoCongeladaEm) {
    return {
      pilarId: content.pilarId ?? null,
      origemSerieId: null,
      estado: 'congelada',
    };
  }
  if (content.pilarOrigem === 'escolhida') {
    return { pilarId: content.pilarId ?? null, origemSerieId: null, estado: 'escolhida' };
  }
  if (content.pilarOrigem === 'nenhuma') {
    return { pilarId: null, origemSerieId: null, estado: 'nenhuma' };
  }
  const serieId = content.seriesId?.trim();
  if (!serieId) {
    return { pilarId: content.pilarId ?? null, origemSerieId: null, estado: content.pilarId ? 'escolhida' : 'vazia' };
  }
  for (const serie of propriaEAncestrais(serieId, series)) {
    const pilar = pilarPrincipalDaSerie(serie);
    if (pilar) {
      return { pilarId: pilar, origemSerieId: serie.id, estado: 'herdada' };
    }
    // "Sem pilar" de propósito para a subida: não herda do agrupamento superior.
    if (serie.semPilar) break;
  }
  return { pilarId: null, origemSerieId: null, estado: 'vazia' };
}

export type FuncaoResolvidaHeranca = {
  funcao: FuncaoEditorial | null;
  origemSerieId: string | null;
  estado: 'escolhida' | 'nenhuma' | 'herdada' | 'congelada' | 'varia' | 'vazia' | 'aplicada' | 'migrada';
};

function padraoHerdavel(value: FuncaoPadraoSerie | null | undefined): FuncaoEditorial | null {
  return isFuncaoEditorial(value) ? value : null;
}

/** Função: escolha/nenhuma no episódio para; `varia` na série para e não sobe; senão ancestral. */
export function resolverFuncaoHerdada(
  content: ConteudoHeranca,
  series: readonly SerieHeranca[],
): FuncaoResolvidaHeranca {
  if (content.classificacaoCongeladaEm) {
    return {
      funcao: isFuncaoEditorial(content.funcao) ? content.funcao : null,
      origemSerieId: null,
      estado: 'congelada',
    };
  }
  const origem = content.funcaoOrigem;
  if (origem === 'escolhida') {
    return {
      funcao: isFuncaoEditorial(content.funcao) ? content.funcao : null,
      origemSerieId: null,
      estado: 'escolhida',
    };
  }
  if (origem === 'nenhuma') {
    return { funcao: null, origemSerieId: null, estado: 'nenhuma' };
  }
  if (origem === 'aplicada' || origem === 'migrada') {
    return {
      funcao: isFuncaoEditorial(content.funcao) ? content.funcao : null,
      origemSerieId: null,
      estado: origem,
    };
  }

  const serieId = content.seriesId?.trim();
  if (!serieId) {
    return {
      funcao: isFuncaoEditorial(content.funcao) ? content.funcao : null,
      origemSerieId: null,
      estado: content.funcao ? 'escolhida' : 'vazia',
    };
  }

  for (const serie of propriaEAncestrais(serieId, series)) {
    if (serie.funcaoPadrao === 'varia') {
      return { funcao: null, origemSerieId: serie.id, estado: 'varia' };
    }
    const herdavel = padraoHerdavel(serie.funcaoPadrao);
    if (herdavel) {
      return { funcao: herdavel, origemSerieId: serie.id, estado: 'herdada' };
    }
  }
  return { funcao: null, origemSerieId: null, estado: 'vazia' };
}

export type ModeloResolvido = {
  template: string | null;
  origemSerieId: string | null;
  /** True se o roteiro do episódio já é do autor e não deve ser sobrescrito. */
  preservarAutor: boolean;
};

/** Modelo: roteiro de autor permanece; vazio pode receber o primeiro template ativo da cadeia. */
export function resolverModelo(
  content: ConteudoHeranca,
  series: readonly SerieHeranca[],
): ModeloResolvido {
  const texto = content.script?.trim() ?? '';
  if (content.scriptOrigem === 'autor' || texto) {
    return { template: null, origemSerieId: null, preservarAutor: true };
  }
  const serieId = content.seriesId?.trim();
  if (!serieId) return { template: null, origemSerieId: null, preservarAutor: false };
  for (const serie of propriaEAncestrais(serieId, series)) {
    if (!serie.ativa) continue;
    const template = serie.template?.trim();
    if (template) {
      return { template, origemSerieId: serie.id, preservarAutor: false };
    }
  }
  return { template: null, origemSerieId: null, preservarAutor: false };
}

export type LegendaResolvida = {
  legendaBase: string | null;
  origemSerieId: string | null;
  preservarPropria: boolean;
};

/** Legenda-base: versão própria permanece; senão sobe na cadeia. */
export function resolverLegendaBase(
  content: ConteudoHeranca,
  series: readonly SerieHeranca[],
): LegendaResolvida {
  const propria = content.legendaBase?.trim();
  if (propria) {
    return { legendaBase: propria, origemSerieId: null, preservarPropria: true };
  }
  const serieId = content.seriesId?.trim();
  if (!serieId) return { legendaBase: null, origemSerieId: null, preservarPropria: false };
  for (const serie of propriaEAncestrais(serieId, series)) {
    const base = serie.legendaBase?.trim();
    if (base) {
      return { legendaBase: base, origemSerieId: serie.id, preservarPropria: false };
    }
  }
  return { legendaBase: null, origemSerieId: null, preservarPropria: false };
}

export type HashtagsResolvidas = {
  hashtags: string | null;
  origem: 'serie' | 'ancestral' | 'pilar' | 'ajustes' | null;
  origemId: string | null;
};

/**
 * Hashtags: série do episódio na conta; senão ancestral; senão o caller usa pilar/ajustes.
 * Não grava sozinha — só sugere.
 */
export function sugerirHashtags(
  content: ConteudoHeranca,
  series: readonly SerieHeranca[],
  platformId: string,
): HashtagsResolvidas {
  const serieId = content.seriesId?.trim();
  if (!serieId) {
    return { hashtags: null, origem: 'ajustes', origemId: null };
  }

  const tagsDe = (plataformas: readonly SeriePlataforma[] | undefined) =>
    plataformas?.find(item => item.platformId === platformId)?.hashtags?.trim() || null;

  const cadeiaSeries = propriaEAncestrais(serieId, series);
  if (cadeiaSeries.length > 0) {
    const propria = tagsDe(cadeiaSeries[0].plataformas);
    if (propria) {
      return { hashtags: propria, origem: 'serie', origemId: cadeiaSeries[0].id };
    }
    for (const ancestral of cadeiaSeries.slice(1)) {
      const tags = tagsDe(ancestral.plataformas);
      if (tags) {
        return { hashtags: tags, origem: 'ancestral', origemId: ancestral.id };
      }
    }
  }

  const pilar = resolverPilar(content, series);
  if (pilar.pilarId) {
    return { hashtags: null, origem: 'pilar', origemId: pilar.pilarId };
  }
  return { hashtags: null, origem: 'ajustes', origemId: null };
}

/** Formato e esforço: só a série do episódio; não sobem. */
export function formatoDaSerie(
  content: ConteudoHeranca,
  series: readonly SerieHeranca[],
): string[] {
  if (content.formatoVisual?.trim()) return [content.formatoVisual.trim()];
  const serieId = content.seriesId?.trim();
  if (!serieId) return [];
  const serie = seriePorId(series).get(serieId);
  return (serie?.formatoVisualPadrao ?? []).filter(Boolean);
}

export function energiaDaSerie(
  content: ConteudoHeranca,
  series: readonly SerieHeranca[],
): EnergiaNivel | null {
  if (content.energiaNecessaria) return content.energiaNecessaria;
  const serieId = content.seriesId?.trim();
  if (!serieId) return null;
  return seriePorId(series).get(serieId)?.energiaPadrao ?? null;
}

/** Resolvedor único usado pela ficha e pelo MCP. */
export function resolverHerancaSerie(
  content: ConteudoHeranca,
  series: readonly SerieHeranca[],
) {
  return {
    pilar: resolverPilar(content, series),
    funcao: resolverFuncaoHerdada(content, series),
    modelo: resolverModelo(content, series),
    legendaBase: resolverLegendaBase(content, series),
    formato: formatoDaSerie(content, series),
    energia: energiaDaSerie(content, series),
    caminho: content.seriesId
      ? cadeia(content.seriesId, series).map(serie => ({ id: serie.id, name: serie.name }))
      : [],
  };
}
