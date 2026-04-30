import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronRight,
  Fingerprint,
  Globe,
  Layers,
  Lightbulb,
  LogOut,
  Palette,
  Search,
  Settings,
  ShieldCheck,
  Shirt,
  Table,
  Video,
  BarChart3,
  FolderKanban,
  LayoutTemplate,
  Moon,
  Sun,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

type NavItem = {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
};

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { state, dispatch } = useAppContext();
  const { user, signOut } = useAuth();
  const [settingsExpanded, setSettingsExpanded] = React.useState(false);
  const location = useLocation();
  const previousPathname = React.useRef(location.pathname);

  React.useEffect(() => {
    if (isOpen && previousPathname.current !== location.pathname) {
      onClose();
    }
    previousPathname.current = location.pathname;
  }, [isOpen, location.pathname, onClose]);

  React.useEffect(() => {
    setSettingsExpanded(location.pathname.startsWith('/configuracoes'));
  }, [location.pathname]);

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

  const toggleTheme = () => {
    dispatch({ type: 'SET_THEME', payload: state.theme === 'light' ? 'dark' : 'light' });
  };

  const openCommandPalette = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true }));
  };

  const displayName = user?.user_metadata?.full_name || 'Seu Nome';
  const userInitial = displayName.trim().charAt(0) || 'C';

  const mainItems: NavItem[] = [
    {
      to: '/conteudos',
      label: 'Conteúdos',
      icon: Table,
      badge: state.contents.filter((content) => content.status === 'A Editar').length || undefined,
    },
    {
      to: '/biblioteca',
      label: 'Biblioteca',
      icon: BookOpen,
      badge: state.bibliotecaItems.length || undefined,
    },
    { to: '/calendario', label: 'Calendário', icon: Calendar },
    { to: '/ideias', label: 'Ideias', icon: Lightbulb },
    { to: '/projetos', label: 'Projetos', icon: FolderKanban },
    { to: '/gravacao', label: 'Gravação', icon: Video },
    { to: '/analise', label: 'Análise', icon: BarChart3 },
  ];

  const settingsItems: NavItem[] = [
    { to: '/configuracoes', label: 'Configurações Gerais', icon: Settings },
    { to: '/configuracoes/dna', label: 'DNA da Voz', icon: Fingerprint },
    { to: '/configuracoes/pilares', label: 'Pilares', icon: Layers },
    { to: '/configuracoes/looks', label: 'Looks & Cenários', icon: Shirt },
    { to: '/configuracoes/regras', label: 'Regras de Ouro', icon: ShieldCheck },
    { to: '/configuracoes/series', label: 'Séries', icon: Palette },
    { to: '/configuracoes/templates', label: 'Templates', icon: LayoutTemplate },
    { to: '/configuracoes/plataformas', label: 'Plataformas', icon: Globe },
  ];

  const renderPrimaryItem = ({ to, label, icon: Icon, badge }: NavItem) => (
    <NavLink
      key={to}
      to={to}
      className={({ isActive }) =>
        cn(
          't-button t-button-uppercase group flex items-center gap-3 rounded-2xl px-3 py-3 transition-all duration-200',
          isActive
            ? 'bg-[#121a31] text-white shadow-[0_14px_28px_rgba(18,26,49,0.18)]'
            : 'text-[var(--text-primary)]/70 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
        )
      }
    >
      {({ isActive }) => (
        <>
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-xl border transition-colors',
              isActive
                ? 'border-transparent bg-[#1b2544] text-[#ffb547]'
                : 'border-[var(--border-color)] bg-white text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]'
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <span className="flex-1 truncate">{label}</span>
          {badge ? (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-bold tracking-normal',
                isActive
                  ? 'bg-white/12 text-white'
                  : 'border border-[var(--border-color)] bg-white text-[var(--text-tertiary)]'
              )}
            >
              {badge}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );

  const renderSettingsItem = ({ to, label, icon: Icon }: NavItem) => (
    <NavLink
      key={to}
      to={to}
      className={({ isActive }) =>
        cn(
          't-label flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
          isActive
            ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
            : 'text-[var(--text-primary)]/45 hover:text-[var(--text-primary)]/75'
        )
      }
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );

  const sidebarContent = (
    <div className="flex h-full w-full flex-col border-r border-[var(--border-color)] bg-[var(--bg-primary)] px-5 py-6 text-[var(--text-primary)] md:px-4 md:py-7">
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] bg-[#121a31] text-white shadow-[0_18px_30px_rgba(18,26,49,0.18)]">
            <Fingerprint className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[0.95rem] font-black uppercase tracking-[0.38em] text-[#121a31]">
              Core
            </p>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-[#8da0cb]">
              Creator
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="rounded-2xl border border-[var(--border-color)] bg-white p-3 text-[var(--text-tertiary)] shadow-sm transition-colors hover:text-[var(--text-primary)] md:hidden"
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-8 rounded-[1.75rem] border border-[var(--border-color)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,248,251,0.96))] px-4 py-3 shadow-[0_10px_24px_rgba(12,20,40,0.04)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-white text-base font-black uppercase shadow-sm">
            {userInitial}
          </div>
          <div className="min-w-0">
            <p className="t-body-strong truncate text-[var(--text-primary)]">{displayName}</p>
            <p className="t-secondary truncate text-[#8093b8]">{user?.email}</p>
          </div>
        </div>
      </div>

      <button
        onClick={openCommandPalette}
        className="t-body mb-8 flex w-full items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-left text-[var(--text-tertiary)] shadow-sm transition-colors hover:border-[#ccd5e7] hover:text-[var(--text-primary)]"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1">Buscar...</span>
        <span className="t-label rounded-lg bg-[var(--bg-hover)] px-2 py-1 text-[#a4afc5]">
          Ctrl K
        </span>
      </button>

      <nav className="custom-scrollbar flex-1 overflow-y-auto pr-1">
        <div className="mb-4">
          <p className="t-label mb-3 px-2 text-[#96a8ce]">
            Menu principal
          </p>
          <div className="space-y-1.5">{mainItems.map(renderPrimaryItem)}</div>
        </div>

        <div className="mt-8">
          <p className="t-label mb-3 px-2 text-[#96a8ce]">
            Sistema
          </p>

          <button
            onClick={() => setSettingsExpanded((current) => !current)}
            className="t-button t-button-uppercase flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[var(--text-primary)]/75 transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--border-color)] bg-white text-[var(--text-tertiary)]">
              <Settings className="h-4 w-4" />
            </div>
            <span className="flex-1">Configurações</span>
            {settingsExpanded ? (
              <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)]" />
            ) : (
              <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
            )}
          </button>

          <AnimatePresence initial={false}>
            {settingsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="ml-4 mt-2 border-l border-[var(--border-color)] pl-4">
                  <div className="space-y-1">{settingsItems.map(renderSettingsItem)}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      <div className="mt-6 border-t border-[var(--border-color)] pt-5">
        <div className="overflow-hidden rounded-[1.6rem] border border-[var(--border-color)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,252,0.96))] shadow-[0_12px_28px_rgba(12,20,40,0.05)]">
          <button
            onClick={toggleTheme}
            className="group flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/80"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-white text-[var(--text-tertiary)] shadow-sm transition-colors group-hover:text-[var(--text-primary)]">
                {state.theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#9aa8c5]">
                  Aparencia
                </p>
                <p className="truncate text-[12px] font-black uppercase tracking-[0.12em] text-[var(--text-primary)]">
                  {state.theme === 'light' ? 'Modo Noturno' : 'Modo Claro'}
                </p>
              </div>
            </div>
            <div className="rounded-full border border-[var(--border-color)] bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#91a1c1] shadow-sm">
              {state.theme === 'light' ? 'Ativar' : 'Trocar'}
            </div>
          </button>

          <div className="mx-4 h-px bg-[var(--border-color)]" />

          <button
            onClick={signOut}
            className="group flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#fff7f7]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#f2d7d7] bg-white text-[#d36b6b] shadow-sm transition-colors group-hover:bg-[#fff1f1] group-hover:text-[#c94f4f]">
                <LogOut className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#c6a3a3]">
                  Sessao
                </p>
                <p className="truncate text-[12px] font-black uppercase tracking-[0.12em] text-[#b45b5b]">
                  Finalizar Sessao
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[#d3b0b0] transition-transform group-hover:translate-x-0.5 group-hover:text-[#c88484]" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden h-screen w-[290px] shrink-0 md:block">{sidebarContent}</div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-[105] bg-[rgba(9,13,24,0.42)] backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              className="fixed left-0 top-0 z-[110] h-full w-[88vw] max-w-sm overflow-hidden bg-[var(--bg-primary)] shadow-2xl md:hidden"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
