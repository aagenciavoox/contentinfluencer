import { Text } from '../ui/Text';
import { TextCount } from '../ui/TextCount';
import { useEditor, useEditorState, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { Extension, type Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import Typography from '@tiptap/extension-typography';
import { Placeholder } from '@tiptap/extensions';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { DOMParser as ProseMirrorDOMParser, type Node as ProseMirrorNode } from '@tiptap/pm/model';
import {
  Bold, Italic, Underline as UnderlineIcon, Undo, Redo, MessageSquarePlus,
  MessageSquare, Maximize2, Minimize2, X, Link as LinkIcon, Search,
} from 'lucide-react';
import {
  useState, useCallback, useEffect, useId, useMemo, useRef,
  type ReactNode, type RefObject, type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';
import '../../styles/editor.css';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useVisualViewportKeyboard } from '../../hooks/useVisualViewportKeyboard';
import { countScriptWords, formatSpokenDuration } from '../../features/contents/lib/spokenDuration';
import {
  clampDraftSplitRatio,
  readDraftSplitRatio,
  writeDraftSplitRatio,
} from '../../features/contents/lib/writingDraftLayout';
import { DraftSplitDivider } from '../../features/contents/components/detail/DraftSplitDivider';
import { EditorShortcuts, ReadableHighlight, SelectionClicks } from './editorExtensions';
import { EditorColorMenu } from './EditorColorMenu';
import { EditorToolbar } from './EditorToolbar';
import { FindReplaceBar } from './FindReplaceBar';
import { FindReplace } from './findReplace';
import { ConfirmModal } from '../feedback/modals/ConfirmModal';
import { clipboardHasRichHtml, htmlFromClipboardPlain } from './pasteMarkdown';
import { needsLegacyLineBreakRepair, repairLegacyLineBreaks } from './repairLineBreaks';
import {
  COMMENT_MIGRATION_META, CommentAnchor, addCommentAnchor, collectCommentRanges,
  migrateLegacyComments, removeCommentAnchor, type CommentRange,
} from './commentAnchors';
import { newCommentId, orderComments, type CommentPatch, type ScriptComment } from './commentModel';
import { CommentCard, CommentRail, CommentsPanel, DEFAULT_COMMENT_HIGHLIGHT } from './ScriptComments';

type Annotation = ScriptComment;
type TextRange = { from: number; to: number };
type DraftComment = { text: string; selection: TextRange; valid: boolean };
type AnnotationPosition = { id: string; top: number };
type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  /** Passe o ID do roteiro. A troca do ID reinicia editor, histórico e estados locais. */
  documentId?: string | number;
  /** Revisão numérica crescente do conteúdo externo, quando disponível. */
  contentRevision?: number;
  placeholder?: string;
  className?: string;
  editorViewportClassName?: string;
  editorCanvasClassName?: string;
  /** O ID é compartilhado pela anotação e pela marca inserida no documento. */
  onAddAnnotation?: (
    text: string, selection: TextRange, comment: string, id?: string,
  ) => void | Promise<void>;
  onPatchAnnotation?: (id: string, patch: CommentPatch) => void;
  annotations?: Annotation[];
  onRemoveAnnotation?: (id: string) => void;
  onUpdateAnnotation?: (id: string, comment: string, color?: string) => void;
  authorName?: string;
  documentTitle?: string;
  compactMobileComposer?: boolean;
  autoFocus?: boolean;
  variant?: 'default' | 'workspace';
  formatBar?: 'full' | 'writing';
  meter?: 'reading' | 'spoken' | 'none';
  toolbarStart?: ReactNode;
  toolbarEnd?: ReactNode;
  typographySlot?: ReactNode;
  /** "saved" deve ser informado pelo pai após a confirmação da persistência. */
  saveState?: SaveState;
  saveAction?: ReactNode;
  onRetrySave?: () => void;
  fullscreenAside?: ReactNode;
  onFullscreenChange?: (open: boolean) => void;
  notesPanelOpen?: boolean;
  onNotesPanelChange?: (open: boolean) => void;
  /** Editor TipTap do rascunho, para a barra de formatação seguir o foco. */
  draftEditor?: Editor | null;
  focusedPane?: 'script' | 'draft';
  onFocusedPaneChange?: (pane: 'script' | 'draft') => void;
  /** Registra inserção de texto na última posição do cursor do roteiro. */
  onRegisterInsertHandler?: (handler: ((text: string) => void) | null) => void;
}

const EMPTY_ANNOTATIONS: Annotation[] = [];
const WORDS_PER_SECOND = 2.5;
const RAIL_MIN_WIDTH = 1080;
const DEFAULT_COMMENT_BORDER = 'color-mix(in srgb, var(--warning), transparent 55%)';
const COMMENT_UI_META = 'richTextEditor:commentUI';
const EXTERNAL_CONTENT_META = 'richTextEditor:externalContent';
const FOCUSABLE = [
  'button:not([disabled])', 'a[href]', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])', '[contenteditable="true"]',
].join(',');

type CommentUIState = {
  decorations: DecorationSet;
  ranges: Map<string, CommentRange>;
  draft: DraftComment | null;
};
type CommentUIMeta = { appearance?: boolean; draft?: DraftComment | null };
const commentUIKey = new PluginKey<CommentUIState>('richTextEditorComments');

function sameRanges(a: Map<string, CommentRange>, b: Map<string, CommentRange>) {
  return a.size === b.size && [...b].every(([id, range]) =>
    a.get(id)?.from === range.from && a.get(id)?.to === range.to,
  );
}

function sameDraft(a: DraftComment | null, b: DraftComment | null) {
  return a === b || (!!a && !!b && a.text === b.text && a.valid === b.valid
    && a.selection.from === b.selection.from && a.selection.to === b.selection.to);
}

function samePositions(a: AnnotationPosition[], b: AnnotationPosition[]) {
  return a.length === b.length && a.every((item, index) =>
    item.id === b[index].id && item.top === b[index].top,
  );
}

function equivalentHTML(a: string, b: string) {
  const empty = (value: string) => /^(?:|<p>(?:<br\s*\/?>)?<\/p>)$/i.test(value.trim());
  return a === b || (empty(a) && empty(b));
}

function validHighlight(color: string | undefined) {
  if (!color || /[;{}]/.test(color)) return DEFAULT_COMMENT_HIGHLIGHT;
  return typeof CSS !== 'undefined' && !CSS.supports('color', color)
    ? DEFAULT_COMMENT_HIGHLIGHT : color;
}

function buildCommentDecorations(
  doc: ProseMirrorNode, notes: Annotation[], activeId: string | null,
) {
  if (!notes.length) return DecorationSet.empty;
  const byId = new Map(notes.map(note => [note.id, note]));
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText) return true;
    for (const mark of node.marks) {
      if (mark.type.name !== 'comment') continue;
      const note = byId.get(mark.attrs.commentId as string);
      if (!note || note.resolvedAt) continue;
      const active = activeId === note.id;
      decorations.push(Decoration.inline(pos, pos + node.nodeSize, {
        class: cn('annotation-highlight cursor-pointer', active && 'active-annotation'),
        style: `background-color: ${validHighlight(note.color)}; border-bottom: 2px solid ${
          active ? 'var(--accent-blue)' : DEFAULT_COMMENT_BORDER};`,
      }));
    }
    return false;
  });
  return DecorationSet.create(doc, decorations);
}

