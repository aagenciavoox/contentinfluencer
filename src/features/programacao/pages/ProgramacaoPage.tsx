import {useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  getDay,
  isSameDay,
  parseISO,
  startOfWeek,
} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {AlertTriangle, ArrowUpRight, Briefcase, ChevronDown, ChevronUp, Eye, GripVertical, Info, Lightbulb, Plus, Search, Send, X} from 'lucide-react';
import {BottomSheetModal} from '../../../components/feedback/modals/BottomSheetModal';
import {ConfirmModal} from '../../../components/feedback/modals/ConfirmModal';
import {Text} from '../../../components/ui/Text';
import {Badge} from '../../../components/ui/Badge';
import {AppButton} from '../../../components/ui/AppButton';
import {Surface} from '../../../components/ui/Surface';
import {Drawer} from '../../../components/overlays/Drawer';
import {useAppContext} from '../../../context/AppContext';
import {PageLayout} from '../../../layouts/page/PageLayout';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import type {Content} from '../../../lib/database';
import {GLOSSARY, type ConfirmState} from '../../../lib/uiCopy';
import {cn, htmlToReadableText} from '../../../lib/utils';
import {getStatusCalendarClass, getStatusColorVar} from '../../../lib/statusClasses';
import {diffViolations, previewScheduleViolations, validateWeeklyContent, type Violation} from '../../../utils/pilarRhythm';
import {getPostingTimes} from '../../settings/lib/postingTimes';
import {recommendDailyAction} from '../../recommendations/recommendDailyAction';
import type {Weekday} from '../../settings/lib/postingTimes';
import {getTimesForDay} from '../../settings/lib/postingTimes';
import {CONTENT_STATUS, DISPLAY_STATUS} from '../../contents/lib/contentPipeline';
import {createContentDraft} from '../../contents/lib/createContentDraft';
import {PostedVideoComposerSheet} from '../../contents/components/PostedVideoComposerSheet';
import {
  applyScheduleToContent,
  applyUnscheduleToContent,
  buildProgramacaoCards,
  buildProjetoPublicacaoByDate,
  canDragCard,
  getPlatformColor,
  isBacklogCard,
  isCardLocked,
  isIdeiaCard,
  isPostadoCard,
  promoteIdeiaToRoteiro,
  type ProgramacaoCard,
  type ProjetoPublicacaoMarker,
} from '../lib/programacao';
import {buildContentDetailRoute} from '../../contents/lib/contentDetailRoute';
import {
  CalendarDesktopShell,
  CalendarLayerChecklist,
  CalendarMiniMonth,
  CalendarMonthGrid,
  CalendarPeriodNav,
} from '../../../components/calendar';

type ProgramacaoView = 'week' | 'month';

const DRAG_MIME = 'application/x-programacao-card';
const BACKLOG_DROP_KEY = '__backlog__';

type PendingSchedule = {
  card: ProgramacaoCard;
  dayKey: string;
  time: string | null;
  openTimePicker?: boolean;
};

function evaluateScheduleViolations(
  contents: Content[],
  pilares: Parameters<typeof validateWeeklyContent>[2],
  platforms: Parameters<typeof validateWeeklyContent>[3],
  card: ProgramacaoCard,
  dayKey: string,
  time: string | null,
): Violation[] {
  const content = contents.find(item => item.id === card.contentId);
  if (!content) return [];

  const timeToUse = time ?? (card.date ? card.time : null);
  const weekStart = startOfWeek(parseISO(dayKey), {weekStartsOn: 1});
  const before = validateWeeklyContent(contents, weekStart, pilares, platforms);
  const updated = applyScheduleToContent(content, card.platformId, dayKey, timeToUse);
  const nextContents = contents.map(item => (item.id === card.contentId ? updated : item));
  const after = previewScheduleViolations(nextContents, dayKey, pilares, platforms);
  return diffViolations(before, after);
}

function dateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function platformInitials(platformName: string): string {
  return platformName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || '?';
}

