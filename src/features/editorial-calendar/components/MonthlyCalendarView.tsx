import type {DragEvent} from 'react';
import {addMonths, eachDayOfInterval, endOfWeek, format, startOfWeek} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {AgendaItem, Content, Platform, Projeto} from '../../../lib/database';
import {
  CalendarEventPill,
  CalendarMonthGrid,
  editorialPillStyle,
} from '../../../components/calendar';
import {cn} from '../../../lib/utils';
import {getDisplayStatus} from '../../contents/lib/contentPipeline';
import {
  ALL_PLATFORMS,
  ALL_STATUSES,
  matchesContentFilters,
} from '../lib/calendarContentFilters';
import {buildPublishCalendarItems} from '../lib/publishCalendarItems';
import type {GradeSerie} from '../../editorial/lib/gradeEntries';
import {CalendarNetworkIcons} from './CalendarNetworkIcons';

const WEEK_STARTS_ON = 0 as const;
const TODAY_CIRCLE_CLASS =
  '[&>div:first-child>span]:!bg-[var(--accent)] [&>div:first-child>span]:!text-[var(--bg-primary)]';

function weekdayHeaderParts(day: Date) {
  const raw = format(day, 'EEE', {locale: ptBR}).replace('.', '');
  const label = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  return {
    compact: format(day, 'EEEEE', {locale: ptBR}).toUpperCase(),
    full: `${label} ${format(day, 'd')}`,
  };
}

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
  dragOverDateKey?: string | null;
  onDayDragOver?: (dateKey: string, event: DragEvent) => void;
  onDayDragLeave?: () => void;
  onDayDrop?: (dateKey: string, event: DragEvent) => void;
  platformFilter?: string;
  statusFilter?: string;
  series?: GradeSerie[];
  redeReferenciaId?: string | null;
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
  platformNames?: string[];
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
  sortValue: string,
  filters?: {platformFilter?: string; statusFilter?: string; series?: GradeSerie[]; redeReferenciaId?: string | null},
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

  const platformFilter = filters?.platformFilter || ALL_PLATFORMS;
  const statusFilter = filters?.statusFilter || ALL_STATUSES;
  const contentFilterActive = platformFilter !== ALL_PLATFORMS || statusFilter !== ALL_STATUSES;

  if (activeLayers.includes('recordings')) {
    contents.forEach(content => {
      const status = getDisplayStatus(content);
      const platformNames = content.plataformas.map(
        plataforma => platformNameById.get(plataforma.platformId) || plataforma.platformId,
      );
      if (!matchesContentFilters({platformNames, status, platformFilter, statusFilter})) return;
      push(content.recordingDate, {
        id: `${content.id}-rec`,
        type: 'recording',
        label: content.title || '(sem título)',
        date: '',
        contentId: content.id,
        secondary: status || 'Gravação',
      });
    });
  }

  if (activeLayers.includes('posts')) {
    const publishItems = buildPublishCalendarItems({
      contents,
      platforms,
      series: filters?.series ?? [],
      redeReferenciaId: filters?.redeReferenciaId ?? null,
      platformFilter,
    });
    publishItems.forEach(item => {
      const content = contents.find(candidate => candidate.id === item.contentId);
      if (!content) return;
      const status = getDisplayStatus(content);
      if (!matchesContentFilters({
        platformNames: item.platformNames,
        status,
        platformFilter,
        statusFilter,
      })) return;
      const networkLabel = platformFilter === ALL_PLATFORMS
        ? (status || 'Publicação')
        : [(item.platformNames[0] || platformFilter), status || 'Publicação'].join(' - ');
      push(item.date, {
        id: item.id,
        type: 'publish',
        label: content.title || '(sem título)',
        date: '',
        time: item.time,
        contentId: content.id,
        plataformaId: item.plataformaId,
        platformNames: item.platformNames,
        secondary: networkLabel,
      });
    });
  }

  if (activeLayers.includes('agenda') && !contentFilterActive) {
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

  if (activeLayers.includes('projects') && !contentFilterActive) {
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
  dragOverDateKey,
  onDayDragOver,
  onDayDragLeave,
  onDayDrop,
  platformFilter,
  statusFilter,
  series,
  redeReferenciaId,
}: MonthlyCalendarViewProps) {
  const today = new Date();
  const months = monthDate ? [monthDate] : Array.from({length: monthsToShow}, (_, index) => addMonths(today, index));
  const entriesByDate = buildCalendarEntries(
    contents,
    platforms,
    agendaItems,
    projetos,
    activeLayers,
    searchTerm,
    sortValue,
    {platformFilter, statusFilter, series, redeReferenciaId},
  );

  return (
    <div className="stack-lg">
      {months.map(currentMonth => {
        const headerDays = eachDayOfInterval({
          start: startOfWeek(currentMonth, {weekStartsOn: WEEK_STARTS_ON}),
          end: endOfWeek(currentMonth, {weekStartsOn: WEEK_STARTS_ON}),
        });

        return (
        <div key={currentMonth.toISOString()} className="stack-none">
        <div className="grid grid-cols-7 border border-b-0 border-[var(--border-color)] bg-[var(--bg-primary)]">
          {headerDays.map(day => {
            const parts = weekdayHeaderParts(day);
            return (
              <div
                key={`header-${day.toISOString()}`}
                className="min-w-0 border-r border-[var(--border-color)] px-1 py-2 text-center last:border-r-0 sm:px-2"
              >
                <span className="text-2xs font-semibold text-[var(--text-tertiary)] sm:hidden">
                  {parts.compact}
                </span>
                <span className="hidden text-2xs font-semibold text-[var(--text-tertiary)] sm:inline">
                  {parts.full}
                </span>
              </div>
            );
          })}
        </div>
        <CalendarMonthGrid
          key={currentMonth.toISOString()}
          anchorDate={currentMonth}
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
          weekStartsOn={WEEK_STARTS_ON}
          minCellHeight={120}
          className="border-t-0 [&>div:first-child]:hidden"
          getDayClassName={dayProps => cn(
            dayProps.isToday ? TODAY_CIRCLE_CLASS : undefined,
            dragOverDateKey === dayProps.dateKey && 'bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]',
          )}
          onDayDragOver={(dayProps, event) => onDayDragOver?.(dayProps.dateKey, event)}
          onDayDragLeave={() => onDayDragLeave?.()}
          onDayDrop={(dayProps, event) => onDayDrop?.(dayProps.dateKey, event)}
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
                      icon={entry.platformNames?.length ? <CalendarNetworkIcons names={entry.platformNames} /> : undefined}
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
        </div>
        );
      })}
    </div>
  );
}
