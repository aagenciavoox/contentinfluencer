import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Archive, ArrowUpRight, BookOpen, Edit3 } from 'lucide-react';
import type { Idea } from '../../../lib/database';
import { Badge } from '../../../components/ui/Badge';
import { OverflowTags } from '../../../components/ui/OverflowTags';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { getEntityTagStyle } from '../../../lib/utils';
import { getIdeaNotes, getIdeaTitle } from '../lib/ideaText';
import { ideaHasClassification } from '../lib/ideaFilters';

interface IdeaInboxCardProps {
  idea: Idea;
  pilarNome: string | null;
  pilarCor: string | undefined;
  serieNome: string | null;
  serieCor: string | undefined;
  origemTitulo: string | null;
  onOpen: () => void;
  onPromote?: () => void;
  onArchive?: () => void;
  onEdit?: () => void;
  showActions?: boolean;
}

function previewNotes(text: string, maxLines = 2): string {
  const lines = text.split('\n').slice(0, maxLines);
  const joined = lines.join('\n');
  if (text.split('\n').length > maxLines) return `${joined}…`;
  if (text.length > 160) return `${text.slice(0, 160).trim()}…`;
  return joined;
}

export function IdeaInboxCard({
  idea,
  pilarNome,
  pilarCor,
  serieNome,
  serieCor,
  origemTitulo,
  onOpen,
  onPromote,
  onArchive,
  onEdit,
  showActions = true,
}: IdeaInboxCardProps) {
  const title = getIdeaTitle(idea);
  const notes = getIdeaNotes(idea);
  const hasClassification = ideaHasClassification(idea);
  const hasActions = showActions && !idea.archived && (onPromote || onArchive || onEdit);

  const tags = [
    serieNome ? (
      <span
        key="serie"
        className="status-pill text-xs font-medium uppercase tracking-[0.06em]"
        style={getEntityTagStyle(serieCor)}
      >
        {serieNome}
      </span>
    ) : null,
    pilarNome ? (
      <span
        key="pilar"
        className="status-pill text-xs font-medium uppercase tracking-[0.06em]"
        style={getEntityTagStyle(pilarCor)}
      >
        {pilarNome}
      </span>
    ) : null,
    origemTitulo ? (
      <span
        key="origem"
        className="status-pill gap-1 text-xs font-medium uppercase tracking-[0.06em] text-[var(--accent-orange)]"
      >
        <BookOpen className="h-3 w-3" />
        <span className="truncate">{origemTitulo}</span>
      </span>
    ) : null,
    !hasClassification ? <Badge key="unclassified" variant="neutral">Sem classificação</Badge> : null,
  ].filter(Boolean);

  return (
    <Surface
      as="div"
      variant="interactive"
      padding="md"
      onClick={onOpen}
      aria-label={`Abrir ideia ${title}`}
      className="group flex h-full min-h-[7.5rem] w-full cursor-pointer flex-col text-left"
    >
      {tags.length > 0 ? (
        <div className="mb-2">
          <OverflowTags items={tags} />
        </div>
      ) : null}

      <Text variant="itemTitle" className="line-clamp-2 leading-snug break-words">
        {title}
      </Text>
      {notes ? (
        <Text variant="secondary" className="mt-1 line-clamp-2 flex-1 whitespace-pre-wrap break-words">
          {previewNotes(notes)}
        </Text>
      ) : (
        <div className="flex-1" />
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <Text variant="meta" as="time" className="shrink-0 tabular-nums">
          {format(new Date(idea.createdAt), 'd MMM', { locale: ptBR })}
        </Text>

        {hasActions ? (
          <div
            className="card-actions flex shrink-0 items-center gap-0.5"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {onPromote ? (
              <button
                type="button"
                onClick={onPromote}
                title="Promover para roteiro"
                className="rounded-md p-1.5 text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            ) : null}
            {onEdit ? (
              <button
                type="button"
                onClick={onEdit}
                title="Editar"
                className="rounded-md p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            ) : null}
            {onArchive ? (
              <button
                type="button"
                onClick={onArchive}
                title="Arquivar"
                className="rounded-md p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              >
                <Archive className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </Surface>
  );
}
