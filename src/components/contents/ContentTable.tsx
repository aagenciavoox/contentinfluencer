import React from 'react';
import { Content } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { format } from 'date-fns';
import { ExternalLink, Zap, ArrowUp, ArrowDown, ArrowUpDown, BookOpen, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

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

  const allSelected = contents.length > 0 && contents.every(c => selectedIds.has(c.id));
  const someSelected = contents.some(c => selectedIds.has(c.id));

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-20" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-[var(--accent-blue)]" />
      : <ArrowDown className="w-3 h-3 ml-1 text-[var(--accent-blue)]" />;
  };

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
