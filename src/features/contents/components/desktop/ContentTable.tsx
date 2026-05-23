import React from 'react';
import { Content } from '../../../../lib/database';
import { useAppContext } from '../../../../context/AppContext';
import { Zap, ArrowUp, ArrowDown, ArrowUpDown, Check } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { useIsMobile } from '../../../../hooks/useIsMobile';

function formatLastEdit(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfEdit = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startOfToday.getTime() - startOfEdit.getTime()) / 86_400_000);

  if (dayDiff === 0) return 'hoje';
  if (dayDiff === 1) return 'ontem';
  if (dayDiff < 7) return `${dayDiff}d`;

  return date.toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'});
}

function buildMetadataLine(content: Content, seriesName?: string, pillarName?: string) {
  return [
    seriesName || 'Sem série',
    pillarName || 'Sem pilar',
    content.status,
    formatLastEdit(content.updatedAt),
  ].join(' · ');
}

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
              role="button"
              tabIndex={0}
              onClick={() => onSelect(content)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(content);
                }
              }}
              className={cn(
                'relative cursor-pointer rounded-2xl border bg-[var(--bg-secondary)] px-4 py-4 shadow-sm transition-all active:scale-[0.98]',
                isSelected ? 'border-[var(--text-primary)] ring-2 ring-[var(--text-primary)]/5' : 'border-[var(--border-color)]'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-base font-semibold leading-tight text-[var(--text-primary)]">
                    {content.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-[var(--text-tertiary)]">
                    {buildMetadataLine(content, series?.name, pillar?.nome)}
                  </p>
                </div>

                {enableSelection ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggleSelect(content.id); }}
                    className={cn(
                      'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-xl border-2 transition-all',
                      isSelected ? 'border-[var(--text-primary)] bg-[var(--text-primary)]' : 'border-[var(--border-color)]'
                    )}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 text-[var(--bg-primary)] stroke-[4px]" />}
                  </button>
                ) : null}
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
    <div className="editorial-surface w-full overflow-hidden rounded-lg transition-all duration-300">
      <table className="w-full border-separate border-spacing-0 text-left">
        <thead>
          <tr className="text-[11px] font-medium tracking-normal text-[var(--text-tertiary)]">
            <th className="w-12 border-b border-[var(--border-color)] py-3 pl-5 pr-2 text-center">
              <button
                type="button"
                onClick={onSelectAll}
                disabled={!enableSelection}
                className={cn(
                  'mx-auto flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-all',
                  !enableSelection
                    ? 'cursor-default border-transparent opacity-0'
                    : allSelected
                    ? 'border-[var(--text-primary)] bg-[var(--text-primary)]'
                    : someSelected
                      ? 'border-[var(--text-primary)]/60 bg-[var(--text-primary)]/40'
                      : 'border-[var(--border-color)] hover:border-[var(--text-primary)]/40'
                )}
              >
                {allSelected && <Check className="w-2.5 h-2.5 text-[var(--bg-primary)] stroke-[4px]" />}
                {someSelected && !allSelected && <div className="h-0.5 w-2 rounded-full bg-[var(--bg-primary)]" />}
              </button>
            </th>
            <th
              className="group cursor-pointer border-b border-[var(--border-color)] px-5 py-3 transition-colors hover:text-[var(--text-primary)]"
              onClick={() => onSort('title')}
            >
              <div className="flex items-center gap-1">
                Título
                <SortIcon field="title" />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {contents.map((content) => {
            const isSelected = selectedIds.has(content.id);
            const series = content.seriesId ? state.series.find(s => s.id === content.seriesId) : null;
            const pillar = content.pilarId ? state.pilares.find(p => p.id === content.pilarId) : null;
            const hasLookAlert = Boolean(lookAlerts[content.id]);

            return (
              <tr
                key={content.id}
                onClick={() => onSelect(content)}
                className={cn(
                  'group cursor-pointer transition-colors duration-150',
                  isSelected
                    ? 'bg-[color-mix(in_srgb,var(--accent-blue),transparent_94%)]'
                    : 'hover:bg-[color-mix(in_srgb,var(--surface-subtle),transparent_10%)]'
                )}
              >
                <td
                  className="border-b border-[var(--border-color)]/50 py-3.5 pl-5 pr-2 text-center align-top"
                  onClick={e => {
                    if (!enableSelection) return;
                    e.stopPropagation();
                    onToggleSelect(content.id);
                  }}
                >
                  <div
                    className={cn(
                      'mx-auto mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-all',
                      !enableSelection
                        ? 'border-transparent opacity-0'
                        : isSelected
                        ? 'border-[var(--text-primary)] bg-[var(--text-primary)]'
                        : 'border-[var(--border-color)] group-hover:border-[var(--text-primary)]/30'
                    )}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 text-[var(--bg-primary)] stroke-[4px]" />}
                  </div>
                </td>

                <td className="border-b border-[var(--border-color)]/50 px-5 py-3.5">
                  <div className="flex min-w-0 items-start gap-2">
                    {hasLookAlert ? (
                      <span className="mt-1.5 inline-flex shrink-0 text-orange-500" title="Look precisa ser refeito">
                        <Zap className="h-3 w-3 fill-current" />
                      </span>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold leading-snug text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent-blue)]">
                        {content.title}
                      </p>
                      <p className="mt-1 truncate text-[12px] leading-relaxed text-[var(--text-tertiary)]">
                        {buildMetadataLine(content, series?.name, pillar?.nome)}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
