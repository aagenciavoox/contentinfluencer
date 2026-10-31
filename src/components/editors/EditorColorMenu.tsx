import { Text } from '../ui/Text';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEditorState, type Editor } from '@tiptap/react';
import { Baseline, Ban, Check, ChevronDown, Highlighter } from 'lucide-react';
import { cn } from '../../lib/utils';
import { HIGHLIGHT_COLORS, HIGHLIGHT_INK, TEXT_COLORS } from './editorColors';

type ColorKind = 'highlight' | 'text';

const LABELS: Record<ColorKind, { button: string; none: string; title: string }> = {
  highlight: { button: 'Cor de destaque', none: 'Sem destaque', title: 'Destaque' },
  text: { button: 'Cor do texto', none: 'Cor padrão', title: 'Cor do texto' },
};

export function applyEditorColor(editor: Editor, kind: ColorKind, color: string | null) {
  const chain = editor.chain().focus();
  if (kind === 'highlight') {
    (color ? chain.setHighlight({ color }) : chain.unsetHighlight()).run();
  } else {
    (color ? chain.setColor(color) : chain.unsetColor()).run();
  }
}

export function ColorSwatches({
  kind,
  current,
  onPick,
  large = false,
}: {
  kind: ColorKind;
  current: string | null;
  onPick: (color: string | null) => void;
  large?: boolean;
}) {
  const palette = kind === 'highlight' ? HIGHLIGHT_COLORS : TEXT_COLORS;
  const selected = current?.toLowerCase() ?? null;
  return (
    <div className={large ? 'stack-md' : 'stack-sm'}>
      {/* "Sem destaque" / "Cor padrão" numa linha própria, como o "Nenhuma" do Google Docs. */}
      <button
        type="button"
        onMouseDown={event => event.preventDefault()}
        onClick={() => onPick(null)}
        aria-pressed={!selected}
        title={LABELS[kind].none}
        className={cn(
          'flex w-full items-center gap-2 whitespace-nowrap rounded-[var(--radius-input)] px-2 text-left t-body text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
          large ? 'min-h-11' : 'min-h-8',
          !selected && 'bg-[var(--bg-hover)] ',
        )}
      >
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-pill)] border border-[var(--border-strong)] text-[var(--text-tertiary)]"
          aria-hidden
        >
          <Ban className="h-3 w-3" />
        </span>
        <span className="flex-1">{LABELS[kind].none}</span>
        {!selected ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : null}
      </button>
      <div
        role="group"
        aria-label={kind === 'highlight' ? 'Cores de destaque' : 'Cores do texto'}
        // gap-2 (8px) dá folga para o anel de seleção (2px + 2px de afastamento) sem tocar nas vizinhas.
        className={cn('grid w-max', large ? 'grid-cols-4 gap-4' : 'grid-cols-7 gap-2')}
      >
        {palette.map(color => {
          const isSelected = selected === color.value.toLowerCase();
          return (
            <button
              key={color.value}
              type="button"
              onMouseDown={event => event.preventDefault()}
              onClick={() => onPick(color.value)}
              aria-label={`${LABELS[kind].title}: ${color.name}`}
              aria-pressed={isSelected}
              title={color.name}
              className={cn(
                large ? 'h-11 w-11' : 'h-7 w-7',
                'flex shrink-0 items-center justify-center rounded-[var(--radius-pill)] border t-label transition-shadow focus-visible:outline-none',
                kind === 'highlight'
                  ? 'border-[color-mix(in_srgb,var(--text-primary),transparent_82%)]'
                  : 'border-[var(--border-color)]',
                isSelected
                  ? 'ring-2 ring-[var(--text-primary)] ring-offset-2 ring-offset-[var(--bg-elevated)]'
                  : 'hover:ring-2 hover:ring-[var(--border-strong)] hover:ring-offset-2 hover:ring-offset-[var(--bg-elevated)] focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-elevated)]',
              )}
              style={
                kind === 'highlight'
                  ? { backgroundColor: color.value, color: HIGHLIGHT_INK }
                  : { backgroundColor: 'var(--bg-elevated)', color: color.value }
              }
            >
              {kind === 'text' ? 'A' : isSelected ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Botão de cor (destaque ou texto) com paleta.
 * presentation="popover": paleta embaixo do botão. "sheet": folha de baixo (celular).
 */
export function EditorColorMenu({
  editor,
  kind,
  presentation = 'popover',
  size = 'md',
  neutral = false,
}: {
  editor: Editor;
  kind: ColorKind;
  presentation?: 'popover' | 'sheet';
  size?: 'sm' | 'md';
  neutral?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = useEditorState({
    editor,
    selector: ({ editor: instance }) =>
      ((kind === 'highlight'
        ? instance?.getAttributes('highlight').color
        : instance?.getAttributes('textStyle').color) as string | undefined) ?? null,
  });

  useEffect(() => {
    if (!open || presentation === 'sheet') return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open, presentation]);

  const pick = (color: string | null) => {
    applyEditorColor(editor, kind, color);
    setOpen(false);
  };

  const Icon = kind === 'highlight' ? Highlighter : Baseline;
  const bar = current ?? (kind === 'highlight' ? 'transparent' : 'var(--text-primary)');

  return (
    <div ref={rootRef} className="relative flex shrink-0">
      <button
        type="button"
        onMouseDown={event => event.preventDefault()}
        onClick={() => setOpen(value => !value)}
        aria-label={LABELS[kind].button}
        title={`${LABELS[kind].button}${kind === 'highlight' ? ' (Ctrl+Shift+H)' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'flex items-center justify-center gap-0.5 rounded-[var(--radius-input)] transition',
          size === 'sm' ? 'h-8 px-1.5' : 'h-9 px-1.5',
          open
            ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
            : neutral
              ? 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
              : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
        )}
      >
        <span className="flex flex-col items-center">
          <Icon className="h-4 w-4" />
          <span
            className="mt-0.5 h-[3px] w-4 rounded-[var(--radius-pill)] border border-[color-mix(in_srgb,var(--text-primary),transparent_80%)]"
            style={{ backgroundColor: bar }}
          />
        </span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && presentation === 'popover' ? (
        <div
          role="dialog"
          aria-label={LABELS[kind].title}
          // Largura do conteúdo (w-max): o popover não encolhe dentro da barra e nada se sobrepõe.
          className="absolute left-0 top-full z-[140] mt-1 w-max min-w-[15rem] rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-dropdown)] md:rounded-[var(--radius-card)]"
        >
          <Text variant="label" as="p" className="mb-2 whitespace-nowrap leading-5 text-[var(--text-secondary)]">{LABELS[kind].title}</Text>
          <ColorSwatches kind={kind} current={current} onPick={pick} />
        </div>
      ) : null}

      {open && presentation === 'sheet' && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[220] flex items-end bg-[color-mix(in_srgb,var(--text-primary)_30%,transparent)]"
              onMouseDown={() => setOpen(false)}
            >
              <div
                role="dialog"
                aria-label={LABELS[kind].title}
                onMouseDown={event => event.stopPropagation()}
                className="w-full rounded-t-[var(--radius-overlay)] border-t border-[var(--border-color)] bg-[var(--bg-elevated)] p-5 pb-safe"
              >
                <div className="mx-auto mb-4 h-1 w-10 rounded-[var(--radius-pill)] bg-[var(--border-strong)]" />
                <Text variant="itemTitle" as="p" className="mb-3 text-[var(--text-primary)]">{LABELS[kind].title}</Text>
                <ColorSwatches kind={kind} current={current} onPick={pick} large />
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
