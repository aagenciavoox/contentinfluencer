import { Content } from '../../lib/database';

export type ContentsViewMode = 'table' | 'ecosystem' | 'timeline';
export type SortField = keyof Content | 'seriesName' | 'pillarName';
export type SortDirection = 'asc' | 'desc';
