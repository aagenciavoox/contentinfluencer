import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { getStatusClassName } from '../../lib/statusClasses';

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
  /** Content pipeline status label — applies tinted status-pill-* class when variant is status. */
  status?: string;
  className?: string;
}

export function Badge({ children, variant = 'neutral', status, className }: BadgeProps) {
  const resolvedClass =
    variant === 'status' && status ? getStatusClassName(status) : variantClasses[variant];

  return <span className={cn(resolvedClass, className)}>{children}</span>;
}
