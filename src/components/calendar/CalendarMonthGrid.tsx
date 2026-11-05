import {INICIO_DA_SEMANA} from '../../lib/semana.ts';
import { Text } from '../ui/Text';
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
  headerFormat?: 'full' | 'short' | 'compact';
  dayNumberAlign?: 'start' | 'end';
  minCellHeight?: number;
  expandContent?: boolean;
  stickyHeader?: boolean;
  className?: string;
  tone?: 'flat' | 'elevated';
  /** Sábado e domingo com um fundo levemente diferente. */
  tintWeekends?: boolean;
  renderDayContent: (props: CalendarMonthGridDayProps) => ReactNode;
  getDayClassName?: (props: CalendarMonthGridDayProps) => string | undefined;
  /** Clique ou Enter/Espaço no dia. */
  onDayClick?: (props: CalendarMonthGridDayProps, event: React.MouseEvent | React.KeyboardEvent) => void;
  onDayDragOver?: (props: CalendarMonthGridDayProps, event: React.DragEvent) => void;
  onDayDragLeave?: (props: CalendarMonthGridDayProps) => void;
  onDayDrop?: (props: CalendarMonthGridDayProps, event: React.DragEvent) => void;
  weekAsideLabel?: string;
  renderWeekAside?: (weekStart: Date) => ReactNode;
}

const WEEKDAYS_SHORT_PT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'] as const;

/**
 * Rótulo da coluna de um calendário mensal: só o dia da semana, sem data,
 * porque a linha de cabeçalho vale para todas as semanas da grade.
 */
export function weekdayHeaderLabel(day: Date) {
  const full = format(day, 'EEEE', {locale: ptBR}).split('-')[0];
  const shortName = WEEKDAYS_SHORT_PT[day.getDay()];
  return {
    compact: format(day, 'EEEEE', {locale: ptBR}).toUpperCase(),
    short: shortName,
    full: full.charAt(0).toUpperCase() + full.slice(1),
  };
}

