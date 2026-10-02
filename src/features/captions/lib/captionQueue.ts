import type { Content, ContentPlataforma } from '../../../lib/database.ts';
import { CONTENT_STATUS, normalizeContentStatus } from '../../contents/lib/contentPipeline.ts';

export type CaptionListFilter = 'todos' | 'sem-legenda' | 'com-legenda';

export const CAPTION_PAGE_SIZE = 10;

type CaptionSource = Pick<ContentPlataforma, 'platformId' | 'legenda' | 'hashtags'>;

export function formatCaptionBlock(record: Pick<ContentPlataforma, 'legenda' | 'hashtags'>): string {
  return [record.legenda.trim(), record.hashtags.trim()].filter(Boolean).join('\n\n');
}

/** Texto pronto para colar. Prefere a rede em foco; junta as demais só quando há mais de uma. */
export function captionClipboardText(
  plataformas: CaptionSource[],
  preferredPlatformId?: string | null,
): string {
  const blocks = plataformas.flatMap(record => {
    const text = formatCaptionBlock(record);
    if (!text) return [];
    return [{ platformId: record.platformId, text }];
  });

  if (blocks.length === 0) return '';

  const preferred = preferredPlatformId
    ? blocks.find(block => block.platformId === preferredPlatformId)
    : undefined;
  if (preferred) return preferred.text;
  if (blocks.length === 1) return blocks[0].text;

  return blocks.map(block => `${block.platformId}\n${block.text}`).join('\n\n');
}

export function isCaptionQueueContent(
  content: Pick<Content, 'status' | 'deletedAt' | 'archivedAt'>,
): boolean {
  if (content.deletedAt || content.archivedAt) return false;
  const status = normalizeContentStatus(content.status);
  return status === CONTENT_STATUS.ROTEIRO
    || status === CONTENT_STATUS.PRODUCAO
    || status === CONTENT_STATUS.POSTADO;
}

export function contentHasCaption(content: Pick<Content, 'plataformas'>): boolean {
  return content.plataformas.some(item => formatCaptionBlock(item).length > 0);
}

export function filterCaptionQueue<T extends Content>(
  contents: T[],
  filter: CaptionListFilter,
  search: string,
): T[] {
  const query = search.trim().toLocaleLowerCase('pt-BR');

  return contents
    .filter(isCaptionQueueContent)
    .filter(content => {
      if (filter === 'sem-legenda') return !contentHasCaption(content);
      if (filter === 'com-legenda') return contentHasCaption(content);
      return true;
    })
    .filter(content => {
      if (!query) return true;
      return content.title.toLocaleLowerCase('pt-BR').includes(query);
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function paginateCaptionQueue<T>(
  items: readonly T[],
  requestedPage: number,
  pageSize = CAPTION_PAGE_SIZE,
) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    totalItems,
    totalPages,
  };
}
