import {
  Children,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { BottomSheet } from '../overlays/BottomSheet';
import { OverlayBody } from '../overlays/OverlayBody';
import { OverlayHeader } from '../overlays/OverlayHeader';
import { usePointerCoarse } from '../../hooks/usePointerCoarse';
import { cn } from '../../lib/utils';
import { FLOATING_MENU_HIDDEN_STYLE, FLOATING_MENU_Z_INDEX, useAnchoredPosition } from './anchoredPosition';

export interface SelectMenuOption {
  value: string;
  label: string;
  disabled?: boolean;
}

function optionText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(optionText).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return optionText(node.props.children);
  return '';
}

/** Lê os `<option>` filhos (também dentro de fragmentos e listas) como opções da lista. */
export function selectOptionsFromChildren(children: ReactNode, into: SelectMenuOption[] = []): SelectMenuOption[] {
  Children.forEach(children, child => {
    if (!isValidElement<{ children?: ReactNode; value?: unknown; disabled?: boolean }>(child)) return;
    if (child.type === Fragment || child.type === 'optgroup') {
      selectOptionsFromChildren(child.props.children, into);
      return;
    }
    if (child.type !== 'option') return;
    const label = optionText(child.props.children);
    const value = child.props.value === undefined ? label : String(child.props.value);
    into.push({ value, label, disabled: Boolean(child.props.disabled) });
  });
  return into;
}

/** Evento no formato de `<select>` para quem só lê `event.target.value`. */
export function selectChangeEvent(value: string) {
  const target = { value } as HTMLSelectElement;
  return { target, currentTarget: target } as React.ChangeEvent<HTMLSelectElement>;
}

function firstEnabledIndex(options: readonly SelectMenuOption[], from: number, step: 1 | -1) {
  const total = options.length;
  for (let offset = 0; offset < total; offset += 1) {
    const index = (from + step * offset + total) % total;
    if (!options[index]?.disabled) return index;
  }
  return -1;
}

interface SelectMenuProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectMenuOption[];
  /** Conteúdo do botão (valor atual, ícone, seta). */
  children: ReactNode;
  id?: string;
  ariaLabel?: string;
  describedBy?: string;
  disabled?: boolean;
  triggerClassName?: string;
  /** Título da folha no celular; padrão: o aria-label ou o rótulo ligado ao campo. */
  sheetTitle?: string;
  /** "auto": folha no toque, lista flutuante com mouse. */
  presentation?: 'auto' | 'popover' | 'sheet';
}

/**
 * Escolha única com lista do design system (no lugar da lista nativa do navegador).
 * Com mouse: lista flutuante em portal, que abre para cima quando falta espaço embaixo.
 * No toque: folha de baixo com a opção atual marcada.
 */
