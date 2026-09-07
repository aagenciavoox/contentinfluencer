import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';

export type MoreMenuItem = {
  id?: string;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger' | 'success';
  disabled?: boolean;
};

interface MoreMenuProps {
  items: MoreMenuItem[];
  align?: 'left' | 'right';
  label?: string;
  className?: string;
  triggerClassName?: string;
  trigger?: ReactNode;
  size?: 'sm' | 'md';
}

const TONE_CLASS: Record<NonNullable<MoreMenuItem['tone']>, string> = {
  default: 'text-[var(--text-primary)]',
  danger: 'text-[var(--accent-pink)]',
  success: 'text-[var(--accent-green)]',
};

export function MoreMenu({
  items,
  align = 'right',
  label = 'Mais opções',
  className,
  triggerClassName,
  trigger,
  size = 'md',
}: MoreMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={event => {
          event.stopPropagation();
          setOpen(previous => !previous);
        }}
        className={cn(
          'inline-flex items-center justify-center rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
          size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
          open && 'opacity-100',
          triggerClassName,
        )}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        {trigger ?? <MoreHorizontal className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className={cn(
            'absolute top-full z-20 mt-1 min-w-[160px] rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] py-1 shadow-[var(--shadow-dropdown)]',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item, index) => (
            <button
              key={item.id ?? `${item.label}-${index}`}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={cn(
                'flex w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-45',
                TONE_CLASS[item.tone ?? 'default'],
              )}
              onClick={event => {
                event.stopPropagation();
                setOpen(false);
                item.onClick();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
