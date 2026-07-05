import { MoreHorizontal, Plus } from 'lucide-react';
import { AppButton } from '../../../../components/ui/AppButton';

export type SeriesContentsToolbarAction = 'bulk-create';

interface SeriesContentsToolbarProps {
  onNewRoteiro: () => void;
  onNewIdeia: () => void;
  showMoreMenu: boolean;
  onToggleMore: () => void;
  onMenuAction?: (action: SeriesContentsToolbarAction) => void;
}

export function SeriesContentsToolbar({
  onNewRoteiro,
  onNewIdeia,
  showMoreMenu,
  onToggleMore,
  onMenuAction,
}: SeriesContentsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <AppButton variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={onNewRoteiro}>
        Novo roteiro
      </AppButton>
      <AppButton variant="secondary" leftIcon={<Plus className="h-4 w-4" />} onClick={onNewIdeia}>
        Nova ideia
      </AppButton>

      <div className="relative ml-auto">
        <button
          type="button"
          onClick={onToggleMore}
          className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          aria-label="Mais opções de criação"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {showMoreMenu ? (
          <div className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] py-1 shadow-lg">
            <button
              type="button"
              className="flex w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              onClick={() => {
                onToggleMore();
                onMenuAction?.('bulk-create');
              }}
            >
              Criar em lote
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
