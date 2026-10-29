import {addDays, differenceInCalendarDays, format, parseISO} from 'date-fns';
import type {BibliotecaItem, Content, Serie, Tema} from '../../../lib/database.ts';
import type {PeriodoGrade} from '../../editorial/lib/gradeCounts.ts';
import {expectativaNoIntervalo, lerFrequencia} from '../../editorial/lib/frequenciaSerie.ts';
import {idsDeObras} from './assuntosObras.ts';
import type {PlanejamentoPostIt} from './postIt.ts';

/**
 * Heurísticas da orientação editorial (Fase 5).
 * Não bloqueiam. Sequência intencional só suprime avisos daquela sequência
 * quando `sequenciaPorConteudo` estiver preenchido.
 */
export const ORIENTACAO = {
  obraEm7Dias: 2,
  temaFracaoMax: 1 / 3,
  /** Evita alerta de tema em períodos com poucos previstos. */
  temaMinPrevistos: 3,
} as const;

export type TipoAvisoOrientacao =
  | 'obra-repetida'
  | 'tema-concentrado'
  | 'quadro-seguido'
  | 'serie-acima'
  | 'serie-abaixo';

export type AvisoOrientacao = {
  id: string;
  tipo: TipoAvisoOrientacao;
  /** Resumo curto para a faixa. */
  texto: string;
  /** Ids de post-it a destacar com "Ver pautas". */
  postItIds: string[];
  /** Conteúdos envolvidos (quando não há post-it). */
  contentIds: string[];
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

function mesmaSequencia(a: string | null, b: string | null): boolean {
  return Boolean(a && b && a === b);
}

/**
 * Monta as pautas datadas do período a partir dos post-its.
 * Conteúdo ligado ao post-it não gera segunda linha.
 */
function pautasDoPeriodo({
  postIts,
  contents,
  sequenciaPorConteudo = {},
}: {
  postIts: readonly PlanejamentoPostIt[];
  contents: readonly Content[];
  sequenciaPorConteudo?: Readonly<Record<string, string>>;
  periodo: PeriodoGrade;
}): PautaNoDia[] {
  const porId = new Map(contents.map(content => [content.id, content]));
  const pautas: PautaNoDia[] = [];

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
      const janelaFim = format(addDays(parseISO(base.date), 6), 'yyyy-MM-dd');
      const grupo = comObra.filter(item => item.date >= base.date && item.date <= janelaFim);
      const semSequencia = grupo.filter((item, index, list) => {
        if (index === 0) return true;
        const prev = list[index - 1];
        return !mesmaSequencia(item.sequenciaId, prev.sequenciaId);
      });
      if (semSequencia.length < ORIENTACAO.obraEm7Dias) continue;
      // Só avisa se a janela toca o período visível.
      if (janelaFim < periodo.inicio || base.date > periodo.fim) continue;
      const chave = `obra:${obraId}:${base.date}`;
      if (vistos.has(obraId)) continue;
      vistos.add(obraId);
      const envolvidos = grupo.filter(item => noPeriodo(item.date, periodo) || (item.date >= base.date && item.date <= janelaFim));
      const nome = nomeObra.get(obraId) ?? 'Obra';
      avisos.push({
        id: chave,
        tipo: 'obra-repetida',
        texto: `${nome} aparece em ${grupo.length} pautas nesta semana.`,
        postItIds: envolvidos.flatMap(item => item.postItId ? [item.postItId] : []),
        contentIds: envolvidos.flatMap(item => item.contentId ? [item.contentId] : []),
        severidade: 'revisar',
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
): AvisoOrientacao[] {
  const noRecorte = pautas.filter(pauta => noPeriodo(pauta.date, periodo));
  if (noRecorte.length < ORIENTACAO.temaMinPrevistos) return [];

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
  const limite = noRecorte.length * ORIENTACAO.temaFracaoMax;
  for (const [temaId, lista] of porTema) {
    if (lista.length <= limite) continue;
    const nome = nomeTema.get(temaId) ?? 'Assunto';
    avisos.push({
      id: `tema:${temaId}`,
      tipo: 'tema-concentrado',
      texto: `${nome} concentra ${lista.length} de ${noRecorte.length} pautas do período.`,
      postItIds: lista.flatMap(item => item.postItId ? [item.postItId] : []),
      contentIds: lista.flatMap(item => item.contentId ? [item.contentId] : []),
      severidade: 'revisar',
    });
  }
  return avisos;
}

function avisosDeQuadroSeguido(
  pautas: readonly PautaNoDia[],
  periodo: PeriodoGrade,
  series: readonly Pick<Serie, 'id' | 'name'>[],
): AvisoOrientacao[] {
  const noRecorte = pautas
    .filter(pauta => noPeriodo(pauta.date, periodo) && pauta.serieId)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.postItId ?? '').localeCompare(b.postItId ?? ''));
  if (noRecorte.length < 2) return [];

  const nomeSerie = new Map(series.map(serie => [serie.id, serie.name.trim() || 'Quadro']));
  const avisos: AvisoOrientacao[] = [];
  const vistos = new Set<string>();

  for (let i = 1; i < noRecorte.length; i += 1) {
    const prev = noRecorte[i - 1];
    const curr = noRecorte[i];
    if (!prev.serieId || prev.serieId !== curr.serieId) continue;
    if (mesmaSequencia(prev.sequenciaId, curr.sequenciaId)) continue;
    const dias = differenceInCalendarDays(parseISO(curr.date), parseISO(prev.date));
    if (dias !== 1) continue;
    const chave = prev.serieId;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    const nome = nomeSerie.get(chave) ?? 'Quadro';
    const envolvidos = noRecorte.filter(item => item.serieId === chave);
    avisos.push({
      id: `quadro:${chave}:${prev.date}`,
      tipo: 'quadro-seguido',
      texto: `${nome} aparece em dias seguidos.`,
      postItIds: [prev, curr].flatMap(item => item.postItId ? [item.postItId] : []),
      contentIds: [prev, curr].flatMap(item => item.contentId ? [item.contentId] : []),
      // Inclui os demais do quadro no destaque amplo quando o usuário pede Ver pautas.
      severidade: 'revisar',
    });
    // Amplia destaque aos do mesmo quadro no período.
    const aviso = avisos[avisos.length - 1];
    aviso.postItIds = [...new Set(envolvidos.flatMap(item => item.postItId ? [item.postItId] : []))];
    aviso.contentIds = [...new Set(envolvidos.flatMap(item => item.contentId ? [item.contentId] : []))];
  }

  return avisos;
}

function avisosDeFrequenciaSerie(
  pautas: readonly PautaNoDia[],
  periodo: PeriodoGrade,
  series: readonly Serie[],
): AvisoOrientacao[] {
  const noRecorte = pautas.filter(pauta => noPeriodo(pauta.date, periodo) && pauta.serieId);
  const porSerie = new Map<string, PautaNoDia[]>();
  for (const pauta of noRecorte) {
    const lista = porSerie.get(pauta.serieId!) ?? [];
    lista.push(pauta);
    porSerie.set(pauta.serieId!, lista);
  }

  const avisos: AvisoOrientacao[] = [];
  for (const serie of series) {
    const freq = lerFrequencia({
      frequenciaRecomendada: serie.frequenciaRecomendada,
      vezes: serie.frequenciaVezes,
      unidade: serie.frequenciaUnidade,
      aPartirDe: serie.frequenciaAPartirDe,
    });
    if (freq.unidade === 'sob-demanda') continue;
    const expectativa = expectativaNoIntervalo(freq, periodo.inicio, periodo.fim);
    if (expectativa == null || expectativa <= 0) continue;
    const lista = porSerie.get(serie.id) ?? [];
    const nome = serie.name.trim() || 'Quadro';
    if (lista.length > expectativa) {
      avisos.push({
        id: `serie-acima:${serie.id}`,
        tipo: 'serie-acima',
        texto: `${nome} tem ${lista.length} pautas; a frequência pede ${expectativa}.`,
        postItIds: lista.flatMap(item => item.postItId ? [item.postItId] : []),
        contentIds: lista.flatMap(item => item.contentId ? [item.contentId] : []),
        severidade: 'revisar',
      });
    } else if (lista.length < expectativa) {
      avisos.push({
        id: `serie-abaixo:${serie.id}`,
        tipo: 'serie-abaixo',
        texto: `${nome} tem ${lista.length} de ${expectativa} pela frequência.`,
        postItIds: lista.flatMap(item => item.postItId ? [item.postItId] : []),
        contentIds: lista.flatMap(item => item.contentId ? [item.contentId] : []),
        severidade: 'info',
      });
    }
  }
  return avisos;
}

export function avisosDeOrientacao({
  postIts,
  contents,
  series,
  temas,
  obras,
  periodo,
  sequenciaPorConteudo = {},
}: {
  postIts: readonly PlanejamentoPostIt[];
  contents: readonly Content[];
  series: readonly Serie[];
  temas: readonly Tema[];
  obras: readonly Pick<BibliotecaItem, 'id' | 'titulo'>[];
  periodo: PeriodoGrade;
  /** Id de sequência intencional por contentId. Sem campo no banco, fica vazio. */
  sequenciaPorConteudo?: Readonly<Record<string, string>>;
}): AvisoOrientacao[] {
  // Janela um pouco maior que o período para obra em 7 dias tocar a borda.
  const margemInicio = format(addDays(parseISO(periodo.inicio), -6), 'yyyy-MM-dd');
  const margemFim = format(addDays(parseISO(periodo.fim), 6), 'yyyy-MM-dd');
  const pautas = pautasDoPeriodo({
    postIts,
    contents,
    sequenciaPorConteudo,
    periodo: {inicio: margemInicio, fim: margemFim},
  });

  return [
    ...avisosDeObra(pautas, periodo, obras),
    ...avisosDeTema(pautas, periodo, temas),
    ...avisosDeQuadroSeguido(pautas, periodo, series),
    ...avisosDeFrequenciaSerie(pautas, periodo, series),
  ];
}

export function pontosParaRevisar(avisos: readonly AvisoOrientacao[]): number {
  return avisos.filter(aviso => aviso.severidade === 'revisar').length;
}
