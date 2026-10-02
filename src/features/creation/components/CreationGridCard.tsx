import type { Content, Pilar, Serie } from '../../../lib/database';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';
import { CreationCategoryLabel } from './CreationCategoryLabel';
import { CreationEntityMarks, creationEntityHint } from './CreationEntityMarks';
import { CreationItemMenu } from './CreationItemMenu';
import { CreationSelectCheckbox } from './CreationSelectCheckbox';
import {
  buildCreationItemMenuItems,
  type CreationItemActionHandlers,
} from '../lib/creationItemActions';
import {
  getCreationCardFooterMeta,
  getCreationCardTags,
  getCreationNoteExcerpt,
  getCreationTitle,
} from '../lib/creationItemPresentation';

export interface CreationGridCardProps {
  content: Content;
  pillar?: Pilar | null;
  series?: Serie | null;
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
  selectionMode,
  selectable,
  selected,
  onOpen,
  onToggleSelect,
  actions,
}: CreationGridCardProps) {
  const title = getCreationTitle(content);
  const tags = getCreationCardTags(content);
  const excerpt = getCreationNoteExcerpt(content);
  const footerMeta = getCreationCardFooterMeta(content);
  const canOpen = !content.deletedAt;
  const canActivate = selectionMode ? selectable : canOpen;
  const showSelect = selectable;
  const menuItems = buildCreationItemMenuItems(content, actions);
  const entityHint = creationEntityHint(pillar, series, content.pilarId, content.seriesId);
  const hasMarks = entityHint.length > 0;
  const cornerReserve = showSelect ? 'pr-16' : 'pr-9';

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
      padding="none"
      className={cn(
        'creation-hub-card group relative flex flex-col transition-[border-color,box-shadow,background-color] duration-200',
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
          [
            selectionMode
              ? (selectable
                ? `${selected ? 'Desmarcar' : 'Selecionar'} ${title}`
                : `${title} não pode ser selecionado`)
              : (canOpen ? `Abrir ${title}` : title),
            entityHint,
          ].filter(Boolean).join(', ')
        }
      />

      <div className="relative z-[1] pointer-events-none flex min-h-0 flex-col">
        <div className="pointer-events-auto absolute top-0 right-0 z-[2] flex items-center justify-end gap-1">
            {showSelect ? (
              <span>
                <CreationSelectCheckbox
                  selected={selected}
                  onToggle={onToggleSelect}
                  label={`${selected ? 'Desmarcar' : 'Selecionar'} ${title}`}
                  forceVisible={selected || selectionMode}
                />
              </span>
            ) : null}
            <span>
              <CreationItemMenu
                items={menuItems}
                label={`Ações de ${title}`}
                alwaysVisible
              />
            </span>
        </div>

        {hasMarks ? (
          <div
            className={cn('creation-hub-card__header flex min-h-8 items-center', cornerReserve)}
            onClick={event => {
              event.stopPropagation();
              handleActivate();
            }}
          >
            <CreationEntityMarks
              pillar={pillar}
              series={series}
              pillarId={content.pilarId}
              seriesId={content.seriesId}
              className="pointer-events-auto relative z-[2]"
            />
          </div>
        ) : null}

        <div className={cn('card-body', !hasMarks && cornerReserve)}>
          <Text variant="itemTitle" className="creation-hub-card__title line-clamp-2">
            {title}
          </Text>

          {excerpt ? (
            <Text variant="secondary" className="card-excerpt">
              {excerpt}
            </Text>
          ) : null}
        </div>

        {tags.length > 0 || footerMeta ? (
          <div className="creation-hub-card__footer flex min-h-6 items-center justify-between gap-4">
            {tags.length > 0 ? (
              <CreationCategoryLabel label={tags[0]} extraCount={tags.length - 1} />
            ) : <span aria-hidden />}
            {footerMeta ? (
              <Text variant="meta" as="span" className="max-w-[45%] truncate text-right text-2xs text-[var(--text-tertiary)]">
                {footerMeta}
              </Text>
            ) : null}
          </div>
        ) : null}
      </div>
    </Surface>
  );
}
