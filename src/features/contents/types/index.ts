import { Content } from '../../../lib/database';

export type ContentsViewMode = 'table' | 'grid' | 'kanban';
export const CONTENTS_DESKTOP_PAGE_SIZE = 28;
export type SortField = keyof Content | 'seriesName' | 'pillarName';
export type SortDirection = 'asc' | 'desc';
export type ContentsListView = 'pipeline' | 'publicados';

/** @deprecated Use ContentsListView */
export type PostingTab = ContentsListView;
