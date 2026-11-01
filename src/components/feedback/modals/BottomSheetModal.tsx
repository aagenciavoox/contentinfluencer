import { ReactNode } from 'react';
import { BottomSheet } from '../../overlays/BottomSheet';
import { Z_INDEX_MODAL } from '../../overlays/overlayConstants';

interface BottomSheetModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  desktopMaxW?: string;
  zIndex?: string;
  ariaLabel?: string;
}

/** @deprecated Use BottomSheet from components/overlays */
export function BottomSheetModal({
  open,
  onClose,
  children,
  desktopMaxW = 'max-w-2xl',
  zIndex = Z_INDEX_MODAL,
  ariaLabel,
}: BottomSheetModalProps) {
  return (
    <BottomSheet open={open} onClose={onClose} desktopMaxW={desktopMaxW} zIndex={zIndex} ariaLabel={ariaLabel}>
      {children}
    </BottomSheet>
  );
}
