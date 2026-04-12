import React, { useState, useEffect, useRef } from 'react';

export function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const lastScrollTop = useRef(0);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      // Verificamos se é um elemento válido com scrollTop
      if (!target || target.scrollTop === undefined) return;
      
      const currentOffset = target.scrollTop;
      const diff = currentOffset - lastScrollTop.current;
      
      const threshold = 10;
      
      if (Math.abs(diff) > threshold) {
        const direction = diff > 0 ? 'down' : 'up';
        setScrollDirection(direction);
        lastScrollTop.current = currentOffset;
      }
    };

    // Usamos capture: true para capturar scrolls em qualquer sub-elemento
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', handleScroll, { capture: true });
  }, []);

  return scrollDirection;
}
