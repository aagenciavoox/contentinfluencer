import { useEditor, useEditorState, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import Typography from '@tiptap/extension-typography';
import { Placeholder } from '@tiptap/extensions';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  Undo,
  Redo,
  MessageSquarePlus,
  X,
  Trash2,
  MessageSquare,
  Plus,
  MoreVertical,
  Quote,
  Heading1,
  Heading2,
  Minus,
  Strikethrough,
  Link as LinkIcon,
  Check,
  ChevronDown,
  ChevronUp,
  RemoveFormatting,
} from 'lucide-react';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Decoration, DecorationSet } from 'prosemirror-view';
import '../../styles/editor.css';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useVisualViewportKeyboard } from '../../hooks/useVisualViewportKeyboard';
import { countScriptWords, formatSpokenDuration } from '../../features/contents/lib/spokenDuration';
import { EditorShortcuts, ReadableHighlight, SelectionClicks, clearFormatting } from './editorExtensions';
import { EditorColorMenu } from './EditorColorMenu';
import { EditorToolbar } from './EditorToolbar';
import { FindReplaceBar } from './FindReplaceBar';
import { FindReplace } from './findReplace';
import { COMMENT_MIGRATION_META, CommentAnchor, addCommentAnchor, collectCommentRanges, migrateLegacyComments, removeCommentAnchor, type CommentRange } from './commentAnchors';
import { newCommentId, orderComments, type CommentPatch, type ScriptComment } from './commentModel';
import { CommentCard, CommentRail, CommentsPanel, DEFAULT_COMMENT_HIGHLIGHT } from './ScriptComments';

type Annotation = ScriptComment;

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  editorViewportClassName?: string;
  editorCanvasClassName?: string;
  /** `id` vem do editor: é o mesmo id gravado na marca <span data-comment-id> do texto. */
  onAddAnnotation?: (text: string, selection: { from: number; to: number }, comment: string, id?: string) => void;
  /** Respostas, resolver/reabrir (gravados dentro do JSON script_notes). */
  onPatchAnnotation?: (id: string, patch: CommentPatch) => void;
  annotations?: Annotation[];
  onRemoveAnnotation?: (id: string) => void;
  onUpdateAnnotation?: (id: string, comment: string, color?: string) => void;
  authorName?: string;
  documentTitle?: string;
  compactMobileComposer?: boolean;
  autoFocus?: boolean;
  variant?: 'default' | 'workspace';
  /** writing: Bloco, template, undo, bold, italic, and Mais. The rest stays in the menu. */
  formatBar?: 'full' | 'writing';
  /** spoken: teleprompter pace. reading: the older 2.5 words-per-second estimate. */
  meter?: 'reading' | 'spoken';
  toolbarStart?: React.ReactNode;
  /** Fonte e tamanho (valem para o roteiro inteiro), mostrados depois de Estilo. */
  typographySlot?: React.ReactNode;
  saveState?: 'idle' | 'saving' | 'saved' | 'error';
  saveAction?: React.ReactNode;
  /** Shown beside the page when the writing editor is expanded. */
  fullscreenAside?: React.ReactNode;
  onFullscreenChange?: (open: boolean) => void;
}

type FormattingAction = {
  id: string;
  label: string;
  icon: typeof Bold;
  run: () => void;
  isActive?: () => boolean;
};

type AnnotationPosition = {
  id: string;
  top: number;
};

const DEFAULT_COMMENT_BORDER = 'color-mix(in srgb, var(--warning), transparent 55%)';

const WORDS_PER_SECOND = 2.5;
const EMPTY_ANNOTATIONS: Annotation[] = [];

function sameAnnotationPositions(current: AnnotationPosition[], next: AnnotationPosition[]) {
  if (current.length !== next.length) return false;

  for (let index = 0; index < current.length; index += 1) {
    if (current[index].id !== next[index].id || current[index].top !== next[index].top) {
      return false;
    }
  }

  return true;
}

function formatControlClass(active: boolean, neutralBar: boolean) {
  if (active) {
    return neutralBar
      ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
      : 'bg-[color-mix(in_srgb,var(--accent-blue),transparent_92%)] text-[var(--accent-blue)]';
  }

  return neutralBar
    ? 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
    : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]';
}

