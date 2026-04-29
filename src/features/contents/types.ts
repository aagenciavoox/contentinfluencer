import { Content } from '../../lib/database';

export type ContentsMainTab = 'inventory' | 'recording';
export type ContentsViewMode = 'table' | 'ecosystem' | 'timeline';
export type SortField = keyof Content | 'seriesName';
export type SortDirection = 'asc' | 'desc';
