import { ElementType, ReactNode, KeyboardEvent } from 'react';
import { cn } from '../../lib/utils';

export type SurfaceVariant = 'plain' | 'outlined' | 'interactive' | 'elevated';

const variantClasses: Record<SurfaceVariant, string> = {
  plain: 'surface-plain',
  outlined: 'surface-outlined',
  interactive: 'surface-interactive editorial-card-interactive',
  elevated: 'surface-elevated',
};

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
} as const;

interface SurfaceProps {
  children: ReactNode;
  variant?: SurfaceVariant;
  padding?: keyof typeof paddingClasses;
  className?: string;
  as?: ElementType;
  onClick?: () => void;
}

export function Surface({
  children,
  variant = 'outlined',
  padding = 'md',
  className,
  as,
  onClick,
}: SurfaceProps) {
  const isInteractive = Boolean(onClick);
  const Component = as ?? (isInteractive ? 'button' : 'div');
  const isFocusable = isInteractive || Component === 'button';
  const resolvedVariant = isInteractive && variant === 'outlined' ? 'interactive' : variant;

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!onClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <Component
      type={Component === 'button' ? 'button' : undefined}
      onClick={onClick}
      onKeyDown={Component === 'div' && onClick ? handleKeyDown : undefined}
      role={Component === 'div' && onClick ? 'button' : undefined}
      tabIndex={Component === 'div' && onClick ? 0 : undefined}
      className={cn(
        variantClasses[resolvedVariant],
        paddingClasses[padding],
        isInteractive && Component === 'button' && 'w-full text-left',
        isFocusable && 'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
        className
      )}
    >
      {children}
    </Component>
  );
}
