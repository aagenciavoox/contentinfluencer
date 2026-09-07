import type { ReactNode } from 'react';
import { Edit2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Text } from '../ui/Text';
import { MoreMenu, type MoreMenuItem } from '../ui/MoreMenu';
import { cn } from '../../lib/utils';

export const SETTINGS_ENTITY_GRID_CLASS = 'grid-content';

interface SettingsGridCardProps {
  title: string;
  description?: string;
  color?: string;
  leading?: ReactNode;
  badges?: ReactNode;
  /** Compact meta line (e.g. "Semanal · 12 roteiros"). */
  meta?: ReactNode;
  active?: boolean;
  onToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Makes the card body open the primary destination. */
  onOpen?: () => void;
  dimmed?: boolean;
  /** Dense layout: no footer divider, hover icon actions. */
  compact?: boolean;
  className?: string;
  children?: ReactNode;
  footer?: ReactNode;
}

function buildMoreItems({
  active,
  onToggle,
  onDelete,
}: {
  active: boolean;
  onToggle?: () => void;
  onDelete?: () => void;
}): MoreMenuItem[] {
  const items: MoreMenuItem[] = [];
  if (onToggle) {
    items.push({
      id: 'toggle',
      label: active ? 'Desativar' : 'Ativar',
      tone: active ? 'default' : 'success',
      onClick: onToggle,
    });
  }
  if (onDelete) {
    items.push({
      id: 'delete',
      label: 'Excluir',
      tone: 'danger',
      onClick: onDelete,
    });
  }
  return items;
}

export function SettingsGridCard({
  title,
  description,
  color,
  leading,
  badges,
  meta,
  active = true,
  onToggle,
  onEdit,
  onDelete,
  onOpen,
  dimmed = false,
  compact = false,
  className,
  children,
  footer,
}: SettingsGridCardProps) {
  const moreItems = buildMoreItems({ active, onToggle, onDelete });
  const showLegacyActions = !compact && Boolean(onEdit || moreItems.length > 0 || footer);
  const showCompactActions = compact && Boolean(onEdit || moreItems.length > 0);
  const toggleLabel = active ? 'Desativar' : 'Ativar';
  const statusBadge = color || compact ? (
    <Badge variant="neutral">
      {color ? (
        <span
          className="mr-1.5 inline-block h-2 w-2 rounded-full border border-[var(--border-color)]"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      ) : null}
      {active ? 'Ativa' : 'Inativa'}
    </Badge>
  ) : null;

  const body = (
    <>
      {statusBadge || badges ? (
        <div className="mb-2 flex flex-wrap items-center gap-1">
          {statusBadge}
          {badges}
        </div>
      ) : null}

      <Text variant="itemTitle" className="leading-snug">
        {title}
      </Text>

      {children ?? (
        description ? (
          <Text variant="secondary" className="mt-1 line-clamp-2">
            {description}
          </Text>
        ) : null
      )}

      {meta ? (
        <Text variant="meta" as="p" className="mt-2 truncate leading-none">
          {meta}
        </Text>
      ) : null}
    </>
  );

  return (
    <div
      className={cn(
        'ds-card ds-card-interactive group relative flex flex-col gap-3 bg-[var(--bg-elevated)] p-4 text-left',
        dimmed && 'opacity-55',
        className,
      )}
    >
      {!compact && (leading || color || onToggle) ? (
        <div className="mb-2.5 flex items-center justify-between gap-2">
          {leading ?? (
            color ? (
              <span
                className="h-3 w-3 shrink-0 rounded-full border border-[var(--border-color)]"
                style={{ backgroundColor: color }}
              />
            ) : (
              <span />
            )
          )}
          {onToggle ? (
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-input)] px-1.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              aria-label={toggleLabel}
            >
              {active ? (
                <ToggleRight className="h-5 w-5 text-[var(--accent-green)]" />
              ) : (
                <ToggleLeft className="h-5 w-5 text-[var(--text-tertiary)]" />
              )}
              <span>{toggleLabel}</span>
            </button>
          ) : null}
        </div>
      ) : null}

      {showCompactActions ? (
        <div
          className={cn(
            'card-actions absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded-[var(--radius-input)] bg-[var(--bg-elevated)]/90 p-0.5',
          )}
        >
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-md p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              aria-label={`Editar ${title}`}
              title="Editar"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {moreItems.length > 0 ? (
            <MoreMenu
              size="sm"
              items={moreItems}
              triggerClassName="border-transparent bg-transparent hover:bg-[var(--bg-hover)]"
            />
          ) : null}
        </div>
      ) : null}

      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className={cn(
            'min-w-0 flex-1 rounded-[var(--radius-input)] text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
            showCompactActions && 'pr-8',
          )}
          aria-label={`Abrir ${title}`}
        >
          {body}
        </button>
      ) : (
        <div className={cn('min-w-0 flex-1', showCompactActions && 'pr-8')}>{body}</div>
      )}

      {showLegacyActions ? (
        <div className="card-actions mt-1 flex items-center justify-between gap-2">
          {footer ?? (
            <>
              {onEdit ? (
                <button
                  type="button"
                  onClick={onEdit}
                  className="inline-flex items-center gap-1 rounded-[var(--radius-input)] px-2 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                >
                  <Edit2 className="h-3 w-3" />
                  Editar
                </button>
              ) : (
                <span />
              )}
              {onDelete ? (
                <MoreMenu
                  size="sm"
                  items={[
                    {
                      id: 'delete',
                      label: 'Excluir',
                      tone: 'danger',
                      onClick: onDelete,
                    },
                  ]}
                  triggerClassName="border-transparent bg-transparent text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                />
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
