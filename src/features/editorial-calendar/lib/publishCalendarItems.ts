import { format } from 'date-fns';
import type { Content, ContentPlataforma } from '../../../lib/database.ts';
import { platformKey } from '../../../components/ui/platformName.ts';
import { contaDaRef, rotuloDaRef, type ContaRef } from '../../contas/lib/contas.ts';
import { CONTENT_STATUS, DISPLAY_STATUS, getDisplayStatus, normalizeContentStatus } from '../../contents/lib/contentPipeline.ts';
import { buildGradeEntries, quandoDoItem, type GradeSerie, type Quando } from '../../editorial/lib/gradeEntries.ts';
import { dataRealizada, earliestRealizadaEm, rotuloStatusPublicacao } from '../../editorial/lib/markPublished.ts';
const TODAS_AS_REDES = 'todas';

export type PublishCalendarItem = {
  id: string;
  contentId: string;
  date: string | null;
  time: string | null;
  plataformaId?: string;
  /** Rótulo das contas: plataforma e @. Também serve ao `PlatformIcon`. */
  platformNames: string[];
  /** A publicação deste item já foi ao ar. */
  posted: boolean;
  /** Marcada como não foi ao ar ou removida. */
  cancelled: boolean;
};

type PlatformRef = ContaRef;

function canonicalPlatformId(ref: string, platforms: readonly PlatformRef[]): string {
  return contaDaRef(ref, platforms)?.id ?? ref;
}

function platformName(ref: string, platforms: readonly PlatformRef[]): string {
  return rotuloDaRef(ref, platforms);
}

/** Filtro de conta: o id da conta, o rótulo (plataforma e @) ou, em dado antigo, o nome. */
function passaNoFiltro(ref: string, filtro: string, platforms: readonly PlatformRef[]): boolean {
  if (ref === filtro) return true;
  const conta = contaDaRef(ref, platforms);
  if (conta && conta.id === filtro) return true;
  const chave = platformKey(filtro);
  return platformKey(platformName(ref, platforms)) === chave
    || (conta ? platformKey(conta.nome) === chave : platformKey(ref) === chave);
}

