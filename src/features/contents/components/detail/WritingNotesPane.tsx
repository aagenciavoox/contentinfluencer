import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {EditorContent, useEditor, type Editor} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import {Placeholder} from '@tiptap/extensions';
import {
  NotebookText,
  Redo,
  Undo,
  X,
} from 'lucide-react';
import {AppButton} from '../../../../components/ui/AppButton';
import {Text} from '../../../../components/ui/Text';
import {cn} from '../../../../lib/utils';
import {DOMParser as ProseMirrorDOMParser} from '@tiptap/pm/model';
import {writingNotesToHtml} from '../../lib/writingDraftLayout';
import {clipboardHasRichHtml, htmlFromClipboardPlain} from '../../../../components/editors/pasteMarkdown';
import '../../../../styles/editor.css';

interface WritingNotesPaneProps {
  value: string;
  onChange: (html: string) => void;
  onClose: () => void;
  className?: string;
  /** Beside the script, the notes column is the quieter surface. */
  emphasis?: 'primary' | 'secondary';
  /** Copia o trecho selecionado para o roteiro, sem remover do rascunho. */
  onInsertIntoScript?: (text: string) => void;
  onEditorReady?: (editor: Editor | null) => void;
  onFocusChange?: (focused: boolean) => void;
  scrollTop?: number;
  onScrollTopChange?: (top: number) => void;
  documentId?: string;
}

