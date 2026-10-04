import type {CSSProperties} from 'react';
import {GripVertical} from 'lucide-react';
import {Badge} from '../../../components/ui/Badge';
import {Text} from '../../../components/ui/Text';
import {cn} from '../../../lib/utils';
import type {Content} from '../../../lib/database';
import {postItKind, postItTitle, type PlanejamentoPostIt} from '../lib/postIt';

export const POST_IT_MIME = 'application/x-planejamento-postit';

const KIND_LABEL = {
  vazio: 'Vazio',
  ideia: 'Ideia',
  roteiro: 'Roteiro',
} as const;

const KIND_SURFACE = {
  vazio: cn(
    'border-[color-mix(in_srgb,var(--accent-orange)_42%,var(--border-color))]',
    'bg-[color-mix(in_srgb,var(--accent-orange)_18%,var(--bg-elevated))]',
    'hover:bg-[color-mix(in_srgb,var(--accent-orange)_28%,var(--bg-elevated))]',
  ),
  ideia: cn(
    'border-[color-mix(in_srgb,var(--accent-purple)_42%,var(--border-color))]',
    'bg-[color-mix(in_srgb,var(--accent-purple)_18%,var(--bg-elevated))]',
    'hover:bg-[color-mix(in_srgb,var(--accent-purple)_28%,var(--bg-elevated))]',
  ),
  roteiro: cn(
    'border-[color-mix(in_srgb,var(--accent-green)_42%,var(--border-color))]',
    'bg-[color-mix(in_srgb,var(--accent-green)_18%,var(--bg-elevated))]',
    'hover:bg-[color-mix(in_srgb,var(--accent-green)_28%,var(--bg-elevated))]',
  ),
} as const;

const SERIES_SURFACE = cn(
  'border-[color-mix(in_srgb,var(--post-it-accent)_42%,var(--border-color))]',
  'bg-[color-mix(in_srgb,var(--post-it-accent)_18%,var(--bg-elevated))]',
  'hover:bg-[color-mix(in_srgb,var(--post-it-accent)_28%,var(--bg-elevated))]',
);

export function PostItNote({
  postIt,
  content,
  onOpen,
  compact = false,
  seriesColor = null,
  pilar = null,
}: {
  postIt: PlanejamentoPostIt;
  content: Content | null;
  onOpen: () => void;
  compact?: boolean;
  seriesColor?: string | null;
  pilar?: {nome: string; cor: string} | null;
}) {
  const kind = postItKind(postIt, content);
  const accent = kind === 'vazio' ? null : seriesColor?.trim() || null;
  const pilarNome = kind === 'vazio' ? '' : pilar?.nome?.trim() || '';
  const pilarCor = kind === 'vazio' ? '' : pilar?.cor?.trim() || '';
  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={event => {
        event.dataTransfer.setData(POST_IT_MIME, postIt.id);
        event.dataTransfer.setData('text/plain', postIt.id);
        event.dataTransfer.effectAllowed = 'move';
        event.stopPropagation();
      }}
      onClick={event => {
        event.stopPropagation();
        onOpen();
      }}
      onKeyDown={event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onOpen();
      }}
      style={accent ? ({'--post-it-accent': accent} as CSSProperties) : undefined}
      className={cn(
        'flex w-full cursor-grab items-start gap-1 rounded-[var(--radius-sm)] border px-2 py-1.5 text-left shadow-[var(--shadow-soft)] active:cursor-grabbing',
        accent ? SERIES_SURFACE : KIND_SURFACE[kind],
        'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
      )}
    >
      <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
      <span className="min-w-0 flex-1">
        {pilarNome || pilarCor ? (
          <span className="mb-1 flex min-w-0 items-start gap-1">
            {pilarCor ? (
              <span
                className="mt-0.5 h-2 w-2 shrink-0 rounded-full border border-[var(--border-color)]"
                style={{backgroundColor: pilarCor}}
                aria-hidden
              />
            ) : null}
            {pilarNome ? (
              <Text variant="meta" as="span" className="min-w-0 whitespace-normal break-words">
                {pilarNome}
              </Text>
            ) : null}
          </span>
        ) : null}
        <span
          className={cn(
            'block min-w-0 whitespace-normal break-words font-semibold leading-snug text-[var(--text-primary)]',
            compact ? 'text-xs' : 'text-sm',
          )}
        >
          {postItTitle(postIt, content)}
        </span>
        {compact ? null : (
          <Badge variant={kind === 'vazio' ? 'neutral' : 'status'} status={kind === 'vazio' ? undefined : KIND_LABEL[kind]} className="mt-1">
            {KIND_LABEL[kind]}
          </Badge>
        )}
      </span>
    </div>
  );
}
