import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Filter } from 'lucide-react';
import { cn } from '../../lib/utils';
import { AppButton } from './AppButton';
import { Text } from './Text';
import { SelectMenu } from './SelectMenu';
import { ToolbarSearchInput } from './ToolbarSearchInput';
import { FLOATING_MENU_HIDDEN_STYLE, FLOATING_MENU_Z_INDEX, useAnchoredPosition } from './anchoredPosition';

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
  /** Valor exato que representa o filtro inativo. Tem prioridade sobre a inferência. */
  emptyValue?: string;
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
  /** compact = controles de 36px. */
  size?: 'default' | 'compact';
  leading?: ReactNode;
  showSearch?: boolean;
  panelExtra?: ReactNode;
  extraActiveCount?: number;
  onClearExtra?: () => void;
  panelMode?: 'inline' | 'dropdown';
  fluidSearch?: boolean;
}

const INACTIVE_FILTER_VALUES = new Set(['', 'todos', 'todas']);

function inactiveFilterValue(filter: FilterDefinition): string {
  if (filter.emptyValue !== undefined) return filter.emptyValue;
  // A opção neutra pode estar em qualquer posição; devolve sempre seu valor original.
  const inactive = filter.options.find(option =>
    INACTIVE_FILTER_VALUES.has(option.value.trim().toLocaleLowerCase('pt-BR')),
  );
  return inactive?.value ?? '';
}

