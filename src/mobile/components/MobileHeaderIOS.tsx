import type { ReactNode } from 'react';
import { ChevronLeft, Menu } from 'lucide-react';
import { Text } from '../../components/ui/Text';
import { cn } from '../../lib/utils';

interface MobileHeaderIOSProps {
  title: string;
  subtitle?: string;
  mode?: 'menu' | 'back';
  titleVariant?: 'default' | 'compact-center';
  showBrandLogo?: boolean;
  isHidden?: boolean;
  leftActionLabel?: string;
  rightActionLabel?: string;
  onLeftAction?: () => void;
  onRightAction?: () => void;
  rightActionIcon?: ReactNode;
}

export function MobileHeaderIOS({
  title,
  mode = 'menu',
  titleVariant = 'default',
  showBrandLogo = false,
  isHidden = false,
  leftActionLabel,
  rightActionLabel,
  onLeftAction,
  onRightAction,
  rightActionIcon,
}: MobileHeaderIOSProps) {
  const leftLabel = leftActionLabel ?? (mode === 'back' ? 'Voltar' : 'Abrir menu');
  const isCompactCenter = titleVariant === 'compact-center';

  const actionButtonClassName = cn(
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-color)]',
    'bg-[var(--bg-secondary)] text-[var(--text-primary)] touch-manipulation active:scale-95',
    'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring-brand)]',
  );

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-[70] transition-transform duration-300 ease-out motion-reduce:transition-none',
        isHidden ? '-translate-y-full' : 'translate-y-0',
      )}
    >
      <div
        className="border-b border-[var(--border-color)] bg-[color-mix(in_srgb,var(--bg-primary)_92%,transparent)] px-4 backdrop-blur-xl"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex h-14 max-h-14 items-center gap-2">
          <button
            type="button"
            aria-label={leftLabel}
            onClick={onLeftAction}
            className={actionButtonClassName}
          >
            {mode === 'back' ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {showBrandLogo ? (
            <img
              src="/brand/criaki-logo-light.png"
              alt="Criaki"
              className="mx-auto h-7 w-auto max-w-[7rem] object-contain object-center"
            />
          ) : (
            <Text
              variant="pageTitle"
              truncate
              className={cn(
                'min-w-0 flex-1 font-bold tracking-tight text-[var(--text-primary)]',
                isCompactCenter ? 'text-center' : 'text-left',
              )}
            >
              {title}
            </Text>
          )}

          <button
            type="button"
            aria-label={rightActionLabel ?? 'Abrir busca global'}
            onClick={onRightAction}
            className={actionButtonClassName}
          >
            {rightActionIcon ?? <Text variant="label" className="text-xs">CMD</Text>}
          </button>
        </div>
      </div>
    </header>
  );
}
