import { Check, Eye, Sparkles, Zap } from 'lucide-react';
import { Content } from '../../../../lib/database';
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

interface ContentGridProps {
  contents: Content[];
  lookAlerts: Record<string, string>;
  onSelect: (content: Content) => void;
  onPreview: (content: Content) => void;
  onToggleSelect: (id: string) => void;
  selectedIds: Set<string>;
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
  mode = 'pipeline',
  isCompact = true,
  filterStatus = 'Todos',
  onSelectAll,
  allPageSelected = false,
  somePageSelected = false,
}: ContentGridProps) {
  const { state } = useAppContext();
  const enableSelection = mode !== 'publicados';

  if (contents.length === 0) {
    const emptyMessage =
      filterStatus === 'Todos'
        ? 'Nenhum conteúdo no pipeline. Crie o primeiro.'
        : `Nenhum conteúdo em "${filterStatus}".`;

    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-color)] py-16 text-center">
        <p className="text-sm font-medium text-[var(--text-tertiary)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {enableSelection && onSelectAll ? (
        <div className="flex items-center gap-2 px-0.5">
          <button
            type="button"
            onClick={onSelectAll}
            className={cn(
              'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-input)] border transition-colors',
              allPageSelected
                ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                : somePageSelected
                  ? 'border-[var(--text-primary)]/60 bg-[var(--text-primary)]/15'
                  : 'border-[var(--border-color)] hover:border-[var(--border-strong)]'
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
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {contents.map(content => {
          const { pillar, series: seriesEntity } = resolveContentEntities(content, state.pilares, state.series);
          const isSelected = selectedIds.has(content.id);
          const excerpt = !isCompact ? getUsefulExcerpt(content) : null;
          const showStatusOnCard = filterStatus === 'Todos' || mode === 'publicados';
          const isDraft = isDraftTitle(content.title);
          const isNew = isRecentlyCreated(content);

          return (
            <article
              key={content.id}
              className={cn(
                'ds-card group relative flex flex-col bg-[var(--bg-primary)] text-left transition-colors hover:border-[var(--border-strong)]',
                isCompact ? 'p-3' : 'p-3.5',
                isSelected && 'border-[var(--text-primary)] ring-1 ring-[var(--text-primary)]/15'
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  {mode === 'publicados' ? (
                    <span className="inline-flex rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-xs font-medium text-[var(--text-tertiary)]">
                      {content.publishDate
                        ? new Date(content.publishDate).toLocaleDateString('pt-BR')
                        : 'Sem data'}
                    </span>
                  ) : showStatusOnCard ? (
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        getStatusChipClass(content.status)
                      )}
                    >
                      {content.status}
                    </span>
                  ) : null}
                  {isNew ? (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--accent-blue)]/10 px-1.5 py-0.5 text-xs font-medium text-[var(--accent-blue)]">
                      <Sparkles className="h-2.5 w-2.5" />
                      Novo
                    </span>
                  ) : null}
                  {isDraft ? (
                    <span className="inline-flex rounded-full bg-[var(--bg-hover)] px-1.5 py-0.5 text-xs font-medium text-[var(--text-tertiary)]">
                      Rascunho
                    </span>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {enableSelection ? (
                    <button
                      type="button"
                      onClick={() => onToggleSelect(content.id)}
                      className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-input)] border transition-colors',
                        isSelected
                          ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                          : 'border-[var(--border-color)] text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 hover:bg-[var(--bg-hover)]'
                      )}
                      aria-label={isSelected ? `Desmarcar ${content.title}` : `Selecionar ${content.title}`}
                    >
                      {isSelected ? <Check className="h-3.5 w-3.5 stroke-[3px]" /> : null}
                    </button>
                  ) : null}

                  {mode !== 'publicados' ? (
                    <button
                      type="button"
                      onClick={event => {
                        event.stopPropagation();
                        onPreview(content);
                      }}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-input)] border border-[var(--border-color)] text-[var(--text-secondary)] opacity-0 transition-all group-hover:opacity-100 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                      aria-label={`Pré-visualizar ${content.title}`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelect(content)}
                className="flex min-h-0 flex-1 flex-col text-left"
              >
                <h3
                  className={cn(
                    'line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)]',
                    isDraft && 'italic text-[var(--text-secondary)]'
                  )}
                >
                  {getDisplayTitle(content.title)}
                </h3>

                {mode !== 'publicados' ? (
                  <ContentEntityTags
                    pillar={pillar}
                    series={seriesEntity}
                    pillarId={content.pilarId}
                    seriesId={content.seriesId}
                    className="mt-2"
                    size="sm"
                  />
                ) : null}

                {excerpt ? (
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                    {excerpt}
                  </p>
                ) : (
                  <p className="mt-2 line-clamp-1 text-xs text-[var(--text-tertiary)]">
                    {buildContentMetaLine(content)}
                  </p>
                )}

                {lookAlerts[content.id] ? (
                  <div className="mt-2 flex items-center gap-1 text-xs font-medium text-[var(--accent-orange)]">
                    <Zap className="h-3 w-3" />
                    <span className="line-clamp-1">{lookAlerts[content.id]}</span>
                  </div>
                ) : null}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
