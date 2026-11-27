import type { ReactNode } from 'react';
import { AppButton } from '../../components/ui/AppButton';
import { Text } from '../../components/ui/Text';
import { cn } from '../../lib/utils';

export interface StickyActionConfig {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  leftIcon?: ReactNode;
}

interface MobileStickyActionBarProps {
  summary?: ReactNode;
  secondaryAction?: StickyActionConfig;
  primaryAction: StickyActionConfig;
  /** Fica acima da barra inferior por padrão; use `false` em telas com `hideBottomNav`. */
  aboveBottomNav?: boolean;
  ariaLabel?: string;
  className?: string;
}

export function MobileStickyActionBar({
  summary,
  secondaryAction,
  primaryAction,
  aboveBottomNav = true,
  ariaLabel = 'Ações da seleção',
  className,
}: MobileStickyActionBarProps) {
  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className={cn(
        'fixed inset-x-0 z-40 border-t border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 py-3 shadow-[var(--shadow-dropdown)]',
        aboveBottomNav
          ? 'bottom-[calc(3.5rem+1px+max(0.25rem,env(safe-area-inset-bottom,0px)))]'
          : 'bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]',
        className,
      )}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-2">
        {summary ? (
          <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
            {summary}
          </Text>
        ) : null}
        <div className="flex items-center gap-3">
          {secondaryAction ? (
            <AppButton
              variant="secondary"
              onClick={secondaryAction.onClick}
              disabled={secondaryAction.disabled}
              leftIcon={secondaryAction.leftIcon}
              className="flex-1"
            >
              {secondaryAction.label}
            </AppButton>
          ) : null}
          <AppButton
            variant="primary"
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
            leftIcon={primaryAction.leftIcon}
            className="flex-1"
          >
            {primaryAction.label}
          </AppButton>
        </div>
      </div>
    </div>
  );
}
