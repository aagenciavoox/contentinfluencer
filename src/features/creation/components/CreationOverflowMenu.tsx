import { MoreMenu, type MoreMenuItem } from '../../../components/ui/MoreMenu';
import { cn } from '../../../lib/utils';

interface CreationOverflowMenuProps {
  exportLabel: string;
  exportEnabled: boolean;
  exportMode: boolean;
  onToggleExport: () => void;
  cancelLabel?: string;
  extraItems?: MoreMenuItem[];
  className?: string;
}

/** Page-level ••• for selection actions (export and bulk edits). */
export function CreationOverflowMenu({
  exportLabel,
  exportEnabled,
  exportMode,
  onToggleExport,
  cancelLabel = 'Cancelar exportação',
  extraItems = [],
  className,
}: CreationOverflowMenuProps) {
  if (!exportEnabled && !exportMode) return null;

  return (
    <MoreMenu
      label="Mais opções da página"
      className={className}
      size="sm"
      triggerClassName={cn(
        'h-9 w-9 border-[var(--border-color)] bg-[var(--bg-secondary)]',
      )}
      items={[
        {
          id: 'export',
          label: exportMode ? cancelLabel : exportLabel,
          onClick: onToggleExport,
        },
        ...(exportMode ? [] : extraItems),
      ]}
    />
  );
}
