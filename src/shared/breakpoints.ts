/**
 * Canonical viewport breakpoints — single source for JS and CSS.
 *
 * Criteria (see roadmap):
 * - content reflow: sm/md/lg/xl (Tailwind defaults)
 * - shell switch: width <= SHELL_MAX_PX uses the mobile shell
 * - interaction: use pointer/hover queries, not width (see usePointerCoarse)
 *
 * CSS mirrors these in :root / @theme as --bp-* (src/styles/index.css).
 * Keep numeric values in sync when changing either side.
 */

export const BREAKPOINTS = {
  /** Tailwind `sm` */
  sm: 640,
  /** Tailwind `md` — content reflow only */
  md: 768,
  /** Tailwind `lg` — desktop content tier */
  lg: 1024,
  /** Tailwind `xl` */
  xl: 1280,
  /** Tailwind `2xl` */
  '2xl': 1536,
} as const;

/**
 * Mobile shell when viewport width is at most this value.
 * Matches Tailwind `lg` threshold: max-width 1023px ⇔ min-width 1024px desktop.
 */
export const SHELL_MAX_PX = BREAKPOINTS.lg - 1;

/** matchMedia query for the mobile app shell (sidebar vs bottom-nav). */
export const SHELL_MOBILE_QUERY = `(max-width: ${SHELL_MAX_PX}px)`;

/** matchMedia for coarse pointers (touch-first interaction). */
export const POINTER_COARSE_QUERY = '(pointer: coarse)';

/** matchMedia for devices that can hover. */
export const HOVER_HOVER_QUERY = '(hover: hover)';

export type BreakpointName = keyof typeof BREAKPOINTS;

export function minWidthQuery(px: number): string {
  return `(min-width: ${px}px)`;
}

export function maxWidthQuery(px: number): string {
  return `(max-width: ${px}px)`;
}
