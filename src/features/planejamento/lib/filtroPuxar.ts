import type {Content, Pilar, RedeSocial, Serie, Tema} from '../../../lib/database.ts';
import {etiquetasVisiveis} from '../../creation/lib/creationItemPresentation.ts';
import {passaNoFiltroRede} from '../../creation/lib/creationRedeFilter.ts';
import type {RedeDoFiltro} from '../../contas/lib/contas.ts';
import {pilarDoConteudo, type SerieClassificacao} from '../../editorial/lib/herancaSerie.ts';
import {caminhoDaSerie, conteudoNaSubarvore} from '../../editorial/lib/serieArvore.ts';

type ConteudoFiltravel = Pick<Content, 'seriesId' | 'pilarId' | 'tags' | 'temaIds'>
  & Partial<Pick<Content, 'pilarOrigem' | 'classificacaoCongeladaEm'>>;
type SerieRef = Pick<Serie, 'id' | 'name'> & SerieClassificacao & Partial<Pick<Serie, 'parentId'>>;
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
  redes?: RedeDoFiltro[];
}

export interface OpcaoFiltro {
  value: string;
  label: string;
}

export const FILTRO_PUXAR_VAZIO: FiltroPuxar = {serieIds: [], pilarIds: [], tags: [], redes: []};

export function chaveDaTag(tag: string): string {
  return tag.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
}

/** O mesmo pilar da ficha e da Saúde: o gravado ou, vazio sem escolha, o herdado quadro → série. */
export function pilarEfetivo(content: ConteudoFiltravel, series: readonly SerieRef[]): string | null {
  return pilarDoConteudo(content, series);
}

export function filtroPuxarAtivo(filtro: FiltroPuxar): boolean {
  return (
    filtro.serieIds.length > 0 ||
    filtro.pilarIds.length > 0 ||
    filtro.tags.length > 0 ||
    Boolean(filtro.redes && filtro.redes.length > 0)
  );
}

export function passaNoFiltroPuxar(
  content: ConteudoFiltravel,
  filtro: FiltroPuxar,
  series: readonly SerieRef[],
  temas: readonly TemaRef[],
  redesDoConteudo?: readonly RedeDoFiltro[],
): boolean {
  // Escolher a série traz também o que está nos quadros dela.
  if (filtro.serieIds.length > 0 && !filtro.serieIds.some(id => conteudoNaSubarvore(content.seriesId, id, series))) return false;
  if (filtro.pilarIds.length > 0) {
    const pilarId = pilarEfetivo(content, series);
    if (!pilarId || !filtro.pilarIds.includes(pilarId)) return false;
  }
  if (filtro.tags.length > 0) {
    const chaves = etiquetasVisiveis(content, temas).map(chaveDaTag);
    if (!filtro.tags.some(tag => chaves.includes(tag))) return false;
  }
  if (filtro.redes && filtro.redes.length > 0) {
    if (!passaNoFiltroRede(redesDoConteudo, filtro.redes)) return false;
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
    // A série de cima entra mesmo sem conteúdo direto: escolhê-la traz os quadros.
    if (content.seriesId) for (const no of caminhoDaSerie(content.seriesId, series)) serieIds.add(no.id);
    const pilarId = pilarEfetivo(content, series);
    if (pilarId) pilarIds.add(pilarId);
    for (const tag of etiquetasVisiveis(content, temas)) {
      const chave = chaveDaTag(tag);
      if (!tags.has(chave)) tags.set(chave, tag);
    }
  }
  return {
    // Quadro aparece com a série na frente ("Resenhas · Clássicos") e fica logo abaixo dela na lista.
    series: series
      .filter(serie => serieIds.has(serie.id))
      .map(serie => ({value: serie.id, label: caminhoDaSerie(serie.id, series).map(no => no.name?.trim() || 'Sem nome').join(' · ')}))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    pilares: pilares
      .filter(pilar => pilarIds.has(pilar.id))
      .map(pilar => ({value: pilar.id, label: pilar.nome})),
    tags: [...tags]
      .map(([value, label]) => ({value, label}))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
  };
}
