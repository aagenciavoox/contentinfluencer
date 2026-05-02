import type { ElementType } from 'react';
import { BookOpen, Calendar, Lightbulb, Plus, BriefcaseBusiness } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';

interface MobileBottomNavProps {
  isActionOpen: boolean;
  onActionToggle: () => void;
}

interface MobileNavItemConfig {
  to: string;
  label: string;
  icon: ElementType;
}

const navItems: MobileNavItemConfig[] = [
  { to: '/calendario', label: 'Agenda', icon: Calendar },
  { to: '/projetos', label: 'Projetos', icon: BriefcaseBusiness },
  { to: '/ideias', label: 'Ideias', icon: Lightbulb },
  { to: '/biblioteca', label: 'Acervo', icon: BookOpen },
];

function MobileBottomNavItem({ to, label, icon: Icon }: MobileNavItemConfig) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex min-w-0 flex-1 flex-col items-center gap-1 py-1 text-center transition-all duration-200',
          isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
        )
      }
    >
      <Icon className="h-5 w-5" />
      <span className="t-nav truncate uppercase">{label}</span>
    </NavLink>
  );
}

export function MobileBottomNav({ isActionOpen, onActionToggle }: MobileBottomNavProps) {
  return (
    <nav
      aria-label="Navegacao principal mobile"
      className="fixed inset-x-0 bottom-0 z-[80] border-t border-[var(--border-color)] bg-[color-mix(in_srgb,var(--bg-primary)_94%,transparent)] px-3 pb-safe pt-3 backdrop-blur-xl md:hidden"
    >
      <div className="grid grid-cols-[1fr_1fr_auto_1fr_1fr] items-end gap-1">
        <MobileBottomNavItem {...navItems[0]} />
        <MobileBottomNavItem {...navItems[1]} />

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

        <MobileBottomNavItem {...navItems[2]} />
        <MobileBottomNavItem {...navItems[3]} />
      </div>
    </nav>
  );
}
