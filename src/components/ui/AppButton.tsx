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
    'border border-[color-mix(in_srgb,var(--accent-blue),var(--accent-purple)_18%)] bg-[color-mix(in_srgb,var(--accent-blue),var(--accent-purple)_18%)] text-white shadow-[0_12px_26px_color-mix(in_srgb,var(--accent-blue),transparent_84%)] hover:-translate-y-0.5 hover:shadow-[0_16px_34px_color-mix(in_srgb,var(--accent-blue),transparent_80%)]',
  secondary:
    'border border-[var(--border-color)] bg-[color-mix(in_srgb,var(--bg-elevated),transparent_10%)] text-[var(--text-primary)] shadow-[0_1px_0_rgba(255,255,255,0.55)_inset] hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)]',
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
          'inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-input)] text-[13px] font-semibold tracking-normal transition-[background-color,border-color,color,box-shadow,transform,opacity,filter] duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-secondary)]',
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
