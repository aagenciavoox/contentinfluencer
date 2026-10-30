import { Text } from './Text';
import { cn } from '../../lib/utils';

/** Selo de contagem ao lado de um rótulo. Substitui "Rótulo (3)". */
export function CountBadge({ count, tone = 'neutral', className }: { count: number; tone?: 'neutral' | 'onPrimary'; className?: string }) {
  return (
    <Text variant="meta" as="span"
      className={cn(
        'inline-flex rounded-[var(--radius-sm)] px-1.5 py-0.5 leading-none tabular-nums',
        tone === 'onPrimary'
          ? 'bg-[color-mix(in_srgb,var(--bg-primary)_22%,transparent)] text-[var(--bg-primary)]'
          : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)]',
        className,
      )}
    >
      {count}
    </Text>
  );
}
