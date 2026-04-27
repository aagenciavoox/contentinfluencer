import { format, isSameDay, isToday } from 'date-fns';
import { CalendarItem, ITEM_CLASSES } from './types';
import { cn } from '../../lib/utils';

interface HarvestMonthGridProps {
  currentDate: Date;
  days: Date[];
  itemsByDate: Record<string, CalendarItem[]>;
  selectedDay: Date | null;
  onSelectDay: (day: Date | null) => void;
}

export function HarvestMonthGrid({
  currentDate,
  days,
  itemsByDate,
  selectedDay,
  onSelectDay,
}: HarvestMonthGridProps) {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[2.5rem] overflow-hidden shadow-xl">
      <div className="grid grid-cols-7 border-b border-[var(--border-color)] bg-[var(--bg-hover)]/30">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dayLabel) => (
          <div
            key={dayLabel}
            className="py-5 text-center text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-tertiary)] italic"
          >
            {dayLabel}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const items = itemsByDate[dateStr] || [];
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isTodayDay = isToday(day);
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelectDay(isSelected ? null : day)}
              className={cn(
                'min-h-[60px] md:min-h-[130px] p-1.5 md:p-3 border-r border-b border-[var(--border-color)] transition-colors text-left w-full',
                !isCurrentMonth && 'bg-[var(--bg-hover)]/20 opacity-30',
                (index + 1) % 7 === 0 && 'border-r-0',
                isSelected
                  ? 'bg-[var(--text-primary)]/5 ring-2 ring-inset ring-[var(--text-primary)]/20'
                  : 'hover:bg-[var(--bg-hover)]/40 cursor-pointer'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={cn(
                    'text-xs font-black w-7 h-7 flex items-center justify-center rounded-xl',
                    isTodayDay
                      ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-md'
                      : 'text-[var(--text-tertiary)]'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {items.length > 2 && (
                  <span className="text-[8px] font-black text-[var(--text-tertiary)]">
                    +{items.length}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap gap-1 md:hidden">
                  {items.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className={cn('w-2 h-2 rounded-full border', ITEM_CLASSES[item.tipo](item.status))}
                      style={item.tipo === 'parceria' && item.cor ? { backgroundColor: item.cor } : {}}
                    />
                  ))}
                  {items.length > 4 && (
                    <span className="text-[7px] font-black text-[var(--text-tertiary)]">+{items.length - 4}</span>
                  )}
                </div>

                <div className="hidden md:block space-y-1">
                  {items.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        'px-1.5 py-1 rounded-lg text-[8px] font-black leading-tight border truncate uppercase tracking-tight',
                        ITEM_CLASSES[item.tipo](item.status)
                      )}
                      style={item.tipo === 'parceria' && item.cor ? { borderColor: item.cor } : {}}
                      title={item.titulo}
                    >
                      <span className="truncate block">{item.titulo}</span>
                    </div>
                  ))}
                  {items.length > 3 && (
                    <p className="text-[8px] font-black text-[var(--text-tertiary)] pl-1">
                      +{items.length - 3} mais
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
