import { useState, type DragEvent } from 'react';
import type { Content, Pilar, Serie } from '../../../lib/database';
import type { ContaRef } from '../../contas/lib/contas';
import { Badge } from '../../../components/ui/Badge';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';
import { filterContentsByCreationTab, type CreationTab } from '../../contents/lib/creationContent';
import { CreationCardContent } from './CreationCardContent';
import { creationEntityHint } from './CreationEntityMarks';
import {
  buildCreationItemMenuItems,
  type CreationItemActionHandlers,
} from '../lib/creationItemActions';
import {
  CREATION_KANBAN_TABS,
  getCreationCardTags,
  getCreationNoteExcerpt,
  getCreationTitle,
  isCreationKanbanTab,
  isIdeaContent,
  type CreationKanbanTab,
} from '../lib/creationItemPresentation';
const DRAG_MIME = 'application/x-creation-id';

export interface CreationKanbanItemModel {
  content: Content;
  pillar?: Pilar | null;
  series?: Serie | null;
  selectable?: boolean;
  selected?: boolean;
  etiquetas?: readonly string[];
}

interface CreationKanbanViewProps {
  contents: Content[];
  platforms?: readonly ContaRef[];
  activeTab: CreationTab;
  resolveItem: (content: Content) => CreationKanbanItemModel;
  selectionMode: boolean;
  onOpen: (content: Content) => void;
  onToggleSelect?: (content: Content) => void;
  actions: CreationItemActionHandlers;
  onMoveToTab: (content: Content, tab: CreationKanbanTab) => Promise<void> | void;
  persistingIds?: Set<string>;
}

function CreationKanbanCard({
  content,
  pillar,
  series,
  platforms,
  etiquetas,
  selectionMode,
  selectable = false,
  selected = false,
  isDragging,
  isPersisting,
  draggable,
  onOpen,
  onToggleSelect,
  onDragStart,
  onDragEnd,
  actions,
}: CreationKanbanItemModel & {
  platforms?: readonly ContaRef[];
  selectionMode: boolean;
  isDragging: boolean;
  isPersisting: boolean;
  draggable: boolean;
  onOpen: () => void;
  onToggleSelect?: () => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  actions: CreationItemActionHandlers;
}) {
  const title = getCreationTitle(content);
  const isTrash = Boolean(content.deletedAt);
  const isIdea = !isTrash && isIdeaContent(content);
  const tags = etiquetas ?? getCreationCardTags(content);
  const excerpt = getCreationNoteExcerpt(content);
  const canOpen = !isTrash && !selectionMode;
  const canActivate = selectionMode ? selectable : canOpen;
  const entityHint = creationEntityHint(pillar, series, content.pilarId, content.seriesId);
  const topAccentColor = !isIdea && !isTrash ? (series?.cor || pillar?.cor || undefined) : undefined;
  const menuItems = buildCreationItemMenuItems(content, actions, {
    includeMoveActions: draggable,
  });

  const handleActivate = () => {
    if (selectionMode) {
      if (selectable) onToggleSelect?.();
      return;
    }
    if (canOpen) onOpen();
  };

  return (
    <article
      style={topAccentColor ? { borderTopColor: topAccentColor } : undefined}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={handleActivate}
      onKeyDown={event => {
        if (!canActivate) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleActivate();
        }
      }}
      role={canActivate ? 'button' : undefined}
      tabIndex={canActivate ? 0 : undefined}
      aria-label={[
        isTrash
          ? `${title}, bloqueado na lixeira`
          : selectionMode
            ? (selectable ? `${selected ? 'Desmarcar' : 'Selecionar'} ${title}` : `${title} não pode ser selecionado`)
            : (canOpen ? `Abrir ${title}` : title),
        entityHint,
        tags.length > 0 ? `Tags: ${tags.join(', ')}` : null,
      ].filter(Boolean).join(', ')}
      className={cn(
        'creation-hub-card group relative flex flex-col rounded-[var(--radius-card)] border shadow-none',
        isIdea && 'creation-hub-card--idea',
        isTrash && 'creation-hub-card--trash select-none cursor-not-allowed',
        selected && 'creation-hub-card--selected',
        selectionMode && !selectable && !isTrash && 'opacity-55',
        'transition-[border-color,box-shadow,opacity,transform] duration-200',
        !isTrash && 'hover:shadow-[var(--shadow-card-hover)]',
        'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
        !isTrash && 'focus-within:shadow-[var(--shadow-card-hover)]',
        canActivate && 'cursor-pointer',
        isDragging && 'opacity-60',
      )}
    >
      <CreationCardContent
        content={content}
        title={title}
        excerpt={excerpt}
        tags={tags}
        pillar={pillar}
        series={series}
        platforms={platforms}
        menuItems={menuItems}
        selectionMode={selectionMode}
        selectable={selectable}
        selected={selected}
        isPersisting={isPersisting}
        stopInteractivePropagation
        onToggleSelect={onToggleSelect}
      />
    </article>
  );
}

export function CreationKanbanView({
  contents,
  platforms,
  activeTab,
  resolveItem,
  selectionMode,
  onOpen,
  onToggleSelect,
  actions,
  onMoveToTab,
  persistingIds,
}: CreationKanbanViewProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<CreationTab | null>(null);

  // As colunas já são as etapas: uma aba de etapa só destaca a coluna, não some com as outras.
  const showAllStages = activeTab === 'Todos' || isCreationKanbanTab(activeTab);
  const columns: CreationTab[] = showAllStages
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
              'md:w-auto md:min-w-[260px] md:flex-1 md:basis-0',
              'transition-[border-color,background-color] duration-150',
              showAllStages && activeTab === tab && 'border-[var(--border-strong)] bg-[var(--bg-hover)]/40',
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
                    && !selectionMode;

                  return (
                    <CreationKanbanCard
                      key={content.id}
                      {...item}
                      platforms={platforms}
                      selectionMode={selectionMode}
                      isDragging={draggingId === content.id}
                      isPersisting={Boolean(persistingIds?.has(content.id))}
                      draggable={canDrag}
                      onOpen={() => onOpen(content)}
                      onToggleSelect={onToggleSelect ? () => onToggleSelect(content) : undefined}
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