export function SelectMenu({
  value,
  onChange,
  options,
  children,
  id,
  ariaLabel,
  describedBy,
  disabled = false,
  triggerClassName,
  sheetTitle,
  presentation = 'auto',
}: SelectMenuProps) {
  const touchPrimary = usePointerCoarse();
  const asSheet = presentation === 'sheet' || (presentation === 'auto' && touchPrimary);
  const generatedId = useId();
  const triggerId = id ?? `select-${generatedId}`;
  const listboxId = `${triggerId}-listbox`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typeaheadRef = useRef({ text: '', timer: 0 });
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [labelText, setLabelText] = useState<string | undefined>(undefined);

  const selectedIndex = options.findIndex(option => option.value === value);

  const openMenu = useCallback(
    (preferred?: 'first' | 'last') => {
      if (disabled || options.length === 0) return;
      const start =
        preferred === 'first'
          ? firstEnabledIndex(options, 0, 1)
          : preferred === 'last'
            ? firstEnabledIndex(options, options.length - 1, -1)
            : selectedIndex >= 0
              ? selectedIndex
              : firstEnabledIndex(options, 0, 1);
      setActiveIndex(start);
      setOpen(true);
    },
    [disabled, options, selectedIndex],
  );

  const closeMenu = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) {
      // Na folha, o próprio overlay devolve o foco ao botão.
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  const commit = useCallback(
    (index: number) => {
      const option = options[index];
      if (!option || option.disabled) return;
      if (option.value !== value) onChange(option.value);
      closeMenu(!asSheet);
    },
    [asSheet, closeMenu, onChange, options, value],
  );

  // Nome da folha: o <label for> do campo, quando não há aria-label.
  useEffect(() => {
    if (!open || !asSheet || ariaLabel || sheetTitle) return;
    const label = document.querySelector(`label[for="${CSS.escape(triggerId)}"]`);
    setLabelText(label?.textContent?.trim() || undefined);
  }, [ariaLabel, asSheet, open, sheetTitle, triggerId]);

  const position = useAnchoredPosition(open && !asSheet, triggerRef, listRef);

  useEffect(() => {
    if (!open || asSheet) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (listRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      closeMenu(false);
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [asSheet, closeMenu, open]);

  // Foco na lista ao abrir; a opção ativa fica visível.
  useEffect(() => {
    if (!open || asSheet || !position) return;
    listRef.current?.focus({ preventScroll: true });
  }, [asSheet, open, position]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const node = document.getElementById(`${listboxId}-${activeIndex}`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, listboxId, open, position]);

  const moveActive = (step: 1 | -1) => {
    setActiveIndex(current => {
      const from = current < 0 ? (step === 1 ? 0 : options.length - 1) : current + step;
      return firstEnabledIndex(options, from, step);
    });
  };

  const handleTypeahead = (key: string) => {
    const state = typeaheadRef.current;
    window.clearTimeout(state.timer);
    state.text += key.toLocaleLowerCase('pt-BR');
    state.timer = window.setTimeout(() => {
      state.text = '';
    }, 500);
    const start = activeIndex >= 0 ? activeIndex : 0;
    for (let offset = 0; offset < options.length; offset += 1) {
      const index = (start + offset + (state.text.length === 1 ? 1 : 0)) % options.length;
      const option = options[index];
      if (!option.disabled && option.label.toLocaleLowerCase('pt-BR').startsWith(state.text)) {
        return index;
      }
    }
    return -1;
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openMenu();
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      openMenu(event.key === 'Home' ? 'first' : 'last');
      return;
    }
    if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      // Como no select nativo: digitar com a lista fechada troca o valor direto.
      const index = handleTypeahead(event.key);
      if (index >= 0 && options[index].value !== value) onChange(options[index].value);
    }
  };

  const handleListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveActive(1);
        return;
      case 'ArrowUp':
        event.preventDefault();
        moveActive(-1);
        return;
      case 'Home':
        event.preventDefault();
        setActiveIndex(firstEnabledIndex(options, 0, 1));
        return;
      case 'End':
        event.preventDefault();
        setActiveIndex(firstEnabledIndex(options, options.length - 1, -1));
        return;
      case 'PageDown':
        event.preventDefault();
        setActiveIndex(current => firstEnabledIndex(options, Math.min(options.length - 1, Math.max(current, 0) + 8), -1));
        return;
      case 'PageUp':
        event.preventDefault();
        setActiveIndex(current => firstEnabledIndex(options, Math.max(0, current - 8), 1));
        return;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (activeIndex >= 0) commit(activeIndex);
        return;
      case 'Escape':
        event.preventDefault();
        // Não deixa o Esc fechar também a folha ou o modal onde o campo está.
        event.stopPropagation();
        closeMenu();
        return;
      case 'Tab':
        event.preventDefault();
        closeMenu();
        return;
      default:
        if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
          const index = handleTypeahead(event.key);
          if (index >= 0) setActiveIndex(index);
        }
    }
  };

  const optionClass = (index: number, selected: boolean, optionDisabled?: boolean) =>
    cn(
      'flex w-full items-center justify-between gap-3 px-3 text-left text-sm text-[var(--text-primary)] transition-colors',
      asSheet ? 'min-h-11 rounded-[var(--radius-input)] py-2' : 'min-h-9 py-2',
      index === activeIndex && !asSheet && 'bg-[var(--bg-hover)]',
      selected && 'font-semibold',
      optionDisabled ? 'cursor-not-allowed text-[var(--text-tertiary)]' : 'cursor-pointer hover:bg-[var(--bg-hover)]',
    );

  const sheetLabel = sheetTitle ?? ariaLabel ?? labelText ?? 'Escolher opção';

  return (
    <>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => (open ? closeMenu(false) : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        className={cn('text-left focus-visible:outline-none disabled:cursor-not-allowed', triggerClassName)}
      >
        {children}
      </button>

      {open && !asSheet && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={listRef}
              id={listboxId}
              role="listbox"
              tabIndex={-1}
              aria-label={ariaLabel}
              aria-labelledby={ariaLabel ? undefined : triggerId}
              aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
              data-placement={position?.placement}
              onKeyDown={handleListKeyDown}
              className={cn(
                'fixed overflow-y-auto overscroll-contain rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] py-1 shadow-[var(--shadow-dropdown)] focus:outline-none',
                FLOATING_MENU_Z_INDEX,
              )}
              // Primeiro quadro fora da tela (para medir); depois, na posição calculada.
              style={position?.style ?? FLOATING_MENU_HIDDEN_STYLE}
            >
              {options.map((option, index) => {
                const selected = option.value === value;
                return (
                  <div
                    key={option.value}
                    id={`${listboxId}-${index}`}
                    role="option"
                    aria-selected={selected}
                    aria-disabled={option.disabled || undefined}
                    onPointerMove={() => {
                      if (!option.disabled && activeIndex !== index) setActiveIndex(index);
                    }}
                    onClick={() => commit(index)}
                    className={optionClass(index, selected, option.disabled)}
                  >
                    <span className="truncate">{option.label}</span>
                    {selected ? <Check className="h-4 w-4 shrink-0 text-[var(--text-primary)]" aria-hidden /> : null}
                  </div>
                );
              })}
            </div>,
            document.body,
          )
        : null}

      {asSheet ? (
        <BottomSheet open={open} onClose={() => setOpen(false)} desktopMaxW="max-w-md" zIndex={FLOATING_MENU_Z_INDEX} ariaLabel={sheetLabel}>
          <OverlayHeader title={sheetLabel} onClose={() => setOpen(false)} />
          <OverlayBody className="px-2 py-2 pb-safe">
            <div role="listbox" id={listboxId} aria-label={sheetLabel} className="stack-xs">
              {options.map((option, index) => {
                const selected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={option.disabled}
                    onClick={() => commit(index)}
                    className={cn(
                      optionClass(index, selected, option.disabled),
                      selected && 'bg-[var(--bg-hover)]',
                      'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {selected ? <Check className="h-4 w-4 shrink-0 text-[var(--text-primary)]" aria-hidden /> : null}
                  </button>
                );
              })}
            </div>
          </OverlayBody>
        </BottomSheet>
      ) : null}
    </>
  );
}
