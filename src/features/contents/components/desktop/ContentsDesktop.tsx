import { Content } from '../../../../lib/database';
import { PaginationBar } from '../../../../components/ui/PaginationBar';
import { ContentTable } from './ContentTable';
import { ContentGrid } from './ContentGrid';
import { ContentKanban } from './ContentKanban';
import { PipelineProgressLegend } from './PipelineProgressLegend';
import { ContentsViewMode, SortDirection, SortField, CONTENTS_DESKTOP_PAGE_SIZE } from '../../types';

interface ContentsDesktopProps {
  mode?: 'pipeline' | 'publicados';
  viewMode: ContentsViewMode;
  contents: Content[];
  kanbanContents?: Content[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  pageSize?: number;
  lookAlerts: Record<string, string>;
  sortField: SortField;
  sortDirection: SortDirection;
  selectedIds: Set<string>;
  selectionMode: boolean;
  onSelectionModeChange: (active: boolean) => void;
  isCompact: boolean;
  filterStatus?: string;
  onSelect: (content: Content) => void;
  onPreview: (content: Content) => void;
  onSort: (field: SortField) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onPageChange: (page: number) => void;
}

export function ContentsDesktop({
  mode = 'pipeline',
  viewMode,
  contents,
  kanbanContents = [],
  totalItems,
  currentPage,
  totalPages,
  pageSize = CONTENTS_DESKTOP_PAGE_SIZE,
  lookAlerts,
  sortField,
  sortDirection,
  selectedIds,
  selectionMode,
  onSelectionModeChange,
  isCompact,
  filterStatus = 'Todos',
  onSelect,
  onPreview,
  onSort,
  onToggleSelect,
  onSelectAll,
  onPageChange,
}: ContentsDesktopProps) {
  const enableSelection = mode !== 'publicados';
  const selectionActive = enableSelection && selectionMode;
  const allPageSelected =
    selectionActive && contents.length > 0 && contents.every(content => selectedIds.has(content.id));
  const somePageSelected =
    selectionActive && contents.some(content => selectedIds.has(content.id));

  if (viewMode === 'kanban') {
    return (
      <ContentKanban
        contents={kanbanContents}
        lookAlerts={lookAlerts}
        filterStatus={filterStatus}
        onSelect={onSelect}
        onPreview={onPreview}
      />
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="stack-xl">
        <ContentGrid
          contents={contents}
          onSelect={onSelect}
          onPreview={onPreview}
          onToggleSelect={onToggleSelect}
          selectedIds={selectedIds}
          selectionMode={selectionMode}
          onSelectionModeChange={onSelectionModeChange}
          lookAlerts={lookAlerts}
          mode={mode}
          isCompact={isCompact}
          filterStatus={filterStatus}
          onSelectAll={selectionActive ? onSelectAll : undefined}
          allPageSelected={allPageSelected}
          somePageSelected={somePageSelected}
        />
        <PaginationBar
          variant="full"
          itemLabel="conteúdos"
          totalItems={totalItems}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={onPageChange}
        />
        {mode === 'pipeline' ? <PipelineProgressLegend /> : null}
      </div>
    );
  }

  return (
    <div className="stack-lg">
      <ContentTable
        contents={contents}
        onSelect={onSelect}
        onPreview={onPreview}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={onSort}
        lookAlerts={lookAlerts}
        selectedIds={selectedIds}
        selectionMode={selectionMode}
        onSelectionModeChange={onSelectionModeChange}
        onToggleSelect={onToggleSelect}
        onSelectAll={onSelectAll}
        mode={mode}
      />
      <PaginationBar
        variant="full"
        itemLabel="conteúdos"
        totalItems={totalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={onPageChange}
      />
    </div>
  );
}
