import {useCallback, useMemo, useState} from 'react';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Mic2,
  Plus,
  Radio,
  SearchCheck,
} from 'lucide-react';
import type {AgendaItem, Content, Platform, Projeto, Serie} from '../../../lib/database';
import type {CalendarEntry} from '../../../features/editorial-calendar/components/MonthlyCalendarView';
import {readStoredJson, writeStoredJson} from '../../../lib/browserStorage';
import {cn} from '../../../lib/utils';
import {AppButton} from '../../../components/ui/AppButton';
import {Text} from '../../../components/ui/Text';
import {FilterBar} from '../../../components/ui/FilterBar';
import {EmptyState} from '../../../components/ui/EmptyState';
import {MobileListCard} from '../../components/MobileListCard';
import {MobileSearchBar} from '../../components/MobileSearchBar';
import {MobileSegmentTabs} from '../../components/MobileSegmentTabs';
import {getDisplayStatus} from '../../../features/contents/lib/contentPipeline';
import {
  ALL_PLATFORMS,
  ALL_STATUSES,
  CONTENT_STATUS_FILTER_OPTIONS,
  collectPlatformNames,
  matchesContentFilters,
  platformFilterOptions,
} from '../../../features/editorial-calendar/lib/calendarContentFilters';
import {buildPublishCalendarItems} from '../../../features/editorial-calendar/lib/publishCalendarItems';
import {PlatformIcon} from '../../../components/ui/PlatformIcon';

type AgendaTimelineKind = 'agenda' | 'recording' | 'publish' | 'project';

interface AgendaMobileScreenProps {
  contents: Content[];
  platforms: Platform[];
  series: Serie[];
  redeReferenciaId: string | null;
  platformFilter?: string;
  agendaItems: AgendaItem[];
  projetos: Projeto[];
  listMode?: 'agenda' | 'timeline';
  onListModeChange?: (mode: 'agenda' | 'timeline') => void;
  periodStart?: Date;
  periodEnd?: Date;
  onAddAgenda: () => void;
  onAddPostedVideo: () => void;
  onSelectEntry?: (entry: CalendarEntry) => void;
  undatedRoteiros?: Content[];
  onPlaceUndatedRoteiro?: (contentId: string, dateKey: string) => void;
}

interface AgendaTimelineEntry {
  id: string;
  kind: AgendaTimelineKind;
  title: string;
  date: string;
  time?: string | null;
  secondary?: string | null;
  color?: string | null;
  contentId?: string;
  plataformaId?: string;
  agendaId?: string;
  projetoId?: string;
  platformNames?: string[];
  contentStatus?: string;
}

const KIND_LABELS: Record<AgendaTimelineKind, string> = {
  agenda: 'Agenda',
  recording: 'Gravação',
  publish: 'Publicação',
  project: 'Projeto',
};

const KIND_ACCENTS: Record<AgendaTimelineKind, string> = {
  agenda: 'var(--accent-green)',
  recording: 'var(--accent-orange)',
  publish: 'var(--accent-blue)',
  project: 'var(--accent-purple)',
};

const MOBILE_STORAGE_KEY = 'content-os:calendar-mobile-kinds';
const ALL_KINDS: AgendaTimelineKind[] = ['agenda', 'recording', 'publish', 'project'];

function loadMobileKinds(): AgendaTimelineKind[] {
  return readStoredJson(MOBILE_STORAGE_KEY, ALL_KINDS);
}

