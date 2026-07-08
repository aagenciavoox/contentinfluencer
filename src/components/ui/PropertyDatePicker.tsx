import {useEffect, useMemo, useRef, useState} from 'react';
import {format, parseISO, startOfMonth} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {CalendarMiniMonth} from '../calendar/CalendarMiniMonth';
import {cn} from '../../lib/utils';

interface PropertyDatePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  variant?: 'property' | 'field';
  weekStartsOn?: 0 | 1;
  disabled?: boolean;
}

function parseDateValue(value: string | null): Date | null {
  if (!value) return null;
  const dateOnly = value.slice(0, 10);
  try {
    return parseISO(dateOnly);
  } catch {
    return null;
  }
}

export function PropertyDatePicker({
  value,
  onChange,
  placeholder = 'Vazio',
  className,
  variant = 'property',
  weekStartsOn = 1,
  disabled = false,
}: PropertyDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => parseDateValue(value), [value]);
  const [monthDate, setMonthDate] = useState(() => startOfMonth(selectedDate ?? new Date()));
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (selectedDate) {
      setMonthDate(startOfMonth(selectedDate));
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!open || !triggerRef.current) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const panelWidth = 280;
      const panelHeight = 320;
      const left = Math.min(Math.max(16, rect.right - panelWidth), window.innerWidth - panelWidth - 16);
      const top = Math.min(rect.bottom + 8, window.innerHeight - panelHeight - 16);

      setPopoverStyle({
        position: 'fixed',
        top,
        left,
        width: panelWidth,
        zIndex: 80,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const label = selectedDate
    ? format(selectedDate, "d 'de' MMM yyyy", {locale: ptBR})
    : placeholder;

  const handleSelectDate = (date: Date) => {
    onChange(format(date, 'yyyy-MM-dd'));
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(current => !current)}
        className={cn(
          variant === 'property' ? 'property-input text-left' : '',
          variant === 'field' &&
            'w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-left text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent-blue)] disabled:opacity-60',
          variant === 'property' && !selectedDate && 'property-row-value--empty',
          className,
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {label}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Selecionar data"
          style={popoverStyle}
          className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-dropdown)]"
        >
          <CalendarMiniMonth
            monthDate={monthDate}
            selectedDate={selectedDate ?? new Date()}
            onSelectDate={handleSelectDate}
            onMonthChange={setMonthDate}
            weekStartsOn={weekStartsOn}
          />
          {selectedDate ? (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="mt-2 w-full rounded-[var(--radius-input)] px-2 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            >
              Limpar data
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
