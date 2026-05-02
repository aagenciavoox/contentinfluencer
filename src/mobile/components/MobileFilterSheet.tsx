import type { ReactNode } from 'react';
import { BottomSheetModal } from '../../components/feedback/modals/BottomSheetModal';

interface MobileFilterSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function MobileFilterSheet({
  open,
  title,
  onClose,
  children,
}: MobileFilterSheetProps) {
  return (
    <BottomSheetModal open={open} onClose={onClose} desktopMaxW="max-w-xl" zIndex="z-[110]">
      <div className="border-b border-[var(--border-color)] px-5 py-4">
        <p className="t-section-title text-[var(--text-primary)]">{title}</p>
      </div>
      <div className="space-y-4 p-5 pb-safe">{children}</div>
    </BottomSheetModal>
  );
}
