import {Columns3, Grid2X2, Plus, Table as TableIcon, Upload} from 'lucide-react';
import {AppButton} from '../../../../components/ui/AppButton';
import {FilterBar} from '../../../../components/ui/FilterBar';
import {ViewModeToggle} from '../../../../components/ui/ViewModeToggle';
import {cn} from '../../../../lib/utils';
import {ContentsListView, ContentsViewMode} from '../../types';

interface ContentsToolbarProps {
  listView: ContentsListView;
  isMobile: boolean;
  viewMode: ContentsViewMode;
  searchTerm: string;
  filterStatus: string;
  filterSeries: string;
  filterPillar: string;
  sortValue: string;
  statusOptions: string[];
  statusCounts?: Record<string, number>;
  seriesOptions: {id: string; name: string}[];
  pillarOptions: {id: string; nome: string}[];
  isCompact: boolean;
  onCompactToggle: () => void;
  onViewModeChange: (mode: ContentsViewMode) => void;
  onSearchChange: (value: string) => void;
  onFilterStatusChange: (status: string) => void;
  onFilterSeriesChange: (series: string) => void;
  onFilterPillarChange: (pillar: string) => void;
  onSortChange: (value: string) => void;
  onImportClick: () => void;
  onCreateClick: () => void;
  onListViewChange: (view: ContentsListView) => void;
}

export function ContentsToolbar({
  listView,
  isMobile,
  viewMode,
  searchTerm,
  filterStatus,
  filterSeries,
  filterPillar,
  sortValue,
  statusOptions,
  statusCounts = {},
  seriesOptions,
  pillarOptions,
  isCompact,
  onCompactToggle,
  onViewModeChange,
  onSearchChange,
  onFilterStatusChange,
  onFilterSeriesChange,
  onFilterPillarChange,
  onSortChange,
  onImportClick,
  onCreateClick,
  onListViewChange,
}: ContentsToolbarProps) {
  const isPipeline = listView === 'pipeline';
  const isPublicados = listView === 'publicados';

  return (
    <header className="flex flex-col gap-3 md:gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
          <div className="flex rounded-xl bg-[var(--bg-hover)] p-1">
            {([
              {id: 'pipeline', label: 'Pipeline'},
              {id: 'publicados', label: 'Publicados'},
            ] as const).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onListViewChange(tab.id)}
                className={cn(
                  'rounded-lg px-4 py-2 text-xs font-semibold  transition-all',
                  listView === tab.id
                    ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]/60'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {!isMobile && !isPublicados && (
            <div className="flex items-center gap-2">
              <ViewModeToggle
                value={viewMode}
                onChange={onViewModeChange}
                options={[
                  {value: 'table', label: 'Tabela', icon: TableIcon},
                  {value: 'grid', label: 'Grid', icon: Grid2X2},
                  {value: 'kanban', label: 'Kanban', icon: Columns3},
                ]}
              />

              {viewMode === 'grid' && (
                <button
                  type="button"
                  onClick={onCompactToggle}
                  className={cn(
                    'inline-flex h-10 items-center justify-center rounded-xl border px-4 text-xs font-semibold  transition-all cursor-pointer',
                    isCompact
                      ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                      : 'border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                  )}
                >
                  {isCompact ? 'Modo Expandido' : 'Modo Compacto'}
                </button>
              )}
            </div>
          )}
        </div>

        {isPipeline && (
          <div className="grid grid-cols-2 gap-2 md:flex md:items-center md:gap-3">
            <AppButton
              variant="secondary"
              leftIcon={<Upload className="h-4 w-4" />}
              onClick={onImportClick}
              className="justify-center"
            >
              Importar CSV
            </AppButton>
            <AppButton variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={onCreateClick}>
              Novo conteudo
            </AppButton>
          </div>
        )}
      </div>

      {isPipeline && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {statusOptions.map(option => {
            const isSelected = filterStatus === option;
            const count = statusCounts[option];
            return (
              <button
                key={option}
                type="button"
                onClick={() => onFilterStatusChange(option)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all cursor-pointer border',
                  isSelected
                    ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                    : 'border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                )}
              >
                <span>{option}</span>
                {typeof count === 'number' ? (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums',
                      isSelected ? 'bg-white/20 text-inherit' : 'bg-[var(--bg-hover)] text-[var(--text-tertiary)]'
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      <FilterBar
        searchValue={searchTerm}
        onSearchChange={onSearchChange}
        searchPlaceholder={
          isPublicados
            ? 'Buscar titulo ou data de publicacao'
            : 'Buscar titulo, roteiro, serie ou pilar'
        }
        filters={
          isPipeline
            ? [
                {
                  id: 'series',
                  label: 'Serie',
                  value: filterSeries,
                  onChange: onFilterSeriesChange,
                  options: [
                    {value: 'Todas', label: 'Todas'},
                    ...seriesOptions.map(series => ({value: series.id, label: series.name})),
                  ],
                },
                {
                  id: 'pillar',
                  label: 'Pilar',
                  value: filterPillar,
                  onChange: onFilterPillarChange,
                  options: [
                    {value: 'Todos', label: 'Todos'},
                    ...pillarOptions.map(pillar => ({value: pillar.id, label: pillar.nome})),
                  ],
                },
              ]
            : []
        }
        sortValue={sortValue}
        sortOptions={
          isPublicados
            ? [
                {value: 'publishDate:desc', label: 'Data de postagem'},
                {value: 'updatedAt:desc', label: 'Recentes'},
              ]
            : [
                {value: 'updatedAt:desc', label: 'Recentes'},
                {value: 'createdAt:desc', label: 'Criação'},
                {value: 'title:asc', label: 'Título A-Z'},
              ]
        }
        onSortChange={onSortChange}
      />
    </header>
  );
}
