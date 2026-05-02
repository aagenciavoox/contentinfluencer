import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { cn } from '../../lib/utils';

const MOBILE_MODAL_EDGE_PADDING = '8px';
const MOBILE_FIXED_PANEL_MAX_HEIGHT = 'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 16px)';
const MOBILE_PANEL_INITIAL = { opacity: 0, scale: 0.985, y: 24 };
const MOBILE_PANEL_ANIMATE = { opacity: 1, scale: 1, y: 0 };
const MOBILE_PANEL_EXIT = { opacity: 0, scale: 0.985, y: 16 };
const MOBILE_PANEL_TRANSITION = { type: 'tween' as const, duration: 0.2, ease: [0.22, 1, 0.36, 1] as const };
const DESKTOP_PANEL_TRANSITION = { type: 'spring' as const, damping: 30, stiffness: 300 };

interface FixedPanelModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Tailwind max-w class for desktop, e.g. "md:max-w-[1200px]" */
  desktopMaxW?: string;
  /** Extra desktop panel classes, e.g. fixed width/height overrides */
  desktopPanelClassName?: string;
  /** Tailwind z-index class, e.g. "z-50" or "z-[100]" */
  zIndex?: string;
}

export function FixedPanelModal({
  open,
  onClose,
  children,
  desktopMaxW = 'md:max-w-[1200px]',
  desktopPanelClassName,
  zIndex = 'z-[100]',
}: FixedPanelModalProps) {
  const isMobile = useIsMobile();
  useBodyScrollLock(open);

  const content = (
    <AnimatePresence>
      {open && (
        <div
          className={cn(
            'fixed inset-0 flex justify-center',
            isMobile ? 'items-center' : 'items-end md:items-center p-0 md:p-6',
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
            initial={isMobile ? MOBILE_PANEL_INITIAL : { opacity: 0, scale: 0.96, y: 12 }}
            animate={isMobile ? MOBILE_PANEL_ANIMATE : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? MOBILE_PANEL_EXIT : { opacity: 0, scale: 0.96, y: 12 }}
            transition={isMobile ? MOBILE_PANEL_TRANSITION : DESKTOP_PANEL_TRANSITION}
            style={
              isMobile
                ? {
                    width: 'min(100%, 720px)',
                    maxHeight: MOBILE_FIXED_PANEL_MAX_HEIGHT,
                  }
                : undefined
            }
            className={
              isMobile
                ? 'relative w-full rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl flex flex-col overflow-hidden will-change-transform'
                : cn(
                    'relative w-full max-h-[90dvh] bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl shadow-2xl flex flex-col overflow-hidden',
                    desktopMaxW,
                    desktopPanelClassName
                  )
            }
          >
            {/* Handle pill — mobile only */}
            {isMobile && (
              <div className="flex justify-center pt-3 pb-1 shrink-0 bg-[var(--bg-primary)] z-50 rounded-t-3xl">
                <div className="w-10 h-1 rounded-full bg-[var(--text-primary)] opacity-20" />
              </div>
            )}

            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
               {children}
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
