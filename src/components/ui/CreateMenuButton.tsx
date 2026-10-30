import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, FileText, Lightbulb, Plus } from 'lucide-react';
import { createPortal } from 'react-dom';
import { AppButton } from './AppButton';
import { FLOATING_MENU_HIDDEN_STYLE, FLOATING_MENU_Z_INDEX, useAnchoredPosition } from './anchoredPosition';

interface CreateMenuButtonProps {
  label?: string;
  /** Secundário quando a tela já tem outra ação principal (ex.: Hoje). */
  variant?: 'primary' | 'secondary';
  onCreateIdea: () => void;
  onCreateScript: () => void;
}

/** Header create action that expands into similar create options. */
export function CreateMenuButton({
  label = 'Criar',
  variant = 'primary',
  onCreateIdea,
  onCreateScript,
}: CreateMenuButtonProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  // Menu em portal, alinhado pela direita do botão; abre para cima se faltar espaço embaixo.
  const position = useAnchoredPosition(open, rootRef, menuRef, { align: 'end', matchWidth: false });

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
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <AppButton
        variant={variant}
        leftIcon={<Plus className="h-4 w-4" />}
        rightIcon={<ChevronDown className="h-4 w-4" />}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(previous => !previous)}
      >
        {label}
      </AppButton>

      {open && typeof document !== 'undefined' ? createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          data-placement={position?.placement}
          style={position?.style ?? FLOATING_MENU_HIDDEN_STYLE}
          className={`fixed ${FLOATING_MENU_Z_INDEX} min-w-[200px] rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] py-1 shadow-[var(--shadow-dropdown)]`}
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left t-body-strong text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            onClick={() => {
              setOpen(false);
              onCreateIdea();
            }}
          >
            <Lightbulb className="h-4 w-4 text-[var(--text-tertiary)]" />
            Nova ideia
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left t-body-strong text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            onClick={() => {
              setOpen(false);
              onCreateScript();
            }}
          >
            <FileText className="h-4 w-4 text-[var(--text-tertiary)]" />
            Novo roteiro
          </button>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
