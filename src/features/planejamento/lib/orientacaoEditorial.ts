import {addDays, format, parseISO} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import type {BibliotecaItem, Content, Platform, Serie, Tema} from '../../../lib/database.ts';
import {CONTENT_STATUS, normalizeContentStatus} from '../../contents/lib/contentPipeline.ts';
import type {PeriodoGrade} from '../../editorial/lib/gradeCounts.ts';
import type {GradeEntry} from '../../editorial/lib/gradeEntries.ts';
import {apurarSerie, ehReserva, type ItemDaApuracao} from '../../editorial/lib/apuracaoSerie.ts';
import {exclusaoDeMetaPropria, type OndaDaExclusao} from '../../editorial/lib/metaPropria.ts';
import {acompanhamentoGeral, acompanhaNoGeral, coberturaNoGeral, idsComAncestrais, serieAcompanhada} from '../../editorial/lib/acompanhamento.ts';
import {
  excecaoCobre,
  LIMITES_CONCENTRACAO_PADRAO,
  rotuloFracao,
  type ExcecaoConcentracao,
  type LimitesConcentracao,
} from '../../editorial/lib/concentracao.ts';
import {diasDePausa, type PausaEditorial} from '../../editorial/lib/pausas.ts';
import {contarSerieAgrupada} from '../../editorial/lib/frequenciaAgrupada.ts';
import {idsDeObras} from './assuntosObras.ts';
import {itensPendenciaDoDia} from './avisosPendencia.ts';
import {semanaDe} from '../../editorial/lib/periodoEditorial.ts';
import {lerFrequencia} from '../../editorial/lib/frequenciaSerie.ts';
import {roteirosPorSemana} from '../../settings/lib/statusSerie.ts';
import type {Continuidade, LinhaContinuidade} from './saudeIndicadores.ts';
import type {PlanejamentoPostIt} from './postIt.ts';

/**
 * Heurísticas da orientação editorial (Fase 5).
 * Não bloqueiam. Sequência intencional só suprime avisos daquela sequência
 * quando `sequenciaPorConteudo` estiver preenchido. Os limites de obra e assunto vêm de
 * Ritmo & Regras Gerais (`LimitesConcentracao`); sem nada gravado, os de antes.
 */

export type TipoAvisoOrientacao =
  | 'obra-repetida'
  | 'tema-concentrado'
  | 'serie-acima'
  | 'serie-abaixo'
  | 'serie-reservada'
  | 'vespera-sem-pronto'
  | 'gravacoes-no-dia'
  | 'capacidade-semana'
  | 'ausencia-12-dias'
  | 'ausencia-mes';

/** Avisos da semana corrente, dos próximos dias e do fim do mês: valem para todas as redes, não seguem o filtro. */
export const TIPOS_AVISO_GLOBAIS: ReadonlySet<TipoAvisoOrientacao> = new Set([
  'gravacoes-no-dia',
  'capacidade-semana',
  'ausencia-12-dias',
  'ausencia-mes',
]);

/** Janela fixa do aviso "não aparece nos próximos dias", contando hoje. */
export const DIAS_SEM_APARECER = 12;
/** O aviso de fim de mês só entra quando hoje está a 7 dias ou menos do fim do mês da vista. */
export const DIAS_ANTES_DO_FIM_DO_MES = 7;

export type AvisoOrientacao = {
  id: string;
  tipo: TipoAvisoOrientacao;
  /** Resumo curto para a faixa. */
  texto: string;
  /** Ids de post-it a destacar com "Ver pautas". */
  postItIds: string[];
  /** Conteúdos envolvidos (quando não há post-it). */
  contentIds: string[];
  intervalo?: PeriodoGrade;
  alvoId?: string;
  /** Abaixo da frequência só informa; os demais pedem revisão. */
  severidade: 'revisar' | 'info';
};

type PautaNoDia = {
  date: string;
  postItId: string | null;
  contentId: string | null;
  serieId: string | null;
  temaIds: string[];
  obraIds: string[];
  sequenciaId: string | null;
};

function noPeriodo(data: string | null | undefined, periodo: PeriodoGrade): boolean {
  return Boolean(data && data >= periodo.inicio && data <= periodo.fim);
}

function diaValido(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseISO(value).getTime());
}

