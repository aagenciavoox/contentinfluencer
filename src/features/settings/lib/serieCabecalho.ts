import { format, parseISO } from 'date-fns';
import type { Content, Serie } from '../../../lib/database.ts';
import { isActiveCreation } from '../../contents/lib/contentWorkflow.ts';
import { etapaDoStatus, type Etapa } from '../../editorial/lib/etapas.ts';
import { contarSerieAgrupada, type ItemContagemSerie, type SerieFrequencia } from '../../editorial/lib/frequenciaAgrupada.ts';
import { lerFrequencia } from '../../editorial/lib/frequenciaSerie.ts';
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
    previstos: number;
    esperado: number;
    /** 0 a 100, só para a barra. O número real fica em `previstos`. */
    barra: number;
  };

const UNIDADE: Record<'semana' | 'quinzena' | 'mes', string> = {
  semana: 'semana',
  quinzena: 'quinzena',
  mes: 'mês',
};

function noPeriodo(modo: ModoPeriodo, dentro: boolean): string {
  if (!dentro) return 'no período selecionado';
  if (modo === 'semana') return 'nesta semana';
  if (modo === 'mes') return 'neste mês';
  if (modo === 'trimestre') return 'neste trimestre';
  return 'no período';
}

/**
 * Meta de planejamento da série com o cálculo atual (contarSerieAgrupada):
 * conta episódios previstos na grade do período, não publicações.
 */
export function metaDoCabecalho({
  serie,
  series,
  itens,
  periodo,
  hoje,
}: {
  serie: SerieFrequencia;
  series: readonly SerieFrequencia[];
  itens: readonly ItemContagemSerie[];
  periodo: { modo: ModoPeriodo; inicio: string; fim: string };
  hoje: string;
}): MetaDoCabecalho {
  const freq = lerFrequencia({
    frequenciaRecomendada: serie.frequenciaRecomendada,
    vezes: serie.frequenciaVezes,
    unidade: serie.frequenciaUnidade,
    aPartirDe: serie.frequenciaAPartirDe,
  });
  if (freq.unidade === 'sob-demanda') return { estado: 'sem-meta', texto: 'Sem meta definida' };
  const vezes = freq.vezes ?? 1;
  const regra = `Meta: ${vezes} por ${UNIDADE[freq.unidade]}`;
  if (freq.aPartirDe && freq.aPartirDe > hoje) {
    return { estado: 'futura', texto: `Começa em ${format(parseISO(freq.aPartirDe), 'dd/MM/yyyy')}`, regra };
  }
  const agrupada = contarSerieAgrupada({ serie, series, itens, inicio: periodo.inicio, fim: periodo.fim });
  const esperado = agrupada.expectativa ?? 0;
  const previstos = agrupada.total;
  const onde = noPeriodo(periodo.modo, hoje >= periodo.inicio && hoje <= periodo.fim);
  const texto = esperado > 0
    ? `${previstos} de ${esperado} ${esperado === 1 ? 'episódio previsto' : 'episódios previstos'} ${onde}`
    : `${previstos} ${previstos === 1 ? 'episódio previsto' : 'episódios previstos'} ${onde} · a meta não pede nenhum`;
  const barra = esperado > 0 ? Math.min(100, Math.round((previstos / esperado) * 100)) : 0;
  return { estado: 'ativa', texto, regra, previstos, esperado, barra };
}
