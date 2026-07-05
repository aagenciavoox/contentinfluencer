import type { ReactNode } from 'react';
import { Surface } from '../../components/ui/Surface';
import { Text } from '../../components/ui/Text';
import { cn } from '../../lib/utils';

interface MobileGridCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  footer?: ReactNode;
  onClick?: () => void;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  footerClassName?: string;
}

export function MobileGridCard({
  title,
  subtitle,
  icon,
  footer,
  onClick,
  className,
  titleClassName,
  subtitleClassName,
  footerClassName,
}: MobileGridCardProps) {
  const content = (
    <div className={cn('flex min-h-36 flex-col justify-between', className)}>
      <div className="stack-md">
        {icon ? <div className="text-[var(--text-secondary)]">{icon}</div> : null}
        <div className="space-y-1">
          <Text variant="sectionTitle" as="p" className={titleClassName}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="meta" className={subtitleClassName}>
              {subtitle}
            </Text>
          ) : null}
        </div>
      </div>
      {footer ? <div className={footerClassName ?? 'mt-4'}>{footer}</div> : null}
    </div>
  );

  if (onClick) {
    return (
      <Surface variant="interactive" padding="md" onClick={onClick}>
        {content}
      </Surface>
    );
  }

  return (
    <Surface variant="outlined" padding="md">
      {content}
    </Surface>
  );
}