/** Mesma série (ou wave) e mesmas obras formam uma sequência, sem campo novo no banco. */
export function mapaSequenciaPorConteudo(contents: readonly Content[]): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (const content of contents) {
    const escopo = content.temporadaId ?? content.seriesId;
    const obras = [...idsDeObras(content)].sort();
    if (escopo && obras.length > 0) mapa[content.id] = `${escopo}:${obras.join(',')}`;
  }
  return mapa;
}

function semSequenciasRepetidas(pautas: readonly PautaNoDia[]): PautaNoDia[] {
  const vistas = new Set<string>();
  return pautas.filter(item => {
    if (!item.sequenciaId) return true;
    if (vistas.has(item.sequenciaId)) return false;
    vistas.add(item.sequenciaId);
    return true;
  });
}

/** A mesma exceção do Editorial, válida para todas as contas. */
export function excecaoFoiDeProposito(aviso: AvisoOrientacao, id: string): ExcecaoConcentracao | null {
  if (!aviso.alvoId || !aviso.intervalo) return null;
  const tipo = aviso.tipo === 'obra-repetida' ? 'obra' : aviso.tipo === 'tema-concentrado' ? 'assunto' : null;
  if (!tipo) return null;
  return {id, tipo, alvoId: aviso.alvoId, platformId: null, ...aviso.intervalo, nota: 'foi de propósito'};
}

/**
 * Monta as pautas datadas do período a partir dos post-its.
 * Conteúdo ligado ao post-it não gera segunda linha.
 */
function pautasDoPeriodo({
  postIts,
  contents,
  sequenciaPorConteudo = {},
  entries,
}: {
  entries?: readonly GradeEntry[];
  postIts: readonly PlanejamentoPostIt[];
  contents: readonly Content[];
  sequenciaPorConteudo?: Readonly<Record<string, string>>;
  periodo: PeriodoGrade;
}): PautaNoDia[] {
  const porId = new Map(contents.map(content => [content.id, content]));
  const pautas: PautaNoDia[] = [];
  if (entries) {
    return entries.filter(entry => entry.data && entry.contaNaGrade).map(entry => {
      const content = porId.get(entry.contentId);
      return {
        date: entry.data!, postItId: entry.postItId ?? postIts.find(item => item.contentId === entry.contentId)?.id ?? null,
        contentId: content?.id ?? null, serieId: entry.serieId,
        temaIds: [...(content?.temaIds ?? [])], obraIds: idsDeObras(content),
        sequenciaId: content?.id ? sequenciaPorConteudo[content.id] ?? null : null,
      };
    });
  }

  for (const postIt of postIts) {
    if (!postIt.date || !diaValido(postIt.date)) continue;
    const content = postIt.contentId ? porId.get(postIt.contentId) ?? null : null;
    if (content && (content.deletedAt || content.archivedAt)) continue;
    const serieId = content?.seriesId ?? postIt.serieId ?? null;
    pautas.push({
      date: postIt.date,
      postItId: postIt.id,
      contentId: content?.id ?? null,
      serieId,
      temaIds: [...(content?.temaIds ?? [])],
      obraIds: idsDeObras(content),
      sequenciaId: content?.id ? sequenciaPorConteudo[content.id] ?? null : null,
    });
  }

  return pautas;
}

