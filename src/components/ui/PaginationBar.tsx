import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Text } from './Text';
import { AppButton } from './AppButton';

function buildPaginationItems(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const items: Array<number | 'ellipsis'> = [1];
  if (currentPage > 3) items.push('ellipsis');
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let page = start; page <= end; page += 1) items.push(page);
  if (currentPage < totalPages - 2) items.push('ellipsis');
  items.push(totalPages);
  return items;
}

export interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** full = numbered pages (desktop); simple = prev/next only */
  variant?: 'full' | 'simple';
  itemLabel?: string;
  className?: string;
  /** Optional slot above controls (e.g. page-size selector) */
  accessory?: ReactNode;
}

export function PaginationBar({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  variant = 'full',
  itemLabel = 'itens',
  className,
  accessory,
}: PaginationBarProps) {
  if (totalItems <= pageSize) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const pages = buildPaginationItems(currentPage, totalPages);

  return (
    <div
      className={cn(
        'pagination-bar rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)]',
        accessory ? 'stack-md p-3' : 'px-4 py-3',
        className,
      )}
    >
      {accessory}

      {variant === 'full' ? (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Text variant="meta">
            Mostrando {startItem}–{endItem} de {totalItems} {itemLabel}
          </Text>

          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="pagination-bar-btn"
            >
              Anterior
            </button>

            {pages.map((page, index) =>
              page === 'ellipsis' ? (
                <span key={`ellipsis-${index}`} className="px-1 text-2xs text-[var(--text-tertiary)]">
                  …
                </span>
              ) : (
                <button
                  key={page}
                  type="button"
                  onClick={() => onPageChange(page)}
                  className={cn(
                    'pagination-bar-btn min-w-9',
                    page === currentPage && 'pagination-bar-btn-active',
                  )}
                >
                  {page}
                </button>
              ),
            )}

            <button
              type="button"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="pagination-bar-btn"
            >
              Próxima
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <Text variant="meta">
            Página {currentPage} de {totalPages}
          </Text>
          <div className="flex items-center gap-2">
            <AppButton
              variant="secondary"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
            >
              Anterior
            </AppButton>
            <AppButton
              variant="secondary"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
            >
              Próxima
            </AppButton>
          </div>
        </div>
      )}
    </div>
  );
}
