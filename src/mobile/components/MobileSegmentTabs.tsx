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
}

export function MobileSegmentTabs<T extends string>({
  tabs,
  value,
  onChange,
  rounded = 'default',
}: MobileSegmentTabsProps<T>) {
  const isTight = rounded === 'tight';

  return (
    <div
      className={cn(
        'grid gap-1 bg-[var(--bg-hover)] p-1',
        isTight ? 'rounded-lg' : 'gap-2 rounded-[1.4rem]'
      )}
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;

        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              'flex min-h-11 items-center justify-center gap-1.5 px-2 transition-colors',
              isTight ? 'rounded-md' : 'gap-2 rounded-[1rem] px-3',
              active ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-tertiary)]'
            )}
          >
            <span className={cn('font-semibold uppercase', isTight ? 'text-xs tracking-[0.12em]' : 't-button t-button-uppercase')}>
              {tab.label}
            </span>
            {typeof tab.count === 'number' ? (
              <span
                className={cn(
                  'bg-[var(--bg-hover)] px-1.5 py-0.5 text-xs font-semibold text-[var(--text-secondary)]',
                  isTight ? 'rounded' : 'rounded-full text-xs'
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
