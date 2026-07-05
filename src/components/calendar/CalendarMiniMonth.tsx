import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {Text} from '../ui/Text';
import {cn} from '../../lib/utils';

interface CalendarMiniMonthProps {
  monthDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  weekStartsOn?: 0 | 1;
  className?: string;
}

const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function CalendarMiniMonth({
  monthDate,
  selectedDate,
  onSelectDate,
  onMonthChange,
  weekStartsOn = 0,
  className,
}: CalendarMiniMonthProps) {
  const today = new Date();
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, {weekStartsOn});
  const gridEnd = endOfWeek(monthEnd, {weekStartsOn});
  const days = eachDayOfInterval({start: gridStart, end: gridEnd});

  const handleDayClick = (day: Date) => {
    onSelectDate(day);
    if (!isSameMonth(day, monthDate)) {
      onMonthChange(startOfMonth(day));
    }
  };

  return (
    <div className={cn('select-none', className)}>
      <div className="mb-2 flex items-center justify-between gap-1">
        <Text variant="label" className="capitalize text-[var(--text-primary)]">
          {format(monthDate, 'MMMM yyyy', {locale: ptBR})}
        </Text>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onMonthChange(subMonths(monthDate, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(monthDate, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAY_LABELS.map((label, index) => (
          <div
            key={`${label}-${index}`}
            className="py-1 text-center text-2xs font-semibold text-[var(--text-tertiary)]"
          >
            {label}
          </div>
        ))}

        {days.map(day => {
          const inMonth = isSameMonth(day, monthDate);
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selectedDate);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleDayClick(day)}
              className={cn(
                'flex h-7 w-full items-center justify-center rounded-full text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                !inMonth && 'text-[var(--text-tertiary)] opacity-45',
                inMonth && !isToday && !isSelected && 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
                isSelected && !isToday && 'bg-[color-mix(in_srgb,var(--accent-blue),transparent_82%)] text-[var(--accent-blue)]',
                isToday && 'bg-[var(--accent-blue)] text-white',
              )}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}
