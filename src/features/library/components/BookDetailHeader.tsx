import type { ReactNode } from 'react';
import { Text } from '../../../components/ui/Text';
import { ValorVazio } from '../../../components/ui/ValorVazio';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';

interface BookDetailHeaderProps {
  title: string;
  creator?: string;
  typeLabel: string;
  backLabel: string;
  backTo: string;
  /** Status (seletor), ações e o ⋯; o status mora aqui para valer em qualquer aba. */
  actions?: ReactNode;
}

/**
 * Cabeçalho do item da Biblioteca no desktop: título, autor/tipo e ações principais.
 * A navegação por abas fica separada na região `navigation` do `PageLayout`.
 */
export function BookDetailHeader({
  title,
  creator,
  typeLabel,
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
          </div>
        </div>
      )}
    />
  );
}
