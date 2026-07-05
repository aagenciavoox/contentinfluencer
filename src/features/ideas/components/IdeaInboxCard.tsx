import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BookOpen } from 'lucide-react';
import type { Idea } from '../../../lib/database';
import { getEntityTagStyle } from '../../../lib/utils';
import { getIdeaNotes, getIdeaTitle } from '../lib/ideaText';

interface IdeaInboxCardProps {
  idea: Idea;
  pilarNome: string | null;
  pilarCor: string | undefined;
  serieNome: string | null;
  serieCor: string | undefined;
  origemTitulo: string | null;
  onOpen: () => void;
}

function previewNotes(text: string, maxLines = 3): string {
  const lines = text.split('\n').slice(0, maxLines);
  const joined = lines.join('\n');
  if (text.split('\n').length > maxLines) return `${joined}…`;
  if (text.length > 220) return `${text.slice(0, 220).trim()}…`;
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
}: IdeaInboxCardProps) {
  const title = getIdeaTitle(idea);
  const notes = getIdeaNotes(idea);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="editorial-card group h-full w-full rounded-[var(--radius-input)] px-3 py-2.5 text-left transition-all hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/40"
    >
      <p className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)] break-words">
        {title}
      </p>
      {notes ? (
        <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap break-words">
          {previewNotes(notes)}
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
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
              {origemTitulo}
            </span>
          ) : null}
        </div>

        <time
          dateTime={idea.createdAt}
          className="shrink-0 text-xs font-medium tabular-nums text-[var(--text-tertiary)]"
        >
          {format(new Date(idea.createdAt), "d MMM", { locale: ptBR })}
        </time>
      </div>
    </button>
  );
}
