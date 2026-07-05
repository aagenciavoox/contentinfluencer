import type { ReactNode } from 'react';
import { ListItem } from '../../components/ui/ListItem';
import { Text } from '../../components/ui/Text';
import { Surface } from '../../components/ui/Surface';
import { cn } from '../../lib/utils';

interface MobileListCardProps {
  title: string;
  description?: string;
  eyebrow?: string;
  meta?: ReactNode;
  status?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function MobileListCard({
  title,
  description,
  eyebrow,
  meta,
  status,
  trailing,
  onClick,
  className,
}: MobileListCardProps) {
  const content = (
  <div className={cn('stack-sm', className)}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 stack-sm">
          {eyebrow ? <Text variant="label">{eyebrow}</Text> : null}
          <Text variant="sectionTitle" as="p">
            {title}
          </Text>
          {description ? (
            <Text variant="body" className="text-[var(--text-secondary)]">
              {description}
            </Text>
          ) : null}
          {meta ? <div className="flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>
      {status ? <div>{status}</div> : null}
    </div>
  );

  if (onClick) {
    return (
      <Surface variant="interactive" padding="md" as="div" onClick={onClick} className="w-full cursor-pointer text-left">
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
