import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { usePointerCoarse } from '../../hooks/usePointerCoarse';
import {
  DESKTOP_PANEL_TRANSITION,
  MOBILE_MODAL_MAX_HEIGHT,
  MOBILE_PANEL_ANIMATE,
  MOBILE_PANEL_EXIT,
  MOBILE_PANEL_INITIAL,
  MOBILE_PANEL_TRANSITION,
} from './overlayConstants';
import { OverlayRoot } from './OverlayRoot';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  desktopMaxW?: string;
  zIndex?: string;
  ariaLabel?: string;
}

export function BottomSheet({
  open,
  onClose,
  children,
  desktopMaxW = 'max-w-2xl',
  zIndex = 'z-[100]',
  ariaLabel,
}: BottomSheetProps) {
  // Interaction criterion: coarse pointer prefers sheet-like chrome, not viewport width.
  const touchPrimary = usePointerCoarse();

  return (
    <OverlayRoot
      open={open}
      onClose={onClose}
      placement={touchPrimary ? 'center' : 'bottom'}
      zIndex={zIndex}
      showMobileHandle={touchPrimary}
      ariaLabel={ariaLabel}
      panelInitial={
        touchPrimary
          ? MOBILE_PANEL_INITIAL
          : { opacity: 0, scale: 0.95, y: 20 }
      }
      panelAnimate={touchPrimary ? MOBILE_PANEL_ANIMATE : { opacity: 1, scale: 1, y: 0 }}
      panelExit={touchPrimary ? MOBILE_PANEL_EXIT : { opacity: 0, scale: 0.95, y: 20 }}
      panelTransition={touchPrimary ? MOBILE_PANEL_TRANSITION : DESKTOP_PANEL_TRANSITION}
      panelStyle={
        touchPrimary
          ? { width: 'min(100%, 720px)', maxHeight: MOBILE_MODAL_MAX_HEIGHT }
          : undefined
      }
      panelClassName={cn(
        'relative flex w-full flex-col overflow-hidden border border-[var(--border-color)] bg-[var(--bg-secondary)] rounded-[var(--radius-overlay)]',
        touchPrimary && 'min-h-0 max-h-[90dvh]',
        !touchPrimary &&
          cn(
            'absolute top-1/2 left-1/2 w-[95%] max-h-[90vh] -translate-x-1/2 -translate-y-1/2',
            desktopMaxW
          )
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </OverlayRoot>
  );
}
