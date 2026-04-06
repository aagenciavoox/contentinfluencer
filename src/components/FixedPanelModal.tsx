import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useIsMobile } from '../hooks/useIsMobile';
import { cn } from '../lib/utils';

interface FixedPanelModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Tailwind max-w class for desktop, e.g. "md:max-w-[1200px]" */
  desktopMaxW?: string;
  /** Tailwind z-index class, e.g. "z-50" or "z-[100]" */
  zIndex?: string;
}

export function FixedPanelModal({
  open,
  onClose,
  children,
  desktopMaxW = 'md:max-w-[1200px]',
  zIndex = 'z-50',
}: FixedPanelModalProps) {
  const isMobile = useIsMobile();

  return (
    <AnimatePresence>
      {open && (
        <div className={cn('fixed inset-0 flex items-end md:items-center justify-center p-0 md:p-6', zIndex)}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 12 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={
              isMobile
                ? 'absolute bottom-0 left-0 right-0 rounded-t-3xl max-h-[92dvh] bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl flex flex-col overflow-hidden'
                : cn(
                    'relative w-full max-h-[90dvh] bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl shadow-2xl flex flex-col overflow-hidden',
                    desktopMaxW
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
}
