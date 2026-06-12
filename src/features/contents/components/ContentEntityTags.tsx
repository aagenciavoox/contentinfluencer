import type { Pilar, Serie } from '../../../lib/database';
import { cn, getEntityTagStyle } from '../../../lib/utils';

interface ContentEntityTagsProps {
  pillar?: Pilar | null;
  series?: Serie | null;
  /** Exibe tag mesmo se a entidade ainda não estiver no estado (ex.: ID órfão). */
  pillarId?: string | null;
  seriesId?: string | null;
  className?: string;
  size?: 'sm' | 'md';
}

function EntityTag({
  label,
  color,
  size,
}: {
  label: string;
  color?: string | null;
  size: 'sm' | 'md';
}) {
  if (!label) return null;

  return (
    <span
      className={cn(
        'entity-tag-pill inline-flex max-w-full items-center gap-1.5 font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      )}
      style={getEntityTagStyle(color)}
    >
      {color ? (
        <span
          className="h-2 w-2 shrink-0 rounded-full border border-black/10"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      ) : null}
      <span className="truncate">{label}</span>
    </span>
  );
}

export function ContentEntityTags({
  pillar,
  series,
  pillarId,
  seriesId,
  className,
  size = 'md',
}: ContentEntityTagsProps) {
  const pillarLabel = pillar?.nome ?? (pillarId ? 'Pilar' : null);
  const seriesLabel = series?.name ?? (seriesId ? 'Serie' : null);

  if (!pillarLabel && !seriesLabel) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {pillarLabel ? (
        <EntityTag label={pillarLabel} color={pillar?.cor} size={size} />
      ) : null}
      {seriesLabel ? (
        <EntityTag label={seriesLabel} color={series?.cor} size={size} />
      ) : null}
    </div>
  );
}
