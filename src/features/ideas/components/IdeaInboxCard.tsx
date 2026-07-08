import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Archive, ArrowUpRight, BookOpen, Edit3 } from 'lucide-react';
import type { Idea } from '../../../lib/database';
import { Badge } from '../../../components/ui/Badge';
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

  return (
    <button
      type="button"
      onClick={onOpen}
      className="editorial-card editorial-card-interactive group flex h-full min-h-[7.5rem] w-full flex-col rounded-[var(--radius-input)] px-3 py-2.5 text-left transition-all hover:shadow-[var(--shadow-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/40"
    >
      <p className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)] break-words">
        {title}
      </p>
      {notes ? (
        <p className="mt-1 line-clamp-2 flex-1 text-xs leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap break-words">
          {previewNotes(notes)}
        </p>
      ) : (
        <div className="flex-1" />
      )}

      <div className="mt-2 flex items-center gap-2">
        <time
          dateTime={idea.createdAt}
          className="t-meta shrink-0 tabular-nums"
        >
          {format(new Date(idea.createdAt), "d MMM", { locale: ptBR })}
        </time>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {pilarNome ? (
            <span
              className="status-pill text-xs font-medium uppercase tracking-[0.06em]"
              style={getEntityTagStyle(pilarCor)}
            >
              {pilarNome}
            </span>
          ) : null}
          {serieNome ? (
            <span
              className="status-pill text-xs font-medium uppercase tracking-[0.06em]"
              style={getEntityTagStyle(serieCor)}
            >
              {serieNome}
            </span>
          ) : null}
          {origemTitulo ? (
            <span className="status-pill gap-1 text-xs font-medium uppercase tracking-[0.06em] text-[var(--accent-orange)]">
              <BookOpen className="h-3 w-3" />
              <span className="truncate">{origemTitulo}</span>
            </span>
          ) : null}
          {!hasClassification ? <Badge variant="neutral">Sem classificação</Badge> : null}
        </div>

        {hasActions ? (
          <div
            className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
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
    </button>
  );
}
