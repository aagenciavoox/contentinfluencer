import { cn } from '../../lib/utils';

interface MobileSegmentTab<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface MobileSegmentTabsProps<T extends string> {
  tabs: readonly MobileSegmentTab<T>[];
  value: T;
  onChange: (value: T) => void;
  rounded?: 'default' | 'tight';
  className?: string;
}

export function MobileSegmentTabs<T extends string>({
  tabs,
  value,
  onChange,
  rounded = 'default',
  className,
}: MobileSegmentTabsProps<T>) {
  const isTight = rounded === 'tight';

  return (
    <div className={cn('mobile-h-scroll', className)} role="tablist">
      {tabs.map((tab) => {
        const active = tab.value === value;

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-3 transition-colors',
              isTight ? 'rounded-[var(--radius-sm)]' : 'rounded-[var(--radius-md)]',
              active
                ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]',
            )}
          >
            <span className="t-button whitespace-nowrap">{tab.label}</span>
            {typeof tab.count === 'number' ? (
              <span
                className={cn(
                  'rounded-[var(--radius-sm)] px-1.5 py-0.5 t-meta tabular-nums',
                  active
                    ? 'bg-[color-mix(in_srgb,var(--bg-primary)_22%,transparent)] text-[var(--bg-primary)]'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)]',
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
