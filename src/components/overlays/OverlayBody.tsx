import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface OverlayBodyProps {
  children: ReactNode;
  className?: string;
}

export function OverlayBody({ children, className }: OverlayBodyProps) {
  return (
    <div className={cn('flex-1 min-h-0 overflow-y-auto px-6 py-4', className)}>{children}</div>
  );
}
