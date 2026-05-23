import { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

interface SidePanelProps {
  open: boolean;
  title: string;
  subtitle?: string;
  headerContent?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  widthClassName?: string;
}

export function SidePanel({
  open,
  title,
  subtitle,
  headerContent,
  onClose,
  children,
  widthClassName = 'max-w-xl',
}: SidePanelProps) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className={`fixed inset-y-0 right-0 z-50 flex w-full ${widthClassName} flex-col border-l border-[var(--border-color)] bg-[var(--bg-primary)] shadow-2xl`}
          >
            <div className="border-b border-[var(--border-color)] px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {headerContent ? (
                    <div className="mb-3">{headerContent}</div>
                  ) : null}
                  <h2 className="ds-h3">{title}</h2>
                  {subtitle ? (
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-2 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 pb-safe">{children}</div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