export function ProgramacaoPage() {
  const {state, dispatch} = useAppContext();
  const routerNavigate = useNavigate();
  const [viewMode, setViewMode] = useState<ProgramacaoView>('month');
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [disabledPlatforms, setDisabledPlatforms] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedBacklogKey, setSelectedBacklogKey] = useState<string | null>(null);
  const [previewCard, setPreviewCard] = useState<ProgramacaoCard | null>(null);
  const [timePickerCard, setTimePickerCard] = useState<ProgramacaoCard | null>(null);
  const [timePickerViolations, setTimePickerViolations] = useState<Violation[]>([]);
  const [pendingSchedule, setPendingSchedule] = useState<PendingSchedule | null>(null);
  const [draggingCardKey, setDraggingCardKey] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [ideaComposerDay, setIdeaComposerDay] = useState<string | null>(null);
  const [postedComposerDay, setPostedComposerDay] = useState<string | null>(null);
  const [postedEditContent, setPostedEditContent] = useState<Content | null>(null);
  const [ideaActionCard, setIdeaActionCard] = useState<ProgramacaoCard | null>(null);
  const [promoteConfirm, setPromoteConfirm] = useState<ConfirmState | null>(null);

  const postingTimes = useMemo(() => getPostingTimes(state.preferences), [state.preferences]);

  const allCards = useMemo(
    () => buildProgramacaoCards(state.contents, state.platforms),
    [state.contents, state.platforms],
  );

  const platformNames = useMemo(() => {
    const names = new Set<string>();
    state.platforms.filter(platform => platform.ativo).forEach(platform => names.add(platform.nome));
    allCards.forEach(card => names.add(card.platformName));
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [allCards, state.platforms]);

  const cards = useMemo(() => {
    if (disabledPlatforms.length === 0) return allCards;
    return allCards.filter(card => !disabledPlatforms.includes(card.platformName));
  }, [allCards, disabledPlatforms]);

  const dailyRecommendation = useMemo(
    () =>
      recommendDailyAction({
        pilares: state.pilares,
        series: state.series,
        contents: state.contents,
      }),
    [state.contents, state.pilares, state.series],
  );

  const backlogCards = useMemo(() => {
    const base = cards.filter(isBacklogCard);
    const priorityIds = new Set(dailyRecommendation?.contentIds ?? []);
    if (priorityIds.size === 0) return base;
    return [...base].sort((left, right) => {
      const leftPriority = priorityIds.has(left.contentId) ? 0 : 1;
      const rightPriority = priorityIds.has(right.contentId) ? 0 : 1;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      return left.title.localeCompare(right.title, 'pt-BR');
    });
  }, [cards, dailyRecommendation]);

  const scheduledByDate = useMemo(() => {
    const map = new Map<string, ProgramacaoCard[]>();
    cards.forEach(card => {
      if (!card.date) return;
      const current = map.get(card.date) || [];
      current.push(card);
      map.set(card.date, current);
    });
    map.forEach(list =>
      list.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99') || a.title.localeCompare(b.title, 'pt-BR')),
    );
    return map;
  }, [cards]);

  const projetoPublicacaoByDate = useMemo(
    () => buildProjetoPublicacaoByDate(state.agendaItems, state.projetos),
    [state.agendaItems, state.projetos],
  );

  const weekStart = startOfWeek(anchorDate, {locale: ptBR});
  const weekDays = eachDayOfInterval({start: weekStart, end: endOfWeek(anchorDate, {locale: ptBR})});

  const weekViolations = useMemo(
    () => validateWeeklyContent(state.contents, weekStart, state.pilares, state.platforms),
    [state.contents, state.pilares, state.platforms, weekStart],
  );

  const draggingCard = draggingCardKey ? cards.find(item => item.key === draggingCardKey) ?? null : null;

  const hasDayViolationWarning = (dayKey: string) => {
    if (!draggingCard) return false;
    const time = draggingCard.date ? draggingCard.time : null;
    return evaluateScheduleViolations(
      state.contents,
      state.pilares,
      state.platforms,
      draggingCard,
      dayKey,
      time,
    ).some(
      violation => violation.type === 'warning',
    );
  };

  const commitSchedule = (
    card: ProgramacaoCard,
    dayKey: string,
    time: string | null,
    infoViolations: Violation[] = [],
    opts?: {openTimePicker?: boolean},
  ) => {
    const content = state.contents.find(item => item.id === card.contentId);
    if (!content || isCardLocked(card)) return;

    const timeToUse = time ?? (card.date ? card.time : null);
    dispatch({
      type: 'UPDATE_CONTENT',
      payload: applyScheduleToContent(content, card.platformId, dayKey, timeToUse),
    });
    setSelectedBacklogKey(null);

    const shouldOpenPicker = opts?.openTimePicker ?? !card.date;
    if (shouldOpenPicker) {
      setTimePickerViolations(infoViolations);
      setTimePickerCard({...card, date: dayKey, time: null});
    } else {
      setTimePickerViolations([]);
      setTimePickerCard(null);
    }
  };

  const requestSchedule = (
    card: ProgramacaoCard,
    dayKey: string,
    time: string | null = null,
    opts?: {openTimePicker?: boolean},
  ) => {
    const content = state.contents.find(item => item.id === card.contentId);
    if (!content || isCardLocked(card)) return;

    const effectiveTime = time ?? (card.date ? card.time : null);
    const newViolations = evaluateScheduleViolations(
      state.contents,
      state.pilares,
      state.platforms,
      card,
      dayKey,
      effectiveTime,
    );
    const warnings = newViolations.filter(violation => violation.type === 'warning');
    const infos = newViolations.filter(violation => violation.type === 'info');

    if (warnings.length > 0) {
      setPendingSchedule({card, dayKey, time: effectiveTime, openTimePicker: opts?.openTimePicker});
      return;
    }

    commitSchedule(card, dayKey, effectiveTime, infos, opts);
  };

  const scheduleCard = (card: ProgramacaoCard, dayKey: string) => {
    requestSchedule(card, dayKey);
  };

  const applyTime = (card: ProgramacaoCard, time: string | null) => {
    if (!card.date) return;
    requestSchedule(card, card.date, time, {openTimePicker: false});
  };

  const confirmPendingSchedule = () => {
    if (!pendingSchedule) return;
    commitSchedule(
      pendingSchedule.card,
      pendingSchedule.dayKey,
      pendingSchedule.time,
      [],
      {openTimePicker: pendingSchedule.openTimePicker},
    );
    setPendingSchedule(null);
  };

  const openTimePicker = (card: ProgramacaoCard) => {
    if (isCardLocked(card) || isIdeiaCard(card) || !card.date) return;
    setTimePickerCard(card);
  };

  const handleCardClick = (card: ProgramacaoCard) => {
    if (isIdeiaCard(card)) {
      setIdeaActionCard(card);
      return;
    }
    if (isPostadoCard(card)) {
      const content = state.contents.find(item => item.id === card.contentId);
      if (content) {
        setPostedEditContent(content);
        setPostedComposerDay(card.date ?? format(new Date(), 'yyyy-MM-dd'));
      }
      return;
    }
    if (isCardLocked(card)) {
      setPreviewCard(card);
      return;
    }
    openTimePicker(card);
  };

  const handleCreateIdea = (dayKey: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const draft = createContentDraft({
      title: trimmed,
      status: CONTENT_STATUS.IDEIA,
    });
    dispatch({
      type: 'ADD_CONTENT',
      payload: applyScheduleToContent(draft, null, dayKey, null),
    });
    setIdeaComposerDay(null);
  };

  const handleSavePosted = async (content: Content, options?: {keepOpen?: boolean}) => {
    if (postedEditContent) {
      await dispatch({type: 'UPDATE_CONTENT', payload: content});
    } else {
      await dispatch({type: 'ADD_CONTENT', payload: content});
    }
    if (!options?.keepOpen) {
      setPostedComposerDay(null);
      setPostedEditContent(null);
    }
  };

  const openPostedComposer = (dayKey: string) => {
    setPostedEditContent(null);
    setPostedComposerDay(dayKey);
  };

  const commitPromoteIdeia = (card: ProgramacaoCard) => {
    const content = state.contents.find(item => item.id === card.contentId);
    if (!content || !isIdeiaCard(card)) return;
    dispatch({type: 'UPDATE_CONTENT', payload: promoteIdeiaToRoteiro(content)});
    setIdeaActionCard(null);
    setPromoteConfirm(null);
  };

  const requestPromoteIdeia = (card: ProgramacaoCard) => {
    setPromoteConfirm({
      message: 'Transformar esta ideia em roteiro? A data na grade é mantida.',
      confirmLabel: 'Promover para roteiro',
      cancelLabel: 'Manter como ideia',
      onConfirm: () => commitPromoteIdeia(card),
    });
  };

  const openProjetoPublicacao = (marker: ProjetoPublicacaoMarker) => {
    routerNavigate(`/projetos/${marker.projetoId}`);
  };

  const handleDragStart = (cardKey: string) => setDraggingCardKey(cardKey);
  const handleDragEnd = () => {
    setDraggingCardKey(null);
    setDragOverDay(null);
  };

  const unscheduleCard = (card: ProgramacaoCard) => {
    const content = state.contents.find(item => item.id === card.contentId);
    if (!content || isCardLocked(card) || !card.date) return;
    dispatch({type: 'UPDATE_CONTENT', payload: applyUnscheduleToContent(content, card.platformId)});
  };

  const handleBacklogDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOverDay(null);
    const key = event.dataTransfer.getData(DRAG_MIME) || event.dataTransfer.getData('text/plain');
    const card = cards.find(item => item.key === key);
    if (card && isIdeiaCard(card)) return;
    if (card) unscheduleCard(card);
  };

  const handleDrop = (event: React.DragEvent, dayKey: string) => {
    event.preventDefault();
    setDragOverDay(null);
    const key = event.dataTransfer.getData(DRAG_MIME) || event.dataTransfer.getData('text/plain');
    const card = cards.find(item => item.key === key);
    if (card) scheduleCard(card, dayKey);
  };

  const handleDayClick = (dayKey: string) => {
    if (!selectedBacklogKey) return;
    const card = backlogCards.find(item => item.key === selectedBacklogKey);
    if (card) scheduleCard(card, dayKey);
  };

  const periodControls = (
    <CalendarPeriodNav
      anchorDate={anchorDate}
      onAnchorDateChange={setAnchorDate}
      viewMode={viewMode}
      onViewModeChange={mode => setViewMode(mode as ProgramacaoView)}
      weekViewId="week"
      weekStartsOn={1}
      views={[
        {id: 'week', label: 'Semana'},
        {id: 'month', label: 'Mês'},
      ]}
    />
  );

  const platformChecklistItems = platformNames.map(name => ({
    id: name,
    label: name,
    color: getPlatformColor(name).dot,
  }));

  const activePlatformIds = platformNames.filter(name => !disabledPlatforms.includes(name));

  const handlePlatformToggle = (id: string) => {
    if (id === 'all') {
      setDisabledPlatforms([]);
      return;
    }
    setDisabledPlatforms(current =>
      current.includes(id) ? current.filter(name => name !== id) : [...current, id],
    );
  };

  const programacaoSidebar = (
    <div className="stack-xl">
      <CalendarMiniMonth
        monthDate={anchorDate}
        selectedDate={anchorDate}
        onSelectDate={setAnchorDate}
        onMonthChange={setAnchorDate}
        weekStartsOn={1}
      />

      {platformChecklistItems.length > 0 ? (
        <CalendarLayerChecklist
          title="Plataformas"
          items={platformChecklistItems}
          activeIds={activePlatformIds}
          onToggle={handlePlatformToggle}
        />
      ) : null}

      <ProgramacaoStatusLegend compact />
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
          title={GLOSSARY.gradePostagem}
          meta="Arraste um vídeo pronto para um dia, ou toque no vídeo e depois no dia."
        />
      }
      mobileToolbar={periodControls}
    >
      <CalendarDesktopShell
        sidebar={programacaoSidebar}
        sidebarOpen={sidebarOpen}
        onSidebarOpenChange={setSidebarOpen}
        toolbar={periodControls}
      >
        <div className="stack-md p-3 md:p-4">
          {viewMode === 'week' && weekViolations.length > 0 ? (
            <PilarRhythmStrip violations={weekViolations} />
          ) : null}

          <Surface variant="outlined" padding="none" className="overflow-hidden">
            <BacklogPanel
              cards={backlogCards}
              selectedKey={selectedBacklogKey}
              isDropTarget={dragOverDay === BACKLOG_DROP_KEY}
              onSelect={key => setSelectedBacklogKey(current => (current === key ? null : key))}
              onPreview={setPreviewCard}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={event => {
                event.preventDefault();
                setDragOverDay(BACKLOG_DROP_KEY);
              }}
              onDragLeave={() => setDragOverDay(current => (current === BACKLOG_DROP_KEY ? null : current))}
              onDrop={handleBacklogDrop}
            />

            <div className="border-t border-[var(--border-color)] bg-[var(--bg-primary)] p-3 md:p-4">
              {viewMode === 'week' ? (
                <div className="grid grid-cols-7 gap-1.5 max-md:flex max-md:gap-2 max-md:overflow-x-auto max-md:pb-1">
                  {weekDays.map(day => {
                    const key = dateKey(day);
                    const dayCards = sortDayCards(scheduledByDate.get(key) || []);
                    const projetoMarkers = projetoPublicacaoByDate.get(key) || [];
                    const times = getTimesForDay(postingTimes, getDay(day) as Weekday);
                    const usedTimes = dayCards.map(card => card.time).filter(Boolean) as string[];
                    return (
                      <DayColumn
                        key={key}
                        day={day}
                        dayKey={key}
                        cards={dayCards}
                        projetoMarkers={projetoMarkers}
                        times={times}
                        usedTimes={usedTimes}
                        isToday={isSameDay(day, new Date())}
                        isDropTarget={dragOverDay === key}
                        hasViolationWarning={dragOverDay === key && hasDayViolationWarning(key)}
                        canReceive={Boolean(selectedBacklogKey)}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragOver={event => {
                          event.preventDefault();
                          setDragOverDay(key);
                        }}
                        onDragLeave={() => setDragOverDay(current => (current === key ? null : current))}
                        onDrop={event => handleDrop(event, key)}
                        onClick={() => handleDayClick(key)}
                        onPreview={setPreviewCard}
                        onCardClick={handleCardClick}
                        onAddIdea={setIdeaComposerDay}
                        onRegisterPosted={openPostedComposer}
                        onOpenProjetoPublicacao={openProjetoPublicacao}
                      />
                    );
                  })}
                </div>
              ) : (
                <MonthGrid
                  anchorDate={anchorDate}
                  scheduledByDate={scheduledByDate}
                  projetoPublicacaoByDate={projetoPublicacaoByDate}
                  dragOverDay={dragOverDay}
                  hasSelection={Boolean(selectedBacklogKey)}
                  onDragOverDay={setDragOverDay}
                  hasDayViolationWarning={hasDayViolationWarning}
                  onDrop={handleDrop}
                  onDayClick={handleDayClick}
                  onPreview={setPreviewCard}
                  onCardClick={handleCardClick}
                  onAddIdea={setIdeaComposerDay}
                  onRegisterPosted={openPostedComposer}
                  onOpenProjetoPublicacao={openProjetoPublicacao}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              )}
            </div>
          </Surface>
        </div>
      </CalendarDesktopShell>

      {/* Drawer de visualização rápida (somente leitura) */}
      <Drawer open={Boolean(previewCard)} onClose={() => setPreviewCard(null)} widthClassName="max-w-xl">
        {previewCard ? (
          <div className="flex h-full flex-col bg-[var(--bg-elevated)]">
            <div className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)] px-6 py-3">
              <Text variant="eyebrow">Detalhe do conteúdo</Text>
            </div>
            <div className="flex-1 overflow-y-auto">
          <CardPreview
            card={previewCard}
            content={state.contents.find(item => item.id === previewCard.contentId) || null}
            onClose={() => setPreviewCard(null)}
            onOpen={() => {
              const id = previewCard.contentId;
              setPreviewCard(null);
              if (id) routerNavigate(buildContentDetailRoute(id, 'roteiro'));
            }}
          />
            </div>
          </div>
        ) : null}
      </Drawer>

      <ConfirmModal
        open={Boolean(promoteConfirm)}
        message={promoteConfirm?.message ?? ''}
        confirmLabel={promoteConfirm?.confirmLabel ?? 'Confirmar'}
        cancelLabel={promoteConfirm?.cancelLabel ?? 'Cancelar'}
        onConfirm={() => promoteConfirm?.onConfirm()}
        onCancel={() => setPromoteConfirm(null)}
      />

      <ConfirmModal
        open={Boolean(pendingSchedule)}
        message={
          pendingSchedule
            ? evaluateScheduleViolations(
                state.contents,
                state.pilares,
                state.platforms,
                pendingSchedule.card,
                pendingSchedule.dayKey,
                pendingSchedule.time,
              )
                .filter(violation => violation.type === 'warning')
                .map(violation => violation.message)
                .join('\n')
            : ''
        }
        confirmLabel="Agendar mesmo assim"
        cancelLabel="Cancelar"
        onConfirm={confirmPendingSchedule}
        onCancel={() => setPendingSchedule(null)}
      />

      {/* Escolha de horário (cadastrados ou livre) */}
      <BottomSheetModal
        open={Boolean(timePickerCard)}
        onClose={() => {
          setTimePickerCard(null);
          setTimePickerViolations([]);
        }}
        desktopMaxW="max-w-sm"
      >
        {timePickerCard ? (
          <TimePickerSheet
            card={timePickerCard}
            violations={timePickerViolations}
            usedTimes={(scheduledByDate.get(timePickerCard.date || '') || [])
              .filter(item => item.key !== timePickerCard.key)
              .map(item => item.time)
              .filter((time): time is string => Boolean(time))}
            configuredTimes={
              timePickerCard.date
                ? getTimesForDay(postingTimes, getDay(new Date(`${timePickerCard.date}T12:00:00`)) as Weekday)
                : []
            }
            onSelect={time => applyTime(timePickerCard, time)}
            onClose={() => {
              setTimePickerCard(null);
              setTimePickerViolations([]);
            }}
          />
        ) : null}
      </BottomSheetModal>

      <BottomSheetModal
        open={Boolean(ideaComposerDay)}
        onClose={() => setIdeaComposerDay(null)}
        desktopMaxW="max-w-sm"
      >
        {ideaComposerDay ? (
          <IdeaComposerSheet
            dayKey={ideaComposerDay}
            onCreate={title => handleCreateIdea(ideaComposerDay, title)}
            onClose={() => setIdeaComposerDay(null)}
          />
        ) : null}
      </BottomSheetModal>

      <BottomSheetModal
        open={Boolean(postedComposerDay)}
        onClose={() => {
          setPostedComposerDay(null);
          setPostedEditContent(null);
        }}
        desktopMaxW="max-w-lg"
      >
        {postedComposerDay ? (
          <PostedVideoComposerSheet
            initialDate={postedComposerDay}
            initialContent={postedEditContent}
            platforms={state.platforms}
            postingTimes={postingTimes}
            onSave={(content, options) => handleSavePosted(content, options)}
            onClose={() => {
              setPostedComposerDay(null);
              setPostedEditContent(null);
            }}
          />
        ) : null}
      </BottomSheetModal>

      <BottomSheetModal
        open={Boolean(ideaActionCard)}
        onClose={() => setIdeaActionCard(null)}
        desktopMaxW="max-w-sm"
      >
        {ideaActionCard ? (
          <IdeaActionSheet
            card={ideaActionCard}
            onPromote={() => requestPromoteIdeia(ideaActionCard)}
            onPreview={() => {
              setPreviewCard(ideaActionCard);
              setIdeaActionCard(null);
            }}
            onOpen={() => {
              routerNavigate(buildContentDetailRoute(ideaActionCard.contentId, 'roteiro'));
              setIdeaActionCard(null);
            }}
            onClose={() => setIdeaActionCard(null)}
          />
        ) : null}
      </BottomSheetModal>
    </PageLayout>
  );
}

