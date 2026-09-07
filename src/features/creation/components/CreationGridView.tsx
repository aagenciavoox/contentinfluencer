import type { Content, Pilar, Serie } from '../../../lib/database';
import { CreationGridCard } from './CreationGridCard';
import type { CreationItemActionHandlers } from '../lib/creationItemActions';

export interface CreationGridItemModel {
  content: Content;
  pillar?: Pilar | null;
  series?: Serie | null;
  selectable: boolean;
  selected: boolean;
}

interface CreationGridViewProps {
  items: CreationGridItemModel[];
  showStatus: boolean;
  selectionMode: boolean;
  compact?: boolean;
  onOpen: (content: Content) => void;
  onToggleSelect: (content: Content) => void;
  actions: CreationItemActionHandlers;
}

export function CreationGridView({
  items,
  showStatus,
  selectionMode,
  compact = false,
  onOpen,
  onToggleSelect,
  actions,
}: CreationGridViewProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {items.map(item => (
        <CreationGridCard
          key={item.content.id}
          content={item.content}
          pillar={item.pillar}
          series={item.series}
          showStatus={showStatus}
          selectionMode={selectionMode}
          selectable={item.selectable}
          selected={item.selected}
          compact={compact}
          onOpen={() => onOpen(item.content)}
          onToggleSelect={() => onToggleSelect(item.content)}
          actions={actions}
        />
      ))}
    </div>
  );
}
