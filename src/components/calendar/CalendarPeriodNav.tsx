import {INICIO_DA_SEMANA} from '../../lib/semana.ts';
import { Text } from '../ui/Text';
import {useId, useRef} from 'react';
import {
  addMonths,
  addWeeks,
  endOfWeek,
  format,
  isSameMonth,
  isSameWeek,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import {CalendarDays, ChevronDown, ChevronLeft, ChevronRight} from 'lucide-react';
import {cn} from '../../lib/utils';
import {intervalo, mes} from '../../lib/dates';
import {SegmentTabs} from '../ui/SegmentTabs';

export interface CalendarPeriodViewOption<T extends string = string> {
  id: T;
  label: string;
}

interface CalendarPeriodNavProps<T extends string = string> {
  anchorDate: Date;
  onAnchorDateChange: (date: Date) => void;
  viewMode: T;
  onViewModeChange: (mode: T) => void;
  views: CalendarPeriodViewOption<T>[];
  weekStartsOn?: 0 | 1;
  className?: string;
  /** When set, period nav uses week stepping for this view id. */
  weekViewId?: T;
  /** Mostra "Hoje" só fora do período atual, reservando o espaço para a faixa não pular. */
  todayWhenOutside?: boolean;
  /** Onde o botão "Hoje" fica em relação ao seletor de período (padrão: antes). */
  todayPosition?: 'before' | 'after';
  /** Callback extra quando a pessoa toca em "Hoje". */
  onTodayClick?: () => void;
  /** Tamanho fixo de 44×44 para as setas no celular (sem depender de pointer: coarse). */
  touchArrows?: boolean;
}

function applyMonthYear(anchorDate: Date, year: number, month: number): Date {
  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(anchorDate.getDate(), lastDay);
  return new Date(year, month - 1, day);
}

const navButtonClass =
  'flex min-h-9 min-w-9 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] pointer-coarse:min-h-11 pointer-coarse:min-w-11 transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

const todayButtonClass =
  'min-h-9 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-1.5 pointer-coarse:min-h-11 t-body-strong text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

export function CalendarPeriodNav<T extends string = string>({
  anchorDate,
  onAnchorDateChange,
  viewMode,
  onViewModeChange,
  views,
  weekStartsOn = INICIO_DA_SEMANA,
  className,
  weekViewId,
  todayWhenOutside = false,
  todayPosition = 'before',
  onTodayClick,
  touchArrows = false,
}: CalendarPeriodNavProps<T>) {
  const monthInputId = useId();
  const monthInputRef = useRef<HTMLInputElement>(null);

  const today = new Date();
  const isWeekMode = weekViewId ? viewMode === weekViewId : false;
  const isCurrentPeriod = isWeekMode
    ? isSameWeek(anchorDate, today, {weekStartsOn})
    : isSameMonth(anchorDate, today);
  const weekStartDate = startOfWeek(anchorDate, {weekStartsOn});
  const weekEndDate = endOfWeek(anchorDate, {weekStartsOn});

  const periodLabel = isWeekMode
    ? intervalo(weekStartDate, weekEndDate)
    : mes(anchorDate);

  const monthValue = format(anchorDate, 'yyyy-MM');

  const navigate = (direction: -1 | 1) => {
    onAnchorDateChange(
      isWeekMode
        ? direction === 1
          ? addWeeks(anchorDate, 1)
          : subWeeks(anchorDate, 1)
        : direction === 1
          ? addMonths(anchorDate, 1)
          : subMonths(anchorDate, 1),
    );
  };

  const handleMonthChange = (value: string) => {
    if (!value) return;
    const [year, month] = value.split('-').map(Number);
    if (!year || !month) return;
    onAnchorDateChange(applyMonthYear(anchorDate, year, month));
  };

  const handleToday = () => {
    onAnchorDateChange(new Date());
    onTodayClick?.();
  };

  const hideToday = todayWhenOutside && isCurrentPeriod;
  const arrowClass = touchArrows
    ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]'
    : navButtonClass;

  const todayButton = (
    <button
      type="button"
      onClick={handleToday}
      disabled={hideToday}
      tabIndex={hideToday ? -1 : undefined}
      aria-hidden={hideToday || undefined}
      className={cn(
        todayButtonClass,
        'shrink-0 transition-opacity duration-150',
        todayWhenOutside && (hideToday ? 'pointer-events-none opacity-0' : 'opacity-100'),
      )}
    >
      Hoje
    </button>
  );

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {views.length > 0 ? (
        <SegmentTabs<T>
          ariaLabel="Vista"
          value={viewMode}
          onChange={onViewModeChange}
          options={views.map(view => ({id: view.id, label: view.label}))}
        />
      ) : null}

      {todayPosition === 'before' ? todayButton : null}

      <div className={cn('flex items-center gap-0.5', touchArrows && 'min-w-0 flex-1')}>
        <button type="button" onClick={() => navigate(-1)} className={arrowClass} aria-label="Período anterior">
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className={cn('relative', touchArrows && 'min-w-0')}>
          <input
            ref={monthInputRef}
            id={monthInputId}
            type="month"
            value={monthValue}
            onChange={event => handleMonthChange(event.target.value)}
            className="sr-only"
            aria-label="Selecionar mês"
          />
          <button
            type="button"
            onClick={() => monthInputRef.current?.showPicker?.() ?? monthInputRef.current?.click()}
            className={cn(
              todayButtonClass,
              touchArrows
                ? 'inline-flex min-h-11 max-w-full items-center justify-center gap-1 border-0 bg-transparent px-1.5 hover:bg-[var(--bg-hover)]'
                : 'inline-flex min-w-[9.5rem] items-center justify-center gap-1.5 border-0 bg-transparent px-2 hover:bg-[var(--bg-hover)]',
            )}
            aria-labelledby={monthInputId}
            title="Escolher mês"
          >
            {touchArrows ? null : <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" />}
            <Text variant="itemTitle" as="span" className="truncate text-[var(--text-primary)]">{periodLabel}</Text>
            {touchArrows ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" aria-hidden /> : null}
          </button>
        </div>

        <button type="button" onClick={() => navigate(1)} className={arrowClass} aria-label="Próximo período">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {todayPosition === 'after' ? todayButton : null}
    </div>
  );
}
