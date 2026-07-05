import { FilterBar } from '../../../../components/ui/FilterBar';
import { CONTENT_STATUS } from '../../../contents/lib/contentPipeline';

interface SeriesContentsFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusValue: string;
  onStatusChange: (value: string) => void;
  sortValue: string;
  onSortChange: (value: string) => void;
}

const STATUS_OPTIONS = [
  { value: 'Todos', label: 'Todos' },
  { value: CONTENT_STATUS.IDEIA, label: CONTENT_STATUS.IDEIA },
  { value: CONTENT_STATUS.ROTEIRO, label: CONTENT_STATUS.ROTEIRO },
  { value: CONTENT_STATUS.PRODUCAO, label: CONTENT_STATUS.PRODUCAO },
  { value: CONTENT_STATUS.POSTADO, label: CONTENT_STATUS.POSTADO },
];

const SORT_OPTIONS = [
  { value: 'updatedAt:desc', label: 'Mais recentes' },
  { value: 'createdAt:desc', label: 'Criação' },
  { value: 'title:asc', label: 'Título A-Z' },
];

export function SeriesContentsFilterBar({
  searchValue,
  onSearchChange,
  statusValue,
  onStatusChange,
  sortValue,
  onSortChange,
}: SeriesContentsFilterBarProps) {
  return (
    <FilterBar
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder="Buscar título ou texto…"
      filters={[
        {
          id: 'status',
          label: 'Status',
          value: statusValue,
          onChange: onStatusChange,
          options: STATUS_OPTIONS,
        },
      ]}
      sortValue={sortValue}
      sortOptions={SORT_OPTIONS}
      onSortChange={onSortChange}
    />
  );
}
