import {Plus} from 'lucide-react';
import {cn} from '../../../../lib/utils';

interface PipelineStatusPillsProps {
  options: string[];
  active: string;
  counts: Record<string, number>;
  onChange: (status: string) => void;
  className?: string;
}

export function PipelineStatusPills({
  options,
  active,
  counts,
  onChange,
  className,
}: PipelineStatusPillsProps) {
  const visible = options.filter(option => {
    if (option === 'Todos' || option === active) return true;
    const count = counts[option];
    return typeof count === 'number' ? count > 0 : true;
  });

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {visible.map(option => {
        const count = counts[option];
        const isActive = option === active;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
              isActive
                ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                : 'border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]',
            )}
          >
            {option}
            {typeof count === 'number' ? (
              <span
                className={cn(
                  'tabular-nums',
                  isActive ? 'text-[var(--bg-primary)]/80' : 'text-[var(--text-tertiary)]',
                )}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
      <button
        type="button"
        className="inline-flex min-h-9 items-center gap-1 rounded-full border border-dashed border-[var(--border-color)] px-3 py-1 text-xs font-semibold text-[var(--text-tertiary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        title="Filtros salvos em breve"
      >
        <Plus className="h-3 w-3" />
        Salvos
      </button>
    </div>
  );
}
