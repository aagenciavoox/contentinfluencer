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
  /**
   * Motivo mostrado quando o botão está desabilitado: vira `title` e descrição
   * para leitor de tela (`aria-describedby`). Com esta prop o botão fica dentro de
   * um `span` inline-flex, porque botão desabilitado não recebe hover; classes de
   * layout passadas em `className` continuam no botão.
   */
  disabledReason?: string;
}

/**
 * sm/md: 44px no celular e 40px a partir de `md:` (tokens de controle do DESIGN.md).
 * A altura passa por uma variável para que um `h-*` em `className` continue valendo
 * em todas as larguras.
 */
const responsiveControlHeight =
  '[--app-button-height:var(--control-height-mobile)] md:[--app-button-height:var(--control-height)]';

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'h-8 px-3',
  sm: `${responsiveControlHeight} h-[var(--app-button-height)] px-4`,
  md: `${responsiveControlHeight} h-[var(--app-button-height)] px-4`,
  lg: 'h-11 px-4',
};

const iconOnlySizeClasses: Record<ButtonSize, string> = {
  xs: 'h-8 w-8',
  sm: `${responsiveControlHeight} h-[var(--app-button-height)] w-[var(--app-button-height)]`,
  md: `${responsiveControlHeight} h-[var(--app-button-height)] w-[var(--app-button-height)]`,
  lg: 'h-11 w-11',
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border border-[var(--brand-accent-strong)] bg-[var(--brand-accent-strong)] text-[var(--brand-on-accent)] shadow-none hover:opacity-90',
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
      disabledReason,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const reasonId = React.useId();
    const showDisabledReason = Boolean(disabled && disabledReason);
    const describedBy = showDisabledReason
      ? [ariaDescribedBy, reasonId].filter(Boolean).join(' ')
      : ariaDescribedBy;

    const button = (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        aria-describedby={describedBy}
        className={cn(
          'inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-input)] text-[length:var(--font-size-button)] font-semibold tracking-normal transition-[background-color,border-color,color,box-shadow,transform,opacity,filter] duration-150',
          variant === 'primary'
            ? 'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring-brand)]'
            : 'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
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

    if (!disabledReason) return button;

    // O span recebe o hover (o botão desabilitado tem pointer-events-none) e mostra o title.
    // O motivo fica num elemento oculto lido só pelo aria-describedby, sem repetir a leitura.
    return (
      <span
        title={showDisabledReason ? disabledReason : undefined}
        className={cn(
          'inline-flex max-w-full shrink-0',
          showDisabledReason && 'cursor-not-allowed',
          fullWidth && 'flex w-full'
        )}
      >
        {button}
        {showDisabledReason ? (
          <span id={reasonId} hidden>
            {disabledReason}
          </span>
        ) : null}
      </span>
    );
  }
);

AppButton.displayName = 'AppButton';
