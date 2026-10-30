import {Text} from '../../../components/ui/Text';
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

export const CONTENT_MIME = 'application/x-planejamento-content';
export const POST_IT_MIME = 'application/x-planejamento-postit';

export const KIND_LABEL: Record<PostItKind, string> = {
  vazio: 'Pauta',
  ideia: 'Ideia',
  roteiro: 'Roteiro',
  producao: 'Produção',
  edicao: 'Edição',
  postado: 'Publicado',
};

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
  stage,
  caption,
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
  postIt?: PlanejamentoPostIt;
  stage?: PostItKind;
  caption?: string;
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
  const kind = stage ?? postItKind(postIt ?? null, content);
  const accent = seriesColor?.trim() || null;
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
        if (!postIt) {
          if (content) event.dataTransfer.setData(CONTENT_MIME, content.id);
          event.dataTransfer.effectAllowed = 'copyMove';
          event.stopPropagation();
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
        accent ? SERIES_SURFACE : 'border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)]',
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
          <Text variant={compact ? 'secondary' : 'bodyStrong'} as="span"
            className="block min-w-0 whitespace-normal [overflow-wrap:break-word] [word-break:normal] leading-snug text-[var(--text-primary)]">
            {postIt ? postItTitle(postIt, content) : content?.title || 'Sem título'}
          </Text>
        </span>
        {quadro ? <Text variant="meta" as="span" className="block min-w-0 truncate text-[var(--text-secondary)]" title={quadro}>{quadro}</Text> : null}
        <PostItAssuntosObras assuntos={assuntosVisiveis} obras={obrasVisiveis} compact={compact} />
        <Badge
          variant={kind === 'vazio' ? 'neutral' : 'status'}
          status={kind === 'vazio' ? undefined : KIND_LABEL[kind]}
          className={cn(compact && 'px-1.5 py-0 text-2xs')}
        >
          {KIND_LABEL[kind]}
        </Badge>
        {caption ? <Text variant="meta" as="span" className="block text-[var(--text-secondary)]">{caption}</Text> : null}
        {redes.length > 0 ? <span className="mt-1 flex items-center gap-1 border-t border-[var(--border-color)] pt-1"><PlatformIcons redes={redes} /></span> : null}
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
