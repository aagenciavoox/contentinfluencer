import { addDays, differenceInCalendarDays, endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import type { Serie } from '../../../lib/database.ts';
import { lerFrequencia, type FrequenciaSerie } from './frequenciaSerie.ts';
import { semanaDe, semanasNoIntervalo } from './periodoEditorial.ts';
import { idsDaSubarvore } from './serieArvore.ts';

/**
 * Apuração de uma série (ou quadro) num período: a mesma conta para o Editorial,
 * o painel do Planejamento, os avisos e a Continuidade da Saúde.
 *
 * - Episódio é o conteúdo da série ou de um quadro dela, contado uma vez.
 * - Repost não é episódio novo: fica fora desta apuração.
 * - Post-it sem conteúdo é reserva provisória, nunca episódio.
 * - A frequência é conferida janela a janela (semana, ciclo de 14 dias, mês), cada janela inteira.
 * - Os totais do período só contam as datas do período; episódio fora dele ajuda a janela e aparece à parte.
 */

const FORMATO = 'yyyy-MM-dd';

type Intervalo = { inicio: string; fim: string };

/** O mínimo de um item do período (GradeEntry serve). */
export type ItemDaApuracao = {
  id: string;
  contentId: string;
  data: string | null;
  serieId: string | null;
  tipo?: 'original' | 'repost';
  etapa?: string;
  realizada?: boolean;
  postItId?: string | null;
  /** Temporada do episódio. A wave isolada só conta os itens daquela temporada. */
  temporadaId?: string | null;
};

export type SerieDaApuracao = Pick<
  Serie,
  'id' | 'name' | 'parentId' | 'frequenciaRecomendada' | 'frequenciaVezes' | 'frequenciaUnidade' | 'frequenciaAPartirDe'
> & Partial<Pick<Serie, 'tipoAgrupamento' | 'ativa' | 'acompanharContinuidade' | 'acompanhamentos'>>;

export type FrequenciaDefinida = FrequenciaSerie & { unidade: 'semana' | 'quinzena' | 'mes' };

export type SituacaoFrequencia =
  | { tipo: 'definida'; freq: FrequenciaDefinida }
  | { tipo: 'sem-ancora'; freq: FrequenciaDefinida }
  | { tipo: 'sem-frequencia' }
  | { tipo: 'incompleta' }
  | { tipo: 'sob-demanda' };

function chave(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

const UNIDADES = new Set(['semana', 'semanal', 'quinzena', 'quinzenal', 'mes', 'mensal', 'sob demanda']);

/**
 * Lê a frequência como lerFrequencia, mas separa o que falta configurar:
 * número sem unidade é "incompleta"; nada cadastrado é "sem frequência";
 * ciclo de 14 dias sem data de início é "sem âncora" (não dá para saber onde cada ciclo começa).
 */
export function situacaoDaFrequencia(serie: Pick<SerieDaApuracao, 'frequenciaRecomendada' | 'frequenciaVezes' | 'frequenciaUnidade' | 'frequenciaAPartirDe'>): SituacaoFrequencia {
  const unidade = chave(serie.frequenciaUnidade);
  const vezes = serie.frequenciaVezes;
  const temVezes = typeof vezes === 'number' && Number.isFinite(vezes) && vezes > 0;
  if (temVezes && !UNIDADES.has(unidade)) return { tipo: 'incompleta' };
  const legado = chave(serie.frequenciaRecomendada);
  if (unidade === 'sob demanda' || (!unidade && legado === 'sob demanda')) return { tipo: 'sob-demanda' };
  const freq = lerFrequencia({
    frequenciaRecomendada: serie.frequenciaRecomendada,
    vezes: serie.frequenciaVezes,
    unidade: serie.frequenciaUnidade,
    aPartirDe: serie.frequenciaAPartirDe,
  });
  if (freq.unidade === 'sob-demanda') return { tipo: 'sem-frequencia' };
  const definida = freq as FrequenciaDefinida;
  if (definida.unidade === 'quinzena' && !definida.aPartirDe) return { tipo: 'sem-ancora', freq: definida };
  return { tipo: 'definida', freq: definida };
}

export const TEXTO_SEM_ANCORA = 'Defina o início dos ciclos de 14 dias';

/** "2× por semana", "1× a cada 14 dias", "1× por mês". */
export function textoFrequencia(freq: FrequenciaSerie): string {
  const vezes = freq.vezes ?? 1;
  if (freq.unidade === 'quinzena') return `${vezes}× a cada 14 dias`;
  return `${vezes}× por ${freq.unidade === 'semana' ? 'semana' : 'mês'}`;
}

/**
 * Janelas inteiras que tocam o período: semanas domingo-sábado, meses do calendário,
 * ciclos de 14 dias a partir do início da meta. Antes do início da meta, nada.
 */
export function intervalosDaFrequencia(freq: FrequenciaDefinida, periodo: Intervalo): Intervalo[] {
  const aPartirDe = freq.aPartirDe;
  const inicio = aPartirDe && aPartirDe > periodo.inicio ? aPartirDe : periodo.inicio;
  const fim = periodo.fim;
  if (inicio > fim) return [];
  let lista: Intervalo[] = [];
  if (freq.unidade === 'semana') {
    lista = semanasNoIntervalo(inicio, fim).map(semana => ({ inicio: semana.inicio, fim: semana.fim }));
  } else if (freq.unidade === 'mes') {
    let cursor = startOfMonth(parseISO(inicio));
    while (format(cursor, FORMATO) <= fim) {
      lista.push({ inicio: format(cursor, FORMATO), fim: format(endOfMonth(cursor), FORMATO) });
      cursor = addDays(endOfMonth(cursor), 1);
    }
  } else {
    // Sem âncora não há ciclo: quem chama trata como pendência antes de chegar aqui.
    if (!aPartirDe) return [];
    const ancora = parseISO(aPartirDe);
    const passos = Math.floor(differenceInCalendarDays(parseISO(inicio), ancora) / 14);
    let cursor = addDays(ancora, passos * 14);
    while (format(cursor, FORMATO) <= fim) {
      lista.push({ inicio: format(cursor, FORMATO), fim: format(addDays(cursor, 13), FORMATO) });
      cursor = addDays(cursor, 14);
    }
  }
  return aPartirDe ? lista.filter(intervalo => intervalo.inicio >= aPartirDe) : lista;
}

/** Janela de datas que os intervalos inteiros podem alcançar: buscar os itens nela. */
export function janelaDaContinuidade(periodo: Intervalo): Intervalo {
  const ini = [semanaDe(periodo.inicio).inicio, format(startOfMonth(parseISO(periodo.inicio)), FORMATO),
    format(addDays(parseISO(periodo.inicio), -13), FORMATO)].sort()[0];
  const fim = [semanaDe(periodo.fim).fim, format(endOfMonth(parseISO(periodo.fim)), FORMATO),
    format(addDays(parseISO(periodo.fim), 13), FORMATO)].sort().reverse()[0];
  return { inicio: ini, fim };
}

function curta(data: string): string {
  return format(parseISO(data), 'dd/MM');
}

const NOME_UNIDADE = { semana: 'semana', quinzena: 'ciclo de 14 dias', mes: 'mês' } as const;

function notaDoIntervalo(unidade: 'semana' | 'quinzena' | 'mes', intervalo: Intervalo, periodo: Intervalo): string | null {
  const motivos: string[] = [];
  if (intervalo.inicio < periodo.inicio) motivos.push('começa antes do período');
  if (intervalo.fim > periodo.fim) motivos.push('termina depois do período');
  if (unidade !== 'mes' && intervalo.inicio.slice(0, 7) !== intervalo.fim.slice(0, 7)) motivos.push('atravessa dois meses');
  if (motivos.length === 0) return null;
  const inteira = unidade === 'semana' ? 'avaliada inteira' : 'avaliado inteiro';
  return `${NOME_UNIDADE[unidade]} ${curta(intervalo.inicio)}–${curta(intervalo.fim)} ${inteira} (${motivos.join(', ')})`;
}

/**
 * Estado da janela: atendida (episódios bastam), reservada (só com post-it chega à meta,
 * conteúdo a desenvolver), abaixo (falta mesmo contando reservas) ou vazia.
 */
export type EstadoDaJanela = 'atendida' | 'reservada' | 'abaixo' | 'vazia';

export type JanelaApurada = {
  inicio: string;
  fim: string;
  meta: number;
  episodios: number;
  reservas: number;
  /** Episódios e reservas da janela com data fora do período analisado. */
  foraDoPeriodo: number;
  estado: EstadoDaJanela;
  /** "semana 28/09–04/10 avaliada inteira (começa antes do período)". */
  nota: string | null;
};

export type ContagemNoPeriodo = {
  /** Conteúdos da série com data no período (inclui publicados). */
  episodios: number;
  reservas: number;
  publicados: number;
};

export type ApuracaoDaSerie<T extends ItemDaApuracao = ItemDaApuracao> = {
  serieId: string;
  situacao: SituacaoFrequencia;
  /** Meta começa depois do fim do período: nada a conferir ainda. */
  inicioFuturo: string | null;
  /** Só com datas do período. */
  noPeriodo: ContagemNoPeriodo;
  janelas: JanelaApurada[];
  /** Soma das metas das janelas conferidas. */
  metaDasJanelas: number;
  /** Janelas sem episódio suficiente, mesmo contando reservas. */
  faltas: JanelaApurada[];
  /** Janelas que só chegam à meta por post-it. */
  reservadas: JanelaApurada[];
  /** Mais que a meta numa janela enquanto outra ficou vazia. */
  concentrada: boolean;
  /** Nenhum episódio nem reserva em nenhuma janela conferida. */
  semEpisodios: boolean;
  /** Episódios e reservas fora do período que contaram para alguma janela. */
  foraDoPeriodo: number;
  /** Itens das janelas (episódios e reservas), por data. */
  itens: T[];
};

/**
 * O que fica fora da conta da série: quadros com meta própria (e os filhos deles)
 * e waves com ritmo próprio. Ver exclusaoDeMetaPropria (metaPropria.ts).
 */
export type ExclusaoDaApuracao = {
  serieIds?: ReadonlySet<string>;
  temporadaIds?: ReadonlySet<string>;
};

/** Post-it sem conteúdo ligado (ou cujo conteúdo sumiu): reserva provisória. */
export function ehReserva(item: Pick<ItemDaApuracao, 'postItId' | 'etapa'>): boolean {
  return Boolean(item.postItId) && item.etapa === 'planejamento';
}

function dentro(data: string, intervalo: Intervalo): boolean {
  return data >= intervalo.inicio && data <= intervalo.fim;
}

/**
 * Apura uma série no período. `itens` deve cobrir `janelaDaContinuidade(periodo)` para
 * as janelas das pontas serem conferidas inteiras; os totais do período não passam das datas dele.
 */
export function apurarSerie<T extends ItemDaApuracao>(input: {
  serie: SerieDaApuracao;
  series: readonly SerieDaApuracao[];
  itens: readonly T[];
  periodo: Intervalo;
  /** Itens com meta própria em outra linha: não contam aqui. */
  excluir?: ExclusaoDaApuracao;
}): ApuracaoDaSerie<T> {
  const { serie, series, periodo } = input;
  const ids = idsDaSubarvore(serie.id, series);
  ids.add(serie.id);
  for (const id of input.excluir?.serieIds ?? []) {
    if (id === serie.id) continue;
    for (const filho of idsDaSubarvore(id, series)) ids.delete(filho);
    ids.delete(id);
  }
  const ondasFora = input.excluir?.temporadaIds;

  // Episódio uma vez: repost fica fora; o mesmo conteúdo não entra duas vezes.
  const vistos = new Set<string>();
  const daSerie: T[] = [];
  for (const item of input.itens) {
    if (!item.serieId || !ids.has(item.serieId) || !item.data) continue;
    if (item.tipo === 'repost') continue;
    if (item.temporadaId && ondasFora?.has(item.temporadaId)) continue;
    const chaveItem = ehReserva(item) ? `reserva:${item.id}` : `conteudo:${item.contentId}`;
    if (vistos.has(chaveItem)) continue;
    vistos.add(chaveItem);
    daSerie.push(item);
  }

  const noPeriodo: ContagemNoPeriodo = { episodios: 0, reservas: 0, publicados: 0 };
  for (const item of daSerie) {
    if (!dentro(item.data!.slice(0, 10), periodo)) continue;
    if (ehReserva(item)) noPeriodo.reservas += 1;
    else {
      noPeriodo.episodios += 1;
      if (item.realizada) noPeriodo.publicados += 1;
    }
  }

  const situacao = situacaoDaFrequencia(serie);
  const base = {
    serieId: serie.id,
    situacao,
    noPeriodo,
    janelas: [] as JanelaApurada[],
    metaDasJanelas: 0,
    faltas: [] as JanelaApurada[],
    reservadas: [] as JanelaApurada[],
    concentrada: false,
    semEpisodios: false,
    foraDoPeriodo: 0,
  };
  const porData = (a: T, b: T) => (a.data ?? '').localeCompare(b.data ?? '');

  if (situacao.tipo !== 'definida') {
    return { ...base, inicioFuturo: null, itens: daSerie.filter(item => dentro(item.data!.slice(0, 10), periodo)).sort(porData) };
  }
  const aPartirDe = situacao.freq.aPartirDe;
  if (aPartirDe && aPartirDe > periodo.fim) {
    return { ...base, inicioFuturo: aPartirDe, itens: daSerie.filter(item => dentro(item.data!.slice(0, 10), periodo)).sort(porData) };
  }

  const meta = situacao.freq.vezes ?? 1;
  const janelas: JanelaApurada[] = intervalosDaFrequencia(situacao.freq, periodo).map(intervalo => {
    let episodios = 0;
    let reservas = 0;
    let foraDoPeriodo = 0;
    for (const item of daSerie) {
      const data = item.data!.slice(0, 10);
      if (!dentro(data, intervalo)) continue;
      if (ehReserva(item)) reservas += 1;
      else episodios += 1;
      if (!dentro(data, periodo)) foraDoPeriodo += 1;
    }
    const estado: EstadoDaJanela = episodios >= meta ? 'atendida'
      : episodios + reservas >= meta ? 'reservada'
        : episodios + reservas === 0 ? 'vazia' : 'abaixo';
    return {
      ...intervalo,
      meta,
      episodios,
      reservas,
      foraDoPeriodo,
      estado,
      nota: notaDoIntervalo(situacao.freq.unidade, intervalo, periodo),
    };
  });

  const faltas = janelas.filter(janela => janela.estado === 'abaixo' || janela.estado === 'vazia');
  const itensDasJanelas = daSerie.filter(item => janelas.some(janela => dentro(item.data!.slice(0, 10), janela)));
  return {
    ...base,
    inicioFuturo: null,
    janelas,
    metaDasJanelas: janelas.reduce((soma, janela) => soma + janela.meta, 0),
    faltas,
    reservadas: janelas.filter(janela => janela.estado === 'reservada'),
    concentrada: janelas.some(janela => janela.episodios + janela.reservas > meta) && janelas.some(janela => janela.estado === 'vazia'),
    semEpisodios: janelas.length > 0 && janelas.every(janela => janela.estado === 'vazia'),
    foraDoPeriodo: janelas.reduce((soma, janela) => soma + janela.foraDoPeriodo, 0),
    itens: itensDasJanelas.sort(porData),
  };
}

// ------------------------------------------------------------------ Textos

function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

const JANELA_PLURAL = { semana: ['semana', 'semanas'], quinzena: ['ciclo', 'ciclos'], mes: ['mês', 'meses'] } as const;

/** "2 episódios + 1 post-it" com as datas do período. */
export function textoDoVolume(contagem: ContagemNoPeriodo): string {
  const partes = [plural(contagem.episodios, 'episódio', 'episódios')];
  if (contagem.reservas > 0) partes.push(plural(contagem.reservas, 'post-it', 'post-its'));
  return partes.join(' + ');
}

/**
 * Situação da frequência em uma linha:
 * "meta de 3 · 2 de 3 meses atendidos · 1 reservado, a desenvolver · 1 fora do período".
 */
export function textoDaFrequencia(apuracao: Pick<ApuracaoDaSerie, 'situacao' | 'inicioFuturo' | 'janelas' | 'metaDasJanelas' | 'reservadas' | 'foraDoPeriodo'>): string {
  const { situacao } = apuracao;
  if (situacao.tipo === 'sem-ancora') return TEXTO_SEM_ANCORA;
  if (situacao.tipo === 'incompleta') return 'Frequência incompleta';
  if (situacao.tipo === 'sob-demanda') return 'Sob demanda';
  if (situacao.tipo === 'sem-frequencia') return 'Sem meta definida';
  if (apuracao.inicioFuturo) return `Meta começa em ${format(parseISO(apuracao.inicioFuturo), 'dd/MM/yyyy')}`;
  if (apuracao.janelas.length === 0) return textoFrequencia(situacao.freq);
  const [um, varios] = JANELA_PLURAL[situacao.freq.unidade];
  const atendidas = apuracao.janelas.filter(janela => janela.estado === 'atendida').length;
  const total = apuracao.janelas.length;
  const nome = total === 1 ? um : varios;
  const masculino = situacao.freq.unidade !== 'semana';
  const partes = [
    `meta de ${apuracao.metaDasJanelas}`,
    `${atendidas} de ${total} ${nome} ${masculino ? (total === 1 ? 'atendido' : 'atendidos') : (total === 1 ? 'atendida' : 'atendidas')}`,
  ];
  if (apuracao.reservadas.length > 0) {
    const n = apuracao.reservadas.length;
    partes.push(`${n} ${masculino ? (n === 1 ? 'reservado' : 'reservados') : (n === 1 ? 'reservada' : 'reservadas')}, conteúdo a desenvolver`);
  }
  if (apuracao.foraDoPeriodo > 0) partes.push(`${apuracao.foraDoPeriodo} fora do período`);
  return partes.join(' · ');
}

const ROTULO_DO_ESTADO: Record<EstadoDaJanela, string> = {
  atendida: 'atendida',
  reservada: 'reservada, conteúdo a desenvolver',
  abaixo: 'abaixo',
  vazia: 'sem episódio',
};

/** "05/10–11/10: 1 episódio + 1 post-it de 2 · reservada, conteúdo a desenvolver". */
export function textoDaJanela(janela: JanelaApurada): string {
  const volume = textoDoVolume({ episodios: janela.episodios, reservas: janela.reservas, publicados: 0 });
  return `${curta(janela.inicio)}–${curta(janela.fim)}: ${volume} de ${janela.meta} · ${ROTULO_DO_ESTADO[janela.estado]}`;
}
