import { motion } from 'motion/react';
import { useState } from 'react';
import { AgendaItem, Content, Projeto } from '../../../lib/database';
import { CalendarAgendaView } from './CalendarAgendaView';
import { CalendarGrid } from './CalendarGrid';
import { ContentDetailModal } from '../../contents/components/modals/ContentDetailModal';
import { ContentQuickPreview } from './modals/ContentQuickPreview';
import { EditorialAgendaFilters } from './filters/EditorialAgendaFilters';

type Partnership = Projeto;

interface EditorialAgendaTabViewProps {
  isMobile: boolean;
  contents: Content[];
  partnerships: Partnership[];
  agenda: AgendaItem[];
  activeLayers: string[];
  selectedItem: Content | Partnership | AgendaItem | null;
  isFullEditOpen: boolean;
  onLayersChange: (layers: string[]) => void;
  onSelectItem: (item: Content | Partnership | AgendaItem) => void;
  onClosePreview: () => void;
  onOpenProjectFromPreview: (project: Partnership) => void;
  onOpenFullEdit: () => void;
  onMoveItem: (newDate: string) => void;
  onCloseFullEdit: () => void;
}

export function EditorialAgendaTabView({
  isMobile,
  contents,
  partnerships,
  agenda,
  activeLayers,
  selectedItem,
  isFullEditOpen,
  onLayersChange,
  onSelectItem,
  onClosePreview,
  onOpenProjectFromPreview,
  onOpenFullEdit,
  onMoveItem,
  onCloseFullEdit,
}: EditorialAgendaTabViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortValue, setSortValue] = useState('proximos');

  const toggleLayer = (layerId: string) => {
    if (activeLayers.includes(layerId)) {
      onLayersChange(activeLayers.filter(layer => layer !== layerId));
      return;
    }

    onLayersChange([...activeLayers, layerId]);
  };

  return (
    <motion.div
      key="agenda"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="h-full overflow-y-auto custom-scrollbar"
    >
      <div className="mx-auto max-w-[1600px] space-y-8 px-5 py-8 md:px-10">
        <EditorialAgendaFilters
          activeLayers={activeLayers}
          searchTerm={searchTerm}
          sortValue={sortValue}
          onSearchChange={setSearchTerm}
          onSortChange={setSortValue}
          onToggleLayer={toggleLayer}
        />

        <div>
          {isMobile ? (
            <CalendarAgendaView
              contents={contents}
              partnerships={partnerships}
              externalEvents={agenda}
              activeLayers={activeLayers}
              searchTerm={searchTerm}
              sortValue={sortValue}
              onSelectContent={onSelectItem}
            />
          ) : (
            <CalendarGrid
              activeLayers={activeLayers}
              searchTerm={searchTerm}
              sortValue={sortValue}
              onItemClick={onSelectItem}
            />
          )}
        </div>
      </div>

      {selectedItem && !isFullEditOpen && (
        <ContentQuickPreview
          item={selectedItem}
          onClose={onClosePreview}
          onEdit={() => {
            if ('brand' in selectedItem) {
              onOpenProjectFromPreview(selectedItem as Partnership);
            } else {
              onOpenFullEdit();
            }
          }}
          onMove={onMoveItem}
        />
      )}

      {isFullEditOpen && selectedItem && !('brand' in selectedItem) && 'pilarId' in selectedItem && (
        <ContentDetailModal content={selectedItem as Content} onClose={onCloseFullEdit} />
      )}
    </motion.div>
  );
}
