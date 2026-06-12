import type { ElementType } from 'react';
import { Calendar, FileText, Lightbulb, Plus, Video } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import type { ModuleFlags } from '../../features/settings/lib/moduleFlags';

interface MobileBottomNavProps {
  isActionOpen: boolean;
  onActionToggle: () => void;
  moduleFlags: ModuleFlags;
}

interface MobileNavItemConfig {
  to: string;
  label: string;
  icon: ElementType;
  module?: keyof ModuleFlags;
}

const navItems: MobileNavItemConfig[] = [
  { to: '/calendario', label: 'Agenda', icon: Calendar, module: 'calendar' },
  { to: '/conteudos', label: 'Pipeline', icon: FileText },
  { to: '/gravacao', label: 'Gravacao', icon: Video, module: 'recording' },
  { to: '/ideias', label: 'Ideias', icon: Lightbulb },
];

function MobileBottomNavItem({ to, label, icon: Icon }: MobileNavItemConfig) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-center transition-all duration-200',
          isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
        )
      }
    >
      <Icon className="h-5 w-5" />
      <span className="t-nav truncate uppercase">{label}</span>
    </NavLink>
  );
}

export function MobileBottomNav({ isActionOpen, onActionToggle, moduleFlags }: MobileBottomNavProps) {
  const visibleItems = navItems.filter((item) => !item.module || moduleFlags[item.module]);
  const splitIndex = Math.ceil(visibleItems.length / 2);
  const leftItems = visibleItems.slice(0, splitIndex);
  const rightItems = visibleItems.slice(splitIndex);

  return (
    <nav
      aria-label="Navegacao principal mobile"
      className="fixed inset-x-0 bottom-0 z-[80] border-t border-[var(--border-color)] bg-[color-mix(in_srgb,var(--bg-primary)_94%,transparent)] px-3 pb-safe pt-2 backdrop-blur-xl md:hidden"
    >
      <div className="flex min-h-11 items-end gap-1">
        <div
          className="grid min-w-0 flex-1 items-end gap-1"
          style={{ gridTemplateColumns: `repeat(${Math.max(leftItems.length, 1)}, minmax(0, 1fr))` }}
        >
          {leftItems.map((item) => (
            <MobileBottomNavItem key={item.to} {...item} />
          ))}
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            aria-label={isActionOpen ? 'Fechar acoes rapidas' : 'Abrir acoes rapidas'}
            aria-expanded={isActionOpen}
            onClick={onActionToggle}
            className={cn(
              'relative -top-5 flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-[1.75rem] border border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-[0_18px_40px_rgba(0,0,0,0.18)] transition-transform duration-200 active:scale-95',
              isActionOpen ? 'rotate-45' : ''
            )}
          >
            <Plus className="h-7 w-7" />
          </button>
        </div>

        <div
          className="grid min-w-0 flex-1 items-end gap-1"
          style={{ gridTemplateColumns: `repeat(${Math.max(rightItems.length, 1)}, minmax(0, 1fr))` }}
        >
          {rightItems.map((item) => (
            <MobileBottomNavItem key={item.to} {...item} />
          ))}
        </div>
      </div>
    </nav>
  );
}
