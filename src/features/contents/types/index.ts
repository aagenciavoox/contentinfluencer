import { Content } from '../../../lib/database';

export type ContentsViewMode = 'table' | 'grid' | 'kanban';
/** @deprecated Use DEFAULT_CONTENTS_PAGE_SIZE from contentsListUrl */
export const CONTENTS_DESKTOP_PAGE_SIZE = 50;
export type SortField = keyof Content | 'seriesName' | 'pillarName';
export type SortDirection = 'asc' | 'desc';
export type ContentsListView = 'pipeline' | 'publicados';

/** @deprecated Use ContentsListView */
export type PostingTab = ContentsListView;
