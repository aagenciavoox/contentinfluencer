import type { ReactNode, UIEvent } from 'react';
import { cn } from '../../lib/utils';

interface MobileAppShellProps {
  header: ReactNode;
  bottomNav: ReactNode;
  overlay?: ReactNode;
  children: ReactNode;
  className?: string;
  onScroll?: (event: UIEvent<HTMLElement>) => void;
}

export function MobileAppShell({
  header,
  bottomNav,
  overlay,
  children,
  className,
  onScroll,
}: MobileAppShellProps) {
  return (
    <div className={cn('relative min-h-screen bg-[var(--bg-primary)] md:hidden', className)}>
      {header}
      <main
        onScroll={onScroll}
        className="min-h-screen overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-[calc(env(safe-area-inset-top)+8.5rem)]"
      >
        <div className="min-h-[calc(100vh-12rem)]">{children}</div>
      </main>
      {bottomNav}
      {overlay}
    </div>
  );
}
