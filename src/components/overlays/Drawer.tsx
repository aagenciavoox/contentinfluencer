import { ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { useOverlayBehavior } from './useOverlayBehavior';
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'motion/react';
import { Z_INDEX_DRAWER_BACKDROP, Z_INDEX_MODAL } from './overlayConstants';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  widthClassName?: string;
  zIndex?: string;
}

export function Drawer({
  open,
  onClose,
  children,
  widthClassName = 'max-w-xl',
  zIndex = Z_INDEX_MODAL,
}: DrawerProps) {
  const panelRef = useRef<HTMLElement>(null);
  useOverlayBehavior(open, onClose, panelRef);

  const content = (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn('fixed inset-0 bg-[var(--backdrop-medium)]', Z_INDEX_DRAWER_BACKDROP)}
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            ref={panelRef as React.RefObject<HTMLElement>}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className={cn(
              'fixed inset-y-0 right-0 flex w-full flex-col border-l border-[var(--border-color)] bg-[var(--bg-primary)]',
              widthClassName,
              zIndex
            )}
          >
            {children}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
