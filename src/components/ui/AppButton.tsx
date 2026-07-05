import React from 'react';
import { cn } from '../../lib/utils';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost';

type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  iconOnly?: boolean;
}

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'h-8 px-3',
  sm: 'h-9 px-3',
  md: 'h-10 px-4',
  lg: 'h-11 px-4',
};

const iconOnlySizeClasses: Record<ButtonSize, string> = {
  xs: 'h-8 w-8',
  sm: 'h-9 w-9',
  md: 'h-10 w-10',
  lg: 'h-11 w-11',
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border border-[var(--accent)] bg-[var(--accent)] text-[var(--bg-secondary)] shadow-none hover:opacity-90',
  secondary:
    'border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-none hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)]',
  ghost:
    'border border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
};

export const AppButton = React.forwardRef<HTMLButtonElement, AppButtonProps>(
  (
    {
      className,
      children,
      variant = 'secondary',
      size = 'md',
      fullWidth = false,
      leftIcon,
      rightIcon,
      iconOnly = false,
      type = 'button',
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          'inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-input)] text-[length:var(--font-size-button)] font-semibold tracking-normal transition-[background-color,border-color,color,box-shadow,transform,opacity,filter] duration-150',
          'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
          'disabled:pointer-events-none disabled:opacity-45',
          iconOnly ? iconOnlySizeClasses[size] : sizeClasses[size],
          variantClasses[variant],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {leftIcon ? <span className="flex items-center justify-center">{leftIcon}</span> : null}
        {!iconOnly ? <span className="truncate">{children}</span> : null}
        {rightIcon ? <span className="flex items-center justify-center">{rightIcon}</span> : null}
        {iconOnly && !leftIcon && !rightIcon ? children : null}
      </button>
    );
  }
);

AppButton.displayName = 'AppButton';
