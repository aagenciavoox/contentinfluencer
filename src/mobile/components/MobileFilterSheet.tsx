import type { ReactNode } from 'react';
import { BottomSheetModal } from '../../components/feedback/modals/BottomSheetModal';
import { OverlayHeader } from '../../components/overlays/OverlayHeader';

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
      <OverlayHeader title={title} onClose={onClose} />
      <div className="stack-lg px-4 pb-safe">{children}</div>
    </BottomSheetModal>
  );
}
