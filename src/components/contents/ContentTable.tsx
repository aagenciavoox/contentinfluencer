import React from 'react';
import { Content } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { Zap, ArrowUp, ArrowDown, ArrowUpDown, Check, Layers } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useIsMobile } from '../../hooks/useIsMobile';

interface ContentTableProps {
  contents: Content[];
  onSelect: (content: Content) => void;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: any) => void;
  lookAlerts: Record<string, string>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
}

export function ContentTable({
  contents,
  onSelect,
  sortField,
  sortDirection,
  onSort,
  lookAlerts,
  selectedIds,
  onToggleSelect,
  onSelectAll,
}: ContentTableProps) {
  const { state } = useAppContext();
  const isMobile = useIsMobile();

  const allSelected = contents.length > 0 && contents.every(c => selectedIds.has(c.id));
  const someSelected = contents.some(c => selectedIds.has(c.id));

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-20" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-[var(--accent-blue)]" />
      : <ArrowDown className="w-3 h-3 ml-1 text-[var(--accent-blue)]" />;
  };

  const statusVars: Record<string, string> = {
    'Ideia':              '--status-idea',
    'Pronto para Gravar': '--status-ready',
    'Gravado':            '--status-recorded',
    'A Editar':           '--status-editing',
    'Editado':            '--status-edited',
    'Programado':         '--status-scheduled',
    'Postado':            '--status-posted',
  };

  const getStatusVar = (status: string) => {
    return statusVars[status] || '--status-idea';
  };

  if (isMobile) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between px-2 mb-3 bg-[var(--bg-secondary)]/50 py-1.5 rounded-lg border border-[var(--border-color)]">
          <button
            onClick={onSelectAll}
            className="flex items-center gap-1.5 text-[8.5px] font-black uppercase tracking-widest text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <div className={cn(
              'w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all',
              allSelected ? 'bg-[var(--text-primary)] border-[var(--text-primary)]' : 'border-[var(--border-color)] bg-[var(--bg-primary)]'
            )}>
              {allSelected && <Check className="w-2.5 h-2.5 text-[var(--bg-primary)] stroke-[4px]" />}
            </div>
            {allSelected ? 'Nenhum' : 'Todos'}
          </button>
          
          <div className="flex items-center gap-1.5">
             <span className="text-[8px] font-black text-[var(--text-tertiary)] uppercase opacity-40 tracking-widest">Ordem:</span>
             <select 
               value={sortField}
               onChange={(e) => onSort(e.target.value)}
               className="text-[8.5px] font-black uppercase bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-md px-1.5 py-1 focus:ring-0 text-[var(--text-primary)] cursor-pointer"
             >
               <option value="title">Título</option>
               <option value="status">Status</option>
               <option value="createdAt">Data</option>
             </select>
          </div>
        </div>

        {contents.map((content) => {
          const isSelected = selectedIds.has(content.id);
          const series = content.seriesId ? state.series.find(s => s.id === content.seriesId) : null;

          return (
            <div
              key={content.id}
              onClick={() => onSelect(content)}
              className={cn(
                "relative bg-[var(--bg-secondary)] border px-4 py-3 rounded-xl transition-all active:scale-[0.98]",
                isSelected ? "border-[var(--text-primary)] ring-2 ring-[var(--text-primary)]/5" : "border-[var(--border-color)]"
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: `var(${getStatusVar(content.status)})` }}
                    />
                    <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                      {content.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-[var(--text-primary)] leading-tight line-clamp-2 italic">
                    {content.title}
                  </h3>
                </div>
                
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleSelect(content.id); }}
                  className={cn(
                    'w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 mt-1',
                    isSelected ? 'bg-[var(--text-primary)] border-[var(--text-primary)]' : 'border-[var(--border-color)]'
                  )}
                >
                  {isSelected && <Check className="w-3 h-3 text-[var(--bg-primary)] stroke-[4px]" />}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-[var(--bg-hover)] rounded text-[var(--text-secondary)] border border-[var(--border-color)]/50">
                  {content.pillar}
                </span>
                {series && (
                  <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-[var(--bg-hover)] rounded text-[var(--accent-blue)] border border-[var(--accent-blue)]/10 flex items-center gap-1">
                    <Layers className="w-2 h-2" /> {series.name}
                  </span>
                )}
              </div>

              {lookAlerts[content.id] && (
                <div className="absolute -top-1.5 -right-1 flex items-center gap-1 px-2 py-0.5 bg-orange-500 text-white rounded-full shadow-lg z-10">
                   <Zap className="w-2 h-2 fill-current animate-pulse" />
                   <span className="text-[7px] font-black uppercase">Refazer</span>
                </div>
              )}
            </div>
          );
        })}
        <div className="h-10" />
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden border border-[var(--border-color)] rounded-2xl bg-[var(--bg-secondary)] shadow-sm transition-all duration-300">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)] font-black border-b border-[var(--border-color)] bg-[var(--bg-hover)]/30">
              <th className="py-5 pl-6 pr-2 w-12 text-center">
                <button
                  onClick={onSelectAll}
                  className={cn(
                    'w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 mx-auto',
                    allSelected
                      ? 'bg-[var(--text-primary)] border-[var(--text-primary)]'
                      : someSelected
                        ? 'bg-[var(--text-primary)]/40 border-[var(--text-primary)]/60'
                        : 'border-[var(--border-color)] hover:border-[var(--text-primary)]/40'
                  )}
                >
                  {allSelected && <Check className="w-3 h-3 text-[var(--bg-primary)] stroke-[4px]" />}
                  {someSelected && !allSelected && <div className="w-2 h-0.5 bg-[var(--bg-primary)] rounded-full" />}
                </button>
              </th>
              <th className="py-5 px-6 cursor-pointer hover:text-[var(--text-primary)] transition-colors group w-auto" onClick={() => onSort('title')}>
                <div className="flex items-center gap-1">Título <SortIcon field="title" /></div>
              </th>
              <th className="py-5 px-6 cursor-pointer hover:text-[var(--text-primary)] transition-colors w-40" onClick={() => onSort('seriesName')}>
                <div className="flex items-center gap-1">Série <SortIcon field="seriesName" /></div>
              </th>
              <th className="py-5 px-6 cursor-pointer hover:text-[var(--text-primary)] transition-colors w-32" onClick={() => onSort('pillar')}>
                <div className="flex items-center gap-1">Pilar <SortIcon field="pillar" /></div>
              </th>
              <th className="py-5 px-6 cursor-pointer hover:text-[var(--text-primary)] transition-colors w-40" onClick={() => onSort('status')}>
                <div className="flex items-center gap-1 text-center">Status <SortIcon field="status" /></div>
              </th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {contents.map((content) => {
              const isSelected = selectedIds.has(content.id);

              return (
                <tr
                  key={content.id}
                  onClick={() => onSelect(content)}
                  className={cn(
                    'group border-b border-[var(--border-color)]/50 cursor-pointer transition-all duration-200',
                    isSelected
                      ? 'bg-[var(--accent-blue)]/5'
                      : 'hover:bg-[var(--bg-hover)] md:hover:translate-x-0.5'
                  )}
                >
                  <td className="py-5 pl-6 pr-2 text-center" onClick={e => { e.stopPropagation(); onToggleSelect(content.id); }}>
                    <div
                      className={cn(
                        'w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 mx-auto',
                        isSelected
                          ? 'bg-[var(--text-primary)] border-[var(--text-primary)]'
                          : 'border-[var(--border-color)] group-hover:border-[var(--text-primary)]/30'
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3 text-[var(--bg-primary)] stroke-[4px]" />}
                    </div>
                  </td>
                  
                  <td className="py-5 px-6">
                    <div className="flex flex-col gap-1">
                      <span className="font-black text-base text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors">
                        {content.title}
                      </span>
                    </div>
                  </td>

                  <td className="py-5 px-6">
                    {content.seriesId && state.series.find(s => s.id === content.seriesId)?.name ? (
                      <span className="t-meta text-[var(--text-tertiary)] bg-[var(--bg-hover)] px-2 py-1 rounded-lg border border-[var(--border-color)]/30">
                        {state.series.find(s => s.id === content.seriesId)?.name}
                      </span>
                    ) : (
                      <span className="t-meta text-[var(--text-tertiary)] italic">Global</span>
                    )}
                  </td>

                  <td className="py-5 px-6">
                    <span className="t-meta text-[var(--text-secondary)]">
                      {content.pillar}
                    </span>
                  </td>

                  <td className="py-5 px-6">
                    <div className="flex items-center gap-2">
                       <div
                         className="w-1.5 h-1.5 rounded-full"
                         style={{ background: `var(${getStatusVar(content.status)})` }}
                       />
                       <span className="t-tag text-[var(--text-primary)] opacity-80">
                         {content.status}
                       </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