interface TimePickerSheetProps {
  card: ProgramacaoCard;
  configuredTimes: string[];
  usedTimes: string[];
  violations?: Violation[];
  onSelect: (time: string | null) => void;
  onClose: () => void;
}

function TimePickerSheet({card, configuredTimes, usedTimes, violations = [], onSelect, onClose}: TimePickerSheetProps) {
  const [customTime, setCustomTime] = useState(card.time ?? '');
  const color = getPlatformColor(card.platformName);

  return (
    <div className="stack-lg p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-secondary)]">
            Horário de postagem
          </p>
          <p className="mt-1 flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
            <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full text-2xs font-bold text-white" style={{backgroundColor: color.dot}}>
              {platformInitials(card.platformName)}
            </span>
            <span className="truncate">{card.title}</span>
          </p>
          {card.date ? (
            <p className="mt-0.5 text-sm capitalize text-[var(--text-tertiary)]">
              {format(new Date(`${card.date}T12:00:00`), "EEEE, d 'de' MMMM", {locale: ptBR})}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-md text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {violations.length > 0 ? <PilarRhythmStrip violations={violations} compact /> : null}

      {configuredTimes.length > 0 ? (
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">Horários cadastrados para esse dia</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {configuredTimes.map(time => {
              const used = usedTimes.includes(time);
              const selected = card.time === time;
              return (
                <button
                  key={time}
                  type="button"
                  onClick={() => onSelect(time)}
                  className={cn(
                    'min-h-10 rounded-lg border px-3 py-1.5 text-sm font-semibold tabular-nums transition-all',
                    selected
                      ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                      : used
                        ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-400'
                        : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]',
                  )}
                  title={used ? `${time} — já tem post nesse horário` : time}
                >
                  {time}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--text-tertiary)]">Nenhum horário cadastrado para esse dia da semana.</p>
      )}

      <div>
        <p className="text-sm font-medium text-[var(--text-secondary)]">Ou escolha outro horário</p>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="time"
            value={customTime}
            onChange={event => setCustomTime(event.target.value)}
            className="min-h-11 flex-1 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)]"
          />
          <button
            type="button"
            disabled={!customTime}
            onClick={() => onSelect(customTime)}
            className="min-h-11 rounded-[var(--radius-input)] bg-[var(--text-primary)] px-4 py-2 text-sm font-semibold text-[var(--bg-primary)] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Usar
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSelect(null)}
        className="min-h-11 w-full rounded-[var(--radius-input)] border border-dashed border-[var(--border-color)] px-3 py-2 text-sm font-semibold text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
      >
        Deixar sem horário por enquanto
      </button>
    </div>
  );
}

