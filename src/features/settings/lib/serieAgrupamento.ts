import type { Content, Serie, SerieTipoAgrupamento } from '../../../lib/database.ts';
import { CONTENT_STATUS, normalizeContentStatus } from '../../contents/lib/contentPipeline.ts';
import { isActiveCreation } from '../../contents/lib/contentWorkflow.ts';
import { publicacaoPublicada } from '../../editorial/lib/publicacaoSituacao.ts';
import { pilarPrincipalDaSerie } from '../../editorial/lib/pilarDaSerie.ts';
import { filhosDaSerie, idsDaSubarvore } from '../../editorial/lib/serieArvore.ts';

export const TIPOS_AGRUPAMENTO: readonly SerieTipoAgrupamento[] = ['familia', 'serie', 'quadro'];

export const TIPO_AGRUPAMENTO_LABEL: Record<SerieTipoAgrupamento, string> = {
  familia: 'Família',
  serie: 'Série',
  quadro: 'Quadro',
};

export const TIPO_AGRUPAMENTO_PLURAL: Record<SerieTipoAgrupamento, string> = {
  familia: 'Famílias',
  serie: 'Séries',
  quadro: 'Quadros',
};

type SerieTipoNo = Pick<Serie, 'id' | 'parentId' | 'tipoAgrupamento'> & { name?: string | null };

/**
 * Tipo escolhido; sem escolha, deduzido pela árvore.
 * Raiz com netos é família; raiz sem netos é série.
 * Filho de família é série; filho de série ou quadro é quadro.
 */
export function tipoDaSerie(serieId: string, series: readonly SerieTipoNo[]): SerieTipoAgrupamento {
  const porId = new Map(series.map(serie => [serie.id, serie]));
  const vistos = new Set<string>();
  const resolver = (id: string): SerieTipoAgrupamento => {
    const serie = porId.get(id);
    if (!serie) return 'serie';
    if (serie.tipoAgrupamento) return serie.tipoAgrupamento;
    if (vistos.has(id)) return 'serie';
    vistos.add(id);
    const paiId = serie.parentId?.trim();
    if (!paiId || !porId.has(paiId)) {
      const temNeto = filhosDaSerie(id, series).some(filho => filhosDaSerie(filho.id, series).length > 0);
      return temNeto ? 'familia' : 'serie';
    }
    return resolver(paiId) === 'familia' ? 'serie' : 'quadro';
  };
  return resolver(serieId);
}

/** Tipos de toda a lista numa passada. */
export function tiposDasSeries(series: readonly SerieTipoNo[]): Map<string, SerieTipoAgrupamento> {
  return new Map(series.map(serie => [serie.id, tipoDaSerie(serie.id, series)]));
}

/** Tipo sugerido para um agrupamento novo dentro de `paiId`. */
export function tipoSugeridoParaFilho(
  paiId: string | null | undefined,
  series: readonly SerieTipoNo[],
): SerieTipoAgrupamento {
  if (!paiId) return 'serie';
  return tipoDaSerie(paiId, series) === 'familia' ? 'serie' : 'quadro';
}

export type PilarDaSerieResolvido = {
  pilarId: string | null;
  /** Agrupamento de onde veio. Igual à própria série quando é dela. */
  origemSerieId: string | null;
  estado: 'proprio' | 'herdado' | 'sem-pilar' | 'vazio';
};

type SeriePilarNo = Pick<Serie, 'id' | 'parentId' | 'pilarPrincipalId' | 'pilarIds' | 'semPilar'>;

/** Pilar que a série usa: o dela, "sem pilar" de propósito, ou o do agrupamento superior. */
export function pilarEfetivoDaSerie(serieId: string, series: readonly SeriePilarNo[]): PilarDaSerieResolvido {
  const porId = new Map(series.map(serie => [serie.id, serie]));
  const vistos = new Set<string>();
  let cursor: string | null | undefined = serieId;
  while (cursor && !vistos.has(cursor)) {
    vistos.add(cursor);
    const serie = porId.get(cursor);
    if (!serie) break;
    const pilar = pilarPrincipalDaSerie(serie);
    if (pilar) {
      return { pilarId: pilar, origemSerieId: serie.id, estado: cursor === serieId ? 'proprio' : 'herdado' };
    }
    if (serie.semPilar) {
      return { pilarId: null, origemSerieId: serie.id, estado: 'sem-pilar' };
    }
    cursor = serie.parentId?.trim() || null;
  }
  return { pilarId: null, origemSerieId: null, estado: 'vazio' };
}

