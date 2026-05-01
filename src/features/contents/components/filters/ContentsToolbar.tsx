import {Grid2X2, Plus, Table as TableIcon, Upload} from 'lucide-react';
import {AppButton} from '../../../../components/ui/AppButton';
import {FilterBar} from '../../../../components/ui/FilterBar';
import {ViewModeToggle} from '../../../../components/ui/ViewModeToggle';
import {cn} from '../../../../lib/utils';
import {ContentsViewMode, PostingTab} from '../../types';

interface ContentsToolbarProps {
  mode: 'editorial' | 'history';
  postingTab?: PostingTab;
  isMobile: boolean;
  viewMode: ContentsViewMode;
  searchTerm: string;
  filterStatus: string;
  filterSeries: string;
  filterPillar: string;
  sortValue: string;
  statusOptions: string[];
  seriesOptions: {id: string; name: string}[];
  pillarOptions: {id: string; nome: string}[];
  onViewModeChange: (mode: ContentsViewMode) => void;
  onSearchChange: (value: string) => void;
  onFilterStatusChange: (status: string) => void;
  onFilterSeriesChange: (series: string) => void;
  onFilterPillarChange: (pillar: string) => void;
  onSortChange: (value: string) => void;
  onImportClick: () => void;
  onCreateClick: () => void;
  onPostingTabChange?: (tab: PostingTab) => void;
}

export function ContentsToolbar({
  mode,
  postingTab = 'postagem',
  isMobile,
  viewMode,
  searchTerm,
  filterStatus,
  filterSeries,
  filterPillar,
  sortValue,
  statusOptions,
  seriesOptions,
  pillarOptions,
  onViewModeChange,
  onSearchChange,
  onFilterStatusChange,
  onFilterSeriesChange,
  onFilterPillarChange,
  onSortChange,
  onImportClick,
  onCreateClick,
  onPostingTabChange,
}: ContentsToolbarProps) {
  const isEditorialMode = mode === 'editorial';
  const isHistoryMode = mode === 'history';
  const showFilters = !isHistoryMode || postingTab === 'postagem';

  return (
    <header className="flex flex-col gap-3 md:gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
          {isHistoryMode && onPostingTabChange ? (
            <div className="flex rounded-xl bg-[var(--bg-hover)] p-1">
              {([
                {id: 'postagem', label: 'Postagem'},
                {id: 'historico', label: 'Historico'},
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onPostingTabChange(tab.id)}
                  className={cn(
                    'rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all',
                    postingTab === tab.id
                      ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]/60'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : null}

          {!isMobile && (
            <ViewModeToggle
              value={viewMode}
              onChange={onViewModeChange}
              options={[
                {value: 'table', label: 'Tabela', icon: TableIcon},
                {value: 'grid', label: 'Grid', icon: Grid2X2},
              ]}
            />
          )}
        </div>

        {isEditorialMode && (
          <div className="grid grid-cols-2 gap-2 md:flex md:items-center md:gap-3">
            <AppButton
              size={isMobile ? 'sm' : 'md'}
              variant="primary"
              onClick={onCreateClick}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              className={cn('t-button-uppercase w-full md:w-auto', isMobile && 'col-span-2')}
            >
              Novo Roteiro
            </AppButton>

            {!isMobile && (
              <AppButton
                size="md"
                variant="secondary"
                onClick={onImportClick}
                leftIcon={<Upload className="h-3.5 w-3.5" />}
                className="t-button-uppercase w-full md:w-auto"
              >
                Importar
              </AppButton>
            )}
          </div>
        )}
      </div>

      <FilterBar
        searchValue={searchTerm}
        onSearchChange={onSearchChange}
        searchPlaceholder={
          isEditorialMode
            ? 'Buscar conteudo, serie ou pilar'
            : postingTab === 'historico'
              ? 'Buscar postagem ou data'
              : 'Buscar postagem, serie ou pilar'
        }
        filters={
          showFilters
            ? [
                {
                  id: 'series',
                  label: 'Serie',
                  value: filterSeries,
                  options: [
                    {label: 'Serie', value: 'Todas'},
                    ...seriesOptions.map(series => ({label: series.name, value: series.id})),
                  ],
                  onChange: onFilterSeriesChange,
                },
                {
                  id: 'pillar',
                  label: 'Pilar',
                  value: filterPillar,
                  options: [
                    {label: 'Pilar', value: 'Todos'},
                    ...pillarOptions.map(pillar => ({label: pillar.nome, value: pillar.id})),
                  ],
                  onChange: onFilterPillarChange,
                },
                {
                  id: 'status',
                  label: 'Status',
                  value: filterStatus,
                  options: statusOptions.map(status => ({label: status, value: status})),
                  onChange: onFilterStatusChange,
                },
              ]
            : []
        }
        sortValue={sortValue}
        sortOptions={[
          {label: 'Recentes', value: 'createdAt:desc'},
          {label: 'Mais antigos', value: 'createdAt:asc'},
          {label: 'Titulo A-Z', value: 'title:asc'},
          {label: 'Status A-Z', value: 'status:asc'},
        ]}
        onSortChange={onSortChange}
      />
    </header>
  );
}
