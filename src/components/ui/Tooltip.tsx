import { Text } from './Text';
import {useLayoutEffect, useRef, useState, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {cn} from '../../lib/utils';

interface TooltipProps {
  label: string;
  children: ReactNode;
  side?: 'right' | 'top';
  className?: string;
  disabled?: boolean;
}

type TooltipPoint = {top: number; left: number};

function readAnchor(node: HTMLElement, side: 'right' | 'top'): TooltipPoint {
  const rect = node.getBoundingClientRect();
  if (side === 'top') {
    return {top: rect.top - 8, left: rect.left + rect.width / 2};
  }
  return {top: rect.top + rect.height / 2, left: rect.right + 10};
}

export function Tooltip({label, children, side = 'right', className, disabled = false}: TooltipProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [point, setPoint] = useState<TooltipPoint | null>(null);

  const show = () => {
    const node = triggerRef.current;
    if (disabled || !node || !label) return;
    setPoint(readAnchor(node, side));
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const hide = () => {
    setOpen(false);
  };

  useLayoutEffect(() => {
    if (!open) return;

    const place = () => {
      const node = triggerRef.current;
      if (!node) return;
      setPoint(readAnchor(node, side));
    };

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, side]);

  return (
    <div
      ref={triggerRef}
      className={cn('relative flex', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {open && point
        ? createPortal(
            <Text variant="meta" as="span"
              role="tooltip"
              style={{
                position: 'fixed',
                top: point.top,
                left: point.left,
                transform: side === 'top' ? 'translate(-50%, -100%)' : 'translateY(-50%)',
                color: 'var(--text-primary)',
              }}
              className="pointer-events-none z-[80] whitespace-nowrap rounded-[var(--radius-sm)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-2.5 py-1.5 shadow-[var(--shadow-dropdown)] text-inherit"
            >
              {label}
            </Text>,
            document.body,
          )
        : null}
    </div>
  );
}
