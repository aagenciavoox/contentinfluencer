import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';
import { FLOATING_MENU_HIDDEN_STYLE, FLOATING_MENU_Z_INDEX, useAnchoredPosition } from './anchoredPosition';

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  // Menu em portal: cards e painéis com `overflow` não o cortam, e ele abre para cima perto do fim da tela.
  const position = useAnchoredPosition(open, triggerRef, menuRef, {
    align: align === 'right' ? 'end' : 'start',
    matchWidth: false,
  });

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && (rootRef.current?.contains(target) || menuRef.current?.contains(target))) return;
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
        ref={triggerRef}
        type="button"
        onClick={event => {
          event.stopPropagation();
          setOpen(previous => !previous);
        }}
        className={cn(
          // Dois tamanhos, pelo lugar: `md` em cabeçalhos e barras, com a altura e a borda dos
          // botões ao lado; `sm` dentro de cards e linhas, sem borda. No toque, sempre 44px.
          'inline-flex items-center justify-center rounded-[var(--radius-input)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
          size === 'sm'
            ? 'h-8 w-8 border border-transparent bg-transparent pointer-coarse:h-11 pointer-coarse:w-11'
            : 'h-[var(--control-height)] w-[var(--control-height)] border border-[var(--border-color)] bg-[var(--bg-secondary)] pointer-coarse:h-11 pointer-coarse:w-11',
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

      {open && typeof document !== 'undefined' ? createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          data-placement={position?.placement}
          style={position?.style ?? FLOATING_MENU_HIDDEN_STYLE}
          className={cn(
            'fixed min-w-[160px] overflow-y-auto rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] py-1 shadow-[var(--shadow-dropdown)]',
            FLOATING_MENU_Z_INDEX,
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
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