function buildTimelineEntries(contents: Content[], platforms: Platform[], agendaItems: AgendaItem[], projetos: Projeto[], series: Serie[], redeReferenciaId: string | null, platformFilter: string) {
  const projectById = new Map(projetos.map(p => [p.id, p]));
  const platformNameById = new Map(platforms.map(platform => [platform.id, platform.nome]));
  const entries: AgendaTimelineEntry[] = [];

  agendaItems.forEach(item => {
    const linkedProjeto = item.projetoId ? projectById.get(item.projetoId) : null;
    entries.push({
      id: item.id,
      kind: 'agenda',
      title: item.title,
      date: item.date,
      time: item.time,
      agendaId: item.id,
      secondary: linkedProjeto ? linkedProjeto.nome : item.tipo,
      color: linkedProjeto?.color,
    });
  });

  contents.forEach(content => {
    const displayStatus = getDisplayStatus(content);
    const platformNames = content.plataformas.map(
      plataforma => platformNameById.get(plataforma.platformId) || plataforma.platformId,
    );
    if (content.recordingDate) {
      entries.push({
        id: `${content.id}:recording`,
        kind: 'recording',
        title: content.title || 'Roteiro sem título',
        date: content.recordingDate,
        contentId: content.id,
        secondary: displayStatus || 'Para gravar',
        platformNames,
        contentStatus: displayStatus,
      });
    }
    const publishItems = buildPublishCalendarItems({
      contents: [content],
      platforms,
      series,
      redeReferenciaId,
      platformFilter,
    });
    publishItems.forEach(item => {
      if (!item.date) return;
      entries.push({
        id: item.id,
        kind: 'publish',
        title: content.title || 'Roteiro sem título',
        date: item.date,
        time: item.time,
        contentId: content.id,
        plataformaId: item.plataformaId,
        secondary: item.platformNames.length > 0
          ? item.platformNames.join(' · ')
          : (displayStatus || 'Publicação'),
        platformNames: item.platformNames,
        contentStatus: displayStatus,
      });
    });
  });

  projetos
    .filter(p => !p.deletedAt)
    .forEach(projeto => {
      if (projeto.dataInicio) {
        entries.push({
          id: `${projeto.id}:start`,
          kind: 'project',
          title: projeto.nome,
          date: projeto.dataInicio,
          projetoId: projeto.id,
          secondary: 'Início do projeto',
          color: projeto.color,
        });
      }
      if (projeto.dataFim) {
        entries.push({
          id: `${projeto.id}:deadline`,
          kind: 'project',
          title: projeto.nome,
          date: projeto.dataFim,
          projetoId: projeto.id,
          secondary: 'Data final',
          color: projeto.color,
        });
      }
      projeto.etapas.forEach(etapa => {
        if (!etapa.dataPrazo) return;
        entries.push({
          id: etapa.id,
          kind: 'project',
          title: projeto.nome,
          date: etapa.dataPrazo,
          projetoId: projeto.id,
          secondary: `Etapa: ${etapa.nome}`,
          color: projeto.color,
        });
      });
    });

  return entries.sort((a, b) => {
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (diff !== 0) return diff;
    return (a.time || '').localeCompare(b.time || '');
  });
}

