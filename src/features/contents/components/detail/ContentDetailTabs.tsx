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
}

export function ContentDetailTabs({activeTab, onTabChange}: ContentDetailTabsProps) {
  return (
    <nav className="flex gap-2 overflow-x-auto rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2">
      {TAB_CONFIG.map(tab => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'inline-flex shrink-0 items-center gap-2 rounded-[18px] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition-all',
            activeTab === tab.id
              ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'
          )}
        >
          <tab.icon className="h-4 w-4" />
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
