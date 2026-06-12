import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type BadgeVariant = 'status' | 'tag' | 'neutral';

const variantClasses: Record<BadgeVariant, string> = {
  status: 'status-pill t-label-uppercase font-medium',
  tag: 'tag-pill rounded-[var(--radius-pill)] px-2 py-0.5 text-xs font-medium',
  neutral:
    'inline-flex items-center rounded-[var(--radius-pill)] border border-[var(--border-color)] bg-[var(--bg-hover)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]',
};

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return <span className={cn(variantClasses[variant], className)}>{children}</span>;
}
