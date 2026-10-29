import {useEffect, useRef} from 'react';
import {cn} from '../../../../lib/utils';

interface DraftSplitDividerProps {
  onDrag: (clientX: number) => void;
  onDragEnd?: () => void;
  className?: string;
}

/** Divisória vertical discreta entre roteiro e rascunho. */
export function DraftSplitDivider({onDrag, onDragEnd, className}: DraftSplitDividerProps) {
  const draggingRef = useRef(false);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!draggingRef.current) return;
      event.preventDefault();
      onDrag(event.clientX);
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
      onDragEnd?.();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [onDrag, onDragEnd]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Ajustar largura do rascunho"
      tabIndex={0}
      onPointerDown={event => {
        if (event.button !== 0) return;
        event.preventDefault();
        draggingRef.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        onDrag(event.clientX);
      }}
      onKeyDown={event => {
        const step = event.shiftKey ? 40 : 16;
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          onDrag(event.currentTarget.getBoundingClientRect().left - step);
          onDragEnd?.();
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          onDrag(event.currentTarget.getBoundingClientRect().right + step);
          onDragEnd?.();
        }
      }}
      className={cn(
        'group relative z-10 flex w-3 shrink-0 cursor-col-resize items-stretch justify-center',
        'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--border-color)] transition group-hover:bg-[var(--brand-accent)] group-focus-visible:bg-[var(--brand-accent)]"
      />
      <span
        aria-hidden
        className="my-auto grid grid-cols-2 gap-0.5 rounded-sm bg-[var(--bg-elevated)] p-0.5 opacity-70 transition group-hover:opacity-100"
      >
        {Array.from({length: 4}, (_, index) => (
          <span key={index} className="h-0.5 w-0.5 rounded-full bg-[var(--text-tertiary)] group-hover:bg-[var(--brand-accent)]" />
        ))}
      </span>
    </div>
  );
}
