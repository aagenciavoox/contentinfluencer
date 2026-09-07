import type { ReactNode, UIEvent } from 'react';
import { useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { useMobileScrollLock } from '../../context/MobileScrollLockContext';

interface MobileAppShellProps {
  header: ReactNode;
  bottomNav: ReactNode;
  overlay?: ReactNode;
  children: ReactNode;
  className?: string;
  compactHeader?: boolean;
  hideHeader?: boolean;
  hideBottomNav?: boolean;
  onScroll?: (event: UIEvent<HTMLElement>) => void;
  onPullRefresh?: () => Promise<void>;
}

export function MobileAppShell({
  header,
  bottomNav,
  overlay,
  children,
  className,
  compactHeader: _compactHeader = false,
  hideHeader = false,
  hideBottomNav = false,
  onScroll,
  onPullRefresh,
}: MobileAppShellProps) {
  const { registerMainElement } = useMobileScrollLock() ?? {};
  const { containerRef, pullDistance, isRefreshing, progress, isActive } = usePullToRefresh(
    hideBottomNav ? undefined : onPullRefresh,
  );

  const setMainRef = useCallback(
    (node: HTMLElement | null) => {
      containerRef.current = node;
      registerMainElement?.(node);
    },
    [containerRef, registerMainElement],
  );

  return (
    <div className={cn('relative flex h-dvh flex-col overflow-hidden bg-[var(--bg-primary)]', className)}>
      {hideHeader ? null : header}

      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 z-20 flex justify-center transition-opacity duration-150',
          isActive ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          top: hideHeader
            ? 'calc(env(safe-area-inset-top, 0px) + 1rem)'
            : 'calc(env(safe-area-inset-top, 0px) + 3.5rem)',
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
        ref={setMainRef}
        onScroll={onScroll}
        className={cn(
          'flex-1 min-h-0 overflow-y-auto overscroll-y-contain',
          hideBottomNav
            ? 'pb-0'
            : 'pb-[calc(env(safe-area-inset-bottom)+5.5rem)]',
          hideHeader
            ? 'px-0 pt-0'
            : 'px-4 pt-[calc(env(safe-area-inset-top)+3.5rem)]',
        )}
        style={{
          transform: isActive ? `translateY(${pullDistance}px)` : undefined,
          transition: isActive && !isRefreshing ? 'none' : 'transform 180ms ease-out',
        }}
      >
        <div className="min-h-full">{children}</div>
      </main>

      {hideBottomNav ? null : bottomNav}
      {overlay}
    </div>
  );
}
