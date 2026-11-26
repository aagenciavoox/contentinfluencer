import {
  Archive,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  Clapperboard,
  FilePenLine,
  Lightbulb,
  Lock,
  Palette,
  Scissors,
} from 'lucide-react';
import type { MouseEvent, KeyboardEvent } from 'react';
import type { Content, Pilar, Serie } from '../../../lib/database';
import type { MoreMenuItem } from '../../../components/ui/MoreMenu';
import type { ContaRef } from '../../contas/lib/contas';
import { STATUS_EDITADO } from '../../contents/lib/esteiraDisplay';
import { Badge } from '../../../components/ui/Badge';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';
import {
  getCreationCardPresentation,
  getCreationTrashAgeLabel,
  type CreationCardStageKind,
} from '../lib/creationItemPresentation';
import { CreationCategoryLabel } from './CreationCategoryLabel';
import { CreationItemMenu } from './CreationItemMenu';
import { CreationSelectCheckbox } from './CreationSelectCheckbox';

const STAGE_DOT_VAR: Record<CreationCardStageKind, string> = {
  idea: 'var(--status-idea)',
  script: 'var(--status-writing)',
  production: 'var(--status-production)',
  editing: 'var(--status-editing)',
  scheduled: 'var(--status-scheduled)',
  posted: 'var(--status-posted)',
  archived: 'var(--status-archived)',
  trash: 'var(--text-tertiary)',
};

function StageIndicatorIcon({
  kind,
  isCarousel,
  selected,
}: {
  kind: CreationCardStageKind;
  isCarousel: boolean;
  selected: boolean;
}) {
  if (selected) {
    return <CheckSquare className="h-3.5 w-3.5 shrink-0 text-[var(--status-writing)]" aria-hidden />;
  }
  switch (kind) {
    case 'idea':
      return <Lightbulb className="h-3.5 w-3.5 shrink-0 text-[var(--status-idea)]" aria-hidden />;
    case 'script':
      return <FilePenLine className="h-3.5 w-3.5 shrink-0 text-[var(--status-writing)]" aria-hidden />;
    case 'production':
      return isCarousel
        ? <Palette className="h-3.5 w-3.5 shrink-0 text-[var(--status-production)]" aria-hidden />
        : <Clapperboard className="h-3.5 w-3.5 shrink-0 text-[var(--status-production)]" aria-hidden />;
    case 'editing':
      return <Scissors className="h-3.5 w-3.5 shrink-0 text-[var(--status-editing)]" aria-hidden />;
    case 'scheduled':
      return <CalendarClock className="h-3.5 w-3.5 shrink-0 text-[var(--status-scheduled)]" aria-hidden />;
    case 'posted':
      return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--status-posted)]" aria-hidden />;
    case 'archived':
      return <Archive className="h-3.5 w-3.5 shrink-0 text-[var(--status-archived)]" aria-hidden />;
    default:
      return null;
  }
}

export interface CreationCardContentProps {
  content: Content;
  title: string;
  excerpt: string | null;
  tags: readonly string[];
  pillar?: Pilar | null;
  series?: Serie | null;
  platforms?: readonly ContaRef[];
  menuItems: MoreMenuItem[];
  selectionMode?: boolean;
  selectable?: boolean;
  selected?: boolean;
  isPersisting?: boolean;
  stopInteractivePropagation?: boolean;
  onToggleSelect?: () => void;
}

