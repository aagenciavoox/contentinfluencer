import type { AppState } from '../../../app/providers/appState';
import { FilterBar } from '../../../components/ui/FilterBar';
import { cn } from '../../../lib/utils';
import { getActivePilares } from '../../settings/lib/activePilares';
import type { IdeasQuickFilter, IdeasSort } from '../lib/ideaFilters';

const QUICK_FILTERS: { value: IdeasQuickFilter; label: string }[] = [
  { value: 'unclassified', label: 'Sem classificação' },
  { value: 'with-origin', label: 'Com origem' },
  { value: 'ready-for-script', label: 'Prontas para roteiro' },
];

const SORT_OPTIONS = [
  { label: 'Mais recentes', value: 'recent' },
  { label: 'Mais antigas', value: 'oldest' },
];

interface IdeasInboxToolbarProps {
  state: AppState;
  search: string;
  onSearchChange: (value: string) => void;
  sort: IdeasSort;
  onSortChange: (value: IdeasSort) => void;
  quickFilter: IdeasQuickFilter;
  onQuickFilterToggle: (value: IdeasQuickFilter) => void;
  filterPilarId: string;
  onFilterPilarIdChange: (value: string) => void;
  filterSeriesId: string;
  onFilterSeriesIdChange: (value: string) => void;
  filterOrigemId: string;
  onFilterOrigemIdChange: (value: string) => void;
  className?: string;
}

export function IdeasInboxToolbar({
  state,
  search,
  onSearchChange,
  sort,
  onSortChange,
  quickFilter,
  onQuickFilterToggle,
  filterPilarId,
  onFilterPilarIdChange,
  filterSeriesId,
  onFilterSeriesIdChange,
  filterOrigemId,
  onFilterOrigemIdChange,
  className,
}: IdeasInboxToolbarProps) {
  const consumindo = state.bibliotecaItems.filter((item) =>
    ['Consumindo', 'Lendo', 'Assistindo'].includes(item.status),
  );

  return (
    <div className={cn('stack-sm', className)}>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_FILTERS.map((chip) => {
          const active = quickFilter === chip.value;

          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => onQuickFilterToggle(chip.value)}
              className={cn(
                'rounded-[var(--radius-pill)] border px-2.5 py-1 text-xs font-medium transition-colors',
                active
                  ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]'
                  : 'border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]',
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <FilterBar
        size="compact"
        searchValue={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar ideias..."
        sortValue={sort}
        onSortChange={(value) => onSortChange(value as IdeasSort)}
        sortOptions={SORT_OPTIONS}
        filters={[
          {
            id: 'pilar',
            label: 'Pilar',
            value: filterPilarId,
            onChange: onFilterPilarIdChange,
            options: [
              { label: 'Todos os pilares', value: '' },
              ...getActivePilares(state.pilares).map((pilar) => ({
                label: pilar.nome,
                value: pilar.id,
              })),
            ],
          },
          {
            id: 'serie',
            label: 'Série',
            value: filterSeriesId,
            onChange: onFilterSeriesIdChange,
            options: [
              { label: 'Todas as séries', value: '' },
              ...state.series.map((serie) => ({
                label: serie.name,
                value: serie.id,
              })),
            ],
          },
          {
            id: 'origem',
            label: 'Origem',
            value: filterOrigemId,
            onChange: onFilterOrigemIdChange,
            options: [
              { label: 'Qualquer origem', value: '' },
              ...consumindo.map((item) => ({
                label: item.titulo.slice(0, 40),
                value: item.id,
              })),
            ],
          },
        ]}
      />
    </div>
  );
}
