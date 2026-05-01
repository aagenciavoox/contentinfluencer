import { Content } from '../../../../lib/database';
import { ContentTable } from '../desktop/ContentTable';
import { SortDirection, SortField } from '../../types';

interface ContentsMobileProps {
  mode?: 'editorial' | 'postagem' | 'historico';
  contents: Content[];
  lookAlerts: Record<string, string>;
  sortField: SortField;
  sortDirection: SortDirection;
  selectedIds: Set<string>;
  onSelect: (content: Content) => void;
  onPreview: (content: Content) => void;
  onSort: (field: SortField) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
}

export function ContentsMobile(props: ContentsMobileProps) {
  return <ContentTable {...props} />;
}
