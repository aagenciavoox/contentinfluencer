import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Calendar, 
  CheckCircle2, 
  FileText, 
  Edit3, 
  Zap,
  User,
  CalendarDays,
} from 'lucide-react';
import { Content, Partnership, AgendaItem } from '../../types';
import { cn } from '../../lib/utils';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface QuickPreviewProps {
  item: Content | Partnership | AgendaItem | null;
  onClose: () => void;
  onEdit: () => void;
  onMove: (newDate: string) => void;
}

export function ContentQuickPreview({ item, onClose, onEdit, onMove }: QuickPreviewProps) {
  const isContent = item ? ('status' in item && 'pillar' in item) : false;
  const isPartnership = item ? ('brand' in item) : false;
  const title = item ? ((item as any).title || (item as any).text) : '';

  const dateStr = item
    ? ((item as any).publishDate || (item as any).recordingDate || (item as any).date || (item as any).deadline)
    : null;
  let formattedDate = 'Sem data';
  if (dateStr) {
    try {
      const parsed = parseISO(dateStr);
      if (isValid(parsed)) {
        formattedDate = format(parsed, "dd 'de' MMMM", { locale: ptBR });
      }
    } catch (e) {
      console.error('Invalid date', dateStr);
    }
  }

  const typeLabel = isContent ? 'Conteúdo' : isPartnership ? 'Publicidade' : 'Evento';
  const typeColor = isContent
    ? 'text-[var(--accent-blue)] bg-[var(--accent-blue)]/10'
    : isPartnership
    ? 'text-amber-500 bg-amber-500/10'
    : 'text-purple-500 bg-purple-500/10';

  return (
    <AnimatePresence>
      {item && (
        <>
          {/* Overlay */}
          <motion.div
            key={`overlay-${(item as any).id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
          />

          {/* Modal centralizado */}
          <motion.div
            key={`modal-${(item as any).id}`}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden pointer-events-auto flex flex-col max-h-[85vh]"
              onClick={e => e.stopPropagation()}
            >
              {/* Stripe colorida no topo */}
              <div className={cn('h-1 w-full shrink-0', {
                'bg-[var(--accent-blue)]': isContent,
                'bg-amber-500': isPartnership,
                'bg-purple-500': !isContent && !isPartnership,
              })} />

              {/* Header */}
              <div className="px-7 pt-6 pb-5 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-secondary)] shrink-0">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2.5 rounded-xl shadow-sm shrink-0', typeColor)}>
                    {isContent ? <FileText className="w-4.5 h-4.5 w-[18px] h-[18px]" /> :
                     isPartnership ? <Zap className="w-[18px] h-[18px]" /> :
                     <Calendar className="w-[18px] h-[18px]" />}
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[var(--text-tertiary)] block">{typeLabel}</span>
                    <span className="text-[11px] font-black text-[var(--text-primary)]">Resumo Rápido</span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-[var(--bg-hover)] rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-[var(--text-tertiary)]" />
                </button>
              </div>

              {/* Conteúdo scrollável */}
              <div className="flex-1 overflow-y-auto custom-scrollbar px-7 py-6 space-y-6">
                {/* Título */}
                <h2 className="text-2xl font-black text-[var(--text-primary)] leading-tight tracking-tight">
                  {title}
                </h2>

                {/* Badges de data e status */}
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-[var(--text-tertiary)] bg-[var(--bg-hover)] px-3 py-2 rounded-xl border border-[var(--border-color)]">
                    <CalendarDays className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
                    {formattedDate}
                  </div>
                  {isContent && (item as Content).status && (
                    <div className={cn(
                      'flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border',
                      (item as Content).status === 'Postado'
                        ? 'bg-green-500/10 text-green-500 border-green-500/20'
                        : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                    )}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {(item as Content).status}
                    </div>
                  )}
                </div>

                {/* Pilar / Formato */}
                {(isContent || isPartnership) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl">
                      <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-50 block mb-1.5">Pilar / Cliente</span>
                      <span className="text-sm font-bold text-[var(--text-primary)]">
                        {(item as any).pillar || (item as any).brand || 'Geral'}
                      </span>
                    </div>
                    <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl">
                      <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-50 block mb-1.5">Formato</span>
                      <span className="text-sm font-bold text-[var(--text-primary)]">
                        {(item as Content).format || (item as Content).formatoVisual || 'Padrão'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Preview do roteiro */}
                {isContent && (item as Content).script && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                      <FileText className="w-3.5 h-3.5" />
                      Roteiro
                    </div>
                    <div className="p-5 bg-[var(--bg-hover)]/50 border border-[var(--border-color)] rounded-2xl">
                      <p className="text-[13px] leading-relaxed text-[var(--text-secondary)] line-clamp-6 italic font-medium">
                        {(item as Content).script}
                      </p>
                    </div>
                  </div>
                )}

                {/* Marca (parceria) */}
                {isPartnership && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                      <User className="w-3.5 h-3.5" /> Marca Responsável
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: (item as Partnership).brandColor }}
                      />
                      <span className="text-sm font-black text-amber-700 dark:text-amber-400">
                        {(item as Partnership).brand}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer com ações */}
              <div className="px-7 pb-6 pt-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] flex gap-3 shrink-0">
                <button
                  onClick={onEdit}
                  className="flex-1 flex items-center justify-center gap-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all shadow-lg"
                >
                  <Edit3 className="w-4 h-4" />
                  Editar Detalhes
                </button>
                {/* Trocar data */}
                <div className="relative">
                  <input
                    type="date"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20"
                    onChange={(e) => onMove(e.target.value)}
                    title="Trocar Data"
                  />
                  <button className="p-4 bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-2xl hover:border-[var(--accent-blue)]/50 transition-all relative z-10">
                    <Calendar className="w-5 h-5 text-[var(--text-tertiary)]" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