function ProgramacaoStatusLegend({compact = false}: {compact?: boolean}) {
  const items = [
    {label: CONTENT_STATUS.IDEIA, status: CONTENT_STATUS.IDEIA},
    {label: CONTENT_STATUS.ROTEIRO, status: CONTENT_STATUS.ROTEIRO},
    {label: CONTENT_STATUS.PRODUCAO, status: CONTENT_STATUS.PRODUCAO},
    {label: DISPLAY_STATUS.PROGRAMADO, status: DISPLAY_STATUS.PROGRAMADO},
    {label: CONTENT_STATUS.POSTADO, status: CONTENT_STATUS.POSTADO},
  ];

  return (
    <div className={cn('stack-sm', compact && 'space-y-1.5')}>
      {!compact ? (
        <Text variant="label" className="text-[var(--text-secondary)]">
          Legenda de status
        </Text>
      ) : null}
      <div className={cn('flex flex-wrap gap-1.5', compact && 'flex-col items-start gap-1')}>
        {items.map(item => (
          <span
            key={item.label}
            className={cn(
              'inline-flex min-h-6 items-center gap-1.5 rounded-[var(--radius-sm)] border px-2 text-2xs font-semibold',
              getStatusCalendarClass(item.status),
            )}
          >
            <span className="h-2 w-2 rounded-full" style={{backgroundColor: getStatusColorVar(item.status)}} />
            {item.label}
          </span>
        ))}
        <span className="inline-flex min-h-6 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-color)] bg-[var(--bg-hover)] px-2 text-2xs font-semibold text-[var(--text-tertiary)]">
          <Briefcase className="h-2.5 w-2.5 opacity-70" />
          Publi de projeto
        </span>
      </div>
    </div>
  );
}

interface IdeaComposerSheetProps {
  dayKey: string;
  onCreate: (title: string) => void;
  onClose: () => void;
}

