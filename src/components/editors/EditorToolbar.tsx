import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useEditorState, type Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  ChevronDown,
  Heading1,
  Heading2,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  MessageSquarePlus,
  Minus,
  Pilcrow,
  Quote,
  Redo,
  RemoveFormatting,
  Search,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { applyEditorColor, ColorSwatches, EditorColorMenu } from './EditorColorMenu';
import { clearFormatting } from './editorExtensions';
import { WRITING_BAR_ACTION_IDS, WRITING_MENU_ACTION_IDS } from './writingFormatBar';

type Icon = typeof Bold;

export type ToolbarItem = {
  id: string;
  label: string;
  icon: Icon;
  shortcut?: string;
  run: () => void;
  active?: boolean;
  disabled?: boolean;
};

function controlClass(active: boolean, neutral: boolean) {
  if (active) {
    return neutral
      ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
      : 'bg-[color-mix(in_srgb,var(--accent-blue),transparent_92%)] text-[var(--accent-blue)]';
  }
  return neutral
    ? 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
    : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]';
}

function Separator() {
  return <div className="mx-1.5 h-5 w-px shrink-0 bg-[var(--border-color)]" aria-hidden />;
}

function IconButton({ item, neutral }: { item: ToolbarItem; neutral: boolean }) {
  const Icon = item.icon;
  const title = item.shortcut ? `${item.label} (${item.shortcut})` : item.label;
  return (
    <button
      type="button"
      onMouseDown={event => event.preventDefault()}
      onClick={item.run}
      disabled={item.disabled}
      aria-label={title}
      aria-pressed={item.active ?? undefined}
      title={title}
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-input)] transition disabled:pointer-events-none disabled:opacity-40',
        controlClass(!!item.active, neutral),
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function useOutsideClose(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [close, open]);
  return ref;
}

/** Menu suspenso da barra (Estilo, Alinhar, Mais). */
export function ToolbarDropdown({
  label,
  triggerIcon: TriggerIcon,
  triggerText,
  items,
  neutral,
  align = 'left',
  footer,
  minWidth = 'min-w-[200px]',
}: {
  label: string;
  triggerIcon?: Icon;
  triggerText?: string;
  items: ToolbarItem[];
  neutral: boolean;
  align?: 'left' | 'right';
  footer?: ReactNode;
  minWidth?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onMouseDown={event => event.preventDefault()}
        onClick={() => setOpen(value => !value)}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'flex h-9 items-center gap-1 rounded-[var(--radius-input)] px-2 text-xs font-medium transition',
          controlClass(open, neutral),
        )}
      >
        {TriggerIcon ? <TriggerIcon className="h-4 w-4" /> : null}
        {triggerText ? <span className="max-w-[7rem] truncate">{triggerText}</span> : null}
        <ChevronDown className={cn('h-3.5 w-3.5 opacity-70 transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <div
          role="menu"
          className={cn(
            'absolute top-11 z-[130] max-h-[70vh] overflow-y-auto rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-2 shadow-[var(--shadow-dropdown)] md:rounded-[var(--radius-card)]',
            align === 'right' ? 'right-0' : 'left-0',
            minWidth,
          )}
        >
          {items.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                role="menuitem"
                type="button"
                disabled={item.disabled}
                onMouseDown={event => event.preventDefault()}
                onClick={() => {
                  item.run();
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-[var(--radius-input)] px-3 py-2 text-left text-sm transition disabled:opacity-40',
                  item.active ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]' : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.shortcut ? <span className="text-xs text-[var(--text-tertiary)]">{item.shortcut}</span> : null}
                {item.active ? <Check className="h-4 w-4 shrink-0" /> : null}
              </button>
            );
          })}
          {footer}
        </div>
      ) : null}
    </div>
  );
}

function setBlockStyle(editor: Editor, style: 'paragraph' | 'h1' | 'h2' | 'quote') {
  const inQuote = editor.isActive('blockquote');
  if (style === 'quote') {
    if (!inQuote) editor.chain().focus().setParagraph().setBlockquote().run();
    return;
  }
  let chain = editor.chain().focus();
  if (inQuote) chain = chain.unsetBlockquote();
  if (style === 'paragraph') chain.setParagraph().run();
  else chain.setHeading({ level: style === 'h1' ? 1 : 2 }).run();
}

export interface EditorToolbarProps {
  editor: Editor;
  mode: 'full' | 'writing';
  toolbarStart?: ReactNode;
  typographySlot?: ReactNode;
  onComment?: () => void;
  onFind: (mode: 'find' | 'replace') => void;
  onLink: () => void;
}

