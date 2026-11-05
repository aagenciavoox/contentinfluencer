import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import {
  apurarSerie,
  ehReserva,
  situacaoDaFrequencia,
  type ItemDaApuracao,
  type JanelaApurada,
  type SerieDaApuracao,
  type SituacaoFrequencia,
} from './apuracaoSerie.ts';
import { idsComAncestrais } from './acompanhamento.ts';
import { exclusaoDeMetaPropria, type OndaDaExclusao } from './metaPropria.ts';
import { diasDePausa, type PausaEditorial } from './pausas.ts';
import type { PublicacaoNaAgenda } from './publicacoes.ts';
import { idsDaSubarvore } from './serieArvore.ts';

/**
 * Continuidade por escopo (entrega 2). Cada acompanhamento é conferido à parte:
 * a visão geral lista os escopos sem juntar as metas deles para esconder uma ausência.
 *
 * - O acompanhamento não tem frequência própria: usa a meta da série no mesmo escopo
 *   (serie_meta da conta ou do formato), e, sem ela, a meta geral da série.
 * - Episódio é a primeira ocorrência do conteúdo no escopo, calculada antes de olhar o período:
 *   no geral, a primeira entre as contas; numa conta, a primeira naquela conta. Um novo ciclo na
 *   mesma conta não torna o conteúdo novo de novo.
 * - Post-it é reserva provisória; sem conta, não cobre o escopo de uma conta.
 * - Janela fora do acompanhamento não conta; janela em que ele começa, termina ou pausa é parcial
 *   e não vira dívida inteira; janela toda em pausa não vira falta.
 */

type Intervalo = { inicio: string; fim: string };

const FORMATO = 'yyyy-MM-dd';

/** Uma linha de serie_acompanhamento. */
export type AcompanhamentoSerie = {
  id: string;
  serieId: string;
  escopo: 'geral' | 'conta' | 'formato';
  platformId: string | null;
  formato: string | null;
  ativo: boolean;
  inicio: string | null;
  termino: string | null;
  distanciaMaxDias: number | null;
  evitarDiasSeguidos: boolean;
};

/** Uma linha de serie_meta: frequência da série numa conta ou num formato. */
export type MetaDaSerieNoEscopo = {
  serieId: string;
  platformId: string | null;
  formato: string | null;
  vezes: number;
  unidade: 'semana' | 'quinzena' | 'mes';
  aPartirDe: string | null;
};

/** Post-it com as contas onde vai sair (vazio = só a rede). */
export type ReservaDoEscopo = {
  id: string;
  data: string | null;
  serieId: string | null;
  contaIds: readonly string[];
};

/** A série com a frequência que vale no escopo do acompanhamento. */
export function serieComFrequenciaDoEscopo(
  serie: SerieDaApuracao,
  metas: readonly MetaDaSerieNoEscopo[],
  acompanhamento: Pick<AcompanhamentoSerie, 'escopo' | 'platformId' | 'formato'>,
): SerieDaApuracao {
  if (acompanhamento.escopo === 'geral') return serie;
  const meta = metas.find(item => (
    item.serieId === serie.id
    && (item.platformId ?? null) === (acompanhamento.platformId ?? null)
    && (item.formato ?? null) === (acompanhamento.formato ?? null)
  ));
  if (!meta) return serie;
  return {
    ...serie,
    frequenciaVezes: meta.vezes,
    frequenciaUnidade: meta.unidade,
    frequenciaAPartirDe: meta.aPartirDe,
    frequenciaRecomendada: null,
  };
}

function antes(a: { data: string | null; hora?: string | null }, b: { data: string | null; hora?: string | null }): boolean {
  return `${a.data ?? ''}T${a.hora ?? '99:99'}` < `${b.data ?? ''}T${b.hora ?? '99:99'}`;
}

/**
 * Itens que contam no escopo: a primeira ocorrência de cada conteúdo e as reservas que cobrem o escopo.
 * `itensGrade` cobre os conteúdos sem publicação com data (o acompanhamento geral usa a data da grade).
 */
