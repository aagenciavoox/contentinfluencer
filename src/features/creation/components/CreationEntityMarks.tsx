import type { ElementType } from 'react';
import { Columns3, ListVideo } from 'lucide-react';
import type { Pilar, Serie } from '../../../lib/database';
import { Tooltip } from '../../../components/ui/Tooltip';
import { cn, getEntityTagStyle } from '../../../lib/utils';

interface CreationEntityMarksProps {
  pillar?: Pilar | null;
  series?: Serie | null;
  pillarId?: string | null;
  seriesId?: string | null;
  className?: string;
}

function markLabel(name: string | null | undefined, fallbackId: string | null | undefined, fallback: string) {
  const trimmed = name?.trim();
  if (trimmed) return trimmed;
  return fallbackId ? fallback : null;
}

function EntityMark({
  icon: Icon,
  kind,
  label,
  color,
}: {
  icon: ElementType;
  kind: 'Série' | 'Pilar';
  label: string;
  color?: string | null;
}) {
  return (
    <Tooltip label={`${kind}: ${label}`} side="top">
      <span
        className={cn(
          'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-transparent',
          !color && 'bg-[var(--bg-hover)] text-[var(--text-tertiary)]',
        )}
        style={getEntityTagStyle(color)}
      >
        <Icon className="h-3 w-3" aria-hidden />
      </span>
    </Tooltip>
  );
}

/** Colored series and pillar icons. The name appears on hover. */
export function CreationEntityMarks({
  pillar,
  series,
  pillarId,
  seriesId,
  className,
}: CreationEntityMarksProps) {
  const seriesLabel = markLabel(series?.name, seriesId, 'Série');
  const pillarLabel = markLabel(pillar?.nome, pillarId, 'Pilar');

  if (!seriesLabel && !pillarLabel) return null;

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      {seriesLabel ? (
        <EntityMark icon={ListVideo} kind="Série" label={seriesLabel} color={series?.cor} />
      ) : null}
      {pillarLabel ? (
        <EntityMark icon={Columns3} kind="Pilar" label={pillarLabel} color={pillar?.cor} />
      ) : null}
    </div>
  );
}

export function creationEntityHint(
  pillar?: Pilar | null,
  series?: Serie | null,
  pillarId?: string | null,
  seriesId?: string | null,
) {
  const seriesLabel = markLabel(series?.name, seriesId, 'Série');
  const pillarLabel = markLabel(pillar?.nome, pillarId, 'Pilar');
  return [
    seriesLabel ? `série ${seriesLabel}` : null,
    pillarLabel ? `pilar ${pillarLabel}` : null,
  ].filter(Boolean).join(', ');
}
