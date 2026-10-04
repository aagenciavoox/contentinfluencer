import { Plus } from 'lucide-react';
import { prefetchRoute } from '../../app/router/routePrefetch';
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
      onTouchStart={() => prefetchRoute(to)}
      onMouseEnter={() => prefetchRoute(to)}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'relative flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-full',
        'touch-manipulation select-none',
        'transition-colors duration-200 motion-reduce:transition-none',
        'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring-brand)]',
        isActive ? 'text-[var(--brand-accent)]' : 'text-[var(--text-tertiary)]',
      )}
    >
      <Icon
        className={cn('h-6 w-6 shrink-0', isActive ? 'stroke-[2.25]' : 'stroke-[1.75]')}
        aria-hidden
      />
      <span
        className={cn(
          'whitespace-nowrap text-[length:var(--font-size-nav-mobile)] leading-none',
          isActive ? 'font-semibold' : 'font-medium',
        )}
      >
        {label}
      </span>
    </NavLink>
  );
}

export function MobileBottomNav({ onOpenCreateMenu, moduleFlags }: MobileBottomNavProps) {
  const leftItems = MOBILE_BOTTOM_NAV_LEFT.filter(item => !isNavItemHidden(item, moduleFlags));
  const rightItems = MOBILE_BOTTOM_NAV_RIGHT.filter(item => !isNavItemHidden(item, moduleFlags));

  return (
    <nav
      aria-label="Navegação principal"
      className="mobile-bottom-nav pointer-events-none fixed inset-x-0 bottom-0 z-[100] w-full"
    >
      <div className="mobile-bottom-nav-inner pointer-events-auto relative mx-auto max-w-md">
        <div className="mobile-bottom-nav-rail relative h-13">
          <div className="mobile-bottom-nav-pill grid h-full grid-cols-5 items-center">
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
              'flex-col items-center justify-center gap-0.5 rounded-full',
              'bg-[var(--brand-accent-strong)] text-[var(--brand-on-accent)]',
              'touch-manipulation select-none',
              'transition-transform duration-200 motion-reduce:transition-none',
              'active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring-brand)]',
            )}
          >
            <Plus className="h-5 w-5 stroke-[2.5]" aria-hidden />
            <span className="whitespace-nowrap text-[length:var(--font-size-nav-mobile)] font-semibold leading-none">
              Criar
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}
