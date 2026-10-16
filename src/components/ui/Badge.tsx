import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { getStatusClassName } from '../../lib/statusClasses';

export type BadgeVariant = 'status' | 'tag' | 'neutral' | 'warning';

// Selo só informa: fundo suave, sem borda. Pílula com borda fica para o que filtra ou remove
// (chips e etiquetas removíveis), para os dois não parecerem a mesma coisa.
const variantClasses: Record<BadgeVariant, string> = {
  status: 'status-pill t-label-uppercase font-medium',
  tag: 'inline-flex items-center rounded-[var(--radius-pill)] border border-transparent bg-[var(--tag-bg)] px-2 py-0.5 text-xs font-medium text-[var(--tag-text)]',
  neutral:
    'inline-flex items-center rounded-[var(--radius-pill)] border border-transparent bg-[var(--bg-hover)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]',
  // Atenção: o tom de alerta só tinge o fundo; o texto fica em --text-primary (contraste AA).
  warning:
    'inline-flex items-center rounded-[var(--radius-pill)] border border-transparent bg-[color-mix(in_srgb,var(--warning)_18%,transparent)] px-2 py-0.5 text-xs font-medium text-[var(--text-primary)]',
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