/** Mantém a seleção do comentário no mesmo sistema de coordenadas das transações. */
function createCommentUIExtension(getAppearance: () => {
  notes: Annotation[]; activeId: string | null;
}) {
  return Extension.create({
    name: 'richTextEditorCommentUI',
    addProseMirrorPlugins() {
      return [new Plugin<CommentUIState>({
        key: commentUIKey,
        state: {
          init: (_, state) => {
            const { notes, activeId } = getAppearance();
            return {
              decorations: buildCommentDecorations(state.doc, notes, activeId),
              ranges: collectCommentRanges(state.doc), draft: null,
            };
          },
          apply: (transaction, previous) => {
            const meta = transaction.getMeta(COMMENT_UI_META) as CommentUIMeta | undefined;
            let draft = previous.draft;
            if (draft && transaction.docChanged) {
              const from = transaction.mapping.map(draft.selection.from, 1);
              const to = transaction.mapping.map(draft.selection.to, -1);
              const validRange = from >= 0 && to > from && to <= transaction.doc.content.size;
              draft = {
                ...draft, selection: { from, to },
                valid: validRange && transaction.doc.textBetween(from, to, ' ') === draft.text,
              };
            }
            if (meta && Object.prototype.hasOwnProperty.call(meta, 'draft')) draft = meta.draft ?? null;
            if (transaction.getMeta(EXTERNAL_CONTENT_META)) draft = null;

            // Selecionar texto ou mover o cursor não reconstrói os destaques nem os ranges.
            if (!transaction.docChanged && !meta?.appearance) {
              return sameDraft(previous.draft, draft) ? previous : { ...previous, draft };
            }
            const { notes, activeId } = getAppearance();
            const nextRanges = transaction.docChanged
              ? collectCommentRanges(transaction.doc) : previous.ranges;
            return {
              decorations: buildCommentDecorations(transaction.doc, notes, activeId),
              ranges: sameRanges(previous.ranges, nextRanges) ? previous.ranges : nextRanges,
              draft,
            };
          },
        },
        props: { decorations: state => commentUIKey.getState(state)?.decorations ?? DecorationSet.empty },
      })];
    },
  });
}

function setCommentDraft(editor: Editor, draft: DraftComment | null) {
  if (editor.isDestroyed) return;
  editor.view.dispatch(editor.state.tr
    .setMeta(COMMENT_UI_META, { draft } satisfies CommentUIMeta)
    .setMeta('addToHistory', false));
}

/** As anotações têm ciclo próprio: Ctrl+Z não deve apagar apenas a marca do comentário. */
function mutateCommentAnchors(editor: Editor, mutate: () => void) {
  if (editor.isDestroyed) return;
  let failure: unknown;
  let failed = false;
  const transaction = editor.captureTransaction(() => {
    try { mutate(); } catch (error) { failure = error; failed = true; }
  });
  if (failed) throw failure;
  if (transaction) editor.view.dispatch(transaction.setMeta('addToHistory', false));
}

function formatReadingDuration(words: number, workspace: boolean) {
  const seconds = words ? Math.max(1, Math.round(words / WORDS_PER_SECOND)) : 0;
  if (workspace) {
    if (seconds < 60) return `${seconds} ${seconds === 1 ? 'segundo' : 'segundos'} de leitura`;
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes} min${remainder ? ` ${remainder} s` : ''} de leitura`;
  }
  return seconds >= 60 ? `~${Math.round(seconds / 60)} min` : `~${seconds}s`;
}

function controlClass(active: boolean) {
  return cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-input)] transition-colors disabled:opacity-40',
    active ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]');
}

type ContentConflict = { html: string; revision?: number };

/** Ecos antigos de onChange são reconhecidos; versões desconhecidas exigem uma escolha. */
function useEditorContentSync(
  editor: Editor | null, content: string, contentRevision: number | undefined,
  onChange: (html: string) => void, protectLocal: boolean,
) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const acceptedRef = useRef(content);
  const highestRevisionRef = useRef(contentRevision);
  const localPendingRef = useRef(false);
  const emittedRef = useRef(new Set<string>([content]));
  const [conflict, setConflict] = useState<ContentConflict | null>(null);

  const publish = useCallback((html: string) => {
    if (equivalentHTML(html, acceptedRef.current) && !localPendingRef.current) return;
    localPendingRef.current = true;
    emittedRef.current.add(html);
    // Limita apenas o reconhecimento de ecos. Ecos mais antigos viram conflito, nunca sobrescrita.
    if (emittedRef.current.size > 200) {
      const oldest = emittedRef.current.values().next().value;
      if (oldest !== undefined) emittedRef.current.delete(oldest);
    }
    onChangeRef.current(html);
  }, []);

  const load = useCallback((html: string) => {
    if (!editor || editor.isDestroyed) return;
    editor.chain().setMeta(EXTERNAL_CONTENT_META, true).setMeta('addToHistory', false)
      .setContent(html, { emitUpdate: false }).run();
    acceptedRef.current = html;
    localPendingRef.current = false;
    emittedRef.current.add(html);
    setConflict(null);
  }, [editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const highest = highestRevisionRef.current;
    if (contentRevision !== undefined && highest !== undefined && contentRevision < highest) return;
    const newerRevision = contentRevision !== undefined && (highest === undefined || contentRevision > highest);
    if (contentRevision !== undefined) highestRevisionRef.current = contentRevision;

    const current = editor.getHTML();
    if (equivalentHTML(content, current)) {
      acceptedRef.current = content;
      localPendingRef.current = false;
      setConflict(null);
      return;
    }
    const knownVersion = emittedRef.current.has(content) || equivalentHTML(content, acceptedRef.current);
    if (knownVersion && !newerRevision) return;
    // Foco também protege o intervalo entre a última edição e um eventual eco do pai.
    if (localPendingRef.current || protectLocal || editor.isFocused || (knownVersion && newerRevision)) {
      setConflict({ html: content, revision: contentRevision });
      return;
    }
    load(content);
  }, [content, contentRevision, editor, load, protectLocal]);

  const keepLocal = useCallback(() => {
    if (!editor || editor.isDestroyed || !conflict) return;
    // A mesma versão rejeitada não reapresenta o aviso a cada renderização.
    acceptedRef.current = conflict.html;
    setConflict(null);
    publish(editor.getHTML());
  }, [conflict, editor, publish]);

  return { publish, conflict, keepLocal, acceptIncoming: () => conflict && load(conflict.html) };
}

function useFocusScope(
  open: boolean, ref: RefObject<HTMLDivElement | null>, onClose?: () => void,
) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => {
      const root = ref.current;
      if (root && !root.contains(document.activeElement)) {
        (root.querySelector<HTMLElement>('[data-autofocus]') ?? root).focus();
      }
    });
    const onKeyDown = (event: KeyboardEvent) => {
      const root = ref.current;
      if (!root || event.defaultPrevented) return;
      if (event.key === 'Escape' && closeRef.current) {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
      }
      if (event.key !== 'Tab') return;
      const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)]
        .filter(item => !item.closest('[hidden], [aria-hidden="true"], [inert]') && item.getClientRects().length > 0);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) { event.preventDefault(); root.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === root)) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [open, ref]);
}

function EditorDialog({ title, onClose, children }: {
  title: string; onClose: () => void; children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusScope(true, ref, onClose);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-end justify-center bg-[var(--overlay-scrim)] p-4 sm:items-center"
      onPointerDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-5 text-[var(--text-primary)] shadow-[var(--shadow-modal)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Text variant="bodyStrong" as="h2" id={titleId} className="text-inherit">{title}</Text>
          <button type="button" aria-label="Fechar diálogo" onClick={onClose} className={controlClass(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>, document.body,
  );
}

function CommentComposer({ draft, value, onChange, onSubmit, onCancel, authorName, pending, error }: {
  draft: DraftComment; value: string; onChange: (text: string) => void;
  onSubmit: () => void; onCancel: () => void; authorName: string; pending: boolean; error: string | null;
}) {
  const inputId = useId();
  const errorId = useId();
  const onKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); onSubmit(); }
    if (event.key === 'Escape' && !pending) {
      event.preventDefault(); event.stopPropagation(); onCancel();
    }
  };
  return (
    <form onSubmit={event => { event.preventDefault(); onSubmit(); }} aria-busy={pending}>
      <Text variant="label" as="p" className="mb-2 text-inherit">{authorName}</Text>
      <blockquote className="mb-3 line-clamp-3 border-l-2 border-[var(--border-strong)] pl-3 t-secondary italic text-[var(--text-secondary)]">
        “{draft.text}”
      </blockquote>
      <label htmlFor={inputId} className="mb-1 block t-label ">Comentário</label>
      <textarea id={inputId} data-autofocus autoFocus value={value} disabled={pending}
        onChange={event => onChange(event.target.value)} onKeyDown={onKeyDown}
        placeholder="O que você quer comentar?" aria-describedby={error || !draft.valid ? errorId : undefined}
        className="min-h-[88px] w-full resize-y rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--text-primary)] focus:border-[var(--accent-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]" />
      {error || !draft.valid ? (
        <Text variant="body" as="p" id={errorId} role="alert" className="mt-2 text-[var(--text-primary)]">
          {error ?? 'O trecho foi alterado ou excluído. Cancele e selecione novamente o texto para comentar.'}
        </Text>
      ) : null}
      <div className="mt-4 flex items-center justify-end gap-3">
        <button type="button" disabled={pending} onClick={onCancel}
          className="min-h-10 rounded-[var(--radius-input)] px-3 t-secondary text-[var(--text-secondary)] disabled:opacity-40">Cancelar</button>
        <button type="submit" disabled={pending || !value.trim() || !draft.valid}
          className="min-h-10 rounded-[var(--radius-input)] bg-[var(--accent-blue)] px-4 t-body-strong text-white disabled:opacity-40">
          {pending ? 'Enviando…' : 'Comentar'}
        </button>
      </div>
    </form>
  );
}

function LinkEditor({ initialURL, onApply, onClose }: {
  initialURL: string; onApply: (url: string) => void; onClose: () => void;
}) {
  const [url, setURL] = useState(initialURL);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();
  return (
    <EditorDialog title="Inserir ou editar link" onClose={onClose}>
      <form onSubmit={event => {
        event.preventDefault();
        const value = url.trim();
        if (!value) { onApply(''); return; }
        const normalized = /^(?:https?:\/\/|mailto:|tel:|\/|#)/i.test(value) ? value : `https://${value}`;
        const unsafeScheme = /^[a-z][a-z\d+.-]*:/i.test(value) && !/^(https?:|mailto:|tel:)/i.test(value);
        if (unsafeScheme || /^\/\//.test(normalized)) {
          setError('Use um endereço http, https, mailto, tel ou um caminho interno.'); return;
        }
        try {
          if (/^https?:/i.test(normalized)) new URL(normalized);
          onApply(normalized);
        } catch { setError('Confira o endereço informado.'); }
      }}>
        <label htmlFor={inputId} className="mb-1 block t-label ">Endereço</label>
        <input id={inputId} data-autofocus autoFocus type="text" inputMode="url" autoComplete="url"
          value={url} onChange={event => { setURL(event.target.value); setError(null); }}
          aria-invalid={!!error} aria-describedby={error ? errorId : undefined} placeholder="https://exemplo.com"
          className="w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]" />
        {error ? <Text variant="body" as="p" id={errorId} role="alert" className="mt-2 text-inherit">{error}</Text> : null}
        <Text variant="meta" as="p" className="mt-2 text-[var(--text-secondary)]">Deixe vazio para remover o link.</Text>
        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="min-h-10 px-3 t-body">Cancelar</button>
          <button type="submit" className="min-h-10 rounded-[var(--radius-input)] bg-[var(--accent-blue)] px-4 t-body-strong text-white">Aplicar</button>
        </div>
      </form>
    </EditorDialog>
  );
}

