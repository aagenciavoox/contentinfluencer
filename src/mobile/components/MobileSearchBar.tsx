import type { ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ToolbarSearchInput } from '../../components/ui/ToolbarSearchInput';

interface MobileSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFilterClick?: () => void;
  filterLabel?: string;
  activeFilterCount?: number;
  rounded?: 'default' | 'tight';
  trailing?: ReactNode;
}

export function MobileSearchBar({
  value,
  onChange,
  placeholder = 'Buscar',
  onFilterClick,
  filterLabel = 'Abrir filtros',
  activeFilterCount = 0,
  rounded = 'default',
  trailing,
}: MobileSearchBarProps) {
  const radius = rounded === 'tight' ? 'rounded-[var(--radius-sm)]' : 'rounded-[var(--radius-md)]';
  const hasFilter = Boolean(onFilterClick);
  const hasTrailing = Boolean(trailing);
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div
      className={cn(
        'mobile-search-row w-full',
        hasFilter && hasTrailing && 'mobile-search-row--with-trailing',
        !hasFilter && hasTrailing && 'mobile-search-row--trailing-only',
        !hasFilter && !hasTrailing && 'mobile-search-row--search-only',
      )}
    >
      <ToolbarSearchInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(radius, 'filter-bar-search--fluid min-w-0')}
      />

      {onFilterClick ? (
        <button
          type="button"
          aria-label={hasActiveFilters ? `${filterLabel} (${activeFilterCount} ativo${activeFilterCount === 1 ? '' : 's'})` : filterLabel}
          onClick={onFilterClick}
          className={cn(
            'relative flex h-11 w-11 shrink-0 items-center justify-center border bg-[var(--bg-elevated)] active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
            hasActiveFilters
              ? 'border-[var(--brand-accent-strong)] text-[var(--brand-accent-strong)]'
              : 'border-[var(--border-color)] text-[var(--text-primary)]',
            radius,
          )}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          {hasActiveFilters ? (
            <span
              aria-hidden
              className="t-label pointer-events-none absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand-accent-strong)] px-1 tabular-nums text-[var(--brand-on-accent)]"
            >
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      ) : null}

      {trailing ? <div className="flex shrink-0 items-center">{trailing}</div> : null}
    </div>
  );
}
