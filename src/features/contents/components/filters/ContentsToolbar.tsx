import {Columns3, Grid2X2, Table as TableIcon} from 'lucide-react';
import {FilterBar} from '../../../../components/ui/FilterBar';
import {SegmentTabs} from '../../../../components/ui/SegmentTabs';
import {ViewModeToggle} from '../../../../components/ui/ViewModeToggle';
import {GLOSSARY} from '../../../../lib/uiCopy';
import {ContentsListView, ContentsViewMode} from '../../types';
import {PipelineStatusPills} from './PipelineStatusPills';

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
  onViewModeChange: (mode: ContentsViewMode) => void;
  onSearchChange: (value: string) => void;
  onFilterStatusChange: (status: string) => void;
  onFilterSeriesChange: (series: string) => void;
  onFilterPillarChange: (pillar: string) => void;
  onSortChange: (value: string) => void;
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
  onViewModeChange,
  onSearchChange,
  onFilterStatusChange,
  onFilterSeriesChange,
  onFilterPillarChange,
  onSortChange,
  onListViewChange,
}: ContentsToolbarProps) {
  const isPipeline = listView === 'pipeline';
  const isPublicados = listView === 'publicados';

  const seriesPillarFilters = isPipeline
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
    : [];

  return (
    <header className="stack-md">
      <div className="flex items-center gap-2">
        <SegmentTabs
          options={[
            {id: 'pipeline', label: GLOSSARY.roteiros},
            {id: 'publicados', label: GLOSSARY.publicados},
          ]}
          value={listView}
          onChange={onListViewChange}
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <FilterBar
          className="min-w-0 flex-1"
          searchValue={searchTerm}
          onSearchChange={onSearchChange}
          searchPlaceholder={
            isPublicados ? 'Buscar título, série ou pilar…' : 'Buscar título, série ou pilar…'
          }
          filters={seriesPillarFilters}
          sortValue={sortValue}
          sortOptions={
            isPublicados
              ? [
                  {value: 'publishDate:desc', label: 'Data de postagem'},
                  {value: 'updatedAt:desc', label: 'Mais recentes'},
                ]
              : [
                  {value: 'updatedAt:desc', label: 'Mais recentes'},
                  {value: 'createdAt:desc', label: 'Criação'},
                  {value: 'title:asc', label: 'Título A-Z'},
                ]
          }
          onSortChange={onSortChange}
        />

        {!isMobile && !isPublicados ? (
          <ViewModeToggle
            value={viewMode}
            onChange={onViewModeChange}
            showLabels
            options={[
              {value: 'grid', label: 'Grade', icon: Grid2X2},
              {value: 'kanban', label: 'Kanban', icon: Columns3},
              {value: 'table', label: 'Lista', icon: TableIcon},
            ]}
          />
        ) : null}
      </div>

      {isPipeline ? (
        <PipelineStatusPills
          options={statusOptions}
          active={filterStatus}
          counts={statusCounts}
          onChange={onFilterStatusChange}
        />
      ) : null}
    </header>
  );
}
