import { Search, SlidersHorizontal } from 'lucide-react';

interface MobileSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFilterClick?: () => void;
  filterLabel?: string;
}

export function MobileSearchBar({
  value,
  onChange,
  placeholder = 'Buscar',
  onFilterClick,
  filterLabel = 'Abrir filtros',
}: MobileSearchBarProps) {
  return (
    <div className="flex items-center gap-3">
      <label className="flex min-h-12 flex-1 items-center gap-3 rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 shadow-sm">
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
          className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm active:scale-95"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
