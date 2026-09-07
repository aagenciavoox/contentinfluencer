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
  rounded?: 'default' | 'tight';
  trailing?: ReactNode;
}

export function MobileSearchBar({
  value,
  onChange,
  placeholder = 'Buscar',
  onFilterClick,
  filterLabel = 'Abrir filtros',
  rounded = 'default',
  trailing,
}: MobileSearchBarProps) {
  const radius = rounded === 'tight' ? 'rounded-[var(--radius-sm)]' : 'rounded-[var(--radius-md)]';
  const hasFilter = Boolean(onFilterClick);
  const hasTrailing = Boolean(trailing);

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
          aria-label={filterLabel}
          onClick={onFilterClick}
          className={cn(
            'flex h-[44px] w-[44px] shrink-0 items-center justify-center border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)] active:scale-95',
            radius,
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      ) : null}

      {trailing ? <div className="flex shrink-0 items-center">{trailing}</div> : null}
    </div>
  );
}
