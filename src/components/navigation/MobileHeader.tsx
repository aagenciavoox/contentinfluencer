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
        'md:hidden fixed top-0 left-0 right-0 flex items-center justify-between px-5 pt-10 pb-4 bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border-color)] z-[60] shadow-sm transition-transform duration-300 ease-in-out h-24',
        isHidden ? '-translate-y-full' : 'translate-y-0'
      )}
    >
      <button
        onClick={onMenuClick}
        className="p-3 -ml-3 hover:bg-[var(--bg-hover)] rounded-2xl transition-colors active:scale-90"
      >
        <Menu className="w-6 h-6 text-[var(--text-primary)]" />
      </button>
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-primary)] animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)] opacity-90">
          Core Creator
        </span>
      </div>
      <div className="w-12" />
    </div>
  );
}
