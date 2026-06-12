import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Pencil, X } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { cn, htmlToReadableText } from '../../lib/utils';

interface MobileScriptReaderProps {
  content: string;
  title?: string;
  onEdit?: () => void;
  className?: string;
  compact?: boolean;
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function ScriptBody({ text, large }: { text: string; large?: boolean }) {
  const paragraphs = text.split(/\n\n+/).filter(Boolean);

  if (paragraphs.length === 0) {
    return (
      <p className={cn('text-[var(--text-tertiary)]', large ? 'text-base' : 'text-sm')}>
        Nenhum texto no roteiro ainda.
      </p>
    );
  }

  return (
    <div className={cn('space-y-4', large && 'space-y-5')}>
      {paragraphs.map((paragraph, index) => (
        <p
          key={index}
          className={cn(
            'whitespace-pre-wrap text-[var(--text-primary)]',
            large ? 'text-[17px] font-medium leading-[1.65]' : 'text-[15px] font-medium leading-[1.55]'
          )}
        >
          {paragraph}
        </p>
      ))}
    </div>
  );
}

export function MobileScriptReader({
  content,
  title = 'Roteiro',
  onEdit,
  className,
  compact = false,
}: MobileScriptReaderProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const plainText = useMemo(() => htmlToReadableText(content), [content]);
  const words = useMemo(() => countWords(plainText), [plainText]);
  const isEmpty = plainText.trim().length === 0;

  useBodyScrollLock(isFullscreen);

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
              aria-label="Fechar leitura"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-sm font-semibold">{title}</p>
              <p className="text-xs font-semibold text-[var(--text-tertiary)]">
                {words > 0 ? `${words} palavras` : 'Vazio'}
              </p>
            </div>
            {onEdit ? (
              <button
                type="button"
                onClick={() => {
                  setIsFullscreen(false);
                  onEdit();
                }}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[var(--border-color)]"
                aria-label="Editar roteiro"
              >
                <Pencil className="h-4 w-4" />
              </button>
            ) : (
              <div className="w-11" />
            )}
          </header>
          <div className="flex-1 overflow-y-auto px-4 py-5 pb-safe">
            <ScriptBody text={plainText} large />
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <article
        className={cn(
          'rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]',
          compact ? 'p-3' : 'p-4',
          className
        )}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
            {words > 0 ? `${words} palavras` : 'Roteiro vazio'}
          </span>
          <div className="flex items-center gap-1">
            {!isEmpty ? (
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                aria-label="Ler em tela cheia"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)]"
              >
                <Maximize2 className="h-4 w-4 text-[var(--text-tertiary)]" />
              </button>
            ) : null}
            {onEdit ? (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-primary)]"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </button>
            ) : null}
          </div>
        </div>

        <div className={cn(!compact && 'max-h-[55dvh] overflow-y-auto pr-1')}>
          <ScriptBody text={plainText} large={!compact} />
        </div>
      </article>
      {fullscreenOverlay}
    </>
  );
}

export function scriptExcerpt(content: string | null | undefined, maxLength = 140) {
  const text = htmlToReadableText(content).replace(/\s+/g, ' ').trim();
  if (!text) return null;
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}…`;
}
