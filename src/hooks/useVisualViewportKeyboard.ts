import { useEffect, useState } from 'react';

const KEYBOARD_OPEN_PX = 80;

export function useVisualViewportKeyboard() {
  const [inset, setInset] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => {
      const nextInset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setInset(nextInset);
      setOpen(nextInset > KEYBOARD_OPEN_PX);
    };

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    window.addEventListener('orientationchange', update);

    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return { inset, open };
}
