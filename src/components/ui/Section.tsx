import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Text } from './Text';

interface SectionProps {
  title: ReactNode;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Section({ title, description, action, children, className }: SectionProps) {
  return (
    <section className={cn('stack-lg', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          {typeof title === 'string' ? (
            <Text variant="sectionTitle" as="h2">
              {title}
            </Text>
          ) : (
            <Text variant="sectionTitle" as="h2">
              {title}
            </Text>
          )}
          {description ? (
            <Text variant="meta" className="text-[var(--text-secondary)]">
              {description}
            </Text>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
