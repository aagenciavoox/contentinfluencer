import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useIsMobile } from '../hooks/useIsMobile';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { cn } from '../lib/utils';

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
        <div className={cn('fixed inset-0', zIndex)}>
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
            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={
              isMobile
                ? 'absolute bottom-0 left-0 right-0 rounded-t-3xl max-h-[92dvh] bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl flex flex-col overflow-hidden'
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