function avisosDeObra(
  pautas: readonly PautaNoDia[],
  periodo: PeriodoGrade,
  obras: readonly Pick<BibliotecaItem, 'id' | 'titulo'>[],
  limites: LimitesConcentracao,
  excecoes: readonly ExcecaoConcentracao[],
): AvisoOrientacao[] {
  const noRecorte = pautas.filter(pauta => noPeriodo(pauta.date, periodo) && pauta.obraIds.length > 0);
  if (noRecorte.length === 0) return [];

  const nomeObra = new Map(obras.map(item => [item.id, item.titulo?.trim() || 'Obra']));
  const avisos: AvisoOrientacao[] = [];
  const vistos = new Set<string>();

  for (const obraId of new Set(noRecorte.flatMap(pauta => pauta.obraIds))) {
    const comObra = pautas
      .filter(pauta => pauta.obraIds.includes(obraId))
      .sort((a, b) => a.date.localeCompare(b.date));

    for (let i = 0; i < comObra.length; i += 1) {
      const base = comObra[i];
      const janelaFim = format(addDays(parseISO(base.date), limites.obraJanelaDias - 1), 'yyyy-MM-dd');
      const grupo = comObra.filter(item => item.date >= base.date && item.date <= janelaFim);
      const semSequencia = semSequenciasRepetidas(grupo);
      if (semSequencia.length < limites.obraRepeticoes) continue;
      // Só avisa se a janela toca o período visível.
      if (janelaFim < periodo.inicio || base.date > periodo.fim) continue;
      // Concentração marcada como intencional para esta obra nestas datas: sem aviso.
      if (excecaoCobre(excecoes, {tipo: 'obra', alvoId: obraId}, {inicio: base.date, fim: janelaFim})
        || excecaoCobre(excecoes, {tipo: 'obra', alvoId: obraId}, {inicio: base.date, fim: grupo[grupo.length - 1].date})) continue;
      const chave = `obra:${obraId}:${base.date}`;
      if (vistos.has(obraId)) continue;
      vistos.add(obraId);
      const envolvidos = grupo.filter(item => noPeriodo(item.date, periodo) || (item.date >= base.date && item.date <= janelaFim));
      const nome = nomeObra.get(obraId) ?? 'Obra';
      avisos.push({
        id: chave,
        tipo: 'obra-repetida',
        alvoId: obraId,
        texto: `${grupo.length} pautas da mesma obra em ${limites.obraJanelaDias} dias: ${nome} (avisa a partir de ${limites.obraRepeticoes}).`,
        intervalo: {inicio: base.date, fim: janelaFim},
        postItIds: envolvidos.flatMap(item => item.postItId ? [item.postItId] : []),
        contentIds: envolvidos.flatMap(item => item.contentId ? [item.contentId] : []),
        severidade: 'info',
      });
      break;
    }
  }

  return avisos;
}

function avisosDeTema(
  pautas: readonly PautaNoDia[],
  periodo: PeriodoGrade,
  temas: readonly Pick<Tema, 'id' | 'nome'>[],
  limites: LimitesConcentracao,
  excecoes: readonly ExcecaoConcentracao[],
): AvisoOrientacao[] {
  const noRecorte = pautas.filter(pauta => noPeriodo(pauta.date, periodo));

  const nomeTema = new Map(temas.map(tema => [tema.id, tema.nome.trim()]));
  const porTema = new Map<string, PautaNoDia[]>();
  for (const pauta of noRecorte) {
    for (const temaId of pauta.temaIds) {
      const lista = porTema.get(temaId) ?? [];
      lista.push(pauta);
      porTema.set(temaId, lista);
    }
  }

  const avisos: AvisoOrientacao[] = [];
  const limite = noRecorte.length * limites.assuntoFracaoMax;
  for (const [temaId, lista] of porTema) {
    if (noRecorte.length < limites.assuntoMinPautas || lista.length <= limite) continue;
    if (excecaoCobre(excecoes, {tipo: 'assunto', alvoId: temaId}, periodo)) continue;
    const nome = nomeTema.get(temaId) ?? 'Assunto';
    avisos.push({
      id: `tema:${temaId}`,
      tipo: 'tema-concentrado',
      alvoId: temaId,
      texto: `${nome} concentra ${lista.length} de ${noRecorte.length} pautas do intervalo (avisa acima de ${rotuloFracao(limites.assuntoFracaoMax)}, com pelo menos ${limites.assuntoMinPautas} pautas).`,
      intervalo: periodo,
      postItIds: lista.flatMap(item => item.postItId ? [item.postItId] : []),
      contentIds: lista.flatMap(item => item.contentId ? [item.contentId] : []),
      severidade: 'revisar',
    });
  }
  for (const temaId of porTema.keys()) {
    const comTema = pautas.filter(item => item.temaIds.includes(temaId)).sort((a, b) => a.date.localeCompare(b.date));
    for (const base of comTema) {
      const fim = format(addDays(parseISO(base.date), limites.assuntoJanelaDias - 1), 'yyyy-MM-dd');
      if (fim < periodo.inicio || base.date > periodo.fim) continue;
      const grupo = comTema.filter(item => item.date >= base.date && item.date <= fim);
      if (semSequenciasRepetidas(grupo).length < limites.assuntoRepeticoes) continue;
      const intervalo = {inicio: base.date, fim};
      // Não recria o mesmo aviso deslocando a janela quando todas as pautas já estão cobertas.
      if (excecaoCobre(excecoes, {tipo: 'assunto', alvoId: temaId}, intervalo)
        || excecaoCobre(excecoes, {tipo: 'assunto', alvoId: temaId}, {inicio: base.date, fim: grupo[grupo.length - 1].date})) continue;
      avisos.push({
        id: `tema-janela:${temaId}:${base.date}`,
        tipo: 'tema-concentrado',
        alvoId: temaId,
        texto: `${grupo.length} pautas do mesmo assunto em ${limites.assuntoJanelaDias} dias: ${nomeTema.get(temaId) ?? 'Assunto'} (avisa a partir de ${limites.assuntoRepeticoes}).`,
        intervalo,
        postItIds: grupo.flatMap(item => item.postItId ? [item.postItId] : []),
        contentIds: grupo.flatMap(item => item.contentId ? [item.contentId] : []),
        severidade: 'info',
      });
      break;
    }
  }
  return avisos;
}

