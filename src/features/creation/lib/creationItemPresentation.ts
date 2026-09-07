import type { Content, Pilar, Serie } from '../../../lib/database';
import { getUsefulExcerpt } from '../../contents/lib/contentCardMeta';
import {
  CONTENT_STATUS,
  getDisplayStatus,
  normalizeContentStatus,
} from '../../contents/lib/contentPipeline';
import { transitionCreationStatus, type CreationTab } from '../../contents/lib/creationContent';

export const CREATION_KANBAN_TABS = [
  'Ideias',
  'Roteiros',
  'Produção',
  'Publicados',
] as const;

export type CreationKanbanTab = (typeof CREATION_KANBAN_TABS)[number];

export const CREATION_VIEW_STORAGE_KEY = 'creation.viewMode';

const TAB_TO_STATUS: Record<CreationKanbanTab, string> = {
  Ideias: CONTENT_STATUS.IDEIA,
  Roteiros: CONTENT_STATUS.ROTEIRO,
  Produção: CONTENT_STATUS.PRODUCAO,
  Publicados: CONTENT_STATUS.POSTADO,
};

export function getCreationTitle(content: Content) {
  return content.title.trim() || 'Sem título';
}

export function getCreationStageLabel(content: Content) {
  if (content.deletedAt) return 'Na lixeira';
  if (content.archivedAt) return 'Arquivado';
  return getDisplayStatus(content);
}

/** Status token target for moderated stage colors (gray/blue/purple/green). */
export function getCreationStageTone(content: Content): string {
  if (content.deletedAt || content.archivedAt) return 'Arquivado';
  const display = getDisplayStatus(content);
  if (display === 'Programado') return CONTENT_STATUS.PRODUCAO;
  return display;
}

export function preferredCreationEntity(
  content: Content,
  pillar?: Pilar | null,
  series?: Serie | null,
) {
  if (series || content.seriesId) {
    return {
      label: series?.name ?? 'Série',
      color: series?.cor ?? null,
    };
  }
  if (pillar || content.pilarId) {
    return {
      label: pillar?.nome ?? 'Pilar',
      color: pillar?.cor ?? null,
    };
  }
  return null;
}

export function getCreationFormatLabel(content: Content) {
  const value = content.formatoVisual?.trim();
  return value || null;
}

export function getCreationNoteExcerpt(content: Content) {
  return getUsefulExcerpt(content);
}

export function isCreationKanbanTab(tab: CreationTab): tab is CreationKanbanTab {
  return (CREATION_KANBAN_TABS as readonly string[]).includes(tab);
}

export function moveCreationToKanbanTab(
  content: Content,
  tab: CreationKanbanTab,
  now = new Date().toISOString(),
): Content {
  const next = transitionCreationStatus(content, TAB_TO_STATUS[tab], now);
  return {
    ...next,
    postedAt: tab === 'Publicados' ? (content.postedAt ?? now) : null,
  };
}

export function creationTabForContent(content: Content): CreationKanbanTab | null {
  if (content.deletedAt || content.archivedAt) return null;
  const status = normalizeContentStatus(content.status);
  const posted = status === CONTENT_STATUS.POSTADO || Boolean(content.postedAt);
  if (posted) return 'Publicados';
  if (status === CONTENT_STATUS.IDEIA) return 'Ideias';
  if (status === CONTENT_STATUS.ROTEIRO) return 'Roteiros';
  if (status === CONTENT_STATUS.PRODUCAO) return 'Produção';
  return null;
}

export function readStoredCreationViewMode(): 'grid' | 'list' | 'kanban' | null {
  try {
    const value = localStorage.getItem(CREATION_VIEW_STORAGE_KEY);
    if (value === 'list' || value === 'kanban' || value === 'grid') return value;
  } catch {
    // ignore storage failures
  }
  return null;
}

export function storeCreationViewMode(mode: 'grid' | 'list' | 'kanban') {
  try {
    localStorage.setItem(CREATION_VIEW_STORAGE_KEY, mode);
  } catch {
    // ignore storage failures
  }
}
