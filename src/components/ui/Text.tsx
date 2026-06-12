import { ElementType, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type TextVariant =
  | 'pageTitle'
  | 'sectionTitle'
  | 'itemTitle'
  | 'body'
  | 'bodyStrong'
  | 'meta'
  | 'label';

const variantClasses: Record<TextVariant, string> = {
  pageTitle: 't-page-title text-[var(--text-primary)]',
  sectionTitle: 't-section-title text-[var(--text-primary)]',
  itemTitle: 't-item-title text-[var(--text-primary)]',
  body: 't-body text-[var(--text-primary)]',
  bodyStrong: 't-body-strong text-[var(--text-primary)]',
  meta: 't-meta',
  label: 't-label text-[var(--text-tertiary)]',
};

const defaultElements: Record<TextVariant, ElementType> = {
  pageTitle: 'h1',
  sectionTitle: 'h2',
  itemTitle: 'h3',
  body: 'p',
  bodyStrong: 'p',
  meta: 'span',
  label: 'span',
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