/**
 * Barra no estilo Google Docs:
 * blocos | desfazer/refazer | estilo | fonte e tamanho | B I U, cor, destaque | link, comentário | alinhar | listas e recuo | limpar | Mais.
 * Modo escrita: desfazer, B, I, destaque e comentário visíveis; o resto em Mais.
 */
export function EditorToolbar({ editor, mode, toolbarStart, typographySlot, onComment, onFind, onLink }: EditorToolbarProps) {
  const neutral = mode === 'writing';
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      link: e.isActive('link'),
      h1: e.isActive('heading', { level: 1 }),
      h2: e.isActive('heading', { level: 2 }),
      quote: e.isActive('blockquote'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      align: (['center', 'right', 'justify'] as const).find(value => e.isActive({ textAlign: value })) ?? 'left',
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      canSink: e.can().sinkListItem('listItem'),
      canLift: e.can().liftListItem('listItem'),
      hasSelection: !e.state.selection.empty,
      textColor: (e.getAttributes('textStyle').color as string | undefined) ?? null,
    }),
  });

  const chain = () => editor.chain().focus();
  const styleLabel = state.h1 ? 'Título 1' : state.h2 ? 'Título 2' : state.quote ? 'Citação' : 'Texto normal';
  const alignIcon = { left: AlignLeft, center: AlignCenter, right: AlignRight, justify: AlignJustify }[state.align];

  const catalog: Record<string, ToolbarItem> = {
    undo: { id: 'undo', label: 'Desfazer', icon: Undo, shortcut: 'Ctrl+Z', run: () => chain().undo().run(), disabled: !state.canUndo },
    redo: { id: 'redo', label: 'Refazer', icon: Redo, shortcut: 'Ctrl+Y', run: () => chain().redo().run(), disabled: !state.canRedo },
    paragraph: { id: 'paragraph', label: 'Texto normal', icon: Pilcrow, shortcut: 'Ctrl+Alt+0', run: () => setBlockStyle(editor, 'paragraph'), active: styleLabel === 'Texto normal' },
    h1: { id: 'h1', label: 'Título 1', icon: Heading1, shortcut: 'Ctrl+Alt+1', run: () => setBlockStyle(editor, 'h1'), active: state.h1 },
    h2: { id: 'h2', label: 'Título 2', icon: Heading2, shortcut: 'Ctrl+Alt+2', run: () => setBlockStyle(editor, 'h2'), active: state.h2 },
    quote: { id: 'quote', label: 'Citação', icon: Quote, shortcut: 'Ctrl+Shift+B', run: () => setBlockStyle(editor, 'quote'), active: state.quote },
    bold: { id: 'bold', label: 'Negrito', icon: Bold, shortcut: 'Ctrl+B', run: () => chain().toggleBold().run(), active: state.bold },
    italic: { id: 'italic', label: 'Itálico', icon: Italic, shortcut: 'Ctrl+I', run: () => chain().toggleItalic().run(), active: state.italic },
    underline: { id: 'underline', label: 'Sublinhado', icon: UnderlineIcon, shortcut: 'Ctrl+U', run: () => chain().toggleUnderline().run(), active: state.underline },
    strike: { id: 'strike', label: 'Tachado', icon: Strikethrough, shortcut: 'Ctrl+Shift+S', run: () => chain().toggleStrike().run(), active: state.strike },
    link: { id: 'link', label: 'Link', icon: LinkIcon, shortcut: 'Ctrl+K', run: onLink, active: state.link },
    comment: {
      id: 'comment',
      label: state.hasSelection ? 'Comentar' : 'Comentar (selecione um trecho)',
      icon: MessageSquarePlus,
      shortcut: 'Ctrl+Alt+M',
      run: () => onComment?.(),
      disabled: !state.hasSelection,
    },
    'align-left': { id: 'align-left', label: 'Alinhar à esquerda', icon: AlignLeft, shortcut: 'Ctrl+Shift+L', run: () => chain().setTextAlign('left').run(), active: state.align === 'left' },
    'align-center': { id: 'align-center', label: 'Centralizar', icon: AlignCenter, shortcut: 'Ctrl+Shift+E', run: () => chain().setTextAlign('center').run(), active: state.align === 'center' },
    'align-right': { id: 'align-right', label: 'Alinhar à direita', icon: AlignRight, shortcut: 'Ctrl+Shift+R', run: () => chain().setTextAlign('right').run(), active: state.align === 'right' },
    'align-justify': { id: 'align-justify', label: 'Justificar', icon: AlignJustify, shortcut: 'Ctrl+Shift+J', run: () => chain().setTextAlign('justify').run(), active: state.align === 'justify' },
    list: { id: 'list', label: 'Lista', icon: List, shortcut: 'Ctrl+Shift+8', run: () => chain().toggleBulletList().run(), active: state.bullet },
    ordered: { id: 'ordered', label: 'Lista numerada', icon: ListOrdered, shortcut: 'Ctrl+Shift+7', run: () => chain().toggleOrderedList().run(), active: state.ordered },
    indent: { id: 'indent', label: 'Aumentar recuo', icon: IndentIncrease, shortcut: 'Tab', run: () => chain().sinkListItem('listItem').run(), disabled: !state.canSink },
    outdent: { id: 'outdent', label: 'Diminuir recuo', icon: IndentDecrease, shortcut: 'Shift+Tab', run: () => chain().liftListItem('listItem').run(), disabled: !state.canLift },
    rule: { id: 'rule', label: 'Linha divisória', icon: Minus, run: () => chain().setHorizontalRule().run() },
    clear: { id: 'clear', label: 'Limpar formatação', icon: RemoveFormatting, shortcut: 'Ctrl+\\', run: () => clearFormatting(editor) },
    find: { id: 'find', label: 'Buscar e substituir', icon: Search, shortcut: 'Ctrl+F', run: () => onFind('find') },
  };
  if (!onComment) delete catalog.comment;

  const pick = (ids: readonly string[]) => ids.flatMap(id => (catalog[id] ? [catalog[id]] : []));
  const styleItems = pick(['paragraph', 'h1', 'h2', 'quote']);
  const alignItems = pick(['align-left', 'align-center', 'align-right', 'align-justify']);

  const textColorFooter = (
    <div className="mt-1 border-t border-[var(--border-color)] px-3 pb-1 pt-3">
      <p className="mb-2 text-xs font-medium text-[var(--text-tertiary)]">Cor do texto</p>
      <ColorSwatches kind="text" current={state.textColor} onPick={color => applyEditorColor(editor, 'text', color)} />
    </div>
  );

  if (mode === 'writing') {
    const visible = new Set<string>(WRITING_BAR_ACTION_IDS);
    return (
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5">
        {toolbarStart ? <div className="mr-1 flex shrink-0 items-center gap-1 border-r border-[var(--border-color)] pr-2">{toolbarStart}</div> : null}
        {visible.has('undo') ? <IconButton item={catalog.undo} neutral /> : null}
        {typographySlot ? (
          <>
            <Separator />
            {typographySlot}
          </>
        ) : null}
        <Separator />
        {pick(['bold', 'italic']).map(item => <IconButton key={item.id} item={item} neutral />)}
        {visible.has('highlight') ? <EditorColorMenu editor={editor} kind="highlight" neutral /> : null}
        {catalog.comment && visible.has('comment') ? <IconButton item={catalog.comment} neutral /> : null}
        <div className="ml-auto pl-1">
          <ToolbarDropdown label="Mais opções" triggerText="Mais" items={pick(WRITING_MENU_ACTION_IDS)} neutral align="right" footer={textColorFooter} minWidth="min-w-[260px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5">
      {toolbarStart ? <div className="mr-1 flex shrink-0 items-center gap-1 border-r border-[var(--border-color)] pr-2">{toolbarStart}</div> : null}
      {pick(['undo', 'redo']).map(item => <IconButton key={item.id} item={item} neutral={false} />)}
      <Separator />
      <ToolbarDropdown label="Estilo do parágrafo" triggerText={styleLabel} items={styleItems} neutral={false} />
      {typographySlot ? (
        <>
          <Separator />
          {typographySlot}
        </>
      ) : null}
      <Separator />
      {pick(['bold', 'italic', 'underline']).map(item => <IconButton key={item.id} item={item} neutral={false} />)}
      <EditorColorMenu editor={editor} kind="text" />
      <EditorColorMenu editor={editor} kind="highlight" />
      <Separator />
      {pick(['link', 'comment']).map(item => <IconButton key={item.id} item={item} neutral={false} />)}
      <Separator />
      <ToolbarDropdown label="Alinhamento" triggerIcon={alignIcon} items={alignItems} neutral={false} />
      <Separator />
      {pick(['list', 'ordered', 'outdent', 'indent']).map(item => <IconButton key={item.id} item={item} neutral={false} />)}
      <Separator />
      <IconButton item={catalog.clear} neutral={false} />
      <div className="ml-auto pl-1">
        <ToolbarDropdown label="Mais opções" triggerText="Mais" items={pick(['strike', 'rule', 'find'])} neutral={false} align="right" />
      </div>
    </div>
  );
}
