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
import { useAppContext } from '../../context/AppContext';
import { Content, Partnership, AgendaItem, Look, Cenario } from '../../types';
import { cn, getEventDates } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { STATUS_CONFIG } from '../../constants';
import { getStatusIcon } from '../../pages/EditorialCalendar';
import { CalendarHoverCard } from './CalendarHoverCard';

interface CalendarGridProps {
  activeLayers: string[];
  onItemClick: (item: any) => void;
}

export function CalendarGrid({ activeLayers, onItemClick }: CalendarGridProps) {
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
      state.partnerships
        .filter(p => !p.archived)
        .forEach(p => {
          const pDates = getEventDates(p);
          if (pDates.includes(dayStr)) {
            const stSet = STATUS_CONFIG[p.status];
            const IconComponent = stSet ? getStatusIcon(stSet.icon) : Star;
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
      state.agenda
        .filter(a => {
          if (a.partnershipId) {
            const p = state.partnerships.find(proj => proj.id === a.partnershipId);
            return !p?.archived && p?.status !== 'Finalizado';
          }
          return true;
        })
        .forEach(a => {
        if (a.date === dayStr) {
          items.push({ 
            ...a, 
            type: 'agenda', 
            icon: a.external ? <Star className="w-2.5 h-2.5" /> : <CalendarIcon className="w-2.5 h-2.5" /> 
          });
        }
      });
    }

    return items;
  };

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-xl shadow-black/5 animate-in zoom-in-95 duration-500">
      <div className="overflow-x-auto no-scrollbar">
      <div className="min-w-[800px] md:min-w-0">
      {/* Calendar Header */}
      <div className="p-4 md:p-8 border-b border-[var(--border-color)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-6 w-full md:w-auto">
           <div className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl shadow-sm flex-1 md:flex-none justify-center md:justify-start">
             <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 text-[var(--accent-blue)]" />
             <span className="text-[11px] md:text-sm font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-[var(--text-primary)]">
               {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
             </span>
           </div>
           
           <div className="flex gap-1 md:gap-2 p-1 bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-2xl">
             <button onClick={prevMonth} className="p-1.5 md:p-2 hover:bg-[var(--border-color)] rounded-xl transition-colors"><ChevronLeft className="w-4 h-4 md:w-5 md:h-5" /></button>
             <button onClick={() => setCurrentDate(new Date())} className="px-3 md:px-5 py-1.5 md:py-2 text-[8px] md:text-[10px] font-black uppercase tracking-widest hover:bg-[var(--border-color)] rounded-xl transition-colors">Hoje</button>
             <button onClick={nextMonth} className="p-1.5 md:p-2 hover:bg-[var(--border-color)] rounded-xl transition-colors"><ChevronRight className="w-4 h-4 md:w-5 md:h-5" /></button>
           </div>
        </div>

        <div className="flex md:hidden w-full overflow-x-auto gap-4 py-2 border-t border-[var(--border-color)] no-scrollbar">
           <div className="flex items-center gap-2 shrink-0"><Video className="w-3 h-3 text-[var(--accent-orange)]" /><span className="text-[8px] font-bold uppercase tracking-wider opacity-60">Gravação</span></div>
           <div className="flex items-center gap-2 shrink-0"><Send className="w-3 h-3 text-[var(--accent-blue)]" /><span className="text-[8px] font-bold uppercase tracking-wider opacity-60">Postagens</span></div>
           <div className="flex items-center gap-2 shrink-0"><Star className="w-3.5 h-3.5 text-amber-500" /><span className="text-[8px] font-bold uppercase tracking-wider opacity-60">Publicidade</span></div>
        </div>

        <div className="hidden md:flex items-center gap-4 text-[var(--text-tertiary)] text-[9px] font-black uppercase tracking-widest opacity-60">
           <div className="flex items-center gap-2"><Video className="w-3 h-3 text-[var(--accent-orange)]" /> Gravação</div>
           <div className="h-1 w-1 bg-gray-400 rounded-full" />
           <div className="flex items-center gap-2"><Send className="w-3 h-3 text-[var(--accent-blue)]" /> Postagens</div>
           <div className="h-1 w-1 bg-gray-400 rounded-full" />
           <div className="flex items-center gap-2"><Star className="w-3.5 h-3.5 text-amber-500" /> Publicidade</div>
        </div>
      </div>

      {/* Week Day Labels */}
      <div className="grid grid-cols-7 border-b border-[var(--border-color)] bg-[var(--bg-hover)]/30">
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
          <div key={d} className="py-2 md:py-4 text-center text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
            {d}
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
          const energy = state.energyLogs.find(l => l.date === dayId)?.level || 0;
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
                  "text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full transition-all",
                  activeToday ? "bg-[var(--accent-blue)] text-white shadow-lg" : "text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]"
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
                        "w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 transition-all group/item shadow-sm border border-transparent",
                        item.type === 'recording' && "bg-orange-500/5 text-orange-600 hover:bg-orange-500/10 hover:border-orange-500/20",
                        item.type === 'post' && "bg-blue-500/5 text-blue-600 hover:bg-blue-500/10 hover:border-blue-500/20",
                        item.type === 'partnership' && "hover:border-current",
                        item.type === 'agenda' && !item.brandColor && "bg-purple-500/5 text-purple-600 hover:bg-purple-500/10 hover:border-purple-500/20",
                        item.status === 'Postado' && "opacity-40 grayscale"
                      )}
                      style={
                        item.type === 'partnership' ? {
                          backgroundColor: `${STATUS_CONFIG[item.status]?.color || '#f59e0b'}15`,
                          color: STATUS_CONFIG[item.status]?.color || '#d97706'
                        } : item.type === 'agenda' && item.brandColor ? {
                          backgroundColor: `${item.brandColor}15`,
                          color: item.brandColor,
                          borderColor: `${item.brandColor}30`
                        } : {}
                      }
                    >
                      <span className="shrink-0">{item.icon}</span>
                      <span className="text-[10px] font-bold truncate leading-tight flex-1">
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
                   <div className="flex items-center gap-1.5 px-3 py-1 bg-red-400/10 rounded-full border border-red-400/20 animate-pulse">
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-red-500">Carga Excessiva</span>
                   </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>
      </div>
    </div>
  );
}
