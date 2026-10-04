import {useEffect, useMemo, useRef, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {ArrowUpRight, Briefcase, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleHelp, Eye, GripVertical, Lightbulb, Plus, X} from 'lucide-react';
import {Dialog} from '../../../components/overlays/Dialog';
import {ConfirmModal} from '../../../components/feedback/modals/ConfirmModal';
import {Text} from '../../../components/ui/Text';
import {ToolbarSearchInput} from '../../../components/ui/ToolbarSearchInput';
import {Badge} from '../../../components/ui/Badge';
import {AppButton} from '../../../components/ui/AppButton';
import {Surface} from '../../../components/ui/Surface';
import {PaginationBar} from '../../../components/ui/PaginationBar';
import {Drawer} from '../../../components/overlays/Drawer';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {OverlayFooter} from '../../../components/overlays/OverlayFooter';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import {useAppContext} from '../../../context/AppContext';
import {useIsMobile} from '../../../hooks/useIsMobile';
import {PageLayout} from '../../../layouts/page/PageLayout';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import type {Content} from '../../../lib/database';
import type {ConfirmState} from '../../../lib/uiCopy';
import {cn, htmlToReadableText} from '../../../lib/utils';
import {getStatusCalendarClass} from '../../../lib/statusClasses';
import {FilterBar} from '../../../components/ui/FilterBar';
import {buildWeekRhythmQuotas, dayRhythmTone, diffViolations, previewScheduleViolations, validateWeeklyContent, type DayRhythmTone, type Violation, type WeekRhythmQuota} from '../../../utils/pilarRhythm';
import {getPostingTimes, getTimesForDay, getTimesForDayFromEntries, getUnionTimesForWeekday, type Weekday} from '../../settings/lib/postingTimes';
import {resolvePlatformUuid} from '../../settings/lib/pilarPostingSchedule';
import {recommendDailyAction} from '../../recommendations/recommendDailyAction';
import {CONTENT_STATUS} from '../../contents/lib/contentPipeline';
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
  platformInitials,
  promoteIdeiaToRoteiro,
  sortDayCards,
  type ProgramacaoCard,
  type ProjetoPublicacaoMarker,
} from '../lib/programacao';
import {buildContentDetailRoute} from '../../contents/lib/contentDetailRoute';
import {buildDetailBackState} from '../../../lib/navigation/detailBack';
import {
  CalendarDesktopShell,
  CalendarMonthGrid,
  CalendarPeriodNav,
} from '../../../components/calendar';
import {
  ALL_PLATFORMS,
  ALL_STATUSES,
  CONTENT_STATUS_FILTER_OPTIONS,
  platformFilterOptions,
} from '../../editorial-calendar/lib/calendarContentFilters';
import {ProgramacaoMobileScreen} from '../../../mobile/screens/programacao/ProgramacaoMobileScreen';
import {CalendarModeSwitch} from '../../editorial-calendar/components/CalendarModeSwitch';
import {RhythmDiagnosis} from '../components/RhythmDiagnosis';
import {WeekRhythmRail} from '../components/WeekRhythmRail';
import {getEditorialSettings} from '../../editorial/lib/editorialSettings';

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
  series: Parameters<typeof validateWeeklyContent>[4],
  card: ProgramacaoCard,
  dayKey: string,
  time: string | null,
): Violation[] {
  const content = contents.find(item => item.id === card.contentId);
  if (!content) return [];

  const timeToUse = time ?? (card.date ? card.time : null);
  const weekStart = startOfWeek(parseISO(dayKey), {weekStartsOn: 1});
  const before = validateWeeklyContent(contents, weekStart, pilares, platforms, series);
  const updated = applyScheduleToContent(content, card.platformId, dayKey, timeToUse);
  const nextContents = contents.map(item => (item.id === card.contentId ? updated : item));
  const after = previewScheduleViolations(nextContents, dayKey, pilares, platforms, series);
  return diffViolations(before, after);
}

function dateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function ProgramacaoPage() {
  const {state, dispatch} = useAppContext();
  const routerNavigate = useNavigate();
  const location = useLocation();
  const detailBackState = buildDetailBackState(`${location.pathname}${location.search}`);
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ProgramacaoView>('month');
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [platformFilter, setPlatformFilter] = useState(ALL_PLATFORMS);
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [showProjetoMarkers, setShowProjetoMarkers] = useState(true);
  const [selectedBacklogKey, setSelectedBacklogKey] = useState<string | null>(null);
  const [pickerDayKey, setPickerDayKey] = useState<string | null>(null);
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
  const [mobileDatePickerOpen, setMobileDatePickerOpen] = useState(false);

  const postingTimes = useMemo(() => getPostingTimes(state.preferences), [state.preferences]);
  const editorialSettings = useMemo(() => getEditorialSettings(state.preferences), [state.preferences]);

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
    const query = scheduleSearch.trim().toLowerCase();
    return allCards.filter(card => {
      if (platformFilter !== ALL_PLATFORMS && card.platformName !== platformFilter) return false;
      if (statusFilter !== ALL_STATUSES && card.status !== statusFilter) return false;
      if (!query) return true;
      return `${card.title} ${card.platformName}`.toLowerCase().includes(query);
    });
  }, [allCards, platformFilter, scheduleSearch, statusFilter]);

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

  const visibleProjetoByDate = useMemo(() => {
    if (showProjetoMarkers) return projetoPublicacaoByDate;
    return new Map<string, ProjetoPublicacaoMarker[]>();
  }, [projetoPublicacaoByDate, showProjetoMarkers]);

  const weekStart = startOfWeek(anchorDate, {weekStartsOn: 1});
  const weekDays = eachDayOfInterval({start: weekStart, end: endOfWeek(anchorDate, {weekStartsOn: 1})});

  const rhythmByWeek = useMemo(() => {
    const rangeStart = viewMode === 'week'
      ? weekStart
      : startOfWeek(startOfMonth(anchorDate), {weekStartsOn: 1});
    const rangeEnd = viewMode === 'week'
      ? endOfWeek(anchorDate, {weekStartsOn: 1})
      : endOfWeek(endOfMonth(anchorDate), {weekStartsOn: 1});
    const quotas = new Map<string, WeekRhythmQuota[]>();
    const violations = new Map<string, Violation[]>();
    for (let cursor = rangeStart; cursor <= rangeEnd; cursor = addDays(cursor, 7)) {
      const key = format(cursor, 'yyyy-MM-dd');
      quotas.set(key, buildWeekRhythmQuotas({
        contents: state.contents,
        weekStart: cursor,
        pilares: state.pilares,
        series: state.series,
        platforms: state.platforms,
        postingTimeEntries: state.postingTimeEntries ?? [],
        fallbackTimes: postingTimes,
        editorial: editorialSettings,
      }));
      violations.set(key, validateWeeklyContent(state.contents, cursor, state.pilares, state.platforms, state.series));
    }
    return {quotas, violations};
  }, [anchorDate, editorialSettings, postingTimes, state.contents, state.pilares, state.platforms, state.postingTimeEntries, state.series, viewMode, weekStart]);

  const anchorWeekKey = format(weekStart, 'yyyy-MM-dd');
  const anchorWeekQuotas = rhythmByWeek.quotas.get(anchorWeekKey) ?? [];

  const draggingCard = draggingCardKey ? cards.find(item => item.key === draggingCardKey) ?? null : null;
  const selectedBacklogCard = backlogCards.find(item => item.key === selectedBacklogKey) ?? null;
  const placementPreviewCard = draggingCard ?? selectedBacklogCard;

  const riskDayKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!placementPreviewCard || isIdeiaCard(placementPreviewCard)) return keys;
    const rangeStart = viewMode === 'week'
      ? startOfWeek(anchorDate, {weekStartsOn: 1})
      : startOfWeek(startOfMonth(anchorDate), {weekStartsOn: 1});
    const rangeEnd = viewMode === 'week'
      ? endOfWeek(anchorDate, {weekStartsOn: 1})
      : endOfWeek(endOfMonth(anchorDate), {weekStartsOn: 1});
    for (const day of eachDayOfInterval({start: rangeStart, end: rangeEnd})) {
      const key = format(day, 'yyyy-MM-dd');
      const introduced = evaluateScheduleViolations(
        state.contents,
        state.pilares,
        state.platforms,
        state.series,
        placementPreviewCard,
        key,
        placementPreviewCard.time,
      );
      if (introduced.some(item => item.type === 'warning')) keys.add(key);
    }
    return keys;
  }, [
    anchorDate,
    placementPreviewCard,
    state.contents,
    state.pilares,
    state.platforms,
    state.series,
    viewMode,
  ]);

  const timesForWeekday = (weekday: Weekday): string[] => {
    const entries = state.postingTimeEntries ?? [];
    if (entries.length === 0) return getTimesForDay(postingTimes, weekday);
    return getUnionTimesForWeekday(entries, state.platforms, weekday);
  };

  const timesForPlatform = (platformId: string | null, weekday: Weekday): string[] => {
    const entries = state.postingTimeEntries ?? [];
    if (entries.length === 0) return getTimesForDay(postingTimes, weekday);
    const platformUuid = platformId ? resolvePlatformUuid(state.platforms, platformId) : null;
    return getTimesForDayFromEntries(entries, platformUuid, weekday);
  };

  const toneForDay = (dayKey: string): DayRhythmTone | 'risk' | null => {
    if (riskDayKeys.has(dayKey)) return 'risk';
    const weekKey = format(startOfWeek(parseISO(dayKey), {weekStartsOn: 1}), 'yyyy-MM-dd');
    const violations = rhythmByWeek.violations.get(weekKey) ?? [];
    const ids = (scheduledByDate.get(dayKey) || []).map(card => card.contentId);
    const tone = dayRhythmTone(ids, violations);
    return tone === 'over' ? 'over' : null;
  };

  const hasDayViolationWarning = (dayKey: string) => {
    if (!draggingCard) return false;
    const time = draggingCard.date ? draggingCard.time : null;
    return evaluateScheduleViolations(
      state.contents,
      state.pilares,
      state.platforms,
      state.series,
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
      state.series,
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
    requestSchedule(card, dayKey, null, {openTimePicker: false});
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
      confirmLabel: 'Transformar em roteiro',
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
    if (selectedBacklogKey) {
      const card = backlogCards.find(item => item.key === selectedBacklogKey);
      if (card) scheduleCard(card, dayKey);
      setPickerDayKey(null);
      return;
    }
    setPickerDayKey(current => (current === dayKey ? null : dayKey));
  };

  const handlePickBacklogForDay = (key: string) => {
    if (!pickerDayKey) return;
    const card = backlogCards.find(item => item.key === key);
    if (!card) return;
    scheduleCard(card, pickerDayKey);
    setPickerDayKey(null);
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

  const contentFilters = (
    <FilterBar
      size="compact"
      searchValue={scheduleSearch}
      onSearchChange={setScheduleSearch}
      searchPlaceholder="Buscar por título ou rede"
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
        {
          id: 'projetos',
          label: 'Publi de projeto',
          value: showProjetoMarkers ? 'mostrar' : 'ocultar',
          emptyValue: 'mostrar',
          onChange: value => setShowProjetoMarkers(value !== 'ocultar'),
          options: [
            {label: 'Mostrar', value: 'mostrar'},
            {label: 'Ocultar', value: 'ocultar'},
          ],
        },
      ]}
    />
  );

  const previewContent = previewCard
    ? state.contents.find(item => item.id === previewCard.contentId) || null
    : null;

  const openPreviewContent = () => {
    const id = previewCard?.contentId;
    setPreviewCard(null);
    if (id) routerNavigate(buildContentDetailRoute(id, 'roteiro'), detailBackState);
  };

  const mobileModals = (
    <>
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
                state.series,
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
        cancelLabel="Escolher outro dia"
        onConfirm={confirmPendingSchedule}
        onCancel={() => setPendingSchedule(null)}
      />

      <Drawer open={Boolean(previewCard)} onClose={() => setPreviewCard(null)} widthClassName="max-w-xl">
        {previewCard ? (
          <div className="flex h-full min-h-0 flex-col bg-[var(--bg-elevated)]">
            <OverlayHeader title={isIdeiaCard(previewCard) ? 'Detalhes da ideia' : 'Detalhes do roteiro'} onClose={() => setPreviewCard(null)} />
            <OverlayBody>
              <CardPreviewContent card={previewCard} content={previewContent} />
            </OverlayBody>
            <OverlayFooter>
              <AppButton variant="primary" fullWidth leftIcon={<Eye className="h-4 w-4" />} onClick={openPreviewContent}>
                {isIdeiaCard(previewCard) ? 'Abrir ideia' : 'Abrir roteiro'}
              </AppButton>
            </OverlayFooter>
          </div>
        ) : null}
      </Drawer>

      <Dialog
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
                ? timesForPlatform(timePickerCard.platformId, getDay(parseISO(timePickerCard.date)) as Weekday)
                : []
            }
            onSelect={time => applyTime(timePickerCard, time)}
            onClose={() => {
              setTimePickerCard(null);
              setTimePickerViolations([]);
            }}
          />
        ) : null}
      </Dialog>

      <Dialog
        open={mobileDatePickerOpen}
        onClose={() => setMobileDatePickerOpen(false)}
        desktopMaxW="max-w-sm"
      >
        <MobileDatePickerSheet
          anchorDate={anchorDate}
          selectedBacklogKey={selectedBacklogKey}
          backlogCards={backlogCards}
          scheduledByDate={scheduledByDate}
          projetoPublicacaoByDate={projetoPublicacaoByDate}
          onSelectDay={dayKey => {
            handleDayClick(dayKey);
            setMobileDatePickerOpen(false);
          }}
          onClose={() => setMobileDatePickerOpen(false)}
        />
      </Dialog>

      <Dialog
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
      </Dialog>

      <Dialog
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
            series={state.series}
            postingTimes={postingTimes}
            onSave={(content, options) => handleSavePosted(content, options)}
            onClose={() => {
              setPostedComposerDay(null);
              setPostedEditContent(null);
            }}
          />
        ) : null}
      </Dialog>

      <Dialog
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
              routerNavigate(buildContentDetailRoute(ideaActionCard.contentId, 'roteiro'), detailBackState);
              setIdeaActionCard(null);
            }}
            onClose={() => setIdeaActionCard(null)}
          />
        ) : null}
      </Dialog>
    </>
  );

  if (isMobile) {
    return (
      <>
        <div className="min-h-full bg-[var(--bg-primary)]">
          <ProgramacaoMobileScreen
            filters={contentFilters}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            anchorDate={anchorDate}
            onAnchorDateChange={setAnchorDate}
            backlogCards={backlogCards}
            selectedBacklogKey={selectedBacklogKey}
            onSelectBacklogCard={key => {
              setPickerDayKey(null);
              setSelectedBacklogKey(key);
            }}
            scheduledByDate={scheduledByDate}
            projetoPublicacaoByDate={projetoPublicacaoByDate}
            weekQuotas={anchorWeekQuotas}
            dayTone={toneForDay}
            onDayClick={handleDayClick}
            pickerDayKey={pickerDayKey}
            onPickBacklog={handlePickBacklogForDay}
            onCardClick={handleCardClick}
            onPreview={setPreviewCard}
            onAddIdea={setIdeaComposerDay}
            onRegisterPosted={openPostedComposer}
            onOpenProjetoPublicacao={openProjetoPublicacao}
            onPickDate={() => setMobileDatePickerOpen(true)}
          />
        </div>
        {mobileModals}
      </>
    );
  }

  return (
    <PageLayout
      contentWidth="full"
      contentStack="none"
      className="min-h-full"
      contentClassName="!py-0"
      header={
        <DesktopPageHeader
          section="Produção"
          title="Calendário"
          titleContent={
            <div className="flex min-w-0 items-center gap-1">
              <Text variant="pageTitle" className="truncate">
                Calendário
              </Text>
              <ProgramacaoHelpButton />
            </div>
          }
          actions={
            <>
              <CalendarModeSwitch />
              <AppButton
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => openPostedComposer(dateKey(new Date()))}
              >
                Registrar vídeo postado
              </AppButton>
            </>
          }
        />
      }
      toolbar={
        <div className="stack-sm">
          {periodControls}
          {contentFilters}
        </div>
      }
      mobileToolbar={periodControls}
    >
      <CalendarDesktopShell>
        <div className="stack-md p-3 md:p-4">
          <Surface variant="outlined" padding="none" className="overflow-hidden">
            <BacklogPanel
              cards={backlogCards}
              selectedKey={selectedBacklogKey}
              isDropTarget={dragOverDay === BACKLOG_DROP_KEY}
              onSelect={key => {
                setPickerDayKey(null);
                setSelectedBacklogKey(current => (current === key ? null : key));
              }}
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
              {selectedBacklogCard ? (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-card-mobile)] border border-[var(--accent-blue)]/40 bg-[color-mix(in_srgb,var(--accent-blue),transparent_92%)] px-3 py-2">
                  <div className="min-w-0">
                    <Text variant="label" className="text-[var(--accent-blue)]">
                      Escolha o dia
                    </Text>
                    <Text variant="body" className="truncate">
                      {selectedBacklogCard.title}
                    </Text>
                  </div>
                  <AppButton variant="secondary" size="sm" onClick={() => setSelectedBacklogKey(null)}>
                    Cancelar
                  </AppButton>
                </div>
              ) : null}

              {viewMode === 'week' ? (
                <div className="grid grid-cols-[9.5rem_repeat(7,minmax(0,1fr))] gap-1.5">
                  <div className="relative min-h-[min(36vh,380px)]">
                    <div className="absolute inset-0 flex flex-col overflow-hidden rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-2">
                      <Text variant="meta" className="mb-2 uppercase tracking-wide">
                        Ritmo
                      </Text>
                      <WeekRhythmRail quotas={anchorWeekQuotas} maxVisible={14} className="min-h-0" />
                    </div>
                  </div>
                  {weekDays.map(day => {
                    const key = dateKey(day);
                    const dayCards = sortDayCards(scheduledByDate.get(key) || []);
                    const projetoMarkers = visibleProjetoByDate.get(key) || [];
                    const times = timesForWeekday(getDay(day) as Weekday);
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
                        rhythmTone={toneForDay(key)}
                        canReceive={Boolean(selectedBacklogKey)}
                        isPicking={pickerDayKey === key}
                        backlogCards={backlogCards}
                        onPickBacklog={handlePickBacklogForDay}
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
                  quotasForWeek={weekStartDate => rhythmByWeek.quotas.get(format(weekStartDate, 'yyyy-MM-dd')) ?? []}
                  scheduledByDate={scheduledByDate}
                  projetoPublicacaoByDate={visibleProjetoByDate}
                  dragOverDay={dragOverDay}
                  hasSelection={Boolean(selectedBacklogKey)}
                  pickerDayKey={pickerDayKey}
                  backlogCards={backlogCards}
                  onPickBacklog={handlePickBacklogForDay}
                  onDragOverDay={setDragOverDay}
                  hasDayViolationWarning={hasDayViolationWarning}
                  dayTone={toneForDay}
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

      <Drawer open={Boolean(previewCard)} onClose={() => setPreviewCard(null)} widthClassName="max-w-xl">
        {previewCard ? (
          <div className="flex h-full min-h-0 flex-col bg-[var(--bg-elevated)]">
            <OverlayHeader title={isIdeiaCard(previewCard) ? 'Detalhes da ideia' : 'Detalhes do roteiro'} onClose={() => setPreviewCard(null)} />
            <OverlayBody>
              <CardPreviewContent card={previewCard} content={previewContent} />
            </OverlayBody>
            <OverlayFooter>
              <AppButton variant="primary" fullWidth leftIcon={<Eye className="h-4 w-4" />} onClick={openPreviewContent}>
                {isIdeiaCard(previewCard) ? 'Abrir ideia' : 'Abrir roteiro'}
              </AppButton>
            </OverlayFooter>
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
                state.series,
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
        cancelLabel="Escolher outro dia"
        onConfirm={confirmPendingSchedule}
        onCancel={() => setPendingSchedule(null)}
      />

      <Dialog
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
                ? timesForPlatform(timePickerCard.platformId, getDay(parseISO(timePickerCard.date)) as Weekday)
                : []
            }
            onSelect={time => applyTime(timePickerCard, time)}
            onClose={() => {
              setTimePickerCard(null);
              setTimePickerViolations([]);
            }}
          />
        ) : null}
      </Dialog>

      <Dialog
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
      </Dialog>

      <Dialog
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
            series={state.series}
            postingTimes={postingTimes}
            onSave={(content, options) => handleSavePosted(content, options)}
            onClose={() => {
              setPostedComposerDay(null);
              setPostedEditContent(null);
            }}
          />
        ) : null}
      </Dialog>

      <Dialog
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
              routerNavigate(buildContentDetailRoute(ideaActionCard.contentId, 'roteiro'), detailBackState);
              setIdeaActionCard(null);
            }}
            onClose={() => setIdeaActionCard(null)}
          />
        ) : null}
      </Dialog>
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

      <RhythmDiagnosis violations={violations} />

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

