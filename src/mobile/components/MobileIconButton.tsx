import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { IconButton } from '../../components/ui/IconButton';
import { cn } from '../../lib/utils';

interface MobileIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

/** @deprecated Use IconButton from components/ui */
export function MobileIconButton({ label, children, className, ...props }: MobileIconButtonProps) {
  return (
    <IconButton
      label={label}
      variant="outlined"
      className={cn('rounded-[var(--radius-card-mobile)]', className)}
      {...props}
    >
      {children}
    </IconButton>
  );
}
