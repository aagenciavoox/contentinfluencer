import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Settings2 } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';
import {
  CREATION_SORT_OPTIONS,
  type CreationSortValue,
} from '../lib/creationFilterOptions';

interface CreationDisplayMenuProps {
  sort: CreationSortValue;
  onSortChange: (value: CreationSortValue) => void;
  className?: string;
}

/** Groups existing display controls (sort). Density/visible props omitted — not in product. */
export function CreationDisplayMenu({
  sort,
  onSortChange,
  className,
}: CreationDisplayMenuProps) {
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

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <AppButton
        variant="secondary"
        size="sm"
        leftIcon={<Settings2 className="h-3.5 w-3.5" />}
        rightIcon={<ChevronDown className="h-3.5 w-3.5" />}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(previous => !previous)}
      >
        Exibição
      </AppButton>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 min-w-[200px] rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] py-1 shadow-[var(--shadow-dropdown)]"
        >
          <Text variant="label" as="p" className="px-3 py-1.5">
            Ordenar
          </Text>
          {CREATION_SORT_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={sort === option.value}
              className={cn(
                'flex w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                sort === option.value
                  ? 'font-medium text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)]',
              )}
              onClick={() => {
                onSortChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
