import { cn } from '../../../lib/utils';
import { Text } from '../../../components/ui/Text';

interface CreationCategoryLabelProps {
  label: string;
  color?: string | null;
  className?: string;
}

/** Category as a small colored dot + name (no pill chrome). */
export function CreationCategoryLabel({
  label,
  color,
  className,
}: CreationCategoryLabelProps) {
  return (
    <span className={cn('inline-flex min-w-0 max-w-full items-center gap-1.5', className)}>
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color || 'var(--text-tertiary)' }}
        aria-hidden
      />
      <Text variant="meta" as="span" className="truncate leading-none">
        {label}
      </Text>
    </span>
  );
}
