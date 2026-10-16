import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, CornerDownRight, RotateCcw, Trash2, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { stackCommentCards, type ScriptComment } from './commentModel';

export const COMMENT_COLORS = [
  { name: 'Amarelo', value: 'color-mix(in srgb, var(--warning), transparent 50%)' },
  { name: 'Laranja', value: 'color-mix(in srgb, var(--accent-orange), transparent 50%)' },
  { name: 'Azul', value: 'color-mix(in srgb, var(--accent-blue), transparent 50%)' },
  { name: 'Rosa', value: 'color-mix(in srgb, var(--accent-pink), transparent 50%)' },
];

export const DEFAULT_COMMENT_HIGHLIGHT = 'color-mix(in srgb, var(--warning), transparent 70%)';
const DEFAULT_COMMENT_STRIPE = 'color-mix(in srgb, var(--warning), transparent 40%)';

function shortDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-pill)] border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs font-bold text-[var(--accent-blue)]">
      {(name[0] ?? '?').toUpperCase()}
    </div>
  );
}

export interface CommentCardProps {
  note: ScriptComment;
  authorName: string;
  active: boolean;
  unanchored?: boolean;
  showQuote?: boolean;
  onActivate: () => void;
  onReply?: (text: string) => void;
  onToggleResolved?: () => void;
  onDelete?: () => void;
  onColor?: (color: string) => void;
}

