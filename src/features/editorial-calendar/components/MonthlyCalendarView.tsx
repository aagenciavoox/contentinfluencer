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
import {AgendaItem, Content, Platform, Projeto} from '../../../lib/database';
import {cn} from '../../../lib/utils';

type MonthlyCalendarViewProps = {
  contents: Content[];
  platforms: Platform[];
  agendaItems: AgendaItem[];
  projetos: Projeto[];
  activeLayers: string[];
  searchTerm: string;
  sortValue: string;
  monthsToShow: number;
  onSelectEntry?: (entry: CalendarEntry) => void;
  monthDate?: Date;
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
};

export type CalendarEntry = {
  id: string;
  type: 'recording' | 'publish' | 'agenda' | 'project';
  label: string;
  date: string;
  time?: string | null;
  secondary?: string;
  color?: string | null;
  contentId?: string;
  plataformaId?: string;
  agendaId?: string;
  projetoId?: string;
};

export function buildCalendarEntries(
  contents: Content[],
  platforms: Platform[],
  agendaItems: AgendaItem[],
  projetos: Projeto[],
  activeLayers: string[],
  searchTerm: string,
  sortValue: string
) {
  const map = new Map<string, CalendarEntry[]>();
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const platformNameById = new Map(platforms.map(platform => [platform.id, platform.nome]));

  const push = (date: string | null | undefined, entry: CalendarEntry) => {
    if (!date) return;

    if (normalizedSearch) {
      const haystack = [entry.label, entry.secondary || ''].join(' ').toLowerCase();
      if (!haystack.includes(normalizedSearch)) return;
    }

    const key = date.slice(0, 10);
    const current = map.get(key) || [];
    current.push({...entry, date: key});
    map.set(key, current);
  };

  if (activeLayers.includes('recordings')) {
    contents.forEach(content => {
      push(content.recordingDate, {
        id: `${content.id}-rec`,
        type: 'recording',
        label: content.title || '(sem titulo)',
        date: '',
        contentId: content.id,
        secondary: content.status || 'Gravacao',
      });
    });
  }

  if (activeLayers.includes('posts')) {
    contents.forEach(content => {
      if (content.plataformas.length > 0) {
        content.plataformas.forEach(plataforma => {
          push(plataforma.publishDate || content.publishDate, {
            id: `${content.id}-pub-${plataforma.id}`,
            type: 'publish',
            label: content.title || '(sem titulo)',
            date: '',
            time: plataforma.publishTime || content.publishTime,
            contentId: content.id,
            plataformaId: plataforma.id,
            secondary: `${platformNameById.get(plataforma.platformId) || plataforma.platformId} - ${content.status || 'Publicacao'}`,
          });
        });
        return;
      }

      push(content.publishDate, {
        id: `${content.id}-pub`,
        type: 'publish',
        label: content.title || '(sem titulo)',
        date: '',
        time: content.publishTime,
        contentId: content.id,
        secondary: content.status || 'Publicacao',
      });
    });
  }

  if (activeLayers.includes('agenda')) {
    agendaItems.forEach(item => {
      const linkedProjeto = item.projetoId ? projetos.find(p => p.id === item.projetoId) : null;
      push(item.date, {
        id: item.id,
        type: 'agenda',
        label: item.title,
        date: '',
        time: item.time,
        agendaId: item.id,
        secondary: item.tipo,
        color: linkedProjeto?.color,
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
          date: '',
          projetoId: projeto.id,
          secondary: 'Início do projeto',
          color: projeto.color,
        });

        push(projeto.dataFim, {
          id: `${projeto.id}-deadline`,
          type: 'project',
          label: projeto.nome,
          date: '',
          projetoId: projeto.id,
          secondary: 'Data final',
          color: projeto.color,
        });

        projeto.etapas.forEach(etapa => {
          push(etapa.dataPrazo, {
            id: etapa.id,
            type: 'project',
            label: projeto.nome,
            date: '',
            projetoId: projeto.id,
            secondary: `Etapa: ${etapa.nome}`,
            color: projeto.color,
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
  recording: 'border border-red-100 text-red-600 bg-red-50/80',
  publish: 'border border-purple-100 bg-purple-50/80 text-purple-600',
  project: 'border border-blue-100 bg-blue-50/80 text-blue-600',
  agenda: 'border border-[color-mix(in_srgb,var(--accent-green),transparent_70%)] bg-[color-mix(in_srgb,var(--accent-green),transparent_89%)] text-[var(--accent-green)]',
};

export function MonthlyCalendarView({
  contents,
  platforms,
  agendaItems,
  projetos,
  activeLayers,
  searchTerm,
  sortValue,
  monthsToShow,
  onSelectEntry,
  monthDate,
  selectedDate,
  onSelectDate,
}: MonthlyCalendarViewProps) {
  const today = new Date();
  const months = monthDate ? [monthDate] : Array.from({length: monthsToShow}, (_, index) => addMonths(today, index));
  const entriesByDate = buildCalendarEntries(contents, platforms, agendaItems, projetos, activeLayers, searchTerm, sortValue);

  return (
    <div className="grid grid-cols-1 gap-8">
      {months.map(monthDate => {
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const gridStart = startOfWeek(monthStart, {weekStartsOn: 0});
        const gridEnd = endOfWeek(monthEnd, {weekStartsOn: 0});
        const days = eachDayOfInterval({start: gridStart, end: gridEnd});
        const intensityByWeekday = days.reduce<number[]>((acc, day) => {
          if (!isSameMonth(day, monthDate)) return acc;
          const entries = entriesByDate.get(format(day, 'yyyy-MM-dd')) || [];
          acc[day.getDay()] += Math.min(entries.length, 3);
          return acc;
        }, [0, 0, 0, 0, 0, 0, 0]);

        return (
          <section
            key={monthDate.toISOString()}
            className="overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] shadow-[var(--shadow-soft)]"
          >
            <div className="hidden items-center gap-3 border-b border-[var(--border-color)] px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--accent-green),transparent_88%)]">
                <CalendarDays className="h-5 w-5 text-[var(--accent-green)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-normal text-[var(--text-primary)]">
                  {format(monthDate, 'MMMM yyyy', {locale: ptBR})}
                </h2>
                <p className="text-[12px] font-normal tracking-normal text-[var(--text-secondary)]">
                  Gravacoes, publis, projetos e agenda
                </p>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-[var(--border-color)] bg-[color-mix(in_srgb,var(--surface-subtle),transparent_10%)]">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(label => (
                <div
                  key={label}
                  className="py-3 text-center text-[12px] font-medium tracking-normal text-[var(--text-tertiary)]"
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
                      'min-h-[132px] cursor-pointer border-b border-r border-[var(--border-color)] p-2.5 align-top transition-colors duration-200 hover:bg-[color-mix(in_srgb,var(--surface-subtle),transparent_10%)]',
                      !isCurrentMonth && 'bg-[var(--bg-hover)]/20 opacity-35',
                      selectedDate && isSameDay(day, selectedDate) && 'bg-[color-mix(in_srgb,var(--accent-blue),transparent_95%)]',
                      (index + 1) % 7 === 0 && 'border-r-0'
                    )}
                    onClick={() => onSelectDate?.(day)}
                  >
                    <div
                      className={cn(
                        'mb-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                        isToday
                          ? 'bg-[color-mix(in_srgb,var(--accent-blue),var(--accent-purple)_18%)] text-white shadow-[0_8px_18px_color-mix(in_srgb,var(--accent-blue),transparent_82%)]'
                          : selectedDate && isSameDay(day, selectedDate)
                            ? 'bg-[color-mix(in_srgb,var(--accent-blue),transparent_82%)] text-[var(--accent-blue)]'
                            : 'text-[var(--text-primary)]'
                      )}
                    >
                      {format(day, 'd')}
                    </div>

                    <div className="space-y-1.5">
                      {entries.slice(0, 4).map(entry => {
                        const useCustomColor = entry.color && (entry.type === 'project' || entry.type === 'agenda');
                        return (
                          <button
                            type="button"
                            key={entry.id}
                            onClick={event => {
                              event.stopPropagation();
                              onSelectEntry?.(entry);
                              onSelectDate?.(day);
                            }}
                            className={cn(
                              'w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold tracking-normal shadow-[0_1px_0_rgba(255,255,255,0.56)_inset] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/20',
                              !useCustomColor && ENTRY_STYLES[entry.type]
                            )}
                            style={useCustomColor ? { backgroundColor: `${entry.color}15`, color: entry.color! } : undefined}
                            title={[entry.label, entry.time, entry.secondary].filter(Boolean).join(' - ')}
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
                              {entry.time ? <span className="shrink-0">{entry.time}</span> : null}
                              <span className="truncate">{entry.label}</span>
                            </div>
                          </button>
                        );
                      })}

                      {entries.length > 4 && (
                        <div className="text-center text-xs font-medium tracking-normal text-[var(--text-tertiary)]">
                          +{entries.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-[118px_repeat(7,minmax(0,1fr))] items-center border-t border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-3">
              <div className="text-xs font-semibold text-[var(--text-secondary)]">
                Intensidade
              </div>
              {intensityByWeekday.map((value, index) => (
                <div key={index} className="flex items-center justify-center gap-1.5">
                  {[0, 1, 2].map(bar => (
                    <span
                      key={bar}
                      className={cn(
                        'h-2 rounded-full transition-all',
                        bar < value
                          ? 'w-6 bg-[color-mix(in_srgb,var(--accent-purple),transparent_18%)]'
                          : 'w-5 bg-[var(--bg-hover)]'
                      )}
                    />
                  ))}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
