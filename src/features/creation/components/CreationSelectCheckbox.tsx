import { Check } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface CreationSelectCheckboxProps {
  selected: boolean;
  onToggle: () => void;
  label: string;
  /** Force visible (selection mode, selected, or keyboard focus). */
  forceVisible?: boolean;
  className?: string;
}

export function CreationSelectCheckbox({
  selected,
  onToggle,
  label,
  forceVisible = false,
  className,
}: CreationSelectCheckboxProps) {
  return (
    <button
      type="button"
      onClick={event => {
        event.stopPropagation();
        onToggle();
      }}
      className={cn(
        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-[opacity,colors,box-shadow] duration-150',
        'focus-visible:opacity-100 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
        selected
          ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)] opacity-100'
          : 'pointer-events-none border-[var(--border-color)] bg-[var(--bg-elevated)] text-transparent opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 hover:border-[var(--border-strong)]',
        forceVisible && 'pointer-events-auto opacity-100',
        className,
      )}
      aria-label={label}
      aria-pressed={selected}
    >
      {selected ? <Check className="h-3 w-3 stroke-[3px]" /> : null}
    </button>
  );
}
