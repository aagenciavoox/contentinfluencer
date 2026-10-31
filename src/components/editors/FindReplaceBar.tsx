import { Text } from '../ui/Text';
import { useEffect, useRef, useState } from 'react';
import { useEditorState, type Editor } from '@tiptap/react';
import { CaseSensitive, ChevronDown, ChevronUp, Replace, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { clearFind, getFindState, replaceAll, replaceCurrent, setFindQuery, stepFind } from './findReplace';

const inputClass =
  'h-8 min-w-0 flex-1 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-2.5 t-body text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-blue)] focus:outline-none';
const iconClass =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-input)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-40';
const textButtonClass =
  'h-8 shrink-0 rounded-[var(--radius-input)] border border-[var(--border-color)] px-2.5 t-label text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)] disabled:opacity-40';

/** Buscar (Ctrl+F) e substituir (Ctrl+H) dentro do roteiro. */
export function FindReplaceBar({
  editor,
  mode,
  focusToken,
  onClose,
}: {
  editor: Editor;
  mode: 'find' | 'replace';
  /** Muda a cada Ctrl+F/H para devolver o foco ao campo. */
  focusToken: number;
  onClose: () => void;
}) {
  const [query, setQuery] = useState(() => {
    const { from, to, empty } = editor.state.selection;
    return empty ? '' : editor.state.doc.textBetween(from, to, ' ').slice(0, 200);
  });
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [showReplace, setShowReplace] = useState(mode === 'replace');
  const findRef = useRef<HTMLInputElement>(null);
  const status = useEditorState({
    editor,
    selector: ({ editor: instance }) => {
      const value = instance ? getFindState(instance) : null;
      return { total: value?.matches.length ?? 0, current: value?.current ?? -1 };
    },
  });

  useEffect(() => {
    if (mode === 'replace') setShowReplace(true);
    findRef.current?.focus();
    findRef.current?.select();
  }, [focusToken, mode]);

  useEffect(() => {
    setFindQuery(editor, query, caseSensitive);
  }, [caseSensitive, editor, query]);

  useEffect(() => () => {
    if (!editor.isDestroyed) clearFind(editor);
  }, [editor]);

  const close = () => {
    clearFind(editor);
    onClose();
    editor.commands.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };

  const hasMatches = status.total > 0;
  const counter = !query ? '' : hasMatches ? `${status.current + 1} de ${status.total}` : 'Nada encontrado';

  return (
    <div
      role="search"
      aria-label="Buscar no roteiro"
      onKeyDown={onKeyDown}
      className="flex w-full max-w-[26rem] flex-col gap-1.5 rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-2 shadow-[var(--shadow-dropdown)] md:rounded-[var(--radius-card)]"
    >
      <div className="flex items-center gap-1">
        <input
          ref={findRef}
          value={query}
          onChange={event => setQuery(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              stepFind(editor, event.shiftKey ? -1 : 1);
            }
          }}
          placeholder="Buscar no roteiro"
          aria-label="Buscar"
          className={inputClass}
        />
        <Text variant="meta" as="span" className="w-24 shrink-0 text-right tabular-nums text-[var(--text-tertiary)]" aria-live="polite">
          {counter}
        </Text>
        <button
          type="button"
          onClick={() => setCaseSensitive(value => !value)}
          aria-pressed={caseSensitive}
          aria-label="Diferenciar maiúsculas"
          title="Diferenciar maiúsculas"
          className={cn(iconClass, caseSensitive && 'bg-[var(--bg-secondary)] text-[var(--text-primary)]')}
        >
          <CaseSensitive className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => stepFind(editor, -1)} disabled={!hasMatches} aria-label="Anterior (Shift+Enter)" title="Anterior (Shift+Enter)" className={iconClass}>
          <ChevronUp className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => stepFind(editor, 1)} disabled={!hasMatches} aria-label="Próxima (Enter)" title="Próxima (Enter)" className={iconClass}>
          <ChevronDown className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setShowReplace(value => !value)}
          aria-pressed={showReplace}
          aria-label="Substituir (Ctrl+H)"
          title="Substituir (Ctrl+H)"
          className={cn(iconClass, showReplace && 'bg-[var(--bg-secondary)] text-[var(--text-primary)]')}
        >
          <Replace className="h-4 w-4" />
        </button>
        <button type="button" onClick={close} aria-label="Fechar busca (Esc)" title="Fechar (Esc)" className={iconClass}>
          <X className="h-4 w-4" />
        </button>
      </div>
      {showReplace ? (
        <div className="flex items-center gap-1">
          <input
            value={replacement}
            onChange={event => setReplacement(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                replaceCurrent(editor, replacement);
              }
            }}
            placeholder="Substituir por"
            aria-label="Substituir por"
            className={inputClass}
          />
          <button type="button" onClick={() => replaceCurrent(editor, replacement)} disabled={!hasMatches} className={textButtonClass}>
            Substituir
          </button>
          <button type="button" onClick={() => replaceAll(editor, replacement)} disabled={!hasMatches} className={textButtonClass}>
            Todas
          </button>
        </div>
      ) : null}
    </div>
  );
}
