import {Calendar, Layers, Plus, Table as TableIcon, Upload} from 'lucide-react';
import {cn} from '../../../lib/utils';
import {ViewModeToggle} from '../../../components/common/ViewModeToggle';
import {ContentsViewMode} from '../types';
import {AppButton} from '../../../components/common/AppButton';
import {FilterBar} from '../../../components/common/FilterBar';

interface ContentsHeaderProps {
  isMobile: boolean;
  viewMode: ContentsViewMode;
  searchTerm: string;
  filterStatus: string;
  filterSeries: string;
  filterPillar: string;
  sortValue: string;
  statusStages: string[];
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
}

export function ContentsHeader({
  isMobile,
  viewMode,
  searchTerm,
  filterStatus,
  filterSeries,
  filterPillar,
  sortValue,
  statusStages,
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
}: ContentsHeaderProps) {
  const statusOptions = ['Todos', 'No Escuro', ...statusStages].filter(status => status !== 'Pronto para Gravar');

  return (
    <header className="flex flex-col gap-3 md:gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
          {!isMobile && (
            <ViewModeToggle
              value={viewMode}
              onChange={onViewModeChange}
              options={[
                {value: 'table', label: 'Tabela', icon: TableIcon},
                {value: 'ecosystem', label: 'Ecossistema', icon: Layers},
                {value: 'timeline', label: 'Timeline', icon: Calendar},
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

      <FilterBar
        searchValue={searchTerm}
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar conteúdo, série ou pilar"
        filters={[
          {
            id: 'series',
            label: 'Série',
            value: filterSeries,
            options: [
              {label: 'Série', value: 'Todas'},
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
        ]}
        sortValue={sortValue}
        sortOptions={[
          {label: 'Recentes', value: 'createdAt:desc'},
          {label: 'Mais antigos', value: 'createdAt:asc'},
          {label: 'Título A-Z', value: 'title:asc'},
          {label: 'Status A-Z', value: 'status:asc'},
        ]}
        onSortChange={onSortChange}
      />
    </header>
  );
}
