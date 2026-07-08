import { useEffect } from 'react';
import { useMobileScrollLock } from '../context/MobileScrollLockContext';

let globalLockCount = 0;
let bodyOriginalOverflow = '';
let mainOriginalOverflow = '';

export function useBodyScrollLock(lock: boolean) {
  const scrollLock = useMobileScrollLock();
  const acquireScrollLock = scrollLock?.acquireScrollLock;
  const releaseScrollLock = scrollLock?.releaseScrollLock;
  const mainElementRef = scrollLock?.mainElementRef;

  useEffect(() => {
    if (!lock) return;

    const mainElement = mainElementRef?.current ?? null;

    if (globalLockCount === 0) {
      bodyOriginalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.setAttribute('data-scroll-locked', '');

      if (mainElement) {
        mainOriginalOverflow = mainElement.style.overflow;
        mainElement.style.overflow = 'hidden';
      }
    }

    globalLockCount++;
    acquireScrollLock?.();

    return () => {
      globalLockCount = Math.max(0, globalLockCount - 1);
      releaseScrollLock?.();

      if (globalLockCount === 0) {
        document.body.style.overflow = bodyOriginalOverflow;
        document.documentElement.removeAttribute('data-scroll-locked');

        const currentMain = mainElementRef?.current ?? mainElement;
        if (currentMain) {
          currentMain.style.overflow = mainOriginalOverflow;
        }
      }
    };
  }, [lock, acquireScrollLock, releaseScrollLock, mainElementRef]);
}
