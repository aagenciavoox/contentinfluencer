import { ReactNode } from 'react';
import { BottomSheet } from '../../overlays/BottomSheet';

interface BottomSheetModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  desktopMaxW?: string;
  zIndex?: string;
}

/** @deprecated Use BottomSheet from components/overlays */
export function BottomSheetModal({
  open,
  onClose,
  children,
  desktopMaxW = 'max-w-2xl',
  zIndex = 'z-[100]',
}: BottomSheetModalProps) {
  return (
    <BottomSheet open={open} onClose={onClose} desktopMaxW={desktopMaxW} zIndex={zIndex}>
      {children}
    </BottomSheet>
  );
}
