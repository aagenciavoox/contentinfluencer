import type { Content, Idea } from '../../../lib/database';
import { formatLastEdit } from '../../contents/lib/contentCardMeta';
import { normalizeContentStatus } from '../../contents/lib/contentPipeline';
import { getIdeaNotes, getIdeaTitle, ideaSearchText } from '../../ideas/lib/ideaText';
import { htmlToReadableText } from '../../../lib/utils';
import { filterByTab, type SeriesContentTab } from './computeSeriesContentStats';

export type SeriesListItem =
  | { kind: 'content'; data: Content }
  | { kind: 'inbox-idea'; data: Idea };

export function seriesListItemId(item: SeriesListItem): string {
  return item.kind === 'content' ? item.data.id : `inbox-idea:${item.data.id}`;
}

export function seriesListItemTimestamp(item: SeriesListItem): string {
  if (item.kind === 'content') return item.data.updatedAt || item.data.createdAt || '';
  return item.data.createdAt || '';
}

export function contentPreviewText(content: Content): string {
  const script = htmlToReadableText(content.script);
  if (script.trim()) return script;
  return htmlToReadableText(content.notes);
}

export function scriptWordCount(content: Content): number {
  const text = contentPreviewText(content);
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function formatContentListTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfEdit = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (startOfEdit.getTime() === startOfToday.getTime()) {
    return `Hoje ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  return formatLastEdit(iso);
}

export interface SeriesContentsFilterState {
  tab: SeriesContentTab;
  search: string;
  status: string;
  sort: string;
}

export function filterAndSortSeriesContents(
  contents: Content[],
  filters: SeriesContentsFilterState,
): Content[] {
  const normalizedSearch = filters.search.trim().toLowerCase();

  let result = filterByTab(contents, filters.tab).filter(content => {
    if (filters.status && filters.status !== 'Todos') {
      if (normalizeContentStatus(content.status) !== filters.status) return false;
    }

    if (normalizedSearch.length === 0) return true;

    const preview = contentPreviewText(content).toLowerCase();
    return (
      (content.title || '').toLowerCase().includes(normalizedSearch) ||
      preview.includes(normalizedSearch)
    );
  });

  const [field, direction = 'desc'] = (filters.sort || 'updatedAt:desc').split(':') as [
    string,
    'asc' | 'desc',
  ];

  result = [...result].sort((a, b) => {
    if (field === 'title') {
      const cmp = (a.title || '').localeCompare(b.title || '', 'pt-BR', { sensitivity: 'base' });
      return direction === 'asc' ? cmp : -cmp;
    }

    const left = field === 'createdAt' ? a.createdAt : a.updatedAt;
    const right = field === 'createdAt' ? b.createdAt : b.updatedAt;
    const cmp = (left || '').localeCompare(right || '');
    return direction === 'asc' ? cmp : -cmp;
  });

  return result;
}

export function filterAndSortSeriesListItems(
  contents: Content[],
  inboxIdeas: Idea[],
  filters: SeriesContentsFilterState,
): SeriesListItem[] {
  const normalizedSearch = filters.search.trim().toLowerCase();

  const contentItems: SeriesListItem[] = filterAndSortSeriesContents(contents, filters).map(data => ({
    kind: 'content',
    data,
  }));

  if (filters.tab === 'roteiros') return contentItems;

  const includeInboxIdeas = !filters.status || filters.status === 'Todos';
  if (!includeInboxIdeas) return contentItems;

  const filteredInboxIdeas = inboxIdeas.filter(idea => {
    if (normalizedSearch.length === 0) return true;
    return ideaSearchText(idea).includes(normalizedSearch);
  });

  const inboxItems: SeriesListItem[] = filteredInboxIdeas.map(data => ({
    kind: 'inbox-idea',
    data,
  }));

  if (filters.tab === 'ideias') {
    return sortSeriesListItems(
      [...contentItems, ...inboxItems],
      filters.sort || 'updatedAt:desc',
    );
  }

  return sortSeriesListItems(
    [...contentItems, ...inboxItems],
    filters.sort || 'updatedAt:desc',
  );
}

function sortSeriesListItems(items: SeriesListItem[], sort: string): SeriesListItem[] {
  const [field, direction = 'desc'] = sort.split(':') as [string, 'asc' | 'desc'];

  return [...items].sort((left, right) => {
    if (field === 'title') {
      const leftTitle = left.kind === 'content' ? left.data.title || '' : getIdeaTitle(left.data);
      const rightTitle = right.kind === 'content' ? right.data.title || '' : getIdeaTitle(right.data);
      const cmp = leftTitle.localeCompare(rightTitle, 'pt-BR', { sensitivity: 'base' });
      return direction === 'asc' ? cmp : -cmp;
    }

    const leftTimestamp = field === 'createdAt'
      ? (left.kind === 'content' ? left.data.createdAt : left.data.createdAt)
      : seriesListItemTimestamp(left);
    const rightTimestamp = field === 'createdAt'
      ? (right.kind === 'content' ? right.data.createdAt : right.data.createdAt)
      : seriesListItemTimestamp(right);
    const cmp = (leftTimestamp || '').localeCompare(rightTimestamp || '');
    return direction === 'asc' ? cmp : -cmp;
  });
}

export function seriesListItemPreviewText(item: SeriesListItem): string {
  if (item.kind === 'content') return contentPreviewText(item.data);
  return getIdeaNotes(item.data);
}

export function seriesListItemTitle(item: SeriesListItem): string {
  if (item.kind === 'content') return item.data.title || 'Sem título';
  return getIdeaTitle(item.data);
}

export function seriesListItemWordCount(item: SeriesListItem): number {
  if (item.kind === 'content') return scriptWordCount(item.data);
  const text = getIdeaNotes(item.data).trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}
