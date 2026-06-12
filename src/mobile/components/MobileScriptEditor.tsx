import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, X } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { cn, htmlToReadableText } from '../../lib/utils';

interface MobileScriptEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  documentTitle?: string;
  className?: string;
}

function plainTextToHtml(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return '';

  return trimmed
    .split(/\n{2,}/)
    .map(paragraph =>
      `<p>${paragraph
        .split('\n')
        .map(line => line.trim())
        .join('<br>')}</p>`
    )
    .join('');
}

export function MobileScriptEditor({
  content,
  onChange,
  placeholder = 'Escreva o roteiro...',
  autoFocus = false,
  documentTitle = 'Roteiro',
  className,
}: MobileScriptEditorProps) {
  const [plainText, setPlainText] = useState(() => htmlToReadableText(content));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fullscreenRef = useRef<HTMLTextAreaElement>(null);

  useBodyScrollLock(isFullscreen);

  useEffect(() => {
    setPlainText(htmlToReadableText(content));
  }, [content]);

  useEffect(() => {
    if (!autoFocus) return;
    const node = textareaRef.current;
    if (!node) return;
    node.focus();
    const end = node.value.length;
    node.setSelectionRange(end, end);
  }, [autoFocus]);

  useEffect(() => {
    if (!isFullscreen || !fullscreenRef.current) return;
    fullscreenRef.current.focus();
    const end = fullscreenRef.current.value.length;
    fullscreenRef.current.setSelectionRange(end, end);
  }, [isFullscreen]);

  const commitChange = (nextPlain: string) => {
    setPlainText(nextPlain);
    onChange(plainTextToHtml(nextPlain));
    setLastSavedAt(new Date());
  };

  const savedLabel = lastSavedAt
    ? `Salvo ${lastSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : 'Rascunho local';

  const editorField = (
    isExpanded: boolean,
    ref: React.RefObject<HTMLTextAreaElement | null>,
  ) => (
    <textarea
      ref={ref}
      value={plainText}
      onChange={event => commitChange(event.target.value)}
      placeholder={placeholder}
      className={cn(
        'w-full resize-none border-0 bg-transparent text-base font-semibold leading-relaxed text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]',
        isExpanded ? 'min-h-[calc(100dvh-8rem)] px-4 py-4' : 'min-h-[50dvh] px-1 py-2'
      )}
    />
  );

  const fullscreenOverlay = isFullscreen
    ? createPortal(
        <div className="fixed inset-0 z-[130] flex flex-col bg-[var(--bg-primary)]">
          <header
            className="flex shrink-0 items-center gap-2 border-b border-[var(--border-color)] px-3"
            style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}
          >
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              aria-label="Fechar editor em tela cheia"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-sm font-semibold">{documentTitle}</p>
              <p className="text-xs font-semibold text-[var(--text-tertiary)]">{savedLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="min-h-11 min-w-[4.5rem] text-sm font-bold text-[var(--accent-blue)]"
            >
              OK
            </button>
          </header>
          <div className="flex-1 overflow-y-auto px-2 pb-safe">
            {editorField(true, fullscreenRef)}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <div className={cn('rounded-lg border border-[var(--border-color)] bg-white px-3 py-3 shadow-sm', className)}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            {savedLabel}
          </span>
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            aria-label="Expandir editor"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[var(--border-color)]"
          >
            <Maximize2 className="h-4 w-4 text-[var(--text-tertiary)]" />
          </button>
        </div>
        {editorField(false, textareaRef)}
      </div>
      {fullscreenOverlay}
    </>
  );
}
