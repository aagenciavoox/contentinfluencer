import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { useIsMobile } from '../../hooks/useIsMobile';
import {
  DESKTOP_DIALOG_ANIMATE,
  DESKTOP_DIALOG_EXIT,
  DESKTOP_DIALOG_INITIAL,
  DESKTOP_PANEL_TRANSITION,
  MOBILE_MODAL_MAX_HEIGHT,
  MOBILE_PANEL_ANIMATE,
  MOBILE_PANEL_EXIT,
  MOBILE_PANEL_INITIAL,
  MOBILE_PANEL_TRANSITION,
} from './overlayConstants';
import { OverlayRoot } from './OverlayRoot';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  desktopMaxW?: string;
  zIndex?: string;
  desktopPanelClassName?: string;
  ariaLabel?: string;
}

export function Dialog({
  open,
  onClose,
  children,
  desktopMaxW = 'md:max-w-[1200px]',
  zIndex = 'z-[100]',
  desktopPanelClassName,
  ariaLabel,
}: DialogProps) {
  const isMobile = useIsMobile();

  return (
    <OverlayRoot
      open={open}
      onClose={onClose}
      placement="center"
      zIndex={zIndex}
      mobileEdgePadding={isMobile}
      showMobileHandle={isMobile}
      ariaLabel={ariaLabel}
      panelInitial={isMobile ? MOBILE_PANEL_INITIAL : DESKTOP_DIALOG_INITIAL}
      panelAnimate={isMobile ? MOBILE_PANEL_ANIMATE : DESKTOP_DIALOG_ANIMATE}
      panelExit={isMobile ? MOBILE_PANEL_EXIT : DESKTOP_DIALOG_EXIT}
      panelTransition={isMobile ? MOBILE_PANEL_TRANSITION : DESKTOP_PANEL_TRANSITION}
      panelStyle={
        isMobile
          ? { width: 'min(100%, 720px)', maxHeight: MOBILE_MODAL_MAX_HEIGHT }
          : undefined
      }
      panelClassName={cn(
        'relative flex max-h-[90dvh] w-full flex-col overflow-hidden border border-[var(--border-color)] bg-[var(--bg-primary)]',
        isMobile
          ? 'rounded-[var(--radius-overlay)]'
          : cn('rounded-[var(--radius-overlay)] md:p-0', desktopMaxW),
        desktopPanelClassName
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </OverlayRoot>
  );
}
