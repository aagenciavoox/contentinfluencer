import React, { useState, useMemo } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  parseISO,
  isToday,
  startOfToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Video, 
  Send, 
  Star, 
  Calendar as CalendarIcon, 
  Zap, 
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock,
  Layers,
  Search,
  BookOpen,
  User,
  Plus
} from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import { Content, Projeto, AgendaItem, Look, Cenario } from '../../../lib/database';
type Partnership = Projeto;
import { cn, getEventDates } from '../../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { getStatusCalendarClass } from '../../../lib/statusClasses';
import { getStatusIcon } from '../pages/EditorialCalendarPage';
import { CalendarHoverCard } from './CalendarHoverCard';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';

interface CalendarGridProps {
  activeLayers: string[];
  searchTerm: string;
  sortValue: string;
  onItemClick: (item: any) => void;
}

export function CalendarGrid({ activeLayers, searchTerm, sortValue, onItemClick }: CalendarGridProps) {
  const { state } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  // Grid Logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  // Navigation
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  // Data Filtering
  const getItemsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const items: any[] = [];

    // 1. Recordings (Content)
    if (activeLayers.includes('recordings')) {
      state.contents.forEach(c => {
        if (c.recordingDate === dayStr && c.status !== 'Postado') {
          items.push({ ...c, type: 'recording', icon: <Video className="w-2.5 h-2.5" /> });
        }
      });
    }

    // 2. Posts (Content)
    if (activeLayers.includes('posts')) {
      state.contents.forEach(c => {
        if (c.publishDate === dayStr) {
          items.push({ ...c, type: 'post', icon: <Send className="w-2.5 h-2.5" /> });
        }
      });
    }

    // 3. Publicidades (Partnerships)
    if (activeLayers.includes('partnerships')) {
      state.projetos
        .filter(p => !p.deletedAt)
        .forEach(p => {
          const pDates = getEventDates(p);
          if (pDates.includes(dayStr)) {
            const IconComponent = Star;
            items.push({ 
              ...p, 
              type: 'partnership', 
              icon: <IconComponent className="w-2.5 h-2.5" /> 
            });
          }
        });
    }

    // 4. Agenda (Events)
    if (activeLayers.includes('agenda')) {
      state.agendaItems
        .filter(a => {
          if (a.projetoId) {
            const p = state.projetos.find(proj => proj.id === a.projetoId);
            return !p?.deletedAt && p?.status !== 'Finalizado';
          }
          return true;
        })
        .forEach(a => {
        if (a.date === dayStr) {
          const linkedProjeto = a.projetoId ? state.projetos.find(proj => proj.id === a.projetoId) : null;
          items.push({
            ...a,
            type: 'agenda',
            projetoColor: linkedProjeto?.color || null,
            icon: <CalendarIcon className="w-2.5 h-2.5" />
          });
        }
      });
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filteredItems = normalizedSearch
      ? items.filter(item => {
          const haystacks = [
            item.title,
            item.text,
            item.brand,
            item.nome,
          ].filter(Boolean);
          return haystacks.some(value => String(value).toLowerCase().includes(normalizedSearch));
        })
      : items;

    return filteredItems.sort((left, right) => {
      if (sortValue === 'tipo:asc') {
        return String(left.type || '').localeCompare(String(right.type || ''), 'pt-BR');
      }

      if (sortValue === 'titulo:asc') {
        return String(left.title || left.text || left.nome || '').localeCompare(
          String(right.title || right.text || right.nome || ''),
          'pt-BR'
        );
      }

      return 0;
    });
  };

  return (
    <Surface variant="elevated" padding="none" className="overflow-hidden animate-in zoom-in-95 duration-500">
      <div className="overflow-x-auto no-scrollbar">
      <div className="min-w-[800px] md:min-w-0">
      {/* Calendar Header */}
      <div className="p-4 md:p-8 border-b border-[var(--border-color)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-6 w-full md:w-auto">
           <div className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] shadow-sm flex-1 md:flex-none justify-center md:justify-start">
             <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 text-[var(--accent-blue)]" />
             <Text as="span" variant="label" uppercase className="md:text-sm font-semibold text-[var(--text-primary)]">
               {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
             </Text>
           </div>
           
           <div className="flex gap-1 md:gap-2 p-1 bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)]">
             <button onClick={prevMonth} className="p-1.5 md:p-2 hover:bg-[var(--border-color)] rounded-xl transition-colors"><ChevronLeft className="w-4 h-4 md:w-5 md:h-5" /></button>
             <button onClick={() => setCurrentDate(new Date())} className="px-3 md:px-6 py-1.5 md:py-2 text-2xs md:text-xs font-semibold hover:bg-[var(--border-color)] rounded-[var(--radius-input)] transition-colors">Hoje</button>
             <button onClick={nextMonth} className="p-1.5 md:p-2 hover:bg-[var(--border-color)] rounded-xl transition-colors"><ChevronRight className="w-4 h-4 md:w-5 md:h-5" /></button>
           </div>
        </div>

        <div className="flex md:hidden w-full overflow-x-auto gap-4 py-2 border-t border-[var(--border-color)] no-scrollbar">
           <div className="flex items-center gap-2 shrink-0"><Video className="w-3 h-3 text-[var(--accent-orange)]" /><span className="text-2xs font-semibold uppercase tracking-normal opacity-60">Gravação</span></div>
           <div className="flex items-center gap-2 shrink-0"><Send className="w-3 h-3 text-[var(--accent-blue)]" /><span className="text-2xs font-semibold uppercase tracking-normal opacity-60">Postagens</span></div>
           <div className="flex items-center gap-2 shrink-0"><Star className="w-3.5 h-3.5 text-[var(--warning)]" /><span className="text-2xs font-semibold uppercase tracking-normal opacity-60">Publicidade</span></div>
        </div>

        <div className="hidden md:flex items-center gap-4 text-[var(--text-tertiary)] text-xs font-semibold  opacity-60">
           <div className="flex items-center gap-2"><Video className="w-3 h-3 text-[var(--accent-orange)]" /> Gravação</div>
           <div className="h-1 w-1 bg-[var(--text-tertiary)] rounded-[var(--radius-pill)]" />
           <div className="flex items-center gap-2"><Send className="w-3 h-3 text-[var(--accent-blue)]" /> Postagens</div>
           <div className="h-1 w-1 bg-[var(--text-tertiary)] rounded-[var(--radius-pill)]" />
           <div className="flex items-center gap-2"><Star className="w-3.5 h-3.5 text-[var(--warning)]" /> Publicidade</div>
        </div>
      </div>

      {/* Week Day Labels */}
      <div className="grid grid-cols-7 border-b border-[var(--border-color)] bg-[var(--bg-hover)]/30">
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
          <div key={d} className="py-2 md:py-4 text-center">
            <Text variant="label" uppercase className="font-semibold text-[var(--text-tertiary)]">{d}</Text>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 border-collapse h-[600px] md:h-[800px]">
        {days.map((day, i) => {
          const items = getItemsForDay(day);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const activeToday = isToday(day);
          const dayId = format(day, 'yyyy-MM-dd');
          const energy = 0;
          const loadWarn = energy > 0 && items.length > energy + 2;

          return (
            <div 
              key={dayId} 
              className={cn(
                "border-r border-b border-[var(--border-color)] p-1.5 md:p-2 transition-all flex flex-col group min-h-0",
                !isCurrentMonth ? "opacity-20 bg-[var(--bg-hover)]/30" : "bg-[var(--bg-primary)]/40",
                activeToday && "relative after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-[var(--accent-blue)]"
              )}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between p-2 mb-1">
                <span className={cn(
                  "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-all",
                  activeToday ? "bg-[var(--accent-blue)] text-[var(--bg-secondary)] shadow-[var(--shadow-soft)]" : "text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]"
                )}>
                  {format(day, 'd')}
                </span>
                
                {energy > 0 && (
                  <div className="flex gap-0.5" title={`Energia: ${energy}`}>
                    {Array.from({ length: energy }).map((_, i) => (
                      <div key={i} className="w-0.5 h-3 bg-[var(--accent-orange)] opacity-40 rounded-full" />
                    ))}
                  </div>
                )}
              </div>

              {/* Items Container */}
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                {items.map((item, idx) => (
                  <div key={idx} className="relative">
                    <button
                      onClick={() => onItemClick(item)}
                      onMouseEnter={() => setHoveredItemId(item.id)}
                      onMouseLeave={() => setHoveredItemId(null)}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded-[var(--radius-input)] flex items-center gap-2 transition-all group/item shadow-sm border border-transparent",
                        item.type === 'recording' && "bg-[var(--accent-orange)]/5 text-[var(--accent-orange)] hover:bg-[var(--accent-orange)]/10 hover:border-[var(--accent-orange)]/20",
                        item.type === 'post' && "bg-[var(--accent-blue)]/5 text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/10 hover:border-[var(--accent-blue)]/20",
                        item.type === 'partnership' && !item.color && getStatusCalendarClass(item.status),
                        item.type === 'partnership' && "hover:border-current",
                        item.type === 'agenda' && !item.brandColor && !item.projetoColor && "bg-[var(--accent-purple)]/5 text-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/10 hover:border-[var(--accent-purple)]/20",
                        item.status === 'Postado' && "opacity-40 grayscale"
                      )}
                      style={
                        item.type === 'partnership' && item.color ? {
                          backgroundColor: `${item.color}15`,
                          color: item.color,
                          borderColor: `${item.color}30`
                        } : item.type === 'agenda' && item.projetoColor ? {
                          backgroundColor: `${item.projetoColor}15`,
                          color: item.projetoColor,
                          borderColor: `${item.projetoColor}30`
                        } : item.type === 'agenda' && item.brandColor ? {
                          backgroundColor: `${item.brandColor}15`,
                          color: item.brandColor,
                          borderColor: `${item.brandColor}30`
                        } : {}
                      }
                    >
                      <span className="shrink-0">{item.icon}</span>
                      <span className="text-xs font-bold truncate leading-tight flex-1">
                        {item.title || item.text}
                      </span>
                    </button>
                    {/* Hover Preview Card */}
                    <CalendarHoverCard item={item} isVisible={hoveredItemId === item.id} />
                  </div>
                ))}
              </div>

              {/* Day Warnings */}
              {loadWarn && (
                <div className="mt-auto pt-2" title="Cuidado, carga excessiva para sua energia atual">
                   <div className="flex items-center gap-1.5 px-3 py-1 bg-[var(--danger)]/10 rounded-[var(--radius-pill)] border border-[var(--danger)]/20 animate-pulse">
                      <AlertTriangle className="w-3 h-3 text-[var(--danger)]" />
                      <span className="text-2xs font-semibold text-[var(--danger)]">Carga Excessiva</span>
                   </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>
      </div>
    </Surface>
  );
}
