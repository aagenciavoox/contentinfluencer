import { cn } from '../../lib/utils';

export interface SegmentTabOption<T extends string = string> {
  id: T;
  label: string;
  count?: number;
}

interface SegmentTabsProps<T extends string = string> {
  options: SegmentTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** Segmented control used in toolbars (Contents pipeline/publicados, etc.). */
export function SegmentTabs<T extends string = string>({
  options,
  value,
  onChange,
  className,
}: SegmentTabsProps<T>) {
  return (
    <div className={cn('segment-tabs', className)} role="tablist">
      {options.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={cn(
              'segment-tabs-item inline-flex items-center gap-1.5',
              active && 'segment-tabs-item-active',
            )}
          >
            {/* Na aba ativa a cor fica no texto: o `:hover` de `.segment-tabs-item` trocava
                para --text-primary sobre o fundo --text-primary e o rótulo (com o contador) sumia. */}
            <span
              className={cn('text-xs font-semibold', active && 'text-[var(--bg-primary)]')}
            >
              {option.label}
            </span>
            {typeof option.count === 'number' ? (
              <span
                className={cn(
                  'rounded-[var(--radius-sm)] px-1.5 py-0.5 t-meta tabular-nums',
                  active
                    ? 'bg-[color-mix(in_srgb,var(--bg-primary)_22%,transparent)] !text-[var(--bg-primary)]'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)]',
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