/** Itens da apuração montados das pautas, quando a grade do período não vem pronta. */
function itensDasPautas(pautas: readonly PautaNoDia[]): ItemDaApuracao[] {
  return pautas.flatMap(pauta => {
    if (!pauta.serieId) return [];
    const reserva = !pauta.contentId;
    return [{
      id: pauta.contentId ? `${pauta.contentId}:original` : `post-it:${pauta.postItId ?? `${pauta.date}:${pauta.serieId}`}`,
      contentId: pauta.contentId ?? pauta.postItId ?? `${pauta.date}:${pauta.serieId}`,
      data: pauta.date,
      serieId: pauta.serieId,
      tipo: 'original' as const,
      etapa: reserva ? 'planejamento' : 'roteiro',
      postItId: pauta.postItId,
    }];
  });
}

/**
 * Frequência das séries com a apuração comum (`apurarSerie`): janelas inteiras,
 * reposts fora, post-it como reserva. Sobra numa janela não cobre falta em outra.
 * Só cobra quem está marcado para acompanhar, como a Continuidade da Saúde.
 */
function avisosDeFrequenciaSerie(
  itens: readonly ItemDaApuracao[],
  periodo: PeriodoGrade,
  series: readonly Serie[],
  pausas: readonly PausaEditorial[] = [],
  temporadas: readonly OndaDaExclusao[] = [],
): AvisoOrientacao[] {
  const avisos: AvisoOrientacao[] = [];

  for (const serie of series) {
    if (serie.ativa === false) continue;
    const nome = serie.name.trim() || 'Quadro';
    // Metas dos quadros somando menos que a da série não é erro: o resto fica para os outros episódios.
    // É configuração, não cobrança, mas só aparece para série acompanhada (decisão da Anne).
    const agrupada = contarSerieAgrupada({serie, series, itens: [], inicio: periodo.inicio, fim: periodo.fim});
    if (serieAcompanhada(serie) && agrupada.recorteIncompativel && agrupada.somaRecortesFilhos != null && agrupada.expectativa != null) {
      avisos.push({
        id: `serie-recorte:${serie.id}`,
        tipo: 'serie-acima',
        texto: `${nome}: as metas dos quadros somam ${agrupada.somaRecortesFilhos} e passam da meta da série (${agrupada.expectativa}).`,
        postItIds: [],
        contentIds: [],
        severidade: 'info',
      });
    }

    // Acompanhamento desligado não gera cobrança de frequência.
    if (!acompanhaNoGeral(serie)) continue;
    // Antes do início ou depois do término do acompanhamento não há aviso.
    const geral = acompanhamentoGeral(serie);
    if ((geral?.inicio && geral.inicio > periodo.fim) || (geral?.termino && geral.termino < periodo.inicio)) continue;
    // Quadro com meta própria e wave com ritmo próprio têm a conta deles; não cobram de novo na série.
    const apuracao = apurarSerie({serie, series, itens, periodo, excluir: exclusaoDeMetaPropria(serie, series, temporadas)});
    if (apuracao.situacao.tipo !== 'definida' || apuracao.inicioFuturo || apuracao.janelas.length === 0) continue;
    // Mesma regra da Saúde: janela fora do acompanhamento não entra; parcial ou em pausa não é cobrada.
    const serieIds = idsComAncestrais(serie.id, series);
    const coberturas = apuracao.janelas.map(janela => ({janela, cobertura: coberturaNoGeral(janela, geral, pausas, serieIds)}));
    const dentro = coberturas.filter(item => item.cobertura !== 'fora').map(item => item.janela);
    const cobradas = coberturas.filter(item => item.cobertura === 'integral').map(item => item.janela);
    const faltas = cobradas.filter(janela => janela.estado === 'abaixo' || janela.estado === 'vazia');
    const reservadas = cobradas.filter(janela => janela.estado === 'reservada');

    const postItIds = apuracao.itens.flatMap(item => item.postItId ? [item.postItId] : []);
    const contentIds = apuracao.itens.flatMap(item => ehReserva(item) ? [] : [item.contentId]);
    const acima = dentro.filter(janela => janela.episodios + janela.reservas > janela.meta);
    if (acima.length > 0) {
      const pautas = acima.reduce((soma, janela) => soma + janela.episodios + janela.reservas, 0);
      const pede = acima.reduce((soma, janela) => soma + janela.meta, 0);
      avisos.push({
        id: `serie-acima:${serie.id}`,
        tipo: 'serie-acima',
        texto: acima.length === 1
          ? `${nome} tem ${pautas} pautas em ${rotuloDaJanela(acima[0])}; a frequência pede ${pede}.`
          : `${nome} passa da frequência em ${acima.length} janelas: ${pautas} pautas onde a frequência pede ${pede}.`,
        postItIds,
        contentIds,
        severidade: 'revisar',
      });
    }
    const faltam = faltas.reduce((soma, janela) => soma + janela.meta - janela.episodios - janela.reservas, 0);
    if (faltam > 0) {
      avisos.push({
        id: `serie-abaixo:${serie.id}`,
        tipo: 'serie-abaixo',
        texto: faltam === 1
          ? `Mais 1 episódio de ${nome} pra fechar o período.`
          : `Mais ${faltam} episódios de ${nome} pra fechar o período.`,
        postItIds,
        contentIds,
        severidade: 'info',
      });
    }
    if (reservadas.length > 0) {
      const n = reservadas.length;
      avisos.push({
        id: `serie-reservada:${serie.id}`,
        tipo: 'serie-reservada',
        texto: n === 1
          ? `${nome}: 1 janela coberta só por post-it, conteúdo a desenvolver.`
          : `${nome}: ${n} janelas cobertas só por post-it, conteúdo a desenvolver.`,
        postItIds,
        contentIds: [],
        severidade: 'info',
      });
    }
  }
  return avisos;
}