function ProgramacaoHelpButton() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <AppButton
        variant="ghost"
        size="xs"
        iconOnly
        aria-label="Como programar"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
      >
        <CircleHelp className="h-4 w-4" />
      </AppButton>
      {open ? (
        <div
          role="tooltip"
          className="absolute left-0 top-full z-20 mt-1 w-64 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-dropdown)]"
        >
          <Text variant="body">
            Toque num dia para escolher o roteiro, ou selecione um roteiro e depois o dia. O horário você define depois.
          </Text>
        </div>
      ) : null}
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
        A ideia fica no dia escolhido. Depois você pode transformá-la em roteiro ou mantê-la só como referência.
      </p>

      <div>
        <label className="text-sm font-medium text-[var(--text-secondary)]">Título da ideia</label>
        <input
          autoFocus
          type="text"
          value={title}
          onChange={event => setTitle(event.target.value)}
          placeholder="Ex.: 3 sinais de que…"
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
        Transformar em roteiro
      </AppButton>
      <AppButton variant="secondary" fullWidth leftIcon={<Eye className="h-4 w-4" />} onClick={onPreview}>
        Pré-visualizar
      </AppButton>
      <button
        type="button"
        onClick={onOpen}
        className="min-h-10 w-full text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        Abrir ideia
      </button>
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
  const [page, setPage] = useState(1);
  const pageSize = 12;

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

  const totalPages = Math.max(1, Math.ceil(filteredCards.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedCards = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCards.slice(start, start + pageSize);
  }, [currentPage, filteredCards, pageSize]);

  const platformGroups = useMemo(() => {
    const map = new Map<string, ProgramacaoCard[]>();
    pagedCards.forEach(card => {
      const list = map.get(card.platformName) || [];
      list.push(card);
      map.set(card.platformName, list);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
  }, [pagedCards]);

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
          <ToolbarSearchInput
            value={search}
            onChange={value => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Buscar na fila…"
            size="compact"
            className="filter-bar-search--fluid min-w-[min(100%,220px)] md:max-w-xs"
          />
        ) : null}

        {isDropTarget ? (
          <Text variant="meta" as="span" className="ml-auto text-[var(--accent-blue)]">
            Solte para tirar do calendário
          </Text>
        ) : null}
      </div>

      {!expanded ? null : cards.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-tertiary)]">
          Roteiros prontos e sem data aparecem aqui. Ideias ficam nos dias da grade.
        </p>
      ) : filteredCards.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-tertiary)]">
          Nenhum roteiro corresponde a &ldquo;{search.trim()}&rdquo;.
        </p>
      ) : (
        <div className="mt-3 max-h-[min(28vh,240px)] stack-md overflow-y-auto pr-1">
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
                cards={pagedCards}
                selectedKey={selectedKey}
                onSelect={onSelect}
                onPreview={onPreview}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            )}
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredCards.length}
            pageSize={pageSize}
            onPageChange={setPage}
            variant="simple"
            itemLabel="roteiros"
          />
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

  const cardBody = compact ? (
    <>
      <div className="min-w-0 flex-1 space-y-0.5">
        {card.time ? (
          <span className="block text-2xs font-bold tabular-nums text-[var(--text-primary)]">{card.time}</span>
        ) : card.date && !locked && !isIdeiaCard(card) ? (
          <span className="block text-2xs font-semibold text-[var(--info)]">Definir horário</span>
        ) : null}
        <span className="block break-words text-xs font-semibold leading-snug text-[var(--text-primary)]">
          {card.title}
        </span>
        <span className={cn('inline-flex rounded-md border px-1.5 py-0.5 text-2xs font-bold leading-none', statusClass)}>
          {card.status}
        </span>
        {card.publicationKind === 'repost' ? (
          <span className="inline-flex rounded border border-[var(--border-color)] bg-[var(--bg-hover)] px-1.5 py-0.5 text-2xs font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
            Repostagem
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
      <span className={cn('shrink-0 rounded-md border px-1.5 py-0.5 text-2xs font-bold leading-none', statusClass)}>
        {card.status}
      </span>
      {card.time ? <span className="shrink-0 font-bold tabular-nums text-[var(--text-primary)]">{card.time}</span> : card.date && !locked && !isIdeiaCard(card) ? (
        <span className="shrink-0 text-2xs font-semibold text-[var(--info)]">Definir horário</span>
      ) : null}
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
          'group flex min-h-10 items-start gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/35',
          statusClass,
          draggableEnabled && 'cursor-grab active:cursor-grabbing',
          selected && 'ring-2 ring-[var(--text-primary)]',
          locked && 'opacity-75',
        )}
        title={
          card.date && !card.time && !locked && !isIdeiaCard(card)
            ? `${card.title} — toque para definir o horário`
            : `${card.title} — ${card.platformName} · ${card.status}`
        }
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
        'group flex min-h-[76px] items-stretch gap-2 rounded-lg border p-2 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/35',
        statusClass,
        draggableEnabled && 'cursor-grab active:cursor-grabbing',
        selected && 'ring-2 ring-[var(--text-primary)]',
        locked && 'opacity-75',
      )}
      title={
        card.date && !card.time && !locked && !isIdeiaCard(card)
          ? `${card.title} — toque para definir o horário`
          : `${card.title} — ${card.platformName} · ${card.status}`
      }
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
  rhythmTone: DayRhythmTone | 'risk' | null;
  canReceive: boolean;
  isPicking: boolean;
  backlogCards: ProgramacaoCard[];
  onPickBacklog: (key: string) => void;
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

