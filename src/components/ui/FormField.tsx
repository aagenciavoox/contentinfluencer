import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Text } from './Text';

interface FormFieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}

export function FormField({ label, hint, error, children, className, htmlFor }: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="t-label block text-[var(--text-secondary)]">
        {label}
      </label>
      {children}
      {error ? (
        <Text variant="meta" className="text-[var(--accent-red)]">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="meta">{hint}</Text>
      ) : null}
    </div>
  );
}
