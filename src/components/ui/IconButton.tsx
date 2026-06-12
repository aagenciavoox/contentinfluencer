import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

type IconButtonVariant = 'ghost' | 'outlined';
type IconButtonSize = 'sm' | 'md';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
}

const sizeClasses: Record<IconButtonSize, string> = {
  sm: 'min-h-9 min-w-9 p-1.5',
  md: 'min-h-11 min-w-11 p-2',
};

const variantClasses: Record<IconButtonVariant, string> = {
  ghost: 'border-transparent bg-transparent hover:bg-[var(--bg-hover)]',
  outlined: 'border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)]',
};

export function IconButton({
  label,
  children,
  variant = 'ghost',
  size = 'md',
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center rounded-[var(--radius-card)] text-[var(--text-tertiary)] transition-colors disabled:opacity-40',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
