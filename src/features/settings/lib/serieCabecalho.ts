import { format, parseISO } from 'date-fns';
import type { Content, Serie } from '../../../lib/database.ts';
import { isActiveCreation } from '../../contents/lib/contentWorkflow.ts';
import { etapaDoStatus, type Etapa } from '../../editorial/lib/etapas.ts';
import {
  apurarSerie,
  TEXTO_SEM_ANCORA,
  textoDaFrequencia,
  textoDoVolume,
  textoFrequencia,
  type ItemDaApuracao,
  type SerieDaApuracao,
} from '../../editorial/lib/apuracaoSerie.ts';
import { exclusaoDeMetaPropria, type OndaDaExclusao } from '../../editorial/lib/metaPropria.ts';
import type { ModoPeriodo } from '../../editorial/lib/periodoEditorial.ts';
import { idsDaSubarvore } from '../../editorial/lib/serieArvore.ts';

/** As quatro faixas do cabeçalho. Cada episódio cai em uma só. */
export type FaixaDoCabecalho = 'ideias' | 'roteiros' | 'producao' | 'postados';

export type TotaisDoCabecalho = Record<FaixaDoCabecalho, number> & { total: number };

/**
 * Etapa atual do episódio (pelo status) na faixa do cabeçalho.
 * Edição vem depois da gravação, então conta como Produção.
 */
export function faixaDaEtapa(etapa: Etapa): FaixaDoCabecalho {
  if (etapa === 'ideia' || etapa === 'planejamento') return 'ideias';
  if (etapa === 'producao' || etapa === 'edicao') return 'producao';
  if (etapa === 'postado') return 'postados';
  return 'roteiros';
}

type EpisodioContavel = Pick<Content, 'id' | 'status' | 'seriesId' | 'archivedAt' | 'deletedAt'>;

/**
 * Totais da série e dos quadros dentro dela, sem filtro.
 * Usa só o status do episódio: publicar numa conta não muda a etapa do episódio inteiro.
 */
export function totaisDoCabecalho({
  serieId,
  series,
  contents,
}: {
  serieId: string;
  series: readonly Pick<Serie, 'id' | 'parentId'>[];
  contents: readonly EpisodioContavel[];
}): TotaisDoCabecalho {
  const subarvore = idsDaSubarvore(serieId, series);
  const vistos = new Set<string>();
  const totais: TotaisDoCabecalho = { total: 0, ideias: 0, roteiros: 0, producao: 0, postados: 0 };
  for (const content of contents) {
    if (!content.seriesId || !subarvore.has(content.seriesId)) continue;
    if (!isActiveCreation(content) || vistos.has(content.id)) continue;
    vistos.add(content.id);
    totais.total += 1;
    totais[faixaDaEtapa(etapaDoStatus(content.status))] += 1;
  }
  return totais;
}

export type MetaDoCabecalho =
  | { estado: 'sem-meta'; texto: string }
  | { estado: 'futura'; texto: string; regra: string }
  | {
    estado: 'ativa';
    texto: string;
    regra: string;
    /** Janelas atendidas (episódios bastam; reserva em post-it não conta como atendida). */
    previstos: number;
    /** Janelas conferidas no período. */
    esperado: number;
    /** 0 a 100, só para a barra. */
    barra: number;
  };

function noPeriodo(modo: ModoPeriodo, dentro: boolean): string {
  if (!dentro) return 'no período selecionado';
  if (modo === 'semana') return 'nesta semana';
  if (modo === 'mes') return 'neste mês';
  if (modo === 'trimestre') return 'neste trimestre';
  return 'no período';
}

/**
 * Meta de planejamento da série com a apuração comum (`apurarSerie`), a mesma do Editorial e da Saúde:
 * episódios e reservas com data no período, e a frequência conferida janela a janela.
 * `itens` deve cobrir `janelaDaContinuidade(periodo)`.
 */
export function metaDoCabecalho({
  serie,
  series,
  itens,
  periodo,
  hoje,
  temporadas = [],
}: {
  serie: SerieDaApuracao;
  series: readonly SerieDaApuracao[];
  itens: readonly ItemDaApuracao[];
  periodo: { modo: ModoPeriodo; inicio: string; fim: string };
  hoje: string;
  /** Waves com ritmo próprio e quadros com meta própria saem da conta, como na Saúde. */
  temporadas?: readonly OndaDaExclusao[];
}): MetaDoCabecalho {
  const apuracao = apurarSerie({
    serie,
    series,
    itens,
    periodo,
    excluir: exclusaoDeMetaPropria(serie, series, temporadas),
  });
  const { situacao } = apuracao;
  if (situacao.tipo === 'sem-ancora') return { estado: 'sem-meta', texto: TEXTO_SEM_ANCORA };
  if (situacao.tipo !== 'definida') return { estado: 'sem-meta', texto: 'Sem meta definida' };
  const regra = `Meta: ${textoFrequencia(situacao.freq)}`;
  const aPartirDe = situacao.freq.aPartirDe;
  if (aPartirDe && aPartirDe > hoje) {
    return { estado: 'futura', texto: `Começa em ${format(parseISO(aPartirDe), 'dd/MM/yyyy')}`, regra };
  }
  const onde = noPeriodo(periodo.modo, hoje >= periodo.inicio && hoje <= periodo.fim);
  const volume = `${textoDoVolume(apuracao.noPeriodo)} ${onde}`;
  const esperado = apuracao.janelas.length;
  const previstos = apuracao.janelas.filter(janela => janela.estado === 'atendida').length;
  const texto = esperado > 0 ? `${volume} · ${textoDaFrequencia(apuracao)}` : volume;
  const barra = esperado > 0 ? Math.min(100, Math.round((previstos / esperado) * 100)) : 0;
  return { estado: 'ativa', texto, regra, previstos, esperado, barra };
}
