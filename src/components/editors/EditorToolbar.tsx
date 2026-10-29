import {
  useCallback, useEffect, useId, useLayoutEffect, useRef, useState,
  type CSSProperties, type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode, type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { useEditorState, type Editor } from '@tiptap/react';
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Check, ChevronDown,
  Heading1, Heading2, IndentDecrease, IndentIncrease, Italic, Link as LinkIcon,
  List, ListOrdered, MessageSquarePlus, Minus, Pilcrow, Quote,
  Redo, RemoveFormatting, Search, Strikethrough, Underline as UnderlineIcon, Undo,
  WrapText,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { EditorColorMenu } from './EditorColorMenu';
import { clearFormatting } from './editorExtensions';
import {
  fitWritingGroups, WRITING_COLLAPSIBLE_GROUPS, WRITING_FORMAT_MENU_IDS, writingOverflowItemIds,
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
  /** Distingue uma ação de uma opção que liga/desliga uma formatação. */
  kind?: 'action' | 'toggle';
};

export type ToolbarMenuItem = Omit<ToolbarItem, 'icon'> & {
  icon?: Icon;
  style?: CSSProperties;
};

const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const VIEWPORT_PADDING = 8;
const MENU_GAP = 6;
const ROW_SLACK = 12;
const DROPDOWN_OPEN_EVENT = 'skald:editor-toolbar-dropdown-open';

/** Soma as larguras dos controles sem depender de quantas linhas a barra ocupa. */
function unwrappedControlsWidth(node: HTMLDivElement | null) {
  if (!node) return 0;
  const style = getComputedStyle(node);
  const controls = [...node.children].filter((child): child is HTMLElement =>
    child instanceof HTMLElement && getComputedStyle(child).display !== 'none',
  );
  const gap = parseFloat(style.columnGap) || 0;
  const width = controls.reduce((total, child) => {
    const childStyle = getComputedStyle(child);
    return total + child.getBoundingClientRect().width
      + (parseFloat(childStyle.marginLeft) || 0) + (parseFloat(childStyle.marginRight) || 0);
  }, 0) + Math.max(0, controls.length - 1) * gap;
  return Math.max(width, node.getBoundingClientRect().width);
}

function controlClass(active: boolean, neutral: boolean) {
  if (active) return neutral
    ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
    : 'bg-[color-mix(in_srgb,var(--accent-blue),transparent_92%)] text-[var(--accent-blue)]';
  return neutral
    ? 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]';
}

function Separator() {
  return <div className="mx-1.5 h-5 w-px shrink-0 bg-[var(--border-color)]" aria-hidden="true" />;
}

function IconButton({ item, neutral, compact = false }: {
  item: ToolbarItem; neutral: boolean; compact?: boolean;
}) {
  const ItemIcon = item.icon;
  const title = item.shortcut ? `${item.label} (${item.shortcut})` : item.label;
  return <button type="button" onMouseDown={event => event.preventDefault()}
    onClick={() => { if (!item.disabled) item.run(); }} disabled={item.disabled}
    aria-label={title} aria-pressed={item.active ?? undefined} title={title}
    className={cn(
      'flex shrink-0 items-center justify-center rounded-[var(--radius-input)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-40',
      compact ? 'h-8 w-8' : 'h-9 w-9', controlClass(!!item.active, neutral),
    )}><ItemIcon className="h-4 w-4" aria-hidden="true" /></button>;
}

export function ToolbarTextButton({
  label, icon: ButtonIcon, onClick, active = false, neutral = true, title, disabled = false,
}: {
  label: string; icon?: Icon; onClick: () => void; active?: boolean;
  neutral?: boolean; title?: string; disabled?: boolean;
}) {
  return <button type="button" onMouseDown={event => event.preventDefault()}
    onClick={onClick} disabled={disabled} aria-pressed={active} title={title ?? label}
    className={cn(
      'flex h-8 shrink-0 items-center gap-1 rounded-[var(--radius-input)] px-2 text-xs font-medium transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-40',
      controlClass(active, neutral),
    )}>
    {ButtonIcon ? <ButtonIcon className="h-4 w-4" aria-hidden="true" /> : null}
    <span>{label}</span>
  </button>;
}

