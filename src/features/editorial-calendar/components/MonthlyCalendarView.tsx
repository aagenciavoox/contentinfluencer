import {addMonths, format} from 'date-fns';
import {AgendaItem, Content, Platform, Projeto} from '../../../lib/database';
import {
  CalendarEventPill,
  CalendarMonthGrid,
  editorialPillStyle,
} from '../../../components/calendar';

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
  onEmptyDayClick?: (date: Date) => void;
  onShowMore?: (date: Date) => void;
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

const MAX_VISIBLE = 4;

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
  onEmptyDayClick,
  onShowMore,
}: MonthlyCalendarViewProps) {
  const today = new Date();
  const months = monthDate ? [monthDate] : Array.from({length: monthsToShow}, (_, index) => addMonths(today, index));
  const entriesByDate = buildCalendarEntries(contents, platforms, agendaItems, projetos, activeLayers, searchTerm, sortValue);

  return (
    <div className="stack-lg">
      {months.map(currentMonth => (
        <CalendarMonthGrid
          key={currentMonth.toISOString()}
          anchorDate={currentMonth}
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
          weekStartsOn={0}
          minCellHeight={120}
          onDayClick={(dayProps, event) => {
            const entries = entriesByDate.get(dayProps.dateKey) || [];
            if (entries.length === 0 && onEmptyDayClick) {
              event.stopPropagation();
              onEmptyDayClick(dayProps.day);
            }
          }}
          renderDayContent={dayProps => {
            const entries = entriesByDate.get(dayProps.dateKey) || [];
            const visible = entries.slice(0, MAX_VISIBLE);
            const overflow = entries.length - MAX_VISIBLE;

            return (
              <>
                {visible.map(entry => {
                  const useCustomColor = entry.color && (entry.type === 'project' || entry.type === 'agenda');
                  return (
                    <CalendarEventPill
                      key={entry.id}
                      label={entry.label}
                      time={entry.time}
                      variant="compact"
                      style={editorialPillStyle(useCustomColor ? entry.color : null, entry.type)}
                      onClick={event => {
                        event.stopPropagation();
                        onSelectEntry?.(entry);
                        onSelectDate?.(dayProps.day);
                      }}
                    />
                  );
                })}
                {overflow > 0 ? (
                  <button
                    type="button"
                    onClick={event => {
                      event.stopPropagation();
                      onSelectDate?.(dayProps.day);
                      onShowMore?.(dayProps.day);
                    }}
                    className="w-full px-1 py-0.5 text-left text-xs font-semibold text-[var(--accent-blue)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    +{overflow} mais
                  </button>
                ) : null}
              </>
            );
          }}
        />
      ))}
    </div>
  );
}
