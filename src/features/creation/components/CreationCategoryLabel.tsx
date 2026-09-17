import { cn } from '../../../lib/utils';
import { Badge } from '../../../components/ui/Badge';
import { Text } from '../../../components/ui/Text';

interface CreationCategoryLabelProps {
  label: string;
  extraCount?: number;
  className?: string;
}

/** One visible editorial tag plus a compact count for any remaining tags. */
export function CreationCategoryLabel({
  label,
  extraCount = 0,
  className,
}: CreationCategoryLabelProps) {
  return (
    <span className={cn('inline-flex min-w-0 max-w-full items-center gap-1.5', className)}>
      <Badge variant="tag" className="max-w-full truncate text-2xs">
        #{label.replace(/^#+/, '')}
      </Badge>
      {extraCount > 0 ? (
        <Text variant="meta" as="span" className="shrink-0 leading-none">
          +{extraCount}
        </Text>
      ) : null}
    </span>
  );
}
