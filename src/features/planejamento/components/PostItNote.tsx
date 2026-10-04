import {GripVertical} from 'lucide-react';
import {Badge} from '../../../components/ui/Badge';
import {cn} from '../../../lib/utils';
import type {Content} from '../../../lib/database';
import {postItKind, postItTitle, type PlanejamentoPostIt} from '../lib/postIt';

export const POST_IT_MIME = 'application/x-planejamento-postit';

const KIND_LABEL = {
  vazio: 'Vazio',
  ideia: 'Ideia',
  roteiro: 'Roteiro',
} as const;

export function PostItNote({
  postIt,
  content,
  onOpen,
  compact = false,
}: {
  postIt: PlanejamentoPostIt;
  content: Content | null;
  onOpen: () => void;
  compact?: boolean;
}) {
  const kind = postItKind(postIt, content);
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
      className={cn(
        'flex w-full cursor-grab items-start gap-1 rounded-[var(--radius-sm)] border px-1.5 py-1 text-left shadow-[var(--shadow-soft)] active:cursor-grabbing',
        'border-[color-mix(in_srgb,var(--accent-orange)_42%,var(--border-color))]',
        'bg-[color-mix(in_srgb,var(--accent-orange)_18%,var(--bg-elevated))]',
        'hover:bg-[color-mix(in_srgb,var(--accent-orange)_28%,var(--bg-elevated))]',
        'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
      )}
    >
      <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className={cn('block font-semibold text-[var(--text-primary)]', compact ? 'truncate text-xs' : 'text-sm')}>
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
