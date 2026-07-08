import { useMemo, useState } from 'react';
import type { Idea } from '../../../lib/database';
import {
  filterIdeas,
  sortIdeas,
  type IdeasQuickFilter,
  type IdeasSort,
  type InboxFilter,
  type MobileIdeasTab,
} from '../lib/ideaFilters';

export function useIdeasInboxFilters(ideas: Idea[]) {
  const [search, setSearch] = useState('');
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>('inbox');
  const [mobileTab, setMobileTab] = useState<MobileIdeasTab>('all');
  const [sort, setSort] = useState<IdeasSort>('recent');
  const [quickFilter, setQuickFilter] = useState<IdeasQuickFilter>('none');
  const [filterPilarId, setFilterPilarId] = useState('');
  const [filterSeriesId, setFilterSeriesId] = useState('');
  const [filterOrigemId, setFilterOrigemId] = useState('');

  const activeIdeas = useMemo(() => ideas.filter((idea) => !idea.archived), [ideas]);
  const archivedIdeas = useMemo(() => ideas.filter((idea) => idea.archived), [ideas]);
  const newestActiveIdea = useMemo(() => sortIdeas(activeIdeas, 'recent')[0] ?? null, [activeIdeas]);

  const filteredIdeas = useMemo(
    () =>
      filterIdeas(ideas, {
        search,
        inboxFilter,
        mobileTab,
        sort,
        quickFilter,
        filterPilarId,
        filterSeriesId,
        filterOrigemId,
      }),
    [
      ideas,
      search,
      inboxFilter,
      mobileTab,
      sort,
      quickFilter,
      filterPilarId,
      filterSeriesId,
      filterOrigemId,
    ],
  );

  const activeFilterCount = [filterPilarId, filterSeriesId, filterOrigemId].filter(Boolean).length;

  const clearMetaFilters = () => {
    setFilterPilarId('');
    setFilterSeriesId('');
    setFilterOrigemId('');
  };

  const toggleQuickFilter = (value: IdeasQuickFilter) => {
    setQuickFilter((current) => (current === value ? 'none' : value));
  };

  return {
    search,
    setSearch,
    inboxFilter,
    setInboxFilter,
    mobileTab,
    setMobileTab,
    sort,
    setSort,
    quickFilter,
    setQuickFilter,
    toggleQuickFilter,
    filterPilarId,
    setFilterPilarId,
    filterSeriesId,
    setFilterSeriesId,
    filterOrigemId,
    setFilterOrigemId,
    clearMetaFilters,
    activeFilterCount,
    activeIdeas,
    archivedIdeas,
    newestActiveIdea,
    filteredIdeas,
  };
}
