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
  /**
   * iOS contenteditable swallows the first click (it only blurs the editor).
   * Activate on pointerdown so a tab next to the script editor opens immediately.
   */
  activateOnPointerDown?: boolean;
}

export function MobileSegmentTabs<T extends string>({
  tabs,
  value,
  onChange,
  rounded = 'default',
  className,
  activateOnPointerDown = false,
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
            onClick={activateOnPointerDown ? undefined : () => onChange(tab.value)}
            onPointerDown={
              activateOnPointerDown
                ? event => {
                    event.preventDefault();
                    onChange(tab.value);
                  }
                : undefined
            }
            onKeyDown={
              activateOnPointerDown
                ? event => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    onChange(tab.value);
                  }
                : undefined
            }
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
                  // `.t-meta` define a cor fora das camadas do Tailwind; sem `!` o contador
                  // ativo herdava --text-secondary sobre o fundo escuro (~1,5:1). Agora ~9:1.
                  active
                    ? 'bg-[color-mix(in_srgb,var(--bg-primary)_22%,transparent)] !text-[var(--bg-primary)]'
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
