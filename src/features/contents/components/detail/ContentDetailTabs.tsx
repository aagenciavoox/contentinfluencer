import {FileText, Clapperboard, Send} from 'lucide-react';
import {cn} from '../../../../lib/utils';
import type {ContentDetailTab} from '../../lib/contentPipeline';

const TAB_META: Record<
  ContentDetailTab,
  {label: string; icon: typeof FileText}
> = {
  roteiro: {label: 'Roteiro', icon: FileText},
  gravacao: {label: 'Gravação', icon: Clapperboard},
  publicacao: {label: 'Publicação', icon: Send},
};

interface ContentDetailTabsProps {
  activeTab: ContentDetailTab;
  visibleTabs: ContentDetailTab[];
  onTabChange: (tab: ContentDetailTab) => void;
  alertCounts?: Partial<Record<ContentDetailTab, number>>;
}

export function ContentDetailTabs({
  activeTab,
  visibleTabs,
  onTabChange,
  alertCounts,
}: ContentDetailTabsProps) {
  return (
    <nav
      className="flex gap-0 overflow-x-auto border-b border-[var(--border-color)]"
      aria-label="Etapas do conteudo"
    >
      {visibleTabs.map(tabId => {
        const tab = TAB_META[tabId];
        const isActive = activeTab === tabId;
        const alerts = alertCounts?.[tabId] ?? 0;

        return (
          <button
            key={tabId}
            type="button"
            onClick={() => onTabChange(tabId)}
            className={cn(
              'relative inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors',
              isActive
                ? 'border-[var(--text-primary)] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {alerts > 0 ? (
              <span className="ds-pill ml-0.5 inline-flex h-4 min-w-4 items-center justify-center bg-[var(--accent-orange)] px-1 text-xs font-bold text-white">
                {alerts}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
