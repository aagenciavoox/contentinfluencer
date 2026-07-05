import { NavLink, useLocation } from 'react-router-dom';
import {
  ChevronRight,
  LogOut,
  Moon,
  Search,
  Settings,
  Sun,
  User,
  X,
} from 'lucide-react';
import { Text } from '../../components/ui/Text';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { getModuleFlags } from '../../features/settings/lib/moduleFlags';
import { useNavCounts } from '../../hooks/useNavCounts';
import {
  buildSidebarSections,
  isNavItemHidden,
  isSettingsNavActive,
  resolveNavBadge,
  type NavItemDefinition,
} from '../../layouts/navigation/navConfig';
import { cn } from '../../lib/utils';

interface MobileSidebarDrawerProps {
  onClose: () => void;
}

function DrawerNavItem({
  to,
  label,
  icon: Icon,
  badge,
  onClose,
  end = true,
}: NavItemDefinition & { badge?: number; onClose: () => void }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClose}
      className={({ isActive }) =>
        cn(
          'flex min-h-11 items-center gap-3 rounded-[var(--radius-card-mobile)] px-3 transition-colors',
          isActive
            ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)] active:bg-[var(--bg-hover)]'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'h-5 w-5 shrink-0 stroke-[1.75]',
              isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
            )}
          />
          <span className={cn('flex-1 truncate text-sm', isActive ? 'font-semibold' : 'font-medium')}>
            {label}
          </span>
          {badge ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--bg-primary)] px-1.5 text-xs font-semibold text-[var(--text-secondary)]">
              {badge}
            </span>
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)] opacity-40" />
          )}
        </>
      )}
    </NavLink>
  );
}

export function MobileSidebarDrawer({ onClose }: MobileSidebarDrawerProps) {
  const { state, dispatch } = useAppContext();
  const { signOut, user } = useAuth();
  const location = useLocation();
  const moduleFlags = getModuleFlags(state.preferences);
  const navCounts = useNavCounts(state.bibliotecaItems.length);
  const sections = buildSidebarSections(moduleFlags);

  const toggleTheme = () => {
    dispatch({ type: 'SET_THEME', payload: state.theme === 'light' ? 'dark' : 'light' });
  };

  const openCommandPalette = () => {
    onClose();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true }));
  };

  const userName =
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split('@')[0] ||
    'Utilizador';
  const userEmail = user?.email || 'user@exemplo.com';

  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 pb-safe pt-[max(env(safe-area-inset-top),12px)]">
      <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--bg-elevated)]">
            <div className="h-3.5 w-3.5 rounded-sm border-2 border-[var(--text-primary)]" />
          </div>
          <span className="truncate text-sm font-semibold tracking-tight text-[var(--text-primary)]">
            Skript
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar menu"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <button
        type="button"
        onClick={openCommandPalette}
        className="mb-4 flex min-h-11 w-full items-center gap-2 rounded-md border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 text-left text-[var(--text-tertiary)] transition-colors hover:border-[var(--border-strong)]"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-sm">Procurar...</span>
        <span className="rounded border border-[var(--border-color)] px-1.5 py-0.5 text-xs font-medium text-[var(--text-tertiary)]">
          Ctrl K
        </span>
      </button>

      <nav className="custom-scrollbar flex-1 overflow-y-auto" aria-label="Principal">
        {sections.map(section => {
          const visibleItems = section.items.filter(item => !isNavItemHidden(item, moduleFlags));
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label ?? 'today'} className={section.label ? 'mt-4 first:mt-0' : ''}>
              {section.label ? (
                <Text variant="label" uppercase className="mb-1 px-3">
                  {section.label}
                </Text>
              ) : null}
              <div className="space-y-0.5">
                {visibleItems.map(item => (
                  <DrawerNavItem
                    key={item.to}
                    {...item}
                    badge={resolveNavBadge(item, navCounts, state.bibliotecaItems.length)}
                    onClose={onClose}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="mt-4 shrink-0 space-y-0.5 border-t border-[var(--border-color)] pt-4">
        <NavLink
          to="/configuracoes"
          onClick={onClose}
          className={({ isActive }) =>
            cn(
              'flex min-h-11 items-center gap-3 rounded-md px-3 transition-colors',
              isSettingsNavActive(location.pathname, isActive)
                ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] active:bg-[var(--bg-hover)]'
            )
          }
        >
          <Settings className="h-5 w-5 shrink-0 text-[var(--text-tertiary)]" />
          <span className="flex-1 text-sm font-medium">Configurações</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
        </NavLink>
      </div>

      <div className="mt-3 shrink-0 border-t border-[var(--border-color)] pt-3">
        <NavLink
          to="/configuracoes/perfil"
          onClick={onClose}
          className="flex min-h-11 items-center gap-3 rounded-md p-2 transition-colors active:bg-[var(--bg-hover)]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--bg-hover)]">
            <User className="h-5 w-5 text-[var(--text-secondary)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{userName}</p>
            <p className="truncate text-xs text-[var(--text-tertiary)]">{userEmail}</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
        </NavLink>

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={state.theme === 'light' ? 'Modo escuro' : 'Modo claro'}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[var(--border-color)] text-[var(--text-secondary)] transition-colors active:bg-[var(--bg-hover)]"
          >
            {state.theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-[var(--border-color)] text-sm font-medium text-[var(--text-secondary)] transition-colors active:bg-[var(--bg-hover)]"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
