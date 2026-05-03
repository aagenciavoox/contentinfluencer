import { Content } from '../../../../lib/database';
import { ContentTable } from './ContentTable';
import { ContentGrid } from './ContentGrid';
import { ContentsViewMode, SortDirection, SortField } from '../../types';

interface ContentsDesktopProps {
  mode?: 'editorial' | 'postagem' | 'historico';
  viewMode: ContentsViewMode;
  contents: Content[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  lookAlerts: Record<string, string>;
  sortField: SortField;
  sortDirection: SortDirection;
  selectedIds: Set<string>;
  onSelect: (content: Content) => void;
  onPreview: (content: Content) => void;
  onSort: (field: SortField) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onPageChange: (page: number) => void;
}

export function ContentsDesktop({
  mode = 'editorial',
  viewMode,
  contents,
  totalItems,
  currentPage,
  totalPages,
  lookAlerts,
  sortField,
  sortDirection,
  selectedIds,
  onSelect,
  onPreview,
  onSort,
  onToggleSelect,
  onSelectAll,
  onPageChange,
}: ContentsDesktopProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * 12 + 1;
  const endItem = totalItems === 0 ? 0 : startItem + contents.length - 1;

  if (viewMode === 'grid') {
    return (
      <div className="space-y-5">
        <ContentGrid
          contents={contents}
          onSelect={onSelect}
          onPreview={onPreview}
          onToggleSelect={onToggleSelect}
          selectedIds={selectedIds}
          lookAlerts={lookAlerts}
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

  return (
    <div className="space-y-5">
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
  if (totalItems <= 12) return null;

  const pages = Array.from({length: totalPages}, (_, index) => index + 1);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <p className="text-xs font-semibold text-[var(--text-secondary)]">
        Mostrando {startItem}-{endItem} de {totalItems} conteudos
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="rounded-xl border border-[var(--border-color)] px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Anterior
        </button>

        {pages.map(page => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={`rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] transition-colors ${
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
          className="rounded-xl border border-[var(--border-color)] px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Proxima
        </button>
      </div>
    </div>
  );
}
