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

  // Oculta status com zero itens (exceto o selecionado e "Todos")
  const visibleStatusOptions = statusOptions.filter(option => {
    if (option === 'Todos' || option === filterStatus) return true;
    const count = statusCounts[option];
    return typeof count === 'number' ? count > 0 : true;
  });

  return (
    <header className="flex flex-col gap-3">
      {/* Linha 1: tabs + controles de view + acoes */}
      <div className="flex items-center gap-3">
        {/* Tabs Pipeline / Publicados */}
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
                'rounded-lg px-4 py-1.5 text-xs font-semibold transition-all',
                listView === tab.id
                  ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]/60'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Controles de visualizacao (apenas desktop, apenas pipeline) */}
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
                  'inline-flex h-9 items-center justify-center rounded-xl border px-3 text-xs font-medium transition-all cursor-pointer',
                  isCompact
                    ? 'border-[var(--border-strong)] bg-[var(--bg-hover)] text-[var(--text-primary)]'
                    : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                )}
              >
                {isCompact ? 'Expandido' : 'Compacto'}
              </button>
            )}
          </div>
        )}

        {/* Acoes — empurradas para a direita */}
        {isPipeline && (
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onImportClick}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border-color)] px-3 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              title="Importar CSV"
            >
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Importar CSV</span>
            </button>
            <AppButton variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={onCreateClick}>
              Novo roteiro
            </AppButton>
          </div>
        )}
      </div>

      {/* Linha 2: status pills + busca + filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {isPipeline && visibleStatusOptions.map(option => {
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
                  : 'border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
              )}
            >
              <span>{option}</span>
              {typeof count === 'number' && (
                <span
                  className={cn(
                    'tabular-nums',
                    isSelected ? 'opacity-70' : 'text-[var(--text-tertiary)]'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {/* Busca + filtros + sort — ocupa o espaco restante */}
        <div className={cn('min-w-0', isPipeline ? 'flex-1' : 'w-full')}>
          <FilterBar
            searchValue={searchTerm}
            onSearchChange={onSearchChange}
            searchPlaceholder={
              isPublicados
                ? 'Buscar titulo ou data de publicacao'
                : 'Buscar titulo, serie ou pilar'
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
                        ...seriesOptions.map(s => ({value: s.id, label: s.name})),
                      ],
                    },
                    {
                      id: 'pillar',
                      label: 'Pilar',
                      value: filterPillar,
                      onChange: onFilterPillarChange,
                      options: [
                        {value: 'Todos', label: 'Todos'},
                        ...pillarOptions.map(p => ({value: p.id, label: p.nome})),
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
                    {value: 'createdAt:desc', label: 'Criacao'},
                    {value: 'title:asc', label: 'Titulo A-Z'},
                  ]
            }
            onSortChange={onSortChange}
          />
        </div>
      </div>
    </header>
  );
}