function DayBacklogSelect({
  cards,
  onPick,
}: {
  cards: ProgramacaoCard[];
  onPick: (key: string) => void;
}) {
  return (
    <label className="block" onClick={event => event.stopPropagation()}>
      <span className="sr-only">Escolher roteiro pronto</span>
      <select
        autoFocus
        defaultValue=""
        disabled={cards.length === 0}
        onChange={event => {
          const key = event.target.value;
          if (key) onPick(key);
        }}
        className="filter-bar-select h-9 w-full bg-[var(--bg-elevated)] text-xs"
      >
        <option value="">{cards.length === 0 ? 'Nenhum roteiro pronto' : 'Escolher roteiro…'}</option>
        {cards.map(card => (
          <option key={card.key} value={card.key}>
            {card.title} · {card.platformName}
          </option>
        ))}
      </select>
    </label>
  );
}

function EmptyDayAffordance({emphasize = false}: {emphasize?: boolean}) {
  return (
    <div
      aria-hidden
      className={cn(
        'flex min-h-16 flex-1 items-center justify-center text-[var(--text-tertiary)] opacity-0 transition-opacity duration-150 group-hover:opacity-100',
        emphasize && 'text-[var(--accent-blue)] opacity-40',
      )}
    >
      <Plus className="h-4 w-4" strokeWidth={1.75} />
    </div>
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
        title="Registrar vídeo postado"
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
  rhythmTone,
  canReceive,
  isPicking,
  backlogCards,
  onPickBacklog,
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
        'group relative flex min-w-0 cursor-pointer flex-col rounded-[var(--radius-card-mobile)] border bg-[var(--bg-secondary)] p-2 transition-colors max-md:w-[168px] max-md:shrink-0 md:min-h-[min(36vh,380px)]',
        isDropTarget && hasViolationWarning
          ? 'border-[var(--warning)] bg-[var(--warning-bg)] ring-2 ring-[var(--warning)]/40'
          : isDropTarget
            ? 'border-[var(--accent-blue)] bg-[color-mix(in_srgb,var(--accent-blue),transparent_90%)] ring-2 ring-[var(--accent-blue)]/20'
              : rhythmTone === 'over' || rhythmTone === 'risk'
              ? 'border-[var(--warning)] bg-[var(--warning-bg)]'
              : isToday
                  ? 'border-[var(--accent-blue)]/50'
                  : 'border-[var(--border-color)]',
        canReceive && 'hover:border-[var(--accent-blue)]/50',
        isPicking && 'border-[var(--accent-blue)] ring-2 ring-[var(--accent-blue)]/30',
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
        {isPicking ? <DayBacklogSelect cards={backlogCards} onPick={onPickBacklog} /> : null}
        {cards.length === 0 && projetoMarkers.length === 0 && !isPicking && !isDropTarget ? (
          <EmptyDayAffordance emphasize={canReceive} />
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
  quotasForWeek: (weekStart: Date) => WeekRhythmQuota[];
  scheduledByDate: Map<string, ProgramacaoCard[]>;
  projetoPublicacaoByDate: Map<string, ProjetoPublicacaoMarker[]>;
  dragOverDay: string | null;
  hasSelection: boolean;
  pickerDayKey: string | null;
  backlogCards: ProgramacaoCard[];
  onPickBacklog: (key: string) => void;
  onDragOverDay: (key: string | null) => void;
  hasDayViolationWarning: (dayKey: string) => boolean;
  dayTone: (dayKey: string) => DayRhythmTone | 'risk' | null;
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

function MonthGrid({
  anchorDate,
  quotasForWeek,
  scheduledByDate,
  projetoPublicacaoByDate,
  dragOverDay,
  hasSelection,
  pickerDayKey,
  backlogCards,
  onPickBacklog,
  onDragOverDay,
  hasDayViolationWarning,
  dayTone,
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
      weekAsideLabel="Ritmo"
      renderWeekAside={weekStartDate => <WeekRhythmRail quotas={quotasForWeek(weekStartDate)} />}
      getDayClassName={({dateKey, inMonth}) => {
        const isDropTarget = dragOverDay === dateKey;
        const violationWarning = isDropTarget && hasDayViolationWarning(dateKey);
        const rhythmTone = dayTone(dateKey);
        return cn(
          'group relative',
          violationWarning &&
            '!border-[var(--warning)] !bg-[var(--warning-bg)] ring-2 ring-[var(--warning)]/40',
          isDropTarget &&
            !violationWarning &&
            '!border-[var(--accent-blue)] !bg-[color-mix(in_srgb,var(--accent-blue),transparent_90%)] ring-2 ring-[var(--accent-blue)]/20',
          !isDropTarget && (rhythmTone === 'over' || rhythmTone === 'risk') &&
            '!border-[var(--warning)] !bg-[var(--warning-bg)]',
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
            {pickerDayKey === dayProps.dateKey ? (
              <DayBacklogSelect cards={backlogCards} onPick={onPickBacklog} />
            ) : null}
            {isEmpty && pickerDayKey !== dayProps.dateKey && dragOverDay !== dayProps.dateKey ? (
              <EmptyDayAffordance emphasize={hasSelection} />
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

interface CardPreviewContentProps {
  card: ProgramacaoCard;
  content: Content | null;
}

function CardPreviewContent({card, content}: CardPreviewContentProps) {
  const color = getPlatformColor(card.platformName);
  const scriptText = htmlToReadableText(content?.script || '');
  const paragraphs = scriptText.split(/\n\n+/).filter(Boolean);

  return (
    <div className="stack-lg">
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
      <Text variant="sectionTitle">{card.title}</Text>
      {card.date ? (
        <p className="text-sm font-medium capitalize text-[var(--text-secondary)]">
          {format(new Date(`${card.date}T12:00:00`), "EEEE, d 'de' MMMM", {locale: ptBR})}
          {card.time ? ` · ${card.time}` : ' · sem horário'}
        </p>
      ) : null}

      <div className="stack-xl">
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

interface MobileDatePickerSheetProps {
  anchorDate: Date;
  selectedBacklogKey: string | null;
  backlogCards: ProgramacaoCard[];
  scheduledByDate: Map<string, ProgramacaoCard[]>;
  projetoPublicacaoByDate: Map<string, ProjetoPublicacaoMarker[]>;
  onSelectDay: (dayKey: string) => void;
  onClose: () => void;
}

function MobileDatePickerSheet({
  anchorDate,
  selectedBacklogKey,
  backlogCards,
  scheduledByDate,
  projetoPublicacaoByDate,
  onSelectDay,
  onClose,
}: MobileDatePickerSheetProps) {
  const [pickerMonth, setPickerMonth] = useState(startOfMonth(anchorDate));
  const selectedCard = selectedBacklogKey
    ? backlogCards.find(card => card.key === selectedBacklogKey) ?? null
    : null;

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(pickerMonth), {weekStartsOn: 1}),
    end: endOfWeek(endOfMonth(pickerMonth), {weekStartsOn: 1}),
  });

  return (
    <div className="stack-lg p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-secondary)]">Escolher data</p>
          {selectedCard ? (
            <p className="mt-1 text-base font-semibold text-[var(--text-primary)]">{selectedCard.title}</p>
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

      <div className="flex items-center justify-center gap-1">
        <button
          type="button"
          onClick={() => setPickerMonth(month => subMonths(month, 1))}
          className="flex min-h-10 min-w-10 items-center justify-center rounded-lg hover:bg-[var(--bg-hover)]"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[120px] text-center text-sm font-semibold capitalize text-[var(--text-primary)]">
          {format(pickerMonth, 'MMMM yyyy', {locale: ptBR})}
        </span>
        <button
          type="button"
          onClick={() => setPickerMonth(month => addMonths(month, 1))}
          className="flex min-h-10 min-w-10 items-center justify-center rounded-lg hover:bg-[var(--bg-hover)]"
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((label, index) => (
          <div key={index} className="py-1 text-center text-2xs font-semibold text-[var(--text-tertiary)]">
            {label}
          </div>
        ))}
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd');
          const inMonth = isSameMonth(day, pickerMonth);
          const count =
            (scheduledByDate.get(key)?.length || 0) + (projetoPublicacaoByDate.get(key)?.length || 0);
          return (
            <button
              key={key}
              type="button"
              disabled={!selectedCard}
              onClick={() => onSelectDay(key)}
              className={cn(
                'flex min-h-11 flex-col items-center justify-center rounded-lg border text-xs font-semibold transition-colors',
                inMonth
                  ? 'border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--accent-blue)]'
                  : 'border-transparent text-[var(--text-tertiary)]',
                !selectedCard && 'opacity-40',
              )}
            >
              {format(day, 'd')}
              {count > 0 ? <span className="mt-0.5 h-1 w-1 rounded-full bg-[var(--accent-blue)]" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
