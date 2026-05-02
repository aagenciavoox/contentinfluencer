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
import {BriefcaseBusiness, CalendarDays, Clock3, Mic2, Send} from 'lucide-react';
import {AgendaItem, Content, Projeto} from '../../../lib/database';
import {cn} from '../../../lib/utils';

type MonthlyCalendarViewProps = {
  contents: Content[];
  agendaItems: AgendaItem[];
  projetos: Projeto[];
  activeLayers: string[];
  searchTerm: string;
  sortValue: string;
  monthsToShow: number;
};

type CalendarEntry = {
  id: string;
  type: 'recording' | 'publish' | 'agenda' | 'project';
  label: string;
  secondary?: string;
};

function buildEntries(
  contents: Content[],
  agendaItems: AgendaItem[],
  projetos: Projeto[],
  activeLayers: string[],
  searchTerm: string,
  sortValue: string
) {
  const map = new Map<string, CalendarEntry[]>();
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const push = (date: string | null | undefined, entry: CalendarEntry) => {
    if (!date) return;

    if (normalizedSearch) {
      const haystack = [entry.label, entry.secondary || ''].join(' ').toLowerCase();
      if (!haystack.includes(normalizedSearch)) return;
    }

    const key = date.slice(0, 10);
    const current = map.get(key) || [];
    current.push(entry);
    map.set(key, current);
  };

  if (activeLayers.includes('recordings')) {
    contents.forEach(content => {
      push(content.recordingDate, {
        id: `${content.id}-rec`,
        type: 'recording',
        label: content.title || '(sem titulo)',
        secondary: content.status || 'Gravacao',
      });
    });
  }

  if (activeLayers.includes('posts')) {
    contents.forEach(content => {
      push(content.publishDate, {
        id: `${content.id}-pub`,
        type: 'publish',
        label: content.title || '(sem titulo)',
        secondary: content.status || 'Publicacao',
      });
    });
  }

  if (activeLayers.includes('agenda')) {
    agendaItems.forEach(item => {
      push(item.date, {
        id: item.id,
        type: 'agenda',
        label: item.title,
        secondary: item.tipo,
      });
    });
  }

  if (activeLayers.includes('projects')) {
    projetos
      .filter(projeto => !projeto.deletedAt)
      .forEach(projeto => {
        push(projeto.dataInicio, {
          id: `${projeto.id}-start`,
          type: 'project',
          label: projeto.nome,
          secondary: 'Inicio do projeto',
        });

        push(projeto.dataFim, {
          id: `${projeto.id}-deadline`,
          type: 'project',
          label: projeto.nome,
          secondary: 'Prazo final',
        });

        projeto.etapas.forEach(etapa => {
          push(etapa.dataPrazo, {
            id: etapa.id,
            type: 'project',
            label: projeto.nome,
            secondary: `Etapa: ${etapa.nome}`,
          });
        });
      });
  }

  const typeOrder: Record<CalendarEntry['type'], number> = {
    recording: 0,
    publish: 1,
    project: 2,
    agenda: 3,
  };

  map.forEach((entries, key) => {
    const sortedEntries = [...entries].sort((left, right) => {
      if (sortValue === 'titulo:asc') {
        return left.label.localeCompare(right.label, 'pt-BR');
      }

      if (sortValue === 'tipo:asc') {
        return typeOrder[left.type] - typeOrder[right.type] || left.label.localeCompare(right.label, 'pt-BR');
      }

      return typeOrder[left.type] - typeOrder[right.type] || left.label.localeCompare(right.label, 'pt-BR');
    });

    map.set(key, sortedEntries);
  });

  return map;
}

const ENTRY_STYLES: Record<CalendarEntry['type'], string> = {
  recording: 'border border-[var(--accent-orange)]/30 text-[var(--accent-orange)] bg-[var(--accent-orange)]/5',
  publish: 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]',
  project: 'bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]',
  agenda: 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]',
};

export function MonthlyCalendarView({
  contents,
  agendaItems,
  projetos,
  activeLayers,
  searchTerm,
  sortValue,
  monthsToShow,
}: MonthlyCalendarViewProps) {
  const today = new Date();
  const months = Array.from({length: monthsToShow}, (_, index) => addMonths(today, index));
  const entriesByDate = buildEntries(contents, agendaItems, projetos, activeLayers, searchTerm, sortValue);

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
                  Gravacoes, publis, projetos e agenda
                </p>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-[var(--border-color)] bg-[var(--bg-hover)]/40">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(label => (
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
                          title={entry.secondary ? `${entry.label} - ${entry.secondary}` : entry.label}
                        >
                          <div className="flex items-center gap-1">
                            {entry.type === 'recording' ? (
                              <Mic2 className="h-2.5 w-2.5 shrink-0" />
                            ) : entry.type === 'publish' ? (
                              <Send className="h-2.5 w-2.5 shrink-0" />
                            ) : entry.type === 'project' ? (
                              <BriefcaseBusiness className="h-2.5 w-2.5 shrink-0" />
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
