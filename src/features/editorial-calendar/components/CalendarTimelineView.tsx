import {useMemo} from 'react';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {CalendarEventPill, editorialPillStyle} from '../../../components/calendar';
import {Text} from '../../../components/ui/Text';
import {cn} from '../../../lib/utils';
import type {CalendarEntry} from './MonthlyCalendarView';

export type TimelineLaneId = 'recording' | 'publish' | 'project' | 'agenda';

const TIMELINE_LANES: Array<{id: TimelineLaneId; label: string}> = [
  {id: 'recording', label: 'Gravação'},
  {id: 'publish', label: 'Publicação'},
  {id: 'project', label: 'Projetos'},
  {id: 'agenda', label: 'Eventos'},
];

const DAY_COLUMN_MIN_PX = 128;

export type TimelinePeriod = 'week' | 'month';

interface CalendarTimelineViewProps {
  anchorDate: Date;
  period: TimelinePeriod;
  weekStartsOn?: 0 | 1;
  entriesByDate: Map<string, CalendarEntry[]>;
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
  onSelectEntry?: (entry: CalendarEntry) => void;
  onPeriodChange?: (period: TimelinePeriod) => void;
}

function entryPillStyle(entry: CalendarEntry) {
  const useCustomColor = entry.color && (entry.type === 'project' || entry.type === 'agenda');
  return editorialPillStyle(useCustomColor ? entry.color : null, entry.type);
}

export function CalendarTimelineView({
  anchorDate,
  period,
  weekStartsOn = 0,
  entriesByDate,
  selectedDate,
  onSelectDate,
  onSelectEntry,
  onPeriodChange,
}: CalendarTimelineViewProps) {
  const today = new Date();

  const days = useMemo(() => {
    if (period === 'week') {
      return eachDayOfInterval({
        start: startOfWeek(anchorDate, {weekStartsOn}),
        end: endOfWeek(anchorDate, {weekStartsOn}),
      });
    }
    return eachDayOfInterval({
      start: startOfMonth(anchorDate),
      end: endOfMonth(anchorDate),
    });
  }, [anchorDate, period, weekStartsOn]);

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-color)] px-3 py-2.5">
        <div>
          <Text variant="sectionTitle">Linha do tempo</Text>
          <Text variant="meta" className="text-[var(--text-secondary)]">
            Eixo cronológico por dia, com raias por tipo de operação.
          </Text>
        </div>
        {onPeriodChange ? (
          <div className="flex items-center gap-0.5 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-0.5">
            {(['week', 'month'] as const).map(option => (
              <button
                key={option}
                type="button"
                onClick={() => onPeriodChange(option)}
                className={cn(
                  'min-h-8 rounded-[var(--radius-sm)] px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                  period === option
                    ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                )}
              >
                {option === 'week' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <div
          className="min-w-full"
          style={{
            width: `max(100%, ${days.length * DAY_COLUMN_MIN_PX + 112}px)`,
          }}
        >
          <div
            className="grid border-b border-[var(--border-color)] bg-[color-mix(in_srgb,var(--surface-subtle),transparent_10%)]"
            style={{gridTemplateColumns: `7rem repeat(${days.length}, minmax(${DAY_COLUMN_MIN_PX}px, 1fr))`}}
          >
            <div className="sticky left-0 z-[1] border-r border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-3" />
            {days.map(day => {
              const isToday = isSameDay(day, today);
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              return (
                <button
                  key={`head-${day.toISOString()}`}
                  type="button"
                  onClick={() => onSelectDate?.(day)}
                  className={cn(
                    'flex flex-col items-center gap-1 border-r border-[var(--border-color)] px-2 py-3 text-center last:border-r-0 transition-colors',
                    isToday && 'bg-[color-mix(in_srgb,var(--accent-blue),transparent_92%)]',
                    isSelected && !isToday && 'bg-[color-mix(in_srgb,var(--accent-blue),transparent_96%)]',
                  )}
                >
                  <span className="text-2xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                    {format(day, 'EEE', {locale: ptBR})}
                  </span>
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
                      isToday
                        ? 'bg-[var(--accent-blue)] text-white'
                        : isSelected
                          ? 'bg-[color-mix(in_srgb,var(--accent-blue),transparent_82%)] text-[var(--accent-blue)]'
                          : 'text-[var(--text-primary)]',
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                </button>
              );
            })}
          </div>

          {TIMELINE_LANES.map(lane => (
            <div
              key={lane.id}
              className="grid border-b border-[var(--border-color)] last:border-b-0"
              style={{gridTemplateColumns: `7rem repeat(${days.length}, minmax(${DAY_COLUMN_MIN_PX}px, 1fr))`}}
            >
              <div className="sticky left-0 z-[1] flex items-start border-r border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-3">
                <Text variant="label" className="text-[var(--text-secondary)]">
                  {lane.label}
                </Text>
              </div>
              {days.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const entries = (entriesByDate.get(dateKey) || []).filter(entry => entry.type === lane.id);
                const isToday = isSameDay(day, today);
                return (
                  <div
                    key={`${lane.id}-${dateKey}`}
                    onClick={() => onSelectDate?.(day)}
                    className={cn(
                      'min-h-[4.5rem] border-r border-[var(--border-color)] p-1.5 last:border-r-0',
                      isToday && 'bg-[color-mix(in_srgb,var(--accent-blue),transparent_97%)]',
                    )}
                  >
                    <div className="stack-sm">
                      {entries.map(entry => (
                        <CalendarEventPill
                          key={entry.id}
                          label={entry.label}
                          time={entry.time}
                          secondary={entry.secondary}
                          variant="compact"
                          style={entryPillStyle(entry)}
                          onClick={event => {
                            event.stopPropagation();
                            onSelectDate?.(day);
                            onSelectEntry?.(entry);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
