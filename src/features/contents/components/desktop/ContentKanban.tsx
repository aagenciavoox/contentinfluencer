import { Text } from '../../../../components/ui/Text';
import { Eye } from 'lucide-react';
import { Content } from '../../../../lib/database';
import { useAppContext } from '../../../../context/AppContext';
import { cn } from '../../../../lib/utils';
import { ContentEntityTags } from '../ContentEntityTags';
import { EDITORIAL_CONTENT_STATUSES } from '../../lib/contentWorkflow';
import {
  buildContentMetaLine,
  formatLastEdit,
  getDisplayTitle,
  getStatusChipClass,
  isDraftTitle,
  resolveContentEntities,
} from '../../lib/contentCardMeta';

interface ContentKanbanProps {
  contents: Content[];
  lookAlerts: Record<string, string>;
  filterStatus: string;
  onSelect: (content: Content) => void;
  onPreview: (content: Content) => void;
}

const KANBAN_STATUSES = [...EDITORIAL_CONTENT_STATUSES];

export function ContentKanban({
  contents,
  lookAlerts,
  filterStatus,
  onSelect,
  onPreview,
}: ContentKanbanProps) {
  const { state } = useAppContext();

  const columns =
    filterStatus === 'Todos'
      ? KANBAN_STATUSES
      : KANBAN_STATUSES.filter(status => status === filterStatus);

  if (contents.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-color)] py-16 text-center">
        <Text variant="secondary" as="p" className="text-[var(--text-tertiary)]">
          {filterStatus === 'Todos'
            ? 'Nenhum roteiro nesta visão.'
            : `Nenhum roteiro em "${filterStatus}".`}
        </Text>
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {columns.map(status => {
        const columnItems = contents.filter(content => content.status === status);

        return (
          <section
            key={status}
            className="flex w-[min(280px,80vw)] shrink-0 flex-col rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-hover)]/20"
          >
            <header className="flex items-center justify-between gap-2 border-b border-[var(--border-color)] px-3 py-2.5">
              <Text variant="label" as="span"
                className={cn(
                  'rounded-full px-2 py-0.5 ',
                  getStatusChipClass(status)
                )}
              >
                {status}
              </Text>
              <Text variant="label" as="span" className="text-[var(--text-tertiary)]">{columnItems.length}</Text>
            </header>

            <div className="flex max-h-[min(70vh,640px)] flex-col gap-2 overflow-y-auto p-2">
              {columnItems.length === 0 ? (
                <Text variant="meta" as="p" className="px-1 py-6 text-center text-[var(--text-tertiary)]">Nenhum roteiro</Text>
              ) : (
                columnItems.map(content => {
                  const { pillar, series: seriesEntity } = resolveContentEntities(
                    content,
                    state.pilares,
                    state.series
                  );
                  const isDraft = isDraftTitle(content.title);

                  return (
                    <div
                      key={content.id}
                      className="ds-card ds-card-interactive group relative bg-[var(--bg-elevated)] p-2.5"
                    >
                      <div className="mb-1.5 flex items-start justify-between gap-1">
                        <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">
                          {formatLastEdit(content.updatedAt)}
                        </Text>
                        <button
                          type="button"
                          onClick={event => {
                            event.stopPropagation();
                            onPreview(content);
                          }}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-[var(--radius-input)] text-[var(--text-tertiary)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                          aria-label={`Pré-visualizar ${content.title}`}
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelect(content)}
                        className="w-full text-left"
                      >
                        <Text variant="label" as="p"
                          className={cn(
                            'line-clamp-2 leading-snug text-[var(--text-primary)]',
                            isDraft && 'italic text-[var(--text-secondary)]'
                          )}
                        >
                          {getDisplayTitle(content.title)}
                        </Text>

                        <ContentEntityTags
                          pillar={pillar}
                          series={seriesEntity}
                          pillarId={content.pilarId}
                          seriesId={content.seriesId}
                          className="mt-1.5"
                          size="sm"
                        />

                        {!pillar && !seriesEntity && !content.pilarId && !content.seriesId ? (
                          <Text variant="meta" as="p" className="mt-1 line-clamp-1 text-[var(--text-tertiary)]">
                            {buildContentMetaLine(content)}
                          </Text>
                        ) : null}

                        {lookAlerts[content.id] ? (
                          <Text variant="label" as="p" className="mt-1 line-clamp-1 text-[var(--accent-orange)]">
                            Revisar look
                          </Text>
                        ) : null}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
