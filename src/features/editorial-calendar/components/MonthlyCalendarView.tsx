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
} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {CalendarDays, Clock3, Mic2, Send} from 'lucide-react';
import {AgendaItem, Content} from '../../../lib/database';
import {cn} from '../../../lib/utils';

type MonthlyCalendarViewProps = {
  contents: Content[];
  agendaItems: AgendaItem[];
  monthsToShow: number;
};

type CalendarEntry = {
  id: string;
  type: 'recording' | 'publish' | 'agenda';
  label: string;
};

function buildEntries(contents: Content[], agendaItems: AgendaItem[]) {
  const map = new Map<string, CalendarEntry[]>();

  const push = (date: string | null | undefined, entry: CalendarEntry) => {
    if (!date) return;
    const key = date.slice(0, 10);
    const current = map.get(key) || [];
    current.push(entry);
    map.set(key, current);
  };

  contents.forEach(content => {
    push(content.recordingDate, {
      id: `${content.id}-rec`,
      type: 'recording',
      label: content.title || '(sem título)',
    });
    push(content.publishDate, {
      id: `${content.id}-pub`,
      type: 'publish',
      label: content.title || '(sem título)',
    });
  });

  agendaItems.forEach(item => {
    push(item.date, {
      id: item.id,
      type: 'agenda',
      label: item.title,
    });
  });

  return map;
}

const ENTRY_STYLES: Record<CalendarEntry['type'], string> = {
  recording: 'border border-[var(--accent-orange)]/30 text-[var(--accent-orange)] bg-[var(--accent-orange)]/5',
  publish: 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]',
  agenda: 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]',
};

export function MonthlyCalendarView({
  contents,
  agendaItems,
  monthsToShow,
}: MonthlyCalendarViewProps) {
  const today = new Date();
  const months = Array.from({length: monthsToShow}, (_, index) => addMonths(today, index));
  const entriesByDate = buildEntries(contents, agendaItems);

  return (
    <div className="grid grid-cols-1 gap-6">
      {months.map(monthDate => {
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const gridStart = startOfWeek(monthStart, {weekStartsOn: 0});
        const gridEnd = endOfWeek(monthEnd, {weekStartsOn: 0});
        const days = eachDayOfInterval({start: gridStart, end: gridEnd});

        return (
          <section
            key={monthDate.toISOString()}
            className="overflow-hidden rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-sm"
          >
            <div className="flex items-center gap-3 border-b border-[var(--border-color)] px-5 py-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--bg-hover)]">
                <CalendarDays className="h-5 w-5 text-[var(--text-primary)] opacity-60" />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-[var(--text-primary)]">
                  {format(monthDate, 'MMMM yyyy', {locale: ptBR})}
                </h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-50">
                  Gravações, posts e agenda
                </p>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-[var(--border-color)] bg-[var(--bg-hover)]/40">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(label => (
                <div
                  key={label}
                  className="py-3 text-center text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60"
                >
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {days.map((day, index) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const entries = entriesByDate.get(dateKey) || [];
                const isCurrentMonth = isSameMonth(day, monthDate);
                const isToday = isSameDay(day, today);

                return (
                  <div
                    key={dateKey}
                    className={cn(
                      'min-h-[120px] border-b border-r border-[var(--border-color)] p-2 align-top',
                      !isCurrentMonth && 'bg-[var(--bg-hover)]/20 opacity-35',
                      (index + 1) % 7 === 0 && 'border-r-0'
                    )}
                  >
                    <div
                      className={cn(
                        'mb-2 flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-black',
                        isToday
                          ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                          : 'text-[var(--text-tertiary)]'
                      )}
                    >
                      {format(day, 'd')}
                    </div>

                    <div className="space-y-1">
                      {entries.slice(0, 3).map(entry => (
                        <div
                          key={entry.id}
                          className={cn(
                            'rounded-lg px-2 py-1 text-[8px] font-black uppercase tracking-wide',
                            ENTRY_STYLES[entry.type]
                          )}
                        >
                          <div className="flex items-center gap-1">
                            {entry.type === 'recording' ? (
                              <Mic2 className="h-2.5 w-2.5 shrink-0" />
                            ) : entry.type === 'publish' ? (
                              <Send className="h-2.5 w-2.5 shrink-0" />
                            ) : (
                              <Clock3 className="h-2.5 w-2.5 shrink-0" />
                            )}
                            <span className="truncate">{entry.label}</span>
                          </div>
                        </div>
                      ))}

                      {entries.length > 3 && (
                        <div className="text-center text-[8px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-50">
                          +{entries.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
