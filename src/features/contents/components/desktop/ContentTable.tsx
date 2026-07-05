import React from 'react';
import {Text} from '../../../../components/ui/Text';
import { Content } from '../../../../lib/database';
import { useAppContext } from '../../../../context/AppContext';
import { Zap, ArrowUp, ArrowDown, ArrowUpDown, Check } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { useIsMobile } from '../../../../hooks/useIsMobile';
import { buildContentMetaLine } from '../../lib/contentCardMeta';
import { ContentEntityTags } from '../ContentEntityTags';

interface ContentTableProps {
  mode?: 'pipeline' | 'publicados';
  contents: Content[];
  onSelect: (content: Content) => void;
  onPreview: (content: Content) => void;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: any) => void;
  lookAlerts: Record<string, string>;
  selectedIds: Set<string>;
  selectionMode?: boolean;
  onSelectionModeChange?: (active: boolean) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
}

export function ContentTable({
  mode = 'pipeline',
  contents,
  onSelect,
  onPreview,
  sortField,
  sortDirection,
  onSort,
  lookAlerts,
  selectedIds,
  selectionMode = false,
  onSelectionModeChange,
  onToggleSelect,
  onSelectAll,
}: ContentTableProps) {
  const { state } = useAppContext();
  const isMobile = useIsMobile();

  const enableSelection = mode !== 'publicados';
  const selectionActive = enableSelection && selectionMode;
  const allSelected = selectionActive && contents.length > 0 && contents.every(c => selectedIds.has(c.id));
  const someSelected = selectionActive && contents.some(c => selectedIds.has(c.id));

  const selectionToolbar = enableSelection && onSelectionModeChange && !isMobile ? (
    <div className="mb-3 flex flex-wrap items-center gap-2 px-0.5">
      <button
        type="button"
        onClick={() => onSelectionModeChange(!selectionMode)}
        className={cn(
          'inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-input)] border px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
          selectionMode
            ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
            : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]',
        )}
      >
        Modo seleção
      </button>
      {selectionActive ? (
        <>
          <button
            type="button"
            onClick={onSelectAll}
            className={cn(
              'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-input)] border transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
              allSelected
                ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                : someSelected
                  ? 'border-[var(--text-primary)]/60 bg-[var(--text-primary)]/15'
                  : 'border-[var(--border-color)] hover:border-[var(--border-strong)]',
            )}
            aria-label="Selecionar todos desta página"
          >
            {allSelected ? <Check className="h-3.5 w-3.5 stroke-[3px]" /> : null}
            {someSelected && !allSelected ? (
              <span className="h-0.5 w-2.5 rounded-full bg-[var(--text-primary)]" />
            ) : null}
          </button>
          <span className="text-xs text-[var(--text-tertiary)]">
            Selecionar todos desta página ({contents.length})
          </span>
        </>
      ) : null}
    </div>
  ) : null;

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-20" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-[var(--accent-blue)]" />
      : <ArrowDown className="w-3 h-3 ml-1 text-[var(--accent-blue)]" />;
  };

  if (isMobile) {
    return (
      <div className="stack-md">
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
                'relative cursor-pointer rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border bg-[var(--bg-secondary)] px-4 py-4 shadow-sm transition-all active:scale-[0.98]',
                isSelected ? 'border-[var(--text-primary)] ring-2 ring-[var(--text-primary)]/5' : 'border-[var(--border-color)]'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Text variant="itemTitle" className="line-clamp-2 leading-tight">
                    {content.title}
                  </Text>
                  <ContentEntityTags pillar={pillar} series={series} className="mt-2" size="sm" />
                  <p className="mt-1.5 line-clamp-1 text-xs leading-relaxed text-[var(--text-tertiary)]">
                    {buildContentMetaLine(content)}
                  </p>
                </div>

                {selectionActive ? (
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
                <div className="absolute -right-1 -top-1.5 z-10 flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--accent-orange)] px-2 py-0.5 text-[var(--bg-secondary)] shadow-[var(--shadow-soft)]">
                  <Zap className="h-2 w-2 fill-current animate-pulse" />
                  <span className="text-2xs font-semibold uppercase">Refazer</span>
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
    <>
      {selectionToolbar}
      <div className="editorial-surface w-full overflow-hidden rounded-lg transition-all duration-300">
      <table className="w-full border-separate border-spacing-0 text-left">
        <thead>
          <tr className="text-xs font-medium tracking-normal text-[var(--text-tertiary)]">
            {selectionActive ? (
            <th className="w-12 border-b border-[var(--border-color)] py-3 pl-6 pr-2 text-center">
              <button
                type="button"
                onClick={onSelectAll}
                className={cn(
                  'mx-auto flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-all',
                  allSelected
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
            ) : null}
            <th
              className="group cursor-pointer border-b border-[var(--border-color)] px-6 py-3 transition-colors hover:text-[var(--text-primary)]"
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
                onClick={() => {
                  if (selectionActive) {
                    onToggleSelect(content.id);
                    return;
                  }
                  onSelect(content);
                }}
                className={cn(
                  'group cursor-pointer transition-colors duration-150',
                  isSelected && selectionActive
                    ? 'bg-[color-mix(in_srgb,var(--accent-blue),transparent_94%)]'
                    : 'hover:bg-[color-mix(in_srgb,var(--surface-subtle),transparent_10%)]'
                )}
              >
                {selectionActive ? (
                <td
                  className="border-b border-[var(--border-color)]/50 py-3.5 pl-6 pr-2 text-center align-top"
                  onClick={e => {
                    e.stopPropagation();
                    onToggleSelect(content.id);
                  }}
                >
                  <div
                    className={cn(
                      'mx-auto mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-all',
                      isSelected
                        ? 'border-[var(--text-primary)] bg-[var(--text-primary)]'
                        : 'border-[var(--border-color)] group-hover:border-[var(--text-primary)]/30'
                    )}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 text-[var(--bg-primary)] stroke-[4px]" />}
                  </div>
                </td>
                ) : null}

                <td className="border-b border-[var(--border-color)]/50 px-6 py-3.5">
                  <div className="flex min-w-0 items-start gap-2">
                    {hasLookAlert ? (
                      <span className="mt-1.5 inline-flex shrink-0 text-[var(--accent-orange)]" title="Look marcado para revisar">
                        <Zap className="h-3 w-3 fill-current" />
                      </span>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="truncate t-body font-semibold leading-snug text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent-blue)]">
                        {content.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="truncate text-xs leading-relaxed text-[var(--text-tertiary)]">
                          {buildContentMetaLine(content)}
                        </p>
                        <ContentEntityTags pillar={pillar} series={series} size="sm" />
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </>
  );
}
