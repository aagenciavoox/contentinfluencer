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
import type {AgendaItem, Content, Projeto} from '../../../lib/database';
import {readStoredJson, writeStoredJson} from '../../../lib/browserStorage';
import {cn} from '../../../lib/utils';
import {MobileEmptyState} from '../../components/MobileEmptyState';
import {MobileListCard} from '../../components/MobileListCard';
import {MobileSearchBar} from '../../components/MobileSearchBar';

type AgendaTimelineKind = 'agenda' | 'recording' | 'publish' | 'project';

interface AgendaMobileScreenProps {
  contents: Content[];
  agendaItems: AgendaItem[];
  projetos: Projeto[];
  onAddAgenda: () => void;
}

interface AgendaTimelineEntry {
  id: string;
  kind: AgendaTimelineKind;
  title: string;
  date: string;
  time?: string | null;
  secondary?: string | null;
}

const KIND_LABELS: Record<AgendaTimelineKind, string> = {
  agenda: 'Agenda',
  recording: 'Gravacao',
  publish: 'Publicacao',
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

function buildTimelineEntries(contents: Content[], agendaItems: AgendaItem[], projetos: Projeto[]) {
  const projectNameById = new Map(projetos.map(p => [p.id, p.nome]));
  const entries: AgendaTimelineEntry[] = [];

  agendaItems.forEach(item => {
    entries.push({
      id: item.id,
      kind: 'agenda',
      title: item.title,
      date: item.date,
      time: item.time,
      secondary: item.projetoId ? projectNameById.get(item.projetoId) ?? item.tipo : item.tipo,
    });
  });

  contents.forEach(content => {
    if (content.recordingDate) {
      entries.push({
        id: `${content.id}:recording`,
        kind: 'recording',
        title: content.title || 'Conteudo sem titulo',
        date: content.recordingDate,
        secondary: content.status || 'Fila de gravacao',
      });
    }
    if (content.publishDate) {
      entries.push({
        id: `${content.id}:publish`,
        kind: 'publish',
        title: content.title || 'Conteudo sem titulo',
        date: content.publishDate,
        secondary: content.status || 'Planejado para publicar',
      });
    }
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
          secondary: 'Inicio do projeto',
        });
      }
      if (projeto.dataFim) {
        entries.push({
          id: `${projeto.id}:deadline`,
          kind: 'project',
          title: projeto.nome,
          date: projeto.dataFim,
          secondary: 'Prazo final',
        });
      }
      projeto.etapas.forEach(etapa => {
        if (!etapa.dataPrazo) return;
        entries.push({
          id: etapa.id,
          kind: 'project',
          title: projeto.nome,
          date: etapa.dataPrazo,
          secondary: `Etapa: ${etapa.nome}`,
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
  agendaItems,
  projetos,
  onAddAgenda,
}: AgendaMobileScreenProps) {
  const [search, setSearch] = useState('');
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

  const timeline = useMemo(
    () => buildTimelineEntries(contents, agendaItems, projetos),
    [agendaItems, contents, projetos]
  );

  // dots per date for calendar grid
  const kindsByDate = useMemo(() => {
    const map = new Map<string, Set<AgendaTimelineKind>>();
    timeline.forEach(entry => {
      if (!activeKinds.includes(entry.kind)) return;
      const key = entry.date.slice(0, 10);
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(entry.kind);
    });
    return map;
  }, [timeline, activeKinds]);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return timeline
      .filter(entry => {
        const d = parseISO(entry.date);
        if (selectedDate) return isSameDay(d, selectedDate);
        return isWithinInterval(d, {start: today, end: upcomingEnd});
      })
      .filter(entry => activeKinds.includes(entry.kind))
      .filter(entry => {
        if (!q) return true;
        return [entry.title, entry.secondary || '', KIND_LABELS[entry.kind]]
          .join(' ').toLowerCase().includes(q);
      });
  }, [activeKinds, search, selectedDate, timeline, today, upcomingEnd]);

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
    <div className="space-y-4">
      {/* ── Calendar card ─────────────────────────────── */}
      <section className="overflow-hidden rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm">

        {/* Header: nav + add button */}
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCalendarMonth(m => subMonths(m, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-xl transition-all active:scale-90 hover:bg-[var(--bg-hover)]"
            >
              <ChevronLeft className="h-4 w-4 text-[var(--text-tertiary)]" />
            </button>
            <span className="min-w-[120px] text-center text-sm font-black uppercase tracking-wider text-[var(--text-primary)]">
              {format(calendarMonth, 'MMM yyyy', {locale: ptBR})}
            </span>
            <button
              type="button"
              onClick={() => setCalendarMonth(m => addMonths(m, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-xl transition-all active:scale-90 hover:bg-[var(--bg-hover)]"
            >
              <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
            </button>
          </div>

          <button
            type="button"
            onClick={onAddAgenda}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--text-primary)] px-3 py-2 text-[11px] font-black uppercase tracking-widest text-[var(--bg-primary)] transition-all active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo
          </button>
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
                  'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold whitespace-nowrap transition-all shrink-0',
                  'cursor-pointer active:scale-95 select-none',
                  active
                    ? 'border-[var(--border-strong)] bg-[var(--bg-hover)] text-[var(--text-primary)]'
                    : 'border-[var(--border-color)] text-[var(--text-tertiary)] opacity-40'
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
            <div key={i} className="py-1.5 text-center text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-50">
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
                    'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black',
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

      {/* ── Agenda list ────────────────────────────────── */}
      <section className="space-y-3">

        {/* Search */}
        <MobileSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar evento, gravacao, projeto..."
        />

        {/* Context header */}
        <div className="flex items-center justify-between px-1">
          {selectedDate ? (
            <>
              <p className="text-xs font-black uppercase tracking-widest text-[var(--text-primary)]">
                {format(selectedDate, "EEEE, dd 'de' MMMM", {locale: ptBR})}
                <span className="ml-2 font-bold text-[var(--text-tertiary)]">
                  · {filteredEntries.length}
                </span>
              </p>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] transition-all active:opacity-50"
              >
                Ver todos
              </button>
            </>
          ) : (
            <p className="text-xs font-black uppercase tracking-widest text-[var(--text-tertiary)]">
              Proximos 60 dias
              <span className="ml-2 text-[var(--text-primary)]">· {filteredEntries.length}</span>
            </p>
          )}
        </div>

        {/* Entries */}
        {groupedEntries.length === 0 ? (
          <MobileEmptyState
            title="Nada por aqui"
            description={
              selectedDate
                ? 'Nenhum evento nesse dia. Toque em Novo para adicionar.'
                : 'Nenhum evento nos proximos 60 dias com as camadas ativas.'
            }
            action={
              <button type="button" onClick={onAddAgenda} className="button-primary w-full">
                <Plus className="h-4 w-4" />
                Novo evento
              </button>
            }
            icon={<SearchCheck className="h-8 w-8" />}
          />
        ) : (
          <div className="space-y-5">
            {groupedEntries.map(group => (
              <div key={group.label} className="space-y-2">
                <p className="px-1 t-label text-[var(--text-tertiary)]">{group.label}</p>

                <div className="space-y-2">
                  {group.items.map(entry => (
                    <MobileListCard
                      key={entry.id}
                      eyebrow={KIND_LABELS[entry.kind]}
                      title={entry.title}
                      description={entry.secondary || ''}
                      meta={
                        <span
                          className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                          style={{
                            backgroundColor: `${KIND_ACCENTS[entry.kind]}18`,
                            color: KIND_ACCENTS[entry.kind],
                          }}
                        >
                          {entry.time ? `${entry.time} · ` : ''}
                          {format(parseISO(entry.date), 'dd/MM')}
                        </span>
                      }
                      trailing={
                        entry.kind === 'recording' ? (
                          <Mic2 className="h-4 w-4 text-[var(--accent-orange)]" />
                        ) : entry.kind === 'publish' ? (
                          <Radio className="h-4 w-4 text-[var(--accent-blue)]" />
                        ) : entry.kind === 'project' ? (
                          <BriefcaseBusiness className="h-4 w-4 text-[var(--accent-purple)]" />
                        ) : (
                          <Clapperboard className="h-4 w-4 text-[var(--accent-green)]" />
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
