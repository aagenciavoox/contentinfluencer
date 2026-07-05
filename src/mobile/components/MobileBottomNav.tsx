import { NavLink, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ModuleFlags } from '../../features/settings/lib/moduleFlags';
import { MOBILE_BOTTOM_NAV_ITEMS, isNavItemHidden } from '../../layouts/navigation/navConfig';

interface MobileBottomNavProps {
  isActionOpen: boolean;
  onActionToggle: () => void;
  moduleFlags: ModuleFlags;
}

function MobileBottomNavItem({
  to,
  label,
  icon: Icon,
}: (typeof MOBILE_BOTTOM_NAV_ITEMS)[number]) {
  const location = useLocation();
  const pathname = to.split('?')[0];

  return (
    <NavLink
      to={to}
      className={() =>
        cn(
          'flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-center transition-all duration-200',
          location.pathname.startsWith(pathname)
            ? 'text-[var(--text-primary)]'
            : 'text-[var(--text-tertiary)]'
        )
      }
    >
      <Icon className="h-5 w-5 stroke-[1.75]" />
      <span className="t-nav truncate uppercase">{label}</span>
    </NavLink>
  );
}

export function MobileBottomNav({ isActionOpen, onActionToggle, moduleFlags }: MobileBottomNavProps) {
  const visibleItems = MOBILE_BOTTOM_NAV_ITEMS.filter(item => !isNavItemHidden(item, moduleFlags));
  const splitIndex = Math.ceil(visibleItems.length / 2);
  const leftItems = visibleItems.slice(0, splitIndex);
  const rightItems = visibleItems.slice(splitIndex);

  return (
    <nav
      aria-label="Navegação principal mobile"
      className="fixed inset-x-0 bottom-0 z-[80] border-t border-[var(--border-color)] bg-[color-mix(in_srgb,var(--bg-primary)_94%,transparent)] px-3 pb-safe pt-2 backdrop-blur-xl md:hidden"
    >
      <div className="flex min-h-11 items-end gap-1">
        <div
          className="grid min-w-0 flex-1 items-end gap-1"
          style={{ gridTemplateColumns: `repeat(${Math.max(leftItems.length, 1)}, minmax(0, 1fr))` }}
        >
          {leftItems.map(item => (
            <MobileBottomNavItem key={item.to} {...item} />
          ))}
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            aria-label={isActionOpen ? 'Fechar ações rápidas' : 'Abrir ações rápidas'}
            aria-expanded={isActionOpen}
            onClick={onActionToggle}
            className={cn(
              'relative -top-5 flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-[var(--radius-card)] border border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-[0_18px_40px_rgba(0,0,0,0.18)] transition-transform duration-200 active:scale-95',
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
          {rightItems.map(item => (
            <MobileBottomNavItem key={item.to} {...item} />
          ))}
        </div>
      </div>
    </nav>
  );
}