export function WritingNotesPane({
  value,
  onChange,
  onClose,
  className,
  emphasis = 'primary',
  onInsertIntoScript,
  onEditorReady,
  onFocusChange,
  scrollTop,
  onScrollTopChange,
  documentId,
}: WritingNotesPaneProps) {
  const html = writingNotesToHtml(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const viewportRef = useRef<HTMLDivElement>(null);
  const lastEmittedRef = useRef(html);
  const [insertUi, setInsertUi] = useState<{text: string; top: number; left: number} | null>(null);
  const [, bumpHistory] = useState(0);

  const updateInsertUi = useCallback((current: Editor) => {
    if (!onInsertIntoScript || current.isDestroyed) {
      setInsertUi(null);
      return;
    }
    const {from, to, empty} = current.state.selection;
    const text = current.state.doc.textBetween(from, to, '\n').trim();
    if (empty || !text) {
      setInsertUi(null);
      return;
    }
    const viewport = viewportRef.current;
    if (!viewport) return;
    try {
      const start = current.view.coordsAtPos(from);
      const end = current.view.coordsAtPos(to);
      const rect = viewport.getBoundingClientRect();
      const top = Math.min(start.top, end.top) - rect.top + viewport.scrollTop - 40;
      const left = (Math.min(start.left, end.left) + Math.max(start.right, end.right)) / 2 - rect.left;
      setInsertUi({text, top: Math.max(8, top), left: Math.max(12, Math.min(left, rect.width - 140))});
    } catch {
      setInsertUi(null);
    }
  }, [onInsertIntoScript]);
  const updateInsertUiRef = useRef(updateInsertUi);
  updateInsertUiRef.current = updateInsertUi;
  const onFocusChangeRef = useRef(onFocusChange);
  onFocusChangeRef.current = onFocusChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        underline: false,
        link: {openOnClick: false},
        heading: {levels: [1, 2, 3]},
      }),
      Underline,
      Placeholder.configure({
        placeholder: 'Rascunho de apoio: ideias soltas, primeiras versões e referências…',
      }),
    ],
    content: html || '',
    editable: true,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        class: 'tiptap min-h-full max-w-none text-base text-[var(--text-primary)] focus:outline-none',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Rascunho de apoio',
      },
      handlePaste: (view, event) => {
        const clipboard = event.clipboardData;
        if (!clipboard) return false;
        if (clipboardHasRichHtml(clipboard.getData('text/html'))) return false;
        const pasted = htmlFromClipboardPlain(clipboard.getData('text/plain'));
        if (!pasted) return false;
        event.preventDefault();
        const holder = document.createElement('div');
        holder.innerHTML = pasted;
        const slice = ProseMirrorDOMParser.fromSchema(view.state.schema).parseSlice(holder, {
          preserveWhitespace: true,
        });
        view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
        return true;
      },
    },
    onUpdate: ({editor: current}) => {
      const next = current.getHTML();
      lastEmittedRef.current = next;
      onChangeRef.current(next === '<p></p>' ? '' : next);
      bumpHistory(n => n + 1);
    },
    onFocus: () => onFocusChangeRef.current?.(true),
    onBlur: ({editor: current}) => {
      onFocusChangeRef.current?.(false);
      window.setTimeout(() => {
        if (current.isDestroyed) return;
        const {empty, from, to} = current.state.selection;
        if (empty || from === to) setInsertUi(null);
      }, 120);
    },
    onSelectionUpdate: ({editor: current}) => {
      updateInsertUiRef.current(current);
      bumpHistory(n => n + 1);
    },
  }, [documentId]);

  const focusDraftEditor = useCallback((position: 'start' | 'end' = 'end') => {
    if (!editor || editor.isDestroyed) return;
    editor.chain().focus(position).run();
    onFocusChangeRef.current?.(true);
  }, [editor]);

  useEffect(() => {
    onEditorReady?.(editor ?? null);
    return () => onEditorReady?.(null);
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (html === lastEmittedRef.current) return;
    // Não sobrescreve enquanto digita — inclusive se o foco DOM oscilar no re-render.
    if (editor.isFocused || editor.view?.hasFocus?.()) return;
    const current = editor.getHTML();
    if (normalizeNotesHtml(current) === normalizeNotesHtml(html)) {
      lastEmittedRef.current = html;
      return;
    }
    editor.commands.setContent(html || '', {emitUpdate: false});
    lastEmittedRef.current = html;
  }, [editor, html]);

  useLayoutEffect(() => {
    if (scrollTop == null || !viewportRef.current) return;
    viewportRef.current.scrollTop = scrollTop;
  }, [scrollTop]);

  // Garante contenteditable após montar (evita painel “morto” em split/flex).
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (!editor.isEditable) editor.setEditable(true);
    const dom = editor.view?.dom;
    if (dom && dom.getAttribute('contenteditable') !== 'true') {
      dom.setAttribute('contenteditable', 'true');
    }
  }, [editor]);

  const canUndo = !!editor?.can().undo();
  const canRedo = !!editor?.can().redo();

  const embedded = emphasis === 'secondary';

  return (
    <section className={cn(
      'flex min-h-[28rem] max-h-[calc(100dvh-14rem)] flex-col overflow-hidden',
      !embedded && 'cms-panel',
      embedded ? 'bg-[var(--bg-primary)]' : null,
      className,
    )}>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border-color)] px-4 py-2.5 md:px-6">
        <span className="flex min-w-0 items-center gap-2">
          {!embedded ? (
            <NotebookText className="h-4 w-4 shrink-0 text-[var(--brand-accent-text)]" aria-hidden />
          ) : null}
          <Text variant="sectionTitle" className="truncate text-[length:var(--font-size-body)]">
            Rascunho de apoio
          </Text>
        </span>
        <AppButton
          type="button"
          variant="ghost"
          size="xs"
          iconOnly
          onClick={onClose}
          aria-label="Fechar rascunho de apoio"
          title="Fechar rascunho"
        >
          <X className="h-4 w-4" />
        </AppButton>
      </div>
      {!embedded ? (
        <div className="flex shrink-0 items-center gap-0.5 border-b border-[var(--border-color)] px-2 py-1">
          <HistoryButton
            label="Desfazer"
            disabled={!canUndo}
            onClick={() => {
              editor?.chain().focus().undo().run();
              onFocusChangeRef.current?.(true);
            }}
          >
            <Undo className="h-4 w-4" />
          </HistoryButton>
          <HistoryButton
            label="Refazer"
            disabled={!canRedo}
            onClick={() => {
              editor?.chain().focus().redo().run();
              onFocusChangeRef.current?.(true);
            }}
          >
            <Redo className="h-4 w-4" />
          </HistoryButton>
        </div>
      ) : null}
      <div
        ref={viewportRef}
        className={cn(
          'relative min-h-0 flex-1 cursor-text overflow-y-auto custom-scrollbar px-4 py-4 md:px-6',
          embedded ? 'bg-[var(--bg-primary)]' : 'bg-[var(--bg-elevated)]',
        )}
        onScroll={event => onScrollTopChange?.(event.currentTarget.scrollTop)}
        onPointerDown={event => {
          if (!editor || editor.isDestroyed || event.button !== 0) return;
          const target = event.target as HTMLElement;
          if (target.closest('button, a, input, textarea, select')) return;
          // Clique na área vazia (fora do nó editável) precisa focar o TipTap.
          if (target.closest('.ProseMirror')) {
            onFocusChangeRef.current?.(true);
            return;
          }
          event.preventDefault();
          focusDraftEditor('end');
        }}
      >
        {insertUi && onInsertIntoScript ? (
          <button
            type="button"
            className="absolute z-20 -translate-x-1/2 rounded-full border border-[var(--border-color)] bg-[var(--bg-elevated)] px-2.5 py-1 t-label text-[var(--brand-accent-text)] shadow-[var(--shadow-card)] transition hover:bg-[var(--bg-hover)]"
            style={{top: insertUi.top, left: insertUi.left}}
            onMouseDown={event => event.preventDefault()}
            onClick={() => {
              onInsertIntoScript(insertUi.text);
              setInsertUi(null);
            }}
          >
            Inserir no roteiro
          </button>
        ) : null}
        <EditorContent
          editor={editor}
          className="block h-full min-h-full max-w-none cursor-text [&_.tiptap]:min-h-full [&_.ProseMirror]:min-h-full"
        />
      </div>
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
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-input)] text-[var(--text-tertiary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function normalizeNotesHtml(value: string) {
  const trimmed = value.trim();
  return trimmed === '<p></p>' ? '' : trimmed;
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
