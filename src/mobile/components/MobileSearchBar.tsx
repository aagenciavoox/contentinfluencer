import { SlidersHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ToolbarSearchInput } from '../../components/ui/ToolbarSearchInput';

interface MobileSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFilterClick?: () => void;
  filterLabel?: string;
  rounded?: 'default' | 'tight';
}

export function MobileSearchBar({
  value,
  onChange,
  placeholder = 'Buscar',
  onFilterClick,
  filterLabel = 'Abrir filtros',
  rounded = 'default',
}: MobileSearchBarProps) {
  const radius = rounded === 'tight' ? 'rounded-[var(--radius-sm)]' : 'rounded-[var(--radius-md)]';

  return (
    <div className="inline-stack-md w-full">
      <ToolbarSearchInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(radius, 'border border-[var(--border-color)] bg-[var(--bg-elevated)] shadow-sm')}
      />

      {onFilterClick ? (
        <button
          type="button"
          aria-label={filterLabel}
          onClick={onFilterClick}
          className={cn(
            'flex shrink-0 items-center justify-center border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm active:scale-95',
            radius,
            'min-h-[var(--control-height-mobile)] min-w-[var(--control-height-mobile)]',
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
