import type { Idea } from '../../../lib/database';
import { getIdeaTitle, ideaSearchText } from './ideaText';

export type InboxFilter = 'inbox' | 'archived';
export type MobileIdeasTab = 'all' | 'unprocessed' | 'favorites';
export type IdeasSort = 'recent' | 'oldest';
export type IdeasQuickFilter = 'none' | 'unclassified' | 'with-origin' | 'ready-for-script';

export function ideaHasClassification(idea: Idea): boolean {
  return Boolean(idea.pilarId || idea.seriesId || idea.origemId);
}

export function ideaReadyForScript(idea: Idea): boolean {
  if (idea.archived) return false;
  const title = getIdeaTitle(idea).trim();
  if (!title || title === 'Nota editorial') return false;
  return Boolean(idea.pilarId || idea.seriesId);
}

export function matchesQuickFilter(idea: Idea, quickFilter: IdeasQuickFilter): boolean {
  if (quickFilter === 'none') return true;
  if (quickFilter === 'unclassified') return !ideaHasClassification(idea);
  if (quickFilter === 'with-origin') return Boolean(idea.origemId);
  if (quickFilter === 'ready-for-script') return ideaReadyForScript(idea);
  return true;
}

export function matchesInboxFilter(idea: Idea, inboxFilter: InboxFilter): boolean {
  if (inboxFilter === 'inbox') return !idea.archived;
  return idea.archived;
}

export function matchesMobileTab(idea: Idea, tab: MobileIdeasTab): boolean {
  if (tab === 'unprocessed') return !idea.archived;
  if (tab === 'favorites') return idea.archived;
  return true;
}

export function sortIdeas(ideas: Idea[], sort: IdeasSort): Idea[] {
  return [...ideas].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return sort === 'recent' ? bTime - aTime : aTime - bTime;
  });
}

export interface IdeasListFilters {
  search: string;
  inboxFilter: InboxFilter;
  mobileTab: MobileIdeasTab;
  sort: IdeasSort;
  quickFilter: IdeasQuickFilter;
  filterPilarId: string;
  filterSeriesId: string;
  filterOrigemId: string;
}

export function filterIdeas(ideas: Idea[], filters: IdeasListFilters): Idea[] {
  const normalizedSearch = filters.search.trim().toLowerCase();

  return sortIdeas(
    ideas.filter((idea) => {
      if (filters.mobileTab === 'all') {
        if (!matchesInboxFilter(idea, filters.inboxFilter)) return false;
      } else if (!matchesMobileTab(idea, filters.mobileTab)) {
        return false;
      }

      if (normalizedSearch && !ideaSearchText(idea).includes(normalizedSearch)) return false;
      if (filters.filterPilarId && idea.pilarId !== filters.filterPilarId) return false;
      if (filters.filterSeriesId && idea.seriesId !== filters.filterSeriesId) return false;
      if (filters.filterOrigemId && idea.origemId !== filters.filterOrigemId) return false;
      if (!matchesQuickFilter(idea, filters.quickFilter)) return false;
      return true;
    }),
    filters.sort,
  );
}
