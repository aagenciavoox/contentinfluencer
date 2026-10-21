import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { IconButton } from '../ui/IconButton';
import { Text } from '../ui/Text';

interface OverlayHeaderProps {
  title?: string;
  /** Ícone decorativo antes do título. */
  icon?: ReactNode;
  subtitle?: string;
  onClose?: () => void;
  /** Quando fornecido, substitui o conteúdo padrão de título e subtítulo. */
  children?: ReactNode;
  className?: string;
}

export function OverlayHeader({
  title,
  icon,
  subtitle,
  onClose,
  children,
  className,
}: OverlayHeaderProps) {
  return (
    <div
      className={cn(
        'overlay-header shrink-0 border-b border-[var(--border-color)] px-6 py-4',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
          {children ?? (
            <>
              {title ? (
                <div className="flex min-w-0 items-center gap-3">
                  {icon ? (
                    <span className="inline-flex shrink-0" aria-hidden="true">
                      {icon}
                    </span>
                  ) : null}
                  <Text
                    variant="sectionTitle"
                    as="h2"
                    className="min-w-0 flex-1 [overflow-wrap:anywhere]"
                  >
                    {title}
                  </Text>
                </div>
              ) : null}
              {subtitle ? (
                <Text
                  variant="meta"
                  className="mt-1 text-[var(--text-secondary)] [overflow-wrap:anywhere]"
                >
                  {subtitle}
                </Text>
              ) : null}
            </>
          )}
        </div>
        {onClose ? (
          <IconButton
            label="Fechar"
            onClick={onClose}
            // Preserva a moldura do botão em dispositivos com toque.
            className="shrink-0 text-[var(--text-secondary)] pointer-coarse:rounded-full pointer-coarse:border pointer-coarse:border-[var(--border-color)] pointer-coarse:bg-[var(--bg-secondary)]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </IconButton>
        ) : null}
      </div>
    </div>
  );
}
