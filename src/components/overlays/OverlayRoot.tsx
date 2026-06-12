import { CSSProperties, ReactNode, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, type Target, type Transition } from 'motion/react';
import { cn } from '../../lib/utils';
import { useOverlayBehavior } from './useOverlayBehavior';

export type OverlayPlacement = 'center' | 'bottom' | 'end';

interface OverlayRootProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  placement?: OverlayPlacement;
  zIndex?: string;
  mobileEdgePadding?: boolean;
  className?: string;
  panelClassName?: string;
  panelStyle?: CSSProperties;
  panelInitial?: Target;
  panelAnimate?: Target;
  panelExit?: Target;
  panelTransition?: Transition;
  showMobileHandle?: boolean;
  ariaLabel?: string;
}

export function OverlayRoot({
  open,
  onClose,
  children,
  placement = 'center',
  zIndex = 'z-[100]',
  mobileEdgePadding = true,
  className,
  panelClassName,
  panelStyle,
  panelInitial,
  panelAnimate,
  panelExit,
  panelTransition,
  showMobileHandle = false,
  ariaLabel,
}: OverlayRootProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useOverlayBehavior(open, onClose, panelRef);

  const placementClasses = {
    center: 'items-center',
    bottom: 'items-end md:items-center',
    end: 'items-stretch justify-end',
  };

  const content = (
    <AnimatePresence>
      {open && (
        <div
          className={cn('fixed inset-0 flex', placementClasses[placement], zIndex, className)}
          style={
            mobileEdgePadding
              ? {
                  paddingTop: `calc(env(safe-area-inset-top, 0px) + 8px)`,
                  paddingRight: '8px',
                  paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + 8px)`,
                  paddingLeft: '8px',
                }
              : undefined
          }
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40"
            aria-hidden
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            tabIndex={-1}
            initial={panelInitial}
            animate={panelAnimate}
            exit={panelExit}
            transition={panelTransition}
            style={panelStyle}
            onClick={(event) => event.stopPropagation()}
            className={panelClassName}
          >
            {showMobileHandle ? (
              <div className="flex justify-center pt-3 pb-1 shrink-0 md:hidden">
                <div className="h-1 w-10 rounded-full bg-[var(--text-primary)] opacity-20" />
              </div>
            ) : null}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
