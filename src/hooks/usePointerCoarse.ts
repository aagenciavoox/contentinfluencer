import { HOVER_HOVER_QUERY, POINTER_COARSE_QUERY } from '../shared/breakpoints';
import { useMediaQuery } from './useMediaQuery';

/** True when the primary pointer is coarse (typical touch). */
export function usePointerCoarse() {
  return useMediaQuery(POINTER_COARSE_QUERY);
}

/** True when the device can hover (typical mouse/trackpad). */
export function useCanHover() {
  return useMediaQuery(HOVER_HOVER_QUERY);
}
