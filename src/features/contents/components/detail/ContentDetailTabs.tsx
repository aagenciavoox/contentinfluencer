import {FileText, Clapperboard, Send} from 'lucide-react';
import {SegmentTabs} from '../../../../components/ui/SegmentTabs';
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
    <SegmentTabs<ContentDetailTab>
      ariaLabel="Etapas do roteiro"
      value={activeTab}
      onChange={onTabChange}
      options={visibleTabs.map(tabId => {
        const tab = TAB_META[tabId];
        const alerts = alertCounts?.[tabId] ?? 0;
        return {
          id: tabId,
          label: tab.label,
          icon: <tab.icon className="h-4 w-4" />,
          count: alerts > 0 ? alerts : undefined,
        };
      })}
    />
  );
}
