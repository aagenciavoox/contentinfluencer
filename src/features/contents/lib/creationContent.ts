import type {Content, FuncaoPadraoSerie, Idea, RedeSocial} from '../../../lib/database.ts';
import {htmlToReadableText} from '../../../lib/utils.ts';
import {generateUUID, isUUID} from '../../../utils/uuid.ts';
import { passaNoFiltroData, type FiltroData } from '../../editorial/lib/datasNaGrade.ts';
import { isFuncaoEditorial, resolveFuncao } from '../../editorial/lib/funcoes.ts';
import {
  applyStatusMilestones,
  CONTENT_STATUS,
  normalizeContentStatus,
  PRODUCTION_TAGS,
  statusRank,
  withProductionTag,
} from './contentPipeline.ts';
import {livroIdsEfetivos} from '../../../lib/livroIds.ts';
import {createContentDraft} from './createContentDraft.ts';
import {matchesTemaFilter} from './temaFilter.ts';
import {contentReadableBody, isCarouselContent} from './carouselSlides.ts';
import {passaNoFiltroRede} from '../../creation/lib/creationRedeFilter.ts';

export const CREATION_TABS = [
  'Todos',
  'Ideias',
  'Roteiros',
  'Produção',
  'Edição',
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
  funcao?: string;
  temaId?: string;
  /** Vários temas; passa quem tiver qualquer um. */
  temaIds?: readonly string[];
  temas?: readonly { id: string; nome: string }[];
  series?: readonly { id: string; funcaoPadrao?: FuncaoPadraoSerie | null }[];
  /** Data na grade, pela mesma regra do Editorial. Precisa de `datasNaGrade`. */
  filtroData?: FiltroData | null;
  datasNaGrade?: ReadonlyMap<string, readonly string[]>;
  /** Rede (`instagram`, `blog`…) ou `sem-rede`. Precisa de `redesPorConteudo`. */
  rede?: string;
  redesPorConteudo?: ReadonlyMap<string, readonly RedeSocial[]>;
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

/**
 * A regra de troca de etapa, a mesma em todas as telas. Dá para pular ou voltar etapas.
 * Ao sair de Ideia, o texto da ideia vira o roteiro (se ele ainda estiver vazio).
 * Vídeo que chega a Produção vindo da escrita fica marcado para gravar.
 */
export function applyStatusChange(
  content: Content,
  status: string,
  now = new Date().toISOString(),
): Content {
  const from = normalizeContentStatus(content.status);
  const nextStatus = normalizeContentStatus(status);
  if (from === nextStatus) return content;

  const next: Content = {
    ...content,
    ...applyStatusMilestones(content, nextStatus, {now}),
    status: nextStatus,
    updatedAt: now,
  };

  if (from === CONTENT_STATUS.IDEIA) {
    const currentScript = htmlToReadableText(content.script).trim();
    const ideaText = htmlToReadableText(content.notes).trim();
    if (!currentScript && ideaText) next.script = ideaTextToScriptHtml(content.notes ?? '');
  }

  if (
    nextStatus === CONTENT_STATUS.PRODUCAO
    && statusRank(from) < statusRank(CONTENT_STATUS.PRODUCAO)
    && !isCarouselContent(content)
  ) {
    next.tags = withProductionTag(content.tags ?? [], PRODUCTION_TAGS.GRAVAR);
  }

  return next;
}

/** Troca de etapa pela Criação (Kanban, "Mover para…"): também tira do arquivo. */
export function transitionCreationStatus(
  content: Content,
  status: string,
  now = new Date().toISOString(),
): Content {
  return {
    ...applyStatusChange(content, status, now),
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function readableTextToScriptHtml(value: string): string {
  const normalized = value.trim();
  if (!normalized) return '';

  return normalized
    .split(/\n{2,}/)
    .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function ideaTextToScriptHtml(value: string): string {
  const normalized = value.trim();
  if (!normalized) return '';
  return /<([a-z][\w-]*)(?:\s[^>]*)?>/i.test(normalized)
    ? normalized
    : readableTextToScriptHtml(normalized);
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
      case 'Edição':
        return !posted && status === CONTENT_STATUS.EDICAO;
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
    .filter(content => !filters.temaId || (content.temaIds ?? []).includes(filters.temaId))
    .filter(content => matchesTemaFilter(content.temaIds, filters.temaIds ?? [], filters.temas))
    .filter(content => !filters.originId || livroIdsEfetivos(content).includes(filters.originId))
    .filter(content => passaNoFiltroData(filters.datasNaGrade?.get(content.id), filters.filtroData ?? null))
    .filter(content => passaNoFiltroRede(filters.redesPorConteudo?.get(content.id), filters.rede))
    .filter(content => {
      if (!filters.funcao || !isFuncaoEditorial(filters.funcao)) return true;
      const serie = filters.series?.find(item => item.id === content.seriesId) ?? null;
      return resolveFuncao(content, serie).funcao === filters.funcao;
    })
    .filter(content => {
      if (!normalizedSearch) return true;
      return [
        content.title,
        content.notes ?? '',
        contentReadableBody(content),
        ...(content.tags ?? []),
        ...(filters.temas ?? [])
          .filter(tema => (content.temaIds ?? []).includes(tema.id))
          .map(tema => tema.nome),
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
    const delta = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
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
    Edição: 0,
    Publicados: 0,
    Arquivados: 0,
    Lixeira: 0,
  });
}
