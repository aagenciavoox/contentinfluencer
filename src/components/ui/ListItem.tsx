import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Text } from './Text';
import { Surface } from './Surface';

interface ListItemProps {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
  variant?: 'card' | 'divider';
}

export function ListItem({
  leading,
  title,
  subtitle,
  trailing,
  className,
  interactive = false,
  onClick,
  variant = 'card',
}: ListItemProps) {
  const content = (
    <>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <Text variant="itemTitle" as="div" className="font-semibold" truncate>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="meta" as="div" className="mt-1" truncate>
            {subtitle}
          </Text>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </>
  );

  if (variant === 'divider') {
    return (
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={
          onClick
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        className={cn(
          'flex min-h-12 items-center gap-4 border-b border-[var(--border-color)] px-1 py-3 last:border-b-0',
          (interactive || onClick) && 'cursor-pointer transition-colors hover:bg-[var(--bg-hover)]',
          className
        )}
      >
        {content}
      </div>
    );
  }

  if (onClick || interactive) {
    return (
      <Surface variant="interactive" padding="sm" onClick={onClick} className={cn('flex items-center gap-4', className)}>
        {content}
      </Surface>
    );
  }

  return (
    <Surface variant="outlined" padding="sm" className={cn('flex items-center gap-4', className)}>
      {content}
    </Surface>
  );
}

/** @deprecated Use ListItem instead */
export function ListRow(props: ListItemProps) {
  return <ListItem {...props} />;
}
