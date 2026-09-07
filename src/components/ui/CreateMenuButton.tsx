import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, FileText, Lightbulb, Plus } from 'lucide-react';
import { AppButton } from './AppButton';

interface CreateMenuButtonProps {
  label?: string;
  onCreateIdea: () => void;
  onCreateScript: () => void;
}

/** Single primary header action that expands into similar create options. */
export function CreateMenuButton({
  label = 'Criar',
  onCreateIdea,
  onCreateScript,
}: CreateMenuButtonProps) {
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
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <AppButton
        variant="primary"
        leftIcon={<Plus className="h-4 w-4" />}
        rightIcon={<ChevronDown className="h-4 w-4" />}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(previous => !previous)}
      >
        {label}
      </AppButton>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 min-w-[200px] rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] py-1 shadow-[var(--shadow-dropdown)]"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
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
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            onClick={() => {
              setOpen(false);
              onCreateScript();
            }}
          >
            <FileText className="h-4 w-4 text-[var(--text-tertiary)]" />
            Novo roteiro
          </button>
        </div>
      ) : null}
    </div>
  );
}