export function CreationCardContent({
  content,
  title,
  excerpt,
  tags,
  pillar,
  series,
  platforms,
  menuItems,
  selectionMode = false,
  selectable = false,
  selected = false,
  isPersisting = false,
  stopInteractivePropagation = false,
  onToggleSelect,
}: CreationCardContentProps) {
  const presentation = getCreationCardPresentation(content, platforms);
  const { isIdea, isTrash, completionBadge, stageKind, stageLabel } = presentation;
  const isCarousel = content.writingMode === 'carrossel';
  const showSelect = Boolean(selectable && onToggleSelect && !isTrash);
  const showInlineSelect = showSelect && (selected || selectionMode);
  const showHoverSelect = showSelect && !showInlineSelect;

  const seriesName = series?.name?.trim() || null;
  const pillarName = pillar?.nome?.trim() || null;

  // Na Ideia, o cabeçalho prioriza o pilar temático (ou série); no Roteiro, prioriza a série.
  const headerShowsSeries = !isIdea && !isTrash && Boolean(seriesName);
  const headerLabel = isTrash
    ? (seriesName || pillarName || 'Item descartado')
    : isIdea
      ? (pillarName || seriesName || 'Ideia')
      : (seriesName || pillarName || stageLabel);
  const headerDotColor = isIdea
    ? (pillar?.cor || series?.cor || STAGE_DOT_VAR.idea)
    : seriesName
      ? (series?.cor || 'var(--brand-accent-strong)')
      : (pillar?.cor || STAGE_DOT_VAR[stageKind]);

  // Mostra "Pilar: ..." no rodapé quando a série já ocupa o cabeçalho (evita repetir o mesmo nome).
  const footerPillarLabel = !isTrash && !isIdea && headerShowsSeries && pillarName
    ? `Pilar: ${pillarName}`
    : null;
  const trashAge = isTrash ? getCreationTrashAgeLabel(content.deletedAt) : null;

  const stopPropagation = stopInteractivePropagation
    ? {
        onClick: (event: MouseEvent) => event.stopPropagation(),
        onKeyDown: (event: KeyboardEvent) => event.stopPropagation(),
      }
    : undefined;

  return (
    <div className="creation-hub-card__inner relative z-[1] pointer-events-none flex min-h-0 flex-1 flex-col gap-3">
      {/* Linha 1: Contexto (Série/Pilar ou Descartado) + Checkbox + Menu */}
      <div className="creation-hub-card__header flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {isTrash ? (
            <input
              type="checkbox"
              disabled
              aria-label="Item bloqueado na lixeira"
              className="creation-hub-card__trash-checkbox h-4 w-4 shrink-0 cursor-not-allowed rounded-[var(--radius-sm)] opacity-50"
            />
          ) : showInlineSelect && onToggleSelect ? (
            <span className="pointer-events-auto flex shrink-0" {...stopPropagation}>
              <CreationSelectCheckbox
                selected={selected}
                onToggle={onToggleSelect}
                label={`${selected ? 'Desmarcar' : 'Selecionar'} ${title}`}
                forceVisible
              />
            </span>
          ) : null}

          <div className="flex min-w-0 items-center gap-1.5">
            {!isTrash ? (
              <span
                className="entity-color-dot h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: headerDotColor }}
                aria-hidden
              />
            ) : null}
            <Text
              variant="meta"
              as="span"
              className={cn(
                'min-w-0 truncate leading-tight',
                isTrash
                  ? 'creation-hub-card__context--strong line-through text-[var(--text-secondary)]'
                  : headerShowsSeries
                    ? 'creation-hub-card__context--strong text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)]',
              )}
              title={headerLabel}
            >
              {headerLabel}
            </Text>
          </div>
        </div>

        <div className="pointer-events-auto flex shrink-0 items-center gap-1" {...stopPropagation}>
          {isTrash ? (
            <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
          ) : showHoverSelect && onToggleSelect ? (
            <CreationSelectCheckbox
              selected={false}
              onToggle={onToggleSelect}
              label={`Selecionar ${title}`}
            />
          ) : null}

          <CreationItemMenu
            items={menuItems}
            label={`Ações de ${title}`}
            alwaysVisible
            triggerClassName="h-7 w-7 -mr-1 min-h-0 min-w-0 p-0"
          />
        </div>
      </div>

      {/* Linha 2: Título */}
      <Text
        variant="itemTitle"
        as="h3"
        className={cn(
          'creation-hub-card__title min-w-0 line-clamp-2',
          isTrash && 'line-through text-[var(--text-secondary)]',
        )}
        title={title}
      >
        {title}
      </Text>

      {/* Linha 3 (opcional): Selo editorial ✓ Editado / ✓ Design pronto */}
      {completionBadge ? (
        <Badge
          variant="status"
          status={STATUS_EDITADO}
          className="creation-hub-card__completion-badge w-fit normal-case tracking-normal"
        >
          {completionBadge.kind === 'design' ? (
            <Palette className="h-3 w-3 shrink-0" aria-hidden />
          ) : (
            <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden />
          )}
          <span>{completionBadge.label}</span>
        </Badge>
      ) : null}

      {/* Linha 4: Trecho explicativo */}
      {isTrash ? (
        <Text variant="secondary" className="card-excerpt italic text-[var(--text-tertiary)]">
          {excerpt || 'Conteúdo na lixeira. Restaure pelo menu para editar.'}
        </Text>
      ) : excerpt ? (
        <Text variant="secondary" className="card-excerpt">
          {excerpt}
        </Text>
      ) : null}

      {isPersisting ? (
        <Text variant="meta" as="p" className="leading-none">
          Salvando…
        </Text>
      ) : null}

      {/* Linha 5: Rodapé estruturado */}
      <div className="creation-hub-card__footer flex flex-col gap-1.5">
        {isTrash ? (
          <div className="flex items-center justify-between gap-2">
            <Badge variant="neutral" className="rounded-[var(--radius-sm)] text-2xs">
              Bloqueado na lixeira
            </Badge>
            {trashAge ? (
              <Text variant="meta" as="span" className="shrink-0 text-2xs text-[var(--text-tertiary)]">
                {trashAge}
              </Text>
            ) : null}
          </div>
        ) : (
          <>
            {footerPillarLabel && !completionBadge ? (
              <Text variant="meta" as="span" className="truncate text-2xs text-[var(--text-secondary)]">
                {footerPillarLabel}
              </Text>
            ) : null}

            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0">
                {tags.length > 0 ? (
                  <CreationCategoryLabel
                    label={tags[0]}
                    extraCount={tags.length - 1}
                    names={tags}
                    onPaper={isIdea}
                  />
                ) : null}
              </div>

              {completionBadge && footerPillarLabel ? (
                <Text
                  variant="meta"
                  as="span"
                  className="max-w-[55%] truncate text-2xs text-[var(--text-secondary)]"
                  title={footerPillarLabel}
                >
                  {footerPillarLabel}
                </Text>
              ) : (
                <Text
                  variant="meta"
                  as="span"
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1 text-2xs',
                    isIdea ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-secondary)]',
                  )}
                >
                  <StageIndicatorIcon
                    kind={stageKind}
                    isCarousel={isCarousel}
                    selected={selected}
                  />
                  <span>{selected ? 'Selecionado' : stageLabel}</span>
                </Text>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