export function itensDoEscopo(input: {
  acompanhamento: Pick<AcompanhamentoSerie, 'serieId' | 'escopo' | 'platformId' | 'formato'>;
  series: readonly SerieDaApuracao[];
  publicacoes: readonly PublicacaoNaAgenda[];
  itensGrade?: readonly ItemDaApuracao[];
  reservas?: readonly ReservaDoEscopo[];
}): ItemDaApuracao[] {
  const { acompanhamento } = input;
  const ids = idsDaSubarvore(acompanhamento.serieId, input.series);
  ids.add(acompanhamento.serieId);

  const noEscopo = (publicacao: PublicacaoNaAgenda) => {
    if (!publicacao.data || !publicacao.serieId || !ids.has(publicacao.serieId)) return false;
    if (acompanhamento.escopo === 'conta') return publicacao.platformId === acompanhamento.platformId;
    if (acompanhamento.escopo === 'formato') {
      if (publicacao.formato !== acompanhamento.formato) return false;
      return !acompanhamento.platformId || publicacao.platformId === acompanhamento.platformId;
    }
    return true;
  };

  // Primeira ocorrência de cada conteúdo no escopo, olhando todas as datas (não só o período).
  const primeira = new Map<string, PublicacaoNaAgenda>();
  for (const publicacao of input.publicacoes) {
    if (!noEscopo(publicacao)) continue;
    const atual = primeira.get(publicacao.contentId);
    if (!atual || antes(publicacao, atual)) primeira.set(publicacao.contentId, publicacao);
  }
  const itens: ItemDaApuracao[] = [...primeira.values()].map(publicacao => ({
    id: `${publicacao.contentId}@escopo`,
    contentId: publicacao.contentId,
    data: publicacao.data,
    serieId: publicacao.serieId,
    tipo: 'original' as const,
    etapa: publicacao.etapa,
    realizada: publicacao.situacao === 'realizada',
    postItId: null,
  }));

  // No geral, conteúdo sem publicação com data ainda conta pela data da grade.
  if (acompanhamento.escopo === 'geral') {
    const comPublicacao = new Set(input.publicacoes.filter(publicacao => publicacao.data).map(publicacao => publicacao.contentId));
    for (const item of input.itensGrade ?? []) {
      if (ehReserva(item) || item.tipo === 'repost' || !item.data) continue;
      if (!item.serieId || !ids.has(item.serieId) || comPublicacao.has(item.contentId) || primeira.has(item.contentId)) continue;
      itens.push({ ...item, id: `${item.contentId}@grade` });
    }
  }

  // Reservas: no geral, todas; numa conta, só as que têm aquela conta; formato não tem reserva.
  for (const reserva of input.reservas ?? []) {
    if (!reserva.data || !reserva.serieId || !ids.has(reserva.serieId)) continue;
    if (acompanhamento.escopo === 'formato') continue;
    if (acompanhamento.escopo === 'conta' && !reserva.contaIds.includes(acompanhamento.platformId ?? '')) continue;
    itens.push({
      id: `post-it:${reserva.id}`,
      contentId: reserva.id,
      data: reserva.data,
      serieId: reserva.serieId,
      tipo: 'original',
      etapa: 'planejamento',
      postItId: reserva.id,
    });
  }
  return itens;
}

/** Quanto o acompanhamento cobre a janela. */
export type CoberturaDaJanela = 'integral' | 'parcial' | 'pausada';

export type JanelaDoEscopo = JanelaApurada & {
  cobertura: CoberturaDaJanela;
  /** Só a janela integral pode virar falta. */
  cobrada: boolean;
};

export type DistanciaExcessiva = Intervalo & {
  /** Dias sem episódio nem reserva, sem contar dias em pausa. */
  dias: number;
  /** O intervalo chega a datas futuras: falta previsão, não é abandono comprovado. */
  futuro: boolean;
};