function selectedLabel(
  options: readonly FilterOption[], value: string | undefined, fallback: string,
) {
  return options.find(option => option.value === value)?.label ?? (value || fallback);
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar…',
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
  panelMode = 'inline',
  fluidSearch = false,
}: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const filterStates = filters.map(filter => {
    const inactiveValue = inactiveFilterValue(filter);
    return { filter, inactiveValue, active: filter.value !== inactiveValue };
  });
  const extraCount = Number.isFinite(extraActiveCount)
    ? Math.max(0, Math.trunc(extraActiveCount))
    : 0;
  const activeFiltersCount = filterStates.filter(item => item.active).length + extraCount;
  const hasExtraPanel = panelExtra !== undefined && panelExtra !== null
    && typeof panelExtra !== 'boolean' && panelExtra !== '';
  const hasPanel = filters.length > 0 || hasExtraPanel;
  const panelOpen = isExpanded && hasPanel;
  const isCompact = size === 'compact';
  const isDropdown = panelMode === 'dropdown';
  const position = useAnchoredPosition(panelOpen && isDropdown, toggleRef, panelRef, { align: 'end', matchWidth: false });
  const hasPosition = Boolean(position);

  useEffect(() => {
    if (!panelOpen || !isDropdown) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || toggleRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      // Os selects internos também abrem em portal. Escolher uma opção mantém os filtros abertos.
      const controls = panelRef.current?.querySelectorAll('[aria-controls]') ?? [];
      for (const control of controls) {
        const controlled = document.getElementById(control.getAttribute('aria-controls') ?? '');
        if (controlled?.contains(target)) return;
      }
      setIsExpanded(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      setIsExpanded(false);
      toggleRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdown, panelOpen]);

  useEffect(() => {
    if (panelOpen && isDropdown && hasPosition) {
      panelRef.current?.focus({ preventScroll: true });
    }
  }, [hasPosition, isDropdown, panelOpen]);
  const filterButtonLabel = activeFiltersCount > 0
    ? `Filtros (${activeFiltersCount} ${activeFiltersCount === 1 ? 'ativo' : 'ativos'})`
    : 'Filtros';

  function clearFilters() {
    // Não dispara mudanças para filtros que já estão no seu estado neutro.
    for (const { filter, inactiveValue, active } of filterStates) {
      if (active) filter.onChange(inactiveValue);
    }
    onClearExtra?.();
    setIsExpanded(false);
    // O botão de limpar desaparece junto com o painel: devolve o foco ao gatilho.
    toggleRef.current?.focus({ preventScroll: true });
  }

  const panel = panelOpen ? (
    <div
      ref={panelRef}
      id={panelId}
      role={isDropdown ? 'dialog' : 'region'}
      aria-label="Opções de filtro"
      tabIndex={isDropdown ? -1 : undefined}
      style={isDropdown ? position?.style ?? FLOATING_MENU_HIDDEN_STYLE : undefined}
      className={cn(
        'filter-bar-panel border border-[var(--border-color)] p-3',
        isDropdown
          ? 'filter-bar-panel--dropdown fixed overflow-y-auto overscroll-contain rounded-[var(--radius-input)] bg-[var(--bg-elevated)] shadow-[var(--shadow-dropdown)] focus:outline-none'
          : 'w-full rounded-[var(--radius-card-mobile)] bg-[var(--bg-primary)] shadow-none md:rounded-[var(--radius-card)]',
        isDropdown && FLOATING_MENU_Z_INDEX,
      )}
    >
      {filterStates.map(({ filter, active }) => (
        <div key={filter.id} className="stack-sm min-w-0">
          <Text variant="label" as="span" className="px-1">
            {filter.label}
          </Text>
          <div className="relative min-w-0">
            <SelectMenu
              value={filter.value}
              onChange={filter.onChange}
              options={filter.options}
              ariaLabel={filter.label}
              triggerClassName={cn(
                'filter-bar-select relative h-9 w-full pr-8 focus-visible:shadow-[var(--shadow-focus)]',
                active ? 'filter-bar-select-active' : 'bg-[var(--bg-hover)]',
              )}
            >
              <span className="min-w-0 flex-1 truncate">{selectedLabel(filter.options, filter.value, filter.label)}</span>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" aria-hidden="true" />
            </SelectMenu>
          </div>
        </div>
      ))}

      {panelExtra}

      <div className="col-span-full flex justify-end pt-2">
        <AppButton type="button" variant="ghost" size="sm" onClick={clearFilters}>
          Limpar filtros
        </AppButton>
      </div>
    </div>
  ) : null;

  return (
    <div className={cn('filter-bar', isCompact && 'filter-bar--compact', fluidSearch && 'filter-bar--fluid-search', className)}>
      <div className="filter-bar-controls flex-wrap gap-2">
        {showSearch ? (
          <ToolbarSearchInput
            value={searchValue}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            size={isCompact ? 'compact' : 'default'}
            className="desktop-subheader-search"
          />
        ) : null}

        <div className="inline-stack-sm min-w-0 flex-wrap">
          {leading}
          {hasPanel ? (
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setIsExpanded(expanded => !expanded)}
              aria-label={filterButtonLabel}
              aria-haspopup={isDropdown ? 'dialog' : undefined}
              aria-expanded={panelOpen}
              aria-controls={panelOpen ? panelId : undefined}
              className={cn(
                'filter-bar-toggle shrink-0 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]',
                (panelOpen || activeFiltersCount > 0) && 'filter-bar-toggle-active',
              )}
            >
              <Filter className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Filtros</span>
              {isDropdown ? <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              {activeFiltersCount > 0 ? (
                <Text variant="label" as="span" aria-hidden="true" className="flex h-4 min-w-4 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--bg-primary)] px-1 text-[var(--text-primary)]">
                  {activeFiltersCount}
                </Text>
              ) : null}
            </button>
          ) : null}

          {sortOptions.length > 0 && onSortChange ? (
            <div className="relative min-w-0 max-w-full shrink-0">
              <SelectMenu
                value={sortValue ?? ''}
                onChange={onSortChange}
                options={sortOptions}
                ariaLabel="Ordenar"
                triggerClassName="filter-bar-select relative min-w-[140px] max-w-full pr-10 focus-visible:shadow-[var(--shadow-focus)]"
              >
                <span className="min-w-0 flex-1 truncate">{selectedLabel(sortOptions, sortValue, 'Ordenar')}</span>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" aria-hidden="true" />
              </SelectMenu>
            </div>
          ) : null}
        </div>
      </div>

      {panel && (isDropdown ? createPortal(panel, document.body) : panel)}
    </div>
  );
}
