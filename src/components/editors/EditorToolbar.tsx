import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
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
  MoreHorizontal,
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
import { EditorColorMenu } from './EditorColorMenu';
import { clearFormatting } from './editorExtensions';
import {
  fitWritingGroups,
  WRITING_COLLAPSIBLE_GROUPS,
  writingOverflowItemIds,
  type WritingBarGroupId,
} from './writingFormatBar';

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

function IconButton({ item, neutral, compact = false }: { item: ToolbarItem; neutral: boolean; compact?: boolean }) {
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
        'flex shrink-0 items-center justify-center rounded-[var(--radius-input)] transition disabled:pointer-events-none disabled:opacity-40',
        compact ? 'h-8 w-8' : 'h-9 w-9',
        controlClass(!!item.active, neutral),
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/**
 * Botão de texto da barra (ex.: "Notas"), no mesmo desenho do gatilho "Mais".
 * `active` marca o painel aberto (aria-pressed).
 */
export function ToolbarTextButton({
  label,
  icon: ButtonIcon,
  onClick,
  active = false,
  neutral = true,
  title,
}: {
  label: string;
  icon?: Icon;
  onClick: () => void;
  active?: boolean;
  neutral?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={event => event.preventDefault()}
      onClick={onClick}
      aria-pressed={active}
      title={title ?? label}
      className={cn(
        'flex h-8 shrink-0 items-center gap-1 rounded-[var(--radius-input)] px-2 text-xs font-medium transition',
        controlClass(active, neutral),
      )}
    >
      {ButtonIcon ? <ButtonIcon className="h-4 w-4" aria-hidden /> : null}
      <span>{label}</span>
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

/** Item de menu da barra: ícone opcional e estilo próprio (ex.: cada fonte na própria fonte). */
export type ToolbarMenuItem = Omit<ToolbarItem, 'icon'> & { icon?: Icon; style?: CSSProperties };

/**
 * Menu suspenso da barra (Estilo, Fonte, Tamanho, Alinhar, "⋯").
 * Não tira a seleção do editor (mousedown sem foco). Pelo teclado: Enter/Espaço/↓ abre,
 * ↑ ↓ Home End navegam, Enter escolhe, Esc fecha e volta ao botão.
 */
export function ToolbarDropdown({
  label,
  triggerIcon: TriggerIcon,
  triggerText,
  triggerStyle,
  triggerClassName,
  hideChevron = false,
  items,
  neutral,
  align = 'left',
  footer,
  minWidth = 'min-w-[200px]',
  compact = false,
  selectable = false,
  onOpen,
}: {
  label: string;
  triggerIcon?: Icon;
  triggerText?: string;
  triggerStyle?: CSSProperties;
  /** Moldura extra do botão (ex.: borda de campo nos seletores de fonte e tamanho). */
  triggerClassName?: string;
  hideChevron?: boolean;
  items: ToolbarMenuItem[];
  neutral: boolean;
  align?: 'left' | 'right';
  footer?: ReactNode;
  minWidth?: string;
  /** h-8, para a barra de Escrita. */
  compact?: boolean;
  /** Escolha única: o item ativo é a opção marcada (menuitemradio). */
  selectable?: boolean;
  /** Ao abrir (ex.: carregar as fontes da lista). */
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const close = useCallback(() => setOpen(false), []);
  const ref = useOutsideClose(open, close);

  const enabledIndex = (from: number, step: 1 | -1) => {
    for (let offset = 0; offset < items.length; offset += 1) {
      const index = (from + step * offset + items.length * 2) % items.length;
      if (!items[index]?.disabled) return index;
    }
    return -1;
  };

  // Só move o foco para a lista quando ela foi aberta pelo teclado (o mouse deixa o cursor no texto).
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    itemRefs.current[activeIndex]?.focus({ preventScroll: false });
  }, [activeIndex, open]);

  const openWithKeyboard = (preferred: 'selected' | 'first' | 'last') => {
    const selected = items.findIndex(item => item.active && !item.disabled);
    onOpen?.();
    setOpen(true);
    setActiveIndex(
      preferred === 'last'
        ? enabledIndex(items.length - 1, -1)
        : preferred === 'selected' && selected >= 0
          ? selected
          : enabledIndex(0, 1),
    );
  };

  const closeAndReturn = () => {
    setOpen(false);
    setActiveIndex(-1);
    triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openWithKeyboard('selected');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      openWithKeyboard('last');
    }
  };

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const current = activeIndex < 0 ? -1 : activeIndex;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex(enabledIndex(current + 1, 1));
        return;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex(enabledIndex(current < 0 ? items.length - 1 : current - 1, -1));
        return;
      case 'Home':
        event.preventDefault();
        setActiveIndex(enabledIndex(0, 1));
        return;
      case 'End':
        event.preventDefault();
        setActiveIndex(enabledIndex(items.length - 1, -1));
        return;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        closeAndReturn();
        return;
      case 'Tab':
        setOpen(false);
        setActiveIndex(-1);
        return;
      default:
    }
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onMouseDown={event => event.preventDefault()}
        onClick={() => {
          setActiveIndex(-1);
          if (!open) onOpen?.();
          setOpen(value => !value);
        }}
        onKeyDown={handleTriggerKeyDown}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-1 rounded-[var(--radius-input)] px-2 text-xs font-medium transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
          compact ? 'h-8' : 'h-9',
          controlClass(open, neutral),
          triggerClassName,
        )}
      >
        {TriggerIcon ? <TriggerIcon className="h-4 w-4" /> : null}
        {triggerText ? <span className="max-w-[7rem] truncate" style={triggerStyle}>{triggerText}</span> : null}
        {hideChevron ? null : <ChevronDown className={cn('h-3.5 w-3.5 opacity-70 transition-transform', open && 'rotate-180')} />}
      </button>
      {open ? (
        <div
          role="menu"
          aria-label={label}
          onKeyDown={handleMenuKeyDown}
          className={cn(
            // Acima do editor e da tela cheia do editor (z-[100]); igual às listas flutuantes do app.
            'absolute z-[130] max-h-[70vh] overflow-y-auto rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-2 shadow-[var(--shadow-dropdown)] md:rounded-[var(--radius-card)]',
            compact ? 'top-10' : 'top-11',
            align === 'right' ? 'right-0' : 'left-0',
            minWidth,
          )}
        >
          {items.map((item, index) => {
            const ItemIcon = item.icon;
            return (
              <button
                key={item.id}
                ref={node => {
                  itemRefs.current[index] = node;
                }}
                role={selectable ? 'menuitemradio' : 'menuitem'}
                aria-checked={selectable ? Boolean(item.active) : undefined}
                type="button"
                tabIndex={index === activeIndex ? 0 : -1}
                disabled={item.disabled}
                title={item.shortcut ? `${item.label} (${item.shortcut})` : undefined}
                onMouseDown={event => event.preventDefault()}
                onClick={() => {
                  item.run();
                  setOpen(false);
                  setActiveIndex(-1);
                }}
                className={cn(
                  'flex w-full items-center gap-3 whitespace-nowrap rounded-[var(--radius-input)] px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:bg-[var(--bg-hover)] disabled:opacity-40',
                  item.active ? 'bg-[var(--bg-hover)] font-semibold text-[var(--text-primary)]' : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
                )}
              >
                {ItemIcon ? <ItemIcon className="h-4 w-4 shrink-0" /> : null}
                <span className="flex-1" style={item.style}>{item.label}</span>
                {item.shortcut ? <span className="text-xs font-normal text-[var(--text-tertiary)]">{item.shortcut}</span> : null}
                {item.active ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : null}
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
  /** Na ponta direita, antes de "Mais"/"⋯" (ex.: botão "Notas"). */
  toolbarEnd?: ReactNode;
  typographySlot?: ReactNode;
  onComment?: () => void;
  onFind: (mode: 'find' | 'replace') => void;
  onLink: () => void;
}

/**
 * Barra no estilo Google Docs:
 * blocos | desfazer/refazer | estilo | fonte e tamanho | B I U, cor, destaque | link, comentário | alinhar | listas e recuo | limpar | Mais.
 * Modo escrita (roteiro no computador): tudo à vista, em grupos, sem "Mais" (ver writingFormatBar.ts).
 */
export function EditorToolbar({ editor, mode, toolbarStart, toolbarEnd, typographySlot, onComment, onFind, onLink }: EditorToolbarProps) {
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

  if (mode === 'writing') {
    return (
      <WritingToolbar
        editor={editor}
        pick={pick}
        styleLabel={styleLabel}
        styleItems={styleItems}
        alignIcon={alignIcon}
        alignItems={alignItems}
        toolbarStart={toolbarStart}
        toolbarEnd={toolbarEnd}
        typographySlot={typographySlot}
      />
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
      <div className="ml-auto flex shrink-0 items-center gap-0.5 pl-1">
        {toolbarEnd}
        <ToolbarDropdown label="Mais opções" triggerText="Mais" items={pick(['strike', 'rule', 'find'])} neutral={false} align="right" />
      </div>
    </div>
  );
}

/** Largura reservada para o botão "⋯" quando algum grupo sai da barra. */
const OVERFLOW_BUTTON_WIDTH = 40;
/** Folga para os espaços entre os itens e o arredondamento das medidas. */
const ROW_SLACK = 12;

/**
 * Barra de Escrita: todos os controles à vista, em grupos com divisores finos.
 * Quando falta largura, os últimos grupos (ferramentas, parágrafo, inserir) vão para o "⋯",
 * nessa ordem; desfazer, estilo, fonte, tamanho, B I U, cor e destaque ficam sempre.
 */
function WritingToolbar({
  editor,
  pick,
  styleLabel,
  styleItems,
  alignIcon,
  alignItems,
  toolbarStart,
  toolbarEnd,
  typographySlot,
}: {
  editor: Editor;
  pick: (ids: readonly string[]) => ToolbarItem[];
  styleLabel: string;
  styleItems: ToolbarItem[];
  alignIcon: Icon;
  alignItems: ToolbarItem[];
  toolbarStart?: ReactNode;
  toolbarEnd?: ReactNode;
  typographySlot?: ReactNode;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const basicRef = useRef<HTMLDivElement>(null);
  const endSlotRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<Partial<Record<WritingBarGroupId, HTMLDivElement | null>>>({});
  const widthsRef = useRef<Partial<Record<WritingBarGroupId, number>>>({});
  const [visibleCount, setVisibleCount] = useState<number>(WRITING_COLLAPSIBLE_GROUPS.length);

  const measure = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    for (const id of WRITING_COLLAPSIBLE_GROUPS) {
      const node = groupRefs.current[id];
      if (node) widthsRef.current[id] = node.offsetWidth;
    }
    const fixed = (basicRef.current?.offsetWidth ?? 0) + (endSlotRef.current?.offsetWidth ?? 0) + ROW_SLACK;
    const next = fitWritingGroups({
      available: row.clientWidth,
      fixed,
      widths: WRITING_COLLAPSIBLE_GROUPS.map(id => widthsRef.current[id] ?? 0),
      overflowWidth: OVERFLOW_BUTTON_WIDTH,
    });
    setVisibleCount(current => (current === next ? current : next));
  }, []);

  useLayoutEffect(() => {
    measure();
  });

  useEffect(() => {
    const row = rowRef.current;
    if (!row || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => measure());
    observer.observe(row);
    if (basicRef.current) observer.observe(basicRef.current);
    return () => observer.disconnect();
  }, [measure]);

  const shown = new Set(WRITING_COLLAPSIBLE_GROUPS.slice(0, visibleCount));
  const hidden = WRITING_COLLAPSIBLE_GROUPS.slice(visibleCount);
  const overflowItems = pick(writingOverflowItemIds(hidden));
  const groupRef = (id: WritingBarGroupId) => (node: HTMLDivElement | null) => {
    groupRefs.current[id] = node;
  };

  return (
    <div ref={rowRef} className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5">
      <div ref={basicRef} className="flex shrink-0 flex-wrap items-center gap-0.5">
        {toolbarStart ? <div className="mr-1 flex shrink-0 items-center gap-1 border-r border-[var(--border-color)] pr-2">{toolbarStart}</div> : null}
        {pick(['undo', 'redo']).map(item => <IconButton key={item.id} item={item} neutral compact />)}
        <Separator />
        <ToolbarDropdown label="Estilo do parágrafo" triggerText={styleLabel} items={styleItems} neutral compact selectable />
        {typographySlot ? (
          <>
            <Separator />
            {typographySlot}
          </>
        ) : null}
        <Separator />
        {pick(['bold', 'italic', 'underline', 'strike']).map(item => <IconButton key={item.id} item={item} neutral compact />)}
        <EditorColorMenu editor={editor} kind="text" size="sm" neutral />
        <EditorColorMenu editor={editor} kind="highlight" size="sm" neutral />
      </div>

      {shown.has('insert') ? (
        <div ref={groupRef('insert')} className="flex shrink-0 items-center gap-0.5">
          <Separator />
          {pick(['link', 'comment']).map(item => <IconButton key={item.id} item={item} neutral compact />)}
        </div>
      ) : null}
      {shown.has('paragraph') ? (
        <div ref={groupRef('paragraph')} className="flex shrink-0 items-center gap-0.5">
          <Separator />
          <ToolbarDropdown label="Alinhamento" triggerIcon={alignIcon} items={alignItems} neutral compact selectable />
          {pick(['list', 'ordered', 'outdent', 'indent']).map(item => <IconButton key={item.id} item={item} neutral compact />)}
        </div>
      ) : null}
      {shown.has('tools') ? (
        <div ref={groupRef('tools')} className="flex shrink-0 items-center gap-0.5">
          <Separator />
          {pick(['rule', 'clear', 'find']).map(item => <IconButton key={item.id} item={item} neutral compact />)}
        </div>
      ) : null}

      <div className="ml-auto flex shrink-0 items-center gap-0.5 pl-1">
        {overflowItems.length > 0 ? (
          <ToolbarDropdown
            label="Mais ferramentas"
            triggerIcon={MoreHorizontal}
            hideChevron
            items={overflowItems}
            neutral
            compact
            align="right"
            minWidth="min-w-[240px]"
          />
        ) : null}
        <div ref={endSlotRef} className="flex shrink-0 items-center gap-0.5">{toolbarEnd}</div>
      </div>
    </div>
  );
}
