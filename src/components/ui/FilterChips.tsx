import { useEffect, useRef } from 'react';
import { useScrollEdgeFade } from '../../hooks/useScrollEdgeFade';
import { cn } from '../../lib/utils';

export interface FilterChipOption<T extends string> {
  id: T;
  label: string;
  count?: number;
}

interface FilterChipsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<FilterChipOption<T>>;
  ariaLabel: string;
  className?: string;
  /** "sm": chip mais baixo; no toque, a altura mínima continua sendo 44px. */
  size?: 'default' | 'sm';
  /** "scroll": uma fileira só, com rolagem horizontal e bordas esmaecidas. */
  layout?: 'wrap' | 'scroll';
}

/** Revela o chip sem deslocar verticalmente a página ou seus outros contêineres. */
function revealChip(button: HTMLButtonElement) {
  const container = button.parentElement;
  if (!container || container.clientWidth <= 0) return;

  const containerRect = container.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();
  const left = containerRect.left + container.clientLeft;
  const right = left + container.clientWidth;
  let offset = 0;

  if (buttonRect.width > container.clientWidth || buttonRect.left < left) {
    offset = buttonRect.left - left;
  } else if (buttonRect.right > right) {
    offset = buttonRect.right - right;
  }

  if (offset !== 0) {
    container.scrollBy({ left: offset, top: 0, behavior: 'auto' });
  }
}

/**
 * Filtro de escolha única apresentado como um grupo de botões de alternância.
 * O chip ativo é contornado para preservar a hierarquia em relação às abas.
 */
export function FilterChips<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  size = 'default',
  layout = 'wrap',
}: FilterChipsProps<T>) {
  const edgeFade = useScrollEdgeFade<HTMLDivElement>();
  const { update: updateEdgeFade } = edgeFade;
  const activeButtonRef = useRef<HTMLButtonElement>(null);
  const scroll = layout === 'scroll';
  const hasActiveOption = options.some(option => option.id === value);

  useEffect(() => {
    if (scroll) updateEdgeFade();
  }, [options, scroll, updateEdgeFade]);

  useEffect(() => {
    if (!scroll || !hasActiveOption) return;
    if (activeButtonRef.current) revealChip(activeButtonRef.current);
    updateEdgeFade();
  }, [hasActiveOption, scroll, updateEdgeFade, value]);

  return (
    <div
      // Mantém o elemento disponível ao hook inclusive quando o layout muda de wrap para scroll.
      ref={edgeFade.ref}
      role="group"
      aria-label={ariaLabel}
      className={cn(
        scroll
          ? 'filter-chips-scroll scroll-edge-fade flex flex-nowrap gap-2 overflow-x-auto'
          : 'flex flex-wrap gap-2',
        className,
      )}
    >
      {options.map(option => {
        const active = option.id === value;
        const accessibleLabel = option.count != null
          ? `${option.label} (${option.count})`
          : option.label;

        return (
          <button
            ref={active ? activeButtonRef : undefined}
            key={option.id}
            type="button"
            aria-label={accessibleLabel}
            aria-pressed={active}
            onClick={() => {
              if (!active) onChange(option.id);
            }}
            className={cn(
              'filter-chip focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]',
              size === 'sm' ? 'filter-chip--sm min-h-8' : 'min-h-9',
              'pointer-coarse:min-h-11',
              scroll && 'shrink-0 whitespace-nowrap',
              active && 'filter-chip-active',
            )}
          >
            <span>{option.label}</span>
            {option.count != null ? (
              <span
                aria-hidden="true"
                className={cn(
                  'filter-chip-count tabular-nums',
                  active ? 'text-[var(--text-secondary)]' : 'text-[var(--text-tertiary)]',
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
