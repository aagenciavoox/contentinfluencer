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
}

export function ViewModeToggle<T extends string>({
  value,
  options,
  onChange,
  className,
  buttonClassName,
  showLabels = false,
}: ViewModeToggleProps<T>) {
  return (
    <div className={cn('flex shrink-0 rounded-xl border border-[var(--border-color)] bg-[var(--bg-hover)] p-1', className)}>
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
                ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
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
