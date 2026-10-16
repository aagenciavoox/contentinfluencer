import type {CSSProperties} from 'react';
import {Columns3, Filter, GripVertical, Layers, Tag, type LucideIcon} from 'lucide-react';
import {Badge} from '../../../components/ui/Badge';
import {cn} from '../../../lib/utils';
import type {Content, RedeSocial} from '../../../lib/database';
import {PlatformIcons} from '../../../components/ui/PlatformIcons';
import {postItKind, postItTitle, type PlanejamentoPostIt, type PostItKind} from '../lib/postIt';

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

export const KIND_LABEL: Record<PostItKind, string> = {
  vazio: 'Vazio',
  ideia: 'Ideia',
  roteiro: 'Roteiro',
  producao: 'Produção',
  postado: 'Postado',
};

// Faixa de 3px à esquerda na cor do tipo (ou da série) e fundo levemente tingido.
const KIND_SURFACE = {
  vazio: cn(
    'border-[color-mix(in_srgb,var(--status-archived)_55%,var(--border-color))]',
    'border-l-[color:var(--status-archived)]',
    'bg-[color-mix(in_srgb,var(--status-archived)_24%,var(--bg-elevated))]',
    'hover:bg-[color-mix(in_srgb,var(--status-archived)_34%,var(--bg-elevated))]',
  ),
  ideia: cn(
    'border-[color-mix(in_srgb,var(--accent-purple)_30%,var(--border-color))]',
    'border-l-[color:var(--accent-purple)]',
    'bg-[color-mix(in_srgb,var(--accent-purple)_12%,var(--bg-elevated))]',
    'hover:bg-[color-mix(in_srgb,var(--accent-purple)_20%,var(--bg-elevated))]',
  ),
  roteiro: cn(
    'border-[color-mix(in_srgb,var(--accent-green)_30%,var(--border-color))]',
    'border-l-[color:var(--accent-green)]',
    'bg-[color-mix(in_srgb,var(--accent-green)_12%,var(--bg-elevated))]',
    'hover:bg-[color-mix(in_srgb,var(--accent-green)_20%,var(--bg-elevated))]',
  ),
  producao: cn(
    'border-[color-mix(in_srgb,var(--status-production)_30%,var(--border-color))]',
    'border-l-[color:var(--status-production)]',
    'bg-[color-mix(in_srgb,var(--status-production)_12%,var(--bg-elevated))]',
    'hover:bg-[color-mix(in_srgb,var(--status-production)_20%,var(--bg-elevated))]',
  ),
  postado: cn(
    'border-[color-mix(in_srgb,var(--status-posted)_30%,var(--border-color))]',
    'border-l-[color:var(--status-posted)]',
    'bg-[color-mix(in_srgb,var(--status-posted)_12%,var(--bg-elevated))]',
    'hover:bg-[color-mix(in_srgb,var(--status-posted)_20%,var(--bg-elevated))]',
  ),
} satisfies Record<PostItKind, string>;

const SERIES_SURFACE = cn(
  'border-[color-mix(in_srgb,var(--post-it-accent)_30%,var(--border-color))]',
  'border-l-[color:var(--post-it-accent)]',
  'bg-[color-mix(in_srgb,var(--post-it-accent)_12%,var(--bg-elevated))]',
  'hover:bg-[color-mix(in_srgb,var(--post-it-accent)_20%,var(--bg-elevated))]',
);

export function PostItNote({
  postIt,
  content,
  onOpen,
  onToggleSelect,
  selected = false,
  dragIds,
  compact = false,
  seriesColor = null,
  marks = [],
  temas = [],
  redes = [],
  dimmed = false,
}: {
  postIt: PlanejamentoPostIt;
  content: Content | null;
  onOpen: () => void;
  onToggleSelect?: () => void;
  selected?: boolean;
  dragIds?: readonly string[];
  compact?: boolean;
  seriesColor?: string | null;
  marks?: PostItMark[];
  temas?: readonly string[];
  /** Redes onde vai sair: as do conteúdo puxado ou, sem elas, as do post-it. */
  redes?: readonly RedeSocial[];
  dimmed?: boolean;
}) {
  const kind = postItKind(postIt, content);
  const accent = kind === 'vazio' ? null : seriesColor?.trim() || null;
  // Sem conteúdo, as marcas são as do espaço: objetivo, série e pilar do próprio post-it.
  const visibleMarks = marks;
  const visibleTemas = kind === 'vazio' ? [] : temas;
  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      aria-pressed={onToggleSelect ? selected : undefined}
      onPointerDown={event => {
        if (event.button !== 0) return;
        if (!(event.ctrlKey || event.metaKey) || !onToggleSelect) return;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onMouseDown={event => {
        if (event.button !== 0) return;
        if (!(event.ctrlKey || event.metaKey) || !onToggleSelect) return;
        event.preventDefault();
        event.stopPropagation();
      }}
      onMouseUp={event => {
        if (event.button !== 0) return;
        if (!(event.ctrlKey || event.metaKey) || !onToggleSelect) return;
        event.preventDefault();
        event.stopPropagation();
        onToggleSelect();
      }}
      onDragStart={event => {
        if ((event.ctrlKey || event.metaKey) && onToggleSelect) {
          event.preventDefault();
          return;
        }
        const ids = dragIds && dragIds.length > 0 ? [...dragIds] : [postIt.id];
        if (!ids.includes(postIt.id)) ids.unshift(postIt.id);
        const payload = ids.join('\n');
        event.dataTransfer.setData(POST_IT_MIME, payload);
        event.dataTransfer.setData('text/plain', payload);
        event.dataTransfer.effectAllowed = 'move';
        event.stopPropagation();
      }}
      onClick={event => {
        event.stopPropagation();
        if ((event.ctrlKey || event.metaKey) && onToggleSelect) return;
        onOpen();
      }}
      onKeyDown={event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onOpen();
      }}
      style={{
        ...(accent ? ({'--post-it-accent': accent} as CSSProperties) : {}),
        ...(selected ? {boxShadow: 'inset 0 0 0 2px var(--text-primary)'} : {}),
      }}
      className={cn(
        'flex w-full cursor-grab items-start gap-1.5 rounded-[var(--radius-sm)] border border-l-[3px] px-2 py-2 text-left shadow-[var(--shadow-soft)] active:cursor-grabbing',
        accent ? SERIES_SURFACE : KIND_SURFACE[kind],
        'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
        selected && 'bg-[var(--bg-hover)]',
        dimmed && 'opacity-40',
      )}
    >
      <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
      <span className="min-w-0 flex-1">
        {visibleMarks.length > 0 || redes.length > 0 ? (
          <span className="mb-1 flex items-center justify-between gap-1.5">
            <PostItIdentity marks={visibleMarks} className="mb-0" />
            <PlatformIcons redes={redes} className="ml-auto" />
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
          variant="tag"
          className={cn('max-w-full gap-0.5 text-2xs', compact && 'px-1.5 py-0')}
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

export function PostItIdentity({marks, className}: {marks: PostItMark[]; className?: string}) {
  if (marks.length === 0) return null;
  return (
    <span className={cn('mb-1 flex items-center gap-1.5', className)}>
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
