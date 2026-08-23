import {useCallback, useEffect, useMemo, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {eachDayOfInterval, endOfWeek, format, isSameDay, startOfWeek} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {BookOpen, CalendarDays, ChevronDown, Clock, Mic2, PanelRight, Plus, Radio, Search, Send, Target, X} from 'lucide-react';
import {
  CalendarDesktopShell,
  CalendarEventPill,
  CalendarLayerChecklist,
  CalendarMiniMonth,
  CalendarPeriodNav,
  CalendarQuickCreatePopover,
  editorialPillStyle,
} from '../../../components/calendar';
import {AppButton} from '../../../components/ui/AppButton';
import {Text} from '../../../components/ui/Text';
import {PageLayout} from '../../../layouts/page/PageLayout';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import {BottomSheetModal} from '../../../components/feedback/modals/BottomSheetModal';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {OverlayFooter} from '../../../components/overlays/OverlayFooter';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import {Drawer} from '../../../components/overlays/Drawer';
import {useAppContext} from '../../../context/AppContext';
import {AgendaItem, Content, Platform, Projeto} from '../../../lib/database';
import {useIsMobile} from '../../../hooks/useIsMobile';
import {readStoredJson, writeStoredJson} from '../../../lib/browserStorage';
import {cn} from '../../../lib/utils';
import {AgendaMobileScreen} from '../../../mobile/screens/agenda/AgendaMobileScreen';
import {CONTENT_STATUS, ContentStage, getContentStage} from '../../contents/lib/contentPipeline';
import {buildContentDetailRoute} from '../../contents/lib/contentDetailRoute';
import {buildDetailBackState} from '../../../lib/navigation/detailBack';
import {PostedVideoComposerSheet} from '../../contents/components/PostedVideoComposerSheet';
import {buildCalendarEntries, CalendarEntry, MonthlyCalendarView} from '../components/MonthlyCalendarView';
import {CalendarModeSwitch} from '../components/CalendarModeSwitch';
import {PostingTimeSuggestions} from '../../settings/components/PostingTimeSuggestions';
import {getPostingTimes} from '../../settings/lib/postingTimes';
import {generateUUID} from '../../../utils/uuid';

const STORAGE_KEY = 'content-os:calendar-layers';
const PANEL_STORAGE_KEY = 'content-os:calendar-day-panel';
const DEFAULT_LAYERS = ['recordings', 'posts', 'projects', 'agenda'];
type CalendarViewMode = 'month' | 'week' | 'agenda' | 'timeline';

function loadLayers(): string[] {
  return readStoredJson(STORAGE_KEY, DEFAULT_LAYERS);
}

function loadDayPanelOpen(): boolean {
  return readStoredJson(PANEL_STORAGE_KEY, true);
}

export function getStatusIcon() {
  return null;
}

export function EditorialCalendarPage() {
  const {state, dispatch} = useAppContext();
  const navigate = useNavigate();
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
  const [dayPanelOpen, setDayPanelOpenRaw] = useState(loadDayPanelOpen);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [quickCreateDate, setQuickCreateDate] = useState<Date | null>(null);
  const [agendaDraft, setAgendaDraft] = useState<{title: string; date: string; time: string | null} | null>(null);

  const setDayPanelOpen = useCallback((value: boolean) => {
    setDayPanelOpenRaw(value);
    writeStoredJson(PANEL_STORAGE_KEY, value);
  }, []);

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

  // Spec: projeto -> pagina dedicada; conteudo -> drawer; evento -> modal.
  const handleSelectEntry = useCallback(
    (entry: CalendarEntry) => {
      if (entry.type === 'project' && entry.projetoId) {
        navigate(`/projetos/${entry.projetoId}`);
        return;
      }
      setSelectedCalendarEntry(entry);
    },
    [navigate]
  );

  const isContentEntry =
    selectedCalendarEntry?.type === 'recording' || selectedCalendarEntry?.type === 'publish';
  const allCalendarEntries = Array.from(entriesByDate.values()).flat();
  const weeklyRecordings = allCalendarEntries.filter(entry => entry.type === 'recording').length;
  const weeklyPosts = allCalendarEntries.filter(entry => entry.type === 'publish').length;

  useEffect(() => {
    if (viewMode === 'agenda' || viewMode === 'timeline') {
      setDayPanelOpen(false);
    }
  }, [viewMode, setDayPanelOpen]);

  const handleViewChange = useCallback(
    (next: CalendarViewMode) => {
      setViewMode(next);
      if (next === 'agenda' || next === 'timeline') {
        setDayPanelOpen(false);
      }
    },
    [setDayPanelOpen]
  );

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
            onSelectEntry={handleSelectEntry}
          />
        </div>

        <BottomSheetModal
          open={isAddAgendaOpen}
          onClose={() => setIsAddAgendaOpen(false)}
          desktopMaxW="max-w-md"
          zIndex="z-[110]"
        >
          <AddAgendaModal
            projetos={state.projetos}
            initialDraft={null}
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
          <PostedVideoComposerSheet
            platforms={state.platforms}
            postingTimes={getPostingTimes(state.preferences)}
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

  const showDayPanel = dayPanelOpen && viewMode !== 'agenda' && viewMode !== 'timeline';

  const handleLayerToggle = (layerId: string) => {
    setActiveLayers(current =>
      current.includes(layerId)
        ? current.filter(layer => layer !== layerId)
        : [...current, layerId],
    );
  };

  const handleQuickCreateSave = (payload: {title: string; date: string; time: string | null}) => {
    if (!payload.title.trim() || !payload.date) return;
    dispatch({
      type: 'ADD_AGENDA_ITEM',
      payload: {
        id: generateUUID(),
        userId: '',
        title: payload.title.trim(),
        date: payload.date,
        time: payload.time,
        tipo: 'Outro',
        projetoId: null,
        createdAt: new Date().toISOString(),
      },
    });
    setQuickCreateDate(null);
  };

  const calendarSidebar = (
    <div className="stack-xl">
      <div className="relative">
        <AppButton
          variant="primary"
          size="sm"
          className="w-full justify-between"
          onClick={() => setCreateMenuOpen(open => !open)}
          rightIcon={<ChevronDown className="h-4 w-4" />}
        >
          Criar
        </AppButton>
        {createMenuOpen ? (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] shadow-[var(--shadow-dropdown)]">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              onClick={() => {
                setCreateMenuOpen(false);
                setQuickCreateDate(selectedDate);
              }}
            >
              <Plus className="h-4 w-4" />
              Evento
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              onClick={() => {
                setCreateMenuOpen(false);
                setIsAddPostedVideoOpen(true);
              }}
            >
              <Radio className="h-4 w-4" />
              Vídeo postado
            </button>
          </div>
        ) : null}
      </div>

      <CalendarMiniMonth
        monthDate={currentMonth}
        selectedDate={selectedDate}
        onSelectDate={date => {
          setSelectedDate(date);
          setCurrentMonth(date);
        }}
        onMonthChange={setCurrentMonth}
      />

      <CalendarLayerChecklist
        title="Minhas camadas"
        items={EDITORIAL_LAYER_ITEMS}
        activeIds={activeLayers}
        onToggle={handleLayerToggle}
      />

      <button
        type="button"
        onClick={() => navigate('/configuracoes/horarios')}
        className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-1 py-1.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        <Clock className="h-4 w-4" />
        Horários de postagem
      </button>
    </div>
  );

  return (
    <PageLayout
      contentWidth="full"
      contentStack="none"
      className="min-h-full"
      contentClassName="!px-0 !py-0"
      header={
        <DesktopPageHeader
          section="Produção"
          title="Calendário"
          meta="Roteiros, eventos e projetos na linha do tempo."
        >
          <CalendarModeSwitch />
        </DesktopPageHeader>
      }
    >
      <CalendarDesktopShell
        sidebar={calendarSidebar}
        sidebarOpen={sidebarOpen}
        onSidebarOpenChange={setSidebarOpen}
        toolbar={
          <CalendarPeriodNav
            anchorDate={currentMonth}
            onAnchorDateChange={date => {
              setCurrentMonth(date);
              if (viewMode === 'week') setSelectedDate(date);
            }}
            viewMode={viewMode}
            onViewModeChange={handleViewChange}
            weekViewId="week"
            views={[
              {id: 'month', label: 'Mês'},
              {id: 'week', label: 'Semana'},
              {id: 'agenda', label: 'Agenda'},
              {id: 'timeline', label: 'Timeline'},
            ]}
          />
        }
        toolbarExtra={
          <>
            {searchExpanded ? (
              <input
                type="text"
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Buscar"
                className="h-9 w-36 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 text-sm"
                autoFocus
                onBlur={() => {
                  if (!searchTerm.trim()) setSearchExpanded(false);
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setSearchExpanded(true)}
                className="flex min-h-9 min-w-9 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                aria-label="Buscar"
              >
                <Search className="h-4 w-4" />
              </button>
            )}
            <select
              value={sortValue}
              onChange={event => setSortValue(event.target.value)}
              className="hidden h-9 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 text-sm lg:block"
              aria-label="Ordenar"
            >
              <option value="proximos">Próximos</option>
              <option value="titulo:asc">Título A-Z</option>
              <option value="tipo:asc">Tipo</option>
            </select>
            {!showDayPanel ? (
              <AppButton
                variant="ghost"
                size="sm"
                onClick={() => setDayPanelOpen(true)}
                leftIcon={<PanelRight className="h-3.5 w-3.5" />}
                className="hidden xl:inline-flex"
              >
                Dia ({selectedEntries.length})
              </AppButton>
            ) : null}
          </>
        }
        rightPanel={
          showDayPanel ? (
            <CalendarDayPanel
              selectedDate={selectedDate}
              entries={selectedEntries}
              onClose={() => setDayPanelOpen(false)}
              onSelectEntry={handleSelectEntry}
              onAddAgenda={() => setQuickCreateDate(selectedDate)}
            />
          ) : undefined
        }
      >
        <div className="stack-md p-3 md:p-4">
          {viewMode === 'agenda' ? (
            <CalendarAgendaListView
              entriesByDate={entriesByDate}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onSelectEntry={handleSelectEntry}
            />
          ) : viewMode === 'week' ? (
            <CalendarWeekView
              weekDate={currentMonth}
              selectedDate={selectedDate}
              entriesByDate={entriesByDate}
              onSelectDate={setSelectedDate}
              onSelectEntry={handleSelectEntry}
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
              onSelectEntry={handleSelectEntry}
              onEmptyDayClick={date => setQuickCreateDate(date)}
              onShowMore={() => setDayPanelOpen(true)}
            />
          )}

          <CalendarInsightCards
            recordings={weeklyRecordings}
            posts={weeklyPosts}
            projects={state.projetos.filter(project => !project.deletedAt).length}
          />
        </div>
      </CalendarDesktopShell>

      {!showDayPanel ? (
        <button
          type="button"
          onClick={() => setDayPanelOpen(true)}
          className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] shadow-[var(--shadow-soft)] hover:bg-[var(--bg-hover)] xl:hidden"
          aria-label="Abrir painel do dia"
        >
          <PanelRight className="h-4 w-4" />
          {format(selectedDate, 'd MMM', {locale: ptBR})} · {selectedEntries.length}
        </button>
      ) : null}

      <CalendarQuickCreatePopover
        open={Boolean(quickCreateDate)}
        anchorDate={quickCreateDate ?? selectedDate}
        onClose={() => setQuickCreateDate(null)}
        onSave={handleQuickCreateSave}
        onMoreOptions={payload => {
          setAgendaDraft(payload);
          setQuickCreateDate(null);
          setIsAddAgendaOpen(true);
        }}
      />

      <BottomSheetModal
        open={isAddAgendaOpen}
        onClose={() => setIsAddAgendaOpen(false)}
        desktopMaxW="max-w-md"
      >
        <AddAgendaModal
          projetos={state.projetos}
          initialDraft={agendaDraft}
          onClose={() => {
            setIsAddAgendaOpen(false);
            setAgendaDraft(null);
          }}
          onSave={item => {
            dispatch({type: 'ADD_AGENDA_ITEM', payload: item});
            setIsAddAgendaOpen(false);
            setAgendaDraft(null);
          }}
        />
      </BottomSheetModal>

      <BottomSheetModal
        open={isAddPostedVideoOpen}
        onClose={() => setIsAddPostedVideoOpen(false)}
        desktopMaxW="max-w-lg"
      >
        <PostedVideoComposerSheet
          platforms={state.platforms}
          postingTimes={getPostingTimes(state.preferences)}
          onClose={() => setIsAddPostedVideoOpen(false)}
          onSave={content => {
            dispatch({type: 'ADD_CONTENT', payload: content});
            setIsAddPostedVideoOpen(false);
          }}
        />
      </BottomSheetModal>

      {isContentEntry ? (
        // Spec: conteudo abre em drawer rapido
        <Drawer
          open={Boolean(selectedCalendarEntry)}
          onClose={() => setSelectedCalendarEntry(null)}
          widthClassName="max-w-xl"
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
        </Drawer>
      ) : (
        // Spec: evento abre em modal
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
      )}
    </PageLayout>
  );
}

