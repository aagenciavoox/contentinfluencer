import {useId, useRef} from 'react';
import {
  addMonths,
  addWeeks,
  endOfWeek,
  format,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {CalendarDays, ChevronLeft, ChevronRight} from 'lucide-react';
import {cn} from '../../lib/utils';
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
}

function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function applyMonthYear(anchorDate: Date, year: number, month: number): Date {
  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(anchorDate.getDate(), lastDay);
  return new Date(year, month - 1, day);
}

const navButtonClass =
  'flex min-h-9 min-w-9 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] pointer-coarse:min-h-11 pointer-coarse:min-w-11 transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

const todayButtonClass =
  'min-h-9 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-1.5 pointer-coarse:min-h-11 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

export function CalendarPeriodNav<T extends string = string>({
  anchorDate,
  onAnchorDateChange,
  viewMode,
  onViewModeChange,
  views,
  weekStartsOn = 0,
  className,
  weekViewId,
}: CalendarPeriodNavProps<T>) {
  const monthInputId = useId();
  const monthInputRef = useRef<HTMLInputElement>(null);

  const isWeekMode = weekViewId ? viewMode === weekViewId : false;
  const weekStartDate = startOfWeek(anchorDate, {weekStartsOn});
  const weekEndDate = endOfWeek(anchorDate, {weekStartsOn});

  const periodLabel = isWeekMode
    ? `${format(weekStartDate, "d 'de' MMM", {locale: ptBR})} – ${format(weekEndDate, "d 'de' MMM 'de' yyyy", {locale: ptBR})}`
    : capitalizeFirst(format(anchorDate, "MMMM 'de' yyyy", {locale: ptBR}));

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

      <button type="button" onClick={() => onAnchorDateChange(new Date())} className={todayButtonClass}>
        Hoje
      </button>

      <div className="flex items-center gap-0.5">
        <button type="button" onClick={() => navigate(-1)} className={navButtonClass} aria-label="Período anterior">
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="relative">
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
              'inline-flex min-w-[9.5rem] items-center justify-center gap-1.5 border-0 bg-transparent px-2 hover:bg-[var(--bg-hover)]',
            )}
            aria-labelledby={monthInputId}
            title="Escolher mês"
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" />
            <span className="truncate text-sm font-semibold text-[var(--text-primary)]">{periodLabel}</span>
          </button>
        </div>

        <button type="button" onClick={() => navigate(1)} className={navButtonClass} aria-label="Próximo período">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
