import { Plus } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import type { ModuleFlags } from '../../features/settings/lib/moduleFlags';
import {
  isBottomNavItemActive,
  isNavItemHidden,
  MOBILE_BOTTOM_NAV_ITEMS,
  splitBottomNavItems,
} from '../../layouts/navigation/navConfig';

interface MobileBottomNavProps {
  isActionOpen: boolean;
  onActionToggle: () => void;
  moduleFlags: ModuleFlags;
}

const tabClassName =
  'flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-1 text-center touch-manipulation select-none transition-colors duration-200';

function MobileBottomNavItem({
  to,
  label,
  icon: Icon,
}: (typeof MOBILE_BOTTOM_NAV_ITEMS)[number]) {
  const location = useLocation();
  const isActive = isBottomNavItemActive(to, location.pathname);

  return (
    <NavLink
      to={to}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        tabClassName,
        isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]',
      )}
    >
      <span className="flex h-9 w-9 items-center justify-center" aria-hidden>
        <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'stroke-[2.25]' : 'stroke-[1.75]')} />
      </span>
      <span className="t-nav w-full truncate text-center leading-tight">{label}</span>
    </NavLink>
  );
}

function MobileBottomNavAction({
  isActionOpen,
  onActionToggle,
}: Pick<MobileBottomNavProps, 'isActionOpen' | 'onActionToggle'>) {
  return (
    <button
      type="button"
      aria-label={isActionOpen ? 'Fechar ações rápidas' : 'Abrir ações rápidas'}
      aria-expanded={isActionOpen}
      onClick={onActionToggle}
      className={cn(
        tabClassName,
        isActionOpen ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]',
      )}
    >
      <span
        aria-hidden
        className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--accent)] text-[var(--bg-secondary)] transition-transform duration-200"
      >
        <Plus className={cn('h-5 w-5', isActionOpen ? 'rotate-45' : '')} />
      </span>
      <span className="t-nav w-full truncate text-center leading-tight">Criar</span>
    </button>
  );
}

export function MobileBottomNav({ isActionOpen, onActionToggle, moduleFlags }: MobileBottomNavProps) {
  const visibleItems = MOBILE_BOTTOM_NAV_ITEMS.filter(item => !isNavItemHidden(item, moduleFlags));
  const { left, right } = splitBottomNavItems(visibleItems);

  return (
    <nav
      aria-label="Navegação principal mobile"
      className="fixed inset-x-0 bottom-0 z-[80] border-t border-[var(--border-color)] bg-[color-mix(in_srgb,var(--bg-primary)_94%,transparent)] px-2 pb-safe pt-2 backdrop-blur-xl touch-manipulation select-none"
    >
      <div className="flex items-stretch">
        {left.map(item => (
          <MobileBottomNavItem key={item.to} {...item} />
        ))}
        <MobileBottomNavAction isActionOpen={isActionOpen} onActionToggle={onActionToggle} />
        {right.map(item => (
          <MobileBottomNavItem key={item.to} {...item} />
        ))}
      </div>
    </nav>
  );
}
