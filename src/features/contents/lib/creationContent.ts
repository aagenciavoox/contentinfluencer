import type {Content, Idea} from '../../../lib/database.ts';
import {htmlToReadableText} from '../../../lib/utils.ts';
import {generateUUID, isUUID} from '../../../utils/uuid.ts';
import {CONTENT_STATUS, normalizeContentStatus} from './contentPipeline.ts';
import {createContentDraft} from './createContentDraft.ts';

export const CREATION_TABS = [
  'Todos',
  'Ideias',
  'Roteiros',
  'Produção',
  'Publicados',
  'Arquivados',
  'Lixeira',
] as const;

export type CreationTab = typeof CREATION_TABS[number];

export type CreationViewMode = 'grid' | 'list' | 'kanban';

export interface CreationFilters {
  tab: CreationTab;
  search?: string;
  pilarId?: string;
  seriesId?: string;
  originId?: string;
}

export type CreationSort = 'recent' | 'oldest' | 'title';

export interface CreationPage {
  items: Content[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export const CREATION_PAGE_SIZE = 24;

export function createIdeaContent(
  overrides: Partial<Content> = {},
): Content {
  return createContentDraft({
    status: CONTENT_STATUS.IDEIA,
    ...overrides,
  });
}

export function createScriptContent(
  overrides: Partial<Content> = {},
): Content {
  return createContentDraft({
    status: CONTENT_STATUS.ROTEIRO,
    ...overrides,
  });
}

/**
 * Compatibility adapter for callers that still produce the former Idea shape.
 * The app standardizes new Content ids as UUIDs even though the historical
 * database column is text; older ids remain available through legacyIdeaId.
 */
export function contentFromLegacyIdea(
  idea: Idea,
  overrides: Partial<Content> = {},
): Content {
  const candidateId = overrides.id ?? idea.id;
  const canonicalId = isUUID(candidateId) ? candidateId : generateUUID();
  return createIdeaContent({
    userId: idea.userId,
    title: idea.title?.trim() || idea.text.trim(),
    notes: idea.notes ?? null,
    pilarId: idea.pilarId,
    seriesId: idea.seriesId,
    bibliotecaItemId: idea.origemId,
    legacyIdeaId: idea.id,
    archivedAt: idea.archived ? new Date().toISOString() : null,
    createdAt: idea.createdAt,
    updatedAt: idea.createdAt,
    ...overrides,
    id: canonicalId,
  });
}

export function findContentForLegacyIdea(
  contents: readonly Content[],
  ideaId: string,
): Content | undefined {
  return contents.find(
    content => content.id === ideaId || content.legacyIdeaId === ideaId,
  );
}

export function updateContentFromLegacyIdea(
  content: Content,
  idea: Idea,
  now = new Date().toISOString(),
): Content {
  return {
    ...content,
    title: idea.title?.trim() || idea.text.trim(),
    notes: idea.notes ?? null,
    pilarId: idea.pilarId,
    seriesId: idea.seriesId,
    bibliotecaItemId: idea.origemId,
    legacyIdeaId: content.legacyIdeaId ?? idea.id,
    archivedAt: idea.archived ? (content.archivedAt ?? now) : null,
    updatedAt: now,
  };
}

export function transitionCreationStatus(
  content: Content,
  status: string,
  now = new Date().toISOString(),
): Content {
  return {
    ...content,
    status: normalizeContentStatus(status),
    archivedAt: null,
    updatedAt: now,
  };
}

export function promoteContentToScript(
  content: Content,
  now = new Date().toISOString(),
): Content {
  return transitionCreationStatus(content, CONTENT_STATUS.ROTEIRO, now);
}

export function demoteContentToIdea(
  content: Content,
  now = new Date().toISOString(),
): Content {
  return transitionCreationStatus(content, CONTENT_STATUS.IDEIA, now);
}

export function archiveCreation(
  content: Content,
  now = new Date().toISOString(),
): Content {
  return {
    ...content,
    archivedAt: content.archivedAt ?? now,
    updatedAt: now,
  };
}

export function restoreCreation(
  content: Content,
  now = new Date().toISOString(),
): Content {
  return {
    ...content,
    archivedAt: null,
    updatedAt: now,
  };
}

export function restoreDeletedCreation(
  content: Content,
  now = new Date().toISOString(),
): Content {
  return {
    ...content,
    deletedAt: null,
    updatedAt: now,
  };
}

export function removeDeletedCreations(
  contents: readonly Content[],
): Content[] {
  return contents.filter(content => content.deletedAt == null);
}

export function isArchivedCreation(
  content: Pick<Content, 'archivedAt' | 'deletedAt'>,
): boolean {
  return content.deletedAt == null && content.archivedAt != null;
}

export function filterContentsByCreationTab(
  contents: readonly Content[],
  tab: CreationTab,
): Content[] {
  return contents.filter(content => {
    if (tab === 'Lixeira') return content.deletedAt != null;
    if (content.deletedAt != null) return false;
    if (tab === 'Arquivados') return content.archivedAt != null;
    if (content.archivedAt != null) return false;

    const status = normalizeContentStatus(content.status);
    const posted = status === CONTENT_STATUS.POSTADO || Boolean(content.postedAt);

    switch (tab) {
      case 'Ideias':
        return !posted && status === CONTENT_STATUS.IDEIA;
      case 'Roteiros':
        return !posted && status === CONTENT_STATUS.ROTEIRO;
      case 'Produção':
        return !posted && status === CONTENT_STATUS.PRODUCAO;
      case 'Publicados':
        return posted;
      case 'Todos':
      default:
        return true;
    }
  });
}

export function filterCreationContents(
  contents: readonly Content[],
  filters: CreationFilters,
): Content[] {
  const normalizedSearch = filters.search?.trim().toLocaleLowerCase('pt-BR') ?? '';

  return filterContentsByCreationTab(contents, filters.tab)
    .filter(content => !filters.pilarId || content.pilarId === filters.pilarId)
    .filter(content => !filters.seriesId || content.seriesId === filters.seriesId)
    .filter(content => !filters.originId || content.bibliotecaItemId === filters.originId)
    .filter(content => {
      if (!normalizedSearch) return true;
      return [
        content.title,
        content.notes ?? '',
        htmlToReadableText(content.script),
        ...(content.tags ?? []),
      ].some(value => value.toLocaleLowerCase('pt-BR').includes(normalizedSearch));
    });
}

export function sortCreationContents(
  contents: readonly Content[],
  sort: CreationSort,
): Content[] {
  return [...contents].sort((left, right) => {
    if (sort === 'title') {
      return left.title.localeCompare(right.title, 'pt-BR');
    }
    const delta = new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    return sort === 'oldest' ? -delta : delta;
  });
}

export function paginateCreationContents(
  contents: readonly Content[],
  requestedPage: number,
  pageSize = CREATION_PAGE_SIZE,
): CreationPage {
  const totalItems = contents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * pageSize;

  return {
    items: contents.slice(start, start + pageSize),
    page,
    pageSize,
    totalItems,
    totalPages,
  };
}

export function getCreationTabCounts(
  contents: readonly Content[],
): Record<CreationTab, number> {
  return CREATION_TABS.reduce<Record<CreationTab, number>>((counts, tab) => {
    counts[tab] = filterContentsByCreationTab(contents, tab).length;
    return counts;
  }, {
    Todos: 0,
    Ideias: 0,
    Roteiros: 0,
    Produção: 0,
    Publicados: 0,
    Arquivados: 0,
    Lixeira: 0,
  });
}
