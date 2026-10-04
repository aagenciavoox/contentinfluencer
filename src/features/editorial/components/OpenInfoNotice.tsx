import { Info } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';
import { formatOpenItems, type SerieOpenItem } from '../lib/serieCompleteness';

/** Lembrete calmo de que a série ainda pode ser completada no Editorial. */
export function OpenInfoNotice({
  items,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: {
  items: SerieOpenItem[];
  title?: string;
  description?: string | null;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <Surface
      variant="outlined"
      padding="sm"
      className={cn('flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-secondary)]', className)}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
        <div className="min-w-0">
          <Text variant="bodyStrong">{title ?? `Em aberto: ${formatOpenItems(items)}`}</Text>
          {description !== null ? (
            <Text variant="meta" className="text-[var(--text-secondary)]">
              {description ?? `Quando fizer sentido, complete estas informações para os roteiros já nascerem configurados.`}
            </Text>
          ) : null}
        </div>
      </div>
      {actionLabel && onAction ? (
        <AppButton variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </AppButton>
      ) : null}
    </Surface>
  );
}
