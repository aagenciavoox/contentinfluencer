import { cn } from '../../lib/utils';

interface MobileSegmentTab<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface MobileSegmentTabsProps<T extends string> {
  tabs: MobileSegmentTab<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function MobileSegmentTabs<T extends string>({
  tabs,
  value,
  onChange,
}: MobileSegmentTabsProps<T>) {
  return (
    <div
      className="grid gap-2 rounded-[1.4rem] bg-[var(--bg-hover)] p-1"
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
              'flex min-h-11 items-center justify-center gap-2 rounded-[1rem] px-3 transition-colors',
              active ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-tertiary)]'
            )}
          >
            <span className="t-button t-button-uppercase">{tab.label}</span>
            {typeof tab.count === 'number' ? (
              <span className="rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]">
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
