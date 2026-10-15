import { MoreMenu, type MoreMenuItem } from '../../../components/ui/MoreMenu';

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
      size="md"
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
