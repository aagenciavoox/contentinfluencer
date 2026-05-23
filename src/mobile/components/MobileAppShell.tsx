import type { ReactNode, UIEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';

interface MobileAppShellProps {
  header: ReactNode;
  bottomNav: ReactNode;
  overlay?: ReactNode;
  children: ReactNode;
  className?: string;
  compactHeader?: boolean;
  onScroll?: (event: UIEvent<HTMLElement>) => void;
  onPullRefresh?: () => Promise<void>;
}

export function MobileAppShell({
  header,
  bottomNav,
  overlay,
  children,
  className,
  compactHeader = false,
  onScroll,
  onPullRefresh,
}: MobileAppShellProps) {
  const { containerRef, pullDistance, isRefreshing, progress, isActive } = usePullToRefresh(onPullRefresh);

  return (
    <div className={cn('relative min-h-screen bg-[var(--bg-primary)] md:hidden', className)}>
      {header}

      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 z-20 flex justify-center transition-opacity duration-150',
          isActive ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          top: `calc(env(safe-area-inset-top, 0px) + ${compactHeader ? 4.25 : 8.5}rem)`,
          transform: `translateY(${Math.max(pullDistance - 28, 0)}px)`,
        }}
      >
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-elevated)] shadow-sm',
            isRefreshing && 'border-[var(--accent-blue)]',
          )}
        >
          <Loader2
            className={cn(
              'h-4 w-4 text-[var(--text-secondary)]',
              isRefreshing && 'animate-spin text-[var(--accent-blue)]',
            )}
            style={!isRefreshing ? { transform: `rotate(${progress * 360}deg)` } : undefined}
          />
        </div>
      </div>

      <main
        ref={containerRef}
        onScroll={onScroll}
        className={cn(
          'min-h-screen overflow-y-auto overscroll-y-contain px-4 pb-[calc(env(safe-area-inset-bottom)+6.75rem)] max-[390px]:pb-[calc(env(safe-area-inset-bottom)+6.25rem)]',
          compactHeader
            ? 'pt-[calc(env(safe-area-inset-top)+4.25rem)]'
            : 'pt-[calc(env(safe-area-inset-top)+8.5rem)] max-[390px]:pt-[calc(env(safe-area-inset-top)+7.5rem)]',
        )}
        style={{
          transform: isActive ? `translateY(${pullDistance}px)` : undefined,
          transition: isActive && !isRefreshing ? 'none' : 'transform 180ms ease-out',
        }}
      >
        <div className="min-h-[calc(100vh-12rem)]">{children}</div>
      </main>

      {bottomNav}
      {overlay}
    </div>
  );
}
