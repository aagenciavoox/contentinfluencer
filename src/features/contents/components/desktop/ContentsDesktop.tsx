import { Content } from '../../../../lib/database';
import { ContentTable } from './ContentTable';
import { ContentGrid } from './ContentGrid';
import { ContentKanban } from './ContentKanban';
import { ContentsViewMode, SortDirection, SortField, CONTENTS_DESKTOP_PAGE_SIZE } from '../../types';

interface ContentsDesktopProps {
  mode?: 'pipeline' | 'publicados';
  viewMode: ContentsViewMode;
  contents: Content[];
  kanbanContents?: Content[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  lookAlerts: Record<string, string>;
  sortField: SortField;
  sortDirection: SortDirection;
  selectedIds: Set<string>;
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
  lookAlerts,
  sortField,
  sortDirection,
  selectedIds,
  isCompact,
  filterStatus = 'Todos',
  onSelect,
  onPreview,
  onSort,
  onToggleSelect,
  onSelectAll,
  onPageChange,
}: ContentsDesktopProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * CONTENTS_DESKTOP_PAGE_SIZE + 1;
  const endItem = totalItems === 0 ? 0 : startItem + contents.length - 1;
  const enableSelection = mode !== 'publicados';
  const allPageSelected =
    enableSelection && contents.length > 0 && contents.every(content => selectedIds.has(content.id));
  const somePageSelected =
    enableSelection && contents.some(content => selectedIds.has(content.id));

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
      <div className="space-y-4">
        <ContentGrid
          contents={contents}
          onSelect={onSelect}
          onPreview={onPreview}
          onToggleSelect={onToggleSelect}
          selectedIds={selectedIds}
          lookAlerts={lookAlerts}
          mode={mode}
          isCompact={isCompact}
          filterStatus={filterStatus}
          onSelectAll={enableSelection ? onSelectAll : undefined}
          allPageSelected={allPageSelected}
          somePageSelected={somePageSelected}
        />
        <DesktopPagination
          totalItems={totalItems}
          currentPage={currentPage}
          totalPages={totalPages}
          startItem={startItem}
          endItem={endItem}
          onPageChange={onPageChange}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
      <DesktopPagination
        totalItems={totalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        startItem={startItem}
        endItem={endItem}
        onPageChange={onPageChange}
      />
    </div>
  );
}

interface DesktopPaginationProps {
  totalItems: number;
  currentPage: number;
  totalPages: number;
  startItem: number;
  endItem: number;
  onPageChange: (page: number) => void;
}

function DesktopPagination({
  totalItems,
  currentPage,
  totalPages,
  startItem,
  endItem,
  onPageChange,
}: DesktopPaginationProps) {
  if (totalItems <= CONTENTS_DESKTOP_PAGE_SIZE) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 md:flex-row md:items-center md:justify-between">
      <p className="text-xs font-medium text-[var(--text-secondary)]">
        Mostrando {startItem}-{endItem} de {totalItems} conteudos
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="rounded-[var(--radius-input)] border border-[var(--border-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Anterior
        </button>

        {pages.map(page => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={`rounded-[var(--radius-input)] px-3 py-1.5 text-xs font-medium transition-colors ${
              page === currentPage
                ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                : 'border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="rounded-[var(--radius-input)] border border-[var(--border-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Proxima
        </button>
      </div>
    </div>
  );
}
