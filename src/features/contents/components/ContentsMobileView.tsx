import { Content } from '../../../lib/database';
import { ContentTable } from './ContentTable';
import { SortDirection, SortField } from '../types';

interface ContentsMobileViewProps {
  contents: Content[];
  lookAlerts: Record<string, string>;
  sortField: SortField;
  sortDirection: SortDirection;
  selectedIds: Set<string>;
  onSelect: (content: Content) => void;
  onSort: (field: SortField) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
}

export function ContentsMobileView(props: ContentsMobileViewProps) {
  return <ContentTable {...props} />;
}
