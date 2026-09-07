import type { Content, Pilar, Serie } from '../../../lib/database';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';
import { CreationCategoryLabel } from './CreationCategoryLabel';
import { CreationItemMenu } from './CreationItemMenu';
import { CreationSelectCheckbox } from './CreationSelectCheckbox';
import { CreationStageChip } from './CreationStageChip';
import {
  buildCreationItemMenuItems,
  type CreationItemActionHandlers,
} from '../lib/creationItemActions';
import {
  getCreationNoteExcerpt,
  getCreationStageLabel,
  getCreationStageTone,
  getCreationTitle,
  preferredCreationEntity,
} from '../lib/creationItemPresentation';

export interface CreationGridCardProps {
  content: Content;
  pillar?: Pilar | null;
  series?: Serie | null;
  showStatus: boolean;
  selectionMode: boolean;
  selectable: boolean;
  selected: boolean;
  /** Mobile-dense layout: type badge + actions on row 1, title on row 2. */
  compact?: boolean;
  onOpen: () => void;
  onToggleSelect: () => void;
  actions: CreationItemActionHandlers;
}

export function CreationGridCard({
  content,
  pillar,
  series,
  showStatus,
  selectionMode,
  selectable,
  selected,
  compact = false,
  onOpen,
  onToggleSelect,
  actions,
}: CreationGridCardProps) {
  const title = getCreationTitle(content);
  const stageLabel = getCreationStageLabel(content);
  const stageTone = getCreationStageTone(content);
  const entity = preferredCreationEntity(content, pillar, series);
  const excerpt = getCreationNoteExcerpt(content);
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
    <Surface
      as="article"
      variant="interactive"
      padding="sm"
      className={cn(
        'group relative flex min-h-0 flex-col',
        canActivate && 'cursor-pointer',
        selected && 'ring-1 ring-[var(--text-primary)]',
        selectionMode && !selectable && 'opacity-55',
      )}
    >
      <button
        type="button"
        onClick={handleActivate}
        disabled={!canActivate}
        className={cn(
          'absolute inset-0 z-0 rounded-[var(--radius-card)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
          !canActivate && 'cursor-default',
        )}
        aria-label={
          selectionMode
            ? (selectable
              ? `${selected ? 'Desmarcar' : 'Selecionar'} ${title}`
              : `${title} não pode ser selecionado`)
            : (canOpen ? `Abrir ${title}` : title)
        }
      />

      <div className="relative z-[1] pointer-events-none flex min-h-0 flex-1 flex-col gap-1">
        <div className="flex h-5 items-center justify-between gap-2">
          <div
            className={cn(
              'relative flex min-w-0 flex-1 items-center transition-[padding] duration-150',
              showSelect && 'group-hover:pl-6 group-focus-within:pl-6',
              showSelect && (selected || selectionMode) && 'pl-6',
            )}
          >
            {showSelect ? (
              <span className="pointer-events-auto absolute left-0 top-1/2 -translate-y-1/2">
                <CreationSelectCheckbox
                  selected={selected}
                  onToggle={onToggleSelect}
                  label={`${selected ? 'Desmarcar' : 'Selecionar'} ${title}`}
                  forceVisible={selected || selectionMode}
                />
              </span>
            ) : null}
            {compact ? (
              showStatus ? (
                <CreationStageChip label={stageLabel} toneStatus={stageTone} />
              ) : null
            ) : entity ? (
              <CreationCategoryLabel label={entity.label} color={entity.color} />
            ) : null}
          </div>

          <div className="relative flex h-5 min-w-[2.5rem] shrink-0 items-center justify-end">
            {!compact && showStatus ? (
              <CreationStageChip
                label={stageLabel}
                toneStatus={stageTone}
                className="max-w-full truncate transition-opacity duration-150 group-hover:opacity-0 group-focus-within:opacity-0"
              />
            ) : null}
            <span className="pointer-events-auto absolute right-0 top-1/2 -translate-y-1/2">
              <CreationItemMenu
                items={menuItems}
                label={`Ações de ${title}`}
                alwaysVisible={compact}
              />
            </span>
          </div>
        </div>

        <Text variant="itemTitle" className="line-clamp-2 font-semibold leading-snug">
          {title}
        </Text>

        {!compact && excerpt ? (
          <Text variant="secondary" className="line-clamp-2 leading-snug">
            {excerpt}
          </Text>
        ) : null}
      </div>
    </Surface>
  );
}
