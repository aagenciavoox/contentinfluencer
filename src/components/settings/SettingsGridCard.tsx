import type { ReactNode } from 'react';
import { Edit2, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { Text } from '../ui/Text';
import { cn } from '../../lib/utils';

export const SETTINGS_ENTITY_GRID_CLASS =
  'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3';

interface SettingsGridCardProps {
  title: string;
  description?: string;
  color?: string;
  /** `dot` keeps the classic header swatch; `bar` uses a left accent (compact series). */
  colorAccent?: 'dot' | 'bar';
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
  /** Dense layout: no footer divider, hover icon actions, optional left color bar. */
  compact?: boolean;
  className?: string;
  children?: ReactNode;
  footer?: ReactNode;
}

export function SettingsGridCard({
  title,
  description,
  color,
  colorAccent = 'dot',
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
  const showLegacyActions = !compact && Boolean(onEdit || onDelete || footer);
  const showCompactActions = compact && Boolean(onEdit || onDelete || onToggle);
  const useBar = Boolean(color) && (compact || colorAccent === 'bar');

  const body = (
    <>
      <Text variant="itemTitle" className="leading-snug">
        {title}
      </Text>

      {children ?? (
        description ? (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
            {description}
          </p>
        ) : null
      )}

      {meta ? (
        <Text variant="meta" as="p" className="mt-1.5 truncate leading-none">
          {meta}
        </Text>
      ) : null}

      {!meta && badges ? <div className="mt-2 flex flex-wrap gap-1">{badges}</div> : null}
    </>
  );

  return (
    <div
      className={cn(
        'ds-card group relative flex flex-col bg-[var(--bg-primary)] text-left transition-colors hover:border-[var(--border-strong)]',
        compact ? 'gap-0 p-3' : 'p-3.5',
        useBar && 'border-l-[3px]',
        dimmed && 'opacity-55',
        className,
      )}
      style={useBar && color ? { borderLeftColor: color } : undefined}
    >
      {!compact && (leading || (color && colorAccent === 'dot') || onToggle) ? (
        <div className="mb-2.5 flex items-center justify-between gap-2">
          {leading ?? (
            color && colorAccent === 'dot' ? (
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
              className="transition-transform active:scale-95"
              aria-label={active ? 'Desativar' : 'Ativar'}
            >
              {active ? (
                <ToggleRight className="h-5 w-5 text-[var(--accent-green)]" />
              ) : (
                <ToggleLeft className="h-5 w-5 text-[var(--text-tertiary)]" />
              )}
            </button>
          ) : null}
        </div>
      ) : null}

      {showCompactActions ? (
        <div
          className={cn(
            'absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded-[var(--radius-input)] bg-[var(--bg-primary)]/90 p-0.5',
            'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100',
          )}
        >
          {onToggle ? (
            <button
              type="button"
              onClick={onToggle}
              className="rounded-md p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              aria-label={active ? 'Desativar' : 'Ativar'}
              title={active ? 'Desativar' : 'Ativar'}
            >
              {active ? (
                <ToggleRight className="h-4 w-4 text-[var(--accent-green)]" />
              ) : (
                <ToggleLeft className="h-4 w-4" />
              )}
            </button>
          ) : null}
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
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-md p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--accent-pink)]/10 hover:text-[var(--accent-pink)]"
              aria-label={`Excluir ${title}`}
              title="Excluir"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
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
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border-color)] pt-2.5">
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
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded-[var(--radius-input)] p-1 text-[var(--accent-pink)] transition-colors hover:bg-[var(--accent-pink)]/10"
                  aria-label="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
