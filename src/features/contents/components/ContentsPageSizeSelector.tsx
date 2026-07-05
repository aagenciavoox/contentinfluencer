import { ChevronDown } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { CONTENTS_PAGE_SIZE_OPTIONS } from '../lib/contentsListUrl';

interface ContentsPageSizeSelectorProps {
  value: number;
  onChange: (size: number) => void;
  className?: string;
}

export function ContentsPageSizeSelector({
  value,
  onChange,
  className,
}: ContentsPageSizeSelectorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <label htmlFor="contents-page-size" className="text-xs font-medium text-[var(--text-secondary)]">
        Exibir
      </label>
      <div className="relative">
        <select
          id="contents-page-size"
          value={value}
          onChange={event => onChange(Number(event.target.value))}
          className="h-9 min-w-[5.5rem] appearance-none rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] pl-3 pr-8 text-xs font-medium text-[var(--text-primary)] outline-none transition-colors hover:bg-[var(--bg-hover)] focus:border-[var(--border-strong)]"
        >
          {CONTENTS_PAGE_SIZE_OPTIONS.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
      </div>
    </div>
  );
}
