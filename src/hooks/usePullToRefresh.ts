import { useCallback, useEffect, useRef, useState } from 'react';
import { useMobileScrollLock } from '../context/MobileScrollLockContext';

const PULL_THRESHOLD = 72;
const MAX_PULL = 112;

export function usePullToRefresh(onRefresh?: () => Promise<void>) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const pullDistanceRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const containerRef = useRef<HTMLElement | null>(null);
  const onRefreshRef = useRef(onRefresh);
  const scrollLock = useMobileScrollLock();
  const isScrollLockedRef = useRef(scrollLock?.isScrollLocked ?? false);
  isScrollLockedRef.current = scrollLock?.isScrollLocked ?? false;

  onRefreshRef.current = onRefresh;
  pullDistanceRef.current = pullDistance;
  isRefreshingRef.current = isRefreshing;

  const resetPull = useCallback(() => {
    pulling.current = false;
    pullDistanceRef.current = 0;
    setPullDistance(0);
  }, []);

  const runRefresh = useCallback(async () => {
    const refresh = onRefreshRef.current;
    if (!refresh || isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    setIsRefreshing(true);
    pullDistanceRef.current = PULL_THRESHOLD;
    setPullDistance(PULL_THRESHOLD);

    try {
      await refresh();
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
      resetPull();
    }
  }, [resetPull]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onRefresh) return;

    const isPullDisabled = () =>
      isRefreshingRef.current ||
      isScrollLockedRef.current ||
      document.documentElement.hasAttribute('data-scroll-locked');

    const handleTouchStart = (event: TouchEvent) => {
      if (isPullDisabled() || container.scrollTop > 0) return;
      startY.current = event.touches[0]?.clientY ?? 0;
      pulling.current = true;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!pulling.current || isPullDisabled()) return;

      if (container.scrollTop > 0) {
        resetPull();
        return;
      }

      const currentY = event.touches[0]?.clientY ?? startY.current;
      const delta = currentY - startY.current;

      if (delta <= 0) {
        pullDistanceRef.current = 0;
        setPullDistance(0);
        return;
      }

      event.preventDefault();
      const nextDistance = Math.min(delta * 0.45, MAX_PULL);
      pullDistanceRef.current = nextDistance;
      setPullDistance(nextDistance);
    };

    const handleTouchEnd = () => {
      if (!pulling.current) return;

      if (pullDistanceRef.current >= PULL_THRESHOLD && !isRefreshingRef.current && !isPullDisabled()) {
        void runRefresh();
        return;
      }

      resetPull();
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [onRefresh, resetPull, runRefresh]);

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return {
    containerRef,
    pullDistance,
    isRefreshing,
    progress,
    isActive: pullDistance > 0 || isRefreshing,
  };
}
