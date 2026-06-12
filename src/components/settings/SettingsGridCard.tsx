import type { ReactNode } from 'react';
import { Edit2, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export const SETTINGS_ENTITY_GRID_CLASS =
  'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3';

interface SettingsGridCardProps {
  title: string;
  description?: string;
  color?: string;
  leading?: ReactNode;
  badges?: ReactNode;
  active?: boolean;
  onToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  dimmed?: boolean;
  className?: string;
  children?: ReactNode;
  footer?: ReactNode;
}

export function SettingsGridCard({
  title,
  description,
  color,
  leading,
  badges,
  active = true,
  onToggle,
  onEdit,
  onDelete,
  dimmed = false,
  className,
  children,
  footer,
}: SettingsGridCardProps) {
  const showActions = onEdit || onDelete || footer;

  return (
    <div
      className={cn(
        'ds-card group flex flex-col bg-[var(--bg-primary)] p-3.5 text-left transition-colors hover:border-[var(--border-strong)]',
        dimmed && 'opacity-55',
        className
      )}
    >
      {(leading || color || onToggle) && (
        <div className="mb-2.5 flex items-center justify-between gap-2">
          {leading ?? (
            color ? (
              <span
                className="h-3 w-3 shrink-0 rounded-full border border-black/10"
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
      )}

      <h3 className="text-sm font-semibold leading-snug text-[var(--text-primary)]">{title}</h3>

      {children ?? (
        description ? (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
            {description}
          </p>
        ) : null
      )}

      {badges ? <div className="mt-2.5 flex flex-wrap gap-1">{badges}</div> : null}

      {showActions ? (
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
