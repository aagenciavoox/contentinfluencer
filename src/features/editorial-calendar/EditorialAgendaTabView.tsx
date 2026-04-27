import { Calendar as CalendarIcon, BookOpen, RotateCcw, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { AgendaItem, Content, Partnership } from '../../types';
import { cn } from '../../lib/utils';
import { CalendarAgendaView } from '../../components/calendar/CalendarAgendaView';
import { CalendarGrid } from '../../components/calendar/CalendarGrid';
import { CalendarLayerToggle } from '../../components/calendar/CalendarLayerToggle';
import { ContentDetailModal } from '../../components/ContentDetailModal';
import { ContentQuickPreview } from '../../components/calendar/ContentQuickPreview';
import { PageGuide } from '../../components/PageGuide';

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
        <PageGuide
          pageId="calendar"
          title="Calendário de Comando"
          description="Visão integrada do ecossistema. Controle camadas e valide regras de ouro."
          icon={CalendarIcon}
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          <div className="lg:col-span-1 lg:sticky lg:top-6">
            <CalendarLayerToggle activeLayers={activeLayers} onChange={onLayersChange} />
          </div>
          <div className="lg:col-span-3">
            {isMobile ? (
              <CalendarAgendaView
                contents={contents}
                partnerships={partnerships}
                externalEvents={agenda}
                activeLayers={activeLayers}
                onSelectContent={onSelectItem}
              />
            ) : (
              <CalendarGrid activeLayers={activeLayers} onItemClick={onSelectItem} />
            )}
          </div>
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

      {isFullEditOpen && selectedItem && !('brand' in selectedItem) && !('external' in selectedItem && !('status' in selectedItem)) && (
        <ContentDetailModal
          content={selectedItem as Content}
          onClose={onCloseFullEdit}
        />
      )}
    </motion.div>
  );
}
