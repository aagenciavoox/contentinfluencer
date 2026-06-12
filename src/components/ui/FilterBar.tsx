import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, X, Filter } from 'lucide-react';
import { cn } from '../../lib/utils';

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
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  filters = [],
  sortValue,
  onSortChange,
  sortOptions = [],
  className,
}: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const activeFiltersCount = filters.filter(f => f.value !== '' && f.value !== 'Todos').length;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)] transition-colors group-focus-within:text-[var(--text-primary)]" />
          <input
            type="text"
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)] transition-all outline-none"
          />
          {searchValue && (
            <button 
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {filters.length > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-semibold  transition-all",
              isExpanded || activeFiltersCount > 0
                ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]"
                : "border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[var(--bg-primary)] px-1 text-xs font-semibold text-[var(--text-primary)]">
                {activeFiltersCount}
              </span>
            )}
          </button>
        )}

        {sortOptions.length > 0 && onSortChange && (
          <div className="relative hidden md:block">
            <select
              value={sortValue}
              onChange={e => onSortChange(e.target.value)}
              className="h-11 min-w-[140px] appearance-none rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] pl-4 pr-10 text-xs font-semibold  text-[var(--text-secondary)] hover:border-[var(--border-strong)] outline-none transition-all cursor-pointer"
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)] pointer-events-none" />
          </div>
        )}
      </div>

      {isExpanded && filters.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 p-3 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-sm animate-in fade-in slide-in-from-top-2">
          {filters.map(filter => (
            <div key={filter.id} className="space-y-1.5">
              <label className="px-1 text-xs font-semibold  text-[var(--text-tertiary)] opacity-60">
                {filter.label}
              </label>
              <div className="relative">
                <select
                  value={filter.value}
                  onChange={e => filter.onChange(e.target.value)}
                  className="w-full h-9 appearance-none rounded-lg border border-[var(--border-color)] bg-[var(--bg-hover)] pl-3 pr-8 text-xs font-bold text-[var(--text-primary)] hover:border-[var(--border-strong)] outline-none transition-all cursor-pointer"
                >
                  {filter.options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-tertiary)] pointer-events-none" />
              </div>
            </div>
          ))}
          
          <div className="col-span-full pt-2 flex justify-end">
            <button
              onClick={() => {
                filters.forEach(f => f.onChange(''));
                setIsExpanded(false);
              }}
              className="text-xs font-semibold  text-[var(--accent-pink)] hover:underline"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
