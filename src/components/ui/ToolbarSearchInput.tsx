import { Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ToolbarSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** compact = 36px (library toolbar); default = 40px desktop / 44px mobile */
  size?: 'default' | 'compact';
  onClear?: () => void;
}

export function ToolbarSearchInput({
  value,
  onChange,
  placeholder = 'Buscar...',
  className,
  size = 'default',
  onClear,
}: ToolbarSearchInputProps) {
  const handleClear = () => {
    onChange('');
    onClear?.();
  };

  return (
    <div
      className={cn(
        'filter-bar-search group relative flex-1',
        size === 'compact' && 'filter-bar-search--compact',
        className,
      )}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)] transition-colors group-focus-within:text-[var(--text-primary)]" />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="filter-bar-search-input"
      />
      {value ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Limpar busca"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[var(--radius-pill)] p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
