import { Content } from '../../../lib/database';

export type ContentsViewMode = 'table' | 'grid';
export type SortField = keyof Content | 'seriesName' | 'pillarName';
export type SortDirection = 'asc' | 'desc';
export type PostingTab = 'postagem' | 'historico';
