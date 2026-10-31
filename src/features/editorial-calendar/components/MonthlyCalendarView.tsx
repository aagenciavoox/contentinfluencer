import type {DragEvent} from 'react';
import {addMonths} from 'date-fns';
import {AgendaItem, Content, Platform, Projeto} from '../../../lib/database';
import {
  calendarEntryPillStyle,
  CalendarEventPill,
  CalendarMonthGrid,
} from '../../../components/calendar';
import {cn} from '../../../lib/utils';
import {getDisplayStatus} from '../../contents/lib/contentPipeline';
import {
  ALL_PLATFORMS,
  ALL_STATUSES,
  matchesContentFilters,
} from '../lib/calendarContentFilters';
import {buildPublishCalendarItems, isScheduledItem, publishItemStatus, todayKey} from '../lib/publishCalendarItems';
import type {GradeSerie} from '../../editorial/lib/gradeEntries';
import {diasCobertos, papelNoIntervalo} from '../../projects/lib/agendaEventos';
import {calendarEntryIcon} from './CalendarNetworkIcons';
import {rotuloDaRef} from '../../contas/lib/contas';

const WEEK_STARTS_ON = 0 as const;

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
  /** Publicação que já foi ao ar. */
  posted?: boolean;
  /** Publicação que ainda vai ao ar, hoje ou depois. */
  scheduled?: boolean;
  agendaId?: string;
  projetoId?: string;
  agendaTipo?: string;
  span?: 'single' | 'start' | 'middle' | 'end';
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
        plataforma => rotuloDaRef(plataforma.platformId, platforms),
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
    const hoje = todayKey();
    publishItems.forEach(item => {
      const content = contents.find(candidate => candidate.id === item.contentId);
      if (!content) return;
      const status = publishItemStatus(content, item, hoje);
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
        posted: item.posted,
        scheduled: isScheduledItem(item, content),
        secondary: networkLabel,
      });
    });
  }

  if (activeLayers.includes('agenda') && !contentFilterActive) {
    agendaItems.forEach(item => {
      const linkedProjeto = item.projetoId ? projetos.find(p => p.id === item.projetoId) : null;
      const dias = diasCobertos(item);
      const fim = item.dateEnd || item.date;
      dias.forEach(dia => {
        const papel = papelNoIntervalo(dia, item.date, fim);
        push(dia, {
          id: dias.length > 1 ? `${item.id}:${dia}` : item.id,
          type: 'agenda',
          label: linkedProjeto ? `${item.title} · ${linkedProjeto.nome}` : item.title,
          date: '',
          time: papel === 'start' || papel === 'single' ? item.time : null,
          agendaId: item.id,
          projetoId: item.projetoId,
          agendaTipo: item.tipo,
          span: papel,
          secondary: linkedProjeto?.nome || item.tipo,
          color: linkedProjeto?.color,
        });
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
      {months.map(currentMonth => (
        <CalendarMonthGrid
          key={currentMonth.toISOString()}
          anchorDate={currentMonth}
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
          weekStartsOn={WEEK_STARTS_ON}
          minCellHeight={120}
          getDayClassName={dayProps => cn(
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
                  return (
                    <CalendarEventPill
                      key={entry.id}
                      label={entry.label}
                      time={entry.time}
                      secondary={entry.secondary}
                      variant="compact"
                      icon={calendarEntryIcon(entry)}
                      style={calendarEntryPillStyle(entry)}
                      className={
                        entry.span === 'start'
                          ? 'rounded-r-none'
                          : entry.span === 'end'
                            ? 'rounded-l-none'
                            : entry.span === 'middle'
                              ? 'rounded-none'
                              : undefined
                      }
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
                    className="w-full px-1 py-0.5 text-left t-label text-[var(--text-secondary)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
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
