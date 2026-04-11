import React from 'react';
import { motion } from 'motion/react';
import { Content, Partnership } from '../../types';
import { cn } from '../../lib/utils';
import { Layers, Film, FileText, User } from 'lucide-react';

interface HoverCardProps {
  item: Content | Partnership | any;
  isVisible: boolean;
}

export function CalendarHoverCard({ item, isVisible }: HoverCardProps) {
  const isContent = 'status' in item && 'pillar' in item;
  const targetLabel = isContent ? item.pillar : item.brand || 'Parceria';
  const formatLabel = isContent ? item.format || item.formatoVisual : 'Padrão';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={isVisible ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.95, y: -10 }}
      className="absolute bottom-full left-0 mb-3 z-[200] pointer-events-none"
    >
      <div className="bg-[var(--bg-primary)]/40 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-2xl shadow-black/10 min-w-[160px] overflow-hidden">
        <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 blur-xl rounded-full" />
        
        <div className="relative space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Pilar / Origem</span>
          </div>
          <span className="text-sm font-bold text-[var(--text-primary)] block line-clamp-1">{targetLabel}</span>
          
          <div className="h-px bg-white/10" />
          
          <div className="flex items-center gap-2 pt-1">
             <Film className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
             <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Formato</span>
          </div>
          <span className="text-sm font-bold text-[var(--text-primary)] opacity-80">{formatLabel}</span>
        </div>
      </div>
    </motion.div>
  );
}
