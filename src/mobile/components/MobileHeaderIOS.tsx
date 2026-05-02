import type { ReactNode } from 'react';
import { ChevronLeft, Menu } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MobileHeaderIOSProps {
  title: string;
  subtitle?: string;
  mode?: 'menu' | 'back';
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
  isHidden = false,
  leftActionLabel,
  rightActionLabel,
  onLeftAction,
  onRightAction,
  rightActionIcon,
}: MobileHeaderIOSProps) {
  const leftLabel = leftActionLabel ?? (mode === 'back' ? 'Voltar' : 'Abrir menu');

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-[70] md:hidden transition-transform duration-300 ease-out',
        isHidden ? '-translate-y-full' : 'translate-y-0'
      )}
    >
      <div
        className="border-b border-[var(--border-color)] bg-[color-mix(in_srgb,var(--bg-primary)_88%,transparent)] px-4 pb-4 backdrop-blur-xl"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            aria-label={leftLabel}
            onClick={onLeftAction}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm active:scale-95"
          >
            {mode === 'back' ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <button
            type="button"
            aria-label={rightActionLabel ?? 'Abrir busca global'}
            onClick={onRightAction}
            className="flex h-11 min-w-11 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 text-[var(--text-primary)] shadow-sm active:scale-95"
          >
            {rightActionIcon ?? <span className="t-label">CMD</span>}
          </button>
        </div>

        <div className="space-y-1">
          <p className="t-page-title text-[var(--text-primary)]">{title}</p>
          {subtitle ? (
            <p className="t-secondary max-w-[24rem] text-[var(--text-secondary)]">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </header>
  );
}
