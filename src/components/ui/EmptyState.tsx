import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Text } from './Text';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-dashed border-[var(--border-color)] bg-[var(--bg-elevated)] text-center',
        compact
          ? 'px-6 py-8 shadow-sm'
          : 'min-h-[180px] md:min-h-[240px] px-6 py-8 md:px-6 md:py-10',
        className
      )}
    >
      {icon ? (
        <div className="mb-4 flex justify-center text-[var(--text-tertiary)]">{icon}</div>
      ) : null}
      <div className="stack-sm">
        <Text variant="sectionTitle" as="h3">
          {title}
        </Text>
        <Text variant="meta" className="max-w-md">
          {description}
        </Text>
      </div>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
