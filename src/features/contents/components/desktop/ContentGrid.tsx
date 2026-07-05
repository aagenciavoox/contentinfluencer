import {Check} from 'lucide-react';
import { Content } from '../../../../lib/database';
import { EMPTY } from '../../../../lib/uiCopy';
import { useAppContext } from '../../../../context/AppContext';
import { cn } from '../../../../lib/utils';
import { ContentEntityTags } from '../ContentEntityTags';
import {
  buildContentMetaLine,
  getDisplayTitle,
  getStatusChipClass,
  getUsefulExcerpt,
  isDraftTitle,
  isRecentlyCreated,
  resolveContentEntities,
} from '../../lib/contentCardMeta';
import { PipelineContentCard } from './PipelineContentCard';

interface ContentGridProps {
  contents: Content[];
  lookAlerts: Record<string, string>;
  onSelect: (content: Content) => void;
  onPreview: (content: Content) => void;
  onToggleSelect: (id: string) => void;
  selectedIds: Set<string>;
  selectionMode?: boolean;
  onSelectionModeChange?: (active: boolean) => void;
  mode?: 'pipeline' | 'publicados';
  isCompact?: boolean;
  filterStatus?: string;
  onSelectAll?: () => void;
  allPageSelected?: boolean;
  somePageSelected?: boolean;
}

export function ContentGrid({
  contents,
  lookAlerts,
  onSelect,
  onPreview,
  onToggleSelect,
  selectedIds,
  selectionMode = false,
  onSelectionModeChange,
  mode = 'pipeline',
  isCompact = true,
  filterStatus = 'Todos',
  onSelectAll,
  allPageSelected = false,
  somePageSelected = false,
}: ContentGridProps) {
  const { state } = useAppContext();
  const enableSelection = mode !== 'publicados';
  const selectionActive = enableSelection && selectionMode;
  const isPipeline = mode === 'pipeline';

  const selectionToolbar = enableSelection && onSelectionModeChange ? (
    <div className="flex flex-wrap items-center gap-2 px-0.5">
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
      {selectionActive && onSelectAll ? (
        <>
          <button
            type="button"
            onClick={onSelectAll}
            className={cn(
              'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-input)] border transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
              allPageSelected
                ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                : somePageSelected
                  ? 'border-[var(--text-primary)]/60 bg-[var(--text-primary)]/15'
                  : 'border-[var(--border-color)] hover:border-[var(--border-strong)]',
            )}
            aria-label="Selecionar todos desta página"
          >
            {allPageSelected ? <Check className="h-3.5 w-3.5 stroke-[3px]" /> : null}
            {somePageSelected && !allPageSelected ? (
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

  if (contents.length === 0) {
    const emptyMessage =
      filterStatus === 'Todos'
        ? EMPTY.roteiros.description
        : `Nenhum roteiro em "${filterStatus}". Ajuste os filtros para ver outros itens.`;

    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-color)] py-16 text-center">
        <p className="text-sm font-medium text-[var(--text-tertiary)]">{emptyMessage}</p>
      </div>
    );
  }

  if (isPipeline) {
    return (
      <div className="stack-md">
        {selectionToolbar}

        <div className="grid-content">
          {contents.map(content => {
            const { pillar, series } = resolveContentEntities(content, state.pilares, state.series);
            return (
              <PipelineContentCard
                key={content.id}
                content={content}
                pillar={pillar}
                series={series}
                platforms={state.platforms}
                isSelected={selectedIds.has(content.id)}
                selectionMode={selectionActive}
                onSelect={() => onSelect(content)}
                onPreview={() => onPreview(content)}
                onToggleSelect={() => onToggleSelect(content.id)}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="stack-md">
      {selectionToolbar}

      <div className="grid-content">
        {contents.map(content => {
          const { pillar, series: seriesEntity } = resolveContentEntities(content, state.pilares, state.series);
          const isSelected = selectedIds.has(content.id);
          const excerpt = !isCompact ? getUsefulExcerpt(content) : null;
          const showStatusOnCard = filterStatus === 'Todos' || mode === 'publicados';
          const isDraft = isDraftTitle(content.title);
          const isNew = isRecentlyCreated(content);

          const metaLine = buildContentMetaLine(content, {
            pillarName: pillar?.nome,
            seriesName: seriesEntity?.name,
          });

          return (
            <article
              key={content.id}
              className={cn(
                'ds-card group relative flex flex-col overflow-hidden bg-[var(--bg-primary)] p-3 text-left transition-colors hover:border-[var(--border-strong)]',
                isSelected && 'border-[var(--text-primary)] bg-[var(--text-primary)]/5 ring-1 ring-[var(--text-primary)]/20',
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="inline-flex rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-xs font-medium text-[var(--text-tertiary)]">
                    {content.publishDate
                      ? new Date(content.publishDate).toLocaleDateString('pt-BR')
                      : 'Sem data'}
                  </span>
                  {showStatusOnCard ? (
                    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', getStatusChipClass(content.status))}>
                      {content.status}
                    </span>
                  ) : null}
                  {isNew ? (
                    <span className="inline-flex rounded-full bg-[var(--accent-blue)]/10 px-1.5 py-0.5 text-xs font-medium text-[var(--accent-blue)]">
                      Novo
                    </span>
                  ) : null}
                </div>
              </div>

              <button type="button" onClick={() => onSelect(content)} className="flex min-h-0 flex-1 flex-col text-left">
                <p className={cn('break-words text-sm font-semibold leading-snug text-[var(--text-primary)]', isDraft && 'italic text-[var(--text-secondary)]')}>
                  {getDisplayTitle(content.title)}
                </p>
                <ContentEntityTags pillar={pillar} series={seriesEntity} pillarId={content.pilarId} seriesId={content.seriesId} className="mt-2" size="sm" />
                {excerpt ? <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">{excerpt}</p> : null}
                <p className="mt-auto pt-2 text-2xs text-[var(--text-tertiary)]">{metaLine}</p>
              </button>

              {lookAlerts[content.id] ? (
                <div className="mt-2 text-xs font-medium text-[var(--accent-orange)]">{lookAlerts[content.id]}</div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
