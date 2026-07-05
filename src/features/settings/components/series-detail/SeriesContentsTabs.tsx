import { Text } from '../../../../components/ui/Text';
import { cn } from '../../../../lib/utils';
import type { SeriesContentTab } from '../../lib/computeSeriesContentStats';

interface SeriesContentsTabsProps {
  activeTab: SeriesContentTab;
  onTabChange: (tab: SeriesContentTab) => void;
  counts: {
    roteiros: number;
    ideias: number;
    total: number;
  };
}

const TABS: Array<{ id: SeriesContentTab; label: string; countKey: keyof SeriesContentsTabsProps['counts'] }> = [
  { id: 'roteiros', label: 'Roteiros', countKey: 'roteiros' },
  { id: 'ideias', label: 'Ideias', countKey: 'ideias' },
  { id: 'todos', label: 'Todos', countKey: 'total' },
];

export function SeriesContentsTabs({ activeTab, onTabChange, counts }: SeriesContentsTabsProps) {
  return (
    <div className="flex items-center gap-6 border-b border-[var(--border-color)]">
      {TABS.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'relative -mb-px inline-flex items-center gap-2 border-b-2 pb-3 transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
              isActive
                ? 'border-[var(--text-primary)] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            )}
          >
            <Text variant="label" className={isActive ? 'text-[var(--text-primary)]' : undefined}>
              {tab.label}
            </Text>
            <span
              className={cn(
                'rounded-[var(--radius-pill)] px-2 py-0.5 text-xs font-semibold',
                isActive
                  ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                  : 'bg-[var(--surface-subtle)] text-[var(--text-tertiary)]',
              )}
            >
              {counts[tab.countKey]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