function rotuloDaJanela(janela: {inicio: string; fim: string}): string {
  return `${format(parseISO(janela.inicio), 'dd/MM')}–${format(parseISO(janela.fim), 'dd/MM')}`;
}

/** Itens do Calendário com pendência no dia, pelo ritmo de gravação ou pela antecedência. */
function avisosDeVespera(input: {
  postIts: readonly PlanejamentoPostIt[];
  contents: readonly Content[];
  platforms: readonly Platform[];
  series: readonly Serie[];
  redeReferenciaId: string | null;
  diasGravacao: readonly number[];
  antecedenciaPostagemDias: number | null;
  pausas: readonly PausaEditorial[];
  periodo: PeriodoGrade;
  hoje: Date;
}): AvisoOrientacao[] {
  const itens = itensPendenciaDoDia({
    contents: input.contents,
    platforms: input.platforms,
    series: input.series,
    redeReferenciaId: input.redeReferenciaId,
    diasGravacao: input.diasGravacao,
    antecedenciaPostagemDias: input.antecedenciaPostagemDias,
    pausas: input.pausas,
    hoje: input.hoje,
  }).filter(item => noPeriodo(item.date, input.periodo));

  return itens.map(item => {
    const postItIds = input.postIts
      .filter(postIt => postIt.contentId === item.contentId)
      .map(postIt => postIt.id);
    return {
      id: `vespera:${item.contentId}:${item.date}`,
      tipo: 'vespera-sem-pronto' as const,
      texto: item.texto,
      postItIds,
      contentIds: [item.contentId],
      severidade: 'revisar' as const,
    };
  });
}

