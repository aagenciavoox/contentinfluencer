import { ArrowRight } from 'lucide-react';
import { Badge } from './Badge';
import { Text } from './Text';

export function ContentRow({
  title,
  meta,
  isStatus = false,
  onClick,
}: {
  title: string;
  meta: string;
  isStatus?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center justify-between gap-3 rounded-[var(--radius-input)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
    >
      <div className="min-w-0 flex-1">
        <Text variant="bodyStrong" truncate>{title}</Text>
        {isStatus ? (
          <Badge variant="status" status={meta} className="mt-1">
            {meta}
          </Badge>
        ) : (
          <Text variant="meta" className="mt-0.5 truncate">{meta}</Text>
        )}
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)] opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}
