import type {Content} from '../../../lib/database.ts';
import {CONTENT_STATUS, normalizeContentStatus} from '../../contents/lib/contentPipeline.ts';
import {applyScheduleToContent} from '../../editorial-calendar/lib/scheduleContent.ts';
import {retirarPrevisao} from '../../editorial/lib/dataVencida.ts';
import type {DestinoPlataforma} from '../../editorial/lib/destinations.ts';
import {buildGradeEntries, type GradeContent, type GradeSerie} from '../../editorial/lib/gradeEntries.ts';
import {dataRealizada, earliestRealizadaEm} from '../../editorial/lib/markPublished.ts';
import {normalizePublicacaoStatus} from '../../editorial/lib/publicacaoSituacao.ts';

type PostItComData = {
  contentId: string | null;
  date: string | null;
};

function dia(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match?.[1] ?? null;
}

/**
 * Alinha o dia do post-it à data do roteiro ligado.
 * O Planejamento não usa mais isto: o post-it guarda o próprio rascunho.
 * Mantida para testes e para quem ainda quiser o alinhamento explícito.
 */
export function postItsNaDataDoRoteiro<T extends PostItComData>({
  postIts,
  contents,
  series,
  redeReferenciaId,
  platforms = [],
}: {
  postIts: readonly T[];
  contents: readonly (GradeContent & Pick<Content, 'deletedAt'>)[];
  series: readonly GradeSerie[];
  redeReferenciaId: string | null;
  platforms?: readonly DestinoPlataforma[];
}): T[] {
  if (!postIts.some(postIt => postIt.contentId)) return [...postIts];
  const ligados = new Set(postIts.flatMap(postIt => postIt.contentId ? [postIt.contentId] : []));
  const doRoteiro = contents.filter(content => ligados.has(content.id) && !content.deletedAt);
  const dataPorRoteiro = new Map<string, string>();
  for (const entry of buildGradeEntries({contents: doRoteiro, series, settings: {redeReferenciaId}, platforms})) {
    if (entry.tipo !== 'original' || !entry.data || dataPorRoteiro.has(entry.contentId)) continue;
    dataPorRoteiro.set(entry.contentId, entry.data);
  }
  for (const content of doRoteiro) {
    if (dataPorRoteiro.has(content.id)) continue;
    const data = dia(content.publishDate);
    if (data) dataPorRoteiro.set(content.id, data);
  }

  return postIts.map(postIt => {
    const data = postIt.contentId ? dataPorRoteiro.get(postIt.contentId) : undefined;
    if (!data || data === postIt.date) return postIt;
    return {...postIt, date: data};
  });
}

/** Já saiu: a data é a da publicação e não muda pelo Planejamento. */
export function roteiroPublicado(content: Pick<Content, 'status' | 'postedAt'>): boolean {
  return Boolean(content.postedAt) || normalizeContentStatus(content.status) === CONTENT_STATUS.POSTADO;
}

function hora(value: string | null | undefined): string | null {
  const match = value ? /(\d{2}):(\d{2})/.exec(value) : null;
  return match ? `${match[1]}:${match[2]}` : null;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** Instante ISO vira dia e hora locais. Data sem hora fica só com o dia. */
function instanteDe(value: string | null | undefined): { date: string; time: string | null } | null {
  if (!value) return null;
  const texto = value.trim();
  const soDia = /^(\d{4}-\d{2}-\d{2})$/.exec(texto);
  if (soDia) return { date: soDia[1], time: null };
  const date = new Date(texto);
  if (Number.isNaN(date.getTime())) return null;
  return {
    date: `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`,
    time: `${pad2(date.getHours())}:${pad2(date.getMinutes())}`,
  };
}

export type QuandoFoiAoAr = { date: string; time: string | null };

/**
 * Dia e hora em que o roteiro foi ao ar: a publicação mais cedo, depois postedAt, depois o plano.
 * Roteiro que ainda não saiu devolve null.
 */
export function quandoFoiAoAr(
  content: Pick<Content, 'status' | 'postedAt' | 'publishDate' | 'publishTime' | 'plataformas'>,
): QuandoFoiAoAr | null {
  if (!roteiroPublicado(content)) return null;
  const realizadas = (content.plataformas ?? [])
    .filter(plataforma => plataforma.status === 'publicada')
    .map(plataforma => dataRealizada(plataforma))
    .filter((value): value is string => Boolean(value));
  const doAr = instanteDe(earliestRealizadaEm(realizadas)) ?? instanteDe(content.postedAt);
  if (doAr) return doAr;
  const plano = dia(content.publishDate);
  if (!plano) return null;
  return { date: plano, time: hora(content.publishTime) };
}

/** "Publicado em dd/MM HH:mm". Sem hora, só o dia. */
export function rotuloPublicadoEm(quando: QuandoFoiAoAr): string {
  const [, mes, diaMes] = quando.date.split('-');
  const data = `${diaMes}/${mes}`;
  return quando.time ? `Publicado em ${data} ${quando.time}` : `Publicado em ${data}`;
}

/** No quadro, o post-it publicado fica no dia em que foi ao ar. Os outros ficam no dia gravado. */
export function diaNoQuadro(
  postIt: PostItComData,
  content: Pick<Content, 'status' | 'postedAt' | 'publishDate' | 'publishTime' | 'plataformas'> | null | undefined,
): string | null {
  if (content && roteiroPublicado(content)) return quandoFoiAoAr(content)?.date ?? postIt.date;
  return postIt.date;
}

function contaAindaPrevista(status: Content['plataformas'][number]['status']): boolean {
  const situacao = normalizePublicacaoStatus(status);
  return situacao === 'prevista' || situacao === 'programada';
}

/**
 * Leva o roteiro para o dia do post-it: todas as contas ainda previstas vão para o dia, com o horário que tinham.
 * Sem dia, retira a previsão. Roteiro publicado, ou que já está no dia, devolve null.
 */
export function levarRoteiroAoDia(content: Content, date: string | null): Content | null {
  if (content.deletedAt || roteiroPublicado(content)) return null;

  if (!date) {
    const temData = Boolean(content.publishDate) || content.plataformas.some(plataforma => plataforma.publishDate);
    if (!temData) return null;
    // Conta já publicada guarda a data em que saiu.
    if (content.plataformas.some(plataforma => !contaAindaPrevista(plataforma.status) && plataforma.publishDate)) return null;
    return {...retirarPrevisao(content), updatedAt: new Date().toISOString()};
  }

  const day = date.slice(0, 10);
  const previstas = content.plataformas.filter(plataforma => contaAindaPrevista(plataforma.status));
  if (content.plataformas.length === 0) {
    if (dia(content.publishDate) === day) return null;
    return applyScheduleToContent(content, null, day, content.publishTime ?? null);
  }
  if (previstas.length === 0) return null;
  if (previstas.every(plataforma => dia(plataforma.publishDate) === day) && dia(content.publishDate) === day) return null;
  return previstas.reduce(
    (atual, plataforma) => applyScheduleToContent(
      atual,
      plataforma.platformId,
      day,
      plataforma.publishTime ?? content.publishTime ?? null,
    ),
    content,
  );
}
