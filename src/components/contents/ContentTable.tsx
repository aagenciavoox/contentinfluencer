import React from 'react';
import { Content } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { format } from 'date-fns';
import { ExternalLink, Zap, ArrowUp, ArrowDown, ArrowUpDown, BookOpen } from 'lucide-react';
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
    <div className="min-w-full inline-block align-middle transition-colors duration-200">
      <div className="overflow-x-auto border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] shadow-sm">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold border-b border-[var(--border-color)]">
              {/* Checkbox select-all */}
              <th className="py-4 pl-5 pr-2 w-10">
                <button
                  onClick={onSelectAll}
                  className={cn(
                    'w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0',
                    allSelected
                      ? 'bg-[var(--text-primary)] border-[var(--text-primary)]'
                      : someSelected
                        ? 'bg-[var(--text-primary)]/30 border-[var(--text-primary)]/50'
                        : 'border-[var(--border-strong)] hover:border-[var(--text-primary)]/50'
                  )}
                >
                  {(allSelected || someSelected) && (
                    <svg className="w-2.5 h-2.5 text-[var(--bg-primary)]" fill="currentColor" viewBox="0 0 12 12">
                      {allSelected
                        ? <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        : <path d="M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      }
                    </svg>
                  )}
                </button>
              </th>
              <th className="py-4 px-6 font-bold cursor-pointer hover:bg-[var(--bg-hover)] transition-colors" onClick={() => onSort('title')}>
                <div className="flex items-center">Título <SortIcon field="title" /></div>
              </th>
              <th className="py-4 px-6 font-bold cursor-pointer hover:bg-[var(--bg-hover)] transition-colors" onClick={() => onSort('seriesName')}>
                <div className="flex items-center">Série <SortIcon field="seriesName" /></div>
              </th>
              <th className="py-4 px-6 font-bold cursor-pointer hover:bg-[var(--bg-hover)] transition-colors" onClick={() => onSort('pillar')}>
                <div className="flex items-center">Pilar <SortIcon field="pillar" /></div>
              </th>
              <th className="py-4 px-6 font-bold cursor-pointer hover:bg-[var(--bg-hover)] transition-colors" onClick={() => onSort('format')}>
                <div className="flex items-center">Formato <SortIcon field="format" /></div>
              </th>
              <th className="py-4 px-6 font-bold cursor-pointer hover:bg-[var(--bg-hover)] transition-colors" onClick={() => onSort('status')}>
                <div className="flex items-center">Status <SortIcon field="status" /></div>
              </th>
              <th className="py-4 px-6 font-bold cursor-pointer hover:bg-[var(--bg-hover)] transition-colors" onClick={() => onSort('slotType')}>
                <div className="flex items-center">Slot <SortIcon field="slotType" /></div>
              </th>
              <th className="py-4 px-6 font-bold">Postagem</th>
              {state.books.length > 0 && (
                <th className="py-4 px-6 font-bold">Livro</th>
              )}
              <th className="py-4 px-6 font-bold">Link</th>
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
                    'group border-b border-[var(--border-color)] cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-[var(--text-primary)]/5'
                      : 'hover:bg-[var(--bg-hover)]'
                  )}
                >
                  {/* Checkbox */}
                  <td className="py-4 pl-5 pr-2" onClick={e => { e.stopPropagation(); onToggleSelect(content.id); }}>
                    <div
                      className={cn(
                        'w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0',
                        isSelected
                          ? 'bg-[var(--text-primary)] border-[var(--text-primary)]'
                          : 'border-[var(--border-strong)] group-hover:border-[var(--text-primary)]/40'
                      )}
                    >
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 text-[var(--bg-primary)]" fill="currentColor" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="font-semibold text-[var(--text-primary)] group-hover:text-black dark:group-hover:text-white transition-colors">
                        {content.title}
                      </span>
                      {lookAlerts[content.id] && (
                        <span className="text-[9px] text-[var(--accent-orange)] font-bold flex items-center gap-1 mt-1 animate-pulse">
                          <Zap className="w-2.5 h-2.5" /> {lookAlerts[content.id]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-[var(--text-secondary)]">
                    {content.seriesId && state.series.find(s => s.id === content.seriesId)?.name
                      ? state.series.find(s => s.id === content.seriesId)?.name
                      : <span className="text-[var(--text-tertiary)] opacity-40 italic text-xs">Sem Série</span>
                    }
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2 py-0.5 bg-[var(--bg-hover)] text-[var(--text-secondary)] text-[10px] font-bold rounded uppercase border border-transparent group-hover:border-[var(--border-color)]">
                      {content.pillar}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest",
                      content.format === 'Reels' && "bg-pink-100/50 text-pink-700",
                      content.format === 'Stories' && "bg-orange-100/50 text-orange-700",
                      content.format === 'YouTube' && "bg-red-100/50 text-red-700",
                      content.format === 'Newsletter' && "bg-blue-100/50 text-blue-700",
                      content.format === 'Post' && "bg-indigo-100/50 text-indigo-700"
                    )}>
                      {content.format}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={cn(
                      "px-2 py-0.5 text-[10px] font-bold rounded uppercase",
                      content.status === 'Postado' ? 'bg-green-100/50 text-green-700' : 'bg-orange-100/50 text-orange-700'
                    )}>
                      {content.status}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={cn(
                      "px-2 py-0.5 text-[10px] font-bold rounded uppercase",
                      content.slotType === 'Curto' && 'bg-yellow-100/50 text-yellow-700',
                      content.slotType === 'Série' && 'bg-purple-100/50 text-purple-700',
                      content.slotType === 'Janela' && 'bg-teal-100/50 text-teal-700',
                      !content.slotType && 'text-[var(--text-tertiary)]'
                    )}>
                      {content.slotType || '-'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-[var(--text-tertiary)] text-xs">
                    {content.publishDate ? format(new Date(content.publishDate), 'dd/MM/yy') : '-'}
                  </td>
                  {state.books.length > 0 && (
                    <td className="py-4 px-6">
                      {content.livroOrigemId ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--accent-orange)] bg-[var(--accent-orange)]/8 px-2 py-1 rounded-lg max-w-[140px] truncate" title={state.books.find(b => b.id === content.livroOrigemId)?.titulo}>
                          <BookOpen className="w-3 h-3 shrink-0" />
                          {state.books.find(b => b.id === content.livroOrigemId)?.titulo}
                        </span>
                      ) : (
                        <span className="text-[var(--text-tertiary)] opacity-30">-</span>
                      )}
                    </td>
                  )}
                  <td className="py-4 px-6">
                    {content.link ? (
                      <a
                        href={content.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[var(--accent-blue)] hover:text-blue-800 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : '-'}
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
