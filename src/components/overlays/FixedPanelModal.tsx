import { ReactNode } from 'react';
import { Dialog } from './Dialog';
import { Z_INDEX_MODAL } from './overlayConstants';

interface FixedPanelModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  desktopMaxW?: string;
  desktopPanelClassName?: string;
  zIndex?: string;
}

/** @deprecated Use Dialog from components/overlays */
export function FixedPanelModal({
  open,
  onClose,
  children,
  desktopMaxW = 'md:max-w-[1200px]',
  desktopPanelClassName,
  zIndex = Z_INDEX_MODAL,
}: FixedPanelModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      desktopMaxW={desktopMaxW}
      desktopPanelClassName={desktopPanelClassName}
      zIndex={zIndex}
    >
      {children}
    </Dialog>
  );
}
