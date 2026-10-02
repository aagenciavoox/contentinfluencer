import type { Content } from '../../../lib/database.ts';
import { htmlToReadableText } from '../../../lib/utils.ts';
import {
  CONTENT_STATUS,
  normalizeContentStatus,
  PRODUCTION_TAGS,
} from '../../contents/lib/contentPipeline.ts';
import { transitionCreationStatus, type CreationTab } from '../../contents/lib/creationContent.ts';

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

export function getCreationFormatLabel(content: Content) {
  const value = content.formatoVisual?.trim();
  return value || null;
}

const TECHNICAL_TIME_MARK =
  /\[\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:--|[-–—])\s*\d{1,2}:\d{2}(?::\d{2})?)?\]/g;
const TECHNICAL_TAGS = new Set<string>([
  PRODUCTION_TAGS.GRAVAR,
  PRODUCTION_TAGS.EDITAR,
]);

function decodeCommonEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&gt;/gi, '>')
    .replace(/&lt;/gi, '<')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&amp;/gi, '&');
}

/** Turns editor or transcript content into a concise, presentation-safe preview. */
export function sanitizeCreationPreviewText(value: string | null | undefined) {
  return decodeCommonEntities(htmlToReadableText(value))
    .replace(TECHNICAL_TIME_MARK, ' ')
    .replace(/\[\d+(?:\s*,\s*\d+)*\]/g, ' ')
    .replace(/(^|\s)>\s*/g, '$1')
    .replace(/\[(?:cena|take|bloco|pausa|corte)[^\]]*\]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getCreationNoteExcerpt(content: Content) {
  return (
    sanitizeCreationPreviewText(content.notes)
    || sanitizeCreationPreviewText(content.script)
    || null
  );
}

function formatCreationCardDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function getCreationCardFooterMeta(content: Content) {
  return [getCreationFormatLabel(content), formatCreationCardDate(content.updatedAt)]
    .filter(Boolean)
    .join(' / ');
}

/** User-facing tags. Pilar e série aparecem à parte, na identificação do card. */
export function getCreationCardTags(
  content: Pick<Content, 'tags'>,
) {
  const labels = content.tags.filter(tag => !TECHNICAL_TAGS.has(tag.trim().toLowerCase()));
  const seen = new Set<string>();

  return labels.flatMap(label => {
    const normalized = label?.trim().replace(/^#+/, '');
    if (!normalized) return [];
    const key = normalized.toLocaleLowerCase('pt-BR');
    if (seen.has(key)) return [];
    seen.add(key);
    return [normalized];
  });
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
