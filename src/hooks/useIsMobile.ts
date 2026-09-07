import { SHELL_MOBILE_QUERY } from '../shared/breakpoints';
import { useMediaQuery } from './useMediaQuery';

/** @deprecated Prefer SHELL_MOBILE_QUERY from shared/breakpoints */
export const MOBILE_QUERY = SHELL_MOBILE_QUERY;

/**
 * True when the mobile app shell should render (bottom nav, not sidebar).
 * Bound to SHELL_MAX_PX — not a substitute for content-reflow `md:` utilities.
 */
export function useIsMobile() {
  return useMediaQuery(SHELL_MOBILE_QUERY);
}
