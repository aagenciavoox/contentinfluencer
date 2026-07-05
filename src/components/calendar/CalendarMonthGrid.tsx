import type {ReactNode} from 'react';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {cn} from '../../lib/utils';

export interface CalendarMonthGridDayProps {
  day: Date;
  dateKey: string;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

interface CalendarMonthGridProps {
  anchorDate: Date;
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
  weekStartsOn?: 0 | 1;
  minCellHeight?: number;
  className?: string;
  renderDayContent: (props: CalendarMonthGridDayProps) => ReactNode;
  getDayClassName?: (props: CalendarMonthGridDayProps) => string | undefined;
  onDayClick?: (props: CalendarMonthGridDayProps, event: React.MouseEvent) => void;
  onDayDragOver?: (props: CalendarMonthGridDayProps, event: React.DragEvent) => void;
  onDayDragLeave?: (props: CalendarMonthGridDayProps) => void;
  onDayDrop?: (props: CalendarMonthGridDayProps, event: React.DragEvent) => void;
  headerWeekDate?: Date;
}

export function CalendarMonthGrid({
  anchorDate,
  selectedDate,
  onSelectDate,
  weekStartsOn = 0,
  minCellHeight = 120,
  className,
  renderDayContent,
  getDayClassName,
  onDayClick,
  onDayDragOver,
  onDayDragLeave,
  onDayDrop,
  headerWeekDate,
}: CalendarMonthGridProps) {
  const today = new Date();
  const monthStart = startOfMonth(anchorDate);
  const monthEnd = endOfMonth(anchorDate);
  const gridStart = startOfWeek(monthStart, {weekStartsOn});
  const gridEnd = endOfWeek(monthEnd, {weekStartsOn});
  const days = eachDayOfInterval({start: gridStart, end: gridEnd});
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const headerDays = headerWeekDate
    ? eachDayOfInterval({
        start: startOfWeek(headerWeekDate, {weekStartsOn}),
        end: endOfWeek(headerWeekDate, {weekStartsOn}),
      })
    : weeks[0];

  return (
    <div className={cn('overflow-x-auto', className)}>
      <div className="min-w-[720px] border border-[var(--border-color)] bg-[var(--bg-primary)]">
        <div className="grid grid-cols-7 border-b border-[var(--border-color)]">
          {headerDays.map(day => (
            <div
              key={`header-${day.toISOString()}`}
              className="border-r border-[var(--border-color)] px-2 py-2 text-center last:border-r-0"
            >
              <span className="text-2xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                {format(day, 'EEE', {locale: ptBR}).replace('.', '')}. {format(day, 'd')}
              </span>
            </div>
          ))}
        </div>

        {weeks.map(week => (
          <div key={week[0].toISOString()} className="grid grid-cols-7">
            {week.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const inMonth = isSameMonth(day, anchorDate);
              const isToday = isSameDay(day, today);
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              const dayProps: CalendarMonthGridDayProps = {day, dateKey, inMonth, isToday, isSelected};
              const extraClass = getDayClassName?.(dayProps);

              return (
                <div
                  key={dateKey}
                  style={{minHeight: minCellHeight}}
                  onClick={event => {
                    onSelectDate?.(day);
                    onDayClick?.(dayProps, event);
                  }}
                  onDragOver={event => onDayDragOver?.(dayProps, event)}
                  onDragLeave={() => onDayDragLeave?.(dayProps)}
                  onDrop={event => onDayDrop?.(dayProps, event)}
                  className={cn(
                    'flex cursor-pointer flex-col border-b border-r border-[var(--border-color)] p-1.5 transition-colors last:border-r-0 hover:bg-[color-mix(in_srgb,var(--surface-subtle),transparent_30%)]',
                    !inMonth && 'bg-[var(--bg-hover)]/25 opacity-50',
                    isSelected && 'bg-[color-mix(in_srgb,var(--accent-blue),transparent_95%)]',
                    extraClass,
                  )}
                >
                  <div className="mb-1 flex shrink-0 justify-end">
                    <span
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                        isToday
                          ? 'bg-[var(--accent-blue)] text-white'
                          : isSelected
                            ? 'bg-[color-mix(in_srgb,var(--accent-blue),transparent_82%)] text-[var(--accent-blue)]'
                            : inMonth
                              ? 'text-[var(--text-primary)]'
                              : 'text-[var(--text-tertiary)]',
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
                    {renderDayContent(dayProps)}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
