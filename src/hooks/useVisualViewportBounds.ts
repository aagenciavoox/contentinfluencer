import { useLayoutEffect, useState } from 'react';

type ViewportBounds = Pick<VisualViewport, 'height' | 'offsetTop'>;

export function observeVisualViewport(
  viewport: VisualViewport,
  onChange: (bounds: ViewportBounds) => void,
) {
  const update = () => onChange({
    height: viewport.height,
    offsetTop: viewport.offsetTop,
  });

  update();
  viewport.addEventListener('resize', update);
  viewport.addEventListener('scroll', update);

  return () => {
    viewport.removeEventListener('resize', update);
    viewport.removeEventListener('scroll', update);
  };
}

/** Follows the visible area, including iOS keyboard resizing and viewport panning. */
export function useVisualViewportBounds(enabled: boolean) {
  const [bounds, setBounds] = useState<ViewportBounds | null>(null);

  useLayoutEffect(() => {
    if (!enabled || !window.visualViewport) return;
    return observeVisualViewport(window.visualViewport, setBounds);
  }, [enabled]);

  return enabled ? bounds : null;
}
