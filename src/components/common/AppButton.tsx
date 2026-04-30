import React from 'react';
import { cn } from '../../lib/utils';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'danger'
  | 'success'
  | 'info'
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
  xs: 'h-7 px-3',
  sm: 'h-8 px-3.5',
  md: 'h-10 px-4',
  lg: 'h-12 px-5',
};

const iconOnlySizeClasses: Record<ButtonSize, string> = {
  xs: 'h-7 w-7',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border border-[#101826] bg-[#101826] text-white shadow-[0_8px_18px_rgba(16,24,38,0.14)] hover:bg-[#1a2436]',
  secondary:
    'border border-[var(--border-strong)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
  tertiary:
    'border border-[var(--border-color)] bg-[linear-gradient(180deg,#ffffff,#f7f8fb)] text-[var(--text-primary)] hover:border-[var(--border-strong)]',
  danger:
    'border border-[#ff8d8d] bg-white text-[#ff3b30] hover:bg-[#fff5f5]',
  success:
    'border border-[#0dbb63] bg-[#10b864] text-white hover:bg-[#0fa75b]',
  info:
    'border border-[#2d73ff] bg-[#2d73ff] text-white hover:bg-[#2464e3]',
  ghost:
    'border border-transparent bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
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
          't-button inline-flex shrink-0 items-center justify-center gap-2 rounded-md transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bg-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--text-primary)]',
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
