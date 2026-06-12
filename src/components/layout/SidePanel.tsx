import { ReactNode } from 'react';
import { Drawer } from '../overlays/Drawer';
import { OverlayHeader } from '../overlays/OverlayHeader';
import { OverlayBody } from '../overlays/OverlayBody';
import { Text } from '../ui/Text';

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
    <Drawer open={open} onClose={onClose} widthClassName={widthClassName}>
      <OverlayHeader onClose={onClose}>
        {headerContent ? <div className="mb-3">{headerContent}</div> : null}
        <Text variant="sectionTitle" as="h2">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="meta" className="mt-1 text-[var(--text-secondary)]">
            {subtitle}
          </Text>
        ) : null}
      </OverlayHeader>
      <OverlayBody className="pb-safe">{children}</OverlayBody>
    </Drawer>
  );
}
