import type {CSSProperties} from 'react';
import {Columns3, Filter, GripVertical, Layers, Tag, type LucideIcon} from 'lucide-react';
import {Badge} from '../../../components/ui/Badge';
import {cn} from '../../../lib/utils';
import type {Content} from '../../../lib/database';
import {postItKind, postItTitle, type PlanejamentoPostIt} from '../lib/postIt';

export type PostItMark = {
  kind: 'serie' | 'funil' | 'pilar';
  nome: string;
  cor: string;
};

const MARK_ICON: Record<PostItMark['kind'], LucideIcon> = {
  serie: Layers,
  funil: Filter,
  pilar: Columns3,
};

export const POST_IT_MIME = 'application/x-planejamento-postit';

const KIND_LABEL = {
  vazio: 'Vazio',
  ideia: 'Ideia',
  roteiro: 'Roteiro',
} as const;

const KIND_SURFACE = {
  vazio: cn(
    'border-[color-mix(in_srgb,var(--status-archived)_55%,var(--border-color))]',
    'bg-[color-mix(in_srgb,var(--status-archived)_28%,var(--bg-elevated))]',
    'hover:bg-[color-mix(in_srgb,var(--status-archived)_40%,var(--bg-elevated))]',
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
  marks = [],
  temas = [],
  dimmed = false,
}: {
  postIt: PlanejamentoPostIt;
  content: Content | null;
  onOpen: () => void;
  compact?: boolean;
  seriesColor?: string | null;
  marks?: PostItMark[];
  temas?: readonly string[];
  dimmed?: boolean;
}) {
  const kind = postItKind(postIt, content);
  const accent = kind === 'vazio' ? null : seriesColor?.trim() || null;
  const visibleMarks = kind === 'vazio' ? [] : marks;
  const visibleTemas = kind === 'vazio' ? [] : temas;
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
        dimmed && 'opacity-40',
      )}
    >
      <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
      <span className="min-w-0 flex-1">
        <PostItIdentity marks={visibleMarks} />
        <span
          className={cn(
            'block min-w-0 whitespace-normal break-words font-semibold leading-snug text-[var(--text-primary)]',
            compact ? 'text-xs' : 'text-sm',
          )}
        >
          {postItTitle(postIt, content)}
        </span>
        <PostItTemas temas={visibleTemas} compact={compact} />
        {compact ? null : (
          <Badge variant={kind === 'vazio' ? 'neutral' : 'status'} status={kind === 'vazio' ? undefined : KIND_LABEL[kind]} className="mt-1">
            {KIND_LABEL[kind]}
          </Badge>
        )}
      </span>
    </div>
  );
}

const TEMAS_VISIVEIS_COMPACTO = 2;

export function PostItTemas({temas, compact = false}: {temas: readonly string[]; compact?: boolean}) {
  if (temas.length === 0) return null;
  const visiveis = compact ? temas.slice(0, TEMAS_VISIVEIS_COMPACTO) : temas;
  const resto = temas.length - visiveis.length;
  return (
    <span className="mt-1 flex flex-wrap gap-1" title={compact && resto > 0 ? temas.join(', ') : undefined}>
      {visiveis.map(tema => (
        <Badge
          key={tema}
          variant="neutral"
          className={cn('max-w-full gap-0.5', compact && 'px-1.5 py-0 text-2xs')}
        >
          <Tag className="h-2.5 w-2.5 shrink-0" aria-hidden />
          <span className="truncate">{tema}</span>
        </Badge>
      ))}
      {resto > 0 ? (
        <Badge variant="neutral" className="px-1.5 py-0 text-2xs">+{resto}</Badge>
      ) : null}
    </span>
  );
}

export function PostItIdentity({marks}: {marks: PostItMark[]}) {
  if (marks.length === 0) return null;
  return (
    <span className="mb-1 flex items-center gap-1.5">
      {marks.map(mark => {
        const Icon = MARK_ICON[mark.kind];
        return (
          <span key={mark.kind} title={mark.nome} aria-label={mark.nome} className="group/mark relative inline-flex">
            <Icon className="h-3.5 w-3.5 shrink-0" style={{color: mark.cor}} aria-hidden />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-sm)] bg-[var(--text-primary)] px-1.5 py-0.5 text-2xs text-[var(--bg-elevated)] group-hover/mark:block">
              {mark.nome}
            </span>
          </span>
        );
      })}
    </span>
  );
}
