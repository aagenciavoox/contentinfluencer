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
        'border-transparent bg-transparent text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
        'opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100',
        'aria-expanded:opacity-100',
        alwaysVisible && 'opacity-100',
        triggerClassName,
      )}
    />
  );
}
