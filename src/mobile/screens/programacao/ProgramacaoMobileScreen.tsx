import {useMemo, useState, type ReactNode} from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Inbox,
  Lightbulb,
  Plus,
} from 'lucide-react';
import {CalendarPeriodNav} from '../../../components/calendar';
import {AppButton} from '../../../components/ui/AppButton';
import {Badge} from '../../../components/ui/Badge';
import {EmptyState} from '../../../components/ui/EmptyState';
import {Surface} from '../../../components/ui/Surface';
import {Text} from '../../../components/ui/Text';
import type {DayRhythmTone, WeekRhythmQuota} from '../../../utils/pilarRhythm';
import {WeekRhythmChips} from '../../../features/programacao/components/WeekRhythmRail';
import {
  getPlatformColor,
  isIdeiaCard,
  platformInitials,
  sortDayCards,
  type ProgramacaoCard,
  type ProjetoPublicacaoMarker,
} from '../../../features/programacao/lib/programacao';
import {getStatusCalendarClass} from '../../../lib/statusClasses';
import {cn} from '../../../lib/utils';
import {MobileListCard} from '../../components/MobileListCard';
import {MobileSearchBar} from '../../components/MobileSearchBar';
import {MobileSectionHeader} from '../../components/MobileSectionHeader';
import {CalendarModeSwitch} from '../../../features/editorial-calendar/components/CalendarModeSwitch';

type ProgramacaoView = 'week' | 'month';

interface ProgramacaoMobileScreenProps {
  viewMode: ProgramacaoView;
  onViewModeChange: (mode: ProgramacaoView) => void;
  anchorDate: Date;
  onAnchorDateChange: (date: Date) => void;
  backlogCards: ProgramacaoCard[];
  selectedBacklogKey: string | null;
  onSelectBacklogCard: (key: string | null) => void;
  scheduledByDate: Map<string, ProgramacaoCard[]>;
  projetoPublicacaoByDate: Map<string, ProjetoPublicacaoMarker[]>;
  weekQuotas: WeekRhythmQuota[];
  dayTone: (dayKey: string) => DayRhythmTone | 'risk' | null;
  onDayClick: (dayKey: string) => void;
  pickerDayKey: string | null;
  onPickBacklog: (key: string) => void;
  onCardClick: (card: ProgramacaoCard) => void;
  onPreview: (card: ProgramacaoCard) => void;
  onAddIdea: (dayKey: string) => void;
  onRegisterPosted: (dayKey: string) => void;
  onOpenProjetoPublicacao: (marker: ProjetoPublicacaoMarker) => void;
  onPickDate: () => void;
  filters?: ReactNode;
}

function dateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function ProgramacaoMobileScreen({
  viewMode,
  onViewModeChange,
  anchorDate,
  onAnchorDateChange,
  backlogCards,
  selectedBacklogKey,
  onSelectBacklogCard,
  scheduledByDate,
  projetoPublicacaoByDate,
  weekQuotas,
  dayTone,
  onDayClick,
  pickerDayKey,
  onPickBacklog,
  onCardClick,
  onPreview,
  onAddIdea,
  onRegisterPosted,
  onOpenProjetoPublicacao,
  onPickDate,
  filters,
}: ProgramacaoMobileScreenProps) {
  const [search, setSearch] = useState('');
  const today = new Date();

  const weekStart = startOfWeek(anchorDate, {weekStartsOn: 1});
  const weekDays = eachDayOfInterval({start: weekStart, end: endOfWeek(anchorDate, {weekStartsOn: 1})});

  const periodDays = useMemo(() => {
    if (viewMode === 'week') return weekDays;
    return eachDayOfInterval({start: startOfMonth(anchorDate), end: endOfMonth(anchorDate)});
  }, [anchorDate, viewMode, weekDays]);

  const filteredBacklog = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return backlogCards;
    return backlogCards.filter(
      card =>
        card.title.toLowerCase().includes(query) ||
        card.platformName.toLowerCase().includes(query),
    );
  }, [backlogCards, search]);

  const selectedBacklogCard = selectedBacklogKey
    ? backlogCards.find(card => card.key === selectedBacklogKey) ?? null
    : null;

  const scheduledGroups = useMemo(() => {
    return periodDays
      .map(day => {
        const key = dateKey(day);
        const cards = sortDayCards(scheduledByDate.get(key) || []);
        const projetoMarkers = projetoPublicacaoByDate.get(key) || [];
        if (cards.length === 0 && projetoMarkers.length === 0) return null;
        return {day, dayKey: key, cards, projetoMarkers};
      })
      .filter((group): group is NonNullable<typeof group> => group !== null);
  }, [periodDays, projetoPublicacaoByDate, scheduledByDate]);

  const scheduledItemCount = scheduledGroups.reduce(
    (sum, group) => sum + group.cards.length + group.projetoMarkers.length,
    0,
  );

  const periodLabel =
    viewMode === 'week'
      ? 'Nesta semana'
      : format(anchorDate, "MMMM 'de' yyyy", {locale: ptBR});

  return (
    <div className="stack-lg px-4 py-4">
      <CalendarModeSwitch variant="mobile" />
      {filters}
      <CalendarPeriodNav
        anchorDate={anchorDate}
        onAnchorDateChange={onAnchorDateChange}
        viewMode={viewMode}
        onViewModeChange={mode => onViewModeChange(mode as ProgramacaoView)}
        weekViewId="week"
        weekStartsOn={1}
        views={[
          {id: 'week', label: 'Semana'},
          {id: 'month', label: 'Mês'},
        ]}
        className="justify-center"
      />

      <WeekRhythmChips quotas={weekQuotas} />

      {selectedBacklogCard ? (
        <Surface variant="outlined" padding="md" className="border-[var(--accent-blue)]/40 bg-[color-mix(in_srgb,var(--accent-blue),transparent_92%)]">
          <div className="stack-sm">
            <Text variant="label" className="text-[var(--accent-blue)]">
              Agendando
            </Text>
            <Text variant="sectionTitle" as="p">
              {selectedBacklogCard.title}
            </Text>
            <div className="flex flex-wrap gap-2 pt-1">
              <AppButton variant="primary" size="sm" onClick={onPickDate}>
                Escolher data
              </AppButton>
              <AppButton variant="secondary" size="sm" onClick={() => onSelectBacklogCard(null)}>
                Cancelar
              </AppButton>
            </div>
          </div>
        </Surface>
      ) : null}

      <section className="stack-md">
        <MobileSectionHeader
          icon={Inbox}
          title="Prontos para programar"
          tone="orange"
          description={
            backlogCards.length === 0
              ? 'Roteiros prontos e sem data aparecem aqui.'
              : `${backlogCards.length} ${backlogCards.length === 1 ? 'roteiro' : 'roteiros'} na fila`
          }
        />

        {backlogCards.length > 6 ? (
          <MobileSearchBar value={search} onChange={setSearch} placeholder="Buscar na fila…" />
        ) : null}

        {filteredBacklog.length === 0 ? (
          <EmptyState
            compact
            title="Fila vazia"
            description={
              search.trim()
                ? `Nenhum roteiro corresponde a “${search.trim()}”.`
                : 'Roteiros prontos e sem data aparecem aqui.'
            }
          />
        ) : (
          <div className="stack-sm">
            {filteredBacklog.map(card => {
              const color = getPlatformColor(card.platformName);
              const selected = selectedBacklogKey === card.key;
              return (
                <MobileListCard
                  key={card.key}
                  eyebrow={card.platformName}
                  title={card.title}
                  description={card.status}
                  onClick={() => onSelectBacklogCard(selected ? null : card.key)}
                  className={cn(selected && 'ring-2 ring-[var(--text-primary)]')}
                  meta={
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{backgroundColor: `${color.dot}18`, color: color.dot}}
                    >
                      {platformInitials(card.platformName)}
                    </span>
                  }
                  status={
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex min-h-6 items-center rounded-[var(--radius-sm)] border px-2 text-2xs font-semibold',
                          getStatusCalendarClass(card.status),
                        )}
                      >
                        {card.status}
                      </span>
                      <button
                        type="button"
                        onClick={event => {
                          event.stopPropagation();
                          onPreview(card);
                        }}
                        className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition-colors active:bg-[var(--bg-hover)]"
                        aria-label="Pré-visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </section>

      {pickerDayKey ? (
        <Surface variant="outlined" padding="md" className="border-[var(--accent-blue)]/40">
          <div className="stack-sm">
            <Text variant="label" className="text-[var(--accent-blue)]">
              {format(new Date(`${pickerDayKey}T12:00:00`), "EEEE, d 'de' MMMM", {locale: ptBR})}
            </Text>
            <label className="block">
              <span className="sr-only">Escolher roteiro pronto</span>
              <select
                autoFocus
                defaultValue=""
                disabled={backlogCards.length === 0}
                onChange={event => {
                  const key = event.target.value;
                  if (key) onPickBacklog(key);
                }}
                className="filter-bar-select h-11 w-full bg-[var(--bg-elevated)]"
              >
                <option value="">
                  {backlogCards.length === 0 ? 'Nenhum roteiro pronto' : 'Escolher entre os prontos…'}
                </option>
                {backlogCards.map(card => (
                  <option key={card.key} value={card.key}>
                    {card.title} · {card.platformName}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Surface>
      ) : null}

      {viewMode === 'week' ? (
        <section className="stack-md">
          <MobileSectionHeader
            icon={CalendarDays}
            title="Dias da semana"
            tone="blue"
          />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {weekDays.map(day => {
              const key = dateKey(day);
              const count =
                (scheduledByDate.get(key)?.length || 0) + (projetoPublicacaoByDate.get(key)?.length || 0);
              const isToday = isSameDay(day, today);
              const canSchedule = Boolean(selectedBacklogKey);
              const tone = dayTone(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onDayClick(key)}
                  className={cn(
                    'flex min-w-[4.5rem] shrink-0 flex-col items-center gap-1 rounded-[var(--radius-card-mobile)] border px-3 py-3 transition-all active:scale-95',
                    tone === 'over' || tone === 'risk'
                      ? 'border-[var(--warning)] bg-[var(--warning-bg)]'
                      : isToday
                          ? 'border-[var(--accent-blue)] bg-[color-mix(in_srgb,var(--accent-blue),transparent_92%)]'
                          : 'border-[var(--border-color)] bg-[var(--bg-secondary)]',
                    canSchedule && tone == null && pickerDayKey !== key && 'ring-1 ring-[var(--accent-blue)]/30',
                    pickerDayKey === key && 'border-[var(--accent-blue)] ring-2 ring-[var(--accent-blue)]/30',
                  )}
                >
                  <span className="text-2xs font-semibold uppercase text-[var(--text-tertiary)]">
                    {format(day, 'EEE', {locale: ptBR})}
                  </span>
                  <Text
                    variant="sectionTitle"
                    as="span"
                    className={cn(isToday ? 'text-[var(--accent-blue)]' : 'text-[var(--text-primary)]')}
                  >
                    {format(day, 'd')}
                  </Text>
                  {count > 0 ? (
                    <span className="rounded-full bg-[var(--bg-hover)] px-1.5 py-0.5 text-2xs font-bold text-[var(--text-secondary)]">
                      {count}
                    </span>
                  ) : (
                    <span className="text-2xs text-[var(--text-tertiary)]">livre</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="flex items-center justify-center gap-1 px-4 pt-4 pb-3">
            <button
              type="button"
              onClick={() => onAnchorDateChange(subMonths(anchorDate, 1))}
              aria-label="Mês anterior"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl transition-all active:scale-90 hover:bg-[var(--bg-hover)]"
            >
              <ChevronLeft className="h-4 w-4 text-[var(--text-tertiary)]" />
            </button>
            <span className="min-w-[120px] text-center text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">
              {format(anchorDate, 'MMM yyyy', {locale: ptBR})}
            </span>
            <button
              type="button"
              onClick={() => onAnchorDateChange(addMonths(anchorDate, 1))}
              aria-label="Próximo mês"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl transition-all active:scale-90 hover:bg-[var(--bg-hover)]"
            >
              <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
            </button>
          </div>

          <div className="grid grid-cols-7 border-t border-[var(--border-color)] bg-[var(--bg-hover)]/30">
            {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((label, index) => (
              <div
                key={index}
                className="py-1.5 text-center text-xs font-semibold text-[var(--text-tertiary)]"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 border-t border-[var(--border-color)]">
            {eachDayOfInterval({
              start: startOfWeek(startOfMonth(anchorDate), {weekStartsOn: 1}),
              end: endOfWeek(endOfMonth(anchorDate), {weekStartsOn: 1}),
            }).map((day, index) => {
              const key = dateKey(day);
              const count =
                (scheduledByDate.get(key)?.length || 0) + (projetoPublicacaoByDate.get(key)?.length || 0);
              const inMonth = isSameMonth(day, anchorDate);
              const isToday = isSameDay(day, today);
              const isLastCol = (index + 1) % 7 === 0;
              const tone = dayTone(key);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onDayClick(key)}
                  className={cn(
                    'flex flex-col items-center gap-1 border-b border-r border-[var(--border-color)] py-2 transition-all active:scale-95',
                    !inMonth && 'opacity-25',
                    isLastCol && 'border-r-0',
                    inMonth && (tone === 'over' || tone === 'risk') && 'bg-[var(--warning-bg)]',
                    selectedBacklogKey && inMonth && tone == null && pickerDayKey !== key && 'bg-[color-mix(in_srgb,var(--accent-blue),transparent_94%)]',
                    pickerDayKey === key && 'bg-[color-mix(in_srgb,var(--accent-blue),transparent_88%)]',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                      isToday && 'bg-[var(--text-primary)] text-[var(--bg-primary)]',
                      !isToday && 'text-[var(--text-primary)]',
                    )}
                  >
                    {format(day, 'd')}
                  </div>
                  {count > 0 ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-blue)]" />
                  ) : (
                    <span className="min-h-[6px]" />
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="stack-md">
        <div className="flex items-center justify-between px-1">
          <Text variant="label" className="capitalize text-[var(--text-primary)]">
            {periodLabel}
          </Text>
          <Text variant="label" className="text-[var(--text-tertiary)]">
            {scheduledItemCount} {scheduledItemCount === 1 ? 'item' : 'itens'}
          </Text>
        </div>

        {scheduledGroups.length === 0 ? (
          <EmptyState
            compact
            title="Grade vazia"
            description="Nada programado neste período."
            action={
              <AppButton
                variant="secondary"
                fullWidth
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => onRegisterPosted(dateKey(today))}
              >
                Registrar vídeo postado
              </AppButton>
            }
          />
        ) : (
          <div className="stack-lg">
            {scheduledGroups.map(group => (
              <div key={group.dayKey} className="stack-sm">
                <div className="flex items-center justify-between px-1">
                  <Text variant="label" className="text-[var(--text-tertiary)]">
                    {format(group.day, "EEEE, dd 'de' MMMM", {locale: ptBR})}
                    {isSameDay(group.day, today) ? ' · hoje' : ''}
                  </Text>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onAddIdea(group.dayKey)}
                      className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-[var(--text-tertiary)] active:bg-[var(--bg-hover)]"
                      aria-label="Adicionar ideia"
                    >
                      <Lightbulb className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRegisterPosted(group.dayKey)}
                      className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-[var(--text-tertiary)] active:bg-[var(--bg-hover)]"
                      aria-label="Registrar vídeo postado"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="stack-sm">
                  {group.projetoMarkers.map(marker => (
                    <MobileListCard
                      key={marker.key}
                      eyebrow="Publi de projeto"
                      title={marker.title}
                      description={marker.projetoNome}
                      onClick={() => onOpenProjetoPublicacao(marker)}
                      trailing={<Briefcase className="h-4 w-4 text-[var(--text-tertiary)]" />}
                      meta={
                        marker.time ? (
                          <span className="text-xs font-semibold tabular-nums text-[var(--text-tertiary)]">
                            {marker.time}
                          </span>
                        ) : null
                      }
                    />
                  ))}

                  {group.cards.map(card => {
                    const color = getPlatformColor(card.platformName);
                    return (
                      <MobileListCard
                        key={card.key}
                        eyebrow={card.platformName}
                        title={card.title}
                        description={card.status}
                        onClick={() => onCardClick(card)}
                        meta={
                          <div className="flex flex-wrap items-center gap-2">
                            {card.time ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-hover)] px-2.5 py-1 text-xs font-semibold tabular-nums text-[var(--text-primary)]">
                                <Clock className="h-3 w-3" />
                                {card.time}
                              </span>
                            ) : !isIdeiaCard(card) ? (
                              <span className="text-xs font-semibold text-[var(--info)]">Definir horário</span>
                            ) : null}
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                              style={{backgroundColor: `${color.dot}18`, color: color.dot}}
                            >
                              {platformInitials(card.platformName)}
                            </span>
                          </div>
                        }
                        status={
                          <div className="flex items-center gap-2">
                            <Badge variant="status" status={card.status}>
                              {card.status}
                            </Badge>
                            <button
                              type="button"
                              onClick={event => {
                                event.stopPropagation();
                                onPreview(card);
                              }}
                              className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-[var(--text-tertiary)] active:bg-[var(--bg-hover)]"
                              aria-label="Pré-visualizar"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
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
    </div>
  );
}