/** Dia com mais gravações previstas do que cabem. Gravação já feita não conta. */
function avisosDeGravacao(
  postIts: readonly PlanejamentoPostIt[],
  contents: readonly Content[],
  periodo: PeriodoGrade,
  limite: number | null | undefined,
  pausas: readonly PausaEditorial[] = [],
): AvisoOrientacao[] {
  // Pausa de gravação ou de produção: nenhuma gravação cabe naquele dia.
  const pausados = new Set(diasDePausa(pausas, {tipo: 'gravacao'}, periodo));
  const temLimite = limite != null && limite > 0;
  if (!temLimite && pausados.size === 0) return [];
  const porDia = new Map<string, Content[]>();
  for (const content of contents) {
    if (content.deletedAt || content.archivedAt || content.recordedAt) continue;
    const etapa = normalizeContentStatus(content.status);
    if (etapa !== CONTENT_STATUS.IDEIA && etapa !== CONTENT_STATUS.ROTEIRO && etapa !== CONTENT_STATUS.PRODUCAO) continue;
    const dia = content.recordingDate?.slice(0, 10) ?? null;
    if (!dia || !noPeriodo(dia, periodo)) continue;
    const lista = porDia.get(dia) ?? [];
    lista.push(content);
    porDia.set(dia, lista);
  }
  const avisos: AvisoOrientacao[] = [];
  for (const [dia, lista] of [...porDia].sort(([a], [b]) => a.localeCompare(b))) {
    const emPausa = pausados.has(dia);
    if (!emPausa && (!temLimite || lista.length <= (limite as number))) continue;
    const ids = new Set(lista.map(content => content.id));
    const quando = format(parseISO(dia), "d 'de' MMMM", {locale: ptBR});
    avisos.push({
      id: `gravacoes:${dia}`,
      tipo: 'gravacoes-no-dia',
      // Só passa do limite com 2 ou mais: o plural é sempre o mesmo.
      texto: emPausa
        ? `${lista.length === 1 ? 'Há 1 gravação prevista' : `Há ${lista.length} gravações previstas`} para ${quando}, um dia em pausa de gravação ou produção.`
        : `Há ${lista.length} gravações previstas para ${quando}, um dia com limite de ${limite}.`,
      intervalo: {inicio: dia, fim: dia},
      postItIds: postIts.flatMap(postIt => postIt.contentId && ids.has(postIt.contentId) ? [postIt.id] : []),
      contentIds: [...ids],
      severidade: 'revisar',
    });
  }
  return avisos;
}

type LinhaDaContinuidade = Pick<LinhaContinuidade<{data?: string | null}>, 'chave' | 'serieId' | 'temporadaId' | 'nome' | 'tipo' | 'intervalos' | 'itens' | 'semEpisodios'>;
type ContinuidadeDosAvisos = Pick<Continuidade<{data?: string | null}>, 'linhas'> & {linhas: LinhaDaContinuidade[]};
type MetaDaOnda = {id: string; frequenciaVezes?: number | null; frequenciaUnidade?: string | null};

function iso(data: Date): string {
  return format(data, 'yyyy-MM-dd');
}

/** Semana corrente, segunda a domingo (INICIO_DA_SEMANA), sem recortar pelo mês da vista. */
export function semanaCorrente(hoje: Date): PeriodoGrade {
  return semanaDe(iso(hoje));
}

/** Próximos 12 dias a partir de hoje, inclusive. */
export function janelaDosProximosDias(hoje: Date): PeriodoGrade {
  return {inicio: iso(hoje), fim: iso(addDays(hoje, DIAS_SEM_APARECER - 1))};
}

/** Linha com alguma janela de fato acompanhada no trecho (fora e pausa inteira não contam). */
function linhaAtivaNoTrecho(linha: LinhaDaContinuidade): boolean {
  return linha.intervalos.some(intervalo => !intervalo.pausada);
}

/** Ritmo por semana da linha, com a mesma conversão do Ajustes (quinzena ÷ 2, mês ÷ 30/7). */
function roteirosDaLinhaPorSemana(
  linha: LinhaDaContinuidade,
  series: readonly Serie[],
  ondas: readonly MetaDaOnda[],
): number | null {
  // Wave: só a meta dela, sem a frase antiga (como na continuidade).
  const onda = linha.temporadaId ? ondas.find(item => item.id === linha.temporadaId) : null;
  const serie = linha.temporadaId ? null : series.find(item => item.id === linha.serieId);
  if (!onda && !serie) return null;
  const freq = lerFrequencia({
    frequenciaRecomendada: serie?.frequenciaRecomendada ?? null,
    vezes: onda ? onda.frequenciaVezes : serie?.frequenciaVezes,
    unidade: onda ? onda.frequenciaUnidade : serie?.frequenciaUnidade,
  });
  if (freq.unidade === 'sob-demanda') return null;
  return roteirosPorSemana({frequenciaVezes: freq.vezes, frequenciaUnidade: freq.unidade});
}

function numeroCurto(valor: number): string {
  return String(Math.round(valor * 10) / 10).replace('.', ',');
}

/**
 * Semana corrente: soma do ritmo das séries, quadros e waves acompanhados contra o que cabe gravar
 * (dias de gravação × limite por dia). Sem dias ou sem limite, não há conta e não há aviso.
 */
