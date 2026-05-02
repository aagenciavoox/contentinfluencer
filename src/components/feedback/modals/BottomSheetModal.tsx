import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import { cn } from '../../../lib/utils';

const MOBILE_MODAL_EDGE_PADDING = '8px';
const MOBILE_MODAL_MAX_HEIGHT = 'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 16px)';
const MOBILE_PANEL_INITIAL = { opacity: 0, scale: 0.985, y: 24 };
const MOBILE_PANEL_ANIMATE = { opacity: 1, scale: 1, y: 0 };
const MOBILE_PANEL_EXIT = { opacity: 0, scale: 0.985, y: 16 };
const MOBILE_PANEL_TRANSITION = { type: 'tween' as const, duration: 0.2, ease: [0.22, 1, 0.36, 1] as const };
const DESKTOP_PANEL_TRANSITION = { type: 'spring' as const, damping: 30, stiffness: 300 };

interface BottomSheetModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Tailwind max-w class for desktop, e.g. "max-w-[820px]" */
  desktopMaxW?: string;
  /** Tailwind z-index class, e.g. "z-50" or "z-[100]" */
  zIndex?: string;
}

export function BottomSheetModal({
  open,
  onClose,
  children,
  desktopMaxW = 'max-w-2xl',
  zIndex = 'z-[100]',
}: BottomSheetModalProps) {
  const isMobile = useIsMobile();
  useBodyScrollLock(open);

  const content = (
    <AnimatePresence>
      {open && (
        <div
          className={cn(
            'fixed inset-0 flex justify-center',
            isMobile ? 'items-center' : 'items-end md:items-center',
            zIndex
          )}
          style={
            isMobile
              ? {
                  paddingTop: `calc(env(safe-area-inset-top, 0px) + ${MOBILE_MODAL_EDGE_PADDING})`,
                  paddingRight: MOBILE_MODAL_EDGE_PADDING,
                  paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${MOBILE_MODAL_EDGE_PADDING})`,
                  paddingLeft: MOBILE_MODAL_EDGE_PADDING,
                }
              : undefined
          }
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={isMobile ? MOBILE_PANEL_INITIAL : { opacity: 0, scale: 0.95, y: 20 }}
            animate={isMobile ? MOBILE_PANEL_ANIMATE : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? MOBILE_PANEL_EXIT : { opacity: 0, scale: 0.95, y: 20 }}
            transition={isMobile ? MOBILE_PANEL_TRANSITION : DESKTOP_PANEL_TRANSITION}
            style={
              isMobile
                ? {
                    width: 'min(100%, 720px)',
                    maxHeight: MOBILE_MODAL_MAX_HEIGHT,
                  }
                : undefined
            }
            className={
              isMobile
                ? 'relative w-full rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl flex flex-col overflow-hidden will-change-transform'
                : cn(
                    'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl w-[95%] max-h-[90vh] bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl flex flex-col overflow-hidden',
                    desktopMaxW
                  )
            }
          >
            {/* Handle pill — mobile only */}
            {isMobile && (
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-[var(--text-primary)] opacity-20" />
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