export type DiasSeguidos = { dia: string; seguinte: string; contentIds: string[] };

export type EstadoDoAcompanhamento = 'acompanhando' | 'inativo' | 'nao-iniciado' | 'encerrado' | 'pendente';

export type ContinuidadeDoEscopo = {
  acompanhamentoId: string;
  serieId: string;
  escopo: AcompanhamentoSerie['escopo'];
  platformId: string | null;
  formato: string | null;
  estado: EstadoDoAcompanhamento;
  situacao: SituacaoFrequencia;
  janelas: JanelaDoEscopo[];
  faltas: JanelaDoEscopo[];
  reservadas: JanelaDoEscopo[];
  concentrada: boolean;
  semEpisodios: boolean;
  distancias: DistanciaExcessiva[];
  diasSeguidos: DiasSeguidos[];
  itens: ItemDaApuracao[];
};

function diasEntre(inicio: string, fim: string): string[] {
  if (inicio > fim) return [];
  const dias: string[] = [];
  let cursor = parseISO(inicio);
  const termo = parseISO(fim);
  while (cursor <= termo && dias.length < 800) {
    dias.push(format(cursor, FORMATO));
    cursor = addDays(cursor, 1);
  }
  return dias;
}

function diaAntes(dia: string): string {
  return format(addDays(parseISO(dia), -1), FORMATO);
}

function diaDepois(dia: string): string {
  return format(addDays(parseISO(dia), 1), FORMATO);
}

function vazio(acompanhamento: AcompanhamentoSerie, estado: EstadoDoAcompanhamento, situacao: SituacaoFrequencia): ContinuidadeDoEscopo {
  return {
    acompanhamentoId: acompanhamento.id,
    serieId: acompanhamento.serieId,
    escopo: acompanhamento.escopo,
    platformId: acompanhamento.platformId,
    formato: acompanhamento.formato,
    estado,
    situacao,
    janelas: [],
    faltas: [],
    reservadas: [],
    concentrada: false,
    semEpisodios: false,
    distancias: [],
    diasSeguidos: [],
    itens: [],
  };
}

/**
 * Intervalos longos demais sem episódio. Usa o episódio logo antes e logo depois do período quando existem;
 * não passa do fim do período nem do término do acompanhamento, e dias em pausa não contam.
 */
export function distanciasExcessivas(input: {
  datas: readonly string[];
  periodo: Intervalo;
  limiteDias: number;
  inicioAcompanhamento: string | null;
  terminoAcompanhamento: string | null;
  diasPausados: ReadonlySet<string>;
  hoje: string;
}): DistanciaExcessiva[] {
  const datas = [...new Set(input.datas)].sort();
  const inicioHorizonte = input.inicioAcompanhamento && input.inicioAcompanhamento > input.periodo.inicio ? input.inicioAcompanhamento : input.periodo.inicio;
  const fimHorizonte = input.terminoAcompanhamento && input.terminoAcompanhamento < input.periodo.fim ? input.terminoAcompanhamento : input.periodo.fim;
  if (inicioHorizonte > fimHorizonte) return [];
  const anterior = [...datas].reverse().find(dia => dia < inicioHorizonte) ?? null;
  const dentro = datas.filter(dia => dia >= inicioHorizonte && dia <= fimHorizonte);
  const pontos = [...(anterior ? [anterior] : []), ...dentro];

  const lacunas: Intervalo[] = [];
  if (pontos.length === 0) {
    lacunas.push({ inicio: inicioHorizonte, fim: fimHorizonte });
  } else {
    if (!anterior) lacunas.push({ inicio: inicioHorizonte, fim: diaAntes(pontos[0]) });
    for (let i = 1; i < pontos.length; i += 1) lacunas.push({ inicio: diaDepois(pontos[i - 1]), fim: diaAntes(pontos[i]) });
    // Depois do último: até o fim do horizonte, não além.
    lacunas.push({ inicio: diaDepois(pontos[pontos.length - 1]), fim: fimHorizonte });
  }

  const excessivas: DistanciaExcessiva[] = [];
  for (const lacuna of lacunas) {
    const inicio = lacuna.inicio < inicioHorizonte ? inicioHorizonte : lacuna.inicio;
    if (inicio > lacuna.fim) continue;
    const semPausa = diasEntre(lacuna.inicio, lacuna.fim).filter(dia => !input.diasPausados.has(dia)).length;
    if (semPausa <= input.limiteDias) continue;
    excessivas.push({ inicio, fim: lacuna.fim, dias: semPausa, futuro: lacuna.fim > input.hoje });
  }
  return excessivas;
}