function FormattingBubble({ editor, blocked, onComment, onLink }: {
  editor: Editor; blocked: boolean; onComment?: () => void; onLink: () => void;
}) {
  const state = useEditorState({ editor, selector: ({ editor: current }) => ({
    bold: current.isActive('bold'), italic: current.isActive('italic'),
    underline: current.isActive('underline'), link: current.isActive('link'),
  }) });
  return (
    <BubbleMenu editor={editor} options={{ placement: 'top', offset: 8 }}
      shouldShow={({ editor: current, state: editorState }) =>
        !blocked && current.isEditable && current.isFocused && !editorState.selection.empty}
      className="z-[150] flex items-center gap-0.5 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-1 shadow-[var(--shadow-dropdown)]">
      {([
        { id: 'bold', label: 'Negrito', icon: Bold, run: () => editor.chain().focus().toggleBold().run() },
        { id: 'italic', label: 'Itálico', icon: Italic, run: () => editor.chain().focus().toggleItalic().run() },
        { id: 'underline', label: 'Sublinhado', icon: UnderlineIcon, run: () => editor.chain().focus().toggleUnderline().run() },
      ] as const).map(action => {
        const Icon = action.icon;
        return <button key={action.id} type="button" onMouseDown={event => event.preventDefault()}
          onClick={action.run} title={action.label} aria-label={action.label} aria-pressed={state[action.id]}
          className={controlClass(state[action.id])}><Icon className="h-4 w-4" /></button>;
      })}
      <EditorColorMenu editor={editor} kind="highlight" size="sm" neutral />
      <button type="button" onMouseDown={event => event.preventDefault()} onClick={onLink}
        title="Link" aria-label="Link" aria-pressed={state.link} className={controlClass(state.link)}><LinkIcon className="h-4 w-4" /></button>
      {onComment ? <button type="button" onMouseDown={event => event.preventDefault()} onClick={onComment}
        title="Comentar trecho" aria-label="Comentar trecho selecionado" className={controlClass(false)}><MessageSquarePlus className="h-4 w-4" /></button> : null}
    </BubbleMenu>
  );
}

function MobileQuickToolbar({ editor, toolbarStart, onComment, onComments, onLink, onFind, onExpand, count }: {
  editor: Editor; toolbarStart?: ReactNode; onComment?: () => void; onComments?: () => void;
  onLink: () => void; onFind: () => void; onExpand: () => void; count: number;
}) {
  const keyboard = useVisualViewportKeyboard();
  const state = useEditorState({ editor, selector: ({ editor: current }) => ({
    bold: current.isActive('bold'), italic: current.isActive('italic'),
    selection: !current.state.selection.empty, undo: current.can().undo(), redo: current.can().redo(),
  }) });
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 z-[160] px-3"
      style={{ bottom: keyboard.open ? keyboard.inset : 'max(0.75rem, env(safe-area-inset-bottom))' }}>
      <div role="toolbar" aria-label="Formatação rápida" className="pointer-events-auto mx-auto flex max-w-lg items-center gap-0.5 overflow-x-auto rounded-[var(--radius-pill)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1 shadow-[var(--shadow-dropdown)]">
        {toolbarStart}
        <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => editor.chain().focus().undo().run()}
          disabled={!state.undo} aria-label="Desfazer" className={controlClass(false)}><Undo className="h-4 w-4" /></button>
        <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => editor.chain().focus().redo().run()}
          disabled={!state.redo} aria-label="Refazer" className={controlClass(false)}><Redo className="h-4 w-4" /></button>
        <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label="Negrito" aria-pressed={state.bold} className={controlClass(state.bold)}><Bold className="h-4 w-4" /></button>
        <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Itálico" aria-pressed={state.italic} className={controlClass(state.italic)}><Italic className="h-4 w-4" /></button>
        <EditorColorMenu editor={editor} kind="highlight" presentation="sheet" />
        <button type="button" onMouseDown={event => event.preventDefault()} onClick={onLink} aria-label="Inserir link" className={controlClass(false)}><LinkIcon className="h-4 w-4" /></button>
        {onComment ? <button type="button" onMouseDown={event => event.preventDefault()} onClick={onComment}
          disabled={!state.selection} aria-label="Comentar trecho selecionado" className={controlClass(false)}><MessageSquarePlus className="h-4 w-4" /></button> : null}
        {onComments ? <button type="button" onClick={onComments} aria-label={`Ver todos os comentários (${count})`}
          className="flex h-10 shrink-0 items-center gap-1 rounded-full px-2 t-body"><MessageSquare className="h-4 w-4" />{count}</button> : null}
        <button type="button" onClick={onFind} aria-label="Buscar no texto" className={controlClass(false)}><Search className="h-4 w-4" /></button>
        <button type="button" onClick={onExpand} aria-label="Expandir editor" className={controlClass(false)}><Maximize2 className="h-4 w-4" /></button>
      </div>
    </div>, document.body,
  );
}

