import type { Content, Serie, SerieTipoAgrupamento } from '../../../lib/database.ts';
import { exibirSeriesVisiveis } from '../../editorial/lib/serieLista.ts';
import { filhosDaSerie } from '../../editorial/lib/serieArvore.ts';
import {
  CONTAGEM_VAZIA,
  contagensDasSeries,
  pilarEfetivoDaSerie,
  tiposDasSeries,
  type ContagemConteudos,
  type PilarDaSerieResolvido,
} from './serieAgrupamento.ts';
import { emRascunho, ROTULO_STATUS, statusDaSerie } from './statusSerie.ts';

export type FiltroTipoLista = 'todos' | SerieTipoAgrupamento;
export type FiltroSituacao = 'ativas' | 'rascunho' | 'inativas' | 'todas' | 'abertas';
export type VistaLista = 'cards' | 'lista';

export type FiltrosLista = {
  busca: string;
  tipo: FiltroTipoLista;
  /** 'todos', 'sem' ou o id do pilar. */
  pilar: string;
  /** 'todas' ou o id da família. */
  familia: string;
  situacao: FiltroSituacao;
  vista: VistaLista;
};

export const FILTROS_LISTA_PADRAO: FiltrosLista = {
  busca: '',
  tipo: 'todos',
  pilar: 'todos',
  familia: 'todas',
  situacao: 'ativas',
  vista: 'cards',
};

export const ID_SECAO_AVULSOS = 'avulsos';

/** Filtros que mudam o que aparece (a vista não conta). */
export function filtrosDaListaAtivos(filtros: FiltrosLista): number {
  return [
    filtros.busca.trim() !== '',
    filtros.tipo !== FILTROS_LISTA_PADRAO.tipo,
    filtros.pilar !== FILTROS_LISTA_PADRAO.pilar,
    filtros.familia !== FILTROS_LISTA_PADRAO.familia,
    filtros.situacao !== FILTROS_LISTA_PADRAO.situacao,
  ].filter(Boolean).length;
}

export type ItemLista = {
  serie: Serie;
  tipo: SerieTipoAgrupamento;
  pai: Serie | null;
  /** Todos os conteúdos da subárvore, cada um uma vez. */
  contagem: ContagemConteudos;
  filhos: number;
  pilar: PilarDaSerieResolvido;
  profundidade: number;
};

export type ListaSeries = {
  itens: Map<string, ItemLista>;
  /** O que passa nos filtros, na ordem da árvore (série antes dos quadros dela). */
  visiveis: ItemLista[];
  /**
   * Passa em busca, pilar, família e situação, sem o recorte de tipo.
   * Inclui as famílias, para montar as seções e os chips.
   */
  elegiveis: ItemLista[];
  situacoes: Record<FiltroSituacao, number>;
};

/** Família ancestral do item (a própria, se ele for a família). */
export function idDaFamiliaDoItem(item: ItemLista, itens: Map<string, ItemLista>): string | null {
  let cursor: ItemLista | undefined = item;
  const vistos = new Set<string>();
  while (cursor) {
    if (vistos.has(cursor.serie.id)) break;
    vistos.add(cursor.serie.id);
    if (cursor.tipo === 'familia') return cursor.serie.id;
    const paiId = cursor.serie.parentId?.trim();
    cursor = paiId ? itens.get(paiId) : undefined;
  }
  return null;
}

export type SecaoFamiliaVitrine = {
  id: string;
  titulo: string;
  itens: ItemLista[];
  familia: ItemLista | null;
};

/**
 * Agrupa séries e quadros por família, como gavetas na mesma página.
 * Família não entra como card: vira o cabeçalho da seção. Avulsos vão por último.
 */
export function secoesPorFamilia(itens: readonly ItemLista[], porId: Map<string, ItemLista>): SecaoFamiliaVitrine[] {
  const trabalho = itens.filter(item => item.tipo !== 'familia');
  const porFamilia = new Map<string, ItemLista[]>();
  const avulsos: ItemLista[] = [];
  for (const item of trabalho) {
    const familiaId = idDaFamiliaDoItem(item, porId);
    if (!familiaId) {
      avulsos.push(item);
      continue;
    }
    const lista = porFamilia.get(familiaId) ?? [];
    lista.push(item);
    porFamilia.set(familiaId, lista);
  }
  const familias = [...porFamilia.keys()]
    .map(id => porId.get(id))
    .filter((item): item is ItemLista => Boolean(item))
    .sort((a, b) => a.serie.name.localeCompare(b.serie.name, 'pt-BR'));
  const secoes: SecaoFamiliaVitrine[] = familias.map(familia => ({
    id: familia.serie.id,
    titulo: `Família: ${familia.serie.name.trim() || 'Sem nome'}`,
    itens: porFamilia.get(familia.serie.id) ?? [],
    familia,
  }));
  if (avulsos.length > 0) {
    secoes.push({ id: ID_SECAO_AVULSOS, titulo: 'Outros / Avulsos', itens: avulsos, familia: null });
  }
  return secoes.filter(secao => secao.itens.length > 0);
}

/** Famílias da lista, para os chips de filtro rápido. */
export function familiasParaFiltro(itens: Map<string, ItemLista>): ItemLista[] {
  return [...itens.values()]
    .filter(item => item.tipo === 'familia')
    .sort((a, b) => a.serie.name.localeCompare(b.serie.name, 'pt-BR'));
}

