import { Search, SlidersHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MobileSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFilterClick?: () => void;
  filterLabel?: string;
  rounded?: 'default' | 'tight';
}

export function MobileSearchBar({
  value,
  onChange,
  placeholder = 'Buscar',
  onFilterClick,
  filterLabel = 'Abrir filtros',
  rounded = 'default',
}: MobileSearchBarProps) {
  const radius = rounded === 'tight' ? 'rounded-lg' : 'rounded-[1.25rem]';

  return (
    <div className="flex items-center gap-2">
      <label
        className={cn(
          'flex min-h-11 flex-1 items-center gap-2 border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 shadow-sm',
          radius
        )}
      >
        <Search className="h-4 w-4 text-[var(--text-tertiary)]" />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full border-none bg-transparent p-0 text-[var(--text-primary)] outline-none"
        />
      </label>

      {onFilterClick ? (
        <button
          type="button"
          aria-label={filterLabel}
          onClick={onFilterClick}
          className={cn(
            'flex min-h-11 min-w-11 items-center justify-center border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm active:scale-95',
            radius
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
