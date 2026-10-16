import type {Content, Pilar, Serie, Tema} from '../../../lib/database.ts';
import {etiquetasVisiveis} from '../../creation/lib/creationItemPresentation.ts';

type ConteudoFiltravel = Pick<Content, 'seriesId' | 'pilarId' | 'tags' | 'temaIds'>;
type SerieRef = Pick<Serie, 'id' | 'name' | 'pilarPrincipalId'>;
type PilarRef = Pick<Pilar, 'id' | 'nome'>;
type TemaRef = Pick<Tema, 'id' | 'nome'>;

/**
 * Lista vazia = sem filtro. Dentro de cada filtro basta um dos escolhidos;
 * entre filtros, o conteúdo precisa passar em todos. A tag guarda a chave em minúsculas.
 */
export interface FiltroPuxar {
  serieIds: string[];
  pilarIds: string[];
  tags: string[];
}

export interface OpcaoFiltro {
  value: string;
  label: string;
}

export const FILTRO_PUXAR_VAZIO: FiltroPuxar = {serieIds: [], pilarIds: [], tags: []};

export function chaveDaTag(tag: string): string {
  return tag.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
}

/** O mesmo pilar que o post-it mostra: o do conteúdo ou, sem ele, o principal da série. */
export function pilarEfetivo(content: ConteudoFiltravel, series: readonly SerieRef[]): string | null {
  if (content.pilarId) return content.pilarId;
  const serie = content.seriesId ? series.find(item => item.id === content.seriesId) : null;
  return serie?.pilarPrincipalId || null;
}

export function filtroPuxarAtivo(filtro: FiltroPuxar): boolean {
  return filtro.serieIds.length > 0 || filtro.pilarIds.length > 0 || filtro.tags.length > 0;
}

export function passaNoFiltroPuxar(
  content: ConteudoFiltravel,
  filtro: FiltroPuxar,
  series: readonly SerieRef[],
  temas: readonly TemaRef[],
): boolean {
  if (filtro.serieIds.length > 0 && !(content.seriesId && filtro.serieIds.includes(content.seriesId))) return false;
  if (filtro.pilarIds.length > 0) {
    const pilarId = pilarEfetivo(content, series);
    if (!pilarId || !filtro.pilarIds.includes(pilarId)) return false;
  }
  if (filtro.tags.length > 0) {
    const chaves = etiquetasVisiveis(content, temas).map(chaveDaTag);
    if (!filtro.tags.some(tag => chaves.includes(tag))) return false;
  }
  return true;
}

/**
 * Só oferece o que existe entre os conteúdos que podem ser puxados,
 * para nenhuma escolha dar lista vazia logo de cara.
 */
export function opcoesDoFiltroPuxar(
  contents: readonly ConteudoFiltravel[],
  series: readonly SerieRef[],
  pilares: readonly PilarRef[],
  temas: readonly TemaRef[],
): {series: OpcaoFiltro[]; pilares: OpcaoFiltro[]; tags: OpcaoFiltro[]} {
  const serieIds = new Set<string>();
  const pilarIds = new Set<string>();
  const tags = new Map<string, string>();
  for (const content of contents) {
    if (content.seriesId) serieIds.add(content.seriesId);
    const pilarId = pilarEfetivo(content, series);
    if (pilarId) pilarIds.add(pilarId);
    for (const tag of etiquetasVisiveis(content, temas)) {
      const chave = chaveDaTag(tag);
      if (!tags.has(chave)) tags.set(chave, tag);
    }
  }
  return {
    series: series
      .filter(serie => serieIds.has(serie.id))
      .map(serie => ({value: serie.id, label: serie.name}))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    pilares: pilares
      .filter(pilar => pilarIds.has(pilar.id))
      .map(pilar => ({value: pilar.id, label: pilar.nome})),
    tags: [...tags]
      .map(([value, label]) => ({value, label}))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
  };
}
