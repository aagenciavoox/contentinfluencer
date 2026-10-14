import { cn } from '../../lib/utils';

interface MobileToggleSwitchProps {
  enabled: boolean;
  onToggle: () => void;
  label: string;
  className?: string;
}

export function MobileToggleSwitch({ enabled, onToggle, label, className }: MobileToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      onClick={onToggle}
      aria-label={label}
      aria-checked={enabled}
      className={cn(
        'relative flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full',
        'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
        className
      )}
    >
      {/* Desligada com contorno e bolinha em cinza escuro: o trilho claro sobre o card claro
          ficava quase invisível (abaixo de 3:1). */}
      <span
        className={cn(
          'relative h-7 w-12 rounded-full border-[1.5px] transition-colors',
          enabled
            ? 'border-[var(--text-primary)] bg-[var(--text-primary)]'
            : 'border-[var(--text-tertiary)] bg-transparent'
        )}
      >
        <span
          className={cn(
            'absolute top-[3px] h-[18px] w-[18px] rounded-full transition-all',
            enabled ? 'left-[23px] bg-[var(--bg-elevated)]' : 'left-[3px] bg-[var(--text-tertiary)]'
          )}
        />
      </span>
    </button>
  );
}
