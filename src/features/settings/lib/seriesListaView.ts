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

export type FiltroTipoLista = 'todos' | SerieTipoAgrupamento;
export type FiltroSituacao = 'ativas' | 'inativas' | 'todas' | 'abertas';
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

export type GrupoFamilia = {
  familia: ItemLista;
  itens: ItemLista[];
};

export type ListaSeries = {
  itens: Map<string, ItemLista>;
  /** O que passa nos filtros, na ordem da árvore (pai antes dos filhos). */
  visiveis: ItemLista[];
  /** Cards por família, mais as séries sem família. Null quando a lista é plana. */
  agrupada: { familias: GrupoFamilia[]; independentes: ItemLista[] } | null;
  situacoes: Record<FiltroSituacao, number>;
};

function semAcento(valor: string): string {
  return valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function passaSituacao(serie: Serie, situacao: FiltroSituacao, emAberto: boolean): boolean {
  if (situacao === 'ativas') return serie.ativa;
  if (situacao === 'inativas') return !serie.ativa;
  if (situacao === 'abertas') return emAberto;
  return true;
}

/**
 * Lista de séries e quadros. Sem busca nem filtro de tipo ou pilar, os cards ficam agrupados
 * por família, e as séries sem família vêm em "Séries independentes". Com filtro, a lista
 * fica plana e cada card diz o tipo e onde está.
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
  const passa = (item: ItemLista) => {
    if (!passaSituacao(item.serie, filtros.situacao, emAberto(item.serie.id))) return false;
    if (filtros.tipo !== 'todos' && item.tipo !== filtros.tipo) return false;
    if (filtros.pilar === 'sem' && item.pilar.pilarId) return false;
    if (filtros.pilar !== 'todos' && filtros.pilar !== 'sem' && item.pilar.pilarId !== filtros.pilar) return false;
    if (!busca) return true;
    const texto = [item.serie.name, item.serie.bordao, item.serie.notes].filter(Boolean).join(' ');
    return semAcento(texto).includes(busca);
  };

  const filtradas = series.filter(serie => passa(itens.get(serie.id)!));
  const ordem = busca
    ? [...filtradas].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    : exibirSeriesVisiveis(filtradas, 'agrupada').map(no => no.serie);
  const visiveis = ordem.map(serie => itens.get(serie.id)!);

  const situacoes: Record<FiltroSituacao, number> = { ativas: 0, inativas: 0, todas: series.length, abertas: 0 };
  for (const serie of series) {
    if (serie.ativa) situacoes.ativas += 1;
    else situacoes.inativas += 1;
    if (emAberto(serie.id)) situacoes.abertas += 1;
  }

  const agrupa = filtros.vista === 'cards'
    && !busca
    && filtros.tipo === 'todos'
    && filtros.pilar === 'todos'
    && (filtros.situacao === 'ativas' || filtros.situacao === 'todas');
  if (!agrupa) return { itens, visiveis, agrupada: null, situacoes };

  const visivel = new Set(visiveis.map(item => item.serie.id));
  const familias: GrupoFamilia[] = [];
  const independentes: ItemLista[] = [];
  const raizes = [...series]
    .filter(serie => !serie.parentId?.trim() || !porId.has(serie.parentId.trim()))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  for (const raiz of raizes) {
    const item = itens.get(raiz.id)!;
    if (item.tipo === 'familia') {
      const filhos = filhosDaSerie(raiz.id, series)
        .filter(filho => visivel.has(filho.id))
        .map(filho => itens.get(filho.id)!);
      if (visivel.has(raiz.id) || filhos.length > 0) familias.push({ familia: item, itens: filhos });
    } else if (visivel.has(raiz.id)) {
      independentes.push(item);
    }
  }
  return { itens, visiveis, agrupada: { familias, independentes }, situacoes };
}

/** "Quadro de Descomplicando Branbran", "Série", "Família". */
export function textoTipoEOnde(item: Pick<ItemLista, 'tipo' | 'pai'>, rotulos: Record<SerieTipoAgrupamento, string>): string {
  const tipo = rotulos[item.tipo];
  const pai = item.pai?.name?.trim();
  return pai ? `${tipo} de ${pai}` : tipo;
}
