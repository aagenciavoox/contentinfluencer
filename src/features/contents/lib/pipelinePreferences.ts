import type { ContentsViewMode } from '../types';

const STORAGE_KEY = 'content-os:pipeline-preferences';

export interface PipelinePreferences {
  viewMode: ContentsViewMode;
  isCompact: boolean;
  filterStatus: string;
}

const DEFAULTS: PipelinePreferences = {
  viewMode: 'grid',
  isCompact: true,
  filterStatus: 'Todos',
};

export function loadPipelinePreferences(): PipelinePreferences {
  if (typeof window === 'undefined') return DEFAULTS;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<PipelinePreferences>;
    return {
      viewMode: parsed.viewMode === 'table' || parsed.viewMode === 'grid' || parsed.viewMode === 'kanban'
        ? parsed.viewMode
        : DEFAULTS.viewMode,
      isCompact: typeof parsed.isCompact === 'boolean' ? parsed.isCompact : DEFAULTS.isCompact,
      filterStatus: typeof parsed.filterStatus === 'string' ? parsed.filterStatus : DEFAULTS.filterStatus,
    };
  } catch {
    return DEFAULTS;
  }
}

export function savePipelinePreferences(partial: Partial<PipelinePreferences>) {
  if (typeof window === 'undefined') return;

  const current = loadPipelinePreferences();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...partial }));
}
