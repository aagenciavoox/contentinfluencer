import type { ReactNode } from 'react';
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
    <div className={cn('flex flex-col gap-1', className)}>
      {status || eyebrow || trailing ? (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            {status ?? (eyebrow ? <Text variant="label">{eyebrow}</Text> : null)}
          </div>
          {trailing ? <div className="card-actions shrink-0">{trailing}</div> : null}
        </div>
      ) : null}

      <div className="min-w-0">
        {eyebrow && status ? <Text variant="label" className="mb-0.5">{eyebrow}</Text> : null}
        <Text variant="itemTitle" as="p" className="line-clamp-2 font-semibold leading-snug">
          {title}
        </Text>
        {description ? (
          <Text variant="secondary" className="mt-0.5 line-clamp-2">
            {description}
          </Text>
        ) : null}
      </div>

      {meta ? (
        <div className="mobile-list-card-meta flex flex-wrap items-center gap-1 pt-0.5">
          {meta}
        </div>
      ) : null}
    </div>
  );

  if (onClick) {
    return (
      <Surface
        variant="interactive"
        padding="sm"
        as="div"
        onClick={onClick}
        className="group w-full cursor-pointer text-left"
      >
        {content}
      </Surface>
    );
  }

  return (
    <Surface variant="outlined" padding="sm" className="group">
      {content}
    </Surface>
  );
}
