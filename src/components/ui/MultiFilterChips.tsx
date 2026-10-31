import { cn } from '../../lib/utils';
import type { FilterChipOption } from './FilterChips';
/**
 * Variante de `FilterChips` com várias escolhas ao mesmo tempo.
 * Mesmo visual (`filter-chip` / `filter-chip-active`); cada chip liga e desliga.
 */
export function MultiFilterChips<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: readonly T[];
  onChange: (value: T[]) => void;
  options: ReadonlyArray<FilterChipOption<T>>;
  ariaLabel: string;
  className?: string;
}) {
  const toggle = (id: T) => {
    onChange(value.includes(id) ? value.filter(item => item !== id) : [...value, id]);
  };
  return (
    <div role="group" aria-label={ariaLabel} className={cn('flex flex-wrap gap-2', className)}>
      {options.map(option => {
        const active = value.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(option.id)}
            className={cn('filter-chip min-h-9 pointer-coarse:min-h-11', active && 'filter-chip-active')}
          >
            {option.icon ? <span className="flex shrink-0" aria-hidden>{option.icon}</span> : null}
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