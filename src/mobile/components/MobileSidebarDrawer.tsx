import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Moon,
  Search,
  Settings,
  Sun,
  User,
  X,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { getModuleFlags } from '../../features/settings/lib/moduleFlags';
import { cn } from '../../lib/utils';

interface MobileSidebarDrawerProps {
  onClose: () => void;
}

type QuickNavItem = {
  to: string;
  label: string;
  icon: React.ElementType;
  hidden?: boolean;
  end?: boolean;
};

function DrawerNavItem({ to, label, icon: Icon, onClose, end = true }: QuickNavItem & { onClose: () => void }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClose}
      className={({ isActive }) =>
        cn(
          'flex min-h-11 items-center gap-3 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] px-4 transition-colors',
          isActive
            ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)] active:bg-[var(--bg-hover)]'
        )
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="flex-1 text-sm font-bold">{label}</span>
      <ChevronRight className="h-4 w-4 opacity-40" />
    </NavLink>
  );
}

export function MobileSidebarDrawer({ onClose }: MobileSidebarDrawerProps) {
  const { state, dispatch } = useAppContext();
  const { signOut, user } = useAuth();
  const moduleFlags = getModuleFlags(state.preferences);

  const toggleTheme = () => {
    dispatch({ type: 'SET_THEME', payload: state.theme === 'light' ? 'dark' : 'light' });
  };

  const openCommandPalette = () => {
    onClose();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true }));
  };

  const moreItems: QuickNavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/biblioteca', label: 'Biblioteca', icon: BookOpen, hidden: !moduleFlags.library },
    { to: '/projetos', label: 'Projetos', icon: FolderKanban, hidden: !moduleFlags.projects },
    { to: '/analise', label: 'Analise', icon: BarChart3, hidden: !moduleFlags.analytics },
  ];

  const visibleMore = moreItems.filter(item => !item.hidden);

  const userName =
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split('@')[0] ||
    'Utilizador';
  const userEmail = user?.email || '';

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--bg-primary)] px-4 pb-safe pt-[max(env(safe-area-inset-top),12px)]">
      <div className="flex shrink-0 items-center justify-between gap-3 pb-3">
        <div>
          <p className="text-base font-semibold text-[var(--text-primary)]">Menu</p>
          <p className="text-xs text-[var(--text-secondary)]">Atalhos fora da barra inferior</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar menu"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <p className="mb-3 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] bg-[var(--bg-secondary)] px-3 py-2 text-xs leading-relaxed text-[var(--text-tertiary)]">
        Agenda, Roteiro, Gravacao e Ideias estao na barra inferior.
      </p>

      <button
        type="button"
        onClick={openCommandPalette}
        className="mb-4 flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 text-left"
      >
        <Search className="h-4 w-4 text-[var(--text-tertiary)]" />
        <span className="flex-1 text-sm font-semibold text-[var(--text-secondary)]">Procurar...</span>
      </button>

      <nav className="flex-1 space-y-1 overflow-y-auto" aria-label="Atalhos mobile">
        {visibleMore.length > 0 ? (
          <>
            <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              Mais areas
            </p>
            {visibleMore.map(item => (
              <DrawerNavItem key={item.to} {...item} onClose={onClose} />
            ))}
          </>
        ) : null}

        <p className={cn('px-2 pb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]', visibleMore.length > 0 && 'mt-4')}>
          Sistema
        </p>
        <DrawerNavItem to="/configuracoes" label="Configurações avançadas" icon={Settings} onClose={onClose} />
      </nav>

      <div className="shrink-0 space-y-3 border-t border-[var(--border-color)] pt-4">
        <NavLink
          to="/configuracoes/perfil"
          onClick={onClose}
          className="flex min-h-11 items-center gap-3 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] bg-[var(--bg-secondary)] px-4"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--accent-purple),var(--accent-blue)_34%)] text-white">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{userName}</p>
            <p className="truncate text-xs text-[var(--text-secondary)]">{userEmail}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
        </NavLink>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={state.theme === 'light' ? 'Modo escuro' : 'Modo claro'}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)]"
          >
            {state.theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] text-sm font-bold text-[var(--text-secondary)]"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