function formatSpeakingDuration(wordCount: number, workspace = false) {
  if (wordCount === 0) return workspace ? '0 segundos de leitura' : '~0s';

  const seconds = Math.round(wordCount / WORDS_PER_SECOND);
  if (workspace) {
    return `${seconds} ${seconds === 1 ? 'segundo' : 'segundos'} de leitura`;
  }

  if (seconds >= 60) {
    return `~${Math.round(seconds / 60)} min`;
  }

  return `~${seconds}s`;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder,
  className,
  editorViewportClassName,
  editorCanvasClassName,
  onAddAnnotation,
  annotations = EMPTY_ANNOTATIONS,
  onRemoveAnnotation,
  onUpdateAnnotation,
  onPatchAnnotation,
  authorName = 'Você',
  documentTitle = 'Novo roteiro',
  compactMobileComposer = false,
  autoFocus = false,
  variant = 'default',
  formatBar = 'full',
  meter = 'reading',
  toolbarStart,
  typographySlot,
  saveState = 'idle',
  saveAction,
  fullscreenAside,
  onFullscreenChange,
}: RichTextEditorProps) {
  const isWorkspace = variant === 'workspace';
  const writingBar = formatBar === 'writing';
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const onFullscreenChangeRef = useRef(onFullscreenChange);
  onFullscreenChangeRef.current = onFullscreenChange;

  const setFullscreen = useCallback((open: boolean) => {
    setIsFullscreen(open);
    onFullscreenChangeRef.current?.(open);
  }, []);
  const [marginMenu, setMarginMenu] = useState<{ x: number; y: number } | null>(null);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [draftCommentText, setDraftCommentText] = useState('');
  const [activeDraft, setActiveDraft] = useState<{ text: string; selection: { from: number; to: number } } | null>(null);
  const [commentsPanelOpen, setCommentsPanelOpen] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [commentRanges, setCommentRanges] = useState<Map<string, CommentRange>>(() => new Map());
  const [wideLayout, setWideLayout] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1280);
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const [isMobileQuickbarOpen, setIsMobileQuickbarOpen] = useState(true);
  const [annotationPositions, setAnnotationPositions] = useState<AnnotationPosition[]>([]);
  const notesRef = useRef<Annotation[]>(annotations);
  notesRef.current = annotations;
  const activeCommentRef = useRef<string | null>(null);
  const migratedRef = useRef(new Set<string>());
  const commentsEnabled = !!onAddAnnotation;
  const [draftCommentTop, setDraftCommentTop] = useState<number | null>(null);

  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorViewportRef = useRef<HTMLDivElement>(null);
  const optionsMenuRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef(content);
  const onChangeRef = useRef(onChange);
  contentRef.current = content;
  onChangeRef.current = onChange;
  const isMobile = useIsMobile();
  const isMobileRef = useRef(isMobile);
  isMobileRef.current = isMobile;
  const commentShortcutRef = useRef<() => void>(() => {});
  const linkShortcutRef = useRef<() => void>(() => {});
  const [findMode, setFindMode] = useState<'find' | 'replace' | null>(null);
  const [findToken, setFindToken] = useState(0);
  const openFind = useCallback((mode: 'find' | 'replace') => {
    setFindMode(mode);
    setFindToken(token => token + 1);
  }, []);
  const bubbleBlockedRef = useRef(false);
  const keyboard = useVisualViewportKeyboard();

  useBodyScrollLock(isFullscreen);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        underline: false,
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      ReadableHighlight,
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Typography,
      SelectionClicks,
      EditorShortcuts.configure({
        onComment: () => commentShortcutRef.current(),
        onFind: mode => openFind(mode),
        onLink: () => linkShortcutRef.current(),
      }),
      FindReplace,
      CommentAnchor,
      // Extensions are built once with the editor, so the first placeholder value is kept.
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    [],
  );

  const editor = useEditor({
    extensions,
    content,
    onUpdate: ({ editor: currentEditor, transaction }) => {
      // Só conta como edição o que mudou o texto. O TrailingNode acrescenta um parágrafo
      // no fim ao primeiro clique ou foco; essa mudança vem do plugin, não de quem escreve.
      if (!transaction.docChanged) return;
      // A migracao automatica dos comentarios antigos nao marca o rascunho como alterado.
      if (transaction.getMeta(COMMENT_MIGRATION_META)) return;

      const html = currentEditor.getHTML();
      const current = contentRef.current ?? '';
      const normalizedHtml = html.trim();
      const normalizedCurrent = current.trim();
      const emptyEquivalent = (value: string) =>
        !value || value === '<p></p>' || value === '<p><br></p>' || value === '<p><br/></p>';

      if (html === current) return;
      if (emptyEquivalent(normalizedHtml) && emptyEquivalent(normalizedCurrent)) return;

      onChangeRef.current(html);
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      const { empty } = currentEditor.state.selection;
      if (empty) {
        setMarginMenu(null);
        return;
      }

      const {
        view,
        state: { selection },
      } = currentEditor;

      try {
        const start = view.coordsAtPos(selection.from);
        const end = view.coordsAtPos(selection.to);

        if (editorContainerRef.current) {
          const rect = editorContainerRef.current.getBoundingClientRect();
          setMarginMenu({
            x: rect.right + 15,
            y: start.top + (end.top - start.top) / 2 - 16,
          });
        }
      } catch {
        setMarginMenu(null);
      }
    },
    editorProps: {
      attributes: {
        class:
          'tiptap focus:outline-none min-h-[inherit] max-w-none text-base md:text-[inherit] text-[var(--text-primary)] transition-all duration-300',
      },
      decorations: (state) => {
        const notes = notesRef.current;
        if (notes.length === 0) return DecorationSet.empty;
        const byId = new Map(notes.map(note => [note.id, note]));
        const decorations: Decoration[] = [];
        state.doc.descendants((node, pos) => {
          if (!node.isText) return true;
          for (const mark of node.marks) {
            if (mark.type.name !== 'comment') continue;
            const note = byId.get(mark.attrs.commentId as string);
            if (!note || note.resolvedAt) continue;
            const isActive = activeCommentRef.current === note.id;
            decorations.push(
              Decoration.inline(pos, pos + node.nodeSize, {
                class: cn('annotation-highlight cursor-pointer', isActive && 'active-annotation'),
                style: `background-color: ${note.color || DEFAULT_COMMENT_HIGHLIGHT}; border-bottom: 2px solid ${
                  isActive ? 'var(--accent-blue)' : DEFAULT_COMMENT_BORDER
                }`,
              }),
            );
          }
          return false;
        });
        return DecorationSet.create(state.doc, decorations);
      },
    },
  });

  useEffect(() => {
    // Editor destruído (remontagem do StrictMode, troca de roteiro) não tem schema para gerar o HTML.
    if (editor && !editor.isDestroyed && content !== editor.getHTML()) {
      // Avoid marking the parent draft dirty on hydrate / external sync.
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  useEffect(() => {
    if (!editor || !autoFocus) return;

    const frame = window.requestAnimationFrame(() => {
      if (!editor.isDestroyed) {
        editor.chain().focus('end').run();
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [autoFocus, editor]);

  useEffect(() => {
    if (!isFullscreen) {
      setIsOptionsMenuOpen(false);
    }
  }, [isFullscreen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!optionsMenuRef.current?.contains(event.target as Node)) {
        setIsOptionsMenuOpen(false);
      }
    }

    if (isOptionsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOptionsMenuOpen]);

  const annotationSource = annotations.length === 0 ? EMPTY_ANNOTATIONS : annotations;
  activeCommentRef.current = expandedNoteId;

  // Ranges come from the comment marks in the document, so they follow every edit.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const refresh = () => {
      if (editor.isDestroyed) return;
      const next = collectCommentRanges(editor.state.doc);
      setCommentRanges(current => {
        if (current.size === next.size && [...next].every(([id, r]) => current.get(id)?.from === r.from && current.get(id)?.to === r.to)) {
          return current;
        }
        return next;
      });
    };
    refresh();
    editor.on('update', refresh);
    return () => {
      editor.off('update', refresh);
    };
    // `content` too: hydration uses setContent without an update event.
  }, [content, editor]);

  // One-time, best-effort migration of old {from,to} comments into marks (only where the text still matches).
  useEffect(() => {
    if (!editor || editor.isDestroyed || !commentsEnabled) return;
    if (editor.state.doc.textContent.trim().length === 0) return;
    const pending = annotationSource.filter(note => note.id && !migratedRef.current.has(note.id));
    if (pending.length === 0) return;
    pending.forEach(note => migratedRef.current.add(note.id));
    migrateLegacyComments(editor, pending);
  }, [annotationSource, commentsEnabled, content, editor]);

  // Redraw comment colors when notes or the active comment change.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.view.dispatch(editor.state.tr.setMeta('commentDecorations', true).setMeta('addToHistory', false));
  }, [annotationSource, editor, expandedNoteId]);

  useEffect(() => {
    const onResize = () => setWideLayout(window.innerWidth >= 1280);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const commentPositions = useMemo(() => new Map([...commentRanges].map(([id, range]) => [id, range.from])), [commentRanges]);
  const unanchoredIds = useMemo(
    () => new Set(annotationSource.filter(note => note.id && !commentRanges.has(note.id)).map(note => note.id)),
    [annotationSource, commentRanges],
  );
  const resolvedCount = useMemo(() => annotationSource.filter(note => note.resolvedAt).length, [annotationSource]);
  const openCount = annotationSource.length - resolvedCount;
  const sortedAnnotations = useMemo(
    () => orderComments(annotationSource.filter(note => !!note.id && (showResolved || !note.resolvedAt)), commentPositions),
    [annotationSource, commentPositions, showResolved],
  );
  const railNotes = useMemo(() => sortedAnnotations.filter(note => commentRanges.has(note.id)), [commentRanges, sortedAnnotations]);
  const railVisible =
    commentsEnabled && !isMobile && wideLayout && (isFullscreen ? commentsOpen : true) && (railNotes.length > 0 || !!activeDraft);

  const updateAnnotationAnchors = useCallback(() => {
    if (!editor || editor.isDestroyed || !editorContainerRef.current || !railVisible) {
      setAnnotationPositions((current) => (current.length === 0 ? current : []));
      setDraftCommentTop((current) => (current === null ? current : null));
      return;
    }

    const editorRect = editorContainerRef.current.getBoundingClientRect();
    const topOf = (pos: number) => {
      try {
        return Math.max(0, editor.view.coordsAtPos(pos).top - editorRect.top - 4);
      } catch {
        return null;
      }
    };

    const resolvedPositions = railNotes
      .map((note) => {
        const range = commentRanges.get(note.id);
        const top = range ? topOf(range.from) : null;
        return top === null ? null : { id: note.id, top };
      })
      .filter((value): value is AnnotationPosition => value !== null);

    setAnnotationPositions((current) =>
      sameAnnotationPositions(current, resolvedPositions) ? current : resolvedPositions,
    );

    const nextDraftTop = activeDraft ? topOf(activeDraft.selection.from) : null;
    setDraftCommentTop((current) => (current === nextDraftTop ? current : nextDraftTop));
  }, [activeDraft, commentRanges, editor, railNotes, railVisible]);

  const startCommenting = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ');

    if (text) {
      setCommentsOpen(true);
      setCommentsPanelOpen(false);
      setActiveDraft({ text, selection: { from, to } });
      setDraftCommentText('');
      setMarginMenu(null);
    }
  }, [editor]);

  commentShortcutRef.current = () => {
    if (onAddAnnotation) startCommenting();
  };
  bubbleBlockedRef.current = !!activeDraft;

  const hasSelection = useEditorState({
    editor,
    selector: ({ editor: instance }) => !!instance && !instance.state.selection.empty,
  });

  // Re-render the toolbar when the formatting under the cursor changes (TipTap v3 does not re-render on every transaction).
  useEditorState({
    editor,
    selector: ({ editor: instance }) => {
      if (!instance) return '';
      const marks = ['bold', 'italic', 'underline', 'strike', 'link', 'bulletList', 'orderedList', 'blockquote'];
      const active = marks.filter(name => instance.isActive(name));
      for (const level of [1, 2] as const) if (instance.isActive('heading', { level })) active.push(`h${level}`);
      for (const align of ['left', 'center', 'right']) if (instance.isActive({ textAlign: align })) active.push(align);
      return active.join(',');
    },
  });

  const submitComment = useCallback(() => {
    if (!activeDraft || !draftCommentText.trim() || !onAddAnnotation || !editor) return;
    const id = newCommentId();
    const { from, to } = activeDraft.selection;
    const size = editor.state.doc.content.size;
    let anchored = false;
    if (to <= size) {
      try {
        anchored = editor.state.doc.textBetween(from, to, ' ') === activeDraft.text;
      } catch {
        anchored = false;
      }
    }
    onAddAnnotation(activeDraft.text, activeDraft.selection, draftCommentText.trim(), id);
    if (anchored) addCommentAnchor(editor, id, from, to);
    migratedRef.current.add(id);
    setExpandedNoteId(id);
    setActiveDraft(null);
    setDraftCommentText('');
  }, [activeDraft, draftCommentText, editor, onAddAnnotation]);

  const selectComment = useCallback(
    (id: string) => {
      setExpandedNoteId(id);
      const range = commentRanges.get(id);
      if (range && editor && !editor.isDestroyed) {
        editor.chain().setTextSelection(range).scrollIntoView().run();
      }
    },
    [commentRanges, editor],
  );

  const renderCommentCard = (note: Annotation, inPanel = false) => (
    <CommentCard
      note={note}
      authorName={authorName}
      active={expandedNoteId === note.id}
      unanchored={unanchoredIds.has(note.id)}
      showQuote={inPanel}
      onActivate={() => (expandedNoteId === note.id && !inPanel ? setExpandedNoteId(null) : selectComment(note.id))}
      onReply={
        onPatchAnnotation
          ? text =>
              onPatchAnnotation(note.id, {
                replies: [...(note.replies ?? []), { id: newCommentId(), comment: text, authorName, createdAt: new Date().toISOString() }],
              })
          : undefined
      }
      onToggleResolved={
        onPatchAnnotation
          ? () => {
              const resolving = !note.resolvedAt;
              onPatchAnnotation(note.id, { resolvedAt: resolving ? new Date().toISOString() : null });
              if (resolving && expandedNoteId === note.id) setExpandedNoteId(null);
            }
          : undefined
      }
      onDelete={
        onRemoveAnnotation
          ? () => {
              if (editor && !editor.isDestroyed) removeCommentAnchor(editor, note.id);
              onRemoveAnnotation(note.id);
              if (expandedNoteId === note.id) setExpandedNoteId(null);
            }
          : undefined
      }
      onColor={onUpdateAnnotation ? color => onUpdateAnnotation(note.id, note.comment, color) : undefined}
    />
  );

  useEffect(() => {
    updateAnnotationAnchors();
  }, [updateAnnotationAnchors]);

  useEffect(() => {
    if (!railVisible) return;

    const handleUpdate = () => updateAnnotationAnchors();
    const viewport = editorViewportRef.current;

    viewport?.addEventListener('scroll', handleUpdate);
    window.addEventListener('resize', handleUpdate);

    return () => {
      viewport?.removeEventListener('scroll', handleUpdate);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [railVisible, updateAnnotationAnchors]);

  const handleEditorAreaPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!editor) return;

      const target = event.target as HTMLElement | null;
      if (target?.closest('button, a, input, textarea, select')) {
        return;
      }

      const pos = editor.view.posAtCoords({ left: event.clientX, top: event.clientY });
      const clickedId =
        pos && commentsEnabled
          ? [...commentRanges].find(([id, range]) => {
              const note = annotations.find(item => item.id === id);
              return note && !note.resolvedAt && pos.pos >= range.from && pos.pos <= range.to;
            })?.[0]
          : undefined;

      if (clickedId) {
        setExpandedNoteId(clickedId);
        if (!railVisible && event.detail === 1 && editor.state.selection.empty) {
          event.preventDefault();
          setCommentsPanelOpen(true);
          return;
        }
      }

      requestAnimationFrame(() => {
        if (!editor.isDestroyed) {
          editor.chain().focus(pos?.pos ?? 'end').run();
        }
      });
    },
    [annotations, commentRanges, commentsEnabled, editor, railVisible],
  );

  const requestLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Cole o link', previousUrl || 'https://');
    if (url === null) return;

    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor.chain().focus().setLink({ href: url.trim() }).run();
    setIsOptionsMenuOpen(false);
  }, [editor]);

  linkShortcutRef.current = requestLink;

  const applyRule = useCallback(() => {
    editor?.chain().focus().setHorizontalRule().run();
    setIsOptionsMenuOpen(false);
  }, [editor]);

  const toggleHeading = useCallback(
    (level: 1 | 2) => {
      editor?.chain().focus().toggleHeading({ level }).run();
      setIsOptionsMenuOpen(false);
    },
    [editor],
  );

  const wordCount = useMemo(() => countScriptWords(content), [content]);
  const durationLabel = useMemo(
    () => (meter === 'spoken' ? formatSpokenDuration(wordCount) : formatSpeakingDuration(wordCount, isWorkspace)),
    [isWorkspace, meter, wordCount],
  );
  const saveFooterLabel =
    saveState === 'saving'
      ? 'Salvando…'
      : saveState === 'saved'
        ? 'Salvo agora'
        : saveState === 'error'
          ? 'Não salvo. Verifique a conexão'
          : null;

  const secondaryActions: FormattingAction[] = useMemo(
    () => [
      {
        id: 'h1',
        label: 'H1',
        icon: Heading1,
        run: () => toggleHeading(1),
        isActive: () => !!editor?.isActive('heading', { level: 1 }),
      },
      {
        id: 'h2',
        label: 'H2',
        icon: Heading2,
        run: () => toggleHeading(2),
        isActive: () => !!editor?.isActive('heading', { level: 2 }),
      },
      {
        id: 'bullet',
        label: 'Lista',
        icon: List,
        run: () => {
          editor?.chain().focus().toggleBulletList().run();
          setIsOptionsMenuOpen(false);
        },
        isActive: () => !!editor?.isActive('bulletList'),
      },
      {
        id: 'ordered',
        label: '1. Lista',
        icon: ListOrdered,
        run: () => {
          editor?.chain().focus().toggleOrderedList().run();
          setIsOptionsMenuOpen(false);
        },
        isActive: () => !!editor?.isActive('orderedList'),
      },
      {
        id: 'quote',
        label: 'Citação',
        icon: Quote,
        run: () => {
          editor?.chain().focus().toggleBlockquote().run();
          setIsOptionsMenuOpen(false);
        },
        isActive: () => !!editor?.isActive('blockquote'),
      },
      {
        id: 'rule',
        label: 'Linha',
        icon: Minus,
        run: applyRule,
      },
      {
        id: 'link',
        label: 'Link',
        icon: LinkIcon,
        run: requestLink,
        isActive: () => !!editor?.isActive('link'),
      },
    ],
    [applyRule, editor, requestLink, toggleHeading],
  );

  const topToolbarActions: FormattingAction[] = useMemo(
    () => [
      {
        id: 'undo',
        label: 'Desfazer',
        icon: Undo,
        run: () => editor?.chain().focus().undo().run(),
      },
      {
        id: 'redo',
        label: 'Refazer',
        icon: Redo,
        run: () => editor?.chain().focus().redo().run(),
      },
      {
        id: 'bold',
        label: 'Negrito',
        icon: Bold,
        run: () => editor?.chain().focus().toggleBold().run(),
        isActive: () => !!editor?.isActive('bold'),
      },
      {
        id: 'italic',
        label: 'Itálico',
        icon: Italic,
        run: () => editor?.chain().focus().toggleItalic().run(),
        isActive: () => !!editor?.isActive('italic'),
      },
      {
        id: 'underline',
        label: 'Sublinhado',
        icon: UnderlineIcon,
        run: () => editor?.chain().focus().toggleUnderline().run(),
        isActive: () => !!editor?.isActive('underline'),
      },
      {
        id: 'strike',
        label: 'Tachado',
        icon: Strikethrough,
        run: () => editor?.chain().focus().toggleStrike().run(),
        isActive: () => !!editor?.isActive('strike'),
      },
      {
        id: 'align-left',
        label: 'Alinhar à esquerda',
        icon: AlignLeft,
        run: () => editor?.chain().focus().setTextAlign('left').run(),
        isActive: () => !!editor?.isActive({ textAlign: 'left' }),
      },
      {
        id: 'align-center',
        label: 'Centralizar',
        icon: AlignCenter,
        run: () => editor?.chain().focus().setTextAlign('center').run(),
        isActive: () => !!editor?.isActive({ textAlign: 'center' }),
      },
      {
        id: 'align-right',
        label: 'Alinhar à direita',
        icon: AlignRight,
        run: () => editor?.chain().focus().setTextAlign('right').run(),
        isActive: () => !!editor?.isActive({ textAlign: 'right' }),
      },
      {
        id: 'list',
        label: 'Lista',
        icon: List,
        run: () => editor?.chain().focus().toggleBulletList().run(),
        isActive: () => !!editor?.isActive('bulletList'),
      },
      {
        id: 'ordered',
        label: 'Lista numerada',
        icon: ListOrdered,
        run: () => editor?.chain().focus().toggleOrderedList().run(),
        isActive: () => !!editor?.isActive('orderedList'),
      },
      {
        id: 'link',
        label: 'Link',
        icon: LinkIcon,
        run: requestLink,
        isActive: () => !!editor?.isActive('link'),
      },
      {
        id: 'clear',
        label: 'Limpar formatação (Ctrl+\\)',
        icon: RemoveFormatting,
        run: () => {
          if (editor) clearFormatting(editor);
        },
      },
    ],
    [editor, requestLink],
  );

  if (!editor) return null;

  return (
    <>
      <AnimatePresence>
        {isFullscreen && !isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFullscreen(false)}
            className="fixed inset-0 z-[90] bg-[color-mix(in_srgb,var(--text-primary)_12%,transparent)] backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>

      <motion.div
        layout
        className={cn(
          'relative transition-all duration-500',
          compactMobileComposer ? 'border-0' : 'border border-[var(--border-color)]',
          isWorkspace && !isFullscreen
            ? writingBar
              ? 'overflow-visible'
              : 'h-full min-h-0 overflow-hidden'
            : 'overflow-hidden',
          isWorkspace
            ? cn(
                'flex flex-col rounded-[var(--radius-card)] bg-[var(--bg-elevated)]',
                compactMobileComposer && 'rounded-none bg-transparent',
                isFullscreen && 'min-h-[calc(100vh-280px)]',
              )
            : 'rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)]',
          isFullscreen
            ? isMobile
              ? 'fixed inset-0 z-[100] flex flex-col rounded-none border-0 bg-[var(--bg-elevated)] shadow-none'
              : writingBar
                ? 'fixed inset-4 z-[100] flex flex-col rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] shadow-[var(--shadow-modal)]'
                : 'fixed left-1/2 top-1/2 z-[100] flex h-[min(1120px,calc(100dvh-56px))] w-[min(1420px,calc(100vw-56px))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] shadow-[var(--shadow-modal)]'
            : compactMobileComposer
              ? 'flex min-h-[50dvh] flex-col bg-transparent'
              : isWorkspace
                ? ''
                : 'flex min-h-[400px] flex-col bg-[var(--bg-secondary)]/50',
          className,
        )}
      >
        {isFullscreen ? (
          <div
            className={cn(
              'shrink-0 border-b border-[var(--border-color)] bg-[var(--bg-elevated)]',
              isMobile ? 'pt-safe' : '',
            )}
          >
            <div className={cn('flex items-center', isMobile ? 'h-14 px-4' : 'h-16 px-6')}>
              {isMobile ? (
                <>
                  <button
                    onClick={() => setFullscreen(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-input)] text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)]"
                    aria-label="Fechar expansão"
                  >
                    <X className="h-[22px] w-[22px]" />
                  </button>
                  <div className="flex-1 text-center">
                    <p className="truncate text-base font-semibold text-[var(--text-primary)]">{documentTitle}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{saveFooterLabel ?? 'Salvo agora há pouco'}</p>
                  </div>
                  <button
                    onClick={() => setFullscreen(false)}
                    className="min-w-[72px] text-sm font-semibold text-[var(--accent-blue)]"
                  >
                    Concluir
                  </button>
                </>
              ) : (
                <>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-[var(--shadow-soft)]">
                      <Plus className="h-4 w-4 text-[var(--accent-blue)]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="truncate font-semibold text-[var(--text-primary)]">{documentTitle}</span>
                        <span className="text-[var(--border-strong)]">•</span>
                        <span className="text-[var(--text-tertiary)]">{saveFooterLabel ?? 'Salvo agora há pouco'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-pressed={commentsOpen}
                      onClick={() => (wideLayout ? setCommentsOpen(open => !open) : setCommentsPanelOpen(true))}
                      className={cn(
                        'inline-flex h-10 items-center gap-2 rounded-[var(--radius-input)] px-3 text-sm font-medium transition',
                        commentsOpen
                          ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                          : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
                      )}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Comentários{openCount > 0 ? ` ${openCount}` : ''}
                    </button>
                    <button
                      onClick={() => setFullscreen(false)}
                      className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-input)] text-[var(--text-tertiary)] transition hover:bg-[var(--bg-hover)]"
                      aria-label="Fechar expansão"
                    >
                      <Minimize2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setFullscreen(false)}
                      className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-input)] text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)]"
                      aria-label="Fechar editor"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : compactMobileComposer ? null : (
          <div
            data-format-bar={writingBar ? 'writing' : 'full'}
            className={cn(
              'relative flex shrink-0 items-center border-b border-[var(--border-color)]',
              writingBar ? 'bg-[var(--bg-hover)]' : 'bg-[var(--bg-elevated)]',
              isWorkspace && !isFullscreen && 'sticky top-0 z-10',
            )}
          >
            <div
              className={cn(
                'relative flex min-w-0 flex-1 items-center',
                isWorkspace && !isFullscreen ? 'min-h-11 px-2 py-1' : isMobile ? 'h-11 px-2' : 'h-11 px-3',
                !isFullscreen && 'rounded-t-[var(--radius-input)]',
              )}
            >
          <EditorToolbar
            editor={editor}
            mode={writingBar ? 'writing' : 'full'}
            toolbarStart={toolbarStart}
            typographySlot={typographySlot}
            onComment={onAddAnnotation ? startCommenting : undefined}
            onFind={openFind}
            onLink={requestLink}
          />
          {!isWorkspace ? (
            <div className="ml-3 hidden shrink-0 items-center gap-1 text-sm text-[var(--text-tertiary)] sm:flex">
              {wordCount} palavras · {durationLabel}
            </div>
          ) : null}
          </div>
            <button
              onClick={() => setFullscreen(true)}
              className={cn(
                'mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-input)] transition',
                formatControlClass(false, writingBar),
              )}
              aria-label="Expandir editor"
              type="button"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        )}

        {findMode ? (
          <div className="relative z-[125] h-0">
            <div className="absolute right-3 top-2 w-[min(26rem,calc(100%-1.5rem))]">
              <FindReplaceBar editor={editor} mode={findMode} focusToken={findToken} onClose={() => setFindMode(null)} />
            </div>
          </div>
        ) : null}

        <BubbleMenu
          editor={editor}
          options={{ placement: 'top', offset: 8 }}
          shouldShow={({ editor: instance, state }) =>
            !state.selection.empty && instance.isEditable && !isMobileRef.current && !bubbleBlockedRef.current
          }
          className="z-[120] flex items-center gap-0.5 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-1 shadow-[var(--shadow-dropdown)]"
        >
          {([
            { id: 'bold', label: 'Negrito (Ctrl+B)', icon: Bold, run: () => editor.chain().focus().toggleBold().run() },
            { id: 'italic', label: 'Itálico (Ctrl+I)', icon: Italic, run: () => editor.chain().focus().toggleItalic().run() },
            { id: 'underline', label: 'Sublinhado (Ctrl+U)', icon: UnderlineIcon, run: () => editor.chain().focus().toggleUnderline().run() },
          ] as const).map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onMouseDown={event => event.preventDefault()}
                onClick={item.run}
                aria-label={item.label}
                title={item.label}
                className={cn('flex h-8 w-8 items-center justify-center rounded-[var(--radius-input)] transition', formatControlClass(editor.isActive(item.id), true))}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
          <EditorColorMenu editor={editor} kind="highlight" size="sm" neutral />
          <button
            type="button"
            onMouseDown={event => event.preventDefault()}
            onClick={requestLink}
            aria-label="Link"
            title="Link"
            className={cn('flex h-8 w-8 items-center justify-center rounded-[var(--radius-input)] transition', formatControlClass(editor.isActive('link'), true))}
          >
            <LinkIcon className="h-4 w-4" />
          </button>
          {onAddAnnotation && (
            <>
              <div className="mx-1 h-5 w-px bg-[var(--border-color)]" aria-hidden />
              <button
                type="button"
                onMouseDown={event => event.preventDefault()}
                onClick={startCommenting}
                aria-label="Comentar trecho selecionado (Ctrl+Alt+M)"
                title="Comentar (Ctrl+Alt+M)"
                className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-input)] text-[var(--accent-blue)] transition hover:bg-[color-mix(in_srgb,var(--accent-blue),transparent_90%)]"
              >
                <MessageSquarePlus className="h-4 w-4" />
              </button>
            </>
          )}
        </BubbleMenu>

        <AnimatePresence>
          {marginMenu && !activeDraft && !isMobile && onAddAnnotation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed z-[120]"
              style={{ top: marginMenu.y, left: marginMenu.x }}
            >
              <button
                onClick={startCommenting}
                className="rounded-[var(--radius-pill)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-2.5 text-[var(--accent-blue)] shadow-[var(--shadow-dropdown)] transition hover:scale-110 hover:bg-[var(--accent-blue)] hover:text-[var(--bg-secondary)] active:scale-95"
                type="button"
              >
                <MessageSquarePlus className="h-5 w-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={cn('flex min-h-0', isFullscreen ? 'flex-1' : writingBar ? 'overflow-visible' : 'flex-1')}>
        <div
          ref={editorViewportRef}
          className={cn(
            'transition-all duration-500',
            isFullscreen && fullscreenAside && !isMobile && 'min-w-0',
            isWorkspace && !isFullscreen
              ? writingBar
                ? 'overflow-visible'
                : 'min-h-0 flex-1 overflow-y-auto custom-scrollbar'
              : 'min-h-0 flex-1 overflow-y-auto custom-scrollbar',
            isFullscreen
              ? 'bg-[var(--bg-elevated)]'
              : compactMobileComposer
                ? 'bg-transparent p-0'
                : isWorkspace
                  ? 'bg-[var(--bg-elevated)] px-6 py-8 md:px-12 md:py-12'
                  : 'bg-[var(--bg-secondary)]/30 p-4 md:p-8 lg:p-12',
            editorViewportClassName,
          )}
        >
          <div
            className={cn(
              'mx-auto flex items-start',
              railVisible ? 'flex-row gap-8' : 'flex-col gap-12',
              isFullscreen
                ? railVisible
                  ? 'w-full max-w-[72rem]'
                  : 'w-full max-w-[51rem]'
                : 'max-w-full',
            )}
          >
            <div
              ref={editorContainerRef}
              onPointerDown={handleEditorAreaPointerDown}
              className={cn(
                'relative w-full flex-1 cursor-text bg-[var(--bg-elevated)] transition-all',
                isFullscreen
                  ? cn(
                      isMobile
                        ? 'min-h-[calc(100vh-112px)] px-4 py-6 pb-28'
                        : writingBar
                          ? 'script-sheet mx-auto min-h-[calc(100dvh-10rem)] w-full max-w-[51rem] px-8 py-10'
                          : 'min-h-[760px] px-8 py-8',
                    )
                  : compactMobileComposer
                    ? 'min-h-[50dvh] rounded-none border-0 bg-transparent px-0 py-2 shadow-none'
                    : isWorkspace
                      ? writingBar
                        ? 'script-sheet mx-auto min-h-[calc(100dvh-18rem)] w-full max-w-[51rem] rounded-none border-0 bg-transparent px-2 py-2 shadow-none'
                        : 'script-sheet mx-auto min-h-[12rem] w-full max-w-[72ch] rounded-none border-0 bg-transparent px-1 py-2 shadow-none'
                      : 'min-h-[800px] rounded-[var(--radius-input)] border border-[var(--border-color)] p-12 shadow-[var(--shadow-editorial)] md:p-24',
                editorCanvasClassName,
              )}
            >
              <EditorContent
                editor={editor}
                className={cn(
                  'cursor-text',
                  isWorkspace ? 'max-w-none' : 'max-w-none prose-sm sm:prose lg:prose-lg',
                )}
              />

              {commentsEnabled && !isFullscreen && annotationSource.length > 0 && !compactMobileComposer && (
                <button
                  type="button"
                  onClick={() => setCommentsPanelOpen(true)}
                  aria-label={`Comentários (${openCount})`}
                  title="Ver todos os comentários"
                  className="absolute right-3 top-3 z-[5] flex select-none items-center gap-1.5 rounded-[var(--radius-pill)] border border-[color-mix(in_srgb,var(--warning),transparent_72%)] bg-[color-mix(in_srgb,var(--warning),transparent_90%)] px-2.5 py-1 text-xs font-bold text-[var(--text-primary)] transition hover:bg-[color-mix(in_srgb,var(--warning),transparent_80%)]"
                >
                  <MessageSquare className="h-3 w-3" />
                  {openCount}
                  {unanchoredIds.size > 0 ? <span className="font-medium text-[var(--text-tertiary)]">· {unanchoredIds.size} sem trecho</span> : null}
                </button>
              )}
            </div>

            {railVisible && (
              <CommentRail
                items={railNotes}
                anchors={new Map(annotationPositions.map(position => [position.id, position.top]))}
                activeId={expandedNoteId}
                minHeight={editorContainerRef.current?.offsetHeight ?? 0}
                renderCard={note => renderCommentCard(note)}
                draft={
                  activeDraft && draftCommentTop !== null
                    ? {
                        top: draftCommentTop,
                        node: (
                          <div className="rounded-[var(--radius-card-mobile)] border-2 border-[color-mix(in_srgb,var(--accent-blue),transparent_70%)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-card)] md:rounded-[var(--radius-card)]">
                            <p className="mb-2 text-xs font-semibold text-[var(--text-primary)]">{authorName}</p>
                            <p className="mb-3 line-clamp-2 border-l-2 border-[var(--border-strong)] pl-2 text-xs italic text-[var(--text-tertiary)]">“{activeDraft.text}”</p>
                            <textarea
                              autoFocus
                              value={draftCommentText}
                              onChange={(event) => setDraftCommentText(event.target.value)}
                              placeholder="O que você quer comentar?"
                              aria-label="Comentário"
                              className="mb-3 min-h-[72px] w-full resize-none rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-blue)] focus:outline-none"
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' && !event.shiftKey) {
                                  event.preventDefault();
                                  submitComment();
                                }
                                if (event.key === 'Escape') setActiveDraft(null);
                              }}
                            />
                            <div className="flex items-center justify-end gap-3">
                              <button onClick={() => setActiveDraft(null)} className="text-xs font-semibold text-[var(--text-tertiary)]" type="button">
                                Cancelar
                              </button>
                              <button
                                onClick={submitComment}
                                disabled={!draftCommentText.trim()}
                                className="rounded-[var(--radius-pill)] bg-[var(--accent-blue)] px-5 py-2 text-xs font-semibold text-[var(--bg-secondary)] transition disabled:bg-[var(--bg-hover)] disabled:text-[var(--text-tertiary)]"
                                type="button"
                              >
                                Comentar
                              </button>
                            </div>
                          </div>
                        ),
                      }
                    : null
                }
              />
            )}
          </div>
        </div>
        {isFullscreen && !isMobile && fullscreenAside ? (
          <div className="flex h-full min-h-0 w-[var(--layout-aside)] shrink-0 flex-col overflow-hidden border-l border-[var(--border-color)]">
            {fullscreenAside}
          </div>
        ) : null}
        </div>

        {isFullscreen && isMobile && !compactMobileComposer && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[120] bg-gradient-to-t from-[var(--bg-elevated)] via-[var(--bg-elevated)] to-transparent px-4 pb-safe pt-6">
            <div className="pointer-events-auto rounded-[var(--radius-overlay)] border border-[var(--border-color)] bg-[color-mix(in_srgb,var(--bg-elevated)_95%,transparent)] p-2 shadow-[var(--shadow-dropdown)] backdrop-blur">
              <div className="flex items-center gap-2 overflow-x-auto">
                {isMobileQuickbarOpen &&
                  secondaryActions.map((action) => {
                    const Icon = action.icon;
                    const active = action.isActive?.() ?? false;

                    return (
                      <button
                        key={action.id}
                        onClick={action.run}
                        className={cn(
                          'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[var(--radius-input)] border px-3 text-sm font-medium transition',
                          active
                            ? 'border-[color-mix(in_srgb,var(--accent-blue),transparent_75%)] bg-[color-mix(in_srgb,var(--accent-blue),transparent_92%)] text-[var(--accent-blue)]'
                            : 'border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)]',
                        )}
                        type="button"
                      >
                        <Icon className="h-4 w-4" />
                        {action.label}
                      </button>
                    );
                  })}
                <button
                  onClick={() => setIsMobileQuickbarOpen((current) => !current)}
                  className="ml-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-hover)] text-[var(--text-tertiary)]"
                  type="button"
                  aria-label="Alternar barra de atalhos"
                >
                  <ChevronUp
                    className={cn(
                      'h-4 w-4 transition-transform',
                      !isMobileQuickbarOpen && 'rotate-180',
                    )}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {isWorkspace && !compactMobileComposer ? (
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 py-2.5 text-xs text-[var(--text-tertiary)]">
            <span>
              {wordCount} {wordCount === 1 ? 'palavra' : 'palavras'} · {durationLabel}
            </span>
            {saveAction ? <div className="flex min-w-0 items-center gap-2">{saveAction}</div> : null}
          </div>
        ) : compactMobileComposer && saveAction ? (
          <div className="shrink-0 pb-16 pt-3">
            {saveAction}
          </div>
        ) : null}
      </motion.div>

      {compactMobileComposer && isMobile && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="pointer-events-none fixed inset-x-0 z-[80] px-3"
              style={{
                bottom: keyboard.open
                  ? keyboard.inset
                  : 'max(0.75rem, env(safe-area-inset-bottom))',
              }}
            >
              <div className="pointer-events-auto mx-auto flex max-w-lg items-center gap-0.5 overflow-x-auto rounded-[var(--radius-pill)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-1.5 py-1">
                {toolbarStart ? (
                  <div className="flex shrink-0 items-center gap-0.5 border-r border-[var(--border-color)] pr-1">
                    {toolbarStart}
                  </div>
                ) : null}
                {topToolbarActions
                  .filter(action => action.id === 'bold' || action.id === 'italic')
                  .map(action => {
                    const Icon = action.icon;
                    const active = action.isActive?.() ?? false;
                    return (
                      <button
                        key={action.id}
                        type="button"
                        onMouseDown={event => event.preventDefault()}
                        onClick={action.run}
                        aria-label={action.label}
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors',
                          active
                            ? 'bg-[color-mix(in_srgb,var(--brand-accent),transparent_88%)] text-[var(--brand-accent)]'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    );
                  })}
                <EditorColorMenu editor={editor} kind="highlight" presentation="sheet" />
                {commentsEnabled ? (
                  <>
                    <button
                      type="button"
                      onMouseDown={event => event.preventDefault()}
                      onClick={startCommenting}
                      disabled={!hasSelection}
                      aria-label="Comentar trecho selecionado"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-40"
                    >
                      <MessageSquarePlus className="h-4 w-4" />
                    </button>
                    {annotationSource.length > 0 ? (
                      <button
                        type="button"
                        onMouseDown={event => event.preventDefault()}
                        onClick={() => setCommentsPanelOpen(true)}
                        aria-label={`Comentários (${openCount})`}
                        className="flex h-10 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                      >
                        <MessageSquare className="h-4 w-4" />
                        {openCount}
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}

      <CommentsPanel
        open={commentsEnabled && commentsPanelOpen}
        onClose={() => setCommentsPanelOpen(false)}
        presentation={isMobile ? 'sheet' : 'drawer'}
        items={sortedAnnotations}
        total={openCount}
        showResolved={showResolved}
        onShowResolvedChange={setShowResolved}
        resolvedCount={resolvedCount}
        renderCard={note => renderCommentCard(note, true)}
      />

      <AnimatePresence>
        {activeDraft && !railVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveDraft(null)}
            className="fixed inset-0 z-[200] flex items-end justify-center bg-[color-mix(in_srgb,var(--text-primary)_40%,transparent)] p-4 sm:items-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-sm rounded-[var(--radius-card-mobile)] bg-[var(--bg-elevated)] p-6 shadow-none md:rounded-[var(--radius-card)]"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-pill)] bg-[color-mix(in_srgb,var(--accent-blue),transparent_90%)] text-xs font-bold text-[var(--accent-blue)]">
                  {authorName[0]}
                </div>
                <span className="flex-1 text-xs font-semibold text-[var(--text-primary)]">
                  {authorName}
                </span>
                <button
                  onClick={() => setActiveDraft(null)}
                  className="rounded-[var(--radius-input)] p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mb-4 overflow-hidden rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[color-mix(in_srgb,var(--surface-subtle)_80%,transparent)] p-3">
                <span className="line-clamp-2 text-xs font-medium italic text-[var(--text-tertiary)]">
                  "{activeDraft.text}"
                </span>
              </div>
              <textarea
                autoFocus
                value={draftCommentText}
                onChange={(event) => setDraftCommentText(event.target.value)}
                placeholder="O que você quer comentar?"
                className="mb-4 min-h-[80px] w-full resize-none rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 py-3 text-base text-[var(--text-primary)] transition-all focus:border-[var(--accent-blue)] focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--accent-blue),transparent_88%)] md:text-xs"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    submitComment();
                  }
                }}
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setActiveDraft(null)}
                  className="text-xs font-semibold text-[var(--text-tertiary)]"
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  onClick={submitComment}
                  disabled={!draftCommentText.trim()}
                  className={cn(
                    'rounded-[var(--radius-pill)] px-6 py-2 text-xs font-semibold transition-all',
                    draftCommentText.trim()
                      ? 'bg-[var(--accent-blue)] text-[var(--bg-secondary)] shadow-[var(--shadow-soft)] active:scale-95'
                      : 'bg-[var(--bg-hover)] text-[var(--text-tertiary)]',
                  )}
                  type="button"
                >
                  Comentar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
