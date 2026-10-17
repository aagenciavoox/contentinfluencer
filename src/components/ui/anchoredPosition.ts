import { useCallback, useEffect, useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';

/**
 * Posição de listas e menus flutuantes presos a um botão (SelectMenu, TagSelect, MoreMenu,
 * CreateMenuButton). A lista vai num portal no body, então nenhum `overflow` a corta.
 */

/** Acima da barra do editor (z-[80]), das folhas (z-[110]) e junto do EditorColorMenu (z-[140]). */
export const FLOATING_MENU_Z_INDEX = 'z-[140]';
/** Primeiro quadro: fora da tela e invisível, só para medir. */
export const FLOATING_MENU_HIDDEN_STYLE: CSSProperties = { top: -9999, left: -9999, visibility: 'hidden' };

const VIEWPORT_MARGIN = 8;
const TRIGGER_GAP = 4;
const MENU_MAX_HEIGHT = 320;
const MENU_MIN_HEIGHT = 120;

export type MenuPosition = {
  placement: 'bottom' | 'top';
  style: CSSProperties;
};

export function viewportSize() {
  const visual = typeof window !== 'undefined' ? window.visualViewport : null;
  return {
    width: visual?.width ?? window.innerWidth,
    height: visual?.height ?? window.innerHeight,
    offsetTop: visual?.offsetTop ?? 0,
    offsetLeft: visual?.offsetLeft ?? 0,
  };
}

/**
 * Onde a lista cabe: embaixo do botão por padrão; em cima quando falta espaço embaixo e sobra
 * mais em cima (perto da barra de baixo, do teclado ou do fim da tela). A altura fica limitada
 * ao espaço real e a lista nunca passa da borda lateral. `align="end"` alinha pela direita.
 */
export function computeMenuPosition(
  trigger: { top: number; bottom: number; left: number; width: number; right?: number },
  menu: { width: number; contentHeight: number },
  viewport: { width: number; height: number; offsetTop?: number; offsetLeft?: number },
  layoutHeight: number = viewport.height + (viewport.offsetTop ?? 0),
  options: { align?: 'start' | 'end'; matchWidth?: boolean } = {},
): MenuPosition {
  const { align = 'start', matchWidth = true } = options;
  const offsetTop = viewport.offsetTop ?? 0;
  const offsetLeft = viewport.offsetLeft ?? 0;
  const top = trigger.top - offsetTop;
  const bottom = trigger.bottom - offsetTop;
  const desired = Math.min(MENU_MAX_HEIGHT, Math.max(menu.contentHeight, 0));
  const spaceBelow = viewport.height - bottom - TRIGGER_GAP - VIEWPORT_MARGIN;
  const spaceAbove = top - TRIGGER_GAP - VIEWPORT_MARGIN;
  const placement: MenuPosition['placement'] =
    spaceBelow < desired && spaceAbove > spaceBelow ? 'top' : 'bottom';
  const available = placement === 'bottom' ? spaceBelow : spaceAbove;
  const maxHeight = Math.max(Math.min(MENU_MAX_HEIGHT, available), Math.min(MENU_MIN_HEIGHT, desired));

  const maxWidth = viewport.width - VIEWPORT_MARGIN * 2;
  const minWidth = matchWidth ? Math.min(trigger.width, maxWidth) : 0;
  const width = Math.min(Math.max(menu.width, minWidth), maxWidth);
  const triggerRight = trigger.right ?? trigger.left + trigger.width;
  const preferredLeft = align === 'end' ? triggerRight - width : trigger.left;
  const left = Math.min(
    Math.max(preferredLeft - offsetLeft, VIEWPORT_MARGIN),
    viewport.width - width - VIEWPORT_MARGIN,
  );

  const style: CSSProperties = {
    left: left + offsetLeft,
    minWidth: minWidth || undefined,
    maxWidth,
    maxHeight,
  };
  if (placement === 'bottom') {
    style.top = bottom + TRIGGER_GAP + offsetTop;
  } else {
    // Ancorada pela base: a lista cresce para cima a partir do botão.
    style.bottom = layoutHeight - trigger.top + TRIGGER_GAP;
  }
  return { placement, style };
}

function samePosition(a: MenuPosition | null, b: MenuPosition) {
  return !!a && a.placement === b.placement && JSON.stringify(a.style) === JSON.stringify(b.style);
}

/**
 * Mede o botão e a lista e devolve a posição; refaz ao rolar (fora da lista), ao mudar o
 * tamanho da janela, do teclado do celular ou da própria lista (ex.: busca filtrando opções).
 * Enquanto `null`, use `FLOATING_MENU_HIDDEN_STYLE`.
 */
export function useAnchoredPosition(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  menuRef: RefObject<HTMLElement | null>,
  options: { align?: 'start' | 'end'; matchWidth?: boolean } = {},
): MenuPosition | null {
  const { align = 'start', matchWidth = true } = options;
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const update = useCallback(() => {
    const anchor = anchorRef.current;
    const menu = menuRef.current;
    if (!anchor || !menu) return;
    const rect = anchor.getBoundingClientRect();
    const next = computeMenuPosition(
      { top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width, right: rect.right },
      { width: menu.scrollWidth, contentHeight: menu.scrollHeight },
      viewportSize(),
      window.innerHeight,
      { align, matchWidth },
    );
    setPosition(current => (samePosition(current, next) ? current : next));
  }, [align, anchorRef, matchWidth, menuRef]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    update();
  }, [open, update]);

  useEffect(() => {
    if (!open) return undefined;
    const handleScroll = (event: Event) => {
      // Rolar a própria lista não move o botão.
      if (menuRef.current && event.target instanceof Node && menuRef.current.contains(event.target)) return;
      update();
    };
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => update()) : null;
    if (menuRef.current) observer?.observe(menuRef.current);
    if (anchorRef.current) observer?.observe(anchorRef.current);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, [anchorRef, menuRef, open, update]);

  return position;
}
