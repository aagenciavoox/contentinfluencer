import type { Pilar, Serie } from '../../../lib/database';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';

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

interface EntityMarkModel {
  kind: 'Série' | 'Pilar';
  label: string;
  color?: string | null;
}

function resolveEntityMarks(
  pillar?: Pilar | null,
  series?: Serie | null,
  pillarId?: string | null,
  seriesId?: string | null,
): EntityMarkModel[] {
  const seriesLabel = markLabel(series?.name, seriesId, 'Série');
  const pillarLabel = markLabel(pillar?.nome, pillarId, 'Pilar');
  const marks: EntityMarkModel[] = [];
  if (seriesLabel) marks.push({ kind: 'Série', label: seriesLabel, color: series?.cor });
  if (pillarLabel) marks.push({ kind: 'Pilar', label: pillarLabel, color: pillar?.cor });
  return marks;
}

function describeMark(mark: EntityMarkModel) {
  return `${mark.kind}: ${mark.label}`;
}

/**
 * Uma etiqueta visível: a série (bolinha na cor dela + nome) ou, sem série, o pilar.
 * O restante vira "+N"; o `title` lista todos os nomes.
 */
export function CreationEntityMarks({
  pillar,
  series,
  pillarId,
  seriesId,
  className,
}: CreationEntityMarksProps) {
  const marks = resolveEntityMarks(pillar, series, pillarId, seriesId);
  if (marks.length === 0) return null;

  const [primary, ...rest] = marks;

  return (
    <div
      className={cn('inline-flex min-w-0 max-w-full items-center gap-1.5', className)}
      title={marks.map(describeMark).join(' · ')}
    >
      <span className="entity-tag-pill min-w-0 max-w-full px-2 py-0.5 text-2xs">
        <span
          className={cn('h-2 w-2 shrink-0 rounded-full', !primary.color && 'bg-[var(--text-tertiary)]')}
          style={primary.color ? { backgroundColor: primary.color } : undefined}
          aria-hidden
        />
        <span className="sr-only">{primary.kind}: </span>
        <span className="min-w-0 truncate">{primary.label}</span>
      </span>
      {rest.length > 0 ? (
        <Text variant="meta" as="span" className="shrink-0 leading-none">
          <span aria-hidden>+{rest.length}</span>
          <span className="sr-only">{rest.map(describeMark).join(', ')}</span>
        </Text>
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
