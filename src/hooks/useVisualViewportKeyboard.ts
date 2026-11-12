import { useEffect, useState } from 'react';

const KEYBOARD_OPEN_PX = 80;

export function useVisualViewportKeyboard() {
  const [inset, setInset] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      // Inteiro e só atualiza se mudou: no iOS o visualViewport dispara
      // resize/scroll o tempo todo ao digitar e re-renderizar o editor travava a tela.
      const nextInset = Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop));
      setInset(previous => (previous === nextInset ? previous : nextInset));
      setOpen(previous => {
        const nextOpen = nextInset > KEYBOARD_OPEN_PX;
        return previous === nextOpen ? previous : nextOpen;
      });
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    viewport.addEventListener('resize', schedule);
    viewport.addEventListener('scroll', schedule);
    window.addEventListener('orientationchange', schedule);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', schedule);
      viewport.removeEventListener('scroll', schedule);
      window.removeEventListener('orientationchange', schedule);
    };
  }, []);

  return { inset, open };
}
