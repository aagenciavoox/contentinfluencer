import { MoreMenu } from '../../../components/ui/MoreMenu';
import { cn } from '../../../lib/utils';

interface CreationOverflowMenuProps {
  exportLabel: string;
  exportEnabled: boolean;
  exportMode: boolean;
  onToggleExport: () => void;
  className?: string;
}

/** Page-level ••• for secondary actions (export). */
export function CreationOverflowMenu({
  exportLabel,
  exportEnabled,
  exportMode,
  onToggleExport,
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
          label: exportMode ? 'Cancelar exportação' : exportLabel,
          onClick: onToggleExport,
        },
      ]}
    />
  );
}
