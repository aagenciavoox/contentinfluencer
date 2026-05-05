import React from 'react';
import { Content } from '../../../../lib/database';
import { useAppContext } from '../../../../context/AppContext';
import { Zap, ArrowUp, ArrowDown, ArrowUpDown, Check, Layers, Eye } from 'lucide-react';
import { cn, getEntityTagStyle } from '../../../../lib/utils';
import { useIsMobile } from '../../../../hooks/useIsMobile';

interface ContentTableProps {
  mode?: 'editorial' | 'postagem' | 'historico';
  contents: Content[];
  onSelect: (content: Content) => void;
  onPreview: (content: Content) => void;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: any) => void;
  lookAlerts: Record<string, string>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
}

export function ContentTable({
  mode = 'editorial',
  contents,
  onSelect,
  onPreview,
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

  const enableSelection = mode !== 'historico';
  const allSelected = enableSelection && contents.length > 0 && contents.every(c => selectedIds.has(c.id));
  const someSelected = enableSelection && contents.some(c => selectedIds.has(c.id));

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-20" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-[var(--accent-blue)]" />
      : <ArrowDown className="w-3 h-3 ml-1 text-[var(--accent-blue)]" />;
  };

  const statusVars: Record<string, string> = {
    'Ideia': '--status-idea',
    'Pronto para Gravar': '--status-ready',
    'Gravado': '--status-recorded',
    'A Editar': '--status-editing',
    'Editado': '--status-edited',
    'Programado': '--status-scheduled',
    'Postado': '--status-posted',
  };

  const getStatusVar = (status: string) => {
    return statusVars[status] || '--status-idea';
  };

  if (isMobile) {
    return (
      <div className="space-y-3">
        {contents.map((content) => {
          const isSelected = selectedIds.has(content.id);
          const series = content.seriesId ? state.series.find(s => s.id === content.seriesId) : null;
          const pillar = content.pilarId ? state.pilares.find(p => p.id === content.pilarId) : null;

          return (
            <div
              key={content.id}
              onClick={() => onSelect(content)}
              className={cn(
                'relative rounded-2xl border bg-[var(--bg-secondary)] px-4 py-4 shadow-sm transition-all active:scale-[0.98]',
                isSelected ? 'border-[var(--text-primary)] ring-2 ring-[var(--text-primary)]/5' : 'border-[var(--border-color)]'
              )}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <div
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: `var(${getStatusVar(content.status)})` }}
                    />
                    <span className="text-[8px] font-black uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      {content.status}
                    </span>
                  </div>
                  <h3 className="line-clamp-2 text-base font-black leading-tight text-[var(--text-primary)]">
                    {content.title}
                  </h3>
                </div>

                {enableSelection ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleSelect(content.id); }}
                    className={cn(
                      'mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-xl border-2 transition-all',
                      isSelected ? 'border-[var(--text-primary)] bg-[var(--text-primary)]' : 'border-[var(--border-color)]'
                    )}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 text-[var(--bg-primary)] stroke-[4px]" />}
                  </button>
                ) : null}
              </div>

              <div className="mb-3 flex items-center justify-end">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview(content);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-hover)] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.16em] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-primary)]"
                >
                  <Eye className="h-3 w-3" />
                  Abrir detalhe
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {pillar && (
                  <span
                    className="rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em]"
                    style={getEntityTagStyle(pillar.cor)}
                  >
                    {pillar.nome}
                  </span>
                )}
                {series && (
                  <span
                    className="flex items-center gap-1 rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em]"
                    style={getEntityTagStyle(series.cor)}
                  >
                    <Layers className="h-2.5 w-2.5" /> {series.name}
                  </span>
                )}
                {content.publishDate && (
                  <span className="rounded-full border border-[var(--border-color)]/60 bg-[var(--bg-hover)] px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                    {new Date(content.publishDate).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>

              {lookAlerts[content.id] && (
                <div className="absolute -right-1 -top-1.5 z-10 flex items-center gap-1 rounded-full bg-orange-500 px-2 py-0.5 text-white shadow-lg">
                  <Zap className="h-2 w-2 fill-current animate-pulse" />
                  <span className="text-[7px] font-black uppercase">Refazer</span>
                </div>
              )}
            </div>
          );
        })}
        <div className="h-24" />
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm transition-all duration-300">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="min-w-[800px] w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--border-color)] bg-[var(--bg-hover)]/30 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              <th className="w-12 py-5 pl-6 pr-2 text-center">
                <button
                  onClick={onSelectAll}
                  disabled={!enableSelection}
                  className={cn(
                    'mx-auto flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border-2 transition-all',
                    !enableSelection
                      ? 'cursor-default border-transparent opacity-0'
                      : allSelected
                      ? 'border-[var(--text-primary)] bg-[var(--text-primary)]'
                      : someSelected
                        ? 'border-[var(--text-primary)]/60 bg-[var(--text-primary)]/40'
                        : 'border-[var(--border-color)] hover:border-[var(--text-primary)]/40'
                  )}
                >
                  {allSelected && <Check className="w-3 h-3 text-[var(--bg-primary)] stroke-[4px]" />}
                  {someSelected && !allSelected && <div className="h-0.5 w-2 rounded-full bg-[var(--bg-primary)]" />}
                </button>
              </th>
              <th className="group w-auto cursor-pointer px-6 py-5 transition-colors hover:text-[var(--text-primary)]" onClick={() => onSort('title')}>
                <div className="flex items-center gap-1">Título <SortIcon field="title" /></div>
              </th>
              <th className="w-40 cursor-pointer px-6 py-5 transition-colors hover:text-[var(--text-primary)]" onClick={() => onSort('seriesName')}>
                <div className="flex items-center gap-1">Série <SortIcon field="seriesName" /></div>
              </th>
              <th className="w-32 cursor-pointer px-6 py-5 transition-colors hover:text-[var(--text-primary)]" onClick={() => onSort('pillarName')}>
                <div className="flex items-center gap-1">Pilar <SortIcon field="pillar" /></div>
              </th>
              <th className="w-40 cursor-pointer px-6 py-5 transition-colors hover:text-[var(--text-primary)]" onClick={() => onSort('status')}>
                <div className="flex items-center gap-1 text-center">Status <SortIcon field="status" /></div>
              </th>
              <th className="w-28 px-6 py-5 text-right">
                <div className="flex justify-end">Visualizar</div>
              </th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {contents.map((content) => {
              const isSelected = selectedIds.has(content.id);
              const series = content.seriesId ? state.series.find(s => s.id === content.seriesId) : null;
              const pillar = content.pilarId ? state.pilares.find(p => p.id === content.pilarId) : null;

              return (
                <tr
                  key={content.id}
                  onClick={() => onSelect(content)}
                  className={cn(
                    'group cursor-pointer border-b border-[var(--border-color)]/50 transition-all duration-200',
                    isSelected
                      ? 'bg-[var(--accent-blue)]/5'
                      : 'hover:bg-[var(--bg-hover)] md:hover:translate-x-0.5'
                  )}
                >
                  <td className="py-5 pl-6 pr-2 text-center" onClick={e => { if (!enableSelection) return; e.stopPropagation(); onToggleSelect(content.id); }}>
                    <div
                      className={cn(
                        'mx-auto flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border-2 transition-all',
                        !enableSelection
                          ? 'border-transparent opacity-0'
                          : isSelected
                          ? 'border-[var(--text-primary)] bg-[var(--text-primary)]'
                          : 'border-[var(--border-color)] group-hover:border-[var(--text-primary)]/30'
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3 text-[var(--bg-primary)] stroke-[4px]" />}
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                      <span className="text-base font-black text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent-blue)]">
                        {content.title}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    {series?.name ? (
                      <span
                        className="t-meta rounded-lg border px-2 py-1"
                        style={getEntityTagStyle(series.cor)}
                      >
                        {series.name}
                      </span>
                    ) : (
                      <span className="t-meta italic text-[var(--text-tertiary)]">Global</span>
                    )}
                  </td>

                  <td className="px-6 py-5">
                    {pillar?.nome ? (
                      <span
                        className="t-meta rounded-lg border px-2 py-1"
                        style={getEntityTagStyle(pillar.cor)}
                      >
                        {pillar.nome}
                      </span>
                    ) : (
                      <span className="t-meta italic text-[var(--text-tertiary)]">Sem pilar</span>
                    )}
                  </td>

                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: `var(${getStatusVar(content.status)})` }}
                      />
                      <span className="t-tag text-[var(--text-primary)] opacity-80">
                        {content.status}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onPreview(content);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-hover)] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-primary)]"
                        aria-label={`Abrir detalhe de ${content.title}`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Abrir
                      </button>
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