/** Cartão de comentário: corpo, respostas, resolver/reabrir, cor e excluir. */
export function CommentCard({
  note,
  authorName,
  active,
  unanchored = false,
  showQuote = false,
  onActivate,
  onReply,
  onToggleResolved,
  onDelete,
  onColor,
}: CommentCardProps) {
  const [reply, setReply] = useState('');
  const resolved = !!note.resolvedAt;
  const author = note.authorName || authorName;
  const replies = note.replies ?? [];

  const sendReply = () => {
    const text = reply.trim();
    if (!text || !onReply) return;
    onReply(text);
    setReply('');
  };

  return (
    <div
      role="article"
      aria-label={`Comentário de ${author}`}
      onClick={onActivate}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-[var(--radius-card-mobile)] border bg-[var(--bg-elevated)] p-3.5 pl-4 transition md:rounded-[var(--radius-card)]',
        active
          ? 'border-[color-mix(in_srgb,var(--accent-blue),transparent_60%)] shadow-[var(--shadow-card)]'
          : 'border-[var(--border-color)] shadow-[var(--shadow-soft)] hover:border-[var(--border-strong)]',
        resolved && !active && 'opacity-70',
      )}
    >
      <div
        className="absolute bottom-0 left-0 top-0 w-1"
        style={{ backgroundColor: resolved ? 'var(--border-strong)' : note.color || DEFAULT_COMMENT_STRIPE }}
      />
      <div className="mb-2 flex items-center gap-2">
        <Avatar name={author} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-[var(--text-primary)]">{author}</p>
          <p className="text-[11px] text-[var(--text-tertiary)]">
            {shortDate(note.createdAt)}
            {resolved ? ' · Resolvido' : ''}
            {unanchored ? ' · Trecho não encontrado' : ''}
          </p>
        </div>
        {onToggleResolved ? (
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              onToggleResolved();
            }}
            aria-label={resolved ? 'Reabrir comentário' : 'Resolver comentário'}
            title={resolved ? 'Reabrir' : 'Resolver'}
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-input)] text-[var(--accent-blue)] transition hover:bg-[color-mix(in_srgb,var(--accent-blue),transparent_90%)]"
          >
            {resolved ? <RotateCcw className="h-3.5 w-3.5" /> : <Check className="h-4 w-4" />}
          </button>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              onDelete();
            }}
            aria-label="Excluir comentário"
            title="Excluir"
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-input)] text-[color-mix(in_srgb,var(--danger),transparent_35%)] opacity-0 transition hover:bg-[color-mix(in_srgb,var(--danger),transparent_90%)] hover:text-[var(--danger)] group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {showQuote || unanchored ? (
        <p className="mb-2 line-clamp-2 border-l-2 border-[var(--border-strong)] pl-2 text-xs italic text-[var(--text-tertiary)]">
          “{note.text}”
        </p>
      ) : null}

      <p className={cn('whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]', !active && 'line-clamp-3')}>
        {note.comment}
      </p>

      {replies.length > 0 ? (
        <div className="mt-2 space-y-2 border-t border-[var(--border-color)] pt-2">
          {(active ? replies : replies.slice(-1)).map(item => (
            <div key={item.id} className="flex gap-2">
              <CornerDownRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  {item.authorName || authorName}{' '}
                  <span className="font-normal text-[var(--text-tertiary)]">{shortDate(item.createdAt)}</span>
                </p>
                <p className={cn('whitespace-pre-wrap text-sm text-[var(--text-secondary)]', !active && 'line-clamp-2')}>{item.comment}</p>
              </div>
            </div>
          ))}
          {!active && replies.length > 1 ? (
            <p className="text-xs text-[var(--text-tertiary)]">+{replies.length - 1} {replies.length - 1 === 1 ? 'resposta' : 'respostas'}</p>
          ) : null}
        </div>
      ) : null}

      {active ? (
        <div className="mt-3 space-y-2 border-t border-[var(--border-color)] pt-3" onClick={event => event.stopPropagation()}>
          {onReply && !resolved ? (
            <div className="flex items-end gap-2">
              <textarea
                value={reply}
                onChange={event => setReply(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendReply();
                  }
                }}
                rows={1}
                placeholder="Responder"
                aria-label="Responder"
                className="min-h-[36px] flex-1 resize-none rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-base text-[var(--text-primary)] focus:border-[var(--accent-blue)] focus:outline-none md:text-sm"
              />
              <button
                type="button"
                onClick={sendReply}
                disabled={!reply.trim()}
                className="h-9 rounded-[var(--radius-pill)] bg-[var(--accent-blue)] px-4 text-xs font-semibold text-[var(--bg-secondary)] transition disabled:bg-[var(--bg-hover)] disabled:text-[var(--text-tertiary)]"
              >
                Responder
              </button>
            </div>
          ) : null}
          {onColor && !resolved ? (
            <div className="flex items-center gap-2">
              {COMMENT_COLORS.map(color => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => onColor(color.value)}
                  aria-label={`Cor ${color.name}`}
                  title={color.name}
                  className={cn(
                    'h-4 w-4 rounded-[var(--radius-pill)] ring-offset-2 ring-offset-[var(--bg-elevated)] transition hover:scale-125',
                    note.color === color.value && 'ring-2 ring-[var(--accent-blue)]',
                  )}
                  style={{ backgroundColor: color.value }}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Coluna da margem direita com os cartões alinhados ao trecho comentado (desktop largo). */
export function CommentRail({
  items,
  anchors,
  activeId,
  minHeight,
  renderCard,
  draft,
}: {
  items: ScriptComment[];
  anchors: Map<string, number>;
  activeId: string | null;
  minHeight: number;
  renderCard: (note: ScriptComment) => ReactNode;
  draft?: { top: number; node: ReactNode } | null;
}) {
  const refs = useRef(new Map<string, HTMLDivElement>());
  const [heights, setHeights] = useState<Record<string, number>>({});

  useLayoutEffect(() => {
    const observer = new ResizeObserver(entries => {
      setHeights(current => {
        let changed = false;
        const next = { ...current };
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.cardId;
          if (!id) continue;
          const height = Math.round((entry.target as HTMLElement).offsetHeight);
          if (next[id] !== height) {
            next[id] = height;
            changed = true;
          }
        }
        return changed ? next : current;
      });
    });
    refs.current.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, [items]);

  const tops = useMemo(() => {
    const slots = items
      .filter(note => anchors.has(note.id))
      .map(note => ({ id: note.id, top: anchors.get(note.id) ?? 0, height: heights[note.id] ?? 96 }));
    if (draft) slots.push({ id: '__draft__', top: draft.top, height: heights.__draft__ ?? 220 });
    return stackCommentCards(slots, draft ? '__draft__' : activeId);
  }, [activeId, anchors, draft, heights, items]);

  const setRef = (id: string) => (node: HTMLDivElement | null) => {
    if (node) refs.current.set(id, node);
    else refs.current.delete(id);
  };

  return (
    <div className="relative w-72 shrink-0" style={{ minHeight }} aria-label="Comentários">
      {draft ? (
        <div ref={setRef('__draft__')} data-card-id="__draft__" className="absolute left-0 right-0 z-20 transition-[top] duration-200" style={{ top: tops.get('__draft__') ?? draft.top }}>
          {draft.node}
        </div>
      ) : null}
      {items.map(note =>
        anchors.has(note.id) ? (
          <div
            key={note.id}
            ref={setRef(note.id)}
            data-card-id={note.id}
            className={cn('absolute left-0 right-0 transition-[top] duration-200', activeId === note.id ? 'z-10' : 'z-0')}
            style={{ top: tops.get(note.id) ?? 0 }}
          >
            {renderCard(note)}
          </div>
        ) : null,
      )}
    </div>
  );
}

/** Lista "Comentários (N)": gaveta à direita no desktop estreito, folha de baixo no celular. */
export function CommentsPanel({
  open,
  onClose,
  presentation,
  items,
  total,
  showResolved,
  onShowResolvedChange,
  resolvedCount,
  renderCard,
}: {
  open: boolean;
  onClose: () => void;
  presentation: 'drawer' | 'sheet';
  items: ScriptComment[];
  total: number;
  showResolved: boolean;
  onShowResolvedChange: (value: boolean) => void;
  resolvedCount: number;
  renderCard: (note: ScriptComment) => ReactNode;
}) {
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[210] flex bg-[color-mix(in_srgb,var(--text-primary)_25%,transparent)]',
        presentation === 'sheet' ? 'items-end' : 'justify-end',
      )}
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-label="Comentários"
        onMouseDown={event => event.stopPropagation()}
        className={cn(
          'flex flex-col bg-[var(--bg-elevated)]',
          presentation === 'sheet'
            ? 'max-h-[80dvh] w-full rounded-t-[var(--radius-overlay)] border-t border-[var(--border-color)] pb-safe'
            : 'h-full w-[min(24rem,100vw)] border-l border-[var(--border-color)] shadow-[var(--shadow-modal)]',
        )}
      >
        {presentation === 'sheet' ? <div className="mx-auto mt-3 h-1 w-10 rounded-[var(--radius-pill)] bg-[var(--border-strong)]" /> : null}
        <div className="flex items-center gap-2 border-b border-[var(--border-color)] px-4 py-3">
          <p className="flex-1 text-sm font-semibold text-[var(--text-primary)]">Comentários ({total})</p>
          {resolvedCount > 0 ? (
            <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <input type="checkbox" checked={showResolved} onChange={event => onShowResolvedChange(event.target.checked)} />
              Resolvidos ({resolvedCount})
            </label>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar comentários"
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-input)] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {items.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-[var(--text-tertiary)]">
              Nenhum comentário{resolvedCount > 0 && !showResolved ? ' aberto' : ''}. Selecione um trecho e toque em comentar.
            </p>
          ) : (
            items.map(note => <div key={note.id}>{renderCard(note)}</div>)
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
