import React from 'react';
import {NavLink, useLocation} from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  Calendar,
  Camera,
  ChevronRight,
  FileText,
  Fingerprint,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
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
const SIDEBAR_WIDTH_EXPANDED = 240;
const SIDEBAR_WIDTH_COLLAPSED = 56;

export function Sidebar({isOpen, onClose}: SidebarProps) {
  const {state, dispatch} = useAppContext();
  const {signOut, user} = useAuth();
  const location = useLocation();
  const previousPathname = React.useRef(location.pathname);
  const moduleFlags = getModuleFlags(state.preferences);
  const [isCollapsed, setIsCollapsed] = React.useState(() =>
    readStoredJson(SIDEBAR_COLLAPSED_KEY, false)
  );

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

  const coreItems: NavItem[] = [
    {to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard},
    {
      to: '/biblioteca',
      label: 'Biblioteca',
      icon: BookOpen,
      badge: state.bibliotecaItems.length || undefined,
      hidden: !moduleFlags.library,
    },
    {to: '/ideias', label: 'Ideias', icon: Lightbulb},
    {
      to: '/conteudos',
      label: 'Roteiro',
      icon: FileText,
      badge: getEditorialContents(state.contents).length || undefined,
    },
    {
      to: '/gravacao?tab=blocks',
      label: 'Gravacao',
      icon: Camera,
      hidden: !moduleFlags.recording,
    },
    {to: '/calendario', label: 'Calendario', icon: Calendar, hidden: !moduleFlags.calendar},
    {to: '/analise', label: 'Analise', icon: BarChart3, hidden: !moduleFlags.analytics},
  ];

  const visibleItems = coreItems.filter(item => !item.hidden);

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
        title={isCollapsed ? undefined : label}
        className={({isActive}) =>
          cn(
            'group relative flex items-center rounded-lg border transition-all duration-200',
            isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
            isActive
              ? 'border-[color-mix(in_srgb,var(--accent-blue),var(--border-color)_58%)] bg-[color-mix(in_srgb,var(--accent-blue),transparent_90%)] text-[var(--text-primary)] shadow-[0_1px_0_rgba(255,255,255,0.56)_inset]'
              : 'border-transparent text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--bg-hover),transparent_18%)] hover:text-[var(--text-primary)]'
          )
        }
      >
        {({isActive}) => (
          <>
            <div
              className={cn(
                'relative flex items-center justify-center rounded-lg transition-all duration-200',
                isCollapsed ? 'h-8 w-8' : 'h-7 w-7',
                isActive
                  ? 'bg-[color-mix(in_srgb,var(--accent-blue),var(--accent-purple)_18%)] text-white'
                  : 'text-[var(--text-tertiary)] group-hover:text-[var(--accent-blue)]'
              )}
            >
              <Icon className="h-4 w-4 stroke-[2.2]" />
              {isCollapsed && badge ? (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--accent-blue)]" />
              ) : null}
            </div>
            {!isCollapsed ? (
              <>
                <span className={cn('flex-1 truncate text-[13px]', isActive ? 'font-semibold' : 'font-medium')}>
                  {label}
                </span>
                {badge ? (
                  <span className="text-[11px] font-medium text-[var(--text-tertiary)]">{badge}</span>
                ) : null}
              </>
            ) : null}
            {isActive && !isCollapsed ? (
              <motion.div
                layoutId="active-pill"
                className="absolute left-0 h-5 w-1 rounded-r-full bg-[var(--accent-blue)]"
              />
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

  const sidebarContent = (
    <div
      className={cn(
        'flex h-full w-full flex-col overflow-hidden border-r border-[var(--border-color)] bg-[color-mix(in_srgb,var(--bg-secondary)_88%,transparent)] text-[var(--text-primary)] backdrop-blur-xl transition-[padding] duration-200',
        isCollapsed ? 'px-2 py-3' : 'px-3 py-4'
      )}
    >
      <div className={cn('mb-4 flex shrink-0 items-center', isCollapsed ? 'justify-center' : 'justify-between')}>
        {isCollapsed ? (
          <Tooltip label="Core Creator">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--accent-blue),var(--accent-purple)_22%)] text-white shadow-[0_12px_28px_color-mix(in_srgb,var(--accent-blue),transparent_82%)]">
              <Fingerprint className="h-4 w-4" />
            </div>
          </Tooltip>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--accent-blue),var(--accent-purple)_22%)] text-white shadow-[0_12px_28px_color-mix(in_srgb,var(--accent-blue),transparent_82%)]">
              <Fingerprint className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[0.9rem] font-semibold leading-tight text-[var(--text-primary)]">Core Creator</p>
              <p className="truncate text-[0.72rem] font-medium leading-tight text-[var(--text-secondary)]">Editorial OS</p>
            </div>
          </div>
        )}

        {!isCollapsed ? (
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] active:scale-95 md:hidden"
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
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[color-mix(in_srgb,var(--bg-elevated),transparent_8%)] text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-blue)]"
          >
            <Search className="h-4 w-4" />
          </button>
        </Tooltip>
      ) : (
        <button
          onClick={openCommandPalette}
          className="group mb-4 flex w-full items-center gap-2.5 rounded-lg border border-[var(--border-color)] bg-[color-mix(in_srgb,var(--bg-elevated),transparent_8%)] px-3 py-2 text-left text-[var(--text-secondary)] shadow-sm transition-all duration-200 hover:border-[color-mix(in_srgb,var(--accent-blue),var(--border-color)_46%)] hover:bg-[var(--bg-elevated)]"
        >
          <Search className="h-4 w-4 shrink-0 transition-colors group-hover:text-[var(--accent-blue)]" />
          <span className="flex-1 text-[13px] font-medium">Procurar...</span>
          <span className="rounded-md bg-[var(--bg-hover)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-tertiary)]">
            Ctrl K
          </span>
        </button>
      )}

      <nav className="flex flex-1 flex-col" role="navigation" aria-label="Principal">
        <div className="custom-scrollbar flex-1 space-y-0.5 overflow-y-auto">
          {visibleItems.map(renderNavItem)}
        </div>
      </nav>

      <div className="mt-3 shrink-0 space-y-0.5 border-t border-[var(--border-color)] pt-3">
        {isCollapsed ? (
          <Tooltip label="Configuracoes" className="w-full justify-center">
            <NavLink
              to="/configuracoes"
              end
              className={({isActive}) =>
                cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-200',
                  isActive
                    ? 'border-[color-mix(in_srgb,var(--accent-blue),var(--border-color)_58%)] bg-[color-mix(in_srgb,var(--accent-blue),transparent_90%)] text-[var(--accent-blue)]'
                    : 'border-transparent text-[var(--text-tertiary)] hover:bg-[color-mix(in_srgb,var(--bg-hover),transparent_18%)] hover:text-[var(--text-primary)]'
                )
              }
            >
              <Settings className="h-4 w-4" />
            </NavLink>
          </Tooltip>
        ) : (
          <NavLink
            to="/configuracoes"
            end
            className={({isActive}) =>
              cn(
                'group flex items-center gap-3 rounded-lg border px-3 py-2 transition-all duration-200',
                isActive
                  ? 'border-[color-mix(in_srgb,var(--accent-blue),var(--border-color)_58%)] bg-[color-mix(in_srgb,var(--accent-blue),transparent_90%)] text-[var(--text-primary)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--bg-hover),transparent_18%)] hover:text-[var(--text-primary)]'
              )
            }
          >
            <Settings className="h-4 w-4 text-[var(--text-tertiary)] group-hover:text-[var(--accent-blue)]" />
            <span className="flex-1 text-[13px] font-medium">Configuracoes</span>
            <ChevronRight className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
          </NavLink>
        )}
      </div>

      <div className={cn('mt-3 shrink-0', isCollapsed ? 'flex justify-center' : '')}>
        {isCollapsed ? (
          <Tooltip label={userName}>
            <NavLink
              to="/configuracoes/perfil"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--accent-purple),var(--accent-blue)_34%)] text-white shadow-sm"
              aria-label="Perfil"
            >
              <User className="h-4 w-4" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg-secondary)] bg-green-500" />
            </NavLink>
          </Tooltip>
        ) : (
          <NavLink
            to="/configuracoes/perfil"
            className="flex w-full items-center gap-2.5 rounded-lg border border-transparent bg-[var(--surface-subtle)] p-2 text-left transition-all hover:border-[var(--border-color)] hover:shadow-sm"
            aria-label="Abrir perfil"
          >
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--accent-purple),var(--accent-blue)_34%)] text-white shadow-sm">
              <User className="h-4 w-4" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-start overflow-hidden">
              <span className="w-full truncate text-[13px] font-semibold text-[var(--text-primary)]">{userName}</span>
              <span className="w-full truncate text-[11px] font-normal text-[var(--text-secondary)]">{userEmail}</span>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
          </NavLink>
        )}
      </div>

      <div className="mt-3 shrink-0 border-t border-[var(--border-color)] pt-3">
        <div className={cn('flex items-center gap-2', isCollapsed ? 'flex-col' : 'justify-between')}>
          {isCollapsed ? (
            <>
              <Tooltip label={state.theme === 'light' ? 'Modo escuro' : 'Modo claro'}>
                <button
                  onClick={toggleTheme}
                  aria-label={state.theme === 'light' ? 'Ativar modo noturno' : 'Ativar modo claro'}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-blue)]"
                >
                  {state.theme === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                </button>
              </Tooltip>
              <Tooltip label="Sair">
                <button
                  onClick={signOut}
                  aria-label="Finalizar sessao"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
              <Tooltip label="Expandir sidebar">
                <button
                  onClick={toggleCollapsed}
                  aria-label="Expandir sidebar"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-blue)]"
                >
                  <PanelLeftOpen className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            </>
          ) : (
            <>
              <button
                onClick={toggleTheme}
                aria-label={state.theme === 'light' ? 'Ativar modo noturno' : 'Ativar modo claro'}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] shadow-sm transition-colors hover:text-[var(--accent-blue)]"
              >
                {state.theme === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              </button>

              <button
                onClick={signOut}
                aria-label="Finalizar sessao"
                className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[12px] font-medium text-[var(--text-secondary)] shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sair
              </button>

              <button
                onClick={toggleCollapsed}
                aria-label="Recolher sidebar"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] shadow-sm transition-colors hover:text-[var(--accent-blue)]"
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
              </button>
            </>
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
              className="fixed inset-0 z-[105] bg-[rgba(9,13,24,0.42)] backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{x: '-100%'}}
              animate={{x: 0}}
              exit={{x: '-100%'}}
              transition={{type: 'spring', damping: 30, stiffness: 280}}
              className="fixed left-0 top-0 z-[110] h-full w-[min(88vw,280px)] overflow-hidden shadow-2xl md:hidden"
            >
              <MobileSidebarDrawer onClose={onClose} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
