import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  format, 
  addDays, 
  startOfToday, 
  isSameDay, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval,
  addMonths,
  isToday,
  startOfWeek,
  endOfWeek,
  isSameMonth
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Video, Send, Star, Calendar as CalendarIcon, ChevronRight, Zap } from 'lucide-react';
import { cn, getEventDates } from '../../lib/utils';
import { Content, Partnership, AgendaItem } from '../../types';

interface AgendaViewProps {
  contents: Content[];
  partnerships: Partnership[];
  externalEvents: AgendaItem[];
  activeLayers: string[];
  onSelectContent: (content: Content) => void;
}

export function CalendarAgendaView({ 
  contents, 
  partnerships, 
  externalEvents, 
  activeLayers,
  onSelectContent 
}: AgendaViewProps) {
  const [monthsToShow, setMonthsToShow] = useState(3); // Começa com 3 meses
  const today = startOfToday();

  // Gera a lista de meses e dias
  const months = useMemo(() => {
    const list = [];
    for (let i = 0; i < monthsToShow; i++) {
      const monthDate = addMonths(startOfMonth(today), i);
      const days = eachDayOfInterval({
        start: i === 0 ? today : startOfMonth(monthDate),
        end: endOfMonth(monthDate)
      });
      list.push({ date: monthDate, days });
    }
    return list;
  }, [monthsToShow, today]);

  // Função para pegar itens de um dia específico
  const getItemsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const items: any[] = [];

    if (activeLayers.includes('recordings')) {
      contents.filter(c => c.recordingDate === dateStr && c.status !== 'Postado')
        .forEach(c => items.push({ ...c, __type: 'recording' }));
    }

    if (activeLayers.includes('posts')) {
      contents.filter(c => c.publishDate === dateStr)
        .forEach(c => items.push({ ...c, __type: 'post' }));
    }

    if (activeLayers.includes('partnerships')) {
      partnerships.filter(p => !p.archived && getEventDates(p).includes(dateStr))
        .forEach(p => items.push({ ...p, __type: 'partnership' }));
    }

    if (activeLayers.includes('agenda')) {
      externalEvents.filter(e => e.date === dateStr)
        .forEach(e => items.push({ ...e, __type: 'external' }));
    }

    return items;
  };

  // Handler para scroll infinito usando IntersectionObserver
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setMonthsToShow(prev => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, []);

  // State para o dia selecionado (para mostrar itens no mobile)
  const [selectedDayItems, setSelectedDayItems] = useState<{date: Date, items: any[]} | null>(null);

  return (
    <div className="flex flex-col gap-8 pb-32">
      {months.map((month, mIdx) => {
        const startDate = startOfWeek(month.date, { weekStartsOn: 1 });
        const endDate = endOfWeek(endOfMonth(month.date), { weekStartsOn: 1 });
        const gridDays = eachDayOfInterval({ start: startDate, end: endDate });

        return (
          <div key={mIdx} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[2rem] overflow-hidden shadow-xl shadow-black/5 animate-in zoom-in-95 duration-500">
            <div className="p-4 md:p-6 border-b border-[var(--border-color)] flex items-center justify-center bg-[var(--bg-primary)]">
               <CalendarIcon className="w-4 h-4 text-[var(--accent-blue)] mr-2" />
               <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-primary)]">
                 {format(month.date, 'MMMM yyyy', { locale: ptBR })}
               </h2>
            </div>
            
            <div className="grid grid-cols-7 border-b border-[var(--border-color)] bg-[var(--bg-hover)]/30">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
                <div key={d} className="py-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 border-collapse">
              {gridDays.map((day, i) => {
                const items = getItemsForDay(day);
                const isCurrentMonth = isSameMonth(day, month.date);
                const activeToday = isToday(day);
                const dayId = format(day, 'yyyy-MM-dd');

                return (
                  <div 
                    key={dayId} 
                    onClick={() => items.length > 0 && setSelectedDayItems({date: day, items})}
                    className={cn(
                      "aspect-square border-r border-b border-[var(--border-color)] p-1 flex flex-col items-center justify-start transition-all cursor-pointer relative",
                      !isCurrentMonth ? "opacity-20 bg-[var(--bg-hover)]/30" : "bg-[var(--bg-primary)]/40 hover:bg-[var(--bg-hover)]",
                      activeToday && "after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-[var(--accent-blue)]"
                    )}
                  >
                    <div className="w-full flex justify-center mb-1 mt-1">
                      <span className={cn(
                        "text-[12px] font-black w-6 h-6 flex items-center justify-center rounded-full transition-all",
                        activeToday ? "bg-[var(--accent-blue)] text-white shadow-lg" : "text-[var(--text-primary)]"
                      )}>
                        {format(day, 'd')}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 justify-center px-1">
                      {items.slice(0, 4).map((item, idx) => (
                        <div 
                          key={idx}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: 
                              item.__type === 'recording' ? '#f97316' :
                              item.__type === 'post' ? '#3b82f6' :
                              item.__type === 'partnership' ? '#f59e0b' : '#a855f7'
                          }}
                        />
                      ))}
                      {items.length > 4 && (
                        <span className="text-[8px] font-bold text-[var(--text-tertiary)] w-full text-center leading-none">+{items.length - 4}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      
      <div ref={observerTarget} className="py-10 text-center">
        <div className="inline-block w-6 h-6 border-2 border-[var(--border-color)] border-t-[var(--accent-blue)] rounded-full animate-spin" />
      </div>

      {/* Popover de eventos do dia (Mobile) */}
      {selectedDayItems && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
             onClick={() => setSelectedDayItems(null)}>
          <div className="bg-[var(--bg-primary)] w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom flex flex-col max-h-[80vh]"
               onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 px-2">
              <div>
                <h3 className="text-lg font-black text-[var(--text-primary)]">{format(selectedDayItems.date, "dd 'de' MMMM", { locale: ptBR })}</h3>
                <p className="text-[10px] font-black uppercase text-[var(--text-tertiary)] tracking-widest">{selectedDayItems.items.length} EVENTOS</p>
              </div>
              <button onClick={() => setSelectedDayItems(null)} className="p-2 bg-[var(--bg-hover)] rounded-full">
                 <span className="text-xl leading-none">×</span>
              </button>
            </div>
            <div className="overflow-y-auto space-y-3 p-2 custom-scrollbar flex-1 pb-10">
              {selectedDayItems.items.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => { setSelectedDayItems(null); item.__type !== 'external' && onSelectContent(item); }}
                  className={cn(
                    "w-full text-left p-3 rounded-2xl border flex items-center justify-between shadow-sm relative",
                     item.__type === 'recording' ? "bg-[#f9731610] border-[#f9731630]" :
                     item.__type === 'post' ? "bg-[#3b82f610] border-[#3b82f630]" :
                     item.__type === 'partnership' ? "bg-[#f59e0b10] border-[#f59e0b30]" : "bg-[#a855f710] border-[#a855f730]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {item.__type === 'recording' && <Video className="w-5 h-5 text-orange-500" />}
                    {item.__type === 'post' && <Send className="w-5 h-5 text-blue-500" />}
                    {item.__type === 'partnership' && <Star className="w-5 h-5 text-amber-500" />}
                    {item.__type === 'external' && <CalendarIcon className="w-5 h-5 text-purple-500" />}
                    <div>
                      <p className="font-bold text-sm text-[var(--text-primary)] truncate text-left max-w-[200px]">{item.title || item.description || item.text}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-60 text-[var(--text-tertiary)] text-left mt-0.5">
                        {item.__type === 'recording' ? 'Gravação' : item.__type === 'post' ? 'Postagem' : item.__type === 'partnership' ? 'Publicidade' : 'Evento'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-40 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
