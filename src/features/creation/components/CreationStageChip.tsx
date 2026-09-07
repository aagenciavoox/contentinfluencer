import { Badge } from '../../../components/ui/Badge';
import { cn } from '../../../lib/utils';

interface CreationStageChipProps {
  label: string;
  toneStatus: string;
  className?: string;
}

/** Compact stage chip using existing status color tokens. */
export function CreationStageChip({
  label,
  toneStatus,
  className,
}: CreationStageChipProps) {
  return (
    <Badge
      variant="status"
      status={toneStatus}
      className={cn('h-5 shrink-0 px-1.5 text-2xs', className)}
    >
      {label}
    </Badge>
  );
}
