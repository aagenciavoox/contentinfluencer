import { SegmentTabs } from '../../components/ui/SegmentTabs';

interface MobileSegmentTab<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface MobileSegmentTabsProps<T extends string> {
  tabs: readonly MobileSegmentTab<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Mantido por compatibilidade: o raio agora vem sempre do `SegmentTabs`. */
  rounded?: 'default' | 'tight';
  className?: string;
  ariaLabel?: string;
  /**
   * iOS contenteditable swallows the first click (it only blurs the editor).
   * Activate on pointerdown so a tab next to the script editor opens immediately.
   */
  activateOnPointerDown?: boolean;
  /** Trilho de largura toda com abas em partes iguais. */
  fullWidth?: boolean;
}

/**
 * Adaptador das telas mobile para o `SegmentTabs` (o único seletor de aba do app):
 * mesmo visual do computador, setas do teclado e borda esmaecida quando a fileira rola.
 * Para filtrar uma lista, use `FilterChips`.
 */
export function MobileSegmentTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
  ariaLabel,
  activateOnPointerDown = false,
  fullWidth = false,
}: MobileSegmentTabsProps<T>) {
  return (
    <SegmentTabs<T>
      options={tabs.map(tab => ({ id: tab.value, label: tab.label, count: tab.count }))}
      value={value}
      onChange={onChange}
      className={className}
      ariaLabel={ariaLabel}
      activateOnPointerDown={activateOnPointerDown}
      fullWidth={fullWidth}
    />
  );
}
