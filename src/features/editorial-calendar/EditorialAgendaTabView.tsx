import { BookOpen, RotateCcw, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { AgendaItem, Content, Projeto } from '../../lib/database';
type Partnership = Projeto;
import { cn } from '../../lib/utils';
import { CalendarAgendaView } from '../../components/calendar/CalendarAgendaView';
import { CalendarGrid } from '../../components/calendar/CalendarGrid';
import { ContentDetailModal } from '../../components/ContentDetailModal';
import { ContentQuickPreview } from '../../components/calendar/ContentQuickPreview';
import { FilterBar } from '../../components/common/FilterBar';

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
  const layerOptions = [
    { id: 'recordings', label: 'Gravações' },
    { id: 'posts', label: 'Postagens' },
    { id: 'partnerships', label: 'Projetos' },
    { id: 'agenda', label: 'Agenda' },
    { id: 'rules', label: 'Regras' },
  ];

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
      <div className="max-w-[1600px] mx-auto py-8 px-5 md:px-10 space-y-8">
        <FilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por conteúdo, evento ou projeto"
          filters={[
            {
              id: 'camadas',
              label: `Camadas (${activeLayers.length})`,
              type: 'custom',
              renderContent: () => (
                <div className="flex min-w-[240px] flex-col gap-2">
                  {layerOptions.map(option => {
                    const active = activeLayers.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => toggleLayer(option.id)}
                        className={cn(
                          'flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-all',
                          active
                            ? 'border-[var(--text-primary)] bg-[var(--bg-hover)] text-[var(--text-primary)]'
                            : 'border-[var(--border-color)] text-[var(--text-secondary)]'
                        )}
                      >
                        <span>{option.label}</span>
                        <span className="text-xs">{active ? 'Ativo' : 'Oculto'}</span>
                      </button>
                    );
                  })}
                </div>
              ),
            },
          ]}
          sortValue={sortValue}
          onSortChange={setSortValue}
          sortOptions={[
            { label: 'Próximos', value: 'proximos' },
            { label: 'Título A-Z', value: 'titulo:asc' },
            { label: 'Tipo A-Z', value: 'tipo:asc' },
          ]}
        />

        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Rotação', text: 'Max 1x/Sem', icon: RotateCcw, color: 'text-orange-500' },
            { label: 'Energia', text: 'Mix Ideal', icon: Zap, color: 'text-blue-500' },
            { label: 'Temas', text: 'Mix Pilares', icon: BookOpen, color: 'text-purple-500' },
          ].map((rule) => (
            <div key={rule.label} className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-sm">
              <rule.icon className={cn('w-4 h-4 shrink-0', rule.color)} />
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] block">{rule.label}</span>
                <span className="text-xs font-bold text-[var(--text-primary)]">{rule.text}</span>
              </div>
            </div>
          ))}
        </div>

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

      {isFullEditOpen && selectedItem && !('brand' in selectedItem) && ('pilarId' in selectedItem) && (
        <ContentDetailModal
          content={selectedItem as Content}
          onClose={onCloseFullEdit}
        />
      )}
    </motion.div>
  );
}
