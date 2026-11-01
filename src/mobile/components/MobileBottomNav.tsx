import { Plus } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { Text } from '../../components/ui/Text';
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

/**
 * Coluna da barra: ícone de 24px, rótulo de 12px e um traço de 2px no topo quando ativa.
 * Ícone e rótulo ativos usam o rosa de texto (≥ 4,5:1); o rosa da marca fica só no traço.
 */
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
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'relative flex h-full min-w-0 flex-col items-center justify-center gap-0.5',
        'touch-manipulation select-none',
        'transition-colors duration-200 motion-reduce:transition-none',
        'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
        isActive ? 'text-[var(--brand-accent-text)]' : 'text-[var(--text-tertiary)]',
      )}
    >
      {isActive ? (
        <span
          aria-hidden
          className="absolute left-1/2 top-0 h-0.5 w-6 -translate-x-1/2 rounded-full bg-[var(--brand-accent)]"
        />
      ) : null}
      <Icon className={cn('h-6 w-6 shrink-0', isActive ? 'stroke-[2.25]' : 'stroke-[1.75]')} aria-hidden />
      <Text variant="label" as="span" truncate className="max-w-full text-inherit">
        {label}
      </Text>
    </NavLink>
  );
}

export function MobileBottomNav({ onOpenCreateMenu, moduleFlags }: MobileBottomNavProps) {
  const leftItems = MOBILE_BOTTOM_NAV_LEFT.filter(item => !isNavItemHidden(item, moduleFlags));
  const rightItems = MOBILE_BOTTOM_NAV_RIGHT.filter(item => !isNavItemHidden(item, moduleFlags));
  // Com um módulo desligado, um lado fica com menos itens. Completa com vagas vazias para o
  // botão Criar continuar no centro e a barra não ficar com um buraco de um lado só.
  const sideSlots = Math.max(leftItems.length, rightItems.length, 1);
  const leftPadding = sideSlots - leftItems.length;
  const rightPadding = sideSlots - rightItems.length;

  return (
    <nav aria-label="Navegação principal" className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-[100]">
      <div
        className="mx-auto grid h-14 max-w-md items-stretch"
        style={{ gridTemplateColumns: `repeat(${sideSlots * 2 + 1}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: leftPadding }, (_, index) => (
          <div key={`left-slot-${index}`} aria-hidden />
        ))}
        {leftItems.map(item => (
          <MobileBottomNavItem key={item.to} {...item} />
        ))}

        <div className="flex items-center justify-center">
          <button
            type="button"
            aria-label="Criar"
            onClick={onOpenCreateMenu}
            className={cn(
              'flex h-13 w-13 items-center justify-center rounded-full',
              'bg-[var(--brand-accent-strong)] text-[var(--brand-on-accent)]',
              'touch-manipulation select-none',
              'transition-transform duration-200 motion-reduce:transition-none',
              'active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
            )}
          >
            <Plus className="h-6 w-6 stroke-[2.5]" aria-hidden />
          </button>
        </div>

        {rightItems.map(item => (
          <MobileBottomNavItem key={item.to} {...item} />
        ))}
        {Array.from({ length: rightPadding }, (_, index) => (
          <div key={`right-slot-${index}`} aria-hidden />
        ))}
      </div>
    </nav>
  );
}
