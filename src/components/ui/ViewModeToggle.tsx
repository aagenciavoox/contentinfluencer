import { LucideIcon } from 'lucide-react';
import { SegmentTabs } from './SegmentTabs';

export interface ViewModeOption<T extends string> {
  value: T;
  label: string;
  icon: LucideIcon;
}

interface ViewModeToggleProps<T extends string> {
  value: T;
  options: ViewModeOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  /** @deprecated O seletor segue o `SegmentTabs`; o tamanho é o mesmo em todo o app. */
  buttonClassName?: string;
  /** @deprecated O rótulo aparece sempre: ícone sozinho não dizia qual vista era. */
  showLabels?: boolean;
  /** @deprecated Mantido para chamadas antigas; o visual é o do `SegmentTabs`. */
  tone?: 'default' | 'raised';
  ariaLabel?: string;
}

/**
 * Trocar de vista (Grade, Lista, Kanban; Escrita, Gestão) usa o mesmo seletor das abas,
 * para "escolher uma opção" ter um desenho só no app.
 */
export function ViewModeToggle<T extends string>({
  value,
  options,
  onChange,
  className,
  ariaLabel,
}: ViewModeToggleProps<T>) {
  return (
    <SegmentTabs<T>
      ariaLabel={ariaLabel}
      className={className}
      value={value}
      onChange={onChange}
      options={options.map(option => {
        const Icon = option.icon;
        return { id: option.value, label: option.label, icon: <Icon className="h-3.5 w-3.5" /> };
      })}
    />
  );
}