export function avisoDeCapacidadeDaSemana(input: {
  continuidadeDaSemana: ContinuidadeDosAvisos | null | undefined;
  series: readonly Serie[];
  ondas?: readonly MetaDaOnda[];
  diasGravacao: readonly number[] | null | undefined;
  limiteGravacoesDia: number | null | undefined;
  hoje: Date;
}): AvisoOrientacao[] {
  const dias = new Set((input.diasGravacao ?? []).filter(dia => Number.isInteger(dia) && dia >= 1 && dia <= 7));
  const limite = input.limiteGravacoesDia;
  if (dias.size === 0 || limite == null || !Number.isFinite(limite) || limite <= 0) return [];
  if (!input.continuidadeDaSemana) return [];
  const metas = input.continuidadeDaSemana.linhas
    .filter(linhaAtivaNoTrecho)
    .map(linha => roteirosDaLinhaPorSemana(linha, input.series, input.ondas ?? []))
    .filter((meta): meta is number => meta != null && meta > 0);
  if (metas.length === 0) return [];
  const pede = metas.reduce((soma, meta) => soma + meta, 0);
  const grava = dias.size * limite;
  if (pede <= grava) return [];
  const semana = semanaCorrente(input.hoje);
  return [{
    id: `capacidade-semana:${semana.inicio}`,
    tipo: 'capacidade-semana',
    texto: `Esta semana pede ${numeroCurto(pede)} ${pede === 1 ? 'roteiro' : 'roteiros'} e cabem ${grava} ${grava === 1 ? 'gravação' : 'gravações'} (${dias.size} ${dias.size === 1 ? 'dia' : 'dias'} × ${limite}).`,
    intervalo: semana,
    postItIds: [],
    contentIds: [],
    severidade: 'revisar',
  }];
}

/** Waves, séries e quadros acompanhados sem episódio nem post-it nos próximos 12 dias. */
export function avisosDeAusenciaProxima(input: {
  continuidadeProxima: ContinuidadeDosAvisos | null | undefined;
  hoje: Date;
}): AvisoOrientacao[] {
  if (!input.continuidadeProxima) return [];
  const janela = janelaDosProximosDias(input.hoje);
  return input.continuidadeProxima.linhas.filter(linhaAtivaNoTrecho).flatMap(linha => {
    const aparece = linha.itens.some(item => noPeriodo(item.data?.slice(0, 10), janela));
    if (aparece) return [];
    return [{
      id: `ausencia-12-dias:${linha.chave}`,
      tipo: 'ausencia-12-dias' as const,
      texto: `${linha.nome} não aparece nos próximos ${DIAS_SEM_APARECER} dias.`,
      intervalo: janela,
      postItIds: [],
      contentIds: [],
      severidade: 'info' as const,
    }];
  });
}

/**
 * Fim do mês da vista: quem não apareceu no mês (`semEpisodios` da continuidade).
 * Só entra a partir de 7 dias antes do fim do mês; mês já encerrado também avisa.
 */
export function avisosDeAusenciaNoMes(input: {
  continuidadeDoMes: ContinuidadeDosAvisos | null | undefined;
  mes: PeriodoGrade;
  hoje: Date;
}): AvisoOrientacao[] {
  if (!input.continuidadeDoMes) return [];
  const hoje = iso(input.hoje);
  const aPartirDe = iso(addDays(parseISO(input.mes.fim), -DIAS_ANTES_DO_FIM_DO_MES));
  if (hoje < aPartirDe) return [];
  const encerrado = hoje > input.mes.fim;
  const nomeDoMes = format(parseISO(input.mes.inicio), 'MMMM', {locale: ptBR});
  return input.continuidadeDoMes.linhas.filter(linha => linha.semEpisodios).map(linha => ({
    id: `ausencia-mes:${input.mes.inicio}:${linha.chave}`,
    tipo: 'ausencia-mes' as const,
    texto: encerrado
      ? `${linha.nome} não apareceu em ${nomeDoMes}.`
      : `${linha.nome} ainda não apareceu em ${nomeDoMes}.`,
    intervalo: input.mes,
    postItIds: [],
    contentIds: [],
    severidade: 'info' as const,
  }));
}

