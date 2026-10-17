import { useEffect } from 'react';
import { useScrollEdgeFade } from '../../hooks/useScrollEdgeFade';
import { cn } from '../../lib/utils';

export interface FilterChipOption<T extends string> {
  id: T;
  label: string;
  count?: number;
}

/**
 * Filtro de uma escolha só, em chips. Dentro de uma aba, filtrar usa chip, não `SegmentTabs`:
 * assim o filtro não parece uma segunda fileira de abas. O chip ativo é contornado (não
 * preenchido), para ficar abaixo da aba ativa na hierarquia.
 */
export function FilterChips<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  size = 'default',
  layout = 'wrap',
}: {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<FilterChipOption<T>>;
  ariaLabel: string;
  className?: string;
  /** "sm": chip mais baixo; no toque a área de toque continua com 44px. */
  size?: 'default' | 'sm';
  /** "scroll": uma fileira só, rolando para o lado, com a borda esmaecida. */
  layout?: 'wrap' | 'scroll';
}) {
  const edgeFade = useScrollEdgeFade<HTMLDivElement>();
  const { update: updateEdgeFade } = edgeFade;
  const scroll = layout === 'scroll';

  useEffect(() => {
    if (scroll) updateEdgeFade();
  }, [options, scroll, updateEdgeFade]);

  return (
    <div
      ref={scroll ? edgeFade.ref : undefined}
      role="group"
      aria-label={ariaLabel}
      className={cn(
        scroll ? 'filter-chips-scroll scroll-edge-fade flex flex-nowrap gap-2 overflow-x-auto' : 'flex flex-wrap gap-2',
        className,
      )}
    >
      {options.map(option => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={cn(
              'filter-chip',
              size === 'sm' ? 'filter-chip--sm min-h-8 pointer-coarse:min-h-9' : 'min-h-9 pointer-coarse:min-h-11',
              scroll && 'shrink-0 whitespace-nowrap',
              active && 'filter-chip-active',
            )}
          >
            {option.label}
            {option.count != null ? (
              <span className={cn('filter-chip-count tabular-nums', active ? 'text-[var(--text-secondary)]' : 'text-[var(--text-tertiary)]')}>
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
