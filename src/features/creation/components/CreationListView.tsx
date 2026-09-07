import type { Content, Pilar, Serie } from '../../../lib/database';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';
import type { CreationSort } from '../../contents/lib/creationContent';
import { CreationCategoryLabel } from './CreationCategoryLabel';
import { CreationItemMenu } from './CreationItemMenu';
import { CreationSelectCheckbox } from './CreationSelectCheckbox';
import { CreationStageChip } from './CreationStageChip';
import {
  buildCreationItemMenuItems,
  type CreationItemActionHandlers,
} from '../lib/creationItemActions';
import {
  getCreationFormatLabel,
  getCreationStageLabel,
  getCreationStageTone,
  getCreationTitle,
  preferredCreationEntity,
} from '../lib/creationItemPresentation';

export interface CreationListItemModel {
  content: Content;
  pillar?: Pilar | null;
  series?: Serie | null;
  selectable: boolean;
  selected: boolean;
}

interface CreationListViewProps {
  items: CreationListItemModel[];
  showStatus: boolean;
  selectionMode: boolean;
  sort: CreationSort;
  onSortChange: (sort: CreationSort) => void;
  onOpen: (content: Content) => void;
  onToggleSelect: (content: Content) => void;
  actions: CreationItemActionHandlers;
}

function CreationListRow({
  content,
  pillar,
  series,
  showStatus,
  selectionMode,
  selectable,
  selected,
  onOpen,
  onToggleSelect,
  actions,
}: CreationListItemModel & {
  showStatus: boolean;
  selectionMode: boolean;
  onOpen: () => void;
  onToggleSelect: () => void;
  actions: CreationItemActionHandlers;
}) {
  const title = getCreationTitle(content);
  const stageLabel = getCreationStageLabel(content);
  const stageTone = getCreationStageTone(content);
  const entity = preferredCreationEntity(content, pillar, series);
  const format = getCreationFormatLabel(content);
  const canOpen = !content.deletedAt;
  const canActivate = selectionMode ? selectable : canOpen;
  const showSelect = selectable;
  const menuItems = buildCreationItemMenuItems(content, actions);

  const handleActivate = () => {
    if (selectionMode) {
      if (selectable) onToggleSelect();
      return;
    }
    if (canOpen) onOpen();
  };

  return (
    <article
      onClick={canActivate ? handleActivate : undefined}
      onKeyDown={event => {
        if (!canActivate) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleActivate();
        }
      }}
      role={canActivate ? 'button' : undefined}
      tabIndex={canActivate ? 0 : undefined}
      aria-label={
        selectionMode
          ? (selectable
            ? `${selected ? 'Desmarcar' : 'Selecionar'} ${title}`
            : `${title} não pode ser selecionado`)
          : (canOpen ? `Abrir ${title}` : title)
      }
      className={cn(
        'group relative grid grid-cols-1 gap-2 rounded-[var(--radius-input)] border border-transparent px-3 py-2.5 transition-[background-color,border-color] duration-150',
        'hover:bg-[var(--bg-hover)] focus-within:bg-[var(--bg-hover)]',
        'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
        'md:grid-cols-[28px_minmax(0,1.6fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_7.5rem_36px] md:items-center md:gap-3 md:py-0 md:min-h-[56px]',
        selected && 'border-[var(--border-strong)] bg-[var(--bg-hover)]',
        selectionMode && !selectable && 'opacity-55',
        canActivate ? 'cursor-pointer' : 'cursor-default',
      )}
    >
      <div className="relative z-[1] flex items-center gap-2 md:contents">
        <div
          className="relative z-[1] flex items-center"
          onClick={event => event.stopPropagation()}
        >
          {showSelect ? (
            <CreationSelectCheckbox
              selected={selected}
              onToggle={onToggleSelect}
              label={`${selected ? 'Desmarcar' : 'Selecionar'} ${title}`}
              forceVisible={selected || selectionMode}
            />
          ) : (
            <span className="hidden h-5 w-5 md:block" aria-hidden />
          )}
        </div>

        <Text variant="itemTitle" className="relative z-[1] min-w-0 truncate font-semibold leading-snug">
          {title}
        </Text>

        <div className="relative z-[1] min-w-0">
          {entity ? (
            <CreationCategoryLabel label={entity.label} color={entity.color} />
          ) : (
            <span className="hidden md:block" aria-hidden />
          )}
        </div>

        <div className="relative z-[1] min-w-0">
          {format ? (
            <Text variant="meta" as="span" className="truncate">
              {format}
            </Text>
          ) : (
            <span className="hidden md:block" aria-hidden />
          )}
        </div>

        <div className="relative z-[1] flex items-center gap-2 md:justify-start">
          {showStatus ? (
            <CreationStageChip label={stageLabel} toneStatus={stageTone} />
          ) : null}
          <span
            className="md:hidden"
            onClick={event => event.stopPropagation()}
          >
            <CreationItemMenu
              items={menuItems}
              label={`Ações de ${title}`}
              alwaysVisible
            />
          </span>
        </div>

        <div
          className="relative z-[1] hidden justify-end md:flex"
          onClick={event => event.stopPropagation()}
        >
          <CreationItemMenu items={menuItems} label={`Ações de ${title}`} />
        </div>
      </div>
    </article>
  );
}

export function CreationListView({
  items,
  showStatus,
  selectionMode,
  sort,
  onSortChange,
  onOpen,
  onToggleSelect,
  actions,
}: CreationListViewProps) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)]">
      <div
        className="sticky top-0 z-10 hidden border-b border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 md:grid md:grid-cols-[28px_minmax(0,1.6fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_7.5rem_36px] md:items-center md:gap-3 md:py-2"
        role="row"
      >
        <span className="sr-only">Seleção</span>
        <button
          type="button"
          className={cn(
            'text-left text-xs font-medium text-[var(--text-tertiary)] transition-colors duration-150 hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
            sort === 'title' && 'text-[var(--text-primary)]',
          )}
          onClick={() => onSortChange(sort === 'title' ? 'recent' : 'title')}
        >
          Título
        </button>
        <Text variant="label" as="span">Categoria</Text>
        <Text variant="label" as="span">Formato</Text>
        <Text variant="label" as="span">{showStatus ? 'Etapa' : ''}</Text>
        <span className="sr-only">Ações</span>
      </div>

      <div className="flex flex-col gap-0.5 p-1 md:p-0">
        {items.map(item => (
          <CreationListRow
            key={item.content.id}
            {...item}
            showStatus={showStatus}
            selectionMode={selectionMode}
            onOpen={() => onOpen(item.content)}
            onToggleSelect={() => onToggleSelect(item.content)}
            actions={actions}
          />
        ))}
      </div>
    </div>
  );
}