function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of names) {
    const key = platformKey(name);
    if (!name || seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

/**
 * Publicada conta como postada; não foi ao ar e removida, não.
 * Sem marca na rede, o original segue o roteiro marcado como Postado. O repost, não.
 */
function cancelada(publicacao: ContentPlataforma | undefined): boolean {
  return publicacao?.status === 'nao_publicada' || publicacao?.status === 'removida';
}

function publicacaoPostada(content: Content, publicacao: ContentPlataforma | undefined): boolean {
  if (publicacao?.status === 'publicada') return true;
  if (cancelada(publicacao)) return false;
  if (publicacao?.publicationKind === 'repost') return false;
  return getDisplayStatus(content) === CONTENT_STATUS.POSTADO;
}

function hora(value: string | null | undefined): string | null {
  const match = value ? /(\d{2}):(\d{2})/.exec(value) : null;
  return match ? `${match[1]}:${match[2]}` : null;
}

function planejado(date: string | null | undefined, time: string | null | undefined): Quando {
  return { date: date || null, time: date ? hora(time) : null };
}

function realizadaEm(publicacoes: ReadonlyArray<ContentPlataforma | undefined>): string | null {
  return earliestRealizadaEm(
    publicacoes
      .filter((publicacao): publicacao is ContentPlataforma => publicacao?.status === 'publicada')
      .map(publicacao => dataRealizada(publicacao)),
  );
}

/**
 * Sem rede de referência, cada roteiro entra uma vez, com todas as suas redes,
 * e cada repost entra na data dele.
 */
function itensSemReferencia(content: Content, platforms: readonly PlatformRef[]): PublishCalendarItem[] {
  if (content.deletedAt || content.archivedAt) return [];
  const publicacoes = content.plataformas ?? [];
  const originais = publicacoes.filter(publicacao => publicacao.publicationKind !== 'repost');
  const primeiraComData = originais
    .filter(publicacao => publicacao.publishDate)
    .sort((left, right) => (left.publishDate ?? '').localeCompare(right.publishDate ?? ''))[0];
  const plano = content.publishDate
    ? planejado(content.publishDate, content.publishTime)
    : planejado(primeiraComData?.publishDate, primeiraComData?.publishTime);
  const posted = getDisplayStatus(content) === CONTENT_STATUS.POSTADO
    || originais.some(publicacao => publicacao.status === 'publicada');
  const quando = quandoDoItem(content, plano, posted, realizadaEm(originais));

  const itens: PublishCalendarItem[] = [{
    id: `${content.id}:original`,
    contentId: content.id,
    date: quando.date,
    time: quando.time,
    plataformaId: originais[0]?.id,
    platformNames: uniqueNames(originais.map(publicacao => platformName(publicacao.platformId, platforms))),
    posted,
    cancelled: !posted && originais.length > 0 && originais.every(cancelada),
  }];

  for (const repost of publicacoes) {
    if (repost.publicationKind !== 'repost') continue;
    const repostPosted = publicacaoPostada(content, repost);
    const quandoRepost = quandoDoItem(
      content,
      planejado(repost.publishDate, repost.publishTime),
      repostPosted,
      realizadaEm([repost]),
    );
    itens.push({
      id: `${content.id}:repost:${repost.id}`,
      contentId: content.id,
      date: quandoRepost.date,
      time: quandoRepost.time,
      plataformaId: repost.id,
      platformNames: [platformName(repost.platformId, platforms)],
      posted: repostPosted,
      cancelled: cancelada(repost),
    });
  }

  return itens;
}

export function todayKey(now = new Date()): string {
  return format(now, 'yyyy-MM-dd');
}

/** Programado: ainda não foi ao ar, não foi descartado e a data é hoje ou depois. */
export function isScheduledItem(
  item: Pick<PublishCalendarItem, 'posted' | 'cancelled' | 'date'>,
  hoje = todayKey(),
): boolean {
  return !item.posted && !item.cancelled && Boolean(item.date) && (item.date ?? '').slice(0, 10) >= hoje;
}

/**
 * Cada publicação mostra o próprio status: o repost ainda por vir de um roteiro
 * já postado aparece como Programado, não como Postado.
 */
export function publishItemStatus(content: Content, item: PublishCalendarItem, hoje = todayKey()): string {
  if (item.posted) return CONTENT_STATUS.POSTADO;
  if (isScheduledItem(item, hoje)) return DISPLAY_STATUS.PROGRAMADO;
  const status = normalizeContentStatus(content.status);
  if (status !== CONTENT_STATUS.POSTADO && !content.postedAt) return status;
  const publicacao = (content.plataformas ?? []).find(candidate => candidate.id === item.plataformaId);
  return rotuloStatusPublicacao(publicacao?.status);
}

/**
 * "Todas" mostra um item por entrada da grade, com as redes daquele roteiro.
 * Sem rede de referência, um item por roteiro.
 * Uma rede mostra um item por publicação dela, na data dessa publicação.
 * O que já foi ao ar fica no dia em que foi postado.
 */
export function buildPublishCalendarItems(input: {
  contents: readonly Content[];
  platforms: readonly PlatformRef[];
  series: readonly GradeSerie[];
  redeReferenciaId: string | null;
  platformFilter?: string;
}): PublishCalendarItem[] {
  const platformFilter = input.platformFilter || TODAS_AS_REDES;
  const referenciaId = input.redeReferenciaId
    ? canonicalPlatformId(input.redeReferenciaId, input.platforms)
    : null;

  if (platformFilter !== TODAS_AS_REDES) {
    const itens: PublishCalendarItem[] = [];
    for (const content of input.contents) {
      if (content.deletedAt || content.archivedAt) continue;
      for (const publicacao of content.plataformas ?? []) {
        const nome = platformName(publicacao.platformId, input.platforms);
        if (!passaNoFiltro(publicacao.platformId, platformFilter, input.platforms)) continue;
        const posted = publicacaoPostada(content, publicacao);
        const quando = quandoDoItem(
          content,
          planejado(publicacao.publishDate, publicacao.publishTime),
          posted,
          realizadaEm([publicacao]),
        );
        itens.push({
          id: `${content.id}:pub:${publicacao.id}`,
          contentId: content.id,
          date: quando.date,
          time: quando.time,
          plataformaId: publicacao.id,
          platformNames: [nome],
          posted,
          cancelled: cancelada(publicacao),
        });
      }
    }
    return itens;
  }

  if (!referenciaId) {
    return input.contents.flatMap(content => itensSemReferencia(content, input.platforms));
  }

  const series: GradeSerie[] = input.series.map(serie => ({
    id: serie.id,
    funcaoPadrao: serie.funcaoPadrao,
  }));
  const entries = buildGradeEntries({
    contents: input.contents,
    series,
    settings: { redeReferenciaId: referenciaId },
    platforms: input.platforms,
  });

  return entries.flatMap(entry => {
    const content = input.contents.find(item => item.id === entry.contentId);
    if (!content) return [];
    const publicacoes = (content.plataformas ?? []).map(publicacao => ({
      ...publicacao,
      platformId: canonicalPlatformId(publicacao.platformId, input.platforms),
    }));
    const repostId = entry.tipo === 'repost'
      ? entry.id.split(':repost:')[1]
      : undefined;
    const nomes = entry.tipo === 'repost'
      ? [platformName(referenciaId || '', input.platforms)].filter(nome => nome && nome !== (referenciaId || ''))
      : uniqueNames(
        publicacoes
          .filter(publicacao => publicacao.publicationKind !== 'repost')
          .map(publicacao => platformName(publicacao.platformId, input.platforms)),
      );
    const original = publicacoes.find(publicacao =>
      publicacao.publicationKind !== 'repost' && publicacao.platformId === referenciaId,
    );
    const repost = repostId ? publicacoes.find(publicacao => publicacao.id === repostId) : undefined;
    const publicacao = entry.tipo === 'repost' ? repost : original;
    const posted = publicacaoPostada(content, publicacao);

    return [{
      id: entry.id,
      contentId: entry.contentId,
      date: entry.data,
      time: entry.hora,
      plataformaId: repostId || original?.id,
      platformNames: entry.tipo === 'repost' && referenciaId
        ? [platformName(referenciaId, input.platforms)]
        : nomes,
      posted,
      cancelled: cancelada(publicacao),
    }];
  });
}

