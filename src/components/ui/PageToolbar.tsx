import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface PageToolbarProps {
  /** Fileira de abas da tela (SegmentTabs / MobileSegmentTabs). */
  tabs?: ReactNode;
  /** Busca isolada, quando a página não usa FilterBar. */
  search?: ReactNode;
  /** Chips de filtro ou de escolha (FilterChips / MultiFilterChips / ChoiceChips). */
  chips?: ReactNode;
  /** Busca, filtros e ordenação combinados (FilterBar) ou controles avulsos. */
  filters?: ReactNode;
  /** Controle de ordenação quando não está dentro do FilterBar. */
  sort?: ReactNode;
  /** Controle de vista, sempre à direita. */
  view?: ReactNode;
  className?: string;
}

/**
 * Barra padrão de página, na ordem: abas → busca → chips → filtros → ordenar →
 * vista à direita. Cada slot é opcional; controles inexistentes são omitidos.
 */
export function PageToolbar({
  tabs,
  search,
  chips,
  filters,
  sort,
  view,
  className,
}: PageToolbarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {tabs ? <div className="flex min-w-0 items-center">{tabs}</div> : null}
      {search ? <div className="min-w-0 basis-64 flex-1">{search}</div> : null}
      {chips ? <div className="flex min-w-0 flex-wrap items-center gap-2">{chips}</div> : null}
      {filters ? <div className="min-w-0 flex-1">{filters}</div> : null}
      {sort ? <div className="flex shrink-0 items-center">{sort}</div> : null}
      {view ? <div className="ml-auto flex shrink-0 items-center gap-2">{view}</div> : null}
    </div>
  );
}
