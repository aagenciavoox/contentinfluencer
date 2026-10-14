import type { Content, ContentPlataforma, FuncaoEditorial, Serie } from '../../../lib/database.ts';
import { CONTENT_STATUS, normalizeContentStatus } from '../../contents/lib/contentPipeline.ts';
import { resolveFuncao } from './funcoes.ts';
import { dataRealizada } from './markPublished.ts';
import { type DestinoPlataforma, mesmoDestino, resolverRedeReferencia } from './destinations.ts';

export type GradeEntry = {
  id: string;
  contentId: string;
  tipo: 'original' | 'repost';
  data: string | null;
  hora: string | null;
  contaNaGrade: boolean;
  pilarId: string | null;
  serieId: string | null;
  funcao: FuncaoEditorial | null;
  realizada: boolean;
  realizadaEm: string | null;
};

/** A rede de referência vem das preferências. Sem ela, publicação em qualquer rede fica de fora. */
export type GradeEntrySettings = {
  redeReferenciaId: string | null;
};

export type GradeContent = Pick<
  Content,
  | 'id'
  | 'status'
  | 'seriesId'
  | 'pilarId'
  | 'funcao'
  | 'funcaoOrigem'
  | 'classificacaoCongeladaEm'
  | 'contaNaGrade'
  | 'publishDate'
  | 'plataformas'
  | 'deletedAt'
> & Partial<Pick<Content, 'publishTime' | 'postedAt' | 'archivedAt'>>;

export type GradeSerie = Pick<Serie, 'id' | 'funcaoPadrao'>;

function dia(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match?.[1] ?? null;
}

function horaDe(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /(\d{2}):(\d{2})/.exec(value.trim());
  return match ? `${match[1]}:${match[2]}` : null;
}

export type Quando = { date: string | null; time: string | null };

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** O instante salvo em UTC (API, postedAt) vira dia e hora locais. */
function quandoLocal(instante: string | null | undefined): Quando | null {
  if (!instante) return null;
  const date = new Date(instante);
  if (Number.isNaN(date.getTime())) return null;
  return {
    date: `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`,
    time: `${pad2(date.getHours())}:${pad2(date.getMinutes())}`,
  };
}

/**
 * Postado fica no dia em que foi ao ar, quando essa data foi informada.
 * Sem ela, fica na data planejada e, por último, no dia em que virou Postado.
 * Ainda não postado: a data planejada, sem mudança.
 */
export function quandoDoItem(
  content: Pick<GradeContent, 'postedAt'>,
  plano: Quando,
  postado: boolean,
  realizadaEm: string | null,
): Quando {
  if (!postado) return plano;
  return quandoLocal(realizadaEm)
    ?? (plano.date ? plano : null)
    ?? quandoLocal(content.postedAt)
    ?? plano;
}

function naReferencia(publicacao: ContentPlataforma, rede: DestinoPlataforma | null): boolean {
  return rede != null && mesmoDestino(publicacao.platformId, rede);
}

function ehRepost(publicacao: ContentPlataforma): boolean {
  return publicacao.publicationKind === 'repost';
}

/**
 * Entradas da grade, calculadas. Não há tabela de entradas.
 * Original: data da publicação na rede de referência, ou a do roteiro se essa rede não tiver data.
 * Roteiro só com publicações em outras redes é extra e não entra.
 * Roteiro sem nenhuma publicação usa a data do próprio roteiro.
 * Cada repost na rede de referência entra com a data dele e a classificação do original.
 */
export function buildGradeEntries({
  contents,
  series,
  settings,
  platforms = [],
}: {
  contents: readonly GradeContent[];
  series: readonly GradeSerie[];
  settings: GradeEntrySettings;
  /** Resolve a rede de referência por id ou nome. Sem ela, só casa publicações já gravadas com o mesmo id. */
  platforms?: readonly DestinoPlataforma[];
}): GradeEntry[] {
  const seriePorId = new Map(series.map(serie => [serie.id, serie]));
  const rede = resolverRedeReferencia(settings.redeReferenciaId, platforms);
  const entradas: GradeEntry[] = [];

  for (const content of contents) {
    if (content.deletedAt || content.archivedAt) continue;

    const publicacoes = content.plataformas ?? [];
    const daReferencia = publicacoes.filter(publicacao => naReferencia(publicacao, rede));
    const extra = publicacoes.length > 0 && daReferencia.length === 0;
    if (extra) continue;

    const serie = content.seriesId ? seriePorId.get(content.seriesId) : undefined;
    const resolvida = resolveFuncao(content, serie);
    const classificacao = {
      pilarId: content.pilarId ?? null,
      serieId: content.seriesId ?? null,
      funcao: resolvida.funcao,
      contaNaGrade: content.contaNaGrade !== false,
    };

    const originalPub = daReferencia.find(publicacao => !ehRepost(publicacao)) ?? null;
    const dataDaRede = originalPub ? dia(originalPub.publishDate) : null;
    const realizada = originalPub
      ? originalPub.status === 'publicada'
      : normalizeContentStatus(content.status) === CONTENT_STATUS.POSTADO;
    const realizadaEmOriginal = realizada
      ? (originalPub ? dataRealizada(originalPub) : content.postedAt ?? null)
      : null;
    const planoOriginal: Quando = {
      date: dataDaRede ?? dia(content.publishDate),
      time: dataDaRede ? horaDe(originalPub?.publishTime) : horaDe(content.publishTime),
    };
    // Só a data real na rede entra como 1º critério; sem publicação, content.postedAt
    // é só o 3º critério do quandoDoItem (dia em que virou Postado), nunca o 1º.
    const realizadaNaRede = originalPub ? dataRealizada(originalPub) : null;
    const quandoOriginal = quandoDoItem(content, planoOriginal, realizada, realizadaNaRede);

    entradas.push({
      id: `${content.id}:original`,
      contentId: content.id,
      tipo: 'original',
      data: quandoOriginal.date,
      hora: quandoOriginal.time,
      ...classificacao,
      realizada,
      realizadaEm: realizadaEmOriginal,
    });

    for (const publicacao of daReferencia) {
      if (!ehRepost(publicacao)) continue;
      const publicada = publicacao.status === 'publicada';
      const realizadaEmRepost = publicada ? dataRealizada(publicacao) : null;
      const planoRepost: Quando = { date: dia(publicacao.publishDate), time: horaDe(publicacao.publishTime) };
      const quandoRepost = quandoDoItem(content, planoRepost, publicada, realizadaEmRepost);
      entradas.push({
        id: `${content.id}:repost:${publicacao.id}`,
        contentId: content.id,
        tipo: 'repost',
        data: quandoRepost.date,
        hora: quandoRepost.time,
        ...classificacao,
        contaNaGrade: classificacao.contaNaGrade && publicacao.contaNaGrade !== false,
        realizada: publicada,
        realizadaEm: realizadaEmRepost,
      });
    }
  }

  return entradas;
}
