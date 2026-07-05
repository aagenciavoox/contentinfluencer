import { FileText } from 'lucide-react';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { Text } from '../../../../components/ui/Text';
import type { SeriesContentTab } from '../../lib/computeSeriesContentStats';
import { seriesListItemId, type SeriesListItem } from '../../lib/seriesContentListUtils';
import { SeriesContentListRow } from './SeriesContentListRow';

function tabLabel(tab: SeriesContentTab): string {
  if (tab === 'ideias') return 'ideias';
  if (tab === 'roteiros') return 'roteiros';
  return 'conteúdos';
}

interface SeriesContentListProps {
  items: SeriesListItem[];
  totalCount: number;
  tab: SeriesContentTab;
  onItemClick: (item: SeriesListItem) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function SeriesContentList({
  items,
  totalCount,
  tab,
  onItemClick,
  emptyTitle = 'Nenhum conteúdo encontrado',
  emptyDescription = 'Crie um roteiro ou ideia para começar.',
}: SeriesContentListProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-8 w-8 opacity-40" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  const label = tabLabel(tab);

  return (
    <div className="stack-md">
      <div className="stack-sm">
        {items.map(item => (
          <SeriesContentListRow
            key={seriesListItemId(item)}
            item={item}
            onClick={() => onItemClick(item)}
          />
        ))}
      </div>

      <Text variant="meta" className="text-center text-[var(--text-tertiary)]">
        Mostrando {items.length} de {totalCount} {label}
      </Text>
    </div>
  );
}
