import {useMemo, useState} from 'react';
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {AlertTriangle, CalendarClock, ChevronLeft, ChevronRight, Clock, Eye, GripVertical, Info, X} from 'lucide-react';
import {BottomSheetModal} from '../../../components/feedback/modals/BottomSheetModal';
import {useAppContext} from '../../../context/AppContext';
import {PageLayout} from '../../../layouts/page/PageLayout';
import type {Content} from '../../../lib/database';
import {cn, htmlToReadableText} from '../../../lib/utils';
import {validateWeeklyContent, type Violation} from '../../../utils/goldenRules';
import {getPostingTimes} from '../../settings/lib/postingTimes';
import type {Weekday} from '../../settings/lib/postingTimes';
import {getTimesForDay} from '../../settings/lib/postingTimes';
import {
  applyScheduleToContent,
  applyUnscheduleToContent,
  buildProgramacaoCards,
  getPlatformColor,
  isBacklogCard,
  isCardLocked,
  type ProgramacaoCard,
} from '../lib/programacao';

type ProgramacaoView = 'week' | 'month';

const DRAG_MIME = 'application/x-programacao-card';
const BACKLOG_DROP_KEY = '__backlog__';

function dateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
  const [viewMode, setViewMode] = useState<ProgramacaoView>('week');
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [selectedBacklogKey, setSelectedBacklogKey] = useState<string | null>(null);
  const [previewCard, setPreviewCard] = useState<ProgramacaoCard | null>(null);
  const [timePickerCard, setTimePickerCard] = useState<ProgramacaoCard | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

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

  const cards = useMemo(
    () => (platformFilter === 'all' ? allCards : allCards.filter(card => card.platformName === platformFilter)),
    [allCards, platformFilter],
  );

  const backlogCards = useMemo(() => cards.filter(isBacklogCard), [cards]);

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

  const weekStart = startOfWeek(anchorDate, {locale: ptBR});
  const weekDays = eachDayOfInterval({start: weekStart, end: endOfWeek(anchorDate, {locale: ptBR})});

  const weekViolations = useMemo(
    () => validateWeeklyContent(state.contents, weekStart, undefined, state.goldenRules),
    [state.contents, state.goldenRules, weekStart],
  );

  const scheduleCard = (card: ProgramacaoCard, dayKey: string) => {
    const content = state.contents.find(item => item.id === card.contentId);
    if (!content || isCardLocked(card)) return;

    // Mover entre dias preserva o horário escolhido; vindo do backlog, ainda não há horário.
    const time = card.date ? card.time : null;
    const updated: Content = applyScheduleToContent(content, card.platformId, dayKey, time);
    dispatch({type: 'UPDATE_CONTENT', payload: updated});
    setSelectedBacklogKey(null);

    // Vindo do backlog: abre a escolha de horário (cadastrados ou livre).
    if (!card.date) {
      setTimePickerCard({...card, date: dayKey, time: null});
    }
  };

  const applyTime = (card: ProgramacaoCard, time: string | null) => {
    const content = state.contents.find(item => item.id === card.contentId);
    if (!content || !card.date) return;
    dispatch({type: 'UPDATE_CONTENT', payload: applyScheduleToContent(content, card.platformId, card.date, time)});
    setTimePickerCard(null);
  };

  const openTimePicker = (card: ProgramacaoCard) => {
    if (isCardLocked(card) || !card.date) return;
    setTimePickerCard(card);
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

  const navigate = (direction: -1 | 1) => {
    setAnchorDate(date =>
      viewMode === 'week'
        ? direction === 1 ? addWeeks(date, 1) : subWeeks(date, 1)
        : direction === 1 ? addMonths(date, 1) : subMonths(date, 1),
    );
  };

  const headerLabel =
    viewMode === 'week'
      ? `${format(weekStart, "d 'de' MMM", {locale: ptBR})} – ${format(addDays(weekStart, 6), "d 'de' MMM 'de' yyyy", {locale: ptBR})}`
      : capitalizeFirst(format(anchorDate, "MMMM 'de' yyyy", {locale: ptBR}));

  return (
    <PageLayout contentWidth="full" className="min-h-full">
      <div className="mx-auto max-w-[1760px] space-y-3">
        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-5 w-5 text-[var(--text-secondary)]" />
            <div>
              <h1 className="text-xl font-semibold text-[var(--text-primary)]">Programação</h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Arraste um vídeo pronto para um dia, ou toque no vídeo e depois no dia.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1">
              {(['week', 'month'] as ProgramacaoView[]).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'min-h-9 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors',
                    viewMode === mode
                      ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                  )}
                >
                  {mode === 'week' ? 'Semana' : 'Mês'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex min-h-10 min-w-10 items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                aria-label="Anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setAnchorDate(new Date())}
                className="min-h-10 rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1.5 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => navigate(1)}
                className="flex min-h-10 min-w-10 items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                aria-label="Próximo"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <span className="text-sm font-semibold text-[var(--text-primary)] md:text-base">{headerLabel}</span>
          </div>
        </div>

        {/* Filtros fixos por plataforma */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPlatformFilter('all')}
            className={cn(
              'min-h-9 rounded-full border px-3 py-1 text-sm font-semibold transition-colors',
              platformFilter === 'all'
                ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            )}
          >
            Todas
          </button>
          {platformNames.map(name => {
            const color = getPlatformColor(name);
            const active = platformFilter === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setPlatformFilter(active ? 'all' : name)}
                className={cn(
                  'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold transition-all',
                  active ? cn(color.chip, 'ring-2 ring-[var(--text-primary)]/20') : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                )}
              >
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{backgroundColor: color.dot}}>
                  {platformInitials(name)}
                </span>
                {name}
              </button>
            );
          })}
        </div>

        {/* Regras de ouro da semana visível */}
        {viewMode === 'week' && weekViolations.length > 0 ? (
          <GoldenRulesStrip violations={weekViolations} />
        ) : null}

        {/* Backlog horizontal + calendário */}
        <div className="space-y-3">
          <BacklogPanel
            cards={backlogCards}
            selectedKey={selectedBacklogKey}
            isDropTarget={dragOverDay === BACKLOG_DROP_KEY}
            onSelect={key => setSelectedBacklogKey(current => (current === key ? null : key))}
            onPreview={setPreviewCard}
            onDragOver={event => {
              event.preventDefault();
              setDragOverDay(BACKLOG_DROP_KEY);
            }}
            onDragLeave={() => setDragOverDay(current => (current === BACKLOG_DROP_KEY ? null : current))}
            onDrop={handleBacklogDrop}
          />

          {viewMode === 'week' ? (
            <div className="flex gap-2 overflow-x-auto pb-3">
              {weekDays.map(day => {
                const key = dateKey(day);
                const dayCards = scheduledByDate.get(key) || [];
                const times = getTimesForDay(postingTimes, getDay(day) as Weekday);
                const usedTimes = dayCards.map(card => card.time).filter(Boolean) as string[];
                return (
                  <DayColumn
                    key={key}
                    day={day}
                    dayKey={key}
                    cards={dayCards}
                    times={times}
                    usedTimes={usedTimes}
                    isToday={isSameDay(day, new Date())}
                    isDropTarget={dragOverDay === key}
                    canReceive={Boolean(selectedBacklogKey)}
                    onDragOver={event => {
                      event.preventDefault();
                      setDragOverDay(key);
                    }}
                    onDragLeave={() => setDragOverDay(current => (current === key ? null : current))}
                    onDrop={event => handleDrop(event, key)}
                    onClick={() => handleDayClick(key)}
                    onPreview={setPreviewCard}
                    onCardClick={openTimePicker}
                  />
                );
              })}
            </div>
          ) : (
            <MonthGrid
              anchorDate={anchorDate}
              scheduledByDate={scheduledByDate}
              contents={state.contents}
              goldenRules={state.goldenRules}
              dragOverDay={dragOverDay}
              hasSelection={Boolean(selectedBacklogKey)}
              onDragOverDay={setDragOverDay}
              onDrop={handleDrop}
              onDayClick={handleDayClick}
              onPreview={setPreviewCard}
              onCardClick={openTimePicker}
            />
          )}
        </div>
      </div>

      {/* Modal de visualização (somente leitura) */}
      <BottomSheetModal open={Boolean(previewCard)} onClose={() => setPreviewCard(null)} desktopMaxW="max-w-2xl">
        {previewCard ? (
          <CardPreview
            card={previewCard}
            content={state.contents.find(item => item.id === previewCard.contentId) || null}
            onClose={() => setPreviewCard(null)}
          />
        ) : null}
      </BottomSheetModal>

      {/* Escolha de horário (cadastrados ou livre) */}
      <BottomSheetModal open={Boolean(timePickerCard)} onClose={() => setTimePickerCard(null)} desktopMaxW="max-w-sm">
        {timePickerCard ? (
          <TimePickerSheet
            card={timePickerCard}
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
            onClose={() => setTimePickerCard(null)}
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
  onSelect: (time: string | null) => void;
  onClose: () => void;
}

function TimePickerSheet({card, configuredTimes, usedTimes, onSelect, onClose}: TimePickerSheetProps) {
  const [customTime, setCustomTime] = useState(card.time ?? '');
  const color = getPlatformColor(card.platformName);

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-secondary)]">
            Horário de postagem
          </p>
          <p className="mt-1 flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
            <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{backgroundColor: color.dot}}>
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

