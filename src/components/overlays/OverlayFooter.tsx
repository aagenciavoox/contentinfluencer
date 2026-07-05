import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface OverlayFooterProps {
  children: ReactNode;
  className?: string;
}

export function OverlayFooter({ children, className }: OverlayFooterProps) {
  return (
    <div
      className={cn(
        'shrink-0 flex items-center gap-3 border-t border-[var(--border-color)] px-6 py-4',
        className
      )}
    >
      {children}
    </div>
  );
}
