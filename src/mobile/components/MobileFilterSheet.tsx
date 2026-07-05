import type { ReactNode } from 'react';
import { Text } from '../../components/ui/Text';
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
      <div className="border-b border-[var(--border-color)] px-6 py-4">
        <Text variant="sectionTitle">{title}</Text>
      </div>
      <div className="stack-lg p-6 pb-safe">{children}</div>
    </BottomSheetModal>
  );
}
