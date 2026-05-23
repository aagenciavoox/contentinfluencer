import {ArrowRight} from 'lucide-react';
import {AppButton} from '../ui/AppButton';
import {cn} from '../../lib/utils';

interface PipelineActionBarProps {
  title: string;
  description?: string;
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
        <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
        {description ? <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{description}</p> : null}
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
