import { Plus } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import type { ModuleFlags } from '../../features/settings/lib/moduleFlags';
import {
  isBottomNavItemActive,
  isNavItemHidden,
  MOBILE_BOTTOM_NAV_LEFT,
  MOBILE_BOTTOM_NAV_RIGHT,
  type NavItemDefinition,
} from '../../layouts/navigation/navConfig';

interface MobileBottomNavProps {
  onOpenCreateMenu: () => void;
  moduleFlags: ModuleFlags;
}

function MobileBottomNavItem({
  to,
  label,
  icon: Icon,
}: NavItemDefinition) {
  const location = useLocation();
  const isActive = isBottomNavItemActive(to, location.pathname);

  return (
    <NavLink
      to={to}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'relative flex h-12 w-full items-center justify-center rounded-full',
        'touch-manipulation select-none',
        'transition-colors duration-200 motion-reduce:transition-none',
        'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring-brand)]',
        isActive ? 'text-[var(--brand-accent)]' : 'text-[var(--text-secondary)]',
      )}
    >
      <Icon
        className={cn(
          'h-6 w-6 shrink-0 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]',
          isActive ? 'stroke-[2.25]' : 'stroke-[1.75]',
        )}
        aria-hidden
      />
    </NavLink>
  );
}

export function MobileBottomNav({ onOpenCreateMenu, moduleFlags }: MobileBottomNavProps) {
  const leftItems = MOBILE_BOTTOM_NAV_LEFT.filter(item => !isNavItemHidden(item, moduleFlags));
  const rightItems = MOBILE_BOTTOM_NAV_RIGHT.filter(item => !isNavItemHidden(item, moduleFlags));

  return (
    <nav
      aria-label="Navegação principal mobile"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] w-full px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto relative mx-auto h-14 max-w-md">
        <div className="grid h-full grid-cols-5 items-center">
          {leftItems.map(item => (
            <MobileBottomNavItem key={item.to} {...item} />
          ))}
          <div aria-hidden />
          {rightItems.map(item => (
            <MobileBottomNavItem key={item.to} {...item} />
          ))}
        </div>

        <button
          type="button"
          aria-label="Criar"
          onClick={onOpenCreateMenu}
          className={cn(
            'absolute left-1/2 top-1/2 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2',
            'items-center justify-center rounded-full',
            'bg-[var(--brand-fab)] text-[var(--bg-secondary)]',
            'shadow-[var(--shadow-dropdown)]',
            'touch-manipulation select-none',
            'transition-transform duration-200 motion-reduce:transition-none',
            'active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring-brand)]',
          )}
        >
          <Plus className="h-7 w-7 stroke-[2.5]" aria-hidden />
        </button>
      </div>
    </nav>
  );
}
