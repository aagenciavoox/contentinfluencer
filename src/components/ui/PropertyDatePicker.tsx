import {createPortal} from 'react-dom';
import {dia} from '../../lib/dates';
import {FLOATING_MENU_HIDDEN_STYLE, FLOATING_MENU_Z_INDEX, useAnchoredPosition} from './anchoredPosition';
import {useEffect, useMemo, useRef, useState} from 'react';
import {format, parseISO, startOfMonth} from 'date-fns';
import {CalendarMiniMonth} from '../calendar/CalendarMiniMonth';
import {cn} from '../../lib/utils';

interface PropertyDatePickerProps {
  ariaLabel?: string;
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
  ariaLabel,
  value,
  onChange,
  placeholder = 'Selecionar…',
  className,
  variant = 'property',
  weekStartsOn = 0,
  disabled = false,
}: PropertyDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => parseDateValue(value), [value]);
  const [monthDate, setMonthDate] = useState(() => startOfMonth(selectedDate ?? new Date()));
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef=useRef<HTMLDivElement>(null);
  const position=useAnchoredPosition(open,triggerRef,popoverRef,{align:'end',matchWidth:false});

  useEffect(() => {
    if (selectedDate) {
      setMonthDate(startOfMonth(selectedDate));
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node) && !popoverRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const label = selectedDate
    ? dia(selectedDate)
    : placeholder;

  const handleSelectDate = (date: Date) => {
    onChange(format(date, 'yyyy-MM-dd'));
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative min-w-0 w-full">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(current => !current)}
        className={cn(
          variant === 'property' ? 'property-input text-left' : '',
          variant === 'field' &&
            'w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-left t-body text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent-blue)] disabled:opacity-60',
          variant === 'property' && !selectedDate && 'property-row-value--empty',
          className,
        )}
        aria-label={ariaLabel ? `${ariaLabel}: ${label}` : undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {label}
      </button>

      {open ? createPortal(
        <div
          ref={popoverRef}
          onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();setOpen(false);triggerRef.current?.focus();}}}
          role="dialog"
          aria-label="Selecionar data"
          style={{position:'fixed',width:280,...(position?.style ?? FLOATING_MENU_HIDDEN_STYLE)}}
          className={cn(FLOATING_MENU_Z_INDEX,"overflow-auto rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-dropdown)]")}
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
              className="mt-2 w-full rounded-[var(--radius-input)] px-2 py-1.5 t-label text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            >
              Limpar data
            </button>
          ) : null}
        </div>, document.body
      ) : null}
    </div>
  );
}
