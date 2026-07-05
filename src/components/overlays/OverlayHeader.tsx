import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { IconButton } from '../ui/IconButton';
import { Text } from '../ui/Text';

interface OverlayHeaderProps {
  title?: string;
  subtitle?: string;
  onClose?: () => void;
  children?: ReactNode;
  className?: string;
}

export function OverlayHeader({ title, subtitle, onClose, children, className }: OverlayHeaderProps) {
  return (
    <div className={cn('shrink-0 border-b border-[var(--border-color)] px-6 py-4', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {children ?? (
            <>
              {title ? (
                <Text variant="sectionTitle" as="h2">
                  {title}
                </Text>
              ) : null}
              {subtitle ? (
                <Text variant="meta" className="mt-1 text-[var(--text-secondary)]">
                  {subtitle}
                </Text>
              ) : null}
            </>
          )}
        </div>
        {onClose ? (
          <IconButton label="Fechar" onClick={onClose}>
            <X className="h-5 w-5" />
          </IconButton>
        ) : null}
      </div>
    </div>
  );
}
