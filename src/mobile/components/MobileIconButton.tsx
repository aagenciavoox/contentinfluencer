import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface MobileIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

export function MobileIconButton({ label, children, className, type = 'button', ...props }: MobileIconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        'inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] transition-colors active:scale-[0.98] disabled:opacity-40',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
