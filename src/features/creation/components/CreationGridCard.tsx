import type { Content, Pilar, Serie } from '../../../lib/database';
import type { ContaRef } from '../../contas/lib/contas';
import { Surface } from '../../../components/ui/Surface';
import { cn } from '../../../lib/utils';
import { CreationCardContent } from './CreationCardContent';
import { creationEntityHint } from './CreationEntityMarks';
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
  platforms?: readonly ContaRef[];
  selectionMode: boolean;
  selectable: boolean;
  selected: boolean;
  /** Mobile-dense layout flag (maintained for shared grid API). */
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
  platforms,
  selectionMode,
  selectable,
  selected,
  etiquetas,
  onOpen,
  onToggleSelect,
  actions,
}: CreationGridCardProps) {
  const title = getCreationTitle(content);
  const isTrash = Boolean(content.deletedAt);
  const isIdea = !isTrash && isIdeaContent(content);
  const tags = etiquetas ?? getCreationCardTags(content);
  const excerpt = getCreationNoteExcerpt(content);
  const canOpen = !isTrash;
  const canActivate = selectionMode ? selectable : canOpen;
  const menuItems = buildCreationItemMenuItems(content, actions);
  const entityHint = creationEntityHint(pillar, series, content.pilarId, content.seriesId);
  const topAccentColor = !isIdea && !isTrash ? (series?.cor || pillar?.cor || undefined) : undefined;

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
      style={topAccentColor ? { borderTopColor: topAccentColor } : undefined}
      className={cn(
        'creation-hub-card group relative flex flex-col transition-[border-color,box-shadow,background-color,transform] duration-200',
        isIdea && 'creation-hub-card--idea',
        isTrash && 'creation-hub-card--trash select-none cursor-not-allowed',
        canActivate && 'cursor-pointer',
        selected && 'creation-hub-card--selected',
        selectionMode && !selectable && !isTrash && 'opacity-55',
      )}
    >
      <button
        type="button"
        onClick={handleActivate}
        disabled={!canActivate}
        title={entityHint || undefined}
        className={cn(
          'absolute inset-0 z-0 rounded-[var(--radius-card)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
          !canActivate && (isTrash ? 'cursor-not-allowed' : 'cursor-default'),
        )}
        aria-label={
          [
            isTrash
              ? `${title}, bloqueado na lixeira`
              : selectionMode
                ? (selectable
                  ? `${selected ? 'Desmarcar' : 'Selecionar'} ${title}`
                  : `${title} não pode ser selecionado`)
                : (canOpen ? `Abrir ${title}` : title),
            entityHint,
            tags.length > 0 ? `Tags: ${tags.join(', ')}` : null,
          ].filter(Boolean).join(', ')
        }
      />

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
        onToggleSelect={onToggleSelect}
      />
    </Surface>
  );
}
