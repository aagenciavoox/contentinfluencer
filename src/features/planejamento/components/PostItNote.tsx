import type {CSSProperties} from 'react';
import {BookOpen, GripVertical, Tag} from 'lucide-react';
import {Badge} from '../../../components/ui/Badge';
import {cn, tintedTextColor} from '../../../lib/utils';
import type {Content, RedeSocial} from '../../../lib/database';
import {PlatformIcons} from '../../../components/ui/PlatformIcons';
import {postItKind, postItTitle, type PlanejamentoPostIt, type PostItKind} from '../lib/postIt';

export type PostItMark = {
  kind: 'serie' | 'funil' | 'pilar';
  nome: string;
  cor: string;
};

export const POST_IT_MIME = 'application/x-planejamento-postit';

export const KIND_LABEL: Record<PostItKind, string> = {
  vazio: 'Pauta',
  ideia: 'Ideia',
  roteiro: 'Roteiro',
  producao: 'Produção',
  edicao: 'Edição',
  postado: 'Publicado',
};

/** Cor por etapa — critério acessível e estável (não copia o mock). */
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
  edicao: cn(
    'border-[color-mix(in_srgb,var(--status-editing)_30%,var(--border-color))]',
    'border-l-[color:var(--status-editing)]',
    'bg-[color-mix(in_srgb,var(--status-editing)_12%,var(--bg-elevated))]',
    'hover:bg-[color-mix(in_srgb,var(--status-editing)_20%,var(--bg-elevated))]',
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

const TAGS_COMPACTAS = 2;

export function PostItNote({
  postIt,
  content,
  onOpen,
  onToggleSelect,
  selected = false,
  highlighted = false,
  dragIds,
  compact = false,
  seriesColor = null,
  marks = [],
  assuntos = [],
  obras = [],
  /** @deprecated Prefira `assuntos`. Mantido para chamadas antigas. */
  temas = [],
  redes = [],
  dimmed = false,
  draggable = true,
  className,
}: {
  postIt: PlanejamentoPostIt;
  content: Content | null;
  onOpen: () => void;
  onToggleSelect?: () => void;
  selected?: boolean;
  highlighted?: boolean;
  dragIds?: readonly string[];
  compact?: boolean;
  seriesColor?: string | null;
  marks?: PostItMark[];
  assuntos?: readonly string[];
  obras?: readonly string[];
  temas?: readonly string[];
  redes?: readonly RedeSocial[];
  dimmed?: boolean;
  draggable?: boolean;
  className?: string;
}) {
  const kind = postItKind(postIt, content);
  const accent = kind === 'vazio' ? null : seriesColor?.trim() || null;
  const quadro = marks.find(mark => mark.kind === 'serie')?.nome ?? null;
  const assuntosVisiveis = kind === 'vazio' ? [] : (assuntos.length > 0 ? assuntos : temas);
  const obrasVisiveis = kind === 'vazio' ? [] : obras;

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
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
        if (!draggable) return;
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
        'flex w-full items-start gap-1.5 rounded-[var(--radius-sm)] border border-l-[3px] px-2 py-2 text-left shadow-[var(--shadow-soft)]',
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        accent ? SERIES_SURFACE : KIND_SURFACE[kind],
        'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
        selected && 'bg-[var(--bg-hover)]',
        highlighted && 'ring-2 ring-[var(--brand-accent)] ring-offset-1 ring-offset-[var(--bg-elevated)]',
        dimmed && 'opacity-40',
        className,
      )}
    >
      {draggable ? <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" aria-hidden /> : null}
      <span className="min-w-0 flex-1 stack-xs">
        <span className="flex items-start justify-between gap-1.5">
          <span
            className={cn(
              'block min-w-0 whitespace-normal break-words font-semibold leading-snug text-[var(--text-primary)]',
              compact ? 'text-xs' : 'text-sm',
            )}
          >
            {postItTitle(postIt, content)}
          </span>
          {redes.length > 0 ? <PlatformIcons redes={redes} className="ml-auto shrink-0" /> : null}
        </span>
        {quadro ? (
          <span
            className={cn(
              'block min-w-0 truncate text-[var(--text-secondary)]',
              compact ? 'text-2xs' : 'text-xs',
            )}
            title={quadro}
          >
            {quadro}
          </span>
        ) : null}
        <PostItAssuntosObras assuntos={assuntosVisiveis} obras={obrasVisiveis} compact={compact} />
        <Badge
          variant={kind === 'vazio' ? 'neutral' : 'status'}
          status={kind === 'vazio' ? undefined : KIND_LABEL[kind]}
          className={cn(compact && 'px-1.5 py-0 text-2xs')}
        >
          {KIND_LABEL[kind]}
        </Badge>
      </span>
    </div>
  );
}

export function PostItAssuntosObras({
  assuntos,
  obras,
  compact = false,
}: {
  assuntos: readonly string[];
  obras?: readonly string[];
  compact?: boolean;
}) {
  const tags = [
    ...assuntos.map(nome => ({nome, kind: 'assunto' as const})),
    ...(obras ?? []).map(nome => ({nome, kind: 'obra' as const})),
  ];
  if (tags.length === 0) return null;
  const visiveis = compact ? tags.slice(0, TAGS_COMPACTAS) : tags;
  const resto = tags.length - visiveis.length;
  return (
    <span className="flex flex-wrap gap-1" title={compact && resto > 0 ? tags.map(tag => tag.nome).join(', ') : undefined}>
      {visiveis.map(tag => (
        <Badge
          key={`${tag.kind}:${tag.nome}`}
          variant="tag"
          className={cn('max-w-full gap-0.5 text-2xs', compact && 'px-1.5 py-0')}
        >
          {tag.kind === 'obra'
            ? <BookOpen className="h-2.5 w-2.5 shrink-0" aria-hidden />
            : <Tag className="h-2.5 w-2.5 shrink-0" aria-hidden />}
          <span className="truncate">{tag.nome}</span>
        </Badge>
      ))}
      {resto > 0 ? (
        <Badge variant="neutral" className="px-1.5 py-0 text-2xs">+{resto}</Badge>
      ) : null}
    </span>
  );
}

/** @deprecated Use PostItAssuntosObras. */
export function PostItTemas({temas, compact = false}: {temas: readonly string[]; compact?: boolean}) {
  return <PostItAssuntosObras assuntos={temas} compact={compact} />;
}

export function PostItIdentity({marks, className}: {marks: PostItMark[]; className?: string}) {
  if (marks.length === 0) return null;
  return (
    <span className={cn('mb-1 flex flex-wrap items-center gap-1.5', className)}>
      {marks.map(mark => (
        <span
          key={mark.kind}
          className="inline-flex max-w-full items-center gap-1 text-2xs text-[var(--text-secondary)]"
          title={mark.nome}
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{backgroundColor: mark.cor ? tintedTextColor(mark.cor) : 'var(--text-tertiary)'}}
            aria-hidden
          />
          <span className="truncate">{mark.nome}</span>
        </span>
      ))}
    </span>
  );
}
