import React from 'react';
import { Content } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { format } from 'date-fns';
import { ExternalLink, Zap, ArrowUp, ArrowDown, ArrowUpDown, BookOpen, Check, MoreVertical } from 'lucide-react';
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
    'Programado':         { cssVar: '--status-scheduled' }, // Note: some inconsistencies in original code mapping, fixing to use vars
    'Postado':            '--status-posted',
  };

  const getStatusVar = (status: string) => {
    const val = statusVars[status];
    if (typeof val === 'string') return val;
    if (status === 'Programado') return '--status-scheduled';
    return '--status-idea';
  };

  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Mobile Header with Select All */}
        <div className="flex items-center justify-between px-2 mb-2">
          <button
            onClick={onSelectAll}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]"
          >
            <div className={cn(
              'w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all',
              allSelected ? 'bg-[var(--text-primary)] border-[var(--text-primary)]' : 'border-[var(--border-color)]'
            )}>
              {allSelected && <Check className="w-2.5 h-2.5 text-[var(--bg-primary)] stroke-[4px]" />}
            </div>
            {allSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}
          </button>
          
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-black text-[var(--text-tertiary)] uppercase opacity-40">Ordenar por:</span>
             <select 
               value={sortField}
               onChange={(e) => onSort(e.target.value)}
               className="text-[10px] font-black uppercase bg-transparent border-none p-0 focus:ring-0 text-[var(--text-primary)]"
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
          const book = content.livroOrigemId ? state.books.find(b => b.id === content.livroOrigemId) : null;

          return (
            <div
              key={content.id}
              onClick={() => onSelect(content)}
              className={cn(
                "relative bg-[var(--bg-secondary)] border p-5 rounded-2xl transition-all active:scale-[0.98]",
                isSelected ? "border-[var(--text-primary)] ring-4 ring-[var(--text-primary)]/5" : "border-[var(--border-color)]"
              )}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: `var(${getStatusVar(content.status)})` }}
                    />
                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                      {content.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] leading-tight line-clamp-2">
                    {content.title}
                  </h3>
                </div>
                
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleSelect(content.id); }}
                  className={cn(
                    'w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0',
                    isSelected ? 'bg-[var(--text-primary)] border-[var(--text-primary)]' : 'border-[var(--border-color)]'
                  )}
                >
                  {isSelected && <Check className="w-4 h-4 text-[var(--bg-primary)] stroke-[4px]" />}
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-[var(--bg-hover)] rounded-md text-[var(--text-secondary)] border border-[var(--border-color)]/50">
                  {content.pillar}
                </span>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border",
                  content.format === 'Reels' && "bg-pink-500/5 text-pink-600 border-pink-500/10",
                  content.format === 'Stories' && "bg-orange-500/5 text-orange-600 border-orange-500/10",
                  content.format === 'YouTube' && "bg-red-500/5 text-red-600 border-red-500/10"
                )}>
                  {content.format}
                </span>
                {content.slotType && (
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border",
                    content.slotType === 'Curto' && 'text-yellow-600 bg-yellow-500/5 border-yellow-500/10',
                    content.slotType === 'Série' && 'text-purple-600 bg-purple-500/5 border-purple-500/10',
                    content.slotType === 'Janela' && 'text-teal-600 bg-teal-500/5 border-teal-500/10'
                  )}>
                    {content.slotType}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]/50">
                <div className="flex items-center gap-3">
                  {series && (
                    <span className="text-[10px] font-medium text-[var(--text-tertiary)] flex items-center gap-1">
                      <Layers className="w-3 h-3 opacity-40" /> {series.name}
                    </span>
                  )}
                  {book && (
                    <span className="text-[10px] font-medium text-[var(--accent-orange)] flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> {book.titulo.slice(0, 15)}...
                    </span>
                  )}
                </div>
                
                {content.link && (
                  <a
                    href={content.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 bg-[var(--bg-hover)] text-[var(--text-tertiary)] rounded-xl border border-[var(--border-color)] active:bg-[var(--accent-blue)] active:text-white transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              {lookAlerts[content.id] && (
                <div className="absolute -top-2 -right-2 flex items-center gap-1.5 px-3 py-1 bg-orange-500 text-white rounded-full shadow-lg z-10">
                   <Zap className="w-3 h-3 fill-current animate-pulse" />
                   <span className="text-[8px] font-black uppercase tracking-widest">Atenção</span>
                </div>
              )}
            </div>
          );
        })}
        <div className="h-20" /> {/* Spacer for NavBar */}
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden border border-[var(--border-color)] rounded-2xl bg-[var(--bg-secondary)] shadow-sm transition-all duration-300">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)] font-black border-b border-[var(--border-color)] bg-[var(--bg-hover)]/30">
              {/* Checkbox select-all */}
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
              <th className="py-5 px-6 cursor-pointer hover:text-[var(--text-primary)] transition-colors group" onClick={() => onSort('title')}>
                <div className="flex items-center gap-1">Título <SortIcon field="title" /></div>
              </th>
              <th className="py-5 px-6 cursor-pointer hover:text-[var(--text-primary)] transition-colors" onClick={() => onSort('seriesName')}>
                <div className="flex items-center gap-1">Série <SortIcon field="seriesName" /></div>
              </th>
              <th className="py-5 px-6 cursor-pointer hover:text-[var(--text-primary)] transition-colors" onClick={() => onSort('pillar')}>
                <div className="flex items-center gap-1">Pilar <SortIcon field="pillar" /></div>
              </th>
              <th className="py-5 px-6 cursor-pointer hover:text-[var(--text-primary)] transition-colors" onClick={() => onSort('format')}>
                <div className="flex items-center gap-1">Formato <SortIcon field="format" /></div>
              </th>
              <th className="py-5 px-6 cursor-pointer hover:text-[var(--text-primary)] transition-colors" onClick={() => onSort('status')}>
                <div className="flex items-center gap-1 text-center">Status <SortIcon field="status" /></div>
              </th>
              <th className="py-5 px-6 cursor-pointer hover:text-[var(--text-primary)] transition-colors" onClick={() => onSort('slotType')}>
                <div className="flex items-center gap-1">Slot <SortIcon field="slotType" /></div>
              </th>
              <th className="py-5 px-6">Livro</th>
              <th className="py-5 px-6 text-center">Link</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {contents.map((content) => {
              const isSelected = selectedIds.has(content.id);
              const statusVars: Record<string, string> = {
                'Ideia':              '--status-idea',
                'Pronto para Gravar': '--status-ready',
                'Gravado':            '--status-recorded',
                'A Editar':           '--status-editing',
                'Editado':            '--status-edited',
                'Programado':         '--status-scheduled',
                'Postado':            '--status-posted',
              };

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
                  {/* Checkbox */}
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
                      <span className="font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors line-clamp-1">
                        {content.title}
                      </span>
                      {lookAlerts[content.id] && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-500/10 rounded overflow-hidden w-fit">
                           <Zap className="w-2.5 h-2.5 text-orange-500 animate-pulse" />
                           <span className="text-[8px] font-black uppercase tracking-widest text-orange-600">{lookAlerts[content.id]}</span>
                        </div>
                      )}
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
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm",
                      content.format === 'Reels' && "bg-pink-500/5 text-pink-600 border-pink-500/10",
                      content.format === 'Stories' && "bg-orange-500/5 text-orange-600 border-orange-500/10",
                      content.format === 'YouTube' && "bg-red-500/5 text-red-600 border-red-500/10",
                      content.format === 'Newsletter' && "bg-blue-500/5 text-blue-600 border-blue-500/10",
                      content.format === 'Post' && "bg-indigo-500/5 text-indigo-600 border-indigo-500/10"
                    )}>
                      {content.format}
                    </span>
                  </td>

                  <td className="py-5 px-6">
                    <div className="flex items-center gap-2">
                       <div
                         className="w-1.5 h-1.5 rounded-full"
                         style={{ background: `var(${statusVars[content.status] || '--status-idea'})` }}
                       />
                       <span className="t-tag text-[var(--text-primary)] opacity-80">
                         {content.status}
                       </span>
                    </div>
                  </td>

                  <td className="py-5 px-6">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg",
                      content.slotType === 'Curto' && 'text-yellow-600 bg-yellow-500/5',
                      content.slotType === 'Série' && 'text-purple-600 bg-purple-500/5',
                      content.slotType === 'Janela' && 'text-teal-600 bg-teal-500/5',
                      !content.slotType && 'text-[var(--text-tertiary)] opacity-30'
                    )}>
                      {content.slotType || '—'}
                    </span>
                  </td>

                  <td className="py-5 px-6">
                    {content.livroOrigemId ? (
                      <div className="flex items-center gap-2 text-[10px] font-black text-[var(--accent-orange)] bg-[var(--accent-orange)]/5 px-3 py-1.5 rounded-xl border border-[var(--accent-orange)]/10 w-fit max-w-[120px]" title={state.books.find(b => b.id === content.livroOrigemId)?.titulo}>
                        <BookOpen className="w-3 h-3 shrink-0" />
                        <span className="truncate">{state.books.find(b => b.id === content.livroOrigemId)?.titulo}</span>
                      </div>
                    ) : (
                      <span className="text-[var(--text-tertiary)] opacity-10">—</span>
                    )}
                  </td>

                  <td className="py-5 px-6 text-center">
                    {content.link ? (
                      <a
                        href={content.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex p-2 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] rounded-xl hover:bg-[var(--accent-blue)] hover:text-white transition-all shadow-sm"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-[var(--text-tertiary)] opacity-10">—</span>
                    )}
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
