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
      onClick={onToggle}
      aria-label={`${enabled ? 'Desativar' : 'Ativar'} ${label}`}
      aria-pressed={enabled}
      className={cn(
        'relative flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full',
        className
      )}
    >
      <span
        className={cn(
          'relative h-7 w-12 rounded-full transition-colors',
          enabled ? 'bg-[var(--text-primary)]' : 'bg-[var(--bg-hover)]'
        )}
      >
        <span
          className={cn(
            'absolute top-1 h-5 w-5 rounded-full bg-white transition-all',
            enabled ? 'left-6' : 'left-1'
          )}
        />
      </span>
    </button>
  );
}
