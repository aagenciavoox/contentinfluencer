import { useCallback, useEffect, useRef } from 'react';

/**
 * Marca uma fileira rolável (chips, abas) com `data-fade-start` / `data-fade-end`
 * quando há conteúdo escondido de cada lado. O CSS `.scroll-edge-fade` usa essas
 * marcas para esmaecer a borda: a pessoa vê que a fileira continua.
 */
export function useScrollEdgeFade<T extends HTMLElement>(axis: 'x' | 'y' = 'x') {
  const nodeRef = useRef<T | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const update = useCallback(() => {
    const node = nodeRef.current;
    if (!node) return;
    const position = axis === 'x' ? node.scrollLeft : node.scrollTop;
    const visible = axis === 'x' ? node.clientWidth : node.clientHeight;
    const total = axis === 'x' ? node.scrollWidth : node.scrollHeight;
    const hasStart = position > 2;
    const hasEnd = position + visible < total - 2;
    node.toggleAttribute('data-fade-start', hasStart);
    node.toggleAttribute('data-fade-end', hasEnd);
  }, [axis]);

  const ref = useCallback(
    (node: T | null) => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      nodeRef.current = node;
      if (!node) return;

      update();
      node.addEventListener('scroll', update, { passive: true });
      const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
      observer?.observe(node);
      Array.from(node.children).forEach(child => observer?.observe(child));
      cleanupRef.current = () => {
        node.removeEventListener('scroll', update);
        observer?.disconnect();
      };
    },
    [update],
  );

  useEffect(() => () => cleanupRef.current?.(), []);

  return { ref, update };
}
