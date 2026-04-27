import { Calendar, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarItem, FILTRO_LABELS } from './types';
import { cn } from '../../lib/utils';

interface HarvestDayPanelProps {
  isMobile: boolean;
  selectedDay: Date | null;
  itemsDodia: CalendarItem[];
  onClose: () => void;
  onNewItem: () => void;
  onSelectItem: (item: CalendarItem) => void;
}

export function HarvestDayPanel({
  isMobile,
  selectedDay,
  itemsDodia,
  onClose,
  onNewItem,
  onSelectItem,
}: HarvestDayPanelProps) {
  return (
    <AnimatePresence>
      {selectedDay && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={isMobile ? { y: '100%' } : { x: '100%', opacity: 0.5 }}
            animate={isMobile ? { y: 0 } : { x: 0, opacity: 1 }}
            exit={isMobile ? { y: '100%' } : { x: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 30, stiffness: 260 }}
            className={cn(
              'fixed bg-[var(--bg-primary)] shadow-2xl z-50 flex flex-col',
              isMobile
                ? 'bottom-0 left-0 right-0 rounded-t-3xl max-h-[92dvh] border-t border-[var(--border-color)]'
                : 'top-0 right-0 h-full w-[400px] border-l border-[var(--border-color)]'
            )}
          >
            {isMobile && (
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-[var(--text-primary)] opacity-20" />
              </div>
            )}

            <div className="p-6 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between shrink-0">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-tertiary)]">
                  {format(selectedDay, 'EEEE', { locale: ptBR })}
                </p>
                <h2 className="text-xl font-black text-[var(--text-primary)] capitalize">
                  {format(selectedDay, "d 'de' MMMM", { locale: ptBR })}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onNewItem}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.03] transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Novo
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 hover:bg-[var(--bg-hover)] rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-[var(--text-tertiary)]" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar pb-safe">
              {itemsDodia.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30">
                  <Calendar className="w-10 h-10 text-[var(--text-primary)]" />
                  <p className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">
                    Nenhum evento
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {itemsDodia.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectItem(item)}
                      className={cn(
                        'w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border-l-4 text-left hover:scale-[1.01] transition-all shadow-sm',
                        item.tipo === 'organico' && item.status === 'Postado'
                          ? 'bg-[var(--accent-green)]/5 border-[var(--accent-green)]'
                          : item.tipo === 'organico'
                            ? 'bg-[var(--accent-blue)]/5 border-[var(--accent-blue)]'
                            : item.tipo === 'parceria'
                              ? 'bg-[var(--bg-secondary)] border-[var(--text-primary)]/30'
                              : item.tipo === 'reuniao'
                                ? 'bg-purple-50 border-purple-400'
                                : item.tipo === 'entrega'
                                  ? 'bg-orange-50 border-orange-400'
                                  : 'bg-teal-50 border-teal-400'
                      )}
                      style={item.tipo === 'parceria' && item.cor ? { borderColor: item.cor } : {}}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)] line-clamp-2 leading-snug">{item.titulo}</p>
                        {item.subtitulo && (
                          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{item.subtitulo}</p>
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border shrink-0',
                          item.tipo === 'organico'
                            ? 'border-[var(--accent-blue)] text-[var(--accent-blue)] bg-[var(--accent-blue)]/10'
                            : item.tipo === 'parceria'
                              ? 'border-[var(--text-primary)]/30 text-[var(--text-primary)]'
                              : item.tipo === 'reuniao'
                                ? 'border-purple-300 text-purple-700 bg-purple-50'
                                : item.tipo === 'entrega'
                                  ? 'border-orange-300 text-orange-700 bg-orange-50'
                                  : 'border-teal-300 text-teal-700 bg-teal-50'
                        )}
                      >
                        {FILTRO_LABELS[item.tipo]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