/**
 * Continuidade de um acompanhamento no período. Acompanhamento desligado, que ainda não começou
 * ou que já terminou não gera cobrança.
 */
export function continuidadeDoAcompanhamento(input: {
  acompanhamento: AcompanhamentoSerie;
  series: readonly SerieDaApuracao[];
  metas?: readonly MetaDaSerieNoEscopo[];
  publicacoes: readonly PublicacaoNaAgenda[];
  itensGrade?: readonly ItemDaApuracao[];
  reservas?: readonly ReservaDoEscopo[];
  periodo: Intervalo;
  pausas?: readonly PausaEditorial[];
  /** Waves da série: as com ritmo próprio saem da conta do escopo. */
  temporadas?: readonly OndaDaExclusao[];
  hoje: string;
}): ContinuidadeDoEscopo | null {
  const { acompanhamento, periodo } = input;
  const serie = input.series.find(item => item.id === acompanhamento.serieId);
  if (!serie) return null;
  const serieDoEscopo = serieComFrequenciaDoEscopo(serie, input.metas ?? [], acompanhamento);
  const situacao = situacaoDaFrequencia(serieDoEscopo);

  if (!acompanhamento.ativo) return vazio(acompanhamento, 'inativo', situacao);
  if (acompanhamento.inicio && acompanhamento.inicio > periodo.fim) return vazio(acompanhamento, 'nao-iniciado', situacao);
  if (acompanhamento.termino && acompanhamento.termino < periodo.inicio) return vazio(acompanhamento, 'encerrado', situacao);
  if (situacao.tipo !== 'definida') return vazio(acompanhamento, 'pendente', situacao);

  const itens = itensDoEscopo({
    acompanhamento,
    series: input.series,
    publicacoes: input.publicacoes,
    itensGrade: input.itensGrade,
    reservas: input.reservas,
  });
  // Quadro com meta própria e wave com ritmo próprio contam só na linha deles, como na linha geral.
  const excluir = exclusaoDeMetaPropria(serie, input.series, input.temporadas ?? []);
  const apuracao = apurarSerie({ serie: serieDoEscopo, series: input.series, itens, periodo, excluir });
  if (apuracao.inicioFuturo) return vazio(acompanhamento, 'nao-iniciado', situacao);

  // Pausa da própria série, de um filho ou da série acima: quadro com meta própria não é cobrado com o pai em pausa.
  const ids = idsDaSubarvore(acompanhamento.serieId, input.series);
  for (const id of idsComAncestrais(acompanhamento.serieId, input.series)) ids.add(id);
  const alvo = { tipo: 'serie' as const, serieIds: ids };
  const pausas = input.pausas ?? [];

  const janelas: JanelaDoEscopo[] = apuracao.janelas
    // Janela inteira fora do acompanhamento: não entra.
    .filter(janela => !(acompanhamento.inicio && janela.fim < acompanhamento.inicio))
    .filter(janela => !(acompanhamento.termino && janela.inicio > acompanhamento.termino))
    .map(janela => {
      const pausados = diasDePausa(pausas, alvo, janela).length;
      const total = differenceInCalendarDays(parseISO(janela.fim), parseISO(janela.inicio)) + 1;
      const cortadaPeloAcompanhamento = Boolean(
        (acompanhamento.inicio && acompanhamento.inicio > janela.inicio)
        || (acompanhamento.termino && acompanhamento.termino < janela.fim),
      );
      const cobertura: CoberturaDaJanela = pausados >= total ? 'pausada'
        : pausados > 0 || cortadaPeloAcompanhamento ? 'parcial' : 'integral';
      return { ...janela, cobertura, cobrada: cobertura === 'integral' };
    });

  const cobradas = janelas.filter(janela => janela.cobrada);
  const faltas = cobradas.filter(janela => janela.estado === 'abaixo' || janela.estado === 'vazia');
  const meta = situacao.freq.vezes ?? 1;

  const diasPausados = new Set(diasDePausa(pausas, alvo, {
    inicio: format(addDays(parseISO(periodo.inicio), -400), FORMATO),
    fim: periodo.fim,
  }));
  const datas = itens.flatMap(item => (item.data ? [item.data.slice(0, 10)] : []));
  const distancias = acompanhamento.distanciaMaxDias
    ? distanciasExcessivas({
      datas,
      periodo,
      limiteDias: acompanhamento.distanciaMaxDias,
      inicioAcompanhamento: acompanhamento.inicio,
      terminoAcompanhamento: acompanhamento.termino,
      diasPausados,
      hoje: input.hoje,
    })
    : [];

  // Dias seguidos só avisa quando a regra foi ligada no acompanhamento.
  const diasSeguidos = acompanhamento.evitarDiasSeguidos ? diasSeguidosDosItens(itens, periodo) : [];

  return {
    acompanhamentoId: acompanhamento.id,
    serieId: acompanhamento.serieId,
    escopo: acompanhamento.escopo,
    platformId: acompanhamento.platformId,
    formato: acompanhamento.formato,
    estado: 'acompanhando',
    situacao,
    janelas,
    faltas,
    reservadas: cobradas.filter(janela => janela.estado === 'reservada'),
    concentrada: cobradas.some(janela => janela.episodios + janela.reservas > meta) && cobradas.some(janela => janela.estado === 'vazia'),
    semEpisodios: cobradas.length > 0 && cobradas.every(janela => janela.estado === 'vazia'),
    distancias,
    diasSeguidos,
    itens: apuracao.itens,
  };
}

