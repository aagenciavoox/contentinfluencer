import { cn } from '../../../lib/utils';
import { Badge } from '../../../components/ui/Badge';
import { Text } from '../../../components/ui/Text';

interface CreationCategoryLabelProps {
  label: string;
  extraCount?: number;
  /** Lista completa, para o hover do card (o pai precisa da classe `group`). */
  names?: readonly string[];
  /** Fundo mais claro quando a etiqueta está sobre o papel suave do card de Ideia. */
  onPaper?: boolean;
  className?: string;
}

/** One visible editorial tag plus a compact count for any remaining tags. */
export function CreationCategoryLabel({
  label,
  extraCount = 0,
  names,
  onPaper = false,
  className,
}: CreationCategoryLabelProps) {
  const all = names?.length ? names : [label];
  return (
    <span
      className={cn('relative inline-flex min-w-0 max-w-full items-center gap-1', className)}
      title={all.join(', ')}
    >
      <Badge
        variant="tag"
        className={cn(
          'max-w-full truncate rounded-[var(--radius-sm)] text-2xs',
          onPaper && 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]',
        )}
      >
        #{label.replace(/^#+/, '')}
      </Badge>
      {extraCount > 0 ? (
        <Text
          variant="meta"
          as="span"
          className={cn(
            'shrink-0 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-2xs leading-none text-[var(--text-tertiary)]',
            onPaper ? 'bg-[var(--bg-elevated)]' : 'bg-[var(--tag-bg)]',
          )}
        >
          +{extraCount}
        </Text>
      ) : null}
      {all.length > 1 ? (
        <span className="pointer-events-none absolute bottom-full left-0 z-20 mb-1 hidden max-w-[16rem] truncate rounded-[var(--radius-sm)] bg-[var(--text-primary)] px-1.5 py-0.5 text-2xs text-[var(--bg-elevated)] group-hover:block">
          {all.join(' · ')}
        </span>
      ) : null}
    </span>
  );
}