export function avisosDeOrientacao({
  postIts,
  contents,
  series,
  temas,
  obras,
  periodo,
  entries,
  itensSerie,
  sequenciaPorConteudo = {},
  limiteGravacoesDia = null,
  concentracao = LIMITES_CONCENTRACAO_PADRAO,
  excecoesConcentracao = [],
  pausas = [],
  platforms = [],
  redeReferenciaId = null,
  diasGravacao = [],
  antecedenciaPostagemDias = null,
  temporadas = [],
  hoje = new Date(),
  continuidadeDaSemana = null,
  continuidadeProxima = null,
  continuidadeDoMes = null,
  mesDaVista = null,
}: {
  postIts: readonly PlanejamentoPostIt[];
  contents: readonly Content[];
  series: readonly Serie[];
  temas: readonly Tema[];
  obras: readonly Pick<BibliotecaItem, 'id' | 'titulo'>[];
  periodo: PeriodoGrade;
  entries?: readonly GradeEntry[];
  /**
   * Itens da grade em `janelaDaContinuidade(periodo)`, para a frequência das séries usar
   * a mesma apuração da Saúde. Sem eles, a conta sai das pautas dos post-its.
   */
  itensSerie?: readonly ItemDaApuracao[];
  /** Id de sequência por contentId, derivado da série/wave e das obras. */
  sequenciaPorConteudo?: Readonly<Record<string, string>>;
  /** Editorial › Ajustes. Sem número, não há aviso de gravação. */
  limiteGravacoesDia?: number | null;
  /** Variedade e concentração; sem nada gravado, os limites de antes. */
  concentracao?: LimitesConcentracao;
  /** Concentrações marcadas como intencionais. */
  excecoesConcentracao?: readonly ExcecaoConcentracao[];
  /** Pausas com data: gravação e produção valem no aviso de gravações por dia. */
  pausas?: readonly PausaEditorial[];
  platforms?: readonly Platform[];
  redeReferenciaId?: string | null;
  /** ISO 1=segunda … 7=domingo. Vazio desliga o lote do dia de gravar. */
  diasGravacao?: readonly number[];
  /** Null desliga a antecedência da postagem. */
  antecedenciaPostagemDias?: number | null;
  /** Waves: as com ritmo próprio saem da frequência da série. */
  temporadas?: readonly (OndaDaExclusao & {frequenciaUnidade?: string | null})[];
  hoje?: Date;
  /** Continuidade da semana corrente (segunda a domingo). Sem ela, não há aviso de capacidade. */
  continuidadeDaSemana?: ContinuidadeDosAvisos | null;
  /** Continuidade dos próximos 12 dias, com os itens da janela. */
  continuidadeProxima?: ContinuidadeDosAvisos | null;
  /** Continuidade do mês da vista, para o aviso de fim de mês. */
  continuidadeDoMes?: ContinuidadeDosAvisos | null;
  mesDaVista?: PeriodoGrade | null;
}): AvisoOrientacao[] {
  // Período + 14 dias anteriores (obra em 7 dias) + margem à frente nas bordas.
  const margemInicio = format(addDays(parseISO(periodo.inicio), -14), 'yyyy-MM-dd');
  const margemFim = format(addDays(parseISO(periodo.fim), 6), 'yyyy-MM-dd');
  const pautas = pautasDoPeriodo({
    postIts,
    contents,
    entries,
    sequenciaPorConteudo,
    periodo: {inicio: margemInicio, fim: margemFim},
  });

  // "Quadro em dias seguidos" não avisa sozinho: vira regra opcional do acompanhamento, desligada por padrão.
  return [
    ...avisosDeVespera({
      postIts,
      contents,
      platforms,
      series,
      redeReferenciaId,
      diasGravacao,
      antecedenciaPostagemDias,
      pausas,
      periodo,
      hoje,
    }),
    ...avisosDeGravacao(postIts, contents, periodo, limiteGravacoesDia, pausas),
    ...avisoDeCapacidadeDaSemana({continuidadeDaSemana, series, ondas: temporadas, diasGravacao, limiteGravacoesDia, hoje}),
    ...avisosDeAusenciaProxima({continuidadeProxima, hoje}),
    ...(mesDaVista ? avisosDeAusenciaNoMes({continuidadeDoMes, mes: mesDaVista, hoje}) : []),
    ...avisosDeObra(pautas, periodo, obras, concentracao, excecoesConcentracao),
    ...avisosDeTema(pautas, periodo, temas, concentracao, excecoesConcentracao),
    ...avisosDeFrequenciaSerie(itensSerie ?? itensDasPautas(pautas), periodo, series, pausas, temporadas),
  ];
}

export function pontosParaRevisar(avisos: readonly AvisoOrientacao[]): number {
  return avisos.filter(aviso => aviso.severidade === 'revisar').length;
}
