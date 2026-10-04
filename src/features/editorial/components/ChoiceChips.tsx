import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';

export interface ChoiceChipOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

/** Escolha única em botões; clicar de novo na opção marcada limpa a escolha. */
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  label,
  layout = 'inline',
}: {
  options: ChoiceChipOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  label: string;
  layout?: 'inline' | 'stacked';
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        layout === 'stacked' ? 'grid grid-cols-1 gap-2 sm:grid-cols-3' : 'flex flex-wrap gap-2',
      )}
    >
      {options.map(option => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(selected ? null : option.value)}
            className={cn(
              'rounded-[var(--radius-input)] border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
              selected
                ? 'border-[var(--text-primary)] bg-[var(--bg-hover)]'
                : 'border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)]',
            )}
          >
            <Text variant="meta" className="font-semibold text-[var(--text-primary)]">
              {option.label}
            </Text>
            {option.description ? (
              <Text variant="meta" className="mt-0.5 text-[var(--text-secondary)]">
                {option.description}
              </Text>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
