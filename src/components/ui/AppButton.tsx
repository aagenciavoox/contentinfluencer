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
  xs: 'h-10 px-4',
  sm: 'h-10 px-4',
  md: 'h-10 px-4',
  lg: 'h-10 px-4',
};

const iconOnlySizeClasses: Record<ButtonSize, string> = {
  xs: 'h-10 w-10',
  sm: 'h-10 w-10',
  md: 'h-10 w-10',
  lg: 'h-10 w-10',
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border border-[#0F172A] bg-[#0F172A] text-white shadow-[0_8px_18px_rgba(15,23,42,0.14)] hover:bg-[#111c33]',
  secondary:
    'border border-[#E5E7EB] bg-white text-[#0F172A] hover:bg-[#F8FAFC]',
  ghost:
    'border border-transparent bg-transparent text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]',
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
          'inline-flex shrink-0 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black uppercase tracking-[0.08em] transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] focus-visible:ring-offset-2 focus-visible:ring-offset-white',
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
