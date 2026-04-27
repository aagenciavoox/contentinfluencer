import { Content } from '../../types';
import { ContentTable } from '../../components/contents/ContentTable';
import { ContentEcosystem } from '../../components/contents/ContentEcosystem';
import { ContentTimeline } from '../../components/contents/ContentTimeline';
import { ContentsViewMode, SortDirection, SortField } from './types';

interface ContentsDesktopViewProps {
  viewMode: ContentsViewMode;
  contents: Content[];
  lookAlerts: Record<string, string>;
  filterSeries: string;
  sortField: SortField;
  sortDirection: SortDirection;
  selectedIds: Set<string>;
  onSelect: (content: Content) => void;
  onSort: (field: SortField) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
}

export function ContentsDesktopView({
  viewMode,
  contents,
  lookAlerts,
  filterSeries,
  sortField,
  sortDirection,
  selectedIds,
  onSelect,
  onSort,
  onToggleSelect,
  onSelectAll,
}: ContentsDesktopViewProps) {
  if (viewMode === 'ecosystem') {
    return (
      <ContentEcosystem
        contents={contents}
        onSelect={onSelect}
        lookAlerts={lookAlerts}
        filterSeries={filterSeries}
      />
    );
  }

  if (viewMode === 'timeline') {
    return <ContentTimeline contents={contents} onSelect={onSelect} />;
  }

  return (
    <ContentTable
      contents={contents}
      onSelect={onSelect}
      sortField={sortField}
      sortDirection={sortDirection}
      onSort={onSort}
      lookAlerts={lookAlerts}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onSelectAll={onSelectAll}
    />
  );
}
