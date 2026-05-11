import {useCallback, useMemo, useState} from 'react';
import {addMonths, addWeeks, eachDayOfInterval, endOfWeek, format, isSameDay, startOfWeek, subMonths, subWeeks} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {BookOpen, CalendarDays, ChevronLeft, ChevronRight, Filter, Layers, Mic2, Plus, Send, Target, X, Zap} from 'lucide-react';
import {BottomSheetModal} from '../../../components/feedback/modals/BottomSheetModal';
import {useAppContext} from '../../../context/AppContext';
import {AgendaItem, Content, Platform, Projeto} from '../../../lib/database';
import {useIsMobile} from '../../../hooks/useIsMobile';
import {readStoredJson, writeStoredJson} from '../../../lib/browserStorage';
import {cn} from '../../../lib/utils';
import {AgendaMobileScreen} from '../../../mobile/screens/agenda/AgendaMobileScreen';
import {CONTENT_STATUS} from '../../contents/lib/contentPipeline';
import {createContentDraft} from '../../contents/lib/createContentDraft';
import {EditorialCalendarHeader} from '../components/EditorialCalendarHeader';
import {buildCalendarEntries, CalendarEntry, MonthlyCalendarView} from '../components/MonthlyCalendarView';

const STORAGE_KEY = 'content-os:calendar-layers';
const DEFAULT_LAYERS = ['recordings', 'posts', 'projects', 'agenda'];
type CalendarViewMode = 'month' | 'week' | 'agenda' | 'timeline';

function loadLayers(): string[] {
  return readStoredJson(STORAGE_KEY, DEFAULT_LAYERS);
}

export function getStatusIcon() {
  return null;
}

