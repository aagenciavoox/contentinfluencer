import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ViewModeOption<T extends string> {
  value: T;
  label: string;
  icon: LucideIcon;
}

interface ViewModeToggleProps<T extends string> {
  value: T;
  options: ViewModeOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  buttonClassName?: string;
  showLabels?: boolean;
  /** `raised`: a opção ativa vira um cartão branco com sombra, para trilhos sobre fundo cinza. */
  tone?: 'default' | 'raised';
  ariaLabel?: string;
}

export function ViewModeToggle<T extends string>({
  value,
  options,
  onChange,
  className,
  buttonClassName,
  showLabels = false,
  tone = 'default',
  ariaLabel,
}: ViewModeToggleProps<T>) {
  const raised = tone === 'raised';
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'flex shrink-0 rounded-xl border border-[var(--border-color)] p-1',
        raised ? 'bg-[var(--surface-subtle)]' : 'bg-[var(--bg-hover)]',
        className,
      )}
    >
      {options.map(option => {
        const Icon = option.icon;
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
              active
                ? raised
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-raised)]'
                  : 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              buttonClassName,
            )}
            title={option.label}
            aria-pressed={active}
          >
            {showLabels ? (
              <>
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{option.label}</span>
              </>
            ) : (
              <Icon className="h-4 w-4 shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
}
