import { MoreMenu, type MoreMenuItem } from '../../../components/ui/MoreMenu';
import { cn } from '../../../lib/utils';

interface CreationItemMenuProps {
  items: MoreMenuItem[];
  label?: string;
  /** Keep visible when parent is hovered/focused or menu is open. */
  alwaysVisible?: boolean;
  className?: string;
  triggerClassName?: string;
}

export function CreationItemMenu({
  items,
  label = 'Mais ações',
  alwaysVisible = false,
  className,
  triggerClassName,
}: CreationItemMenuProps) {
  if (items.length === 0) return null;

  return (
    <MoreMenu
      items={items}
      label={label}
      size="sm"
      className={className}
      triggerClassName={cn(
        // O ⋯ fica sempre visível: ação escondida até o hover não existe para quem não passou o mouse.
        'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]',
        alwaysVisible && 'opacity-100',
        triggerClassName,
      )}
    />
  );
}
