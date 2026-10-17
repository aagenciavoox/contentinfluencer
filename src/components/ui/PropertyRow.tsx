import type { ReactNode } from 'react';
import { SelectMenu, selectChangeEvent, selectOptionsFromChildren } from './SelectMenu';
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
    <section className={cn('stack-lg', className)}>
      {(label || action) && (
        <header className="flex items-center justify-between gap-2">
          {label ? <span className="panel-section-title">{label}</span> : <span />}
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

/**
 * Chromeless inline select for use inside a PropertyRow value slot.
 * Mesma API de `<select>` (filhos `<option>`, `onChange` com `event.target.value`), mas abre a
 * lista do design system (`SelectMenu`) em vez da lista nativa.
 */
export function PropertySelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const {
    className,
    children,
    value,
    defaultValue,
    onChange,
    disabled,
    id,
    'aria-label': ariaLabel,
    'aria-describedby': describedBy,
  } = props;
  const options = selectOptionsFromChildren(children);
  const current = String(value ?? defaultValue ?? options[0]?.value ?? '');
  const currentLabel = options.find(option => option.value === current)?.label ?? current;

  const handleChange = (next: string) => {
    onChange?.(selectChangeEvent(next));
  };

  return (
    <SelectMenu
      id={id}
      value={current}
      onChange={handleChange}
      options={options}
      ariaLabel={ariaLabel}
      describedBy={describedBy}
      disabled={disabled}
      triggerClassName={cn(
        'property-input flex min-w-0 cursor-pointer items-center pr-6 aria-expanded:bg-[var(--bg-elevated)]',
        className,
      )}
    >
      <span className="min-w-0 flex-1 truncate">{currentLabel}</span>
    </SelectMenu>
  );
}

/** Chromeless inline `<textarea>` for use inside a PropertyRow value slot. */
export function PropertyTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return <textarea {...rest} className={cn('property-input resize-none', className)} />;
}
