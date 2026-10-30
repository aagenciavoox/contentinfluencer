import {ArrowRight} from 'lucide-react';
import {AppButton} from '../ui/AppButton';
import {Text} from '../ui/Text';
import {cn} from '../../lib/utils';

interface PipelineActionBarProps {
  title: string;
  description?: string;
  eyebrow?: string;
  reason?: string;
  primaryLabel: string;
  onPrimary: () => void;
  disabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  className?: string;
}

export function PipelineActionBar({
  title,
  description,
  eyebrow,
  reason,
  primaryLabel,
  onPrimary,
  disabled = false,
  secondaryLabel,
  onSecondary,
  className,
}: PipelineActionBarProps) {
  return (
    <div
      className={cn(
        'ds-card flex flex-col gap-3 border-[color-mix(in_srgb,var(--accent-blue),transparent_70%)] bg-[color-mix(in_srgb,var(--accent-blue),transparent_94%)] p-4 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow ? <Text variant="eyebrow">{eyebrow}</Text> : null}
        <Text variant="bodyStrong" as="p" className={cn('text-[var(--text-primary)]', eyebrow && 'mt-1')}>
          {title}
        </Text>
        {reason ? <Text variant="meta" as="p" className="mt-0.5 text-[var(--text-tertiary)]">{reason}</Text> : null}
        {description ? <Text variant="meta" as="p" className="mt-0.5 text-[var(--text-secondary)]">{description}</Text> : null}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {secondaryLabel && onSecondary ? (
          <AppButton variant="secondary" size="sm" onClick={onSecondary}>
            {secondaryLabel}
          </AppButton>
        ) : null}
        <AppButton
          variant="primary"
          size="sm"
          onClick={onPrimary}
          disabled={disabled}
          rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
        >
          {primaryLabel}
        </AppButton>
      </div>
    </div>
  );
}
