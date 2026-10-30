import { Text } from '../../../components/ui/Text';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { coverInitial } from '../lib/libraryCoverFile';

interface CoverFallbackProps {
  title: string;
  typeLabel?: string;
  icon?: LucideIcon;
  className?: string;
  compact?: boolean;
}

export { coverInitial } from '../lib/libraryCoverFile';

/** Visual fallback when a library item has no cover or the image URL fails. */
export function CoverFallback({
  title,
  typeLabel,
  icon: Icon,
  className,
  compact = false,
}: CoverFallbackProps) {
  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--bg-hover)] p-3 text-center',
        className,
      )}
    >
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full bg-[var(--bg-elevated)] text-[var(--text-primary)]',
          compact ? 'h-9 w-9 t-body' : 'h-12 w-12 ',
        )}
        aria-hidden
      >
        {coverInitial(title)}
      </span>
      {typeLabel ? (
        <Text variant="label" as="span" className="uppercase tracking-wide text-[var(--text-tertiary)]">
          {typeLabel}
        </Text>
      ) : Icon ? (
        <Icon className={cn('text-[var(--text-tertiary)]', compact ? 'h-4 w-4' : 'h-5 w-5')} />
      ) : null}
    </div>
  );
}