function IdeaComposerSheet({dayKey, onCreate, onClose}: IdeaComposerSheetProps) {
  const [title, setTitle] = useState('');

  return (
    <div className="stack-lg p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-secondary)]">Nova ideia na grade</p>
          <p className="mt-1 text-base font-semibold capitalize text-[var(--text-primary)]">
            {format(new Date(`${dayKey}T12:00:00`), "EEEE, d 'de' MMMM", {locale: ptBR})}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-md text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-sm text-[var(--text-tertiary)]">
        A ideia fica no dia escolhido. Depois você pode promover para roteiro ou mantê-la só como referência.
      </p>

      <div>
        <label className="text-sm font-medium text-[var(--text-secondary)]">Título da ideia</label>
        <input
          autoFocus
          type="text"
          value={title}
          onChange={event => setTitle(event.target.value)}
          placeholder="Ex: 3 sinais de que..."
          className="mt-2 min-h-11 w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-blue)]"
          onKeyDown={event => {
            if (event.key === 'Enter' && title.trim()) onCreate(title);
          }}
        />
      </div>

      <AppButton
        variant="primary"
        fullWidth
        disabled={!title.trim()}
        leftIcon={<Lightbulb className="h-4 w-4" />}
        onClick={() => onCreate(title)}
      >
        Adicionar ideia
      </AppButton>
    </div>
  );
}

interface IdeaActionSheetProps {
  card: ProgramacaoCard;
  onPromote: () => void;
  onPreview: () => void;
  onOpen: () => void;
  onClose: () => void;
}

function IdeaActionSheet({card, onPromote, onPreview, onOpen, onClose}: IdeaActionSheetProps) {
  return (
    <div className="stack-lg p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={cn('inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-semibold', getStatusCalendarClass(card.status))}>
            Ideia
          </span>
          <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">{card.title}</p>
          {card.date ? (
            <p className="mt-1 text-sm capitalize text-[var(--text-tertiary)]">
              {format(new Date(`${card.date}T12:00:00`), "EEEE, d 'de' MMMM", {locale: ptBR})}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-md text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <AppButton variant="primary" fullWidth leftIcon={<ArrowUpRight className="h-4 w-4" />} onClick={onPromote}>
        Promover para roteiro
      </AppButton>
      <AppButton variant="secondary" fullWidth leftIcon={<Eye className="h-4 w-4" />} onClick={onPreview}>
        Ver preview
      </AppButton>
      <button
        type="button"
        onClick={onOpen}
        className="min-h-10 w-full text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        Abrir conteúdo completo
      </button>
    </div>
  );
}

function PilarRhythmStrip({violations, compact = false}: {violations: Violation[]; compact?: boolean}) {
  return (
    <div
      className={cn( 'stack-sm rounded-[var(--radius-card-mobile)] border border-[var(--warning)]/30 bg-[var(--warning-bg)] p-3',
        compact && 'p-2.5',
      )}
    >
      {violations.map((violation, index) => (
        <div key={`${violation.ruleId}-${index}`} className="flex items-start gap-2 text-sm font-medium">
          {violation.type === 'warning' ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
          ) : (
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--info)]" />
          )}
          <span className="text-[var(--text-primary)]">{violation.message}</span>
        </div>
      ))}
    </div>
  );
}

interface BacklogPanelProps {
  cards: ProgramacaoCard[];
  selectedKey: string | null;
  isDropTarget: boolean;
  onSelect: (key: string) => void;
  onPreview: (card: ProgramacaoCard) => void;
  onDragStart: (cardKey: string) => void;
  onDragEnd: () => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent) => void;
}

function BacklogPanel({cards, selectedKey, isDropTarget, onSelect, onPreview, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop}: BacklogPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');

  const sortedCards = useMemo(
    () => [...cards].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')),
    [cards],
  );

  const filteredCards = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sortedCards;
    return sortedCards.filter(
      card =>
        card.title.toLowerCase().includes(query) ||
        card.platformName.toLowerCase().includes(query),
    );
  }, [search, sortedCards]);

  const platformGroups = useMemo(() => {
    const map = new Map<string, ProgramacaoCard[]>();
    filteredCards.forEach(card => {
      const list = map.get(card.platformName) || [];
      list.push(card);
      map.set(card.platformName, list);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
  }, [filteredCards]);

  const showPlatformGroups = platformGroups.length > 1;
  const showSearch = cards.length > 6;

  return (
    <section
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        'border-b border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 transition-colors',
        isDropTarget && 'bg-[color-mix(in_srgb,var(--accent-blue),transparent_92%)]',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded(current => !current)}
          className="flex min-h-9 items-center gap-2 rounded-md text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          aria-expanded={expanded}
        >
          {expanded ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
          <Text variant="sectionTitle" as="span" className="text-sm">
            Prontos para programar
          </Text>
          <span className="rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-xs font-bold text-[var(--text-secondary)]">
            {cards.length}
          </span>
        </button>

        {showSearch && expanded ? (
          <label className="relative min-w-[min(100%,220px)] flex-1 md:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar na fila…"
              className="min-h-9 w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] py-1.5 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-blue)]"
            />
          </label>
        ) : null}

        <p className="ml-auto hidden max-w-xl text-sm text-[var(--text-tertiary)] lg:block">
          {isDropTarget
            ? 'Solte aqui para tirar do calendário.'
            : 'Arraste para um dia ou toque no vídeo e depois no dia.'}
        </p>
      </div>

      {!expanded ? (
        <p className="mt-2 text-sm text-[var(--text-tertiary)]">
          {cards.length === 0
            ? 'Nada por aqui. Roteiros e conteúdos em produção sem data aparecem aqui. Ideias salvas ficam nos dias da grade.'
            : `${cards.length} vídeo${cards.length > 1 ? 's' : ''} em ${platformGroups.length} plataforma${platformGroups.length > 1 ? 's' : ''} — expanda para ver a fila.`}
        </p>
      ) : cards.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-tertiary)]">
          Nada por aqui. Roteiros e conteúdos em produção sem data aparecem aqui. Ideias salvas ficam nos dias da grade.
        </p>
      ) : filteredCards.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-tertiary)]">
          Nenhum vídeo corresponde a &ldquo;{search.trim()}&rdquo;.
        </p>
      ) : (
        <div className="mt-3 max-h-[min(320px,42vh)] stack-md overflow-y-auto pr-1">
          {showPlatformGroups
            ? platformGroups.map(([platformName, groupCards]) => (
                <BacklogPlatformGroup
                  key={platformName}
                  platformName={platformName}
                  cards={groupCards}
                  selectedKey={selectedKey}
                  onSelect={onSelect}
                  onPreview={onPreview}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
              ))
            : (
              <BacklogCardGrid
                cards={filteredCards}
                selectedKey={selectedKey}
                onSelect={onSelect}
                onPreview={onPreview}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            )}
        </div>
      )}
    </section>
  );
}

interface BacklogCardGridProps {
  cards: ProgramacaoCard[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onPreview: (card: ProgramacaoCard) => void;
  onDragStart: (cardKey: string) => void;
  onDragEnd: () => void;
}

function BacklogCardGrid({cards, selectedKey, onSelect, onPreview, onDragStart, onDragEnd}: BacklogCardGridProps) {
  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {cards.map(card => (
        <ProgramacaoCardChip
          key={card.key}
          card={card}
          compact
          draggable
          selected={selectedKey === card.key}
          onClick={() => onSelect(card.key)}
          onPreview={() => onPreview(card)}
          onDragStart={() => onDragStart(card.key)}
          onDragEnd={onDragEnd}
        />
      ))}
    </div>
  );
}

