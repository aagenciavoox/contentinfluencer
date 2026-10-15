import { cn } from '../../lib/utils';

export interface FilterChipOption<T extends string> {
  id: T;
  label: string;
  count?: number;
}

/**
 * Filtro de uma escolha só, em chips. Dentro de uma aba, filtrar usa chip, não `SegmentTabs`:
 * assim o filtro não parece uma segunda fileira de abas.
 */
export function FilterChips<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<FilterChipOption<T>>;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn('flex flex-wrap gap-2', className)}>
      {options.map(option => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={cn('filter-chip min-h-9 pointer-coarse:min-h-11', active && 'filter-chip-active')}
          >
            {option.label}
            {option.count != null ? (
              <span className="tabular-nums opacity-70">{option.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
