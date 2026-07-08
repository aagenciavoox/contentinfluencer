import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { useIsMobile } from '../../hooks/useIsMobile';
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
  const isMobile = useIsMobile();

  return (
    <OverlayRoot
      open={open}
      onClose={onClose}
      placement={isMobile ? 'center' : 'bottom'}
      zIndex={zIndex}
      showMobileHandle={isMobile}
      ariaLabel={ariaLabel}
      panelInitial={
        isMobile
          ? MOBILE_PANEL_INITIAL
          : { opacity: 0, scale: 0.95, y: 20 }
      }
      panelAnimate={isMobile ? MOBILE_PANEL_ANIMATE : { opacity: 1, scale: 1, y: 0 }}
      panelExit={isMobile ? MOBILE_PANEL_EXIT : { opacity: 0, scale: 0.95, y: 20 }}
      panelTransition={isMobile ? MOBILE_PANEL_TRANSITION : DESKTOP_PANEL_TRANSITION}
      panelStyle={
        isMobile
          ? { width: 'min(100%, 720px)', maxHeight: MOBILE_MODAL_MAX_HEIGHT }
          : undefined
      }
      panelClassName={cn(
        'relative flex w-full flex-col overflow-hidden border border-[var(--border-color)] bg-[var(--bg-secondary)] rounded-[var(--radius-overlay)]',
        isMobile && 'min-h-0 max-h-[90dvh]',
        !isMobile &&
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
