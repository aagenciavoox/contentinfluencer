import type { Content, Pilar, Serie } from '../../../lib/database';
import { CreationGridCard } from './CreationGridCard';
import type { CreationItemActionHandlers } from '../lib/creationItemActions';

export interface CreationGridItemModel {
  content: Content;
  pillar?: Pilar | null;
  series?: Serie | null;
  selectable: boolean;
  selected: boolean;
  etiquetas?: readonly string[];
}

interface CreationGridViewProps {
  items: CreationGridItemModel[];
  selectionMode: boolean;
  compact?: boolean;
  onOpen: (content: Content) => void;
  onToggleSelect: (content: Content) => void;
  actions: CreationItemActionHandlers;
}

export function CreationGridView({
  items,
  selectionMode,
  compact = false,
  onOpen,
  onToggleSelect,
  actions,
}: CreationGridViewProps) {
  return (
    <div className="grid-content max-lg:gap-2">
      {items.map(item => (
        <CreationGridCard
          key={item.content.id}
          content={item.content}
          pillar={item.pillar}
          series={item.series}
          selectionMode={selectionMode}
          selectable={item.selectable}
          selected={item.selected}
          etiquetas={item.etiquetas}
          compact={compact}
          onOpen={() => onOpen(item.content)}
          onToggleSelect={() => onToggleSelect(item.content)}
          actions={actions}
        />
      ))}
    </div>
  );
}
