import React from 'react';
import {NavLink, useLocation, useNavigate} from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  Calendar,
  CalendarClock,
  Camera,
  ChevronRight,
  FileText,
  Fingerprint,
  LayoutDashboard,
  Layers,
  Lightbulb,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Palette,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  User,
  X,
} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {Tooltip} from '../../components/ui/Tooltip';
import {useAppContext} from '../../context/AppContext';
import {useAuth} from '../../context/AuthContext';
import {getEditorialContents} from '../../features/contents/lib/contentWorkflow';
import {getModuleFlags} from '../../features/settings/lib/moduleFlags';
import {readStoredJson, writeStoredJson} from '../../lib/browserStorage';
import {cn} from '../../lib/utils';
import {MobileSidebarDrawer} from '../../mobile/components/MobileSidebarDrawer';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

type NavItem = {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  hidden?: boolean;
  end?: boolean;
};

const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed';
const SIDEBAR_WIDTH_EXPANDED = 280;
const SIDEBAR_WIDTH_COLLAPSED = 72;

function NavSectionLabel({children, collapsed}: {children: string; collapsed: boolean}) {
  if (collapsed) return null;
  return (
    <p className="mb-1 mt-4 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] first:mt-0">
      {children}
    </p>
  );
}

export function Sidebar({isOpen, onClose}: SidebarProps) {
  const {state, dispatch} = useAppContext();
  const {signOut, user} = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const previousPathname = React.useRef(location.pathname);
  const moduleFlags = getModuleFlags(state.preferences);
  const [isCollapsed, setIsCollapsed] = React.useState(() =>
    readStoredJson(SIDEBAR_COLLAPSED_KEY, false)
  );
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (isOpen && previousPathname.current !== location.pathname) {
      onClose();
    }
    previousPathname.current = location.pathname;
  }, [isOpen, location.pathname, onClose]);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  React.useEffect(() => {
    if (!userMenuOpen) return;

    const handleClickOutside = () => {
      setUserMenuOpen(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [userMenuOpen]);

  const toggleCollapsed = () => {
    setIsCollapsed(previous => {
      const next = !previous;
      writeStoredJson(SIDEBAR_COLLAPSED_KEY, next);
      return next;
    });
  };

  const toggleTheme = () => {
    dispatch({type: 'SET_THEME', payload: state.theme === 'light' ? 'dark' : 'light'});
  };

  const openCommandPalette = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', {key: 'k', metaKey: true, ctrlKey: true}));
  };

  const generalItems: NavItem[] = [
    {to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard},
    {
      to: '/conteudos',
      label: 'Pipeline',
      icon: FileText,
      badge: getEditorialContents(state.contents).length || undefined,
    },
    {to: '/ideias', label: 'Ideias', icon: Lightbulb},
    {to: '/calendario', label: 'Calendário', icon: Calendar, hidden: !moduleFlags.calendar},
    {to: '/programacao', label: 'Programação', icon: CalendarClock, hidden: !moduleFlags.calendar},
  ];

  const studioItems: NavItem[] = [
    {to: '/configuracoes/dna', label: 'DNA da Voz', icon: Fingerprint},
    {to: '/configuracoes/pilares', label: 'Pilares', icon: Palette},
    {to: '/configuracoes/series', label: 'Séries', icon: Layers},
    {to: '/configuracoes/regras', label: 'Regras de Ouro', icon: ShieldCheck},
  ];

  const workspaceItems: NavItem[] = [
    {
      to: '/biblioteca',
      label: 'Biblioteca',
      icon: BookOpen,
      badge: state.bibliotecaItems.length || undefined,
      hidden: !moduleFlags.library,
    },
    {
      to: '/gravacao?tab=queue',
      label: 'Gravação',
      icon: Camera,
      hidden: !moduleFlags.recording,
    },
    {to: '/analise', label: 'Análise', icon: BarChart3, hidden: !moduleFlags.analytics},
  ];

  const userName =
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split('@')[0] ||
    'Utilizador';
  const userEmail = user?.email || 'user@exemplo.com';

  const renderNavItem = ({to, label, icon: Icon, badge, end = true}: NavItem) => {
    const link = (
      <NavLink
        key={to}
        to={to}
        end={end}
        title={isCollapsed ? label : undefined}
        className={({isActive}) =>
          cn(
            'group relative flex items-center rounded-md transition-colors duration-150',
            isCollapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2',
            isActive
              ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
          )
        }
      >
        {({isActive}) => (
          <>
            <Icon
              className={cn(
                'h-5 w-5 shrink-0 stroke-[1.75]',
                isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]'
              )}
            />
            {!isCollapsed ? (
              <>
                <span className={cn('flex-1 truncate text-sm', isActive ? 'font-semibold' : 'font-medium')}>
                  {label}
                </span>
                {badge ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--bg-primary)] px-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                    {badge}
                  </span>
                ) : null}
              </>
            ) : badge ? (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--accent-blue)]" />
            ) : null}
          </>
        )}
      </NavLink>
    );

    if (isCollapsed) {
      return (
        <Tooltip key={to} label={label}>
          {link}
        </Tooltip>
      );
    }

    return link;
  };

  const userMenuPanel = (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-lg overflow-hidden py-1">
      <button
        onClick={() => { navigate('/configuracoes/perfil'); setUserMenuOpen(false); }}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
      >
        <User className="h-4 w-4 shrink-0" />
        Meu perfil
      </button>
      <button
        onClick={() => { toggleTheme(); setUserMenuOpen(false); }}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
      >
        {state.theme === 'light' ? <Moon className="h-4 w-4 shrink-0" /> : <Sun className="h-4 w-4 shrink-0" />}
        {state.theme === 'light' ? 'Modo escuro' : 'Modo claro'}
      </button>
      <button
        onClick={() => { signOut(); setUserMenuOpen(false); }}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        Sair
      </button>
    </div>
  );

  const sidebarContent = (
    <div
      className={cn(
        'flex h-full w-full flex-col overflow-hidden border-r border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] transition-[padding] duration-200',
        isCollapsed ? 'px-2 py-4' : 'px-4 py-5'
      )}
    >
      <div className={cn('mb-5 flex shrink-0 items-center', isCollapsed ? 'justify-center' : 'justify-between')}>
        {isCollapsed ? (
          <Tooltip label="Content OS">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--bg-elevated)]">
              <div className="h-3.5 w-3.5 rounded-sm border-2 border-[var(--text-primary)]" />
            </div>
          </Tooltip>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--bg-elevated)]">
              <div className="h-3.5 w-3.5 rounded-sm border-2 border-[var(--text-primary)]" />
            </div>
            <span className="truncate text-sm font-semibold tracking-tight text-[var(--text-primary)]">
              Content OS
            </span>
          </div>
        )}

        {!isCollapsed ? (
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] md:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      {isCollapsed ? (
        <Tooltip label="Procurar (Ctrl K)" className="mb-3 w-full justify-center">
          <button
            onClick={openCommandPalette}
            aria-label="Procurar"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <Search className="h-4 w-4" />
          </button>
        </Tooltip>
      ) : (
        <button
          onClick={openCommandPalette}
          className="group mb-4 flex w-full items-center gap-2 rounded-md border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-left text-[var(--text-tertiary)] transition-colors hover:border-[var(--border-strong)]"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-sm">Procurar...</span>
          <span className="rounded border border-[var(--border-color)] px-1.5 py-0.5 text-xs font-medium text-[var(--text-tertiary)]">
            Ctrl K
          </span>
        </button>
      )}

      <nav className="flex flex-1 flex-col" role="navigation" aria-label="Principal">
        <div className="custom-scrollbar flex-1 overflow-y-auto">
          <NavSectionLabel collapsed={isCollapsed}>Geral</NavSectionLabel>
          <div className="space-y-0.5">
            {generalItems.filter(item => !item.hidden).map(renderNavItem)}
          </div>

          <NavSectionLabel collapsed={isCollapsed}>Estúdio</NavSectionLabel>
          <div className="space-y-0.5">
            {studioItems.map(renderNavItem)}
          </div>

          <NavSectionLabel collapsed={isCollapsed}>Workspace</NavSectionLabel>
          <div className="space-y-0.5">
            {workspaceItems.filter(item => !item.hidden).map(renderNavItem)}
          </div>
        </div>
      </nav>

      <div className="mt-4 shrink-0 space-y-0.5 border-t border-[var(--border-color)] pt-4">
        {isCollapsed ? (
          <Tooltip label="Configurações" className="w-full justify-center">
            <NavLink
              to="/configuracoes"
              className={({isActive}) => {
                const studioRoutes = ['/configuracoes/dna', '/configuracoes/pilares', '/configuracoes/series', '/configuracoes/regras'];
                const isStudio = studioRoutes.some(r => location.pathname.startsWith(r));
                const active = !isStudio && (isActive || location.pathname.startsWith('/configuracoes'));
                return cn(
                  'flex h-9 w-9 items-center justify-center rounded-md transition-colors',
                  active
                    ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                    : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                );
              }}
            >
              <Settings className="h-5 w-5" />
            </NavLink>
          </Tooltip>
        ) : (
          <NavLink
            to="/configuracoes"
            className={({isActive}) => {
              const studioRoutes = ['/configuracoes/dna', '/configuracoes/pilares', '/configuracoes/series', '/configuracoes/regras'];
              const isStudio = studioRoutes.some(r => location.pathname.startsWith(r));
              const active = !isStudio && (isActive || location.pathname.startsWith('/configuracoes'));
              return cn(
                'group flex items-center gap-3 rounded-md px-3 py-2 transition-colors',
                active
                  ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
              );
            }}
          >
            <Settings className="h-5 w-5 text-[var(--text-tertiary)]" />
            <span className="flex-1 text-sm font-medium">Configurações</span>
            <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
          </NavLink>
        )}
      </div>

      <div className={cn('mt-3 shrink-0', isCollapsed ? 'flex justify-center' : '')}>
        {isCollapsed ? (
          <div className="relative">
            {userMenuOpen && (
              <div style={{position: 'absolute', left: '100%', bottom: 0, marginLeft: '8px', width: '180px', zIndex: 50}}>
                {userMenuPanel}
              </div>
            )}
            <Tooltip label={userName}>
              <button
                onClick={e => { e.stopPropagation(); setUserMenuOpen(prev => !prev); }}
                className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[var(--bg-hover)]"
                aria-label="Perfil"
              >
                <User className="h-4 w-4 text-[var(--text-secondary)]" />
              </button>
            </Tooltip>
          </div>
        ) : (
          <div className="relative">
            {userMenuOpen && (
              <div style={{position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: '4px', zIndex: 50}}>
                {userMenuPanel}
              </div>
            )}
            <button
              onClick={e => { e.stopPropagation(); setUserMenuOpen(prev => !prev); }}
              className="flex w-full items-center gap-3 rounded-md border border-transparent p-2 text-left transition-colors hover:bg-[var(--bg-hover)]"
              aria-label="Abrir perfil"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--bg-hover)]">
                <User className="h-5 w-5 text-[var(--text-secondary)]" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col items-start overflow-hidden">
                <span className="w-full truncate text-sm font-semibold text-[var(--text-primary)]">{userName}</span>
                <span className="w-full truncate text-xs text-[var(--text-tertiary)]">{userEmail}</span>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 shrink-0 border-t border-[var(--border-color)] pt-3">
        <div className={cn('flex items-center', isCollapsed ? 'justify-center' : 'justify-end')}>
          {isCollapsed ? (
            <Tooltip label="Expandir sidebar">
              <button
                onClick={toggleCollapsed}
                aria-label="Expandir sidebar"
                className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            </Tooltip>
          ) : (
            <button
              onClick={toggleCollapsed}
              aria-label="Recolher sidebar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <motion.div
        animate={{width: isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED}}
        transition={{type: 'spring', damping: 32, stiffness: 320}}
        className="hidden h-screen shrink-0 overflow-hidden md:block"
      >
        {sidebarContent}
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              onClick={onClose}
              className="fixed inset-0 z-[105] bg-black/40  md:hidden"
            />
            <motion.div
              initial={{x: '-100%'}}
              animate={{x: 0}}
              exit={{x: '-100%'}}
              transition={{type: 'spring', damping: 30, stiffness: 280}}
              className="fixed left-0 top-0 z-[110] h-full w-[min(88vw,280px)] overflow-hidden shadow-none md:hidden"
            >
              <MobileSidebarDrawer onClose={onClose} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
