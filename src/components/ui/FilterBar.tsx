import React, { useState } from 'react';
import { ChevronDown, Filter } from 'lucide-react';
import { cn } from '../../lib/utils';
import { AppButton } from './AppButton';
import { Text } from './Text';
import { ToolbarSearchInput } from './ToolbarSearchInput';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterDefinition {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  /** Exact inactive value for this filter. Overrides the default empty set. */
  emptyValue?: string;
}

const INACTIVE_FILTER_VALUES = new Set(['', 'Todos', 'todos', 'Todas', 'todas']);

function inactiveFilterValue(filter: FilterDefinition): string {
  if (filter.emptyValue !== undefined) return filter.emptyValue;
  const firstValue = filter.options[0]?.value;
  if (firstValue !== undefined && INACTIVE_FILTER_VALUES.has(firstValue)) return firstValue;
  return '';
}

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterDefinition[];
  sortValue?: string;
  onSortChange?: (value: string) => void;
  sortOptions?: FilterOption[];
  className?: string;
  /** compact = 36px controls (library toolbar) */
  size?: 'default' | 'compact';
  /** Extra controls on the right cluster (tabs, view switch, etc.). */
  leading?: React.ReactNode;
  /** Hide the search field when the page already has its own. */
  showSearch?: boolean;
  /** Extra controls rendered inside the expanded filter panel. */
  panelExtra?: React.ReactNode;
  /** Active filters that live in `panelExtra`, added to the badge count. */
  extraActiveCount?: number;
  /** Called together with the built-in clear action. */
  onClearExtra?: () => void;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  filters = [],
  sortValue,
  onSortChange,
  sortOptions = [],
  className,
  size = 'default',
  leading,
  showSearch = true,
  panelExtra,
  extraActiveCount = 0,
  onClearExtra,
}: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const activeFiltersCount =
    filters.filter((f) => f.value !== inactiveFilterValue(f)).length + extraActiveCount;
  const hasPanel = filters.length > 0 || Boolean(panelExtra);
  const isCompact = size === 'compact';

  return (
    <div className={cn('filter-bar', isCompact && 'filter-bar--compact', className)}>
      <div className="filter-bar-controls">
        {showSearch ? (
          <ToolbarSearchInput
            value={searchValue}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            size={isCompact ? 'compact' : 'default'}
            className="desktop-subheader-search"
          />
        ) : null}

        <div className="inline-stack-sm shrink-0">
          {leading}
          {hasPanel ? (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                'filter-bar-toggle shrink-0',
                (isExpanded || activeFiltersCount > 0) && 'filter-bar-toggle-active',
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFiltersCount > 0 ? (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--bg-primary)] px-1 text-2xs font-semibold text-[var(--text-primary)]">
                  {activeFiltersCount}
                </span>
              ) : null}
            </button>
          ) : null}

          {sortOptions.length > 0 && onSortChange ? (
            <div className="relative hidden shrink-0 md:block">
              <select
                value={sortValue}
                onChange={(e) => onSortChange(e.target.value)}
                className="filter-bar-select min-w-[140px] appearance-none pr-10"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
            </div>
          ) : null}
        </div>
      </div>

      {isExpanded && hasPanel ? (
        <div className="filter-bar-panel w-full rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 shadow-none md:rounded-[var(--radius-card)]">
          {filters.map((filter) => (
            <div key={filter.id} className="stack-sm">
              <Text variant="label" as="label" className="px-1">
                {filter.label}
              </Text>
              <div className="relative">
                <select
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className={cn(
                    'filter-bar-select h-9 w-full appearance-none pr-8',
                    filter.value !== inactiveFilterValue(filter)
                      ? 'filter-bar-select-active'
                      : 'bg-[var(--bg-hover)]',
                  )}
                >
                  {filter.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
              </div>
            </div>
          ))}

          {panelExtra}

          <div className="col-span-full flex justify-end pt-2">
            <AppButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                filters.forEach((f) => f.onChange(inactiveFilterValue(f)));
                onClearExtra?.();
                setIsExpanded(false);
              }}
            >
              Limpar filtros
            </AppButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
