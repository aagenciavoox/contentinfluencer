import type { ReactNode } from 'react';
import { Text } from '../../../components/ui/Text';
import { ValorVazio } from '../../../components/ui/ValorVazio';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { cn } from '../../../lib/utils';

interface BookDetailHeaderProps {
  title: string;
  creator?: string;
  typeLabel: string;
  status?: string;
  backLabel: string;
  backTo: string;
  actions?: ReactNode;
}

// Ponto do selo de status: rosa em andamento, verde concluído, cinza no resto (quero ler, abandonado).
const STATUS_DOT: Record<string, string> = {
  Lendo: 'bg-[var(--brand-accent)]',
  Assistindo: 'bg-[var(--brand-accent)]',
  Consumindo: 'bg-[var(--brand-accent)]',
  Lido: 'bg-[var(--accent-green)]',
  Assistido: 'bg-[var(--accent-green)]',
  'Concluído': 'bg-[var(--accent-green)]',
};

/**
 * Cabeçalho do item da Biblioteca no desktop: título, autor/tipo/status e ações principais.
 * A navegação por abas fica separada na região `navigation` do `PageLayout`.
 */
export function BookDetailHeader({
  title,
  creator,
  typeLabel,
  status,
  backLabel,
  backTo,
  actions,
}: BookDetailHeaderProps) {
  return (
    <DesktopPageHeader
      section={backLabel}
      title={title}
      backLabel={backLabel}
      backTo={backTo}
      actions={actions}
      titleContent={(
        <div className="min-w-0">
          <Text variant="pageTitle" as="h1" className="truncate text-[var(--text-primary)]">
            {title}
          </Text>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 t-body text-[var(--text-secondary)]">
            <span className="truncate">{creator?.trim() ? creator : <ValorVazio />}</span>
            <span aria-hidden className="text-[var(--text-tertiary)]">•</span>
            <span>{typeLabel}</span>
            {status ? (
              <>
                <span aria-hidden className="text-[var(--text-tertiary)]">•</span>
                <Text variant="secondary" as="span" className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--bg-hover)] px-2.5 py-0.5 text-[var(--text-primary)]">
                  <span aria-hidden className={cn('h-2 w-2 rounded-full', STATUS_DOT[status] ?? 'bg-[var(--text-tertiary)]')} />
                  {status}
                </Text>
              </>
            ) : null}
          </div>
        </div>
      )}
    />
  );
}
