import { NavLink } from 'react-router-dom';
import { Clock, Layout, MonitorSpeaker, Settings, UserCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useIsMobile } from '../../hooks/useIsMobile';

// Only true system settings — editorial items (DNA, Pilares, Séries, Regras) live in the main sidebar under "Estúdio"
const navItems = [
  { to: '/configuracoes', label: 'Visão geral', icon: Settings, end: true },
  { to: '/configuracoes/perfil', label: 'Perfil', icon: UserCircle2 },
  { to: '/configuracoes/plataformas', label: 'Plataformas', icon: MonitorSpeaker },
  { to: '/configuracoes/templates', label: 'Templates', icon: Layout },
  { to: '/configuracoes/horarios', label: 'Horários', icon: Clock },
];

export function SettingsSubSidebar({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  if (isMobile) return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-52 shrink-0 border-r border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-6 md:flex md:flex-col">
        <nav className="space-y-0.5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-[var(--bg-hover)] font-semibold text-[var(--text-primary)]'
                    : 'font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
