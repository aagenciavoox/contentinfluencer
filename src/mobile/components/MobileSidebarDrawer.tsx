import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
import { BrandLockup } from '../../layouts/navigation/BrandLockup';
import { getUserInitials } from '../../layouts/navigation/userInitials';
import {
  buildSidebarSections,
  isNavItemActive,
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
  indent = false,
}: NavItemDefinition & { badge?: number; onClose: () => void; indent?: boolean }) {
  const location = useLocation();
  const isActive = isNavItemActive(to, location.pathname);

  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClose}
      aria-current={isActive ? 'page' : undefined}
      className={() =>
        cn(
          'relative flex min-h-11 items-center gap-3 rounded-[var(--radius-card-mobile)] px-3 transition-colors',
          indent && 'ml-4',
          isActive
            ? 'relative bg-[var(--bg-hover)] text-[var(--text-primary)] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-[var(--brand-accent)]'
            : 'text-[var(--text-secondary)] active:bg-[var(--bg-hover)]'
        )
      }
    >
      <>
          <Icon
            className={cn(
              'shrink-0 stroke-[1.75]',
              indent ? 'h-4 w-4' : 'h-5 w-5',
              isActive ? 'text-[var(--brand-accent)]' : 'text-[var(--text-tertiary)]'
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
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
          )}
      </>
    </NavLink>
  );
}

export function MobileSidebarDrawer({ onClose }: MobileSidebarDrawerProps) {
  const { state, dispatch } = useAppContext();
  const { signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const moduleFlags = getModuleFlags(state.preferences);
  const navCounts = useNavCounts(state.bibliotecaItems.length);
  const sections = buildSidebarSections(moduleFlags);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const toggleTheme = () => {
    dispatch({ type: 'SET_THEME', payload: state.theme === 'light' ? 'dark' : 'light' });
  };

  const openCommandPalette = () => {
    onClose();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true }));
  };

  useEffect(() => {
    if (!userMenuOpen) return undefined;

    const handleClickOutside = () => setUserMenuOpen(false);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setUserMenuOpen(false);
    };

    document.addEventListener('click', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [userMenuOpen]);

  const userName =
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split('@')[0] ||
    'Usuário';
  const userEmail = user?.email || 'user@exemplo.com';
  const userInitials = getUserInitials(userName);
  const settingsNavCurrent = isSettingsNavActive(location.pathname);

  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 pb-safe pt-[max(env(safe-area-inset-top),12px)]">
      <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
        <BrandLockup className="min-w-0 flex-1" onNavigate={onClose} />
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
        <span className="flex-1 text-sm">Buscar…</span>
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
                  <div key={item.to} className="space-y-0.5">
                    <DrawerNavItem
                      {...item}
                      badge={resolveNavBadge(item, navCounts, state.bibliotecaItems.length)}
                      onClose={onClose}
                    />
                    {item.nested
                      ?.filter(child => !isNavItemHidden(child, moduleFlags))
                      .map(child => (
                        <DrawerNavItem
                          key={child.to}
                          {...child}
                          indent
                          badge={resolveNavBadge(child, navCounts, state.bibliotecaItems.length)}
                          onClose={onClose}
                        />
                      ))}
                  </div>
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
          aria-current={settingsNavCurrent ? 'page' : undefined}
          className={() =>
            cn(
              'flex min-h-11 items-center gap-3 rounded-md px-3 transition-colors',
              settingsNavCurrent
                ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] active:bg-[var(--bg-hover)]'
            )
          }
        >
          <Settings
            className={cn(
              'h-5 w-5 shrink-0',
              settingsNavCurrent
                ? 'text-[var(--brand-accent)]'
                : 'text-[var(--text-tertiary)]',
            )}
          />
          <span className="flex-1 text-sm font-medium">Configurações</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
        </NavLink>
      </div>

      <div className="relative mt-3 shrink-0 border-t border-[var(--border-color)] pt-3">
        {userMenuOpen ? (
          <div className="absolute bottom-full left-0 right-0 z-50 mb-1 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] py-1 shadow-lg">
            <button
              type="button"
              onClick={() => {
                navigate('/configuracoes/perfil');
                setUserMenuOpen(false);
                onClose();
              }}
              className="flex min-h-11 w-full items-center gap-2.5 px-3 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            >
              <User className="h-4 w-4 shrink-0" />
              Meu perfil
            </button>
            <button
              type="button"
              onClick={() => {
                toggleTheme();
                setUserMenuOpen(false);
              }}
              className="flex min-h-11 w-full items-center gap-2.5 px-3 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            >
              {state.theme === 'light' ? <Moon className="h-4 w-4 shrink-0" /> : <Sun className="h-4 w-4 shrink-0" />}
              {state.theme === 'light' ? 'Modo escuro' : 'Modo claro'}
            </button>
            <button
              type="button"
              onClick={() => {
                void signOut();
                setUserMenuOpen(false);
              }}
              className="flex min-h-11 w-full items-center gap-2.5 px-3 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sair
            </button>
          </div>
        ) : null}
        <button
          type="button"
          onClick={event => {
            event.stopPropagation();
            setUserMenuOpen(previous => !previous);
          }}
          className="flex min-h-11 w-full items-center gap-3 rounded-md p-2 text-left transition-colors active:bg-[var(--bg-hover)]"
          aria-label="Abrir perfil"
          aria-haspopup="menu"
          aria-expanded={userMenuOpen}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--bg-hover)] text-sm font-semibold text-[var(--text-secondary)]">
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{userName}</p>
            <p className="truncate text-xs text-[var(--text-tertiary)]">{userEmail}</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
        </button>
      </div>
    </div>
  );
}