export type ContagemConteudos = {
  /** Ideias e roteiros ativos, cada um uma vez. */
  conteudos: number;
  ideias: number;
  /** Tudo que já passou da ideia, em qualquer etapa. */
  roteiros: number;
  /** Publicações feitas, por conta. Um roteiro em três contas soma três aqui e um em roteiros. */
  publicacoes: number;
};

export const CONTAGEM_VAZIA: ContagemConteudos = { conteudos: 0, ideias: 0, roteiros: 0, publicacoes: 0 };

type ConteudoContavel = Pick<Content, 'id' | 'status' | 'seriesId' | 'archivedAt' | 'deletedAt'>
  & { plataformas?: ReadonlyArray<Pick<NonNullable<Content['plataformas']>[number], 'status'>> | null };

export function ehIdeia(content: Pick<Content, 'status'>): boolean {
  return normalizeContentStatus(content.status) === CONTENT_STATUS.IDEIA;
}

/** Conta uma lista. O mesmo id não entra duas vezes. */
export function contarConteudos(contents: readonly ConteudoContavel[]): ContagemConteudos {
  const vistos = new Set<string>();
  const total = { ...CONTAGEM_VAZIA };
  for (const content of contents) {
    if (!isActiveCreation(content) || vistos.has(content.id)) continue;
    vistos.add(content.id);
    total.conteudos += 1;
    if (ehIdeia(content)) total.ideias += 1;
    else total.roteiros += 1;
    total.publicacoes += (content.plataformas ?? []).filter(publicacaoPublicada).length;
  }
  return total;
}

function somar(a: ContagemConteudos, b: ContagemConteudos): ContagemConteudos {
  return {
    conteudos: a.conteudos + b.conteudos,
    ideias: a.ideias + b.ideias,
    roteiros: a.roteiros + b.roteiros,
    publicacoes: a.publicacoes + b.publicacoes,
  };
}

export type ContagemDaSerie = {
  /** Conteúdos ligados direto a este agrupamento. */
  diretos: ContagemConteudos;
  /** Este agrupamento e todos os descendentes. Cada conteúdo tem uma série só, então não repete. */
  total: ContagemConteudos;
};

/** Contagens de todas as séries: a mesma conta na lista, no detalhe e nas temporadas. */
export function contagensDasSeries(
  series: readonly Pick<Serie, 'id' | 'parentId'>[],
  contents: readonly ConteudoContavel[],
): Map<string, ContagemDaSerie> {
  const porSerie = new Map<string, ConteudoContavel[]>();
  for (const content of contents) {
    const serieId = content.seriesId?.trim();
    if (!serieId) continue;
    const lista = porSerie.get(serieId) ?? [];
    lista.push(content);
    porSerie.set(serieId, lista);
  }
  const diretos = new Map(series.map(serie => [serie.id, contarConteudos(porSerie.get(serie.id) ?? [])]));
  const out = new Map<string, ContagemDaSerie>();
  for (const serie of series) {
    let total = { ...CONTAGEM_VAZIA };
    for (const id of idsDaSubarvore(serie.id, series)) {
      total = somar(total, diretos.get(id) ?? CONTAGEM_VAZIA);
    }
    out.set(serie.id, { diretos: diretos.get(serie.id) ?? { ...CONTAGEM_VAZIA }, total });
  }
  return out;
}

export function plural(quantidade: number, singular: string, varios: string): string {
  return quantidade === 1 ? `1 ${singular}` : `${quantidade} ${varios}`;
}

/** "12 roteiros · 6 ideias". Sem nada: "Nenhum conteúdo". */
export function textoRoteirosIdeias(contagem: ContagemConteudos): string {
  if (contagem.conteudos === 0) return 'Nenhum conteúdo';
  return `${plural(contagem.roteiros, 'roteiro', 'roteiros')} · ${plural(contagem.ideias, 'ideia', 'ideias')}`;
}

export function textoConteudos(quantidade: number): string {
  return plural(quantidade, 'conteúdo', 'conteúdos');
}

/** Descendentes diretos que contam como "quadros" no card (filhos de qualquer tipo). */
export function quantidadeDeFilhos(serieId: string, series: readonly Pick<Serie, 'id' | 'parentId' | 'name'>[]): number {
  return filhosDaSerie(serieId, series).length;
}
