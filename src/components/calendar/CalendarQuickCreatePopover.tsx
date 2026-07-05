import {useEffect, useRef, useState} from 'react';
import {format} from 'date-fns';
import {X} from 'lucide-react';
import {AppButton} from '../ui/AppButton';
import {Text} from '../ui/Text';
import {cn} from '../../lib/utils';

interface CalendarQuickCreatePopoverProps {
  open: boolean;
  anchorDate: Date;
  onClose: () => void;
  onSave: (payload: {title: string; date: string; time: string | null}) => void;
  onMoreOptions: (payload: {title: string; date: string; time: string | null}) => void;
  anchorRect?: DOMRect | null;
}

export function CalendarQuickCreatePopover({
  open,
  anchorDate,
  onClose,
  onSave,
  onMoreOptions,
  anchorRect,
}: CalendarQuickCreatePopoverProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(anchorDate, 'yyyy-MM-dd'));
  const [time, setTime] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setDate(format(anchorDate, 'yyyy-MM-dd'));
      setTitle('');
      setTime('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, anchorDate]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const handleClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [open, onClose]);

  if (!open) return null;

  const payload = {title: title.trim(), date, time: time || null};

  const style: React.CSSProperties = anchorRect
    ? {
        position: 'fixed',
        top: Math.min(anchorRect.bottom + 8, window.innerHeight - 320),
        left: Math.min(Math.max(16, anchorRect.left), window.innerWidth - 340),
        zIndex: 60,
      }
    : {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 60,
      };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-[var(--backdrop-soft)]" aria-hidden />
      <div
        ref={panelRef}
        style={style}
        className="w-[min(320px,calc(100vw-32px))] rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] shadow-[var(--shadow-modal)]"
        role="dialog"
        aria-modal="true"
        aria-label="Criar evento rápido"
      >
        <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-3">
          <Text variant="sectionTitle">Novo evento</Text>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="stack-md p-4">
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="Adicionar título"
            className="w-full border-0 border-b-2 border-[var(--accent-blue)] bg-transparent pb-2 text-base font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={date}
              onChange={event => setDate(event.target.value)}
              className="h-9 w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            />
            <input
              type="time"
              value={time}
              onChange={event => setTime(event.target.value)}
              className="h-9 w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border-color)] px-4 py-3">
          <button
            type="button"
            onClick={() => onMoreOptions(payload)}
            className={cn(
              'text-sm font-semibold text-[var(--accent-blue)] hover:underline',
              'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
            )}
          >
            Mais opções
          </button>
          <AppButton
            variant="primary"
            size="sm"
            disabled={!title.trim() || !date}
            onClick={() => onSave(payload)}
          >
            Salvar
          </AppButton>
        </div>
      </div>
    </>
  );
}
