import React from 'react';
import { 
  Video, 
  Send, 
  Star, 
  Calendar as CalendarIcon, 
  Layers, 
  Check, 
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface LayerToggleProps {
  activeLayers: string[];
  onChange: (layers: string[]) => void;
}

export function CalendarLayerToggle({ activeLayers, onChange }: LayerToggleProps) {
  const isMobile = useIsMobile();
  
  const toggleLayer = (layer: string) => {
    if (activeLayers.includes(layer)) {
      onChange(activeLayers.filter(l => l !== layer));
    } else {
      onChange([...activeLayers, layer]);
    }
  };

  const layers = [
    { id: 'recordings', label: isMobile ? 'Gravar' : 'Ver Gravações', icon: <Video className="w-3.5 h-3.5 md:w-4 md:h-4" />, color: 'orange' },
    { id: 'posts', label: isMobile ? 'Postar' : 'Ver Postagens', icon: <Send className="w-3.5 h-3.5 md:w-4 md:h-4" />, color: 'blue' },
    { id: 'partnerships', label: isMobile ? 'Publis' : 'Ver Publicidades', icon: <Star className="w-3.5 h-3.5 md:w-4 md:h-4" />, color: 'amber' },
    { id: 'agenda', label: isMobile ? 'Agenda' : 'Ver Compromissos Externos', icon: <CalendarIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />, color: 'purple' },
  ];

  return (
    <Surface variant="elevated" padding="none" className="p-3 md:p-6">
      <div className="flex items-center gap-3 mb-3 md:mb-8 text-[var(--text-tertiary)]">
        <Layers className="w-3.5 h-3.5 md:w-4 md:h-4" />
        <Text variant="label" uppercase className="text-2xs md:text-xs font-semibold">Camadas</Text>
      </div>
      
      <div className={cn(
        "grid gap-2",
        isMobile ? "grid-cols-2" : "grid-cols-1"
      )}>
        {layers.map(layer => (
          <button
            key={layer.id}
            onClick={() => toggleLayer(layer.id)}
            className={cn(
              "flex items-center justify-between p-2 md:p-4 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border transition-all active:scale-[0.98]",
              activeLayers.includes(layer.id) 
                ? "bg-[var(--bg-hover)] border-[var(--border-strong)] shadow-sm" 
                : "bg-transparent border-transparent opacity-40 hover:opacity-100 hover:bg-[var(--bg-hover)]"
            )}
          >
            <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
               <div className={cn(
                 "p-1.5 md:p-2.5 rounded-[var(--radius-input)] transition-colors shrink-0",
                 activeLayers.includes(layer.id) 
                   ? (layer.color === 'orange' ? 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]' :
                      layer.color === 'blue' ? 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]' :
                      layer.color === 'amber' ? 'bg-[var(--warning)]/10 text-[var(--warning)]' :
                      layer.color === 'purple' ? 'bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]' :
                      'bg-[var(--danger)]/10 text-[var(--danger)]')
                   : "bg-[var(--bg-hover)] text-[var(--text-tertiary)]"
               )}>
                 {layer.icon}
               </div>
               <span className="text-xs md:text-xs font-bold text-[var(--text-primary)] truncate text-left leading-tight">
                 {layer.label}
               </span>
            </div>
            
            <div className={cn(
              "w-3.5 h-3.5 md:w-5 md:h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0",
              activeLayers.includes(layer.id) 
                ? "bg-[var(--text-primary)] border-[var(--text-primary)]" 
                : "border-[var(--border-color)]"
            )}>
              {activeLayers.includes(layer.id) && <Check className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-[var(--bg-primary)] stroke-[4px]" />}
            </div>
          </button>
        ))}
      </div>
      
      <div className="hidden md:block mt-8 pt-8 border-t border-[var(--border-color)] text-center">
         <p className="text-xs font-semibold  text-[var(--text-tertiary)]">
           Pressione 'C' para alternar camadas
         </p>
      </div>
    </Surface>
  );
}
