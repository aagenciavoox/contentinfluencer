import {ReactNode, useEffect, useRef, useState} from 'react';
import {ChevronDown, Search} from 'lucide-react';
import {cn} from '../../lib/utils';

export interface FilterBarOption {
  label: string;
  value: string;
}

interface FilterBarSelectFilter {
  id: string;
  label: string;
  value: string;
  options: FilterBarOption[];
  onChange: (value: string) => void;
  type?: 'select';
}

interface FilterBarCustomFilter {
  id: string;
  label: string;
  type: 'custom';
  renderContent: (close: () => void) => ReactNode;
}

export type FilterBarFilter = FilterBarSelectFilter | FilterBarCustomFilter;

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterBarFilter[];
  sortValue: string;
  sortOptions: FilterBarOption[];
  onSortChange: (value: string) => void;
  className?: string;
  maxVisibleFilters?: number;
}

function useOutsideClose(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open, onClose]);

  return ref;
}

function FilterBarDropdown({
  label,
  children,
}: {
  label: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const ref = useOutsideClose(open, close);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(previous => !previous)}
        className="filter-bar-select w-[148px] justify-between"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="h-4 w-4 shrink-0" />
      </button>

      {open ? (
        <div className="filter-bar-menu">
          {children(close)}
        </div>
      ) : null}
    </div>
  );
}

function FilterControl({filter}: {filter: FilterBarFilter}) {
  if (filter.type === 'custom') {
    return (
      <FilterBarDropdown label={filter.label}>
        {close => filter.renderContent(close)}
      </FilterBarDropdown>
    );
  }

  return (
    <div className="relative shrink-0">
      <select
        aria-label={filter.label}
        value={filter.value}
        onChange={event => filter.onChange(event.target.value)}
        className="filter-bar-select w-[148px] appearance-none pr-10"
      >
        {filter.options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
    </div>
  );
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar',
  filters = [],
  sortValue,
  sortOptions,
  onSortChange,
  className,
  maxVisibleFilters = 4,
}: FilterBarProps) {
  const visibleFilters = filters.slice(0, maxVisibleFilters);
  const overflowFilters = filters.slice(maxVisibleFilters);

  return (
    <div className={cn('filter-bar', className)}>
      <div className="filter-bar-search">
        <Search className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
        <input
          type="text"
          value={searchValue}
          onChange={event => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="filter-bar-search-input"
        />
      </div>

      <div className="filter-bar-controls">
        {visibleFilters.map(filter => (
          <FilterControl key={filter.id} filter={filter} />
        ))}

        {overflowFilters.length > 0 ? (
          <FilterBarDropdown label="Mais filtros">
            {close => (
              <div className="flex min-w-[240px] flex-col gap-3">
                {overflowFilters.map(filter => (
                  <div key={filter.id} className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                      {filter.label}
                    </span>
                    {filter.type === 'custom' ? filter.renderContent(close) : (
                      <select
                        aria-label={filter.label}
                        value={filter.value}
                        onChange={event => filter.onChange(event.target.value)}
                        className="filter-bar-select w-full appearance-none"
                      >
                        {filter.options.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            )}
          </FilterBarDropdown>
        ) : null}

        <div className="relative shrink-0">
          <select
            aria-label="Ordenar"
            value={sortValue}
            onChange={event => onSortChange(event.target.value)}
            className="filter-bar-select w-[148px] appearance-none pr-10"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
        </div>
      </div>
    </div>
  );
}