export function EditorialCalendarPage() {
  const {state, dispatch} = useAppContext();
  const isMobile = useIsMobile();
  const [isAddAgendaOpen, setIsAddAgendaOpen] = useState(false);
  const [isAddPostedVideoOpen, setIsAddPostedVideoOpen] = useState(false);
  const [selectedCalendarEntry, setSelectedCalendarEntry] = useState<CalendarEntry | null>(null);
  const [activeLayers, setActiveLayersRaw] = useState<string[]>(loadLayers);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortValue, setSortValue] = useState('proximos');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');

  const setActiveLayers = useCallback((updater: string[] | ((prev: string[]) => string[])) => {
    setActiveLayersRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      writeStoredJson(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const entriesByDate = useMemo(
    () => buildCalendarEntries(
      state.contents,
      state.platforms,
      state.agendaItems,
      state.projetos,
      activeLayers,
      searchTerm,
      sortValue
    ),
    [activeLayers, searchTerm, sortValue, state.agendaItems, state.contents, state.platforms, state.projetos]
  );
  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  const selectedEntries = entriesByDate.get(selectedDateKey) || [];
  const allCalendarEntries = Array.from(entriesByDate.values()).flat();
  const weeklyRecordings = allCalendarEntries.filter(entry => entry.type === 'recording').length;
  const weeklyPosts = allCalendarEntries.filter(entry => entry.type === 'publish').length;

  if (isMobile) {
    return (
      <>
        <div className="min-h-full bg-[var(--bg-primary)]">
          <AgendaMobileScreen
            contents={state.contents}
            platforms={state.platforms}
            agendaItems={state.agendaItems}
            projetos={state.projetos}
            onAddAgenda={() => setIsAddAgendaOpen(true)}
            onAddPostedVideo={() => setIsAddPostedVideoOpen(true)}
            onSelectEntry={setSelectedCalendarEntry}
          />
        </div>

        <BottomSheetModal
          open={isAddAgendaOpen}
          onClose={() => setIsAddAgendaOpen(false)}
          desktopMaxW="max-w-md"
        >
          <AddAgendaModal
            projetos={state.projetos}
            onClose={() => setIsAddAgendaOpen(false)}
            onSave={item => {
              dispatch({type: 'ADD_AGENDA_ITEM', payload: item});
              setIsAddAgendaOpen(false);
            }}
          />
        </BottomSheetModal>

        <BottomSheetModal
          open={isAddPostedVideoOpen}
          onClose={() => setIsAddPostedVideoOpen(false)}
          desktopMaxW="max-w-lg"
        >
          <AddPostedVideoModal
            platforms={state.platforms}
            onClose={() => setIsAddPostedVideoOpen(false)}
            onSave={content => {
              dispatch({type: 'ADD_CONTENT', payload: content});
              setIsAddPostedVideoOpen(false);
            }}
          />
        </BottomSheetModal>

        <BottomSheetModal
          open={Boolean(selectedCalendarEntry)}
          onClose={() => setSelectedCalendarEntry(null)}
          desktopMaxW="max-w-xl"
        >
          {selectedCalendarEntry ? (
            <CalendarEntryDetailModal
              key={selectedCalendarEntry.id}
              entry={selectedCalendarEntry}
              contents={state.contents}
              platforms={state.platforms}
              agendaItems={state.agendaItems}
              projetos={state.projetos}
              onClose={() => setSelectedCalendarEntry(null)}
              onSaveContent={content => {
                dispatch({type: 'UPDATE_CONTENT', payload: content});
                setSelectedCalendarEntry(null);
              }}
              onSaveAgenda={item => {
                dispatch({type: 'UPDATE_AGENDA_ITEM', payload: item});
                setSelectedCalendarEntry(null);
              }}
            />
          ) : null}
        </BottomSheetModal>
      </>
    );
  }

  return (
    <div className="min-h-full bg-[var(--bg-primary)] transition-colors duration-200">
      <EditorialCalendarHeader
        onAddAgenda={() => setIsAddAgendaOpen(true)}
        onAddPostedVideo={() => setIsAddPostedVideoOpen(true)}
      />

      <div className="h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
        <div className="mx-auto max-w-[1760px] px-5 py-5 md:px-8">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-3">
              <CalendarCommandBar
                month={currentMonth}
                viewMode={viewMode}
                pillars={state.pilares}
                platforms={state.platforms}
                searchTerm={searchTerm}
                sortValue={sortValue}
                onSearchChange={setSearchTerm}
                onSortChange={setSortValue}
                onViewChange={setViewMode}
                onPrevMonth={() => {
                  setCurrentMonth(date => viewMode === 'week' ? subWeeks(date, 1) : subMonths(date, 1));
                  if (viewMode === 'week') setSelectedDate(date => subWeeks(date, 1));
                }}
                onNextMonth={() => {
                  setCurrentMonth(date => viewMode === 'week' ? addWeeks(date, 1) : addMonths(date, 1));
                  if (viewMode === 'week') setSelectedDate(date => addWeeks(date, 1));
                }}
              />

              <CalendarLayerBar
                activeLayers={activeLayers}
                onToggleLayer={layerId =>
                  setActiveLayers(current =>
                    current.includes(layerId)
                      ? current.filter(layer => layer !== layerId)
                      : [...current, layerId]
                  )
                }
              />

              {viewMode === 'agenda' ? (
                <CalendarAgendaListView
                  entriesByDate={entriesByDate}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  onSelectEntry={setSelectedCalendarEntry}
                />
              ) : viewMode === 'week' ? (
                <CalendarWeekView
                  weekDate={currentMonth}
                  selectedDate={selectedDate}
                  entriesByDate={entriesByDate}
                  onSelectDate={setSelectedDate}
                  onSelectEntry={setSelectedCalendarEntry}
                />
              ) : (
                <MonthlyCalendarView
                  contents={state.contents}
                  platforms={state.platforms}
                  agendaItems={state.agendaItems}
                  projetos={state.projetos}
                  activeLayers={activeLayers}
                  searchTerm={searchTerm}
                  sortValue={sortValue}
                  monthsToShow={1}
                  monthDate={currentMonth}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  onSelectEntry={setSelectedCalendarEntry}
                />
              )}

              <CalendarInsightCards
                recordings={weeklyRecordings}
                posts={weeklyPosts}
                projects={state.projetos.filter(project => !project.deletedAt).length}
              />
            </div>

            <CalendarDayPanel
              selectedDate={selectedDate}
              entries={selectedEntries}
              onClose={() => setSelectedDate(new Date())}
              onSelectEntry={setSelectedCalendarEntry}
              onAddAgenda={() => setIsAddAgendaOpen(true)}
            />
          </div>
        </div>
      </div>

      <BottomSheetModal
        open={isAddAgendaOpen}
        onClose={() => setIsAddAgendaOpen(false)}
        desktopMaxW="max-w-md"
      >
        <AddAgendaModal
          projetos={state.projetos}
          onClose={() => setIsAddAgendaOpen(false)}
          onSave={item => {
            dispatch({type: 'ADD_AGENDA_ITEM', payload: item});
            setIsAddAgendaOpen(false);
          }}
        />
      </BottomSheetModal>

      <BottomSheetModal
        open={isAddPostedVideoOpen}
        onClose={() => setIsAddPostedVideoOpen(false)}
        desktopMaxW="max-w-lg"
      >
        <AddPostedVideoModal
          platforms={state.platforms}
          onClose={() => setIsAddPostedVideoOpen(false)}
          onSave={content => {
            dispatch({type: 'ADD_CONTENT', payload: content});
            setIsAddPostedVideoOpen(false);
          }}
        />
      </BottomSheetModal>

      <BottomSheetModal
        open={Boolean(selectedCalendarEntry)}
        onClose={() => setSelectedCalendarEntry(null)}
        desktopMaxW="max-w-xl"
      >
        {selectedCalendarEntry ? (
          <CalendarEntryDetailModal
            key={selectedCalendarEntry.id}
            entry={selectedCalendarEntry}
            contents={state.contents}
            platforms={state.platforms}
            agendaItems={state.agendaItems}
            projetos={state.projetos}
            onClose={() => setSelectedCalendarEntry(null)}
            onSaveContent={content => {
              dispatch({type: 'UPDATE_CONTENT', payload: content});
              setSelectedCalendarEntry(null);
            }}
            onSaveAgenda={item => {
              dispatch({type: 'UPDATE_AGENDA_ITEM', payload: item});
              setSelectedCalendarEntry(null);
            }}
          />
        ) : null}
      </BottomSheetModal>
    </div>
  );
}

function CalendarCommandBar({
  month,
  viewMode,
  pillars,
  platforms,
  searchTerm,
  sortValue,
  onSearchChange,
  onSortChange,
  onViewChange,
  onPrevMonth,
  onNextMonth,
}: {
  month: Date;
  viewMode: CalendarViewMode;
  pillars: {id: string; nome: string}[];
  platforms: {id: string; nome: string; ativo: boolean}[];
  searchTerm: string;
  sortValue: string;
  onSearchChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onViewChange: (value: CalendarViewMode) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const navLabel = viewMode === 'week'
    ? `${format(startOfWeek(month, {weekStartsOn: 0}), 'd MMM', {locale: ptBR})} - ${format(endOfWeek(month, {weekStartsOn: 0}), 'd MMM yyyy', {locale: ptBR})}`
    : format(month, 'MMMM yyyy', {locale: ptBR});
  const views: {id: CalendarViewMode; label: string}[] = [
    {id: 'month', label: 'Mes'},
    {id: 'week', label: 'Semana'},
    {id: 'agenda', label: 'Agenda'},
    {id: 'timeline', label: 'Timeline'},
  ];

  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[color-mix(in_srgb,var(--bg-elevated),transparent_4%)] px-3 py-3 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg bg-[var(--surface-subtle)] p-1">
          {views.map(view => (
            <button
              key={view.id}
              type="button"
              onClick={() => onViewChange(view.id)}
              className={cn(
                'h-9 rounded-md px-4 text-[13px] font-semibold transition-all',
                viewMode === view.id
                  ? 'bg-[color-mix(in_srgb,var(--accent-purple),transparent_88%)] text-[var(--accent-purple)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              {view.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-2 py-1.5">
          <button type="button" onClick={onPrevMonth} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--bg-hover)]">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex min-w-[150px] items-center justify-center gap-2 text-[14px] font-semibold text-[var(--text-primary)]">
            <CalendarDays className="h-4 w-4 text-[var(--text-secondary)]" />
            {navLabel}
          </div>
          <button type="button" onClick={onNextMonth} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--bg-hover)]">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <select className="h-10 min-w-[170px] rounded-lg">
          <option value="">Pilares: Todos</option>
          {pillars.map(pillar => (
            <option key={pillar.id} value={pillar.id}>
              {pillar.nome}
            </option>
          ))}
        </select>

        <select className="h-10 min-w-[190px] rounded-lg">
          <option value="">Plataformas: Todas</option>
          {platforms.filter(platform => platform.ativo).map(platform => (
            <option key={platform.id} value={platform.id}>
              {platform.nome}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={searchTerm}
          onChange={event => onSearchChange(event.target.value)}
          placeholder="Buscar"
          className="h-10 min-w-[150px] flex-1 rounded-lg"
        />

        <select
          value={sortValue}
          onChange={event => onSortChange(event.target.value)}
          className="h-10 min-w-[150px] rounded-lg"
        >
          <option value="proximos">Proximos</option>
          <option value="titulo:asc">Titulo A-Z</option>
          <option value="tipo:asc">Tipo</option>
        </select>

        <button type="button" className="flex h-10 items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
          <Filter className="h-4 w-4" />
          Filtros
          <span className="rounded-full bg-[color-mix(in_srgb,var(--accent-purple),transparent_86%)] px-2 py-0.5 text-[11px] text-[var(--accent-purple)]">
            2
          </span>
        </button>
      </div>
    </div>
  );
}

const CALENDAR_LAYERS = [
  {id: 'recordings', label: 'Gravacoes', icon: Mic2, tone: 'red'},
  {id: 'posts', label: 'Postagens', icon: Send, tone: 'purple'},
  {id: 'projects', label: 'Projetos', icon: BookOpen, tone: 'blue'},
  {id: 'agenda', label: 'Eventos', icon: CalendarDays, tone: 'green'},
  {id: 'rules', label: 'Regras', icon: Zap, tone: 'amber'},
] as const;

const layerToneClass: Record<string, string> = {
  red: 'border-red-200 bg-red-50 text-red-600',
  purple: 'border-purple-200 bg-purple-50 text-purple-600',
  blue: 'border-blue-200 bg-blue-50 text-blue-600',
  green: 'border-green-200 bg-green-50 text-green-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
};

function CalendarLayerBar({
  activeLayers,
  onToggleLayer,
}: {
  activeLayers: string[];
  onToggleLayer: (layerId: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        {CALENDAR_LAYERS.map(layer => {
          const Icon = layer.icon;
          const active = activeLayers.includes(layer.id);

          return (
            <button
              key={layer.id}
              type="button"
              onClick={() => onToggleLayer(layer.id)}
              className={cn(
                'flex h-9 items-center gap-2 rounded-lg border px-3 text-[12px] font-semibold transition-all hover:-translate-y-0.5',
                active ? layerToneClass[layer.tone] : 'border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-tertiary)] opacity-65'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {layer.label}
              <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-current' : 'bg-[var(--text-tertiary)]')} />
            </button>
          );
        })}
      </div>

      <button type="button" className="flex h-9 items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 text-[12px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
        <Layers className="h-4 w-4" />
        Camadas
      </button>
    </div>
  );
}

function getEntryLabel(entry: CalendarEntry) {
  return entry.type === 'project'
    ? 'Projeto'
    : entry.type === 'recording'
      ? 'Gravacao'
      : entry.type === 'publish'
        ? 'Postagem'
        : 'Evento';
}

function getEntryTone(entry: CalendarEntry) {
  return cn(
    entry.type === 'recording' && 'border-red-100 bg-red-50/80 text-red-700',
    entry.type === 'publish' && 'border-purple-100 bg-purple-50/80 text-purple-700',
    entry.type === 'project' && 'border-blue-100 bg-blue-50/80 text-blue-700',
    entry.type === 'agenda' && 'border-green-100 bg-green-50/80 text-green-700'
  );
}

function CalendarWeekView({
  weekDate,
  selectedDate,
  entriesByDate,
  onSelectDate,
  onSelectEntry,
}: {
  weekDate: Date;
  selectedDate: Date;
  entriesByDate: Map<string, CalendarEntry[]>;
  onSelectDate: (date: Date) => void;
  onSelectEntry: (entry: CalendarEntry) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(weekDate, {weekStartsOn: 0}),
    end: endOfWeek(weekDate, {weekStartsOn: 0}),
  });

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] shadow-[var(--shadow-soft)]">
      <div className="grid grid-cols-7 border-b border-[var(--border-color)] bg-[color-mix(in_srgb,var(--surface-subtle),transparent_10%)]">
        {days.map(day => {
          const active = isSameDay(day, selectedDate);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDate(day)}
              className={cn(
                'flex flex-col items-center gap-1 border-r border-[var(--border-color)] py-4 text-center last:border-r-0 transition-colors',
                active && 'bg-[color-mix(in_srgb,var(--accent-blue),transparent_94%)]'
              )}
            >
              <span className="text-[11px] font-semibold uppercase text-[var(--text-tertiary)]">
                {format(day, 'EEE', {locale: ptBR})}
              </span>
              <span className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full text-[16px] font-semibold text-[var(--text-primary)]',
                active && 'bg-[var(--accent-blue)] text-white'
              )}>
                {format(day, 'd')}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid min-h-[620px] grid-cols-7">
        {days.map(day => {
          const entries = entriesByDate.get(format(day, 'yyyy-MM-dd')) || [];
          return (
            <div
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={cn(
                'border-r border-[var(--border-color)] p-3 last:border-r-0 transition-colors hover:bg-[var(--surface-subtle)]',
                isSameDay(day, selectedDate) && 'bg-[color-mix(in_srgb,var(--accent-blue),transparent_96%)]'
              )}
            >
              <div className="space-y-2">
                {entries.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[var(--border-color)] px-3 py-8 text-center text-[12px] text-[var(--text-tertiary)]">
                    Livre
                  </div>
                ) : (
                  entries.map(entry => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={event => {
                        event.stopPropagation();
                        onSelectDate(day);
                        onSelectEntry(entry);
                      }}
                      className={cn('w-full rounded-lg border px-3 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm', getEntryTone(entry))}
                    >
                      <span className="text-[11px] font-semibold">{getEntryLabel(entry)}</span>
                      <p className="mt-1 line-clamp-2 text-[13px] font-semibold text-[var(--text-primary)]">{entry.label}</p>
                      <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                        {[entry.time, entry.secondary].filter(Boolean).join(' - ') || 'Sem horario'}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CalendarAgendaListView({
  entriesByDate,
  selectedDate,
  onSelectDate,
  onSelectEntry,
}: {
  entriesByDate: Map<string, CalendarEntry[]>;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onSelectEntry: (entry: CalendarEntry) => void;
}) {
  const groupedEntries = Array.from(entriesByDate.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(0, 60);

  return (
    <section className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-soft)]">
      <div className="mb-3 flex items-center justify-between px-1">
        <div>
          <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">Agenda editorial</h2>
          <p className="text-[12px] text-[var(--text-secondary)]">Lista cronologica de operacoes planejadas.</p>
        </div>
        <span className="status-pill">{groupedEntries.reduce((total, [, entries]) => total + entries.length, 0)} eventos</span>
      </div>

      <div className="space-y-3">
        {groupedEntries.length === 0 ? (
          <div className="rounded-lg bg-[var(--surface-subtle)] px-4 py-10 text-center text-[14px] text-[var(--text-secondary)]">
            Nenhum evento encontrado com os filtros atuais.
          </div>
        ) : (
          groupedEntries.map(([dateKey, entries]) => {
            const date = new Date(`${dateKey}T12:00:00`);
            const active = isSameDay(date, selectedDate);
            return (
              <div key={dateKey} className={cn('rounded-lg border p-3', active ? 'border-[color-mix(in_srgb,var(--accent-blue),transparent_62%)] bg-[color-mix(in_srgb,var(--accent-blue),transparent_96%)]' : 'border-[var(--border-color)]')}>
                <button type="button" onClick={() => onSelectDate(date)} className="mb-3 flex w-full items-center justify-between text-left">
                  <div>
                    <p className="text-[14px] font-semibold capitalize text-[var(--text-primary)]">
                      {format(date, "d 'de' MMMM", {locale: ptBR})}
                    </p>
                    <p className="text-[12px] capitalize text-[var(--text-secondary)]">{format(date, 'EEEE', {locale: ptBR})}</p>
                  </div>
                  <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                    {entries.length}
                  </span>
                </button>

                <div className="space-y-2">
                  {entries.map(entry => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => {
                        onSelectDate(date);
                        onSelectEntry(entry);
                      }}
                      className={cn('flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm', getEntryTone(entry))}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/70">
                        {entry.type === 'recording' ? <Mic2 className="h-4 w-4" /> : entry.type === 'publish' ? <Send className="h-4 w-4" /> : entry.type === 'project' ? <BookOpen className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{entry.label}</p>
                        <p className="truncate text-[11px] text-[var(--text-secondary)]">
                          {[getEntryLabel(entry), entry.time, entry.secondary].filter(Boolean).join(' - ')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function CalendarDayPanel({
  selectedDate,
  entries,
  onClose,
  onSelectEntry,
  onAddAgenda,
}: {
  selectedDate: Date;
  entries: CalendarEntry[];
  onClose: () => void;
  onSelectEntry: (entry: CalendarEntry) => void;
  onAddAgenda: () => void;
}) {
  const primaryEntry = entries[0];

  return (
    <aside className="sticky top-5 h-fit rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-soft)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-semibold text-[var(--text-primary)]">
            {format(selectedDate, "d 'de' MMMM", {locale: ptBR})}
          </h2>
          <p className="text-[12px] font-medium capitalize text-[var(--text-secondary)]">
            {format(selectedDate, 'EEEE', {locale: ptBR})}
          </p>
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-2 text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]">
          <X className="h-4 w-4" />
        </button>
      </div>

      {primaryEntry ? (
        <button
          type="button"
          onClick={() => onSelectEntry(primaryEntry)}
          className="mb-4 w-full rounded-lg border border-[color-mix(in_srgb,var(--accent-blue),transparent_62%)] bg-[color-mix(in_srgb,var(--accent-blue),transparent_94%)] p-4 text-left"
        >
          <span className="status-pill mb-3 border-blue-200 bg-blue-50 text-blue-600">
            {primaryEntry.type === 'project' ? 'Projeto' : primaryEntry.type === 'recording' ? 'Gravacao' : primaryEntry.type === 'publish' ? 'Postagem' : 'Evento'}
          </span>
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">{primaryEntry.label}</h3>
          <p className="mt-1 text-[12px] text-[var(--text-secondary)]">{primaryEntry.secondary || 'Detalhe editorial'}</p>
        </button>
      ) : null}

      <div className="rounded-lg border border-[var(--border-color)] p-3">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-normal text-[var(--text-tertiary)]">Eventos do dia</p>
          <button type="button" onClick={onAddAgenda} className="text-[12px] font-semibold text-[var(--accent-blue)]">
            + Adicionar
          </button>
        </div>

        <div className="space-y-2">
          {entries.length === 0 ? (
            <p className="rounded-lg bg-[var(--surface-subtle)] px-3 py-4 text-[13px] text-[var(--text-secondary)]">
              Nenhuma operacao planejada para este dia.
            </p>
          ) : (
            entries.map(entry => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelectEntry(entry)}
                className={cn(
                  'w-full rounded-lg border px-3 py-3 text-left transition-all hover:-translate-y-0.5',
                  entry.type === 'recording' && 'border-red-100 bg-red-50/70',
                  entry.type === 'publish' && 'border-purple-100 bg-purple-50/70',
                  entry.type === 'project' && 'border-blue-100 bg-blue-50/70',
                  entry.type === 'agenda' && 'border-green-100 bg-green-50/70'
                )}
              >
                <p className="text-[12px] font-semibold text-[var(--text-primary)]">{entry.label}</p>
                <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                  {[entry.time, entry.secondary].filter(Boolean).join(' - ') || 'Sem horario'}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="rounded-lg border border-[var(--border-color)] p-3">
          <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-[var(--accent-purple)]">
            <Target className="h-4 w-4" />
            Foco do dia
          </div>
          <p className="text-[13px] text-[var(--text-primary)]">Entregar roteiro e gravar 1 bloco</p>
          <div className="mt-3 h-1.5 rounded-full bg-[var(--bg-hover)]">
            <div className="h-full w-[72%] rounded-full bg-[var(--accent-purple)]" />
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] p-3">
          <p className="text-[11px] font-semibold text-[var(--text-tertiary)]">Observacoes</p>
          <p className="mt-2 text-[13px] leading-5 text-[var(--text-secondary)]">
            Verificar referencias e dependencias antes da gravacao.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] p-3">
          <p className="text-[11px] font-semibold text-[var(--text-tertiary)]">Arquivos</p>
          <div className="mt-3 rounded-lg border border-[var(--border-color)] bg-[var(--surface-subtle)] px-3 py-3">
            <p className="text-[12px] font-semibold text-[var(--text-primary)]">roteiro_colab.docx</p>
            <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">2.4 MB</p>
          </div>
          <button type="button" className="mt-3 h-10 w-full rounded-lg border border-[var(--border-color)] text-[12px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]">
            Ver projeto completo
          </button>
        </div>
      </div>
    </aside>
  );
}

function CalendarInsightCards({
  recordings,
  posts,
  projects,
}: {
  recordings: number;
  posts: number;
  projects: number;
}) {
  const cards = [
    {label: 'Gravacoes', value: recordings, detail: 'agendadas', icon: Mic2, tone: 'text-red-500 bg-red-50'},
    {label: 'Postagens', value: posts, detail: 'programadas', icon: Send, tone: 'text-purple-600 bg-purple-50'},
    {label: 'Projetos', value: projects, detail: 'em movimento', icon: BookOpen, tone: 'text-blue-600 bg-blue-50'},
    {label: 'Conflitos', value: 0, detail: 'looks repetidos', icon: Zap, tone: 'text-amber-600 bg-amber-50'},
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map(card => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-soft)]">
            <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-lg', card.tone)}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-[12px] font-semibold text-[var(--text-secondary)]">{card.label}</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-2xl font-semibold text-[var(--text-primary)]">{card.value}</span>
              <span className="pb-1 text-[12px] text-[var(--text-secondary)]">{card.detail}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FieldRow({label, value}: {label: string; value: string}) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-hover)]/50 px-4 py-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm font-bold text-[var(--text-primary)]">
        {value || '-'}
      </p>
    </div>
  );
}

function CalendarEntryDetailModal({
  entry,
  contents,
  platforms,
  agendaItems,
  projetos,
  onClose,
  onSaveContent,
  onSaveAgenda,
}: {
  entry: CalendarEntry;
  contents: Content[];
  platforms: Platform[];
  agendaItems: AgendaItem[];
  projetos: Projeto[];
  onClose: () => void;
  onSaveContent: (content: Content) => void;
  onSaveAgenda: (item: AgendaItem) => void;
}) {
  const content = entry.contentId ? contents.find(item => item.id === entry.contentId) : null;
  const agendaItem = entry.agendaId ? agendaItems.find(item => item.id === entry.agendaId) : null;
  const projeto = entry.projetoId ? projetos.find(item => item.id === entry.projetoId) : null;
  const plataforma = content?.plataformas.find(item => item.id === entry.plataformaId);
  const activePlatforms = platforms.filter(platform => platform.ativo);
  const platformName = plataforma
    ? platforms.find(platform => platform.id === plataforma.platformId)?.nome || plataforma.platformId
    : '';
  const canEdit = Boolean(content || agendaItem);

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(content?.title || agendaItem?.title || projeto?.nome || entry.label);
  const [date, setDate] = useState(
    entry.type === 'recording'
      ? content?.recordingDate || entry.date
      : plataforma?.publishDate || content?.publishDate || agendaItem?.date || entry.date
  );
  const [time, setTime] = useState(plataforma?.publishTime || content?.publishTime || agendaItem?.time || '');
  const [platformId, setPlatformId] = useState(plataforma?.platformId || activePlatforms[0]?.id || '');
  const [caption, setCaption] = useState(plataforma?.legenda || '');
  const [agendaType, setAgendaType] = useState<AgendaItem['tipo']>(agendaItem?.tipo || 'Outro');
  const [projetoId, setProjetoId] = useState(agendaItem?.projetoId || '');

  const resetDraft = () => {
    setTitle(content?.title || agendaItem?.title || projeto?.nome || entry.label);
    setDate(
      entry.type === 'recording'
        ? content?.recordingDate || entry.date
        : plataforma?.publishDate || content?.publishDate || agendaItem?.date || entry.date
    );
    setTime(plataforma?.publishTime || content?.publishTime || agendaItem?.time || '');
    setPlatformId(plataforma?.platformId || activePlatforms[0]?.id || '');
    setCaption(plataforma?.legenda || '');
    setAgendaType(agendaItem?.tipo || 'Outro');
    setProjetoId(agendaItem?.projetoId || '');
  };

  const handleCancelEdit = () => {
    resetDraft();
    setIsEditing(false);
  };

  const handleSave = () => {
    if (!title.trim() || !date) return;

    if (agendaItem) {
      onSaveAgenda({
        ...agendaItem,
        title: title.trim(),
        date,
        time: time || null,
        tipo: agendaType,
        projetoId: projetoId || null,
      });
      return;
    }

    if (!content) return;

    if (entry.type === 'recording') {
      onSaveContent({
        ...content,
        title: title.trim(),
        recordingDate: date,
        recordingDateEnabled: true,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    const platformRecordId = plataforma?.id || crypto.randomUUID();
    const nextPlatformId = platformId || plataforma?.platformId || activePlatforms[0]?.id || '';
    const nextPlataformas = content.plataformas.some(item => item.id === platformRecordId)
      ? content.plataformas.map(item =>
          item.id === platformRecordId
            ? {
                ...item,
                platformId: nextPlatformId,
                legenda: caption,
                publishDate: date,
                publishTime: time || null,
                publishDateEnabled: true,
              }
            : item
        )
      : [
          ...content.plataformas,
          {
            id: platformRecordId,
            contentId: content.id,
            platformId: nextPlatformId,
            legenda: caption,
            hashtags: '',
            publishDate: date,
            publishTime: time || null,
            publishDateEnabled: true,
          },
        ];

    onSaveContent({
      ...content,
      title: title.trim(),
      publishDate: date,
      publishTime: time || null,
      publishDateEnabled: true,
      plataformas: nextPlataformas,
      updatedAt: new Date().toISOString(),
    });
  };

  const subtitle =
    entry.type === 'publish'
      ? 'Publicacao'
      : entry.type === 'recording'
        ? 'Gravacao'
        : entry.type === 'agenda'
          ? 'Agenda'
          : 'Projeto';

  return (
    <div className="flex max-h-[90vh] flex-col bg-[var(--bg-primary)]">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border-color)] px-6 py-5">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[var(--text-tertiary)]">
            {subtitle}
          </p>
          <h2 className="mt-1 truncate text-lg font-black text-[var(--text-primary)]">
            {isEditing ? 'Editar evento' : title}
          </h2>
        </div>
        <button onClick={onClose} className="rounded-full p-2 transition-all hover:bg-[var(--bg-hover)]">
          <Plus className="h-5 w-5 rotate-45 text-[var(--text-tertiary)]" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {isEditing ? (
          <>
            <label className="block space-y-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
                Titulo
              </span>
              <input
                autoFocus
                type="text"
                value={title}
                onChange={event => setTitle(event.target.value)}
                className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-blue)]"
              />
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
                  Data
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={event => setDate(event.target.value)}
                  className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-blue)]"
                />
              </label>

              {entry.type !== 'recording' ? (
                <label className="block space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
                    Hora
                  </span>
                  <input
                    type="time"
                    value={time}
                    onChange={event => setTime(event.target.value)}
                    className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-blue)]"
                  />
                </label>
              ) : null}
            </div>

            {agendaItem ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {(['ReuniÃ£o', 'Entrega', 'PublicaÃ§Ã£o', 'Outro'] as AgendaItem['tipo'][]).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAgendaType(type)}
                      className={`rounded-xl border px-3 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                        agendaType === type
                          ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                          : 'border-[var(--border-color)] text-[var(--text-tertiary)]'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <label className="block space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
                    Projeto vinculado
                  </span>
                  <select
                    value={projetoId}
                    onChange={event => setProjetoId(event.target.value)}
                    className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-blue)]"
                  >
                    <option value="">Sem projeto</option>
                    {projetos
                      .filter(item => !item.deletedAt)
                      .map(item => (
                        <option key={item.id} value={item.id}>
                          {item.nome}
                        </option>
                      ))}
                  </select>
                </label>
              </>
            ) : null}

            {content && entry.type === 'publish' ? (
              <>
                <label className="block space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
                    Rede postada
                  </span>
                  <select
                    value={platformId}
                    onChange={event => setPlatformId(event.target.value)}
                    className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-blue)]"
                  >
                    {activePlatforms.map(platform => (
                      <option key={platform.id} value={platform.id}>
                        {platform.nome}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
                    Legenda
                  </span>
                  <textarea
                    value={caption}
                    onChange={event => setCaption(event.target.value)}
                    rows={7}
                    className="w-full resize-none rounded-2xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-5 py-3.5 text-sm font-medium leading-relaxed text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-blue)]"
                  />
                </label>
              </>
            ) : null}
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FieldRow label="Data" value={date} />
              <FieldRow label="Hora" value={time || '-'} />
              <FieldRow label="Tipo" value={subtitle} />
              <FieldRow label="Status" value={content?.status || agendaItem?.tipo || entry.secondary || '-'} />
            </div>

            {entry.type === 'publish' ? (
              <>
                <FieldRow label="Rede" value={platformName || entry.secondary || '-'} />
                <FieldRow label="Legenda" value={caption || 'Sem legenda registrada.'} />
              </>
            ) : null}

            {agendaItem ? (
              <FieldRow
                label="Projeto"
                value={agendaItem.projetoId ? projetos.find(item => item.id === agendaItem.projetoId)?.nome || '-' : 'Sem projeto'}
              />
            ) : null}

            {entry.type === 'project' ? (
              <FieldRow label="Detalhe" value={entry.secondary || 'Projeto'} />
            ) : null}
          </>
        )}
      </div>

      <div className="flex gap-3 border-t border-[var(--border-color)] px-6 py-4">
        {isEditing ? (
          <>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="flex-1 rounded-2xl border border-[var(--border-color)] py-3 text-xs font-black uppercase tracking-widest text-[var(--text-primary)] transition-all hover:bg-[var(--bg-hover)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!title.trim() || !date}
              className="flex-1 rounded-2xl bg-[var(--text-primary)] py-3 text-xs font-black uppercase tracking-widest text-[var(--bg-primary)] transition-all hover:scale-[1.01] disabled:pointer-events-none disabled:opacity-30"
            >
              Salvar
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-[var(--border-color)] py-3 text-xs font-black uppercase tracking-widest text-[var(--text-primary)] transition-all hover:bg-[var(--bg-hover)]"
            >
              Fechar
            </button>
            {canEdit ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex-1 rounded-2xl bg-[var(--text-primary)] py-3 text-xs font-black uppercase tracking-widest text-[var(--bg-primary)] transition-all hover:scale-[1.01]"
              >
                Editar
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function AddPostedVideoModal({
  platforms,
  onSave,
  onClose,
}: {
  platforms: Platform[];
  onSave: (content: Content) => void;
  onClose: () => void;
}) {
  const activePlatforms = platforms.filter(platform => platform.ativo);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('');
  const [platformId, setPlatformId] = useState(activePlatforms[0]?.id || '');
  const [caption, setCaption] = useState('');

  const handleSave = () => {
    if (!title.trim() || !date || !platformId) return;

    const contentId = crypto.randomUUID();
    const now = new Date().toISOString();
    const content = createContentDraft({
      id: contentId,
      title: title.trim(),
      status: CONTENT_STATUS.POSTADO,
      formatoVisual: 'Video',
      publishDate: date,
      publishTime: time || null,
      publishDateEnabled: true,
      notes: 'Registrado diretamente no calendario como video ja postado.',
      createdAt: now,
      updatedAt: now,
      plataformas: [
        {
          id: crypto.randomUUID(),
          contentId,
          platformId,
          legenda: caption.trim(),
          hashtags: '',
          publishDate: date,
          publishTime: time || null,
          publishDateEnabled: true,
        },
      ],
    });

    onSave(content);
  };

  return (
    <div className="flex h-full flex-col bg-[var(--bg-primary)]">
      <div className="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-5">
        <div>
          <h2 className="text-lg font-black text-[var(--text-primary)]">Video postado</h2>
          <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.25em] text-[var(--text-tertiary)]">
            Registro de publicacao
          </p>
        </div>
        <button onClick={onClose} className="rounded-full p-2 transition-all hover:bg-[var(--bg-hover)]">
          <Plus className="h-5 w-5 rotate-45 text-[var(--text-tertiary)]" />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-6">
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-hover)]/50 px-4 py-3">
          <p className="text-[11px] font-bold leading-relaxed text-[var(--text-tertiary)]">
            Esse registro entra como conteudo Postado, aparece na camada de publicacoes e ja fica pronto para cruzar com metricas e analises depois.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
            Titulo do video
          </label>
          <input
            autoFocus
            type="text"
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="Ex: 3 sinais de que..."
            className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:ring-2 focus:ring-[var(--accent-blue)]"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
              Data postada
            </label>
            <input
              type="date"
              value={date}
              onChange={event => setDate(event.target.value)}
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-blue)]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
              Hora
            </label>
            <input
              type="time"
              value={time}
              onChange={event => setTime(event.target.value)}
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-blue)]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
              Rede postada
            </label>
            <select
              value={platformId}
              onChange={event => setPlatformId(event.target.value)}
              disabled={activePlatforms.length === 0}
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-blue)] disabled:opacity-40"
            >
              {activePlatforms.length === 0 ? (
                <option value="">Cadastre uma rede primeiro</option>
              ) : (
                activePlatforms.map(platform => (
                  <option key={platform.id} value={platform.id}>
                    {platform.nome}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
            Legenda publicada
          </label>
          <textarea
            value={caption}
            onChange={event => setCaption(event.target.value)}
            rows={7}
            placeholder="Cole aqui a legenda que foi publicada..."
            className="w-full resize-none rounded-2xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-5 py-3.5 text-sm font-medium leading-relaxed text-[var(--text-primary)] placeholder:opacity-30 focus:ring-2 focus:ring-[var(--accent-blue)]"
          />
        </div>
      </div>

      <div className="border-t border-[var(--border-color)] px-6 py-4">
        <button
          onClick={handleSave}
          disabled={!title.trim() || !date || !platformId}
          className="w-full rounded-2xl bg-[var(--text-primary)] py-4 text-xs font-black uppercase tracking-widest text-[var(--bg-primary)] shadow-lg transition-all hover:scale-[1.01] disabled:pointer-events-none disabled:opacity-30"
        >
          Registrar no calendario
        </button>
      </div>
    </div>
  );
}

function AddAgendaModal({
  projetos,
  onSave,
  onClose,
}: {
  projetos: Projeto[];
  onSave: (item: AgendaItem) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [agendaType, setAgendaType] = useState<AgendaItem['tipo']>('Reunião');
  const [projetoId, setProjetoId] = useState('');

  const handleSave = () => {
    if (!title.trim() || !date) return;

    onSave({
      id: crypto.randomUUID(),
      userId: '',
      title: title.trim(),
      date,
      time: null,
      tipo: agendaType,
      projetoId: projetoId || null,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="flex h-full flex-col bg-[var(--bg-primary)]">
      <div className="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-5">
        <div>
          <h2 className="text-lg font-black text-[var(--text-primary)]">Novo Evento</h2>
          <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.25em] text-[var(--text-tertiary)]">
            Agenda editorial
          </p>
        </div>
        <button onClick={onClose} className="rounded-full p-2 transition-all hover:bg-[var(--bg-hover)]">
          <Plus className="h-5 w-5 rotate-45 text-[var(--text-tertiary)]" />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-6">
        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
            Titulo do evento
          </label>
          <input
            autoFocus
            type="text"
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="Ex: reuniao, entrega, live..."
            className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:ring-2 focus:ring-[var(--accent-blue)]"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
            Data
          </label>
          <input
            type="date"
            value={date}
            onChange={event => setDate(event.target.value)}
            className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-blue)]"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
            Tipo
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['Reunião', 'Entrega', 'Publicação', 'Outro'] as AgendaItem['tipo'][]).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setAgendaType(type)}
                className={`rounded-xl border px-3 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                  agendaType === type
                    ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                    : 'border-[var(--border-color)] text-[var(--text-tertiary)]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
            Projeto vinculado
          </label>
          <select
            value={projetoId}
            onChange={event => setProjetoId(event.target.value)}
            className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-5 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-blue)]"
          >
            <option value="">Sem projeto</option>
            {projetos
              .filter(projeto => !projeto.deletedAt)
              .map(projeto => (
                <option key={projeto.id} value={projeto.id}>
                  {projeto.nome}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="border-t border-[var(--border-color)] px-6 py-4">
        <button
          onClick={handleSave}
          disabled={!title.trim() || !date}
          className="w-full rounded-2xl bg-[var(--text-primary)] py-4 text-xs font-black uppercase tracking-widest text-[var(--bg-primary)] shadow-lg transition-all hover:scale-[1.01] disabled:pointer-events-none disabled:opacity-30"
        >
          Adicionar evento
        </button>
      </div>
    </div>
  );
}
