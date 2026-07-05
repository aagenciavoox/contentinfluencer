import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import Typography from '@tiptap/extension-typography';
import {
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
  ChevronUp,
} from 'lucide-react';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Decoration, DecorationSet } from 'prosemirror-view';
import '../../styles/editor.css';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface Annotation {
  id: string;
  text: string;
  comment: string;
  color?: string;
  authorName?: string;
  selection: { from: number; to: number };
}

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  editorViewportClassName?: string;
  editorCanvasClassName?: string;
  onAddAnnotation?: (text: string, selection: { from: number; to: number }, comment: string) => void;
  annotations?: Annotation[];
  onRemoveAnnotation?: (id: string) => void;
  onUpdateAnnotation?: (id: string, comment: string, color?: string) => void;
  authorName?: string;
  documentTitle?: string;
  compactMobileComposer?: boolean;
  autoFocus?: boolean;
  variant?: 'default' | 'workspace';
  toolbarStart?: React.ReactNode;
  saveState?: 'idle' | 'saving' | 'saved' | 'error';
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

const COMMENT_COLORS = [
  { name: 'Yellow', value: 'color-mix(in srgb, var(--warning), transparent 50%)' },
  { name: 'Orange', value: 'color-mix(in srgb, var(--accent-orange), transparent 50%)' },
  { name: 'Blue', value: 'color-mix(in srgb, var(--accent-blue), transparent 50%)' },
  { name: 'Pink', value: 'color-mix(in srgb, var(--accent-pink), transparent 50%)' },
];

const DEFAULT_COMMENT_HIGHLIGHT = 'color-mix(in srgb, var(--warning), transparent 70%)';
const DEFAULT_COMMENT_BORDER = 'color-mix(in srgb, var(--warning), transparent 55%)';
const DEFAULT_COMMENT_STRIPE = 'color-mix(in srgb, var(--warning), transparent 60%)';
const DEFAULT_COMMENT_MODAL_STRIPE = 'color-mix(in srgb, var(--warning), transparent 25%)';

const WORDS_PER_SECOND = 2.5;

