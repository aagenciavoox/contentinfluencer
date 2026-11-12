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
  situacao: FiltroSituacao;
  vista: VistaLista;
};

export const FILTROS_LISTA_PADRAO: FiltrosLista = {
  busca: '',
  tipo: 'todos',
  pilar: 'todos',
  situacao: 'ativas',
  vista: 'cards',
};

/** Filtros que mudam o que aparece (a vista não conta). */
export function filtrosDaListaAtivos(filtros: FiltrosLista): number {
  return [
    filtros.busca.trim() !== '',
    filtros.tipo !== FILTROS_LISTA_PADRAO.tipo,
    filtros.pilar !== FILTROS_LISTA_PADRAO.pilar,
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
   * Passa em busca, pilar e situação, sem o recorte de tipo.
   * No computador, "Todos" monta as seções a partir daqui (incluindo famílias).
   */
  elegiveis: ItemLista[];
  situacoes: Record<FiltroSituacao, number>;
};

/** Ordem das seções na vitrine do computador. */
export const ORDEM_SECOES_VITRINE: readonly SerieTipoAgrupamento[] = ['serie', 'quadro', 'familia'];

export type SecaoVitrine = {
  tipo: SerieTipoAgrupamento;
  itens: ItemLista[];
};

/** Agrupa a página em Séries, Quadros e Famílias. Seção vazia sai. */
export function secoesDaVitrine(itens: readonly ItemLista[]): SecaoVitrine[] {
  return ORDEM_SECOES_VITRINE
    .map(tipo => ({ tipo, itens: itens.filter(item => item.tipo === tipo) }))
    .filter(secao => secao.itens.length > 0);
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
 * Vitrine (Inventário & Projetos): séries e quadros lado a lado, em cards planos.
 * A família continua no banco (e com o ritmo dela), mas não é pasta obrigatória:
 * em "Todos" a lista filtrada traz séries e quadros; famílias entram nas seções
 * do computador (via `elegiveis`) e no filtro "Famílias".
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
  const passaTipo = (item: ItemLista) =>
    // "Todos" é a vitrine de trabalho: séries e quadros. Família só no filtro dela.
    filtros.tipo === 'todos' ? item.tipo !== 'familia' : item.tipo === filtros.tipo;

  const ordenar = (filtradas: Serie[]) => {
    const ordem = busca
      ? [...filtradas].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      : exibirSeriesVisiveis(filtradas, 'agrupada').map(no => no.serie);
    return ordem.map(serie => itens.get(serie.id)!);
  };

  const elegiveis = ordenar(series.filter(serie => passaBase(itens.get(serie.id)!)));
  const visiveis = ordenar(series.filter(serie => {
    const item = itens.get(serie.id)!;
    return passaBase(item) && passaTipo(item);
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
