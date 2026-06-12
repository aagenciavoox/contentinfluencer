import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Archive, BookOpen, Edit3, FileText } from 'lucide-react';
import type { Idea } from '../../../lib/database';
import { cn, getEntityTagStyle } from '../../../lib/utils';

interface IdeaInboxCardProps {
  idea: Idea;
  pilarNome: string | null;
  pilarCor: string | undefined;
  serieNome: string | null;
  serieCor: string | undefined;
  origemTitulo: string | null;
  onPromote: () => void;
  onEdit: () => void;
  onArchive: () => void;
}

function previewText(text: string, maxLines = 3): string {
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
  onPromote,
  onEdit,
  onArchive,
}: IdeaInboxCardProps) {
  const hasTags = Boolean(pilarNome || serieNome || origemTitulo);

  return (
    <article className="editorial-card group h-full rounded-[var(--radius-input)] px-3 py-2.5 transition-all hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-soft)]">
      <p className="line-clamp-3 text-xs leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap break-words">
        {previewText(idea.text)}
      </p>

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
          {!hasTags ? (
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
              Sem classificação
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

      <div className="mt-2 flex items-center gap-0.5 border-t border-[var(--border-color)] pt-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
        <InboxAction
          label="Promover para roteiro"
          icon={FileText}
          onClick={onPromote}
          accent
        />
        <InboxAction label="Editar" icon={Edit3} onClick={onEdit} />
        <InboxAction label="Arquivar" icon={Archive} onClick={onArchive} />
      </div>
    </article>
  );
}

interface InboxActionProps {
  label: string;
  icon: typeof Edit3;
  onClick: () => void;
  accent?: boolean;
}

function InboxAction({ label, icon: Icon, onClick, accent }: InboxActionProps) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium uppercase tracking-[0.08em] transition-colors',
        accent
          ? 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