interface BacklogPlatformGroupProps extends BacklogCardGridProps {
  platformName: string;
}

function BacklogPlatformGroup({
  platformName,
  cards,
  selectedKey,
  onSelect,
  onPreview,
  onDragStart,
  onDragEnd,
}: BacklogPlatformGroupProps) {
  const color = getPlatformColor(platformName);

  return (
    <div className="space-y-1.5">
      <div className="sticky top-0 z-[1] flex items-center gap-2 bg-[var(--bg-secondary)] py-0.5">
        <span
          className="flex h-5 min-w-5 items-center justify-center rounded-full text-2xs font-bold text-white"
          style={{backgroundColor: color.dot}}
        >
          {platformInitials(platformName)}
        </span>
        <span className="text-xs font-semibold text-[var(--text-secondary)]">{platformName}</span>
        <span className="rounded-full bg-[var(--bg-hover)] px-1.5 py-0.5 text-2xs font-bold text-[var(--text-tertiary)]">
          {cards.length}
        </span>
      </div>
      <BacklogCardGrid
        cards={cards}
        selectedKey={selectedKey}
        onSelect={onSelect}
        onPreview={onPreview}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />
    </div>
  );
}

interface ProgramacaoCardChipProps {
  card: ProgramacaoCard;
  draggable?: boolean;
  selected?: boolean;
  compact?: boolean;
  onClick?: () => void;
  onPreview: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

function ProgramacaoCardChip({
  card,
  draggable = false,
  selected = false,
  compact = false,
  onClick,
  onPreview,
  onDragStart,
  onDragEnd,
}: ProgramacaoCardChipProps) {
  const platformColor = getPlatformColor(card.platformName);
  const locked = isCardLocked(card);
  const draggableEnabled = draggable && canDragCard(card);
  const statusClass = getStatusCalendarClass(card.status);
  const statusColor = getStatusColorVar(card.status);
  const showStatusBadge = !compact;

  const cardBody = compact ? (
    <>
      <div className="min-w-0 flex-1 space-y-0.5">
        {card.time ? (
          <span className="block text-2xs font-bold tabular-nums text-[var(--text-primary)]">{card.time}</span>
        ) : null}
        <span className="block break-words text-xs font-semibold leading-snug text-[var(--text-primary)]">
          {card.title}
        </span>
        {card.publicationKind === 'repost' ? (
          <span className="inline-flex rounded border border-[var(--border-color)] bg-[var(--bg-hover)] px-1.5 py-0.5 text-2xs font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
            Repost
          </span>
        ) : null}
      </div>
      <button
        type="button"
        onClick={event => {
          event.stopPropagation();
          onPreview();
        }}
        className="flex min-h-7 min-w-7 shrink-0 items-center justify-center self-start rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        aria-label="Ver roteiro e legenda"
        title="Ver roteiro e legenda"
      >
        <Eye className="h-3.5 w-3.5" />
      </button>
    </>
  ) : (
    <>
      {showStatusBadge ? (
        <span className={cn('shrink-0 rounded-md border px-1.5 py-0.5 text-2xs font-bold leading-none', statusClass)}>
          {card.status}
        </span>
      ) : null}
      {card.time ? <span className="shrink-0 font-bold tabular-nums text-[var(--text-primary)]">{card.time}</span> : null}
      <span className="min-w-0 flex-1 truncate font-semibold text-[var(--text-primary)]">{card.title}</span>
      <button
        type="button"
        onClick={event => {
          event.stopPropagation();
          onPreview();
        }}
        className="flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        aria-label="Ver roteiro e legenda"
        title="Ver roteiro e legenda"
      >
        <Eye className="h-4 w-4" />
      </button>
    </>
  );

  if (compact) {
    return (
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        draggable={draggableEnabled}
        onDragStart={event => {
          event.dataTransfer.setData(DRAG_MIME, card.key);
          event.dataTransfer.setData('text/plain', card.key);
          event.dataTransfer.effectAllowed = 'move';
          onDragStart?.();
        }}
        onDragEnd={() => onDragEnd?.()}
        onClick={event => {
          if (!onClick) return;
          event.stopPropagation();
          onClick();
        }}
        onKeyDown={event => {
          if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return;
          event.preventDefault();
          onClick();
        }}
        className={cn(
          'group flex min-h-10 items-start gap-1.5 rounded-md border border-l-4 px-2 py-1.5 text-xs transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/35',
          statusClass,
          draggableEnabled && 'cursor-grab active:cursor-grabbing',
          selected && 'ring-2 ring-[var(--text-primary)]',
          locked && 'opacity-75',
        )}
        style={{borderLeftColor: statusColor}}
        title={`${card.title} — ${card.platformName} · ${card.status}`}
      >
        {cardBody}
      </div>
    );
  }

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      draggable={draggableEnabled}
      onDragStart={event => {
        event.dataTransfer.setData(DRAG_MIME, card.key);
        event.dataTransfer.setData('text/plain', card.key);
        event.dataTransfer.effectAllowed = 'move';
        onDragStart?.();
      }}
      onDragEnd={() => onDragEnd?.()}
      onClick={event => {
        if (!onClick) return;
        event.stopPropagation();
        onClick();
      }}
      onKeyDown={event => {
        if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        onClick();
      }}
      className={cn(
        'group flex min-h-[76px] items-stretch gap-2 rounded-lg border border-l-4 p-2 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/35',
        statusClass,
        draggableEnabled && 'cursor-grab active:cursor-grabbing',
        selected && 'ring-2 ring-[var(--text-primary)]',
        locked && 'opacity-75',
      )}
      style={{borderLeftColor: statusColor}}
      title={`${card.title} — ${card.platformName} · ${card.status}`}
    >
      {draggableEnabled ? (
        <div className="flex items-center text-[var(--text-tertiary)]">
          <GripVertical className="h-4 w-4 shrink-0 opacity-50" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5">
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full text-2xs font-bold text-white" style={{backgroundColor: platformColor.dot}}>
            {platformInitials(card.platformName)}
          </span>
          <span className="truncate text-xs font-semibold text-[var(--text-secondary)]">{card.platformName}</span>
          <span className={cn('ml-auto shrink-0 rounded-md border px-1.5 py-0.5 text-2xs font-bold', statusClass)}>
            {card.status}
          </span>
          {card.time ? (
            <span className="shrink-0 rounded-md bg-[var(--bg-hover)] px-1.5 py-0.5 text-xs font-bold tabular-nums text-[var(--text-primary)]">
              {card.time}
            </span>
          ) : null}
        </div>
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)]">{card.title}</p>
      </div>
      <button
        type="button"
        onClick={event => {
          event.stopPropagation();
          onPreview();
        }}
        className="flex min-h-10 min-w-10 shrink-0 items-center justify-center self-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        aria-label="Ver roteiro e legenda"
        title="Ver roteiro e legenda"
      >
        <Eye className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ProjetoPublicacaoChipProps {
  marker: ProjetoPublicacaoMarker;
  compact?: boolean;
  onClick: () => void;
}

function ProjetoPublicacaoChip({marker, compact = false, onClick}: ProjetoPublicacaoChipProps) {
  return (
    <button
      type="button"
      onClick={event => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        'flex w-full items-center gap-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-hover)]/80 text-left text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]',
        compact ? 'min-h-6 px-1.5 py-0.5 text-2xs font-medium' : 'min-h-7 px-2 py-1 text-xs font-medium',
      )}
      title={`${marker.projetoNome}: ${marker.title}${marker.time ? ` · ${marker.time}` : ''}`}
    >
      <Briefcase className={cn('shrink-0 opacity-60', compact ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
      <span className="min-w-0 flex-1 truncate">{marker.title}</span>
      {marker.time ? <span className="shrink-0 tabular-nums opacity-70">{marker.time}</span> : null}
    </button>
  );
}

interface DayColumnProps {
  day: Date;
  dayKey: string;
  cards: ProgramacaoCard[];
  projetoMarkers: ProjetoPublicacaoMarker[];
  times: string[];
  usedTimes: string[];
  isToday: boolean;
  isDropTarget: boolean;
  hasViolationWarning: boolean;
  canReceive: boolean;
  onDragStart: (cardKey: string) => void;
  onDragEnd: () => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent) => void;
  onClick: () => void;
  onPreview: (card: ProgramacaoCard) => void;
  onCardClick: (card: ProgramacaoCard) => void;
  onAddIdea: (dayKey: string) => void;
  onRegisterPosted: (dayKey: string) => void;
  onOpenProjetoPublicacao: (marker: ProjetoPublicacaoMarker) => void;
}

function EmptyDayRegisterButton({dayKey, onRegisterPosted}: {dayKey: string; onRegisterPosted: (dayKey: string) => void}) {
  return (
    <button
      type="button"
      onClick={event => {
        event.stopPropagation();
        onRegisterPosted(dayKey);
      }}
      className="w-full rounded-md py-2 text-left text-xs text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      title="Registrar vídeo já postado neste dia"
    >
      Livre para programar
    </button>
  );
}

function DayQuickActions({
  dayKey,
  onAddIdea,
  onRegisterPosted,
}: {
  dayKey: string;
  onAddIdea: (dayKey: string) => void;
  onRegisterPosted: (dayKey: string) => void;
}) {
  return (
    <div className="pointer-events-none absolute bottom-1 right-1 flex gap-0.5 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
      <button
        type="button"
        onClick={event => {
          event.stopPropagation();
          onAddIdea(dayKey);
        }}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] shadow-[var(--shadow-soft)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        title="Adicionar ideia"
      >
        <Lightbulb className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={event => {
          event.stopPropagation();
          onRegisterPosted(dayKey);
        }}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] shadow-[var(--shadow-soft)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        title="Registrar postado"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

function DayColumn({
  day,
  dayKey,
  cards,
  projetoMarkers,
  times,
  usedTimes,
  isToday,
  isDropTarget,
  hasViolationWarning,
  canReceive,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  onPreview,
  onCardClick,
  onAddIdea,
  onRegisterPosted,
  onOpenProjetoPublicacao,
}: DayColumnProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      className={cn(
        'flex min-w-0 flex-col rounded-[var(--radius-card-mobile)] border bg-[var(--bg-secondary)] p-2 transition-colors max-md:w-[168px] max-md:shrink-0 md:min-h-[min(36vh,380px)]',
        isDropTarget && hasViolationWarning
          ? 'border-[var(--warning)] bg-[color-mix(in_srgb,var(--warning),transparent_92%)] ring-2 ring-[var(--warning)]/40'
          : isDropTarget
            ? 'border-[var(--accent-blue)] bg-[color-mix(in_srgb,var(--accent-blue),transparent_90%)] ring-2 ring-[var(--accent-blue)]/20'
            : isToday
              ? 'border-[var(--accent-blue)]/50'
              : 'border-[var(--border-color)]',
        canReceive && 'cursor-pointer hover:border-[var(--accent-blue)]/50',
      )}
    >
      {/* Cabeçalho do dia: nome + horários cadastrados */}
      <div className={cn('rounded-lg border border-transparent px-1.5 py-1.5', isToday && 'border-[var(--accent-blue)]/15 bg-[color-mix(in_srgb,var(--accent-blue),transparent_92%)]')}>
        <div className="flex flex-col gap-0.5">
          <p className={cn('text-lg font-bold leading-none', isToday ? 'text-[var(--accent-blue)]' : 'text-[var(--text-primary)]')}>
            {format(day, 'd')}
          </p>
          <p className="text-xs font-semibold capitalize leading-tight text-[var(--text-secondary)]">
            {format(day, 'EEE', {locale: ptBR})}
            {isToday ? ' · hoje' : ''}
          </p>
        </div>
        {times.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-0.5">
            {times.map(time => {
              const filled = usedTimes.includes(time);
              return (
                <span
                  key={time}
                  className={cn(
                    'inline-flex min-h-6 items-center rounded border px-1 py-0.5 text-2xs font-bold tabular-nums',
                    filled
                      ? 'border-[color-mix(in_srgb,var(--success),transparent_60%)] bg-[color-mix(in_srgb,var(--success),transparent_88%)] text-[var(--success)]'
                      : 'border-[var(--border-color)] text-[var(--text-tertiary)]',
                  )}
                  title={filled ? `${time} — ocupado` : `${time} — livre`}
                >
                  {time}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="mt-1 text-2xs text-[var(--text-tertiary)] opacity-80">sem horário</p>
        )}
        <div className="mt-1.5">
          <DayQuickActions dayKey={dayKey} onAddIdea={onAddIdea} onRegisterPosted={onRegisterPosted} />
        </div>
      </div>

      {/* Cards do dia */}
      <div className="mt-2 flex min-h-0 flex-1 flex-col space-y-1 overflow-y-auto rounded-lg bg-[var(--bg-primary)]/60 p-1.5">
        {projetoMarkers.length > 0 ? (
          <div className="space-y-1">
            {projetoMarkers.map(marker => (
              <ProjetoPublicacaoChip
                key={marker.key}
                marker={marker}
                onClick={() => onOpenProjetoPublicacao(marker)}
              />
            ))}
          </div>
        ) : null}
        {cards.map(card => (
          <ProgramacaoCardChip
            key={card.key}
            card={card}
            compact
            draggable
            onClick={() => onCardClick(card)}
            onPreview={() => onPreview(card)}
            onDragStart={() => onDragStart(card.key)}
            onDragEnd={onDragEnd}
          />
        ))}
        {cards.length === 0 && projetoMarkers.length === 0 ? (
          <EmptyDayRegisterButton dayKey={dayKey} onRegisterPosted={onRegisterPosted} />
        ) : null}
        {isDropTarget ? (
          <div className="flex min-h-12 items-center justify-center rounded-lg border-2 border-dashed border-[var(--accent-blue)]/60 bg-[color-mix(in_srgb,var(--accent-blue),transparent_88%)] px-2 py-2 text-center text-2xs font-semibold text-[var(--accent-blue)]">
            Solte aqui
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface MonthGridProps {
  anchorDate: Date;
  scheduledByDate: Map<string, ProgramacaoCard[]>;
  projetoPublicacaoByDate: Map<string, ProjetoPublicacaoMarker[]>;
  dragOverDay: string | null;
  hasSelection: boolean;
  onDragOverDay: (key: string | null) => void;
  hasDayViolationWarning: (dayKey: string) => boolean;
  onDrop: (event: React.DragEvent, dayKey: string) => void;
  onDayClick: (dayKey: string) => void;
  onPreview: (card: ProgramacaoCard) => void;
  onCardClick: (card: ProgramacaoCard) => void;
  onAddIdea: (dayKey: string) => void;
  onRegisterPosted: (dayKey: string) => void;
  onOpenProjetoPublicacao: (marker: ProjetoPublicacaoMarker) => void;
  onDragStart: (cardKey: string) => void;
  onDragEnd: () => void;
}

function sortDayCards(cards: ProgramacaoCard[]): ProgramacaoCard[] {
  return [...cards].sort((a, b) => {
    const aIdeia = isIdeiaCard(a) ? 0 : 1;
    const bIdeia = isIdeiaCard(b) ? 0 : 1;
    if (aIdeia !== bIdeia) return aIdeia - bIdeia;
    const timeA = a.time || '99:99';
    const timeB = b.time || '99:99';
    if (timeA !== timeB) return timeA.localeCompare(timeB);
    return a.title.localeCompare(b.title, 'pt-BR');
  });
}

function MonthGrid({
  anchorDate,
  scheduledByDate,
  projetoPublicacaoByDate,
  dragOverDay,
  hasSelection,
  onDragOverDay,
  hasDayViolationWarning,
  onDrop,
  onDayClick,
  onPreview,
  onCardClick,
  onAddIdea,
  onRegisterPosted,
  onOpenProjetoPublicacao,
  onDragStart,
  onDragEnd,
}: MonthGridProps) {
  return (
    <CalendarMonthGrid
      anchorDate={anchorDate}
      weekStartsOn={1}
      minCellHeight={200}
      getDayClassName={({dateKey, inMonth}) => {
        const isDropTarget = dragOverDay === dateKey;
        const violationWarning = isDropTarget && hasDayViolationWarning(dateKey);
        return cn(
          'group relative',
          violationWarning &&
            '!border-[var(--warning)] !bg-[color-mix(in_srgb,var(--warning),transparent_92%)] ring-2 ring-[var(--warning)]/40',
          isDropTarget &&
            !violationWarning &&
            '!border-[var(--accent-blue)] !bg-[color-mix(in_srgb,var(--accent-blue),transparent_90%)] ring-2 ring-[var(--accent-blue)]/20',
          hasSelection && 'hover:!border-[var(--accent-blue)]/50',
          !inMonth && 'opacity-45',
        );
      }}
      onDayClick={(dayProps, event) => {
        event.stopPropagation();
        onDayClick(dayProps.dateKey);
      }}
      onDayDragOver={(dayProps, event) => {
        event.preventDefault();
        onDragOverDay(dayProps.dateKey);
      }}
      onDayDragLeave={() => onDragOverDay(null)}
      onDayDrop={(dayProps, event) => onDrop(event, dayProps.dateKey)}
      renderDayContent={dayProps => {
        const dayCards = sortDayCards(scheduledByDate.get(dayProps.dateKey) || []);
        const projetoMarkers = projetoPublicacaoByDate.get(dayProps.dateKey) || [];
        const isEmpty = dayCards.length === 0 && projetoMarkers.length === 0;

        return (
          <>
            {projetoMarkers.map(marker => (
              <ProjetoPublicacaoChip
                key={marker.key}
                marker={marker}
                compact
                onClick={() => onOpenProjetoPublicacao(marker)}
              />
            ))}
            {dayCards.map(card => (
              <ProgramacaoCardChip
                key={card.key}
                card={card}
                compact
                draggable={canDragCard(card)}
                onClick={() => onCardClick(card)}
                onPreview={() => onPreview(card)}
                onDragStart={() => onDragStart(card.key)}
                onDragEnd={onDragEnd}
              />
            ))}
            {isEmpty ? (
              <EmptyDayRegisterButton dayKey={dayProps.dateKey} onRegisterPosted={onRegisterPosted} />
            ) : null}
            {dragOverDay === dayProps.dateKey ? (
              <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--accent-blue)]/60 px-1 py-1 text-center text-2xs font-semibold text-[var(--accent-blue)]">
                Solte aqui
              </div>
            ) : null}
            <DayQuickActions
              dayKey={dayProps.dateKey}
              onAddIdea={onAddIdea}
              onRegisterPosted={onRegisterPosted}
            />
          </>
        );
      }}
    />
  );
}

interface CardPreviewProps {
  card: ProgramacaoCard;
  content: Content | null;
  onClose: () => void;
  onOpen?: () => void;
}

function CardPreview({card, content, onClose, onOpen}: CardPreviewProps) {
  const color = getPlatformColor(card.platformName);
  const scriptText = htmlToReadableText(content?.script || '');
  const paragraphs = scriptText.split(/\n\n+/).filter(Boolean);

  return (
    <div className="h-full overflow-y-auto p-6 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-sm font-semibold', color.chip)}>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full text-2xs font-bold text-white" style={{backgroundColor: color.dot}}>
                {platformInitials(card.platformName)}
              </span>
              {card.platformName}
            </span>
            <Badge variant="status" status={card.status}>
              {card.status}
            </Badge>
          </div>
          <Text variant="sectionTitle" className="mt-3">{card.title}</Text>
          {card.date ? (
            <p className="mt-1 text-sm font-medium capitalize text-[var(--text-secondary)]">
              {format(new Date(`${card.date}T12:00:00`), "EEEE, d 'de' MMMM", {locale: ptBR})}
              {card.time ? ` · ${card.time}` : ' · sem horário'}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-md text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="mt-4 flex min-h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-input)] border border-[var(--text-primary)] bg-[var(--text-primary)] px-4 text-sm font-semibold text-[var(--bg-primary)] transition-opacity hover:opacity-90"
        >
          <Eye className="h-4 w-4" />
          Abrir conteúdo completo
        </button>
      ) : null}

      <div className="mt-5 stack-xl">
        {card.legenda || card.hashtags ? (
          <section className="rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
            <p className="text-sm font-semibold text-[var(--text-secondary)]">
              Legenda · {card.platformName}
            </p>
            {card.legenda ? (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text-primary)]">{card.legenda}</p>
            ) : null}
            {card.hashtags ? (
              <p className="mt-3 text-sm font-medium leading-6 text-[var(--accent-blue)]">{card.hashtags}</p>
            ) : null}
          </section>
        ) : (
          <p className="rounded-[var(--radius-card-mobile)] border border-dashed border-[var(--border-color)] p-4 text-sm text-[var(--text-tertiary)]">
            Sem legenda cadastrada para essa plataforma.
          </p>
        )}

        <section className="rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
          <p className="text-sm font-semibold text-[var(--text-secondary)]">Roteiro</p>
          {paragraphs.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--text-tertiary)]">Nenhum texto no roteiro.</p>
          ) : (
            <div className="mt-3 max-w-prose stack-md">
              {paragraphs.map((paragraph, index) => (
                <p key={index} className="whitespace-pre-wrap text-sm leading-7 text-[var(--text-primary)]">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
