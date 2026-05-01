import { Content } from '../../../../lib/database';
import { ContentTable } from './ContentTable';
import { ContentGrid } from './ContentGrid';
import { ContentsViewMode, SortDirection, SortField } from '../../types';

interface ContentsDesktopProps {
  mode?: 'editorial' | 'postagem' | 'historico';
  viewMode: ContentsViewMode;
  contents: Content[];
  lookAlerts: Record<string, string>;
  sortField: SortField;
  sortDirection: SortDirection;
  selectedIds: Set<string>;
  onSelect: (content: Content) => void;
  onPreview: (content: Content) => void;
  onSort: (field: SortField) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
}

export function ContentsDesktop({
  mode = 'editorial',
  viewMode,
  contents,
  lookAlerts,
  sortField,
  sortDirection,
  selectedIds,
  onSelect,
  onPreview,
  onSort,
  onToggleSelect,
  onSelectAll,
}: ContentsDesktopProps) {
  if (viewMode === 'grid') {
    return (
      <ContentGrid
        contents={contents}
        onSelect={onSelect}
        onPreview={onPreview}
        lookAlerts={lookAlerts}
        mode={mode}
      />
    );
  }

  return (
    <ContentTable
      contents={contents}
      onSelect={onSelect}
      onPreview={onPreview}
      sortField={sortField}
      sortDirection={sortDirection}
      onSort={onSort}
      lookAlerts={lookAlerts}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onSelectAll={onSelectAll}
      mode={mode}
    />
  );
}
