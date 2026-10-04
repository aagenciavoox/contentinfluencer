import type { Content, ContentPlataforma, FuncaoEditorial, Serie } from '../../../lib/database.ts';
import { CONTENT_STATUS, normalizeContentStatus } from '../../contents/lib/contentPipeline.ts';
import { resolveFuncao } from './funcoes.ts';
import { dataRealizada } from './markPublished.ts';

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

function naReferencia(publicacao: ContentPlataforma, redeReferenciaId: string | null): boolean {
  return Boolean(redeReferenciaId) && publicacao.platformId === redeReferenciaId;
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
}: {
  contents: readonly GradeContent[];
  series: readonly GradeSerie[];
  settings: GradeEntrySettings;
}): GradeEntry[] {
  const seriePorId = new Map(series.map(serie => [serie.id, serie]));
  const redeId = settings.redeReferenciaId || null;
  const entradas: GradeEntry[] = [];

  for (const content of contents) {
    if (content.deletedAt || content.archivedAt) continue;

    const publicacoes = content.plataformas ?? [];
    const daReferencia = publicacoes.filter(publicacao => naReferencia(publicacao, redeId));
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

    entradas.push({
      id: `${content.id}:original`,
      contentId: content.id,
      tipo: 'original',
      data: dataDaRede ?? dia(content.publishDate),
      hora: dataDaRede ? horaDe(originalPub?.publishTime) : horaDe(content.publishTime),
      ...classificacao,
      realizada,
      realizadaEm: realizada
        ? (originalPub ? dataRealizada(originalPub) : content.postedAt ?? null)
        : null,
    });

    for (const publicacao of daReferencia) {
      if (!ehRepost(publicacao)) continue;
      const publicada = publicacao.status === 'publicada';
      entradas.push({
        id: `${content.id}:repost:${publicacao.id}`,
        contentId: content.id,
        tipo: 'repost',
        data: dia(publicacao.publishDate),
        hora: horaDe(publicacao.publishTime),
        ...classificacao,
        contaNaGrade: classificacao.contaNaGrade && publicacao.contaNaGrade !== false,
        realizada: publicada,
        realizadaEm: publicada ? dataRealizada(publicacao) : null,
      });
    }
  }

  return entradas;
}
