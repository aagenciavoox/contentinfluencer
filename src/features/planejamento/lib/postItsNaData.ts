import type {Content} from '../../../lib/database.ts';
import {CONTENT_STATUS, normalizeContentStatus} from '../../contents/lib/contentPipeline.ts';
import {applyScheduleToContent} from '../../editorial-calendar/lib/scheduleContent.ts';
import {retirarPrevisao} from '../../editorial/lib/dataVencida.ts';
import type {DestinoPlataforma} from '../../editorial/lib/destinations.ts';
import {buildGradeEntries, type GradeContent, type GradeSerie} from '../../editorial/lib/gradeEntries.ts';
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
 * Uma data por publicação em todas as telas. Post-it ligado a roteiro com data fica no dia do roteiro,
 * o mesmo que a contagem e o Calendário usam. Sem data no roteiro, vale o dia do próprio post-it.
 * Devolve o mesmo objeto quando nada muda.
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
