import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

/**
 * Linear/Notion-style property primitives.
 *
 * Composition over chrome: a property is an inline row of
 * `icon + label` on the left and an editable/value slot on the right.
 * Rows have no borders — grouping comes from `PropertySection` labels
 * and vertical spacing.
 */

interface PropertyListProps {
  children: ReactNode;
  className?: string;
}

export function PropertyList({ children, className }: PropertyListProps) {
  return <div className={cn('property-list', className)}>{children}</div>;
}

interface PropertySectionProps {
  label?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PropertySection({ label, action, children, className }: PropertySectionProps) {
  return (
    <section className={cn('space-y-1.5', className)}>
      {(label || action) && (
        <header className="flex items-center justify-between gap-2 px-2">
          {label ? <span className="eyebrow-label">{label}</span> : <span />}
          {action}
        </header>
      )}
      <PropertyList>{children}</PropertyList>
    </section>
  );
}

interface PropertyRowProps {
  label: string;
  icon?: ReactNode;
  /** Static display value. Ignored when `children` is provided. */
  value?: ReactNode;
  /** Render as empty/placeholder styling when no value. */
  empty?: boolean;
  /** Custom right-side content (inputs, selects, pills, …). */
  children?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function PropertyRow({
  label,
  icon,
  value,
  empty = false,
  children,
  onClick,
  className,
}: PropertyRowProps) {
  const interactive = Boolean(onClick);
  const Wrapper = interactive ? 'button' : 'div';

  return (
    <Wrapper
      {...(interactive ? { type: 'button' as const, onClick } : {})}
      className={cn(
        'property-row w-full text-left',
        interactive && 'property-row-interactive focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
        className,
      )}
    >
      <span className="property-row-label">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      {children ? (
        <span className="property-row-value">{children}</span>
      ) : (
        <span className={cn('property-row-value truncate', empty && 'property-row-value--empty')}>
          {value}
        </span>
      )}
    </Wrapper>
  );
}

/** Chromeless inline `<input>` for use inside a PropertyRow value slot. */
export function PropertyInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input {...rest} className={cn('property-input', className)} />;
}

/** Chromeless inline `<select>` for use inside a PropertyRow value slot. */
export function PropertySelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props;
  return (
    <select {...rest} className={cn('property-input', className)}>
      {children}
    </select>
  );
}

/** Chromeless inline `<textarea>` for use inside a PropertyRow value slot. */
export function PropertyTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return <textarea {...rest} className={cn('property-input resize-none', className)} />;
}
