import { Menu } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MobileHeaderProps {
  isHidden: boolean;
  onMenuClick: () => void;
}

export function MobileHeader({ isHidden, onMenuClick }: MobileHeaderProps) {
  return (
    <div
      className={cn(
        'md:hidden fixed top-0 left-0 right-0 z-[60] bg-[#F7F7FA]/88 px-6 pb-4 backdrop-blur-[16px] transition-transform duration-300 ease-in-out dark:bg-[color-mix(in_srgb,var(--bg-secondary)_86%,transparent)]',
        isHidden ? '-translate-y-full' : 'translate-y-0'
      )}
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
    >
      <div className="flex h-14 items-center justify-between">
        <button
          onClick={onMenuClick}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-white/75 text-[var(--text-primary)] shadow-[0_8px_24px_rgba(0,0,0,0.06)] backdrop-blur-[16px] transition-transform active:scale-95 dark:bg-white/10"
          aria-label="Abrir menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="h-14 w-14 shrink-0" aria-hidden="true" />
      </div>
    </div>
  );
}
