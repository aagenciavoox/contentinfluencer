import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Text } from '../../components/ui/Text';
import { cn } from '../../lib/utils';

type AccentTone = 'blue' | 'orange' | 'green' | 'purple' | 'neutral';

const TONE_CLASSES: Record<AccentTone, string> = {
  blue: 'bg-[var(--accent-blue)]/12 text-[var(--accent-blue)]',
  orange: 'bg-[var(--accent-orange)]/12 text-[var(--accent-orange)]',
  green: 'bg-[var(--accent-green)]/12 text-[var(--accent-green)]',
  purple: 'bg-[var(--accent-purple)]/12 text-[var(--accent-purple)]',
  neutral: 'bg-[var(--bg-hover)] text-[var(--text-secondary)]',
};

interface MobileSectionHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  tone?: AccentTone;
  className?: string;
  action?: ReactNode;
}

/** Standard in-card section header for mobile screens (icon + title + meta). */
export function MobileSectionHeader({
  icon: Icon,
  title,
  description,
  tone = 'blue',
  className,
  action,
}: MobileSectionHeaderProps) {
  return (
    <div className={cn('mobile-section-header', className)}>
      <div className={cn('mobile-section-header-icon', TONE_CLASSES[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <Text variant="sectionTitle" as="p">
          {title}
        </Text>
        {description ? (
          typeof description === 'string' ? (
            <Text variant="secondary">{description}</Text>
          ) : (
            description
          )
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
