import { ElementType, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type TextVariant =
  | 'display'
  | 'pageTitle'
  | 'sectionTitle'
  | 'spotlightTitle'
  | 'itemTitle'
  | 'body'
  | 'bodyStrong'
  | 'secondary'
  | 'meta'
  | 'label'
  | 'eyebrow';

const variantClasses: Record<TextVariant, string> = {
  display: 't-display font-serif text-[var(--text-primary)]',
  pageTitle: 't-page-title text-[var(--text-primary)]',
  sectionTitle: 't-section-title text-[var(--text-primary)]',
  /** Título grande de destaque (2rem bold) — usado em spotlight cards */
  spotlightTitle: 'notion-title text-[var(--text-primary)]',
  itemTitle: 't-item-title text-[var(--text-primary)]',
  body: 't-body text-[var(--text-primary)]',
  bodyStrong: 't-body-strong text-[var(--text-primary)]',
  /** Texto auxiliar pequeno (13px, cor text-secondary) */
  secondary: 't-secondary',
  meta: 't-meta',
  label: 't-label text-[var(--text-tertiary)]',
  /** Label eyebrow — uppercase, 11px, espaçado — para seções e spotlight */
  eyebrow: 'eyebrow-label',
};

const defaultElements: Record<TextVariant, ElementType> = {
  display: 'h1',
  pageTitle: 'h1',
  sectionTitle: 'h2',
  spotlightTitle: 'h2',
  itemTitle: 'h3',
  body: 'p',
  bodyStrong: 'p',
  secondary: 'p',
  meta: 'span',
  label: 'span',
  eyebrow: 'span',
};

interface TextProps {
  variant?: TextVariant;
  as?: ElementType;
  children: ReactNode;
  className?: string;
  truncate?: boolean;
  uppercase?: boolean;
}

export function Text({
  variant = 'body',
  as,
  children,
  className,
  truncate = false,
  uppercase = false,
}: TextProps) {
  const Component = as ?? defaultElements[variant];

  return (
    <Component
      className={cn(
        variantClasses[variant],
        truncate && 'truncate',
        uppercase && 't-label-uppercase',
        className
      )}
    >
      {children}
    </Component>
  );
}
