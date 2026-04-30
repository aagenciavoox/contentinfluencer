import { Calendar, Layers, Plus, Table as TableIcon, Upload, Video } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { ViewModeToggle } from '../../../components/common/ViewModeToggle';
import { ContentsMainTab, ContentsViewMode } from '../types';
import { AppButton } from '../../../components/common/AppButton';

interface ContentsHeaderProps {
  isMobile: boolean;
  mainTab: ContentsMainTab;
  viewMode: ContentsViewMode;
  filterStatus: string;
  filterSeries: string;
  filterPillar: string;
  statusStages: string[];
  seriesOptions: { id: string; name: string }[];
  pillarOptions: { id: string; nome: string }[];
  onMainTabChange: (tab: ContentsMainTab) => void;
  onViewModeChange: (mode: ContentsViewMode) => void;
  onFilterStatusChange: (status: string) => void;
  onFilterSeriesChange: (series: string) => void;
  onFilterPillarChange: (pillar: string) => void;
  onImportClick: () => void;
  onCreateClick: () => void;
}

export function ContentsHeader({
  isMobile,
  mainTab,
  viewMode,
  filterStatus,
  filterSeries,
  filterPillar,
  statusStages,
  seriesOptions,
  pillarOptions,
  onMainTabChange,
  onViewModeChange,
  onFilterStatusChange,
  onFilterSeriesChange,
  onFilterPillarChange,
  onImportClick,
  onCreateClick,
}: ContentsHeaderProps) {
  const statusOptions = ['Todos', 'No Escuro', ...statusStages];

  return (
    <header className="flex flex-col gap-3 md:gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
          <div
            role="tablist"
            aria-label="Alternar área de conteúdos"
            className="grid grid-cols-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-hover)] p-0.5 md:flex md:w-auto md:shrink-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mainTab === 'inventory'}
              onClick={() => onMainTabChange('inventory')}
              className={cn(
                't-label rounded-lg px-3 py-2 text-center transition-all md:px-6 md:py-1.5',
                mainTab === 'inventory'
                  ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] italic'
              )}
            >
              Estoque
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={mainTab === 'recording'}
              onClick={() => onMainTabChange('recording')}
              className={cn(
                't-label flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-center transition-all md:px-6 md:py-1.5',
                mainTab === 'recording'
                  ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] italic'
              )}
            >
              <Video className="h-3 w-3 md:h-3.5 md:w-3.5" />
              Blocos
            </button>
          </div>

          {mainTab === 'inventory' && !isMobile && (
            <ViewModeToggle
              value={viewMode}
              onChange={onViewModeChange}
              options={[
                { value: 'table', label: 'Tabela', icon: TableIcon },
                { value: 'ecosystem', label: 'Ecossistema', icon: Layers },
                { value: 'timeline', label: 'Timeline', icon: Calendar },
              ]}
            />
          )}
        </div>

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
      </div>

      {mainTab === 'inventory' && (
        <section
          aria-label="Filtros de conteúdo"
          className="flex flex-col gap-2 md:gap-3"
        >
          {isMobile ? (
            <div className="grid grid-cols-3 gap-2">
              <select
                aria-label="Filtrar por série"
                value={filterSeries}
                onChange={(event) => onFilterSeriesChange(event.target.value)}
                className="filter-select contents-mobile-filter min-w-0"
              >
                <option value="Todas">Séries</option>
                {seriesOptions.map((series) => (
                  <option key={series.id} value={series.id}>
                    {series.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filtrar por pilar"
                value={filterPillar}
                onChange={(event) => onFilterPillarChange(event.target.value)}
                className="filter-select contents-mobile-filter min-w-0"
              >
                <option value="Todos">Pilares</option>
                {pillarOptions.map((pillar) => (
                  <option key={pillar.id} value={pillar.id}>
                    {pillar.nome}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filtrar por status"
                value={filterStatus}
                onChange={(event) => onFilterStatusChange(event.target.value)}
                className="filter-select contents-mobile-filter min-w-0"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 md:gap-4">
              <select
                aria-label="Filtrar por série"
                value={filterSeries}
                onChange={(event) => onFilterSeriesChange(event.target.value)}
                className="filter-select t-label"
              >
                <option value="Todas">Séries</option>
                {seriesOptions.map((series) => (
                  <option key={series.id} value={series.id}>
                    {series.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filtrar por pilar"
                value={filterPillar}
                onChange={(event) => onFilterPillarChange(event.target.value)}
                className="filter-select t-label"
              >
                <option value="Todos">Pilares</option>
                {pillarOptions.map((pillar) => (
                  <option key={pillar.id} value={pillar.id}>
                    {pillar.nome}
                  </option>
                ))}
              </select>

              <div className="no-scrollbar flex items-center gap-1 overflow-x-auto py-0.5">
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => onFilterStatusChange(status)}
                    className={cn(
                      'filter-chip t-label shrink-0 whitespace-nowrap',
                      filterStatus === status ? 'filter-chip-active' : ''
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </header>
  );
}