function semAcento(valor: string): string {
  return valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Rascunho tem filtro próprio e não aparece em Inativas (que fica só com as arquivadas). */
export function passaSituacao(serie: Serie, situacao: FiltroSituacao, emAberto: boolean): boolean {
  if (situacao === 'ativas') return serie.ativa;
  if (situacao === 'rascunho') return emRascunho(serie);
  if (situacao === 'inativas') return !serie.ativa && !emRascunho(serie);
  if (situacao === 'abertas') return emAberto;
  return true;
}

/**
 * Vitrine (Inventário & Projetos): séries e quadros agrupados por família (pasta visual).
 * Família é opcional: quem não tem vai para "Outros / Avulsos".
 * O pilar filtra séries e quadros (o do quadro é herdado da série quando não tem o dele).
 */
export function montarListaSeries({
  series,
  contents,
  filtros,
  emAberto = () => false,
}: {
  series: readonly Serie[];
  contents: readonly Content[];
  filtros: FiltrosLista;
  emAberto?: (serieId: string) => boolean;
}): ListaSeries {
  const tipos = tiposDasSeries(series);
  const contagens = contagensDasSeries(series, contents);
  const porId = new Map(series.map(serie => [serie.id, serie]));
  const profundidades = new Map(exibirSeriesVisiveis([...series], 'agrupada').map(no => [no.serie.id, no.profundidade]));

  const itens = new Map<string, ItemLista>();
  for (const serie of series) {
    const paiId = serie.parentId?.trim();
    itens.set(serie.id, {
      serie,
      tipo: tipos.get(serie.id) ?? 'serie',
      pai: paiId ? porId.get(paiId) ?? null : null,
      contagem: contagens.get(serie.id)?.total ?? CONTAGEM_VAZIA,
      filhos: filhosDaSerie(serie.id, series).length,
      pilar: pilarEfetivoDaSerie(serie.id, series),
      profundidade: profundidades.get(serie.id) ?? 0,
    });
  }

  const busca = semAcento(filtros.busca.trim());
  const passaBase = (item: ItemLista) => {
    if (!passaSituacao(item.serie, filtros.situacao, emAberto(item.serie.id))) return false;
    if (filtros.pilar === 'sem' && item.pilar.pilarId) return false;
    if (filtros.pilar !== 'todos' && filtros.pilar !== 'sem' && item.pilar.pilarId !== filtros.pilar) return false;
    if (!busca) return true;
    const texto = [item.serie.name, item.serie.notes].filter(Boolean).join(' ');
    return semAcento(texto).includes(busca);
  };
  const passaFamilia = (item: ItemLista) => {
    if (filtros.familia === 'todas' || item.tipo === 'familia') return true;
    const familiaId = idDaFamiliaDoItem(item, itens);
    if (filtros.familia === ID_SECAO_AVULSOS) return !familiaId;
    return familiaId === filtros.familia;
  };
  const passaTipo = (item: ItemLista) => {
    // "Todos" e o antigo filtro "Famílias": a vitrine mostra séries e quadros nas gavetas.
    if (filtros.tipo === 'todos' || filtros.tipo === 'familia') return item.tipo !== 'familia';
    return item.tipo === filtros.tipo;
  };

  const ordenar = (filtradas: Serie[]) => {
    const ordem = busca
      ? [...filtradas].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      : exibirSeriesVisiveis(filtradas, 'agrupada').map(no => no.serie);
    return ordem.map(serie => itens.get(serie.id)!);
  };

  const elegiveis = ordenar(series.filter(serie => {
    const item = itens.get(serie.id)!;
    return passaBase(item) && passaFamilia(item);
  }));
  const visiveis = ordenar(series.filter(serie => {
    const item = itens.get(serie.id)!;
    return passaBase(item) && passaFamilia(item) && passaTipo(item);
  }));

  const situacoes: Record<FiltroSituacao, number> = { ativas: 0, rascunho: 0, inativas: 0, todas: series.length, abertas: 0 };
  for (const serie of series) {
    if (serie.ativa) situacoes.ativas += 1;
    else if (emRascunho(serie)) situacoes.rascunho += 1;
    else situacoes.inativas += 1;
    if (emAberto(serie.id)) situacoes.abertas += 1;
  }

  return { itens, visiveis, elegiveis, situacoes };
}

/** "Quadro de Descomplicando Branbran", "Série", "Família". */
export function textoTipoEOnde(item: Pick<ItemLista, 'tipo' | 'pai'>, rotulos: Record<SerieTipoAgrupamento, string>): string {
  const tipo = rotulos[item.tipo];
  const pai = item.pai?.name?.trim();
  return pai ? `${tipo} de ${pai}` : tipo;
}

/**
 * Etiqueta do card: tipo e status. Quadro ativo é "Sob demanda" (não tem meta);
 * os status continuam os mesmos do banco (rascunho, ativa, arquivada).
 */
export function etiquetaDoCard(item: Pick<ItemLista, 'tipo' | 'serie'>, rotulos: Record<SerieTipoAgrupamento, string>): string {
  const status = statusDaSerie(item.serie);
  if (item.tipo === 'quadro') {
    const situacao = status === 'ativa' ? 'Sob demanda' : status === 'arquivada' ? 'Arquivado' : ROTULO_STATUS[status];
    return `${rotulos.quadro} · ${situacao}`;
  }
  return `${rotulos[item.tipo]} · ${ROTULO_STATUS[status]}`;
}
