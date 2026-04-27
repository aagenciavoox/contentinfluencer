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
}

export function ViewModeToggle<T extends string>({
  value,
  options,
  onChange,
  className,
  buttonClassName,
}: ViewModeToggleProps<T>) {
  return (
    <div className={cn('flex bg-[var(--bg-hover)] rounded-xl p-1 border border-[var(--border-color)] shrink-0', className)}>
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'p-2 rounded-lg transition-all text-[var(--text-tertiary)]',
              active && 'bg-[var(--bg-primary)] text-[var(--accent-blue)]',
              buttonClassName
            )}
            title={option.label}
            aria-pressed={active}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}