export function AgendaMobileScreen({
  contents,
  platforms,
  series,
  redeReferenciaId,
  platformFilter: platformFilterProp = ALL_PLATFORMS,
  agendaItems,
  projetos,
  listMode = 'agenda',
  onListModeChange,
  periodStart,
  periodEnd,
  onAddAgenda,
  onAddPostedVideo,
  onSelectEntry,
  undatedRoteiros = [],
  onPlaceUndatedRoteiro,
}: AgendaMobileScreenProps) {
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState(platformFilterProp);
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);
  const [activeKinds, setActiveKindsRaw] = useState<AgendaTimelineKind[]>(loadMobileKinds);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const setActiveKinds = useCallback(
    (updater: AgendaTimelineKind[] | ((prev: AgendaTimelineKind[]) => AgendaTimelineKind[])) => {
      setActiveKindsRaw(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        writeStoredJson(MOBILE_STORAGE_KEY, next);
        return next;
      });
    },
    []
  );

  const handleSelectDate = useCallback((day: Date) => {
    setSelectedDate(prev => (prev && isSameDay(prev, day) ? null : day));
  }, []);

  const today = startOfDay(new Date());
  const upcomingEnd = endOfDay(addDays(today, 60));
  const rangeStart = periodStart ? startOfDay(periodStart) : today;
  const rangeEnd = periodEnd ? endOfDay(periodEnd) : upcomingEnd;
  const isTimeline = listMode === 'timeline';

  const timeline = useMemo(
    () => buildTimelineEntries(contents, platforms, agendaItems, projetos, series, redeReferenciaId, platformFilter),
    [agendaItems, contents, platformFilter, platforms, projetos, redeReferenciaId, series]
  );

  const platformNames = useMemo(
    () => collectPlatformNames(
      platforms,
      timeline.flatMap(entry => entry.platformNames ?? []),
    ),
    [platforms, timeline],
  );

  const passesContentFilter = useCallback((entry: AgendaTimelineEntry) => {
    if (entry.kind === 'agenda' || entry.kind === 'project') {
      return platformFilter === ALL_PLATFORMS && statusFilter === ALL_STATUSES;
    }
    return matchesContentFilters({
      platformNames: entry.platformNames ?? [],
      status: entry.contentStatus ?? '',
      platformFilter,
      statusFilter,
    });
  }, [platformFilter, statusFilter]);

  // dots per date for calendar grid
  const kindsByDate = useMemo(() => {
    const map = new Map<string, Set<AgendaTimelineKind>>();
    timeline.forEach(entry => {
      if (!activeKinds.includes(entry.kind) || !passesContentFilter(entry)) return;
      const key = entry.date.slice(0, 10);
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(entry.kind);
    });
    return map;
  }, [activeKinds, passesContentFilter, timeline]);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return timeline
      .filter(passesContentFilter)
      .filter(entry => {
        const d = parseISO(entry.date);
        if (selectedDate) return isSameDay(d, selectedDate);
        if (isTimeline) return isWithinInterval(d, {start: rangeStart, end: rangeEnd});
        return isWithinInterval(d, {start: today, end: upcomingEnd});
      })
      .filter(entry => activeKinds.includes(entry.kind))
      .filter(entry => {
        if (!q) return true;
        return [entry.title, entry.secondary || '', KIND_LABELS[entry.kind]]
          .join(' ').toLowerCase().includes(q);
      });
  }, [activeKinds, isTimeline, passesContentFilter, rangeEnd, rangeStart, search, selectedDate, timeline, today, upcomingEnd]);

  const groupedEntries = useMemo(() => {
    return filteredEntries.reduce<Array<{label: string; items: AgendaTimelineEntry[]}>>((acc, entry) => {
      const label = format(parseISO(entry.date), "EEEE, dd 'de' MMMM", {locale: ptBR});
      const existing = acc.find(g => g.label === label);
      if (existing) {
        existing.items.push(entry);
        return acc;
      }
      acc.push({label, items: [entry]});
      return acc;
    }, []);
  }, [filteredEntries]);

  // Calendar grid data
  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const gridStart = startOfWeek(monthStart, {weekStartsOn: 0});
  const gridEnd = endOfWeek(monthEnd, {weekStartsOn: 0});
  const days = eachDayOfInterval({start: gridStart, end: gridEnd});

  return (
    <div className="stack-lg">
      <div className="px-4 stack-md">
        {onListModeChange ? (
          <MobileSegmentTabs
            tabs={[
              {value: 'agenda', label: 'Agenda'},
              {value: 'timeline', label: 'Linha do tempo'},
            ]}
            value={listMode}
            onChange={value => onListModeChange(value as 'agenda' | 'timeline')}
          />
        ) : null}
      </div>
      {/* Calendar card — operational Agenda keeps month picker; Timeline is temporal list */}
      {!isTimeline ? (
      <section className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)]">

        {/* Header: month nav + actions on second row */}
        <div className="stack-md px-4 pt-4 pb-3">
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => setCalendarMonth(m => subMonths(m, 1))}
              aria-label="Mês anterior"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl transition-all active:scale-90 hover:bg-[var(--bg-hover)]"
            >
              <ChevronLeft className="h-4 w-4 text-[var(--text-tertiary)]" />
            </button>
            <span className="min-w-[120px] text-center text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">
              {format(calendarMonth, 'MMM yyyy', {locale: ptBR})}
            </span>
            <button
              type="button"
              onClick={() => setCalendarMonth(m => addMonths(m, 1))}
              aria-label="Próximo mês"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl transition-all active:scale-90 hover:bg-[var(--bg-hover)]"
            >
              <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onAddPostedVideo}
              aria-label="Registrar vídeo postado"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[var(--border-color)] transition-all active:scale-95"
            >
              <Radio className="h-4 w-4 text-[var(--text-primary)]" />
            </button>

            <button
              type="button"
              onClick={onAddAgenda}
              aria-label="Novo evento"
              className="flex min-h-11 items-center gap-1.5 rounded-xl bg-[var(--text-primary)] px-4 text-xs font-semibold  text-[var(--bg-primary)] transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Novo evento
            </button>
          </div>
        </div>

        {/* Layer filter chips */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3">
          {ALL_KINDS.map(kind => {
            const active = activeKinds.includes(kind);
            return (
              <button
                key={kind}
                type="button"
                onClick={() =>
                  setActiveKinds(current =>
                    current.includes(kind)
                      ? current.length === 1 ? current : current.filter(k => k !== kind)
                      : [...current, kind]
                  )
                }
                className={cn(
                  'flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold whitespace-nowrap transition-all shrink-0',
                  'cursor-pointer active:scale-95 select-none',
                  active
                    ? 'border-[var(--border-strong)] bg-[var(--bg-hover)] text-[var(--text-primary)]'
                    : 'border-[var(--border-color)] text-[var(--text-tertiary)]'
                )}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{backgroundColor: active ? KIND_ACCENTS[kind] : 'currentColor'}}
                />
                {KIND_LABELS[kind]}
              </button>
            );
          })}
        </div>

        {/* Day-of-week labels */}
        <div className="grid grid-cols-7 border-t border-[var(--border-color)] bg-[var(--bg-hover)]/30">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((label, i) => (
            <div key={i} className="py-1.5 text-center text-xs font-semibold text-[var(--text-tertiary)]">
              {label}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 border-t border-[var(--border-color)]">
          {days.map((day, index) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const kinds = kindsByDate.get(dateKey);
            const kindsArray = kinds ? [...kinds] : [];
            const isCurrentMonth = isSameMonth(day, calendarMonth);
            const isToday = isSameDay(day, today);
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
            const isLastCol = (index + 1) % 7 === 0;

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => handleSelectDate(day)}
                className={cn(
                  'flex flex-col items-center gap-1 border-b border-r border-[var(--border-color)] py-2 transition-all',
                  'cursor-pointer active:scale-95 select-none',
                  !isCurrentMonth && 'opacity-20',
                  isLastCol && 'border-r-0',
                  isSelected && 'bg-[var(--bg-hover)]'
                )}
              >
                <div
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                    isSelected && 'bg-[var(--accent-blue)] text-white',
                    isToday && !isSelected && 'bg-[var(--text-primary)] text-[var(--bg-primary)]',
                    !isToday && !isSelected && 'text-[var(--text-primary)]'
                  )}
                >
                  {format(day, 'd')}
                </div>

                <div className="flex gap-0.5 min-h-[5px]">
                  {kindsArray.slice(0, 3).map(kind => (
                    <span
                      key={kind}
                      className="h-[5px] w-[5px] rounded-full shrink-0"
                      style={{backgroundColor: KIND_ACCENTS[kind]}}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>
      ) : (
        <div className="flex items-center justify-end gap-2 px-4">
          <button
            type="button"
            onClick={onAddPostedVideo}
            aria-label="Registrar vídeo postado"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[var(--border-color)] transition-all active:scale-95"
          >
            <Radio className="h-4 w-4 text-[var(--text-primary)]" />
          </button>
          <button
            type="button"
            onClick={onAddAgenda}
            aria-label="Novo evento"
            className="flex min-h-11 items-center gap-1.5 rounded-xl bg-[var(--text-primary)] px-4 text-xs font-semibold text-[var(--bg-primary)] transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Novo evento
          </button>
        </div>
      )}

      <section className="stack-md px-4">
        <MobileSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar evento, gravação, projeto…"
        />
        <FilterBar
          size="compact"
          showSearch={false}
          searchValue=""
          onSearchChange={() => undefined}
          filters={[
            {
              id: 'platform',
              label: 'Plataforma',
              value: platformFilter,
              onChange: setPlatformFilter,
              options: platformFilterOptions(platformNames),
            },
            {
              id: 'status',
              label: 'Status',
              value: statusFilter,
              onChange: setStatusFilter,
              options: CONTENT_STATUS_FILTER_OPTIONS,
            },
          ]}
        />

        {isTimeline ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {ALL_KINDS.map(kind => {
              const active = activeKinds.includes(kind);
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() =>
                    setActiveKinds(current =>
                      current.includes(kind)
                        ? current.length === 1 ? current : current.filter(k => k !== kind)
                        : [...current, kind]
                    )
                  }
                  className={cn(
                    'flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-xs font-bold whitespace-nowrap transition-all select-none active:scale-95',
                    active
                      ? 'border-[var(--border-strong)] bg-[var(--bg-hover)] text-[var(--text-primary)]'
                      : 'border-[var(--border-color)] text-[var(--text-tertiary)]',
                  )}
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{backgroundColor: active ? KIND_ACCENTS[kind] : 'currentColor'}}
                  />
                  {KIND_LABELS[kind]}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="flex items-center justify-between px-1">
          {selectedDate ? (
            <>
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                {format(selectedDate, "EEEE, dd 'de' MMMM", {locale: ptBR})}
                <span className="ml-2 font-bold text-[var(--text-tertiary)]">
                  · {filteredEntries.length}
                </span>
              </p>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="text-xs font-semibold text-[var(--text-tertiary)] transition-all"
              >
                Ver todos
              </button>
            </>
          ) : (
            <p className="text-xs font-semibold text-[var(--text-tertiary)]">
              {isTimeline
                ? `${format(rangeStart, 'd MMM', {locale: ptBR})} – ${format(rangeEnd, 'd MMM', {locale: ptBR})}`
                : 'Próximos 60 dias'}
              <span className="ml-2 text-[var(--text-primary)]">· {filteredEntries.length}</span>
            </p>
          )}
        </div>

        {groupedEntries.length === 0 ? (
          <EmptyState compact
            title="Nada por aqui"
            description={
              selectedDate
                ? 'Nenhum evento nesse dia. Toque em Novo evento para adicionar.'
                : isTimeline
                  ? 'Nenhum evento neste período com as camadas ativas.'
                  : 'Nenhum evento nos próximos 60 dias com as camadas ativas.'
            }
            action={
              <AppButton variant="primary" fullWidth onClick={onAddAgenda} leftIcon={<Plus className="h-4 w-4" />}>
                Novo evento
              </AppButton>
            }
            icon={<SearchCheck className="h-8 w-8" />}
          />
        ) : (
          <div className="stack-lg">
            {groupedEntries.map(group => (
              <div key={group.label} className="stack-sm">
                <p className="px-1 t-label text-[var(--text-tertiary)]">{group.label}</p>

                <div className="stack-sm">
                  {group.items.map(entry => {
                    const accentColor = entry.color || KIND_ACCENTS[entry.kind];
                    const calendarType =
                      entry.kind === 'recording'
                        ? 'recording'
                        : entry.kind === 'publish'
                          ? 'publish'
                          : entry.kind === 'agenda'
                            ? 'agenda'
                            : 'project';
                    return (
                      <MobileListCard
                        key={entry.id}
                        eyebrow={KIND_LABELS[entry.kind]}
                        title={entry.title}
                        description={entry.secondary || ''}
                        onClick={() =>
                          onSelectEntry?.({
                            id: entry.id,
                            type: calendarType,
                            label: entry.title,
                            date: entry.date,
                            time: entry.time,
                            secondary: entry.secondary || undefined,
                            color: entry.color,
                            contentId: entry.contentId,
                            plataformaId: entry.plataformaId,
                            agendaId: entry.agendaId,
                            projetoId: entry.projetoId,
                          })
                        }
                        meta={
                          <span
                            className="rounded-full px-2.5 py-1 text-xs font-semibold"
                            style={{
                              backgroundColor: `${accentColor}18`,
                              color: accentColor,
                            }}
                          >
                            {entry.time ? `${entry.time} · ` : ''}
                            {format(parseISO(entry.date), 'dd/MM')}
                          </span>
                        }
                        trailing={
                          entry.kind === 'publish' && entry.platformNames && entry.platformNames.length > 0 ? (
                            <span className="inline-flex items-center gap-1">
                              {entry.platformNames.map(name => (
                                <PlatformIcon key={name} platform={name} className="h-4 w-4 text-[var(--text-secondary)]" />
                              ))}
                            </span>
                          ) : entry.kind === 'recording' ? (
                            <Mic2 className="h-4 w-4 text-[var(--accent-orange)]" />
                          ) : entry.kind === 'publish' ? (
                            <Radio className="h-4 w-4 text-[var(--accent-blue)]" />
                          ) : entry.kind === 'project' ? (
                            <BriefcaseBusiness className="h-4 w-4" style={entry.color ? { color: entry.color } : { color: 'var(--accent-purple)' }} />
                          ) : (
                            <Clapperboard className="h-4 w-4 text-[var(--accent-green)]" />
                          )
                        }
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {undatedRoteiros.length > 0 ? (
        <section className="px-4 stack-sm">
          <Text variant="sectionTitle">Roteiros sem data</Text>
          <Text variant="meta" className="text-[var(--text-secondary)]">
            Marque a publicação no dia escolhido. Não é uma nota de planejamento.
          </Text>
          {undatedRoteiros.map(content => (
            <div key={content.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2">
              <p className="min-w-0 truncate text-sm font-semibold text-[var(--text-primary)]">
                {content.title || 'Sem título'}
              </p>
              <AppButton
                variant="secondary"
                size="xs"
                onClick={() => onPlaceUndatedRoteiro?.(
                  content.id,
                  format(selectedDate ?? new Date(), 'yyyy-MM-dd'),
                )}
              >
                {selectedDate ? `Colocar em ${format(selectedDate, 'd MMM', {locale: ptBR})}` : 'Colocar hoje'}
              </AppButton>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
