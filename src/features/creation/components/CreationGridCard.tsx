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
  getCreationCardTags,
  getCreationNoteExcerpt,
  getCreationTitle,
  isIdeaContent,
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
  etiquetas?: readonly string[];
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
  etiquetas,
  onOpen,
  onToggleSelect,
  actions,
}: CreationGridCardProps) {
  const title = getCreationTitle(content);
  const isIdea = isIdeaContent(content);
  const tags = etiquetas ?? getCreationCardTags(content);
  const excerpt = getCreationNoteExcerpt(content);
  const canOpen = !content.deletedAt;
  const canActivate = selectionMode ? selectable : canOpen;
  const showSelect = selectable;
  const menuItems = buildCreationItemMenuItems(content, actions);
  const entityHint = creationEntityHint(pillar, series, content.pilarId, content.seriesId);
  const hasMarks = entityHint.length > 0;

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
      style={{ borderTopColor: series?.cor || pillar?.cor || undefined }}
      className={cn(
        'creation-hub-card group relative flex flex-col transition-[border-color,box-shadow,background-color,transform] duration-200',
        isIdea && 'creation-hub-card--idea',
        canActivate && 'cursor-pointer',
        selected && 'creation-hub-card--selected',
        selectionMode && !selectable && 'opacity-55',
      )}
    >
      <button
        type="button"
        onClick={handleActivate}
        disabled={!canActivate}
        title={entityHint || undefined}
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
            tags.length > 0 ? `Tags: ${tags.join(', ')}` : null,
          ].filter(Boolean).join(', ')
        }
      />

      <div className="relative z-[1] pointer-events-none flex min-h-0 flex-1 flex-col">
        <div className="creation-hub-card__header flex items-start gap-2">
          <Text variant="itemTitle" className="creation-hub-card__title min-w-0 flex-1 line-clamp-2" title={title}>
            {title}
          </Text>
          <span className="pointer-events-auto shrink-0">
            <CreationItemMenu
              items={menuItems}
              label={`Ações de ${title}`}
              alwaysVisible
              triggerClassName="h-6 w-6 min-h-0 min-w-0 p-0"
            />
          </span>
        </div>

        {excerpt ? (
          <Text variant="secondary" className="card-excerpt">
            {excerpt}
          </Text>
        ) : null}

        {hasMarks || showSelect ? (
          <div className="creation-hub-card__bottom flex min-w-0 items-center gap-2">
            {hasMarks ? (
              <CreationEntityMarks
                pillar={pillar}
                series={series}
                pillarId={content.pilarId}
                seriesId={content.seriesId}
                display="all"
                className="min-w-0 flex-1"
              />
            ) : <span className="flex-1" aria-hidden />}
            {showSelect ? (
              <span className="pointer-events-auto flex shrink-0">
                <CreationSelectCheckbox
                  selected={selected}
                  onToggle={onToggleSelect}
                  label={`${selected ? 'Desmarcar' : 'Selecionar'} ${title}`}
                  forceVisible={selected || selectionMode}
                />
              </span>
            ) : null}
          </div>
        ) : null}

        {tags.length > 0 ? (
          <div className="creation-hub-card__footer">
            <CreationCategoryLabel label={tags[0]} extraCount={tags.length - 1} names={tags} />
          </div>
        ) : null}
      </div>
    </Surface>
  );
}
