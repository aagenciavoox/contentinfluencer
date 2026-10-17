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
  // `sm` é pequeno no desenho; no toque vai a 44px (mínimo do DESIGN.md para o celular).
  sm: 'min-h-9 min-w-9 p-1.5 pointer-coarse:min-h-11 pointer-coarse:min-w-11',
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
        'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
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
