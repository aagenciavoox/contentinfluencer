import type { ReactNode } from 'react';
import { ChevronLeft, Menu } from 'lucide-react';
import { Text } from '../../components/ui/Text';
import { cn } from '../../lib/utils';

interface MobileHeaderIOSProps {
  title: string;
  subtitle?: string;
  mode?: 'menu' | 'back';
  titleVariant?: 'default' | 'compact-center';
  isHidden?: boolean;
  leftActionLabel?: string;
  rightActionLabel?: string;
  onLeftAction?: () => void;
  onRightAction?: () => void;
  rightActionIcon?: ReactNode;
}

export function MobileHeaderIOS({
  title,
  subtitle,
  mode = 'menu',
  titleVariant = 'default',
  isHidden = false,
  leftActionLabel,
  rightActionLabel,
  onLeftAction,
  onRightAction,
  rightActionIcon,
}: MobileHeaderIOSProps) {
  const leftLabel = leftActionLabel ?? (mode === 'back' ? 'Voltar' : 'Abrir menu');
  const isCompactCenter = titleVariant === 'compact-center';

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-[70] transition-transform duration-300 ease-out',
        isHidden ? '-translate-y-full' : 'translate-y-0'
      )}
    >
      <div
        className="border-b border-[var(--border-color)] bg-[color-mix(in_srgb,var(--bg-primary)_88%,transparent)] px-4 backdrop-blur-xl"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 12px)',
          paddingBottom: isCompactCenter ? '12px' : '16px',
        }}
      >
        {isCompactCenter ? (
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label={leftLabel}
              onClick={onLeftAction}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm touch-manipulation active:scale-95"
            >
              {mode === 'back' ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <Text variant="itemTitle" truncate className="min-w-0 flex-1 text-center font-semibold tracking-tight text-[var(--text-secondary)]">
              {title}
            </Text>

            <button
              type="button"
              aria-label={rightActionLabel ?? 'Abrir busca global'}
              onClick={onRightAction}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm touch-manipulation active:scale-95"
            >
              {rightActionIcon ?? <Text variant="label" className="text-xs">CMD</Text>}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                aria-label={leftLabel}
                onClick={onLeftAction}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm touch-manipulation active:scale-95"
              >
                {mode === 'back' ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              <button
                type="button"
                aria-label={rightActionLabel ?? 'Abrir busca global'}
                onClick={onRightAction}
                className="flex h-11 min-w-11 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 text-[var(--text-primary)] shadow-sm touch-manipulation active:scale-95"
              >
                {rightActionIcon ?? <Text variant="label">CMD</Text>}
              </button>
            </div>

            <div className="space-y-1">
              <Text variant="pageTitle">{title}</Text>
              {subtitle ? (
                <Text variant="secondary" className="max-w-[24rem]">{subtitle}</Text>
              ) : null}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
