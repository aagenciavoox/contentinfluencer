import { Link } from 'react-router-dom';
import { ChevronRight, Clock, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '../../../../components/ui/Badge';
import { Text } from '../../../../components/ui/Text';
import type { Pilar, Serie } from '../../../../lib/database';
import { cn } from '../../../../lib/utils';

export type SeriesDetailMenuAction = 'edit' | 'toggle-active';

interface SeriesDetailHeaderProps {
  serie: Serie;
  pilares: Pilar[];
  contentCount: number;
  onEdit: () => void;
  onToggleMore: () => void;
  showMoreMenu: boolean;
  onMenuAction: (action: SeriesDetailMenuAction) => void;
}

export function SeriesDetailHeader({
  serie,
  pilares,
  contentCount,
  onEdit,
  onToggleMore,
  showMoreMenu,
  onMenuAction,
}: SeriesDetailHeaderProps) {
  const linkedPilares = pilares.filter(pilar => serie.pilarIds.includes(pilar.id));
  const lastEditLabel = serie.updatedAt
    ? formatDistanceToNow(new Date(serie.updatedAt), { addSuffix: true, locale: ptBR })
    : null;

  return (
    <header className="stack-lg">
      <nav className="flex flex-wrap items-center gap-1.5">
        <Link
          to="/configuracoes/series"
          className="text-[length:var(--font-size-meta)] font-medium text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          Séries
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-[var(--text-tertiary)]" aria-hidden />
        <Text variant="meta" className="text-[var(--text-secondary)]">
          {serie.name}
        </Text>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 stack-md">
          <Text variant="pageTitle" as="h1">
            {serie.name}
          </Text>

          <div className="flex flex-wrap items-center gap-2">
            {linkedPilares.map(pilar => (
              <Badge key={pilar.id} variant="tag">
                {pilar.nome}
              </Badge>
            ))}
            <Badge variant="neutral">
              {contentCount} conteúdo{contentCount === 1 ? '' : 's'}
            </Badge>
          </div>

          {serie.notes?.trim() ? (
            <Text variant="body" className="max-w-3xl text-[var(--text-secondary)]">
              {serie.notes}
            </Text>
          ) : null}

          {lastEditLabel ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
              <Text variant="meta" className="text-[var(--text-tertiary)]">
                Atualizada {lastEditLabel}
              </Text>
            </span>
          ) : null}
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={onToggleMore}
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            aria-label="Mais opções"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {showMoreMenu ? (
            <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] py-1 shadow-lg">
              <button
                type="button"
                className="flex w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                onClick={() => {
                  onToggleMore();
                  onMenuAction('edit');
                  onEdit();
                }}
              >
                Editar
              </button>
              <button
                type="button"
                className={cn(
                  'flex w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                  serie.ativa ? 'text-[var(--text-secondary)]' : 'text-[var(--accent-green)]',
                )}
                onClick={() => {
                  onToggleMore();
                  onMenuAction('toggle-active');
                }}
              >
                {serie.ativa ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
