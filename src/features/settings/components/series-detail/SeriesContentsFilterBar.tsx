import { FilterBar } from '../../../../components/ui/FilterBar';
import {
  SERIES_CONTENT_SORT_OPTIONS,
  SERIES_CONTENT_STATUS_OPTIONS,
} from '../../lib/seriesContentListUtils';

interface SeriesContentsFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusValue: string;
  onStatusChange: (value: string) => void;
  sortValue: string;
  onSortChange: (value: string) => void;
}

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
          options: [...SERIES_CONTENT_STATUS_OPTIONS],
        },
      ]}
      sortValue={sortValue}
      sortOptions={[...SERIES_CONTENT_SORT_OPTIONS]}
      onSortChange={onSortChange}
    />
  );
}
