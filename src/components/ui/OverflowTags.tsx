import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface OverflowTagsProps {
  items: ReactNode[];
  max?: number;
  className?: string;
}

/** Shows the first tag and a +N counter for the rest. */
export function OverflowTags({ items, max = 1, className }: OverflowTagsProps) {
  const visible = items.slice(0, max);
  const extra = items.length - visible.length;

  if (items.length === 0) return null;

  return (
    <div className={cn('flex min-w-0 flex-wrap items-center gap-1', className)}>
      {visible}
      {extra > 0 ? (
        <span className="inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--bg-hover)] px-1.5 py-0.5 text-xs font-semibold tabular-nums text-[var(--text-secondary)]">
          +{extra}
        </span>
      ) : null}
    </div>
  );
}
