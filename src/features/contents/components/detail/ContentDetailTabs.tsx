import {CalendarDays, Clapperboard, FileText, History, Image} from 'lucide-react';
import {cn} from '../../../../lib/utils';
import type {ContentDetailTab} from '../../lib/contentPipeline';

const TAB_CONFIG: Array<{id: ContentDetailTab; label: string; icon: typeof FileText}> = [
  {id: 'roteiro', label: 'Roteiro', icon: FileText},
  {id: 'gravacao', label: 'Gravacao', icon: Clapperboard},
  {id: 'producao', label: 'Producao', icon: Image},
  {id: 'postagem', label: 'Postagem', icon: CalendarDays},
  {id: 'historico', label: 'Historico', icon: History},
];

interface ContentDetailTabsProps {
  activeTab: ContentDetailTab;
  onTabChange: (tab: ContentDetailTab) => void;
  alertCounts?: Partial<Record<ContentDetailTab, number>>;
}

export function ContentDetailTabs({activeTab, onTabChange, alertCounts}: ContentDetailTabsProps) {
  return (
    <nav
      className="flex gap-0 overflow-x-auto border-b border-[var(--border-color)]"
      aria-label="Etapas do conteudo"
    >
      {TAB_CONFIG.map(tab => {
        const isActive = activeTab === tab.id;
        const alerts = alertCounts?.[tab.id] ?? 0;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
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
              <span className="ds-pill ml-0.5 inline-flex h-4 min-w-4 items-center justify-center bg-[var(--accent-orange)] px-1 text-[9px] font-bold text-white">
                {alerts}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
