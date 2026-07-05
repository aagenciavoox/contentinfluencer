import type {ReactNode} from 'react';
import {cn} from '../../lib/utils';

interface TooltipProps {
  label: string;
  children: ReactNode;
  side?: 'right' | 'top';
  className?: string;
}

export function Tooltip({label, children, side = 'right', className}: TooltipProps) {
  return (
    <div className={cn('group/tooltip relative flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-md border border-[var(--border-color)] bg-[var(--bg-elevated)] px-2.5 py-1.5 t-meta font-medium text-[var(--text-primary)] opacity-0 shadow-md transition-opacity duration-150 group-hover/tooltip:opacity-100',
          side === 'right' && 'left-[calc(100%+8px)] top-1/2 -translate-y-1/2',
          side === 'top' && 'bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2'
        )}
      >
        {label}
      </span>
    </div>
  );
}