const EDITORIAL_LAYER_ITEMS = [
  {id: 'recordings', label: 'Gravações', color: 'var(--accent-orange)', icon: Mic2},
  {id: 'posts', label: 'Postagens', color: 'var(--accent-purple)', icon: Send},
  {id: 'projects', label: 'Projetos', color: 'var(--accent-blue)', icon: BookOpen},
  {id: 'agenda', label: 'Eventos', color: 'var(--accent-green)', icon: CalendarDays},
];

function getEntryLabel(entry: CalendarEntry) {
  return entry.type === 'project'
    ? 'Projeto'
    : entry.type === 'recording'
      ? 'Gravação'
      : entry.type === 'publish'
        ? 'Postagem'
        : 'Evento';
}

function entryPillStyle(entry: CalendarEntry) {
  const useCustomColor = entry.color && (entry.type === 'project' || entry.type === 'agenda');
  return editorialPillStyle(useCustomColor ? entry.color : null, entry.type);
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
              <span className="text-xs font-semibold uppercase text-[var(--text-tertiary)]">
                {format(day, 'EEE', {locale: ptBR})}
              </span>
              <span className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full text-base font-semibold text-[var(--text-primary)]',
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
              <div className="stack-sm">
                {entries.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[var(--border-color)] px-3 py-8 text-center t-meta text-[var(--text-tertiary)]">
                    Livre
                  </div>
                ) : (
                  entries.map(entry => (
                    <CalendarEventPill
                      key={entry.id}
                      label={entry.label}
                      time={entry.time}
                      secondary={getEntryLabel(entry)}
                      variant="expanded"
                      style={entryPillStyle(entry)}
                      onClick={event => {
                        event.stopPropagation();
                        onSelectDate(day);
                        onSelectEntry(entry);
                      }}
                    />
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
          <Text variant="sectionTitle">Agenda editorial</Text>
          <p className="t-meta text-[var(--text-secondary)]">Lista cronologica de operacoes planejadas.</p>
        </div>
        <span className="status-pill">{groupedEntries.reduce((total, [, entries]) => total + entries.length, 0)} eventos</span>
      </div>

      <div className="stack-md">
        {groupedEntries.length === 0 ? (
          <div className="rounded-lg bg-[var(--surface-subtle)] px-4 py-10 text-center text-sm text-[var(--text-secondary)]">
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
                    <p className="text-sm font-semibold capitalize text-[var(--text-primary)]">
                      {format(date, "d 'de' MMMM", {locale: ptBR})}
                    </p>
                    <p className="t-meta capitalize text-[var(--text-secondary)]">{format(date, 'EEEE', {locale: ptBR})}</p>
                  </div>
                  <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                    {entries.length}
                  </span>
                </button>

                <div className="stack-sm">
                  {entries.map(entry => (
                    <CalendarEventPill
                      key={entry.id}
                      label={entry.label}
                      time={entry.time}
                      secondary={[getEntryLabel(entry), entry.secondary].filter(Boolean).join(' · ')}
                      variant="expanded"
                      style={entryPillStyle(entry)}
                      onClick={() => {
                        onSelectDate(date);
                        onSelectEntry(entry);
                      }}
                    />
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
  const [eventsOpen, setEventsOpen] = useState(true);
  const [focusOpen, setFocusOpen] = useState(false);

  return (
    <aside className="sticky top-4 h-fit max-h-[calc(100vh-96px)] overflow-y-auto rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-soft)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <Text variant="sectionTitle">
            {format(selectedDate, "d 'de' MMMM", {locale: ptBR})}
          </Text>
          <p className="t-meta font-medium capitalize text-[var(--text-secondary)]">
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
          <span className="status-pill mb-3" style={editorialPillStyle(null, primaryEntry.type)}>
            {primaryEntry.type === 'project' ? 'Projeto' : primaryEntry.type === 'recording' ? 'Gravação' : primaryEntry.type === 'publish' ? 'Postagem' : 'Evento'}
          </span>
          <Text variant="itemTitle">{primaryEntry.label}</Text>
          <p className="mt-1 t-meta text-[var(--text-secondary)]">{primaryEntry.secondary || 'Detalhe editorial'}</p>
        </button>
      ) : null}

      <div className="rounded-[var(--radius-input)] border border-[var(--border-color)]">
        <button
          type="button"
          onClick={() => setEventsOpen(prev => !prev)}
          className="flex w-full items-center justify-between px-3 py-2 text-left"
        >
          <p className="ds-meta">Eventos do dia</p>
          <span className="text-xs text-[var(--text-tertiary)]">{entries.length}</span>
        </button>
        {eventsOpen ? (
          <div className="stack-sm border-t border-[var(--border-color)] p-2">
            <button type="button" onClick={onAddAgenda} className="text-xs font-semibold text-[var(--accent-blue)]">
              + Adicionar
            </button>
            {entries.length === 0 ? (
              <p className="rounded-[var(--radius-input)] bg-[var(--surface-subtle)] px-3 py-3 text-xs text-[var(--text-secondary)]">
                Nenhuma operacao planejada para este dia.
              </p>
            ) : (
              entries.map(entry => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onSelectEntry(entry)}
                  className={cn(
                    'w-full rounded-[var(--radius-input)] border px-3 py-2 text-left transition-all hover:-translate-y-0.5',
                  )}
                  style={entryPillStyle(entry)}
                >
                  <p className="text-xs font-semibold text-[var(--text-primary)]">{entry.label}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                    {[entry.time, entry.secondary].filter(Boolean).join(' - ') || 'Sem horario'}
                  </p>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-3">
        <div className="rounded-[var(--radius-input)] border border-[var(--border-color)]">
          <button
            type="button"
            onClick={() => setFocusOpen(prev => !prev)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-[var(--accent-purple)]"
          >
            <Target className="h-3.5 w-3.5" />
            Talvez util neste dia
          </button>
          {focusOpen ? (
            <div className="border-t border-[var(--border-color)] p-3">
              <p className="text-xs text-[var(--text-primary)]">Roteiro e um bloco separados para quando fizer sentido</p>
              <div className="mt-2 h-1.5 rounded-full bg-[var(--bg-hover)]">
                <div className="h-full w-[72%] rounded-full bg-[var(--accent-purple)]" />
              </div>
            </div>
          ) : null}
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
    {label: 'Gravacoes', value: recordings, detail: 'agendadas', icon: Mic2, color: 'var(--accent-orange)'},
    {label: 'Postagens', value: posts, detail: 'programadas', icon: Send, color: 'var(--accent-purple)'},
    {label: 'Projetos', value: projects, detail: 'em movimento', icon: BookOpen, color: 'var(--accent-blue)'},
    {label: 'Conflitos', value: 0, detail: 'looks repetidos', icon: Target, color: 'var(--warning)'},
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map(card => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-soft)]">
            <div
              className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg"
              style={{
                backgroundColor: `color-mix(in srgb, ${card.color} 18%, transparent)`,
                color: card.color,
              }}
            >
              <Icon className="h-4 w-4" />
            </div>
            <p className="t-meta font-semibold text-[var(--text-secondary)]">{card.label}</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-2xl font-semibold text-[var(--text-primary)]">{card.value}</span>
              <span className="pb-1 t-meta text-[var(--text-secondary)]">{card.detail}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FieldRow({label, value}: {label: string; value: string}) {
  return (
    <div className="rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-hover)]/50 px-4 py-3">
      <p className="text-xs font-semibold  text-[var(--text-tertiary)] opacity-60">
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
  const navigate = useNavigate();
  const location = useLocation();
  const detailBackState = buildDetailBackState(`${location.pathname}${location.search}`);
  const {state: calendarState} = useAppContext();
  const postingTimes = getPostingTimes(calendarState.preferences);
  const content = entry.contentId ? contents.find(item => item.id === entry.contentId) : null;
  const agendaItem = entry.agendaId ? agendaItems.find(item => item.id === entry.agendaId) : null;
  const projeto = entry.projetoId ? projetos.find(item => item.id === entry.projetoId) : null;
  const plataforma = content?.plataformas.find(item => item.id === entry.plataformaId);
  const activePlatforms = platforms.filter(platform => platform.ativo);
  const platformName = plataforma
    ? platforms.find(platform => platform.id === plataforma.platformId)?.nome || plataforma.platformId
    : '';
  const canEdit = Boolean(content || agendaItem);
  const contentStage = content ? getContentStage(content) : null;
  const canSchedulePosting =
    Boolean(content) &&
    contentStage !== ContentStage.POSTADO &&
    contentStage !== ContentStage.IDEIA;

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

    const platformRecordId = plataforma?.id || generateUUID();
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
        ? 'Gravação'
        : entry.type === 'agenda'
          ? 'Agenda'
          : 'Projeto';

  return (
    <div className="flex max-h-[90vh] flex-col bg-[var(--bg-primary)]">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border-color)] px-6 py-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--text-tertiary)]">
            {subtitle}
          </p>
          <Text variant="sectionTitle" truncate className="mt-1">
            {isEditing ? 'Editar evento' : title}
          </Text>
        </div>
        <button onClick={onClose} className="rounded-full p-2 transition-all hover:bg-[var(--bg-hover)]">
          <Plus className="h-5 w-5 rotate-45 text-[var(--text-tertiary)]" />
        </button>
      </div>

      <div className="flex-1 stack-lg overflow-y-auto p-6">
        {isEditing ? (
          <>
            <label className="block stack-sm">
              <span className="text-xs font-semibold  text-[var(--text-tertiary)] opacity-60">
                Titulo
              </span>
              <input
                autoFocus
                type="text"
                value={title}
                onChange={event => setTitle(event.target.value)}
                className="w-full rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-hover)] px-6 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-blue)]"
              />
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block stack-sm">
                <span className="text-xs font-semibold  text-[var(--text-tertiary)] opacity-60">
                  Data
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={event => setDate(event.target.value)}
                  className="w-full rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-hover)] px-6 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-blue)]"
                />
              </label>

              {entry.type !== 'recording' ? (
                <div className="block stack-sm">
                  <span className="text-xs font-semibold  text-[var(--text-tertiary)] opacity-60">
                    Hora
                  </span>
                  <input
                    type="time"
                    value={time}
                    onChange={event => setTime(event.target.value)}
                    className="w-full rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-hover)] px-6 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-blue)]"
                  />
                  <PostingTimeSuggestions
                    date={date}
                    selectedTime={time}
                    postingTimes={postingTimes}
                    onSelect={setTime}
                    className="pt-1"
                  />
                </div>
              ) : null}
            </div>

            {agendaItem ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {(['Reunião', 'Entrega', 'Publicação', 'Outro'] as AgendaItem['tipo'][]).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAgendaType(type)}
                      className={`rounded-xl border px-3 py-2.5 text-xs font-semibold  transition-all ${
                        agendaType === type
                          ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                          : 'border-[var(--border-color)] text-[var(--text-tertiary)]'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <label className="block stack-sm">
                  <span className="text-xs font-semibold  text-[var(--text-tertiary)] opacity-60">
                    Projeto vinculado
                  </span>
                  <select
                    value={projetoId}
                    onChange={event => setProjetoId(event.target.value)}
                    className="w-full rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-hover)] px-6 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-blue)]"
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
                <label className="block stack-sm">
                  <span className="text-xs font-semibold  text-[var(--text-tertiary)] opacity-60">
                    Rede postada
                  </span>
                  <select
                    value={platformId}
                    onChange={event => setPlatformId(event.target.value)}
                    className="w-full rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-hover)] px-6 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-blue)]"
                  >
                    {activePlatforms.map(platform => (
                      <option key={platform.id} value={platform.id}>
                        {platform.nome}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block stack-sm">
                  <span className="text-xs font-semibold  text-[var(--text-tertiary)] opacity-60">
                    Legenda
                  </span>
                  <textarea
                    value={caption}
                    onChange={event => setCaption(event.target.value)}
                    rows={7}
                    className="w-full resize-none rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-hover)] px-6 py-3.5 text-sm font-medium leading-relaxed text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-blue)]"
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
              className="flex-1 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] py-3 text-xs font-semibold  text-[var(--text-primary)] transition-all hover:bg-[var(--bg-hover)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!title.trim() || !date}
              className="flex-1 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] bg-[var(--text-primary)] py-3 text-xs font-semibold  text-[var(--bg-primary)] transition-all hover:scale-[1.01] disabled:pointer-events-none disabled:opacity-30"
            >
              Salvar
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] py-3 text-xs font-semibold  text-[var(--text-primary)] transition-all hover:bg-[var(--bg-hover)]"
            >
              Fechar
            </button>
            {content ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(buildContentDetailRoute(content.id, 'roteiro'), detailBackState);
                }}
                className="flex-1 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] py-3 text-xs font-semibold  text-[var(--text-primary)] transition-all hover:bg-[var(--bg-hover)]"
              >
                Abrir roteiro
              </button>
            ) : null}
            {canSchedulePosting && content ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(buildContentDetailRoute(content.id, 'publicacao'), detailBackState);
                }}
                className="flex-1 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] bg-[var(--text-primary)] py-3 text-xs font-semibold  text-[var(--bg-primary)] transition-all hover:scale-[1.01]"
              >
                Agendar postagem
              </button>
            ) : canEdit ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex-1 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] bg-[var(--text-primary)] py-3 text-xs font-semibold  text-[var(--bg-primary)] transition-all hover:scale-[1.01]"
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

function AddAgendaModal({
  projetos,
  initialDraft,
  onSave,
  onClose,
}: {
  projetos: Projeto[];
  initialDraft?: {title: string; date: string; time: string | null} | null;
  onSave: (item: AgendaItem) => void;
  onClose: () => void;
}) {
  const {state: agendaState} = useAppContext();
  const agendaPostingTimes = getPostingTimes(agendaState.preferences);
  const [title, setTitle] = useState(initialDraft?.title ?? '');
  const [date, setDate] = useState(initialDraft?.date ?? format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(initialDraft?.time ?? '');

  useEffect(() => {
    if (!initialDraft) return;
    setTitle(initialDraft.title);
    setDate(initialDraft.date);
    setTime(initialDraft.time ?? '');
  }, [initialDraft]);
  const [agendaType, setAgendaType] = useState<AgendaItem['tipo']>('Reunião');
  const [projetoId, setProjetoId] = useState('');

  const handleSave = () => {
    if (!title.trim() || !date) return;

    onSave({
      id: generateUUID(),
      userId: '',
      title: title.trim(),
      date,
      time: time || null,
      tipo: agendaType,
      projetoId: projetoId || null,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <>
      <OverlayHeader
        title="Novo Evento"
        subtitle="Agenda editorial"
        onClose={onClose}
      />

      <OverlayBody className="stack-xl py-6">
        <div className="stack-sm">
          <label className="text-xs font-semibold  text-[var(--text-tertiary)] opacity-60">
            Titulo do evento
          </label>
          <input
            autoFocus
            type="text"
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="Ex: reuniao, entrega, live..."
            className="w-full rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-hover)] px-6 py-3.5 text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:ring-2 focus:ring-[var(--accent-blue)]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="stack-sm">
            <label className="text-xs font-semibold  text-[var(--text-tertiary)] opacity-60">
              Data
            </label>
            <input
              type="date"
              value={date}
              onChange={event => setDate(event.target.value)}
              className="w-full rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-hover)] px-6 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-blue)]"
            />
          </div>

          <div className="stack-sm">
            <label className="text-xs font-semibold  text-[var(--text-tertiary)] opacity-60">
              Hora
            </label>
            <input
              type="time"
              value={time}
              onChange={event => setTime(event.target.value)}
              className="w-full rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-hover)] px-6 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-blue)]"
            />
            <PostingTimeSuggestions
              date={date}
              selectedTime={time}
              postingTimes={agendaPostingTimes}
              onSelect={setTime}
            />
          </div>
        </div>

        <div className="stack-sm">
          <label className="text-xs font-semibold  text-[var(--text-tertiary)] opacity-60">
            Tipo
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['Reunião', 'Entrega', 'Publicação', 'Outro'] as AgendaItem['tipo'][]).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setAgendaType(type)}
                className={`rounded-xl border px-3 py-2.5 text-xs font-semibold  transition-all ${
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

        <div className="stack-sm">
          <label className="text-xs font-semibold  text-[var(--text-tertiary)] opacity-60">
            Projeto vinculado
          </label>
          <select
            value={projetoId}
            onChange={event => setProjetoId(event.target.value)}
            className="w-full rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-hover)] px-6 py-3.5 text-sm font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-blue)]"
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
      </OverlayBody>

      <OverlayFooter>
        <button
          onClick={handleSave}
          disabled={!title.trim() || !date}
          className="w-full rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] bg-[var(--text-primary)] py-4 text-xs font-semibold  text-[var(--bg-primary)] shadow-lg transition-all hover:scale-[1.01] disabled:pointer-events-none disabled:opacity-30"
        >
          Adicionar evento
        </button>
      </OverlayFooter>
    </>
  );
}
