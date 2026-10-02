import {useEffect, useRef, useState, type ReactNode} from 'react';
import {Redo, Undo, X} from 'lucide-react';
import {AppButton} from '../../../../components/ui/AppButton';
import {Text} from '../../../../components/ui/Text';
import {cn} from '../../../../lib/utils';

interface WritingNotesPaneProps {
  value: string;
  onChange: (text: string) => void;
  onClose: () => void;
  className?: string;
}

export function WritingNotesPane({
  value,
  onChange,
  onClose,
  className,
}: WritingNotesPaneProps) {
  const plain = writingNotesToPlain(value);
  const historyRef = useRef<string[]>([plain]);
  const indexRef = useRef(0);
  const lastSentRef = useRef(plain);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [, rerender] = useState(0);

  useEffect(() => {
    if (plain === lastSentRef.current) return;
    historyRef.current = [plain];
    indexRef.current = 0;
    lastSentRef.current = plain;
    rerender(count => count + 1);
  }, [plain]);

  const canUndo = indexRef.current > 0;
  const canRedo = indexRef.current < historyRef.current.length - 1;

  const apply = (nextIndex: number) => {
    const next = historyRef.current[nextIndex] ?? '';
    indexRef.current = nextIndex;
    lastSentRef.current = next;
    onChange(next);
    rerender(count => count + 1);
    textareaRef.current?.focus();
  };

  const push = (next: string) => {
    if (historyRef.current[indexRef.current] === next) return;
    const trimmed = historyRef.current.slice(0, indexRef.current + 1);
    trimmed.push(next);
    historyRef.current = trimmed.slice(-200);
    indexRef.current = historyRef.current.length - 1;
    lastSentRef.current = next;
    onChange(next);
    rerender(count => count + 1);
  };

  return (
    <section className={cn('cms-panel flex min-h-[28rem] max-h-[calc(100dvh-14rem)] flex-col overflow-hidden', className)}>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border-color)] px-4 py-3 md:px-6">
        <Text variant="sectionTitle">Notas</Text>
        <AppButton
          type="button"
          variant="ghost"
          size="xs"
          iconOnly
          onClick={onClose}
          aria-label="Fechar área de notas"
        >
          <X className="h-4 w-4" />
        </AppButton>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 border-b border-[var(--border-color)] px-2 py-1">
        <HistoryButton label="Desfazer" disabled={!canUndo} onClick={() => apply(indexRef.current - 1)}>
          <Undo className="h-4 w-4" />
        </HistoryButton>
        <HistoryButton label="Refazer" disabled={!canRedo} onClick={() => apply(indexRef.current + 1)}>
          <Redo className="h-4 w-4" />
        </HistoryButton>
      </div>
      <textarea
        ref={textareaRef}
        value={plain}
        onChange={event => push(event.target.value)}
        onKeyDown={event => {
          const shortcut = event.metaKey || event.ctrlKey;
          if (!shortcut) return;
          const key = event.key.toLowerCase();
          if (key === 'z' && event.shiftKey) {
            event.preventDefault();
            if (canRedo) apply(indexRef.current + 1);
            return;
          }
          if (key === 'z') {
            event.preventDefault();
            if (canUndo) apply(indexRef.current - 1);
            return;
          }
          if (key === 'y') {
            event.preventDefault();
            if (canRedo) apply(indexRef.current + 1);
          }
        }}
        placeholder="Anotações ao lado do roteiro..."
        aria-label="Notas"
        className="min-h-0 flex-1 resize-none border-0 bg-[var(--bg-elevated)] px-6 py-6 text-base leading-relaxed text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
      />
    </section>
  );
}

function HistoryButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-input)] text-[var(--text-tertiary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function writingNotesToPlain(value: string) {
  if (!value.includes('<')) return value;
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '');
}