type MenuPosition = { left: number; top: number; width: number; maxHeight: number };

/** Coordenadas de viewport para um menu renderizado fora dos contêineres com overflow. */
function useMenuPosition(
  open: boolean, triggerRef: RefObject<HTMLButtonElement | null>,
  menuRef: RefObject<HTMLDivElement | null>, align: 'left' | 'right', onHidden: () => void,
) {
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const closeRef = useRef(onHidden);
  closeRef.current = onHidden;

  useClientLayoutEffect(() => {
    if (!open) { setPosition(null); return; }
    let frame = 0;
    let naturalWidth = 0;
    const update = () => {
      frame = 0;
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;
      const triggerStyle = getComputedStyle(trigger);
      if (!trigger.isConnected || triggerStyle.visibility === 'hidden' || triggerStyle.display === 'none') {
        closeRef.current(); return;
      }
      const viewport = window.visualViewport;
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportWidth = viewport?.width ?? window.innerWidth;
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const rect = trigger.getBoundingClientRect();
      if (rect.bottom < viewportTop || rect.top > viewportTop + viewportHeight
        || rect.right < viewportLeft || rect.left > viewportLeft + viewportWidth) {
        closeRef.current(); return;
      }
      const availableWidth = Math.max(1, viewportWidth - VIEWPORT_PADDING * 2);
      naturalWidth = Math.max(naturalWidth, menu.getBoundingClientRect().width, menu.scrollWidth, rect.width);
      const width = Math.min(naturalWidth, availableWidth);
      const below = Math.max(0, viewportTop + viewportHeight - VIEWPORT_PADDING - rect.bottom - MENU_GAP);
      const above = Math.max(0, rect.top - MENU_GAP - viewportTop - VIEWPORT_PADDING);
      const naturalHeight = menu.scrollHeight + Math.max(0, menu.offsetHeight - menu.clientHeight);
      const useBelow = below >= Math.min(naturalHeight, 240) || below >= above;
      const maxHeight = Math.max(1, Math.min(viewportHeight * 0.7, useBelow ? below : above));
      const height = Math.min(naturalHeight, maxHeight);
      const idealLeft = align === 'right' ? rect.right - width : rect.left;
      const left = Math.max(viewportLeft + VIEWPORT_PADDING,
        Math.min(idealLeft, viewportLeft + viewportWidth - width - VIEWPORT_PADDING));
      const top = Math.max(viewportTop + VIEWPORT_PADDING,
        useBelow ? rect.bottom + MENU_GAP : rect.top - MENU_GAP - height);
      const next = { left: Math.round(left), top: Math.round(top), width: Math.round(width), maxHeight: Math.floor(maxHeight) };
      setPosition(previous => previous && Object.keys(next).every(key =>
        previous[key as keyof MenuPosition] === next[key as keyof MenuPosition],
      ) ? previous : next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    if (triggerRef.current) observer?.observe(triggerRef.current);
    if (menuRef.current) observer?.observe(menuRef.current);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    document.fonts?.addEventListener('loadingdone', schedule);
    return () => {
      cancelAnimationFrame(frame); observer?.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
      document.fonts?.removeEventListener('loadingdone', schedule);
    };
  }, [align, menuRef, open, triggerRef]);
  return position;
}

function normalizedLabel(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
}

/**
 * A abertura por mouse preserva o foco no editor. Pelo teclado, o foco entra no menu.
 * Menus usam portal, acompanham rolagem e fecham ao pressionar Escape ou tocar fora.
 */
export function ToolbarDropdown({
  label, triggerIcon: TriggerIcon, triggerText, triggerStyle, triggerClassName,
  hideChevron = false, items, neutral, align = 'left', footer,
  minWidth = 'min-w-[200px]', compact = false, selectable = false, onOpen, disabled = false,
}: {
  label: string; triggerIcon?: Icon; triggerText?: string; triggerStyle?: CSSProperties;
  triggerClassName?: string; hideChevron?: boolean; items: ToolbarMenuItem[];
  neutral: boolean; align?: 'left' | 'right'; footer?: ReactNode; minWidth?: string;
  compact?: boolean; selectable?: boolean; onOpen?: () => void;
  /** Também fecha o menu quando o seu grupo sai da barra. */
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());
  const keyboardOpenRef = useRef(false);
  const searchRef = useRef({ text: '', at: 0 });
  const menuId = useId();
  const triggerId = useId();
  const close = useCallback(() => { setOpen(false); setActiveId(null); }, []);
  const closeAndReturn = useCallback(() => {
    close(); triggerRef.current?.focus({ preventScroll: true });
  }, [close]);
  const position = useMenuPosition(open, triggerRef, menuRef, align, close);
  const activeIndex = items.findIndex(item => item.id === activeId);

  const enabledIndex = (from: number, step: 1 | -1) => {
    const length = items.length;
    for (let offset = 0; offset < length; offset += 1) {
      const index = ((from + step * offset) % length + length) % length;
      if (!items[index].disabled) return index;
    }
    return -1;
  };
  const activate = (index: number) => setActiveId(index >= 0 ? items[index].id : null);
  const announceOpen = () => document.dispatchEvent(new CustomEvent(DROPDOWN_OPEN_EVENT, { detail: menuId }));
  const openMenu = (keyboard: boolean, last = false) => {
    if (disabled) return;
    if (!open) { announceOpen(); onOpen?.(); }
    keyboardOpenRef.current = keyboard;
    setOpen(true);
    // Enter/Espaço/↓ iniciam na primeira opção; ↑ inicia na última.
    activate(keyboard ? enabledIndex(last ? items.length - 1 : 0, last ? -1 : 1) : -1);
  };

  useEffect(() => { if (disabled) close(); }, [close, disabled]);
  useEffect(() => {
    if (!open) return;
    const onOutside = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && !triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) close();
    };
    const onFocus = (event: FocusEvent) => {
      if (!keyboardOpenRef.current) return;
      const target = event.target as Node | null;
      if (target && !triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing) return;
      // Captura antes do handler de Escape da tela expandida do editor.
      event.preventDefault(); event.stopPropagation(); closeAndReturn();
    };
    const onOtherMenu = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== menuId) close();
    };
    document.addEventListener('pointerdown', onOutside, true);
    document.addEventListener('focusin', onFocus);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener(DROPDOWN_OPEN_EVENT, onOtherMenu);
    return () => {
      document.removeEventListener('pointerdown', onOutside, true);
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener(DROPDOWN_OPEN_EVENT, onOtherMenu);
    };
  }, [close, closeAndReturn, menuId, open]);

  useEffect(() => {
    if (!open || !keyboardOpenRef.current || !position) return;
    if (activeId && itemRefs.current.get(activeId) && !items.find(item => item.id === activeId)?.disabled) {
      itemRefs.current.get(activeId)?.focus({ preventScroll: false });
      return;
    }
    const first = items.find(item => !item.disabled);
    if (first) setActiveId(first.id); else menuRef.current?.focus({ preventScroll: true });
  }, [activeId, items, open, position]);

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); event.stopPropagation(); openMenu(true);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault(); event.stopPropagation(); openMenu(true, true);
    }
  };
  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.nativeEvent.isComposing) return;
    const target = event.target as HTMLElement;
    // Campos eventualmente fornecidos em footer mantêm sua própria navegação.
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
    const go = (index: number) => {
      event.preventDefault(); event.stopPropagation(); keyboardOpenRef.current = true; activate(index);
    };
    switch (event.key) {
      case 'ArrowDown': go(enabledIndex(activeIndex + 1, 1)); return;
      case 'ArrowUp': go(enabledIndex(activeIndex < 0 ? items.length - 1 : activeIndex - 1, -1)); return;
      case 'Home': go(enabledIndex(0, 1)); return;
      case 'End': go(enabledIndex(items.length - 1, -1)); return;
      case 'Tab':
        // Reposiciona o ponto de partida antes de o navegador processar Tab/Shift+Tab.
        triggerRef.current?.focus({ preventScroll: true }); close(); return;
      case 'Enter':
      case ' ':
        if (activeId) {
          event.preventDefault(); event.stopPropagation(); itemRefs.current.get(activeId)?.click();
        }
        return;
      default:
        if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
        const now = Date.now();
        const typed = normalizedLabel(event.key);
        const prior = now - searchRef.current.at < 700 ? searchRef.current.text : '';
        const repeated = prior && [...prior].every(character => character === typed);
        const search = repeated ? typed : prior + typed;
        searchRef.current = { text: search, at: now };
        for (let offset = 1; offset <= items.length; offset += 1) {
          const index = (Math.max(-1, activeIndex) + offset) % items.length;
          if (!items[index].disabled && normalizedLabel(items[index].label).startsWith(search)) {
            go(index); return;
          }
        }
    }
  };

  const menu = open && typeof document !== 'undefined' ? createPortal(
    <div ref={menuRef} id={menuId} role="menu" aria-labelledby={triggerId} tabIndex={-1}
      onKeyDown={handleMenuKeyDown} data-editor-toolbar-menu="true"
      style={{
        position: 'fixed', visibility: position ? 'visible' : 'hidden',
        left: position?.left ?? 0, top: position?.top ?? 0,
        width: position?.width, minWidth: position ? 0 : undefined,
        maxWidth: 'calc(100vw - 16px)', maxHeight: position?.maxHeight ?? '70dvh',
      }}
      className={cn('z-[240] overflow-auto rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-2 shadow-[var(--shadow-dropdown)] outline-none md:rounded-[var(--radius-card)]', minWidth)}>
      {items.map(item => {
        const ItemIcon = item.icon;
        const checkedItem = selectable || item.kind === 'toggle';
        return <button key={item.id} ref={node => {
          if (node) itemRefs.current.set(item.id, node); else itemRefs.current.delete(item.id);
        }} type="button" role={selectable ? 'menuitemradio' : item.kind === 'toggle' ? 'menuitemcheckbox' : 'menuitem'}
          aria-checked={checkedItem ? !!item.active : undefined}
          tabIndex={item.id === activeId ? 0 : -1} disabled={item.disabled}
          title={item.shortcut ? `${item.label} (${item.shortcut})` : undefined}
          onMouseDown={event => event.preventDefault()}
          onFocus={() => { if (keyboardOpenRef.current) setActiveId(item.id); }}
          onClick={() => {
            if (item.disabled) return;
            const restore = keyboardOpenRef.current && menuRef.current?.contains(document.activeElement);
            close();
            if (restore) triggerRef.current?.focus({ preventScroll: true });
            item.run();
          }}
          className={cn('flex w-full items-center gap-3 rounded-[var(--radius-input)] px-3 py-2 text-left text-sm text-[var(--text-primary)] transition focus-visible:outline-none focus-visible:bg-[var(--bg-hover)] disabled:opacity-40',
            item.active ? 'bg-[var(--bg-hover)] font-semibold' : 'hover:bg-[var(--bg-hover)]')}>
          {ItemIcon ? <ItemIcon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
          <span className="min-w-0 flex-1 break-words" style={item.style}>{item.label}</span>
          {item.shortcut ? <span className="shrink-0 text-xs font-normal text-[var(--text-secondary)]">{item.shortcut}</span> : null}
          {item.active ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
        </button>;
      })}
      {!items.length && !footer ? <p className="px-3 py-2 text-sm text-[var(--text-secondary)]">Nenhuma opção disponível</p> : null}
      {footer}
    </div>, document.body,
  ) : null;

  return <div className="relative shrink-0">
    <button ref={triggerRef} id={triggerId} type="button" disabled={disabled}
      onMouseDown={event => event.preventDefault()}
      onClick={event => {
        if (open) { close(); return; }
        openMenu(event.detail === 0);
      }} onKeyDown={handleTriggerKeyDown}
      aria-label={label} title={label} aria-haspopup="menu" aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      className={cn('flex items-center gap-1 rounded-[var(--radius-input)] px-2 text-xs font-medium transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-40',
        compact ? 'h-8' : 'h-9', controlClass(open, neutral), triggerClassName)}>
      {TriggerIcon ? <TriggerIcon className="h-4 w-4" aria-hidden="true" /> : null}
      {triggerText ? <span className="max-w-[7rem] truncate" style={triggerStyle}>{triggerText}</span> : null}
      {hideChevron ? null : <ChevronDown aria-hidden="true" className={cn('h-3.5 w-3.5 opacity-70 transition-transform', open && 'rotate-180')} />}
    </button>
    {menu}
  </div>;
}

function setBlockStyle(editor: Editor, style: 'paragraph' | 'h1' | 'h2' | 'quote') {
  if (editor.isDestroyed || !editor.isEditable) return;
  let chain = editor.chain().focus();
  const inQuote = editor.isActive('blockquote');
  if (style === 'quote') {
    chain = chain.setParagraph();
    if (!inQuote) chain = chain.setBlockquote();
    chain.run(); return;
  }
  if (inQuote) chain = chain.unsetBlockquote();
  if (style === 'paragraph') chain.setParagraph().run();
  else chain.setHeading({ level: style === 'h1' ? 1 : 2 }).run();
}

export interface EditorToolbarProps {
  editor: Editor;
  mode: 'full' | 'writing';
  toolbarStart?: ReactNode;
  toolbarEnd?: ReactNode;
  typographySlot?: ReactNode;
  onComment?: () => void;
  onFind: (mode: 'find' | 'replace') => void;
  onLink: () => void;
  onRepairLineBreaks?: () => void;
  canRepairLineBreaks?: boolean;
}

export function EditorToolbar({
  editor, mode, toolbarStart, toolbarEnd, typographySlot, onComment, onFind, onLink,
  onRepairLineBreaks, canRepairLineBreaks = false,
}: EditorToolbarProps) {
  const state = useEditorState({ editor, selector: ({ editor: current }) => ({
    editable: current.isEditable && !current.isDestroyed,
    bold: current.isActive('bold'), italic: current.isActive('italic'),
    underline: current.isActive('underline'), strike: current.isActive('strike'), link: current.isActive('link'),
    h1: current.isActive('heading', { level: 1 }), h2: current.isActive('heading', { level: 2 }),
    quote: current.isActive('blockquote'), bullet: current.isActive('bulletList'), ordered: current.isActive('orderedList'),
    align: (['center', 'right', 'justify'] as const).find(value => current.isActive({ textAlign: value })) ?? ('left' as const),
    canUndo: current.can().undo(), canRedo: current.can().redo(),
    canSink: current.can().sinkListItem('listItem'), canLift: current.can().liftListItem('listItem'),
    hasSelection: !current.state.selection.empty && !!current.state.doc.textBetween(current.state.selection.from, current.state.selection.to, ' ').trim(),
    // Mantém os indicadores de cor reativos mesmo se o menu de cores depender do render do pai.
    textColor: (current.getAttributes('textStyle').color as string | undefined) ?? null,
    highlightColor: (current.getAttributes('highlight').color as string | undefined) ?? null,
  }) });
  const chain = () => editor.chain().focus();
  const selectedStyle = state.quote ? 'quote' : state.h1 ? 'h1' : state.h2 ? 'h2' : 'paragraph';
  const styleLabel = { paragraph: 'Texto normal', h1: 'Título 1', h2: 'Título 2', quote: 'Citação' }[selectedStyle];
  const alignIcon = { left: AlignLeft, center: AlignCenter, right: AlignRight, justify: AlignJustify }[state.align];
  const disabled = !state.editable;
  const catalog: Record<string, ToolbarItem> = {
    undo: { id: 'undo', label: 'Desfazer', icon: Undo, shortcut: 'Ctrl+Z', run: () => chain().undo().run(), disabled: disabled || !state.canUndo },
    redo: { id: 'redo', label: 'Refazer', icon: Redo, shortcut: 'Ctrl+Shift+Z', run: () => chain().redo().run(), disabled: disabled || !state.canRedo },
    paragraph: { id: 'paragraph', label: 'Texto normal', icon: Pilcrow, shortcut: 'Ctrl+Alt+0', run: () => setBlockStyle(editor, 'paragraph'), active: selectedStyle === 'paragraph', disabled },
    h1: { id: 'h1', label: 'Título 1', icon: Heading1, shortcut: 'Ctrl+Alt+1', run: () => setBlockStyle(editor, 'h1'), active: selectedStyle === 'h1', disabled },
    h2: { id: 'h2', label: 'Título 2', icon: Heading2, shortcut: 'Ctrl+Alt+2', run: () => setBlockStyle(editor, 'h2'), active: selectedStyle === 'h2', disabled },
    quote: { id: 'quote', label: 'Citação', icon: Quote, shortcut: 'Ctrl+Shift+B', run: () => setBlockStyle(editor, 'quote'), active: selectedStyle === 'quote', disabled },
    bold: { id: 'bold', label: 'Negrito', icon: Bold, shortcut: 'Ctrl+B', run: () => chain().toggleBold().run(), active: state.bold, kind: 'toggle', disabled },
    italic: { id: 'italic', label: 'Itálico', icon: Italic, shortcut: 'Ctrl+I', run: () => chain().toggleItalic().run(), active: state.italic, kind: 'toggle', disabled },
    underline: { id: 'underline', label: 'Sublinhado', icon: UnderlineIcon, shortcut: 'Ctrl+U', run: () => chain().toggleUnderline().run(), active: state.underline, kind: 'toggle', disabled },
    strike: { id: 'strike', label: 'Tachado', icon: Strikethrough, shortcut: 'Ctrl+Shift+S', run: () => chain().toggleStrike().run(), active: state.strike, kind: 'toggle', disabled },
    link: { id: 'link', label: 'Link', icon: LinkIcon, shortcut: 'Ctrl+K', run: onLink, active: state.link, kind: 'action', disabled },
    comment: { id: 'comment', label: 'Comentar', icon: MessageSquarePlus, shortcut: 'Ctrl+Alt+M', run: () => onComment?.(), disabled: !onComment || !state.hasSelection },
    'align-left': { id: 'align-left', label: 'Alinhar à esquerda', icon: AlignLeft, shortcut: 'Ctrl+Shift+L', run: () => chain().setTextAlign('left').run(), active: state.align === 'left', disabled },
    'align-center': { id: 'align-center', label: 'Centralizar', icon: AlignCenter, shortcut: 'Ctrl+Shift+E', run: () => chain().setTextAlign('center').run(), active: state.align === 'center', disabled },
    'align-right': { id: 'align-right', label: 'Alinhar à direita', icon: AlignRight, shortcut: 'Ctrl+Shift+R', run: () => chain().setTextAlign('right').run(), active: state.align === 'right', disabled },
    'align-justify': { id: 'align-justify', label: 'Justificar', icon: AlignJustify, shortcut: 'Ctrl+Shift+J', run: () => chain().setTextAlign('justify').run(), active: state.align === 'justify', disabled },
    list: { id: 'list', label: 'Lista', icon: List, shortcut: 'Ctrl+Shift+8', run: () => chain().toggleBulletList().run(), active: state.bullet, kind: 'toggle', disabled },
    ordered: { id: 'ordered', label: 'Lista numerada', icon: ListOrdered, shortcut: 'Ctrl+Shift+7', run: () => chain().toggleOrderedList().run(), active: state.ordered, kind: 'toggle', disabled },
    indent: { id: 'indent', label: 'Aumentar recuo da lista', icon: IndentIncrease, shortcut: 'Tab', run: () => chain().sinkListItem('listItem').run(), disabled: disabled || !state.canSink },
    outdent: { id: 'outdent', label: 'Diminuir recuo da lista', icon: IndentDecrease, shortcut: 'Shift+Tab', run: () => chain().liftListItem('listItem').run(), disabled: disabled || !state.canLift },
    rule: { id: 'rule', label: 'Linha divisória', icon: Minus, run: () => chain().setHorizontalRule().run(), disabled },
    clear: { id: 'clear', label: 'Limpar formatação', icon: RemoveFormatting, shortcut: 'Ctrl+\\', run: () => clearFormatting(editor), disabled },
    repair: {
      id: 'repair',
      label: 'Reparar quebras de linha',
      icon: WrapText,
      run: () => onRepairLineBreaks?.(),
      disabled: disabled || !canRepairLineBreaks || !onRepairLineBreaks,
    },
    find: { id: 'find', label: 'Buscar no texto', icon: Search, shortcut: 'Ctrl+F', run: () => onFind('find') },
  };
  if (!onComment) delete catalog.comment;
  if (!onRepairLineBreaks) delete catalog.repair;
  const pick = (ids: readonly string[]) => ids.flatMap(id => catalog[id] ? [catalog[id]] : []);
  const styleItems = pick(['paragraph', 'h1', 'h2', 'quote']);
  const alignItems = pick(['align-left', 'align-center', 'align-right', 'align-justify']);

  if (mode === 'writing') return <WritingToolbar editor={editor} pick={pick}
    styleLabel={styleLabel} styleItems={styleItems}
    toolbarStart={toolbarStart} toolbarEnd={toolbarEnd} typographySlot={typographySlot} editable={state.editable} />;

  return <div role="group" aria-label="Formatação do texto" className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5">
    {toolbarStart ? <div className="mr-1 flex shrink-0 items-center gap-1 border-r border-[var(--border-color)] pr-2">{toolbarStart}</div> : null}
    {pick(['undo', 'redo']).map(item => <IconButton key={item.id} item={item} neutral={false} />)}
    <Separator />
    <ToolbarDropdown label="Estilo do parágrafo" triggerText={styleLabel} items={styleItems} neutral={false} selectable disabled={disabled} />
    {typographySlot ? <><Separator />{typographySlot}</> : null}
    <Separator />
    {pick(['bold', 'italic', 'underline']).map(item => <IconButton key={item.id} item={item} neutral={false} />)}
    <fieldset disabled={disabled} className="flex min-w-0 items-center gap-0.5 border-0 p-0">
      <legend className="sr-only">Cor e destaque</legend>
      <EditorColorMenu editor={editor} kind="text" /><EditorColorMenu editor={editor} kind="highlight" />
    </fieldset>
    <Separator />
    {pick(['link', 'comment']).map(item => <IconButton key={item.id} item={item} neutral={false} />)}
    <Separator />
    <ToolbarDropdown label="Alinhamento" triggerIcon={alignIcon} items={alignItems} neutral={false} selectable disabled={disabled} />
    <Separator />
    {pick(['list', 'ordered', 'outdent', 'indent']).map(item => <IconButton key={item.id} item={item} neutral={false} />)}
    <Separator /><IconButton item={catalog.clear} neutral={false} />
    <div className="ml-auto flex shrink-0 items-center gap-0.5 pl-1">
      {toolbarEnd}<ToolbarDropdown label="Mais opções" triggerText="Mais" items={pick(['strike', 'rule', 'repair', 'find'])} neutral={false} align="right" />
    </div>
  </div>;
}

/** Barra Escrita: Inserir · histórico · estilo · B I link · Formatar · ponta direita. */
function WritingToolbar({
  editor, pick, styleLabel, styleItems,
  toolbarStart, toolbarEnd, typographySlot, editable,
}: {
  editor: Editor; pick: (ids: readonly string[]) => ToolbarItem[]; styleLabel: string;
  styleItems: ToolbarItem[];
  toolbarStart?: ReactNode; toolbarEnd?: ReactNode; typographySlot?: ReactNode; editable: boolean;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const basicRef = useRef<HTMLDivElement>(null);
  const endSlotRef = useRef<HTMLDivElement>(null);
  const formatRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<Partial<Record<WritingBarGroupId, HTMLDivElement | null>>>({});
  const [visibleCount, setVisibleCount] = useState<number>(WRITING_COLLAPSIBLE_GROUPS.length);
  const measure = useCallback(() => {
    const row = rowRef.current;
    if (!row || row.clientWidth <= 0) return;
    const fixed = unwrappedControlsWidth(basicRef.current)
      + (formatRef.current?.getBoundingClientRect().width ?? 0)
      + (endSlotRef.current?.getBoundingClientRect().width ?? 0) + ROW_SLACK;
    const next = fitWritingGroups({
      available: row.clientWidth, fixed,
      widths: WRITING_COLLAPSIBLE_GROUPS.map(id => groupRefs.current[id]?.getBoundingClientRect().width ?? 0),
      overflowWidth: 0,
    });
    const count = Number.isFinite(next) ? Math.max(0, Math.min(WRITING_COLLAPSIBLE_GROUPS.length, Math.trunc(next))) : 0;
    setVisibleCount(current => current === count ? current : count);
  }, []);

  useClientLayoutEffect(() => { measure(); }, [measure]);
  useEffect(() => {
    let frame = 0;
    const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; measure(); }); };
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    for (const node of [rowRef.current, basicRef.current, endSlotRef.current, formatRef.current,
      ...Array.from(basicRef.current?.children ?? []),
      ...WRITING_COLLAPSIBLE_GROUPS.map(id => groupRefs.current[id])]) {
      if (node) observer?.observe(node);
    }
    window.addEventListener('resize', schedule);
    document.fonts?.addEventListener('loadingdone', schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame); observer?.disconnect();
      window.removeEventListener('resize', schedule);
      document.fonts?.removeEventListener('loadingdone', schedule);
    };
  }, [measure]);

  const shown = new Set(WRITING_COLLAPSIBLE_GROUPS.slice(0, visibleCount));
  const hidden = WRITING_COLLAPSIBLE_GROUPS.slice(visibleCount);
  const formatItems = [
    ...pick(writingOverflowItemIds(hidden)),
    ...pick([...WRITING_FORMAT_MENU_IDS].filter(id => id !== 'text-color' && id !== 'highlight')),
  ];
  const groupClass = (visible: boolean) => cn(
    'flex w-max shrink-0 items-center gap-0.5',
    !visible && 'pointer-events-none invisible absolute left-0 top-0',
  );
  const renderIcons = (ids: readonly string[]) => pick(ids).map(item => (
    <IconButton key={item.id} item={item} neutral compact />
  ));

  const formatFooter = (
    <div className="mt-1 flex flex-col gap-2 border-t border-[var(--border-color)] pt-2">
      {typographySlot ? (
        <div className="px-1" onMouseDown={event => event.preventDefault()}>
          {typographySlot}
        </div>
      ) : null}
      <fieldset
        disabled={!editable}
        className="flex items-center gap-1 border-0 px-1"
        onMouseDown={event => event.preventDefault()}
      >
        <legend className="sr-only">Cor e destaque</legend>
        <EditorColorMenu editor={editor} kind="text" size="sm" neutral />
        <EditorColorMenu editor={editor} kind="highlight" size="sm" neutral />
      </fieldset>
    </div>
  );

  return (
    <div
      ref={rowRef}
      role="group"
      aria-label="Formatação do texto"
      className="relative flex min-w-0 flex-1 flex-wrap items-center gap-0.5 overflow-visible"
    >
      <div ref={basicRef} className="flex min-w-0 flex-wrap items-center gap-0.5 overflow-visible [&>*]:shrink-0">
        {toolbarStart ? <div className="flex shrink-0 items-center">{toolbarStart}</div> : null}
        <Separator />
        {renderIcons(['undo', 'redo'])}
      </div>
      <div
        ref={node => { groupRefs.current.style = node; }}
        aria-hidden={!shown.has('style')}
        className={groupClass(shown.has('style'))}
      >
        <Separator />
        <ToolbarDropdown
          label="Estilo do parágrafo"
          triggerText={styleLabel}
          items={styleItems}
          neutral
          compact
          selectable
          disabled={!editable || !shown.has('style')}
        />
      </div>
      <div
        ref={node => { groupRefs.current.marks = node; }}
        aria-hidden={!shown.has('marks')}
        className={groupClass(shown.has('marks'))}
      >
        <Separator />
        {renderIcons(['bold', 'italic', 'link'])}
      </div>
      <div ref={formatRef} className="flex w-max shrink-0 items-center gap-0.5">
        <Separator />
        <ToolbarDropdown
          label="Formatar"
          triggerText="Formatar"
          items={formatItems}
          footer={formatFooter}
          neutral
          compact
          disabled={!editable}
          minWidth="min-w-[15rem]"
        />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-0.5 pl-1">
        <div ref={endSlotRef} className="flex shrink-0 items-center gap-0.5">{toolbarEnd}</div>
      </div>
    </div>
  );
}