export function CalendarMonthGrid({
  anchorDate,
  selectedDate,
  onSelectDate,
  weekStartsOn = INICIO_DA_SEMANA,
  headerFormat = 'full',
  dayNumberAlign = 'end',
  minCellHeight = 120,
  expandContent = false,
  stickyHeader = false,
  className,
  tone = 'flat',
  tintWeekends = false,
  renderDayContent,
  getDayClassName,
  onDayClick,
  onDayDragOver,
  onDayDragLeave,
  onDayDrop,
  weekAsideLabel,
  renderWeekAside,
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

  const headerDays = weeks[0];

  const columnClass = renderWeekAside
    ? 'grid grid-cols-[9.5rem_repeat(7,minmax(0,1fr))]'
    : 'grid grid-cols-7';

  const elevated = tone === 'elevated';
  const headerLabelClass = 't-label uppercase tracking-wide text-[var(--text-secondary)]';

  return (
    <div
      role="grid"
      className={cn(
        stickyHeader ? 'overflow-visible' : 'overflow-hidden',
        'w-full min-w-0 rounded-[var(--radius-card)] border bg-[var(--bg-elevated)] [&>[role=row]:last-child>*]:border-b-0',
        elevated
          ? 'border-[var(--border-strong)] shadow-[var(--shadow-raised)]'
          : 'border-[var(--border-color)]',
        className,
      )}
    >
      <div
        role="row"
        className={cn(
          columnClass,
          stickyHeader && 'sticky top-0 z-10 bg-[var(--bg-elevated)]',
          'border-b',
          'border-[var(--border-color)]',
          elevated && 'bg-[var(--surface-subtle)]',
        )}
      >
        {renderWeekAside ? (
          <div role="columnheader" className="flex min-w-0 items-center border-r border-[var(--border-color)] px-2 py-2">
            <span className={headerLabelClass}>
              {weekAsideLabel ?? 'Ritmo'}
            </span>
          </div>
        ) : null}
        {headerDays.map(day => {
          const labels = weekdayHeaderLabel(day);
          const headerText =
            headerFormat === 'short'
              ? labels.short
              : headerFormat === 'compact'
              ? labels.compact
              : labels.full;

          return (
            <div
              key={`header-${day.toISOString()}`}
              role="columnheader"
              className={cn(
                'min-w-0 border-r border-[var(--border-color)] px-1 py-2 text-center last:border-r-0 sm:px-2',
                tintWeekends && (day.getDay() === 0 || day.getDay() === 6) && 'planejamento-fim-de-semana',
              )}
            >
              <Text variant="label" as="span" className={cn(headerLabelClass)}>
                {headerText}
              </Text>
            </div>
          );
        })}
      </div>

      {weeks.map(week => (
        <div key={week[0].toISOString()} role="row" className={columnClass}>
          {renderWeekAside ? (
            <div
              role="rowheader"
              style={{minHeight: minCellHeight}}
              className="relative min-h-0 border-b border-r border-[var(--border-color)] bg-[var(--bg-elevated)]"
            >
              <div className="absolute inset-0 overflow-hidden p-1.5">
                {renderWeekAside(week[0])}
              </div>
            </div>
          ) : null}
          {week.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const inMonth = isSameMonth(day, anchorDate);
            const isToday = isSameDay(day, today);
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
            const dayProps: CalendarMonthGridDayProps = {day, dateKey, inMonth, isToday, isSelected};
            const extraClass = getDayClassName?.(dayProps);

            const interactive = Boolean(onSelectDate || onDayClick);

            return (
              // O dia é uma célula da grade que recebe foco: Enter e Espaço fazem o mesmo que o clique.
              // Não vira <button> porque dentro dele há outros botões (eventos, novo post-it).
              <div
                key={dateKey}
                role="gridcell"
                data-date={dateKey}
                tabIndex={interactive ? 0 : undefined}
                aria-selected={interactive ? isSelected : undefined}
                style={{minHeight: minCellHeight}}
                onClick={interactive ? event => {
                  onSelectDate?.(day);
                  onDayClick?.(dayProps, event);
                } : undefined}
                onKeyDown={interactive ? event => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  onSelectDate?.(day);
                  onDayClick?.(dayProps, event);
                } : undefined}
                onDragOver={event => onDayDragOver?.(dayProps, event)}
                onDragLeave={() => onDayDragLeave?.(dayProps)}
                onDrop={event => onDayDrop?.(dayProps, event)}
                className={cn(
                  'flex min-w-0 flex-col border-b border-r border-[var(--border-color)] p-1.5 transition-colors last:border-r-0 sm:p-2',
                  interactive && 'cursor-pointer hover:bg-[color-mix(in_srgb,var(--surface-subtle),transparent_30%)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--accent-blue)]',
                  expandContent && 'h-auto',
                  // Fora do mês: fundo da página e número apagado, sem opacidade (o texto mantém contraste).
                  !inMonth && 'bg-[var(--bg-primary)]',
                  isToday && 'bg-[var(--bg-hover)]',
                  isSelected && !isToday && 'bg-[color-mix(in_srgb,var(--accent),transparent_95%)]',
                  extraClass,
                )}
              >
                <div className={cn('mb-1.5 flex shrink-0', dayNumberAlign === 'start' ? 'justify-start' : 'justify-end')}>
                  <Text variant="bodyStrong" as="span"
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full',
                      isToday
                        ? 'bg-[#ec4899] text-white shadow-sm'
                        : isSelected
                          ? 'bg-[color-mix(in_srgb,var(--accent),transparent_88%)] text-[var(--text-primary)]'
                          : inMonth
                            ? 'text-[var(--text-primary)]'
                            : 'text-[var(--text-tertiary)]',
                    )}
                  >
                    {format(day, 'd')}
                  </Text>
                </div>
                <div
                  className={
                    expandContent
                      ? 'space-y-0.5 overflow-visible'
                      : 'min-h-0 flex-1 space-y-0.5 overflow-y-auto'
                  }
                >
                  {renderDayContent(dayProps)}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
