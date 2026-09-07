import { useState, type DragEvent } from 'react';
import type { Content, Pilar, Serie } from '../../../lib/database';
import { Badge } from '../../../components/ui/Badge';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';
import { filterContentsByCreationTab, type CreationTab } from '../../contents/lib/creationContent';
import { CreationCategoryLabel } from './CreationCategoryLabel';
import { CreationItemMenu } from './CreationItemMenu';
import {
  buildCreationItemMenuItems,
  type CreationItemActionHandlers,
} from '../lib/creationItemActions';
import {
  CREATION_KANBAN_TABS,
  getCreationFormatLabel,
  getCreationTitle,
  isCreationKanbanTab,
  preferredCreationEntity,
  type CreationKanbanTab,
} from '../lib/creationItemPresentation';

const DRAG_MIME = 'application/x-creation-id';

export interface CreationKanbanItemModel {
  content: Content;
  pillar?: Pilar | null;
  series?: Serie | null;
}

interface CreationKanbanViewProps {
  contents: Content[];
  activeTab: CreationTab;
  resolveItem: (content: Content) => CreationKanbanItemModel;
  selectionMode: boolean;
  onOpen: (content: Content) => void;
  actions: CreationItemActionHandlers;
  onMoveToTab: (content: Content, tab: CreationKanbanTab) => Promise<void> | void;
  persistingIds?: Set<string>;
}

function CreationKanbanCard({
  content,
  pillar,
  series,
  selectionMode,
  isDragging,
  isPersisting,
  draggable,
  onOpen,
  onDragStart,
  onDragEnd,
  actions,
}: CreationKanbanItemModel & {
  selectionMode: boolean;
  isDragging: boolean;
  isPersisting: boolean;
  draggable: boolean;
  onOpen: () => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  actions: CreationItemActionHandlers;
}) {
  const title = getCreationTitle(content);
  const entity = preferredCreationEntity(content, pillar, series);
  const format = getCreationFormatLabel(content);
  const canOpen = !content.deletedAt && !selectionMode;
  const menuItems = buildCreationItemMenuItems(content, actions, {
    includeMoveActions: draggable,
  });

  return (
    <article
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => {
        if (canOpen) onOpen();
      }}
      onKeyDown={event => {
        if (!canOpen) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      role={canOpen ? 'button' : undefined}
      tabIndex={canOpen ? 0 : undefined}
      aria-label={canOpen ? `Abrir ${title}` : title}
      className={cn(
        'group relative rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-3 shadow-none',
        'transition-[border-color,box-shadow,opacity] duration-150',
        'hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-soft)]',
        'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
        'focus-within:border-[var(--border-strong)] focus-within:shadow-[var(--shadow-soft)]',
        canOpen && 'cursor-pointer',
        isDragging && 'opacity-60',
        isPersisting && 'opacity-70',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 stack-xs">
          <Text variant="itemTitle" className="line-clamp-2 text-sm font-semibold leading-snug">
            {title}
          </Text>
          {entity ? (
            <CreationCategoryLabel label={entity.label} color={entity.color} />
          ) : null}
          {format ? (
            <Text variant="meta" as="p" className="truncate leading-none">
              {format}
            </Text>
          ) : null}
          {isPersisting ? (
            <Text variant="meta" as="p" className="leading-none">
              Salvando…
            </Text>
          ) : null}
        </div>
        <span
          className="pointer-events-auto shrink-0"
          onClick={event => event.stopPropagation()}
          onKeyDown={event => event.stopPropagation()}
        >
          <CreationItemMenu items={menuItems} label={`Ações de ${title}`} />
        </span>
      </div>
    </article>
  );
}

export function CreationKanbanView({
  contents,
  activeTab,
  resolveItem,
  selectionMode,
  onOpen,
  actions,
  onMoveToTab,
  persistingIds,
}: CreationKanbanViewProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<CreationTab | null>(null);

  const columns: CreationTab[] = activeTab === 'Todos'
    ? [...CREATION_KANBAN_TABS]
    : [activeTab];

  const canDropOn = (tab: CreationTab): tab is CreationKanbanTab =>
    isCreationKanbanTab(tab);

  return (
    <div className="flex h-[min(70vh,720px)] gap-3 overflow-x-auto pb-1">
      {columns.map(tab => {
        const columnItems = filterContentsByCreationTab(contents, tab);
        const isActiveDrop = dropTarget === tab && canDropOn(tab);

        return (
          <section
            key={tab}
            className={cn(
              'flex h-full w-[min(300px,86vw)] shrink-0 flex-col rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-hover)]/20',
              'transition-[border-color,background-color] duration-150',
              isActiveDrop && 'border-[var(--border-strong)] bg-[var(--bg-hover)]/45',
            )}
            onDragOver={event => {
              if (!canDropOn(tab)) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              if (dropTarget !== tab) setDropTarget(tab);
            }}
            onDragLeave={event => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setDropTarget(current => (current === tab ? null : current));
              }
            }}
            onDrop={event => {
              if (!canDropOn(tab)) return;
              event.preventDefault();
              const id = event.dataTransfer.getData(DRAG_MIME)
                || event.dataTransfer.getData('text/plain');
              setDropTarget(null);
              setDraggingId(null);
              const content = contents.find(item => item.id === id);
              if (content) void onMoveToTab(content, tab);
            }}
          >
            <div className="flex items-center justify-between px-3 py-3">
              <Text variant="label">{tab}</Text>
              <Badge>{columnItems.length}</Badge>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
              {columnItems.length > 0 ? (
                columnItems.map(content => {
                  const item = resolveItem(content);
                  const canDrag = canDropOn(tab)
                    && !content.deletedAt
                    && !content.archivedAt
                    && !selectionMode
                    && !persistingIds?.has(content.id);

                  return (
                    <CreationKanbanCard
                      key={content.id}
                      {...item}
                      selectionMode={selectionMode}
                      isDragging={draggingId === content.id}
                      isPersisting={Boolean(persistingIds?.has(content.id))}
                      draggable={canDrag}
                      onOpen={() => onOpen(content)}
                      onDragStart={event => {
                        if (!canDrag) {
                          event.preventDefault();
                          return;
                        }
                        event.dataTransfer.setData(DRAG_MIME, content.id);
                        event.dataTransfer.setData('text/plain', content.id);
                        event.dataTransfer.effectAllowed = 'move';
                        setDraggingId(content.id);
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDropTarget(null);
                      }}
                      actions={actions}
                    />
                  );
                })
              ) : (
                <Text variant="meta" className="px-2 py-8 text-center">
                  Nenhum item nesta etapa.
                </Text>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