function getWordCount(value: string) {
  const text = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return 0;
  return text.split(' ').length;
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
  annotations = [],
  onRemoveAnnotation,
  onUpdateAnnotation,
  authorName = 'Você',
  documentTitle = 'Novo roteiro',
  compactMobileComposer = false,
  autoFocus = false,
  variant = 'default',
  toolbarStart,
  saveState = 'idle',
}: RichTextEditorProps) {
  const isWorkspace = variant === 'workspace';
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectionMenu, setSelectionMenu] = useState<{ x: number; y: number } | null>(null);
  const [marginMenu, setMarginMenu] = useState<{ x: number; y: number } | null>(null);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [draftCommentText, setDraftCommentText] = useState('');
  const [activeDraft, setActiveDraft] = useState<{ text: string; selection: { from: number; to: number } } | null>(null);
  const [activeAnnotationModal, setActiveAnnotationModal] = useState<Annotation | null>(null);
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const [isMobileQuickbarOpen, setIsMobileQuickbarOpen] = useState(true);
  const [annotationPositions, setAnnotationPositions] = useState<AnnotationPosition[]>([]);
  const [draftCommentTop, setDraftCommentTop] = useState<number | null>(null);

  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorViewportRef = useRef<HTMLDivElement>(null);
  const optionsMenuRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useBodyScrollLock(isFullscreen);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        underline: false,
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Typography,
    ],
    [],
  );

  const editor = useEditor({
    extensions,
    content,
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      const { empty } = currentEditor.state.selection;
      if (empty) {
        setSelectionMenu(null);
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

        setSelectionMenu({
          x: (start.left + end.left) / 2,
          y: Math.max(10, Math.min(start.top, end.top) - 48),
        });

        if (editorContainerRef.current) {
          const rect = editorContainerRef.current.getBoundingClientRect();
          setMarginMenu({
            x: rect.right + 15,
            y: start.top + (end.top - start.top) / 2 - 16,
          });
        }
      } catch {
        setSelectionMenu(null);
        setMarginMenu(null);
      }
    },
    editorProps: {
      attributes: {
        class:
          'tiptap focus:outline-none min-h-[inherit] max-w-none text-base md:text-[inherit] text-[var(--text-primary)] transition-all duration-300',
      },
      decorations: (state) => {
        const decorations: Decoration[] = [];
        annotations.forEach((note) => {
          const isExpanded = expandedNoteId === note.id;
          decorations.push(
            Decoration.inline(note.selection.from, note.selection.to, {
              class: cn(
                'annotation-highlight transition-all duration-300 cursor-pointer',
                isExpanded && 'active-annotation',
              ),
              style: `background-color: ${note.color || DEFAULT_COMMENT_HIGHLIGHT}; border-bottom: 2px solid ${
                isExpanded ? 'var(--accent-blue)' : DEFAULT_COMMENT_BORDER
              }`,
            }),
          );
        });
        return DecorationSet.create(state.doc, decorations);
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
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

  const sortedAnnotations = useMemo(() => {
    return [...annotations]
      .filter((annotation) => !!annotation.id)
      .sort((a, b) => a.selection.from - b.selection.from);
  }, [annotations]);

  const updateAnnotationAnchors = useCallback(() => {
    if (!editor || !editorContainerRef.current || !isFullscreen || isMobile) {
      setAnnotationPositions([]);
      setDraftCommentTop(null);
      return;
    }

    const editorRect = editorContainerRef.current.getBoundingClientRect();

    const resolvedPositions = sortedAnnotations
      .map((note) => {
        try {
          const coords = editor.view.coordsAtPos(note.selection.from);
          return {
            id: note.id,
            top: Math.max(0, coords.top - editorRect.top - 4),
          };
        } catch {
          return null;
        }
      })
      .filter((value): value is AnnotationPosition => value !== null);

    setAnnotationPositions(resolvedPositions);

    if (activeDraft) {
      try {
        const coords = editor.view.coordsAtPos(activeDraft.selection.from);
        setDraftCommentTop(Math.max(0, coords.top - editorRect.top - 4));
      } catch {
        setDraftCommentTop(null);
      }
    } else {
      setDraftCommentTop(null);
    }
  }, [activeDraft, editor, isFullscreen, isMobile, sortedAnnotations]);

  const startCommenting = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ');

    if (text) {
      setActiveDraft({ text, selection: { from, to } });
      setDraftCommentText('');
      setSelectionMenu(null);
      setMarginMenu(null);
    }
  }, [editor]);

  const submitComment = useCallback(() => {
    if (activeDraft && draftCommentText.trim() && onAddAnnotation) {
      onAddAnnotation(activeDraft.text, activeDraft.selection, draftCommentText);
      setActiveDraft(null);
      setDraftCommentText('');
    }
  }, [activeDraft, draftCommentText, onAddAnnotation]);

  useEffect(() => {
    updateAnnotationAnchors();
  }, [updateAnnotationAnchors]);

  useEffect(() => {
    if (!isFullscreen || isMobile) return;

    const handleUpdate = () => updateAnnotationAnchors();
    const viewport = editorViewportRef.current;

    viewport?.addEventListener('scroll', handleUpdate);
    window.addEventListener('resize', handleUpdate);

    return () => {
      viewport?.removeEventListener('scroll', handleUpdate);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isFullscreen, isMobile, updateAnnotationAnchors]);

  const handleNoteExpand = (id: string) => {
    const isExpanding = expandedNoteId !== id;
    setExpandedNoteId(isExpanding ? id : null);

    if (isExpanding && editor) {
      const note = annotations.find((annotation) => annotation.id === id);
      if (note) editor.commands.setTextSelection(note.selection);
    }
  };

  const handleEditorAreaPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!editor) return;

      const target = event.target as HTMLElement | null;
      if (target?.closest('button, a, input, textarea, select')) {
        return;
      }

      const pos = editor.view.posAtCoords({ left: event.clientX, top: event.clientY });
      const clicked = pos
        ? annotations.find((note) => pos.pos >= note.selection.from && pos.pos <= note.selection.to)
        : null;

      if (!isFullscreen && clicked) {
        event.preventDefault();
        setActiveAnnotationModal(clicked);
        return;
      }

      requestAnimationFrame(() => {
        if (!editor.isDestroyed) {
          editor.chain().focus(pos?.pos ?? 'end').run();
        }
      });
    },
    [annotations, editor, isFullscreen],
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

  const wordCount = useMemo(() => getWordCount(content), [content]);
  const speakingDuration = useMemo(
    () => formatSpeakingDuration(wordCount, isWorkspace),
    [isWorkspace, wordCount],
  );
  const saveFooterLabel =
    saveState === 'saving'
      ? 'Salvando...'
      : saveState === 'saved'
        ? 'Salvo agora'
        : saveState === 'error'
          ? 'Erro ao salvar'
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
            onClick={() => setIsFullscreen(false)}
            className="fixed inset-0 z-[90] bg-[color-mix(in_srgb,var(--text-primary)_12%,transparent)] backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>

      <motion.div
        layout
        className={cn(
          'relative border border-[var(--border-color)] transition-all duration-500 overflow-hidden',
          isWorkspace ? 'flex min-h-[calc(100vh-280px)] flex-col rounded-[var(--radius-card)] bg-[var(--bg-elevated)]' : 'rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)]',
          isFullscreen
            ? isMobile
              ? 'fixed inset-0 z-[100] flex flex-col rounded-none border-0 bg-[var(--bg-elevated)] shadow-none'
              : 'fixed left-1/2 top-1/2 z-[100] flex h-[min(1120px,calc(100dvh-56px))] w-[min(1420px,calc(100vw-56px))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] shadow-[var(--shadow-modal)]'
            : compactMobileComposer
              ? 'flex min-h-[56dvh] flex-col bg-[var(--bg-elevated)]'
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
                    onClick={() => setIsFullscreen(false)}
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
                    onClick={() => setIsFullscreen(false)}
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
                      onClick={() => setIsFullscreen(false)}
                      className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-input)] text-[var(--text-tertiary)] transition hover:bg-[var(--bg-hover)]"
                      aria-label="Fechar expansão"
                    >
                      <Minimize2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setIsFullscreen(false)}
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
          <div className="relative flex items-center border-b border-[var(--border-color)] bg-[var(--bg-elevated)]">
            <div
              className={cn(
                'relative flex min-w-0 flex-1 items-center',
                isMobile ? 'h-11 px-2' : 'h-11 px-3',
                !isFullscreen && 'rounded-t-[var(--radius-input)]',
              )}
            >
          <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
            {toolbarStart ? (
              <div className="mr-1 flex shrink-0 items-center gap-1 border-r border-[var(--border-color)] pr-2">
                {toolbarStart}
              </div>
            ) : null}
            {topToolbarActions.slice(0, 2).map((action, index) => {
              const Icon = action.icon;
              const showDivider = index === 1;

              return (
                <div key={action.id} className="flex items-center">
                  <button
                    onClick={action.run}
                    className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-input)] text-[var(--text-tertiary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                    aria-label={action.label}
                    type="button"
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                  {showDivider && <div className="mx-2 h-5 w-px bg-[var(--border-color)]" />}
                </div>
              );
            })}

            {topToolbarActions.slice(2).map((action) => {
              const Icon = action.icon;
              const active = action.isActive?.() ?? false;

              return (
                <button
                  key={action.id}
                  onClick={action.run}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-[var(--radius-input)] transition',
                    active
                      ? 'bg-[color-mix(in_srgb,var(--accent-blue),transparent_92%)] text-[var(--accent-blue)]'
                      : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
                  )}
                  aria-label={action.label}
                  type="button"
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>

          {!isWorkspace ? (
            <div className="ml-3 flex shrink-0 items-center gap-1 text-sm text-[var(--text-tertiary)]">
              <span className="hidden sm:inline">
                {wordCount} palavras · {speakingDuration}
              </span>
              <span className="sm:hidden">
                {wordCount} · {speakingDuration}
              </span>
              <div className="relative" ref={optionsMenuRef}>
                <button
                  onClick={() => setIsOptionsMenuOpen((current) => !current)}
                  className="ml-1 flex h-9 w-9 items-center justify-center rounded-[var(--radius-input)] text-[var(--text-tertiary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  aria-label="Mais opções"
                  type="button"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                <AnimatePresence>
                  {isOptionsMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="absolute right-0 top-11 z-[130] min-w-[220px] rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-2 shadow-[var(--shadow-dropdown)]"
                    >
                      {secondaryActions.map((action) => {
                        const Icon = action.icon;
                        const active = action.isActive?.() ?? false;

                        return (
                          <button
                            key={action.id}
                            onClick={action.run}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-[var(--radius-input)] px-3 py-2.5 text-left text-sm transition',
                              active ? 'bg-[color-mix(in_srgb,var(--accent-blue),transparent_92%)] text-[var(--accent-blue)]' : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
                            )}
                            type="button"
                          >
                            <Icon className="h-4 w-4" />
                            <span className="flex-1">{action.label}</span>
                            {active && <Check className="h-4 w-4" />}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="relative ml-2 shrink-0" ref={optionsMenuRef}>
              <button
                onClick={() => setIsOptionsMenuOpen((current) => !current)}
                className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-input)] text-[var(--text-tertiary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                aria-label="Mais opções"
                type="button"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              <AnimatePresence>
                {isOptionsMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="absolute right-0 top-11 z-[130] min-w-[220px] rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-2 shadow-[var(--shadow-dropdown)]"
                  >
                    {secondaryActions.map((action) => {
                      const Icon = action.icon;
                      const active = action.isActive?.() ?? false;

                      return (
                        <button
                          key={action.id}
                          onClick={action.run}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-[var(--radius-input)] px-3 py-2.5 text-left text-sm transition',
                            active ? 'bg-[color-mix(in_srgb,var(--accent-blue),transparent_92%)] text-[var(--accent-blue)]' : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
                          )}
                          type="button"
                        >
                          <Icon className="h-4 w-4" />
                          <span className="flex-1">{action.label}</span>
                          {active && <Check className="h-4 w-4" />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          </div>
            <button
              onClick={() => setIsFullscreen(true)}
              className="mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-input)] text-[var(--text-tertiary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              aria-label="Expandir editor"
              type="button"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        )}

        <AnimatePresence>
          {selectionMenu && editor && !activeDraft && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed z-[120] flex -translate-x-1/2 items-center gap-0.5 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-1 shadow-[var(--shadow-dropdown)]"
              style={{ top: selectionMenu.y, left: selectionMenu.x }}
            >
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={cn(
                  'rounded-[var(--radius-input)] p-2',
                  editor.isActive('bold') ? 'text-[var(--accent-blue)]' : 'opacity-60',
                )}
                type="button"
              >
                <Bold className="h-4 w-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={cn(
                  'rounded-[var(--radius-input)] p-2',
                  editor.isActive('italic') ? 'text-[var(--accent-blue)]' : 'opacity-60',
                )}
                type="button"
              >
                <Italic className="h-4 w-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={cn(
                  'rounded-[var(--radius-input)] p-2',
                  editor.isActive('underline') ? 'text-[var(--accent-blue)]' : 'opacity-60',
                )}
                type="button"
              >
                <UnderlineIcon className="h-4 w-4" />
              </button>
              {onAddAnnotation && (
                <>
                  <div className="mx-1 h-5 w-px bg-[var(--border-color)]" />
                  <button
                    onClick={startCommenting}
                    className="rounded-[var(--radius-input)] p-2 text-[var(--accent-blue)] opacity-80 transition hover:bg-[color-mix(in_srgb,var(--accent-blue),transparent_90%)] hover:opacity-100"
                    type="button"
                    aria-label="Comentar trecho selecionado"
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                  </button>
                </>
              )}
            </motion.div>
          )}

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

        <div
          ref={editorViewportRef}
          className={cn(
            'flex-1 overflow-y-auto custom-scrollbar transition-all duration-500',
            isFullscreen
              ? 'bg-[var(--bg-elevated)]'
              : compactMobileComposer
                ? 'bg-[var(--bg-elevated)] p-0'
                : isWorkspace
                  ? 'bg-[var(--bg-elevated)] p-3 md:p-6'
                  : 'bg-[var(--bg-secondary)]/30 p-4 md:p-8 lg:p-12',
            editorViewportClassName,
          )}
        >
          <div
            className={cn(
              'mx-auto flex items-start gap-12',
              isFullscreen ? 'max-w-none flex-col xl:flex-row' : 'max-w-full flex-col xl:flex-row',
            )}
          >
            <div
              ref={editorContainerRef}
              onPointerDown={handleEditorAreaPointerDown}
              className={cn(
                'relative w-full flex-1 cursor-text bg-[var(--bg-elevated)] transition-all',
                isFullscreen
                  ? cn(
                      isMobile ? 'min-h-[calc(100vh-112px)] px-4 py-6 pb-28' : 'min-h-[760px] px-8 py-8',
                    )
                  : compactMobileComposer
                    ? 'min-h-[56dvh] rounded-[var(--radius-card)] border border-[var(--border-color)] px-4 py-4 shadow-[var(--shadow-soft)]'
                    : isWorkspace
                      ? 'min-h-[calc(100vh-260px)] rounded-[var(--radius-input)] border border-[var(--border-color)] px-4 py-6 md:px-6 md:py-6'
                      : 'min-h-[800px] rounded-[var(--radius-input)] border border-[var(--border-color)] p-12 shadow-[var(--shadow-editorial)] md:p-24',
                editorCanvasClassName,
              )}
            >
              <EditorContent editor={editor} className="cursor-text max-w-none prose-sm sm:prose lg:prose-lg" />

              {!isFullscreen && annotations.length > 0 && (
                <div className="pointer-events-none absolute right-3 top-3 flex select-none items-center gap-1.5 rounded-[var(--radius-pill)] border border-[color-mix(in_srgb,var(--warning),transparent_72%)] bg-[color-mix(in_srgb,var(--warning),transparent_90%)] px-2.5 py-1 text-xs font-bold text-[var(--warning)]">
                  <MessageSquare className="h-3 w-3" />
                  {annotations.length}
                </div>
              )}
            </div>

            {isFullscreen && !isMobile && (
              <div
                className="relative w-full shrink-0 px-8 pb-8 xl:w-80"
                style={{ minHeight: editorContainerRef.current?.offsetHeight ?? 0 }}
              >
                <AnimatePresence>
                  {activeDraft && (
                    <motion.div
                      key="active-draft"
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{ top: draftCommentTop ?? 0 }}
                      className="absolute left-0 right-0 z-20 rounded-[var(--radius-card-mobile)] border-2 border-[color-mix(in_srgb,var(--accent-blue),transparent_78%)] bg-[var(--bg-elevated)] p-6 shadow-none md:rounded-[var(--radius-card)]"
                    >
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-pill)] bg-[color-mix(in_srgb,var(--accent-blue),transparent_90%)] text-xs font-bold text-[var(--accent-blue)]">
                          {authorName[0]}
                        </div>
                        <span className="text-xs font-semibold text-[var(--text-primary)]">
                          {authorName}
                        </span>
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
                  )}

                  {sortedAnnotations.map((note) => {
                    const isExpanded = expandedNoteId === note.id;
                    const currentAuthor = note.authorName || authorName;
                    const anchoredPosition = annotationPositions.find((position) => position.id === note.id);

                    return (
                      <motion.div
                        key={note.id}
                        onClick={() => handleNoteExpand(note.id)}
                        style={{ top: anchoredPosition?.top ?? 0 }}
                        className={cn(
                          'group absolute left-0 right-0 cursor-pointer overflow-hidden rounded-[var(--radius-card-mobile)] border bg-[var(--bg-elevated)] transition-all md:rounded-[var(--radius-card)]',
                          isExpanded
                            ? 'z-10 scale-105 border-[color-mix(in_srgb,var(--accent-blue),transparent_70%)] p-6 shadow-[var(--shadow-card)]'
                            : 'border-[var(--border-color)] p-4 shadow-[var(--shadow-soft)] hover:border-[var(--border-strong)]',
                        )}
                      >
                        <div
                          className="absolute bottom-0 left-0 top-0 w-1.5"
                          style={{ backgroundColor: note.color || DEFAULT_COMMENT_STRIPE }}
                        />
                        <div className="mb-3 flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-pill)] border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs font-bold text-[var(--accent-blue)]">
                            {currentAuthor[0]}
                          </div>
                          <span className="flex-1 text-xs font-semibold text-[var(--text-primary)]">
                            {currentAuthor}
                          </span>
                          <div className="flex items-center opacity-0 transition-all group-hover:opacity-100">
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                onRemoveAnnotation?.(note.id);
                              }}
                              className="rounded-[var(--radius-input)] p-1.5 text-[color-mix(in_srgb,var(--danger),transparent_35%)] transition hover:bg-[color-mix(in_srgb,var(--danger),transparent_90%)] hover:text-[var(--danger)]"
                              type="button"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <p
                            className={cn(
                              't-meta font-medium leading-relaxed text-[var(--text-secondary)] transition-all duration-300',
                              !isExpanded && 'line-clamp-2 overflow-hidden text-ellipsis',
                            )}
                          >
                            {note.comment}
                          </p>
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mt-4 flex items-center justify-between overflow-hidden border-t border-[var(--border-color)] pt-4"
                              >
                                <div className="flex items-center gap-2">
                                  {COMMENT_COLORS.map((color) => (
                                    <button
                                      key={color.value}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        onUpdateAnnotation?.(note.id, note.comment, color.value);
                                      }}
                                      className={cn(
                                        'h-3.5 w-3.5 rounded-[var(--radius-pill)] ring-offset-2 ring-offset-[var(--bg-elevated)] transition-all hover:scale-125',
                                        note.color === color.value && 'ring-2 ring-[var(--accent-blue)]',
                                      )}
                                      style={{ backgroundColor: color.value }}
                                      type="button"
                                    />
                                  ))}
                                </div>
                                <span className="text-xs font-bold text-[var(--text-tertiary)]">
                                  Fechar
                                </span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
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
          <div className="flex shrink-0 items-center justify-between border-t border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 py-2.5 text-xs text-[var(--text-tertiary)]">
            <span>
              {wordCount} palavras · {speakingDuration}
            </span>
            {saveFooterLabel ? (
              <span className="inline-flex items-center gap-1 font-medium text-[var(--text-secondary)]">
                {saveState === 'saved' ? <Check className="h-3.5 w-3.5 text-[var(--success)]" /> : null}
                {saveFooterLabel}
              </span>
            ) : null}
          </div>
        ) : null}
      </motion.div>

      <AnimatePresence>
        {activeAnnotationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveAnnotationModal(null)}
            className="fixed inset-0 z-[200] flex items-end justify-center bg-[color-mix(in_srgb,var(--text-primary)_40%,transparent)] p-4 sm:items-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-sm overflow-hidden rounded-[var(--radius-card-mobile)] bg-[var(--bg-elevated)] shadow-none md:rounded-[var(--radius-card)]"
            >
              <div
                className="h-1.5 w-full"
                style={{ backgroundColor: activeAnnotationModal.color || DEFAULT_COMMENT_MODAL_STRIPE }}
              />
              <div className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-pill)] border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs font-bold text-[var(--accent-blue)]">
                    {(activeAnnotationModal.authorName || authorName)[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-[var(--text-primary)]">
                      {activeAnnotationModal.authorName || authorName}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">Comentário</p>
                  </div>
                  <button
                    onClick={() => setActiveAnnotationModal(null)}
                    className="rounded-[var(--radius-input)] p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)]"
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mb-4 rounded-[var(--radius-input)] border border-[color-mix(in_srgb,var(--warning),transparent_82%)] bg-[color-mix(in_srgb,var(--warning),transparent_92%)] p-3">
                  <p className="line-clamp-2 text-xs font-medium italic text-[var(--warning)]">
                    "{activeAnnotationModal.text}"
                  </p>
                </div>

                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{activeAnnotationModal.comment}</p>

                <div className="mt-5 flex items-center justify-between border-t border-[var(--border-color)] pt-4">
                  <div className="flex items-center gap-2">
                    {COMMENT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => {
                          onUpdateAnnotation?.(
                            activeAnnotationModal.id,
                            activeAnnotationModal.comment,
                            color.value,
                          );
                          setActiveAnnotationModal({ ...activeAnnotationModal, color: color.value });
                        }}
                        className={cn(
                          'h-4 w-4 rounded-[var(--radius-pill)] ring-offset-2 ring-offset-[var(--bg-elevated)] transition-all hover:scale-125',
                          activeAnnotationModal.color === color.value && 'ring-2 ring-[var(--accent-blue)]',
                        )}
                        style={{ backgroundColor: color.value }}
                        type="button"
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      onRemoveAnnotation?.(activeAnnotationModal.id);
                      setActiveAnnotationModal(null);
                    }}
                    className="flex items-center gap-1.5 rounded-[var(--radius-input)] px-3 py-1.5 text-xs font-bold text-[var(--danger)] transition-colors hover:bg-[color-mix(in_srgb,var(--danger),transparent_90%)]"
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeDraft && !isFullscreen && (
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