/** Episódios em dias seguidos dentro do período (regra opcional do acompanhamento). */
export function diasSeguidosDosItens(
  itens: readonly Pick<ItemDaApuracao, 'data' | 'contentId'>[],
  periodo: Intervalo,
): DiasSeguidos[] {
  const porDia = new Map<string, string[]>();
  for (const item of itens) {
    const dia = item.data?.slice(0, 10);
    if (!dia || dia < periodo.inicio || dia > periodo.fim) continue;
    porDia.set(dia, [...(porDia.get(dia) ?? []), item.contentId]);
  }
  const dias = [...porDia.keys()].sort();
  const seguidos: DiasSeguidos[] = [];
  for (let i = 1; i < dias.length; i += 1) {
    if (diaDepois(dias[i - 1]) !== dias[i]) continue;
    seguidos.push({ dia: dias[i - 1], seguinte: dias[i], contentIds: [...porDia.get(dias[i - 1])!, ...porDia.get(dias[i])!] });
  }
  return seguidos;
}

/** Todos os acompanhamentos, cada um no próprio escopo. A visão geral não soma as metas deles. */
export function continuidadePorEscopo(input: Omit<Parameters<typeof continuidadeDoAcompanhamento>[0], 'acompanhamento'> & {
  acompanhamentos: readonly AcompanhamentoSerie[];
}): ContinuidadeDoEscopo[] {
  return input.acompanhamentos.flatMap(acompanhamento => {
    const resultado = continuidadeDoAcompanhamento({ ...input, acompanhamento });
    return resultado ? [resultado] : [];
  });
}