function GoldenRulesStrip({violations}: {violations: Violation[]}) {
  return (
    <div className="space-y-2 rounded-[var(--radius-card-mobile)] border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
      {violations.map((violation, index) => (
        <div key={`${violation.ruleId}-${index}`} className="flex items-start gap-2 text-sm font-medium">
          {violation.type === 'warning' ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          ) : (
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
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
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent) => void;
}

function BacklogPanel({cards, selectedKey, isDropTarget, onSelect, onPreview, onDragOver, onDragLeave, onDrop}: BacklogPanelProps) {
  return (
    <section
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        'rounded-[var(--radius-card-mobile)] border bg-[var(--bg-secondary)] px-3 py-2.5 transition-colors',
        isDropTarget
          ? 'border-[var(--accent-blue)] bg-[color-mix(in_srgb,var(--accent-blue),transparent_92%)]'
          : 'border-[var(--border-color)]',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">
          Prontos para programar
          <span className="rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-xs font-bold text-[var(--text-secondary)]">
            {cards.length}
          </span>
        </p>
        <p className="hidden max-w-3xl text-sm text-[var(--text-tertiary)] md:block">
          {isDropTarget
            ? 'Solte aqui para tirar do calendário.'
            : 'Vídeos gravados e editados, sem data — arraste para um dia ou toque e escolha o dia. Arraste de volta para desagendar.'}
        </p>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {cards.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-tertiary)]">
            Nada por aqui. Marque um conteúdo como Gravado ou Editado para ele aparecer.
          </p>
        ) : (
          cards.map(card => (
            <div key={card.key} className="w-[260px] shrink-0">
              <ProgramacaoCardChip
                card={card}
                draggable
                selected={selectedKey === card.key}
                onClick={() => onSelect(card.key)}
                onPreview={() => onPreview(card)}
              />
            </div>
          ))
        )}
      </div>
    </section>
  );
}

interface ProgramacaoCardChipProps {
  card: ProgramacaoCard;
  draggable?: boolean;
  selected?: boolean;
  compact?: boolean;
  onClick?: () => void;
  onPreview: () => void;
}

function ProgramacaoCardChip({card, draggable = false, selected = false, compact = false, onClick, onPreview}: ProgramacaoCardChipProps) {
  const color = getPlatformColor(card.platformName);
  const locked = isCardLocked(card);

  if (compact) {
    return (
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        draggable={draggable && !locked}
        onDragStart={event => {
          event.dataTransfer.setData(DRAG_MIME, card.key);
          event.dataTransfer.setData('text/plain', card.key);
          event.dataTransfer.effectAllowed = 'move';
        }}
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
          'group flex min-h-10 items-center gap-1.5 rounded-md border bg-[var(--bg-elevated)] px-2 py-1.5 text-xs transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/35',
          'border-l-4 border-[var(--border-color)]',
          draggable && !locked && 'cursor-grab active:cursor-grabbing',
          selected && 'ring-2 ring-[var(--text-primary)]',
          locked && 'opacity-60',
        )}
        style={{borderLeftColor: color.dot}}
        title={`${card.title} — ${card.platformName}`}
      >
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
      </div>
    );
  }

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      draggable={draggable && !locked}
      onDragStart={event => {
        event.dataTransfer.setData(DRAG_MIME, card.key);
        event.dataTransfer.setData('text/plain', card.key);
        event.dataTransfer.effectAllowed = 'move';
      }}
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
        'group flex min-h-[76px] items-stretch gap-2 rounded-lg border bg-[var(--bg-elevated)] p-2 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/35',
        'border-l-4 border-[var(--border-color)]',
        draggable && !locked && 'cursor-grab active:cursor-grabbing',
        selected && 'ring-2 ring-[var(--text-primary)]',
        locked && 'opacity-60',
      )}
      style={{borderLeftColor: color.dot}}
      title={`${card.title} — ${card.platformName}`}
    >
      {draggable && !locked ? (
        <div className="flex items-center text-[var(--text-tertiary)]">
          <GripVertical className="h-4 w-4 shrink-0 opacity-50" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5">
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{backgroundColor: color.dot}}>
            {platformInitials(card.platformName)}
          </span>
          <span className="truncate text-xs font-semibold text-[var(--text-secondary)]">{card.platformName}</span>
          {card.time ? (
            <span className="ml-auto shrink-0 rounded-md bg-[var(--bg-hover)] px-1.5 py-0.5 text-xs font-bold tabular-nums text-[var(--text-primary)]">
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

interface DayColumnProps {
  day: Date;
  dayKey: string;
  cards: ProgramacaoCard[];
  times: string[];
  usedTimes: string[];
  isToday: boolean;
  isDropTarget: boolean;
  canReceive: boolean;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent) => void;
  onClick: () => void;
  onPreview: (card: ProgramacaoCard) => void;
  onCardClick: (card: ProgramacaoCard) => void;
}

function DayColumn({
  day,
  cards,
  times,
  usedTimes,
  isToday,
  isDropTarget,
  canReceive,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  onPreview,
  onCardClick,
}: DayColumnProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      className={cn(
        'flex min-h-[58vh] w-[264px] shrink-0 flex-col rounded-[var(--radius-card-mobile)] border bg-[var(--bg-secondary)] p-3 transition-colors',
        isDropTarget
          ? 'border-[var(--accent-blue)] bg-[color-mix(in_srgb,var(--accent-blue),transparent_90%)] ring-2 ring-[var(--accent-blue)]/20'
          : isToday
            ? 'border-[var(--accent-blue)]/50'
            : 'border-[var(--border-color)]',
        canReceive && 'cursor-pointer hover:border-[var(--accent-blue)]/50',
      )}
    >
      {/* Cabeçalho do dia: nome + horários cadastrados */}
      <div className={cn('rounded-lg border border-transparent px-2 py-2', isToday && 'border-[var(--accent-blue)]/15 bg-[color-mix(in_srgb,var(--accent-blue),transparent_92%)]')}>
        <div className="flex items-baseline gap-2">
          <p className={cn('text-2xl font-bold leading-none', isToday ? 'text-[var(--accent-blue)]' : 'text-[var(--text-primary)]')}>
            {format(day, 'd')}
          </p>
          <p className="text-sm font-semibold capitalize text-[var(--text-secondary)]">
            {format(day, 'EEE', {locale: ptBR})}
            {isToday ? ' · hoje' : ''}
          </p>
        </div>
        {times.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {times.map(time => {
              const filled = usedTimes.includes(time);
              return (
                <span
                  key={time}
                  className={cn(
                    'inline-flex min-h-7 items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-bold tabular-nums',
                    filled
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-400'
                      : 'border-[var(--border-color)] text-[var(--text-tertiary)]',
                  )}
                  title={filled ? `${time} — ocupado` : `${time} — livre`}
                >
                  <Clock className="h-2.5 w-2.5" />
                  {time}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="mt-1.5 text-sm text-[var(--text-tertiary)] opacity-80">sem horário cadastrado</p>
        )}
      </div>

      {/* Cards do dia */}
      <div className="mt-3 flex-1 space-y-2 rounded-lg bg-[var(--bg-primary)]/60 p-2">
        {cards.map(card => (
          <ProgramacaoCardChip
            key={card.key}
            card={card}
            draggable
            onClick={() => onCardClick(card)}
            onPreview={() => onPreview(card)}
          />
        ))}
        {isDropTarget ? (
          <div className="flex min-h-20 items-center justify-center rounded-lg border-2 border-dashed border-[var(--accent-blue)]/60 bg-[color-mix(in_srgb,var(--accent-blue),transparent_88%)] px-3 py-4 text-center text-sm font-semibold text-[var(--accent-blue)]">
            Solte aqui para programar neste dia
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface MonthGridProps {
  anchorDate: Date;
  scheduledByDate: Map<string, ProgramacaoCard[]>;
  contents: Content[];
  goldenRules: import('../../../lib/database').GoldenRule[];
  dragOverDay: string | null;
  hasSelection: boolean;
  onDragOverDay: (key: string | null) => void;
  onDrop: (event: React.DragEvent, dayKey: string) => void;
  onDayClick: (dayKey: string) => void;
  onPreview: (card: ProgramacaoCard) => void;
  onCardClick: (card: ProgramacaoCard) => void;
}

function MonthGrid({
  anchorDate,
  scheduledByDate,
  contents,
  goldenRules,
  dragOverDay,
  hasSelection,
  onDragOverDay,
  onDrop,
  onDayClick,
  onPreview,
  onCardClick,
}: MonthGridProps) {
  const gridStart = startOfWeek(startOfMonth(anchorDate), {locale: ptBR});
  const gridEnd = endOfWeek(endOfMonth(anchorDate), {locale: ptBR});
  const days = eachDayOfInterval({start: gridStart, end: gridEnd});
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div className="overflow-x-auto pb-2">
      <div className="min-w-[760px] space-y-1.5">
      <div className="grid grid-cols-7 gap-1.5 px-1">
        {weeks[0].map(day => (
          <p key={day.toISOString()} className="text-center text-xs font-semibold text-[var(--text-tertiary)]">
            {format(day, 'EEEEEE', {locale: ptBR})}
          </p>
        ))}
      </div>

      {weeks.map(week => {
        const violations = validateWeeklyContent(contents, week[0], undefined, goldenRules);
        const warnings = violations.filter(violation => violation.type === 'warning');
        return (
          <div key={week[0].toISOString()} className="relative">
            {violations.length > 0 ? (
              <span
                className={cn(
                  'absolute -left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm',
                  warnings.length > 0 ? 'bg-amber-500' : 'bg-sky-500',
                )}
                title={violations.map(violation => violation.message).join('\n')}
              >
                {violations.length}
              </span>
            ) : null}
            <div className="grid grid-cols-7 gap-1.5">
              {week.map(day => {
                const key = dateKey(day);
                const dayCards = scheduledByDate.get(key) || [];
                const inMonth = isSameMonth(day, anchorDate);
                return (
                  <div
                    key={key}
                    onDragOver={event => {
                      event.preventDefault();
                      onDragOverDay(key);
                    }}
                    onDragLeave={() => onDragOverDay(null)}
                    onDrop={event => onDrop(event, key)}
                    onClick={() => onDayClick(key)}
                    className={cn(
                      'min-h-[112px] rounded-lg border p-2 transition-colors',
                      dragOverDay === key
                        ? 'border-[var(--accent-blue)] bg-[color-mix(in_srgb,var(--accent-blue),transparent_90%)] ring-2 ring-[var(--accent-blue)]/20'
                        : 'border-[var(--border-color)] bg-[var(--bg-secondary)]',
                      !inMonth && 'opacity-45',
                      hasSelection && 'cursor-pointer hover:border-[var(--accent-blue)]/50',
                    )}
                  >
                    <p
                      className={cn(
                        'text-sm font-bold',
                        isSameDay(day, new Date()) ? 'text-[var(--accent-blue)]' : 'text-[var(--text-tertiary)]',
                      )}
                    >
                      {format(day, 'd')}
                    </p>
                    <div className="mt-2">
                      <MonthDaySummary
                        cards={dayCards}
                        onCardClick={onCardClick}
                        onPreview={onPreview}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

function MonthDaySummary({
  cards,
  onCardClick,
  onPreview,
}: {
  cards: ProgramacaoCard[];
  onCardClick: (card: ProgramacaoCard) => void;
  onPreview: (card: ProgramacaoCard) => void;
}) {
  if (cards.length === 0) {
    return <p className="text-xs text-[var(--text-tertiary)]">Livre</p>;
  }

  const byPlatform = new Map<string, {count: number; color: string}>();
  cards.forEach(card => {
    const current = byPlatform.get(card.platformName);
    if (current) {
      current.count += 1;
      return;
    }
    byPlatform.set(card.platformName, {count: 1, color: getPlatformColor(card.platformName).dot});
  });

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={event => {
          event.stopPropagation();
          onCardClick(cards[0]);
        }}
        className="flex min-h-9 w-full items-center justify-between rounded-md bg-[var(--bg-hover)] px-2 text-left text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-primary)]"
      >
        <span>{cards.length} post{cards.length > 1 ? 's' : ''}</span>
        <span className="text-[var(--text-tertiary)]">{cards[0].time || 'ver'}</span>
      </button>
      <button
        type="button"
        onClick={event => {
          event.stopPropagation();
          onPreview(cards[0]);
        }}
        className="flex min-h-8 w-full items-center justify-center gap-1 rounded-md border border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
      >
        <Eye className="h-4 w-4" />
        Preview
      </button>
      <div className="flex flex-wrap gap-1">
        {Array.from(byPlatform).slice(0, 4).map(([platformName, item]) => (
          <span
            key={platformName}
            className="inline-flex min-h-6 items-center gap-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-elevated)] px-1.5 text-xs font-bold text-[var(--text-secondary)]"
            title={`${platformName}: ${item.count}`}
          >
            <span className="h-2 w-2 rounded-full" style={{backgroundColor: item.color}} />
            {item.count}
          </span>
        ))}
        {byPlatform.size > 4 ? (
          <span className="inline-flex min-h-6 items-center rounded-full border border-[var(--border-color)] px-1.5 text-xs font-bold text-[var(--text-tertiary)]">
            +{byPlatform.size - 4}
          </span>
        ) : null}
      </div>
    </div>
  );
}

interface CardPreviewProps {
  card: ProgramacaoCard;
  content: Content | null;
  onClose: () => void;
}

function CardPreview({card, content, onClose}: CardPreviewProps) {
  const color = getPlatformColor(card.platformName);
  const scriptText = htmlToReadableText(content?.script || '');
  const paragraphs = scriptText.split(/\n\n+/).filter(Boolean);

  return (
    <div className="max-h-[80vh] overflow-y-auto p-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-sm font-semibold', color.chip)}>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{backgroundColor: color.dot}}>
                {platformInitials(card.platformName)}
              </span>
              {card.platformName}
            </span>
            <span className="inline-flex min-h-8 items-center rounded-full border border-[var(--border-color)] px-3 text-sm font-semibold text-[var(--text-secondary)]">
              {card.status}
            </span>
          </div>
          <h2 className="mt-3 text-xl font-semibold leading-tight text-[var(--text-primary)]">{card.title}</h2>
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

      <div className="mt-5 space-y-5">
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
            <div className="mt-3 max-w-prose space-y-3">
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
