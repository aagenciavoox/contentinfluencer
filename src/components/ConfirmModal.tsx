import { motion, AnimatePresence } from 'motion/react';

interface ConfirmModalProps {
  open: boolean;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  message,
  confirmLabel = 'Confirmar',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[88%] max-w-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-6"
          >
            <p className="text-sm font-medium text-[var(--text-primary)] leading-relaxed mb-6 opacity-80">
              {message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-[var(--text-primary)] bg-[var(--bg-hover)] border border-[var(--border-color)] hover:border-[var(--border-strong)] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white bg-[var(--accent-pink)] hover:opacity-90 transition-all shadow-md"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
