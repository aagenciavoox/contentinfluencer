import { useEffect, useRef, useState } from 'react';
import type { UIEvent } from 'react';

export function useHideOnScroll(isMobile: boolean) {
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollTop = useRef(0);

  useEffect(() => {
    if (!isMobile) {
      setIsHidden(false);
      lastScrollTop.current = 0;
    }
  }, [isMobile]);

  const handleScroll = (event: UIEvent<HTMLElement>) => {
    if (!isMobile) return;

    const currentScrollTop = event.currentTarget.scrollTop;
    const diff = currentScrollTop - lastScrollTop.current;
    const threshold = 12;
    const minScrollToHide = 80;

    if (currentScrollTop <= 24) {
      setIsHidden(false);
      lastScrollTop.current = 0;
      return;
    }

    if (Math.abs(diff) < threshold) return;

    if (diff > 0 && currentScrollTop > minScrollToHide) {
      setIsHidden(true);
    } else if (diff < 0) {
      setIsHidden(false);
    }

    lastScrollTop.current = currentScrollTop;
  };

  return { isHidden, handleScroll };
}
