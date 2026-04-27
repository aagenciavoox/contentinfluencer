import { Calendar, Layers, Plus, Table as TableIcon, Upload, Video } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ViewModeToggle } from '../../components/common/ViewModeToggle';
import { ContentsMainTab, ContentsViewMode } from './types';

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
  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 md:gap-6">
        <div className="flex flex-wrap items-center gap-2 md:gap-6">
          <div className="flex bg-[var(--bg-hover)] p-0.5 rounded-xl border border-[var(--border-color)] shrink-0">
            <button
              type="button"
              onClick={() => onMainTabChange('inventory')}
              className={cn(
                'px-3 md:px-6 py-1.5 text-[8px] md:text-[10px] font-black uppercase tracking-widest rounded-lg transition-all',
                mainTab === 'inventory' ? 'bg-[var(--bg-primary)] shadow-sm' : 'text-[var(--text-secondary)] italic'
              )}
            >
              Estoque
            </button>
            <button
              type="button"
              onClick={() => onMainTabChange('recording')}
              className={cn(
                'px-3 md:px-6 py-1.5 text-[8px] md:text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5',
                mainTab === 'recording' ? 'bg-[var(--bg-primary)] shadow-sm' : 'text-[var(--text-secondary)] italic'
              )}
            >
              <Video className="w-2.5 md:w-3.5 h-2.5 md:h-3.5" /> Blocos
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

        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={onImportClick}
            className="flex items-center justify-center gap-1.5 bg-[var(--bg-hover)] text-[var(--text-primary)] px-3 py-2 rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-widest border border-[var(--border-color)]"
          >
            <Upload className="w-2.5 h-2.5" /> Importar
          </button>
          <button
            type="button"
            onClick={onCreateClick}
            className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 bg-[var(--text-primary)] text-[var(--bg-primary)] px-4 py-2 rounded-lg text-[10px] md:text-sm font-black shadow-xl"
          >
            <Plus className="w-3 h-3" /> Novo Roteiro
          </button>
        </div>
      </div>

      {mainTab === 'inventory' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <select
              value={filterSeries}
              onChange={(e) => onFilterSeriesChange(e.target.value)}
              className="text-[8px] md:text-[10px] font-black uppercase bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-lg px-2 py-2"
            >
              <option value="Todas">Séries</option>
              {seriesOptions.map((series) => (
                <option key={series.id} value={series.id}>{series.name}</option>
              ))}
            </select>
            <select
              value={filterPillar}
              onChange={(e) => onFilterPillarChange(e.target.value)}
              className="text-[8px] md:text-[10px] font-black uppercase bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-lg px-2 py-2"
            >
              <option value="Todos">Pilares</option>
              {pillarOptions.map((pillar) => (
                <option key={pillar.id} value={pillar.nome}>{pillar.nome}</option>
              ))}
            </select>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              {['Todos', 'No Escuro', ...statusStages].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => onFilterStatusChange(status)}
                  className={cn(
                    'shrink-0 px-2.5 py-1.5 text-[7.5px] md:text-[9px] font-black uppercase rounded-full border whitespace-nowrap',
                    filterStatus === status
                      ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                      : 'bg-[var(--bg-hover)] text-[var(--text-tertiary)]'
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
