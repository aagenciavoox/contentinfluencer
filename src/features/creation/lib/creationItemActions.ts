import type { Content } from '../../../lib/database';
import type { MoreMenuItem } from '../../../components/ui/MoreMenu';
import {
  CREATION_KANBAN_TABS,
  creationTabForContent,
  type CreationKanbanTab,
} from '../lib/creationItemPresentation';

export interface CreationItemActionHandlers {
  onPromote: (content: Content) => void;
  onArchive: (content: Content) => void;
  onRestore: (content: Content) => void;
  onPermanentDelete: (content: Content) => void;
  onMoveToTab?: (content: Content, tab: CreationKanbanTab) => void;
}

export function buildCreationItemMenuItems(
  content: Content,
  handlers: CreationItemActionHandlers,
  options?: { includeMoveActions?: boolean },
): MoreMenuItem[] {
  const deleted = Boolean(content.deletedAt);
  const archived = Boolean(content.archivedAt);
  const currentTab = creationTabForContent(content);
  const includeMove = Boolean(options?.includeMoveActions && handlers.onMoveToTab);

  if (deleted) {
    return [
      {
        id: 'restore',
        label: 'Restaurar',
        onClick: () => handlers.onRestore(content),
      },
      {
        id: 'delete',
        label: 'Excluir definitivamente',
        tone: 'danger',
        onClick: () => handlers.onPermanentDelete(content),
      },
    ];
  }

  if (archived) {
    return [
      {
        id: 'restore',
        label: 'Restaurar',
        onClick: () => handlers.onRestore(content),
      },
    ];
  }

  const items: MoreMenuItem[] = [];

  if (currentTab === 'Ideias') {
    items.push({
      id: 'promote',
      label: 'Virar roteiro',
      onClick: () => handlers.onPromote(content),
    });
  }

  if (includeMove && handlers.onMoveToTab) {
    CREATION_KANBAN_TABS.filter(tab => tab !== currentTab).forEach(tab => {
      items.push({
        id: `move-${tab}`,
        label: `Mover para ${tab}`,
        onClick: () => handlers.onMoveToTab?.(content, tab),
      });
    });
  }

  items.push({
    id: 'archive',
    label: 'Arquivar',
    onClick: () => handlers.onArchive(content),
  });

  return items;
}
