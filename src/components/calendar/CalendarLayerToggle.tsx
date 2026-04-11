import React from 'react';
import { 
  Video, 
  Send, 
  Star, 
  Calendar as CalendarIcon, 
  Layers, 
  Check, 
  Target 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface LayerToggleProps {
  activeLayers: string[];
  onChange: (layers: string[]) => void;
}

export function CalendarLayerToggle({ activeLayers, onChange }: LayerToggleProps) {
  const toggleLayer = (layer: string) => {
    if (activeLayers.includes(layer)) {
      onChange(activeLayers.filter(l => l !== layer));
    } else {
      onChange([...activeLayers, layer]);
    }
  };

  const layers = [
    { id: 'recordings', label: 'Ver Gravações', icon: <Video className="w-4 h-4" />, color: 'orange' },
    { id: 'posts', label: 'Ver Postagens', icon: <Send className="w-4 h-4" />, color: 'blue' },
    { id: 'partnerships', label: 'Ver Publicidades', icon: <Star className="w-4 h-4" />, color: 'amber' },
    { id: 'agenda', label: 'Ver Compromissos Externos', icon: <CalendarIcon className="w-4 h-4" />, color: 'purple' },
    { id: 'rules', label: 'Ver Metas de Rotações (Avisos)', icon: <Target className="w-4 h-4" />, color: 'red' },
  ];

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl shadow-black/5 animate-in slide-in-from-right-4 duration-500">
      <div className="flex items-center gap-3 mb-4 md:mb-8 text-[var(--text-tertiary)]">
        <Layers className="w-4 h-4" />
        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">Camadas de Visualização</span>
      </div>
      
      <div className="flex flex-row md:flex-col gap-2 md:gap-3 overflow-x-auto md:overflow-x-visible no-scrollbar pb-2 md:pb-0">
        {layers.map(layer => (
          <button
            key={layer.id}
            onClick={() => toggleLayer(layer.id)}
            className={cn(
              "flex-1 min-w-[140px] md:w-full flex items-center justify-between p-3 md:p-4 rounded-[1.25rem] border transition-all group shrink-0",
              activeLayers.includes(layer.id) 
                ? "bg-[var(--bg-hover)] border-[var(--border-strong)] shadow-sm" 
                : "bg-transparent border-transparent opacity-40 hover:opacity-100 hover:bg-[var(--bg-hover)]"
            )}
          >
            <div className="flex items-center gap-2 md:gap-4">
               <div className={cn(
                 "p-1.5 md:p-2.5 rounded-xl transition-colors",
                 activeLayers.includes(layer.id) ? `bg-${layer.color}-500/10 text-${layer.color}-600` : "bg-[var(--bg-hover)] text-[var(--text-tertiary)]"
               )}>
                 {layer.icon}
               </div>
               <span className="text-[10px] md:text-xs font-bold text-[var(--text-primary)] truncate max-w-[80px] md:max-w-none text-left leading-tight">{layer.label}</span>
            </div>
            
            <div className={cn(
              "w-4 h-4 md:w-5 md:h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0",
              activeLayers.includes(layer.id) 
                ? "bg-[var(--text-primary)] border-[var(--text-primary)]" 
                : "border-[var(--border-color)] group-hover:border-[var(--text-tertiary)]"
            )}>
              {activeLayers.includes(layer.id) && <Check className="w-3 h-3 md:w-3.5 md:h-3.5 text-[var(--bg-primary)] stroke-[4px]" />}
            </div>
          </button>
        ))}
      </div>
      
      <div className="hidden md:block mt-8 pt-8 border-t border-[var(--border-color)] text-center">
         <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
           Pressione 'C' para alternar camadas
         </p>
      </div>
    </div>
  );
}