/** O key impede que histórico, migrações e rascunhos vazem entre documentos. */
export function RichTextEditor(props: RichTextEditorProps) {
  return <RichTextEditorInstance key={props.documentId ?? '__rich-text-default__'} {...props} />;
}

function RichTextEditorInstance({
  content, onChange, contentRevision, placeholder, className, editorViewportClassName,
  editorCanvasClassName, onAddAnnotation, annotations = EMPTY_ANNOTATIONS,
  onRemoveAnnotation, onUpdateAnnotation, onPatchAnnotation, authorName = 'Você',
  documentTitle = 'Novo roteiro', compactMobileComposer = false, autoFocus = false,
  variant = 'default', formatBar = 'full', meter = 'reading', toolbarStart, toolbarEnd,
  typographySlot, saveState = 'idle', saveAction, onRetrySave, fullscreenAside,
  onFullscreenChange, notesPanelOpen = false, onNotesPanelChange,
  draftEditor = null, focusedPane = 'script', onFocusedPaneChange, onRegisterInsertHandler,
}: RichTextEditorProps) {
  const isMobile = useIsMobile();
  const isWorkspace = variant === 'workspace';
  const writingBar = formatBar === 'writing';
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsPanelOpen, setCommentsPanelOpen] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [draftCommentText, setDraftCommentText] = useState('');
  const [activeDraft, setActiveDraft] = useState<DraftComment | null>(null);
  const [commentPending, setCommentPending] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentRanges, setCommentRanges] = useState<Map<string, CommentRange>>(() => new Map());
  const [annotationPositions, setAnnotationPositions] = useState<AnnotationPosition[]>([]);
  const [draftTop, setDraftTop] = useState<number | null>(null);
  const [wideLayout, setWideLayout] = useState(false);
  const [wordCount, setWordCount] = useState(() => countScriptWords(content));
  const [localDirty, setLocalDirty] = useState(false);
  const [findMode, setFindMode] = useState<'find' | 'replace' | null>(null);
  const [findToken, setFindToken] = useState(0);
  const [linkRequest, setLinkRequest] = useState<{ url: string; range: TextRange } | null>(null);
  const [draftRatio, setDraftRatio] = useState(() => readDraftSplitRatio(false));
  const [splitWidth, setSplitWidth] = useState(0);
  const [mobileFocusPane, setMobileFocusPane] = useState<'script' | 'draft'>('script');
  const [repairConfirmOpen, setRepairConfirmOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorViewportRef = useRef<HTMLDivElement>(null);
  const splitRowRef = useRef<HTMLDivElement>(null);
  const scriptScrollRef = useRef(0);
  const lastCursorRef = useRef<number | null>(null);
  const selectionRef = useRef<{from: number; to: number} | null>(null);
  const placeholderRef = useRef(placeholder);
  placeholderRef.current = placeholder;
  const appearanceRef = useRef({ notes: annotations, activeId: expandedNoteId });
  appearanceRef.current = { notes: annotations, activeId: expandedNoteId };
  const callbacksRef = useRef({ onFullscreenChange, onRetrySave, onRegisterInsertHandler });
  callbacksRef.current = { onFullscreenChange, onRetrySave, onRegisterInsertHandler };
  const fullscreenRef = useRef(false);
  const publishRef = useRef<(html: string) => void>(() => {});
  const commentShortcutRef = useRef<() => void>(() => {});
  const linkShortcutRef = useRef<() => void>(() => {});
  const migrationAttemptRef = useRef(new Map<string, ProseMirrorNode>());
  const submittingRef = useRef(false);
  const mountedRef = useRef(true);
  const editVersionRef = useRef(0);
  const saveVersionRef = useRef<number | null>(null);
  const commentsEnabled = !!onAddAnnotation || annotations.length > 0;
  const showDraftPane = notesPanelOpen && !!fullscreenAside;
  const narrowSplit = isMobile || (showDraftPane && splitWidth > 0 && splitWidth < 720);
  const mobileDraftOnly = showDraftPane && narrowSplit && mobileFocusPane === 'draft';
  const hideScriptPane = mobileDraftOnly;
  const hideDraftPane = !showDraftPane || (narrowSplit && mobileFocusPane === 'script');
  const splitInPanel = showDraftPane && !narrowSplit;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const setFullscreen = useCallback((open: boolean) => {
    if (editorViewportRef.current) {
      scriptScrollRef.current = editorViewportRef.current.scrollTop;
    }
    fullscreenRef.current = open;
    setIsFullscreen(open);
    callbacksRef.current.onFullscreenChange?.(open);
    if (open) setMobileFocusPane('script');
  }, []);
  useEffect(() => () => {
    if (fullscreenRef.current) callbacksRef.current.onFullscreenChange?.(false);
  }, []);

  useEffect(() => {
    setDraftRatio(readDraftSplitRatio(isMobile));
  }, [isMobile]);

  // Ctrl+Shift+\ modo foco; Ctrl+Shift+N rascunho. (Ctrl+\ continua limpar formatação.)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey) return;
      if (event.key === '\\' || event.code === 'Backslash') {
        event.preventDefault();
        setFullscreen(!fullscreenRef.current);
        return;
      }
      if ((event.key === 'n' || event.key === 'N') && onNotesPanelChange) {
        event.preventDefault();
        onNotesPanelChange(!notesPanelOpen);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [notesPanelOpen, onNotesPanelChange, setFullscreen]);

  useEffect(() => {
    if (!showDraftPane) return;
    const row = splitRowRef.current;
    if (!row) return;
    const measure = () => setSplitWidth(row.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, [showDraftPane, narrowSplit, isFullscreen]);

  useEffect(() => {
    if (!editorViewportRef.current) return;
    editorViewportRef.current.scrollTop = scriptScrollRef.current;
  }, [isFullscreen, hideScriptPane]);
  const openFind = useCallback((mode: 'find' | 'replace') => {
    setFindMode(mode); setFindToken(token => token + 1);
  }, []);

  const extensions = useMemo(() => [
    StarterKit.configure({
      underline: false,
      link: { openOnClick: false },
      bulletList: { keepMarks: true, keepAttributes: false },
      orderedList: { keepMarks: true, keepAttributes: false },
    }),
    Underline, ReadableHighlight, TextStyle, Color,
    TextAlign.configure({ types: ['heading', 'paragraph'] }), Typography, SelectionClicks,
    EditorShortcuts.configure({
      onComment: () => commentShortcutRef.current(), onFind: openFind,
      onLink: () => linkShortcutRef.current(),
    }),
    FindReplace, CommentAnchor,
    createCommentUIExtension(() => appearanceRef.current),
    Placeholder.configure({ placeholder: () => placeholderRef.current ?? '' }),
  ], [openFind]);

  const editor = useEditor({
    extensions, content, immediatelyRender: false, shouldRerenderOnTransaction: false,
    onUpdate: ({ editor: current, transaction }) => {
      if (!transaction.docChanged || transaction.getMeta(EXTERNAL_CONTENT_META)
        || transaction.getMeta(COMMENT_MIGRATION_META)) return;
      // Alterações estruturais e de formatação também precisam ser persistidas.
      editVersionRef.current += 1;
      setLocalDirty(true);
      publishRef.current(current.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'tiptap min-h-[inherit] max-w-none text-base text-[var(--text-primary)] focus:outline-none md:text-[inherit]',
        role: 'textbox', 'aria-multiline': 'true', 'aria-label': documentTitle,
      },
      handlePaste: (view, event) => {
        const clipboard = event.clipboardData;
        if (!clipboard) return false;
        const richHtml = clipboard.getData('text/html');
        if (clipboardHasRichHtml(richHtml)) return false;
        const plain = clipboard.getData('text/plain');
        const html = htmlFromClipboardPlain(plain);
        if (!html) return false;
        event.preventDefault();
        const holder = document.createElement('div');
        holder.innerHTML = html;
        const slice = ProseMirrorDOMParser.fromSchema(view.state.schema).parseSlice(holder, {
          preserveWhitespace: true,
        });
        view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
        return true;
      },
    },
  });

  const sync = useEditorContentSync(editor, content, contentRevision, onChange, localDirty);
  publishRef.current = sync.publish;
  const activeToolbarEditor = focusedPane === 'draft' && draftEditor && !draftEditor.isDestroyed
    ? draftEditor
    : editor;

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.view.dom.setAttribute('aria-label', documentTitle);
    // Atualiza o placeholder sem reconstruir a instância ou perder o histórico.
    editor.view.dispatch(editor.state.tr.setMeta('addToHistory', false));
  }, [documentTitle, editor, placeholder]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const rememberCursor = () => {
      const {from, to} = editor.state.selection;
      lastCursorRef.current = to;
      selectionRef.current = {from, to};
      onFocusedPaneChange?.('script');
    };
    editor.on('selectionUpdate', rememberCursor);
    editor.on('focus', rememberCursor);
    return () => {
      editor.off('selectionUpdate', rememberCursor);
      editor.off('focus', rememberCursor);
    };
  }, [editor, onFocusedPaneChange]);

  useEffect(() => {
    if (!editor || editor.isDestroyed || !selectionRef.current) return;
    const {from, to} = selectionRef.current;
    const size = editor.state.doc.content.size;
    const nextFrom = Math.max(0, Math.min(from, size));
    const nextTo = Math.max(nextFrom, Math.min(to, size));
    const frame = requestAnimationFrame(() => {
      if (editor.isDestroyed) return;
      editor.commands.setTextSelection({from: nextFrom, to: nextTo});
    });
    return () => cancelAnimationFrame(frame);
  }, [editor, isFullscreen]);

  useEffect(() => {
    if (!editor || editor.isDestroyed || !onRegisterInsertHandler) return;
    const insertPlain = (text: string) => {
      if (!editor || editor.isDestroyed || !text) return;
      const size = editor.state.doc.content.size;
      const fallback = editor.state.selection.to;
      const pos = Math.max(0, Math.min(lastCursorRef.current ?? fallback, size));
      const html = text
        .split(/\n{2,}/)
        .map(block => `<p>${block.replace(/\n/g, '<br>')}</p>`)
        .join('');
      editor.chain().focus().insertContentAt(pos, html || text).run();
      lastCursorRef.current = editor.state.selection.to;
      onFocusedPaneChange?.('script');
    };
    onRegisterInsertHandler(insertPlain);
    return () => onRegisterInsertHandler(null);
  }, [editor, onFocusedPaneChange, onRegisterInsertHandler]);

  useEffect(() => {
    if (!editor || !autoFocus) return;
    const frame = requestAnimationFrame(() => { if (!editor.isDestroyed) editor.commands.focus('end'); });
    return () => cancelAnimationFrame(frame);
  }, [autoFocus, editor]);

  useEffect(() => {
    if (saveState === 'saving') saveVersionRef.current = editVersionRef.current;
    if (saveState === 'saved') {
      if (saveVersionRef.current === null || saveVersionRef.current === editVersionRef.current) setLocalDirty(false);
      saveVersionRef.current = null;
    }
  }, [saveState]);

  // Transações sem update (hidratação, por exemplo) também atualizam ranges e contador.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const refresh = (state: EditorState, changed = true) => {
      const ui = commentUIKey.getState(state);
      if (ui) {
        setCommentRanges(current => sameRanges(current, ui.ranges) ? current : ui.ranges);
        setActiveDraft(current => sameDraft(current, ui.draft) ? current : ui.draft);
      }
      if (changed) setWordCount(countScriptWords(editor.getHTML()));
    };
    refresh(editor.state);
    // Mantém o listener tipado pelo evento concreto, sem depender de onUpdate.
    const listener = ({ transaction }: { transaction: import('@tiptap/pm/state').Transaction }) => {
      refresh(editor.state, transaction.docChanged);
      if (transaction.docChanged) {
        if (transaction.getMeta(EXTERNAL_CONTENT_META)) {
          setLinkRequest(null);
          return;
        }
        setLinkRequest(current => {
          if (!current) return current;
          return { ...current, range: {
            from: transaction.mapping.map(current.range.from, 1),
            to: transaction.mapping.map(current.range.to, -1),
          } };
        });
      }
    };
    editor.on('transaction', listener);
    return () => { editor.off('transaction', listener); };
  }, [editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed || !annotations.length) return;
    const before = editor.state.doc;
    const existing = collectCommentRanges(before);
    const pending = annotations.filter(note => note.id && !existing.has(note.id)
      && migrationAttemptRef.current.get(note.id) !== before);
    if (!pending.length || !before.textContent.trim()) return;
    // Falhas só são bloqueadas para esta versão do documento; outra versão permite nova tentativa.
    for (const note of pending) migrationAttemptRef.current.set(note.id, before);
    mutateCommentAnchors(editor, () => migrateLegacyComments(editor, pending));
    if (!editor.state.doc.eq(before)) {
      publishRef.current(editor.getHTML());
      setLocalDirty(true);
      editVersionRef.current += 1;
    }
  }, [annotations, content, editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.view.dispatch(editor.state.tr
      .setMeta(COMMENT_UI_META, { appearance: true } satisfies CommentUIMeta)
      .setMeta('addToHistory', false));
  }, [annotations, editor, expandedNoteId]);

  const positions = useMemo(() => new Map([...commentRanges].map(([id, range]) => [id, range.from])), [commentRanges]);
  const resolvedCount = useMemo(() => annotations.filter(note => note.resolvedAt).length, [annotations]);
  const openCount = annotations.length - resolvedCount;
  const unanchoredIds = useMemo(() => new Set(annotations.filter(note => !commentRanges.has(note.id)).map(note => note.id)), [annotations, commentRanges]);
  const sortedAnnotations = useMemo(() => orderComments(
    annotations.filter(note => !!note.id && (showResolved || !note.resolvedAt)), positions,
  ), [annotations, positions, showResolved]);
  const railNotes = useMemo(() => sortedAnnotations.filter(note => commentRanges.has(note.id)), [sortedAnnotations, commentRanges]);
  const railVisible = commentsEnabled && !isMobile && wideLayout && commentsOpen
    && !commentsPanelOpen && (railNotes.length > 0 || !!activeDraft);
  const showDraftModal = !!activeDraft && !railVisible;
  const modalOpen = showDraftModal || !!linkRequest;
  useBodyScrollLock(isFullscreen || modalOpen || commentsPanelOpen);
  useFocusScope(isFullscreen && !modalOpen && !commentsPanelOpen, shellRef, () => {
    if (findMode) setFindMode(null);
    else setFullscreen(false);
  });

  // Mede o espaço real do editor, já descontando painéis e padding.
  useEffect(() => {
    const viewport = editorViewportRef.current;
    if (!viewport) return;
    const measure = () => {
      const style = getComputedStyle(viewport);
      const available = viewport.clientWidth - parseFloat(style.paddingLeft || '0') - parseFloat(style.paddingRight || '0');
      setWideLayout(available >= RAIL_MIN_WIDTH);
    };
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure);
      observer.observe(viewport);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [editor, isFullscreen, fullscreenAside]);

  useEffect(() => {
    if (!editor || editor.isDestroyed || !railVisible) {
      setAnnotationPositions(current => current.length ? [] : current);
      setDraftTop(null);
      return;
    }
    let frame = 0;
    let disposed = false;
    const measure = () => {
      frame = 0;
      const container = editorContainerRef.current;
      if (!container || editor.isDestroyed) return;
      const rect = container.getBoundingClientRect();
      const topOf = (pos: number) => {
        try { return Math.max(0, Math.round(editor.view.coordsAtPos(pos).top - rect.top - 4)); }
        catch { return null; }
      };
      const next: AnnotationPosition[] = [];
      for (const note of railNotes) {
        const range = commentRanges.get(note.id);
        const top = range ? topOf(range.from) : null;
        if (top !== null) next.push({ id: note.id, top });
      }
      setAnnotationPositions(current => samePositions(current, next) ? current : next);
      setDraftTop(activeDraft ? topOf(activeDraft.selection.from) ?? 0 : null);
    };
    const schedule = () => { if (!disposed && !frame) frame = requestAnimationFrame(measure); };
    schedule();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    if (editorContainerRef.current) observer?.observe(editorContainerRef.current);
    if (editorViewportRef.current) observer?.observe(editorViewportRef.current);
    editor.on('update', schedule);
    window.addEventListener('resize', schedule);
    document.fonts?.addEventListener('loadingdone', schedule);
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer?.disconnect();
      editor.off('update', schedule);
      window.removeEventListener('resize', schedule);
      document.fonts?.removeEventListener('loadingdone', schedule);
    };
  }, [activeDraft, commentRanges, editor, railNotes, railVisible]);

  const startCommenting = useCallback(() => {
    if (!editor || editor.isDestroyed || !onAddAnnotation || submittingRef.current || linkRequest) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ');
    if (!text.trim()) return;
    setCommentsOpen(true); setCommentsPanelOpen(false); setCommentError(null); setDraftCommentText('');
    setCommentDraft(editor, { text, selection: { from, to }, valid: true });
  }, [editor, linkRequest, onAddAnnotation]);
  commentShortcutRef.current = startCommenting;

  const cancelComment = useCallback(() => {
    if (editor && !submittingRef.current) {
      setCommentDraft(editor, null); setDraftCommentText(''); setCommentError(null);
      editor.commands.focus();
    }
  }, [editor]);

  const submitComment = useCallback(async () => {
    if (!editor || editor.isDestroyed || !onAddAnnotation || submittingRef.current || !draftCommentText.trim()) return;
    const draft = commentUIKey.getState(editor.state)?.draft;
    if (!draft?.valid) return;
    const { from, to } = draft.selection;
    if (from < 0 || to <= from || to > editor.state.doc.content.size
      || editor.state.doc.textBetween(from, to, ' ') !== draft.text) {
      setCommentError('O trecho mudou. Selecione novamente o texto para comentar.'); return;
    }
    const id = newCommentId();
    submittingRef.current = true; setCommentPending(true); setCommentError(null);
    try {
      // A marca passa a acompanhar a edição antes de iniciar uma possível operação assíncrona.
      mutateCommentAnchors(editor, () => addCommentAnchor(editor, id, from, to));
      if (!collectCommentRanges(editor.state.doc).has(id)) throw new Error('Não foi possível vincular o comentário ao trecho.');
      await onAddAnnotation(draft.text, draft.selection, draftCommentText.trim(), id);
      if (!mountedRef.current || editor.isDestroyed) return;
      setExpandedNoteId(id); setCommentDraft(editor, null); setDraftCommentText('');
    } catch {
      if (!editor.isDestroyed) mutateCommentAnchors(editor, () => removeCommentAnchor(editor, id));
      if (mountedRef.current) setCommentError('Não foi possível adicionar o comentário. Seu texto foi mantido; tente novamente.');
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) setCommentPending(false);
    }
  }, [draftCommentText, editor, onAddAnnotation]);

  const selectComment = useCallback((id: string) => {
    setExpandedNoteId(id);
    const range = commentRanges.get(id);
    if (range && editor && !editor.isDestroyed) editor.chain().setTextSelection(range).scrollIntoView().run();
  }, [commentRanges, editor]);

  const handleEditorPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!editor || editor.isDestroyed || event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select')) return;
    const marked = target.closest<HTMLElement>('[data-comment-id]');
    const id = marked?.getAttribute('data-comment-id');
    if (id && annotations.some(note => note.id === id && !note.resolvedAt)) setExpandedNoteId(id);
    // O navegador e o ProseMirror cuidam de cursor, arraste, duplo clique e toque no texto.
    if (target.closest('.ProseMirror')) return;
    event.preventDefault();
    editor.commands.focus('end');
  }, [annotations, editor]);

  const requestLink = useCallback(() => {
    if (!editor || editor.isDestroyed || activeDraft || submittingRef.current) return;
    setLinkRequest({ url: editor.getAttributes('link').href as string || '', range: {
      from: editor.state.selection.from, to: editor.state.selection.to,
    } });
  }, [activeDraft, editor]);
  linkShortcutRef.current = requestLink;
  const applyLink = useCallback((url: string) => {
    if (!editor || editor.isDestroyed || !linkRequest) return;
    const size = editor.state.doc.content.size;
    const from = Math.max(0, Math.min(linkRequest.range.from, size));
    const to = Math.max(from, Math.min(linkRequest.range.to, size));
    const chain = editor.chain().focus().setTextSelection({ from, to }).extendMarkRange('link');
    if (url) chain.setLink({ href: url }).run(); else chain.unsetLink().run();
    setLinkRequest(null);
  }, [editor, linkRequest]);

  const renderCommentCard = (note: Annotation, inPanel = false) => (
    <CommentCard note={note} authorName={authorName} active={expandedNoteId === note.id}
      unanchored={unanchoredIds.has(note.id)} showQuote={inPanel}
      onActivate={() => expandedNoteId === note.id && !inPanel ? setExpandedNoteId(null) : selectComment(note.id)}
      onReply={onPatchAnnotation ? text => onPatchAnnotation(note.id, {
        replies: [...(note.replies ?? []), { id: newCommentId(), comment: text, authorName, createdAt: new Date().toISOString() }],
      }) : undefined}
      onToggleResolved={onPatchAnnotation ? () => {
        const resolving = !note.resolvedAt;
        onPatchAnnotation(note.id, { resolvedAt: resolving ? new Date().toISOString() : null });
        if (resolving && expandedNoteId === note.id) setExpandedNoteId(null);
      } : undefined}
      onDelete={onRemoveAnnotation ? () => {
        if (editor && !editor.isDestroyed) mutateCommentAnchors(editor, () => removeCommentAnchor(editor, note.id));
        onRemoveAnnotation(note.id);
        if (expandedNoteId === note.id) setExpandedNoteId(null);
      } : undefined}
      onColor={onUpdateAnnotation ? color => onUpdateAnnotation(note.id, note.comment, color) : undefined} />
  );

  const durationLabel = meter === 'spoken' ? formatSpokenDuration(wordCount) : formatReadingDuration(wordCount, isWorkspace);
  const status = saveState === 'error' ? 'Não salvou'
    : saveState === 'saving' ? 'Salvando…'
      : localDirty || saveState === 'dirty' ? 'Alterações não salvas'
        : saveState === 'saved' ? 'Salvo' : null;
  const saveStatus = (
    <Text variant="meta" as="span" className="inline-flex min-w-0 items-center gap-2 text-[var(--text-secondary)]">
      <span role="status" aria-live="polite" aria-atomic="true">{status}</span>
      {saveState === 'error' && onRetrySave ? <button type="button" onClick={() => callbacksRef.current.onRetrySave?.()}
        className="min-h-8 shrink-0 underline underline-offset-2">Tentar novamente</button> : null}
    </Text>
  );
  const composer = activeDraft ? (
    <CommentComposer draft={activeDraft} value={draftCommentText} onChange={setDraftCommentText}
      onSubmit={() => { void submitComment(); }} onCancel={cancelComment} authorName={authorName}
      pending={commentPending} error={commentError} />
  ) : null;

  const handleDraftDrag = useCallback((clientX: number) => {
    const row = splitRowRef.current;
    if (!row) return;
    const rect = row.getBoundingClientRect();
    const next = clampDraftSplitRatio((rect.right - clientX) / rect.width, rect.width);
    setDraftRatio(next);
  }, []);

  const canRepairLineBreaks = needsLegacyLineBreakRepair(editor?.isDestroyed ? content : (editor?.getHTML() ?? content));
  const requestRepairLineBreaks = useCallback(() => {
    if (!editor || editor.isDestroyed) return;
    if (!needsLegacyLineBreakRepair(editor.getHTML())) return;
    setRepairConfirmOpen(true);
  }, [editor]);
  const applyRepairLineBreaks = useCallback(() => {
    if (!editor || editor.isDestroyed) return;
    const current = editor.getHTML();
    const next = repairLegacyLineBreaks(current);
    setRepairConfirmOpen(false);
    if (next === current) return;
    const scroll = editorViewportRef.current?.scrollTop ?? 0;
    editor.chain().focus().setContent(next, {emitUpdate: true}).run();
    requestAnimationFrame(() => {
      if (editorViewportRef.current) editorViewportRef.current.scrollTop = scroll;
    });
  }, [editor]);

  if (!editor) return null;

  const draftPaneWidthPx = splitWidth > 0
    ? Math.round(clampDraftSplitRatio(draftRatio, splitWidth) * splitWidth)
    : null;

  const shell = (
    <div ref={shellRef} tabIndex={isFullscreen ? -1 : undefined} data-autofocus={isFullscreen ? true : undefined}
      role={isFullscreen ? 'dialog' : undefined} aria-modal={isFullscreen ? true : undefined}
      aria-label={isFullscreen ? `${documentTitle} — modo foco` : undefined}
      className={cn(
        'flex min-w-0 flex-col bg-[var(--bg-elevated)] text-[var(--text-primary)]',
        isFullscreen
          ? 'fixed inset-0 z-[180] h-dvh w-screen overflow-hidden'
          : compactMobileComposer ? 'relative min-h-[50dvh] bg-transparent'
            : isWorkspace ? 'relative h-full min-h-0 rounded-[var(--radius-card)] border border-[var(--border-color)]'
              : 'relative min-h-[400px] rounded-[var(--radius-card)] border border-[var(--border-color)]',
        className,
      )}>
      {isFullscreen ? <div className="flex min-h-14 shrink-0 items-center gap-3 border-b border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 py-2 pt-safe md:px-6">
        <div className="min-w-0 flex-1">
          <Text variant="itemTitle" as="p" className="truncate text-[var(--text-primary)]" title={documentTitle}>{documentTitle}</Text>
          {saveStatus}
        </div>
        {onNotesPanelChange ? (
          <button
            type="button"
            onClick={() => onNotesPanelChange(!notesPanelOpen)}
            aria-pressed={notesPanelOpen}
            title={notesPanelOpen ? 'Fechar rascunho (Ctrl+Shift+N)' : 'Abrir rascunho (Ctrl+Shift+N)'}
            className={cn(
              'flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 t-label transition',
              notesPanelOpen
                ? 'border-[var(--border-strong)] bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'h-2 w-2 rounded-full',
                notesPanelOpen ? 'bg-[var(--brand-accent)]' : 'bg-[var(--text-tertiary)]',
              )}
            />
            <span>Rascunho</span>
          </button>
        ) : null}
        {commentsEnabled ? <button type="button" onClick={() => setCommentsPanelOpen(true)}
          aria-label={`Ver todos os comentários (${openCount})`} className="flex min-h-10 shrink-0 items-center gap-2 rounded-[var(--radius-input)] px-3 t-body hover:bg-[var(--bg-hover)]">
          <MessageSquare className="h-4 w-4" /><span className="hidden sm:inline">Comentários</span>{openCount}
        </button> : null}
        <button type="button" onClick={() => setFullscreen(false)}
          aria-label="Sair do modo foco" title="Sair do modo foco (Ctrl+Shift+\\)"
          className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-[var(--radius-input)] px-3 t-secondary text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">
          <Minimize2 className="h-4 w-4" aria-hidden />
          <span>Sair do modo foco</span>
        </button>
      </div> : null}

      {showDraftPane && narrowSplit ? (
        <div className="flex shrink-0 gap-1 border-b border-[var(--border-color)] px-3 py-1.5" role="tablist" aria-label="Área de escrita">
          {([
            {id: 'script' as const, label: 'Roteiro'},
            {id: 'draft' as const, label: 'Rascunho'},
          ]).map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={mobileFocusPane === tab.id}
              onClick={() => setMobileFocusPane(tab.id)}
              className={cn(
                'min-h-9 flex-1 rounded-[var(--radius-input)] px-3 t-body-strong transition',
                mobileFocusPane === tab.id
                  ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      {(!compactMobileComposer || isFullscreen) ? <div data-format-bar={writingBar ? 'writing' : 'full'}
        className={cn('z-10 flex min-h-10 shrink-0 items-center gap-1 px-1.5 py-1',
          writingBar
            ? 'border-b border-[var(--border-color)] bg-[var(--bg-elevated)]'
            : 'border-b border-[var(--border-color)] bg-[var(--bg-elevated)]',
          !isFullscreen && isWorkspace && 'sticky top-0')}>
        <div className="min-w-0 flex-1">
          <EditorToolbar
            editor={activeToolbarEditor}
            mode={writingBar ? 'writing' : 'full'}
            toolbarStart={focusedPane === 'draft' ? undefined : toolbarStart}
            toolbarEnd={focusedPane === 'draft' ? undefined : (
              <>
                {commentsEnabled ? (
                  <button
                    type="button"
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => setCommentsPanelOpen(true)}
                    aria-pressed={commentsPanelOpen}
                    title="Abrir painel de comentários"
                    className={cn(
                      'flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--radius-input)] px-2 t-label transition',
                      'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]',
                      commentsPanelOpen && 'bg-[var(--bg-secondary)] text-[var(--text-primary)]',
                    )}
                  >
                    <MessageSquare className="h-4 w-4" aria-hidden />
                    <span>Comentários</span>
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--bg-primary)] px-1.5 text-[length:var(--font-size-caption)] tabular-nums text-[var(--text-secondary)]">
                      {openCount}
                    </span>
                  </button>
                ) : null}
                {toolbarEnd}
              </>
            )}
            typographySlot={focusedPane === 'draft' ? undefined : typographySlot}
            onComment={focusedPane === 'script' && onAddAnnotation ? startCommenting : undefined}
            onFind={openFind}
            onLink={requestLink}
            onRepairLineBreaks={focusedPane === 'script' ? requestRepairLineBreaks : undefined}
            canRepairLineBreaks={canRepairLineBreaks}
          />
        </div>
        {!isFullscreen ? (
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            aria-label="Modo foco"
            title="Modo foco (Ctrl+Shift+\\)"
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-[var(--radius-input)] px-2.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            <Maximize2 className="h-4 w-4" aria-hidden />
            <Text variant="label" as="span" className="hidden sm:inline text-inherit">Modo foco</Text>
          </button>
        ) : null}
      </div> : null}

      {sync.conflict ? <div role="alert" className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 t-body">
        <p className="min-w-[12rem] flex-1">Chegou outra versão deste texto. Sua edição foi preservada.</p>
        <button type="button" onClick={sync.keepLocal} className="min-h-10 rounded-[var(--radius-input)] border border-[var(--border-color)] px-3 ">Manter minha edição</button>
        <button type="button" onClick={() => {
          sync.acceptIncoming(); setLocalDirty(false); setLinkRequest(null); setDraftCommentText('');
        }} className="min-h-10 px-3 underline underline-offset-2">Carregar versão recebida</button>
      </div> : null}

      {commentsEnabled && annotations.length > 0 && wideLayout && !isMobile && !compactMobileComposer && !isFullscreen ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-b border-[var(--border-color)] px-3 py-1 t-meta text-[var(--text-secondary)]">
          <button type="button" aria-pressed={commentsOpen} onClick={() => setCommentsOpen(open => !open)}
            className="min-h-9 rounded-[var(--radius-input)] px-2 hover:bg-[var(--bg-hover)]">
            {commentsOpen ? 'Ocultar comentários ao lado' : 'Mostrar comentários ao lado'}
          </button>
        </div>
      ) : null}

      {findMode ? <div className="relative z-[170] h-0 shrink-0">
        <div className="absolute right-3 top-2 w-[min(26rem,calc(100%-1.5rem))]">
          <FindReplaceBar editor={editor} mode={findMode} focusToken={findToken} onClose={() => setFindMode(null)} />
        </div>
      </div> : null}

      <FormattingBubble editor={editor} blocked={isMobile || !!activeDraft || !!linkRequest || commentsPanelOpen}
        onComment={onAddAnnotation ? startCommenting : undefined} onLink={requestLink} />

      <div
        ref={splitRowRef}
        className={cn(
          'flex min-h-0 min-w-0',
          isFullscreen || showDraftPane || !writingBar ? 'flex-1' : 'overflow-visible',
          showDraftPane && !isFullscreen && writingBar && 'min-h-[calc(100dvh-18rem)]',
        )}
      >
        <div
          ref={editorViewportRef}
          hidden={hideScriptPane}
          className={cn(
            'flex min-w-0 flex-1 flex-col custom-scrollbar',
            hideScriptPane && 'hidden',
            !isFullscreen && writingBar && isWorkspace && !showDraftPane ? 'overflow-visible' : 'min-h-0 overflow-y-auto',
            compactMobileComposer && !isFullscreen ? 'bg-transparent p-0'
              : 'bg-[var(--bg-elevated)]',
            editorViewportClassName,
          )}
          onScroll={event => { scriptScrollRef.current = event.currentTarget.scrollTop; }}
        >
          <div className={cn(
            'mx-auto flex w-full flex-1 items-start',
            showDraftPane
              ? 'max-w-none px-4 py-5 md:px-6 md:py-6'
              : railVisible
                ? 'max-w-[76rem] gap-8 px-4 py-6 md:px-8'
                : 'max-w-[56rem] justify-center px-4 py-6 md:max-w-[64rem] md:px-10',
            compactMobileComposer && !isFullscreen && 'px-0 py-2',
          )}>
            <div ref={editorContainerRef} onPointerDown={handleEditorPointerDown} className={cn(
              'script-sheet relative min-w-0 flex-1 cursor-text bg-[var(--bg-elevated)]',
              isFullscreen && !showDraftPane ? 'mx-auto min-h-[calc(100dvh-16rem)] max-w-[52rem] px-5 py-8 pb-24 md:max-w-[56rem] md:px-10 md:py-10'
                : compactMobileComposer && !isFullscreen ? 'min-h-[50dvh] bg-transparent px-0 py-2 pb-24'
                  : isWorkspace ? cn(
                    'min-h-[12rem]',
                    writingBar && !showDraftPane && 'mx-auto min-h-[calc(100dvh-18rem)] max-w-[52rem] px-3 py-4 md:max-w-[56rem] md:px-8 md:py-6',
                    !showDraftPane && !writingBar && 'mx-auto max-w-[52rem] md:max-w-[56rem]',
                  )
                    : 'min-h-[500px] rounded-[var(--radius-input)] border border-[var(--border-color)] px-5 py-8 shadow-[var(--shadow-editorial)] md:px-12 md:py-12',
              editorCanvasClassName,
            )}>
              <EditorContent editor={editor} className={cn('max-w-none cursor-text', !isWorkspace && 'prose-sm sm:prose lg:prose-lg')} />
            </div>
            {railVisible && !showDraftPane ? <CommentRail items={railNotes} anchors={new Map(annotationPositions.map(item => [item.id, item.top]))}
              activeId={expandedNoteId} minHeight={editorContainerRef.current?.offsetHeight ?? 0}
              renderCard={note => renderCommentCard(note)}
              draft={activeDraft ? { top: draftTop ?? 0, node: <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-card)]">{composer}</div> } : null} /> : null}
          </div>
        </div>

        {splitInPanel ? (
          <DraftSplitDivider
            onDrag={handleDraftDrag}
            onDragEnd={() => writeDraftSplitRatio(draftRatio, isMobile)}
          />
        ) : null}

        {showDraftPane && !hideDraftPane ? (
          <aside
            aria-label="Rascunho de apoio"
            className={cn(
              'flex min-h-0 min-w-0 flex-col overflow-hidden border-[var(--border-color)] bg-[var(--bg-primary)]',
              '[&>section]:flex [&>section]:h-full [&>section]:min-h-0 [&>section]:flex-1 [&>section]:flex-col',
              narrowSplit ? 'min-w-0 flex-1 border-0' : 'shrink-0 border-l',
            )}
            style={narrowSplit
              ? undefined
              : {width: draftPaneWidthPx ?? `${Math.round(draftRatio * 100)}%`}}
          >
            {fullscreenAside}
          </aside>
        ) : null}
      </div>

      {(!compactMobileComposer || isFullscreen) ? <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 py-2.5 t-meta text-[var(--text-secondary)]">
        {meter !== 'none' ? <span className="ml-auto inline-flex items-baseline gap-1"><TextCount as="span" count={wordCount} mode="words" /> · {durationLabel}</span> : <span />}
        <div className="flex min-w-0 flex-wrap items-center gap-3">{!isFullscreen ? saveStatus : null}{saveAction}</div>
      </div> : saveAction || status ? <div className="flex flex-wrap items-center gap-3 pb-20 pt-3">{saveStatus}{saveAction}</div> : null}
    </div>
  );

  return <>
    {shell}

    {compactMobileComposer && isMobile && !isFullscreen && !modalOpen && !commentsPanelOpen ? <MobileQuickToolbar editor={editor}
      toolbarStart={toolbarStart} onComment={onAddAnnotation ? startCommenting : undefined}
      onComments={commentsEnabled ? () => setCommentsPanelOpen(true) : undefined} count={openCount}
      onLink={requestLink} onFind={() => openFind('find')} onExpand={() => setFullscreen(true)} /> : null}

    <CommentsPanel open={commentsEnabled && commentsPanelOpen} onClose={() => setCommentsPanelOpen(false)}
      presentation={isMobile ? 'sheet' : 'drawer'} items={sortedAnnotations} total={openCount}
      showResolved={showResolved} onShowResolvedChange={setShowResolved} resolvedCount={resolvedCount}
      renderCard={note => renderCommentCard(note, true)} />

    {showDraftModal ? <EditorDialog title="Comentar trecho" onClose={cancelComment}>{composer}</EditorDialog> : null}
    {linkRequest ? <LinkEditor initialURL={linkRequest.url} onApply={applyLink} onClose={() => {
      setLinkRequest(null); editor.commands.focus();
    }} /> : null}

    <ConfirmModal
      open={repairConfirmOpen}
      message="Arrumar as quebras de linha que vieram coladas como texto? Você pode desfazer com Ctrl+Z."
      confirmLabel="Reparar"
      cancelLabel="Cancelar"
      onConfirm={applyRepairLineBreaks}
      onCancel={() => setRepairConfirmOpen(false)}
    />
  </>;
}
