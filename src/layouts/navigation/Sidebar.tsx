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
  FolderKanban,
  Globe,
  Layers,
  LayoutDashboard,
  LayoutTemplate,
  Lightbulb,
  LogOut,
  Moon,
  Palette,
  Search,
  ShieldCheck,
  Sun,
  User,
  X,
} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {useAppContext} from '../../context/AppContext';
import {useAuth} from '../../context/AuthContext';
import {getEditorialContents} from '../../features/contents/lib/contentWorkflow';
import {getModuleFlags} from '../../features/settings/lib/moduleFlags';
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

type NavSection = {
  title: string;
  items: NavItem[];
};

export function Sidebar({isOpen, onClose}: SidebarProps) {
  const {state, dispatch} = useAppContext();
  const {signOut, user} = useAuth();
  const location = useLocation();
  const previousPathname = React.useRef(location.pathname);
  const moduleFlags = getModuleFlags(state.preferences);

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

  const toggleTheme = () => {
    dispatch({type: 'SET_THEME', payload: state.theme === 'light' ? 'dark' : 'light'});
  };

  const openCommandPalette = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', {key: 'k', metaKey: true, ctrlKey: true}));
  };

  const sections: NavSection[] = [
    {
      title: 'Criar',
      items: [
        {to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard},
        {
          to: '/biblioteca',
          label: 'Biblioteca',
          icon: BookOpen,
          badge: state.bibliotecaItems.length || undefined,
          hidden: !moduleFlags.library,
        },
      ],
    },
    {
      title: 'Planejar',
      items: [
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
      ],
    },
    {
      title: 'Executar',
      items: [
        {to: '/calendario', label: 'Calendario', icon: Calendar, hidden: !moduleFlags.calendar},
        {to: '/projetos', label: 'Projetos', icon: FolderKanban, hidden: !moduleFlags.projects},
      ],
    },
    {
      title: 'Analisar',
      items: [
        {to: '/analise', label: 'Analise', icon: BarChart3, hidden: !moduleFlags.analytics},
      ],
    },
    {
      title: 'Sistema',
      items: [
        {to: '/configuracoes/templates', label: 'Templates', icon: LayoutTemplate},
        {to: '/configuracoes/pilares', label: 'Pilares Editoriais', icon: Layers},
        {to: '/configuracoes/regras', label: 'Regras de Ouro', icon: ShieldCheck},
        {to: '/configuracoes/series', label: 'Series', icon: Palette},
        {to: '/configuracoes/dna', label: 'DNA da Voz', icon: Fingerprint},
        {to: '/configuracoes/plataformas', label: 'Plataformas', icon: Globe},
      ],
    },
  ];

  const userName =
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split('@')[0] ||
    'Utilizador';
  const userEmail = user?.email || 'user@exemplo.com';

  const renderNavItem = ({to, label, icon: Icon, badge, end = true}: NavItem) => (
    <NavLink
      key={`${to}-${label}`}
      to={to}
      end={end}
      className={({isActive}) =>
        cn(
          'group relative flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all duration-200',
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
              'flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200',
              isActive
                ? 'bg-[color-mix(in_srgb,var(--accent-blue),var(--accent-purple)_18%)] text-white'
                : 'text-[var(--text-tertiary)] group-hover:text-[var(--accent-blue)]'
            )}
          >
            <Icon className="h-4 w-4 stroke-[2.2]" />
          </div>
          <span className={cn('flex-1 truncate text-[13px]', isActive ? 'font-semibold' : 'font-medium')}>
            {label}
          </span>
          {badge ? (
            <span className="text-[11px] font-medium text-[var(--text-tertiary)]">
              {badge}
            </span>
          ) : null}
          {isActive ? (
            <motion.div
              layoutId="active-pill"
              className="absolute left-0 h-5 w-1 rounded-r-full bg-[var(--accent-blue)]"
            />
          ) : null}
        </>
      )}
    </NavLink>
  );

  const sidebarContent = (
    <div className="flex h-full w-full flex-col overflow-hidden border-r border-[var(--border-color)] bg-[color-mix(in_srgb,var(--bg-secondary)_88%,transparent)] px-4 py-4 text-[var(--text-primary)] backdrop-blur-xl">
      <div className="mb-6 flex items-start justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--accent-blue),var(--accent-purple)_22%)] text-white shadow-[0_12px_28px_color-mix(in_srgb,var(--accent-blue),transparent_82%)]">
            <Fingerprint className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[0.95rem] font-semibold leading-tight text-[var(--text-primary)]">Core Creator</p>
            <p className="text-[0.78rem] font-medium leading-tight text-[var(--text-secondary)]">Editorial OS</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] active:scale-95 md:hidden"
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <button
        onClick={openCommandPalette}
        className="group mb-6 flex w-full items-center gap-3 rounded-lg border border-[var(--border-color)] bg-[color-mix(in_srgb,var(--bg-elevated),transparent_8%)] px-3 py-2.5 text-left text-[var(--text-secondary)] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent-blue),var(--border-color)_46%)] hover:bg-[var(--bg-elevated)]"
      >
        <Search className="h-4 w-4 shrink-0 transition-colors group-hover:text-[var(--accent-blue)]" />
        <span className="flex-1 text-[13px] font-medium">Procurar...</span>
        <span className="rounded-md bg-[var(--bg-hover)] px-2 py-1 text-[11px] font-medium text-[var(--text-tertiary)]">
          Ctrl K
        </span>
      </button>

      <nav className="flex flex-1 flex-col" role="navigation" aria-label="Principal">
        <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto pr-1">
          {sections.map(section => {
            const visibleItems = section.items.filter(item => !item.hidden);
            if (visibleItems.length === 0) return null;

            return (
              <section key={section.title}>
                <p className="mb-2 px-2 text-[11px] font-semibold text-[var(--text-tertiary)]">
                  {section.title}
                </p>
                <div className="space-y-0.5">{visibleItems.map(renderNavItem)}</div>
              </section>
            );
          })}
        </div>
      </nav>

      <div className="mt-auto shrink-0 pb-2 pt-4">
        <button
          className="flex w-full items-center gap-3 rounded-lg border border-transparent bg-[var(--surface-subtle)] p-2 text-left transition-all hover:border-[var(--border-color)] hover:shadow-sm"
          aria-label="Abrir perfil"
        >
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--accent-purple),var(--accent-blue)_34%)] text-white shadow-sm">
            <User className="h-5 w-5" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-start overflow-hidden">
            <span className="w-full truncate text-[13px] font-semibold text-[var(--text-primary)]">{userName}</span>
            <span className="w-full truncate text-[11px] font-normal text-[var(--text-secondary)]">{userEmail}</span>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
        </button>
      </div>

      <div className="shrink-0 border-t border-[var(--border-color)] pt-3">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={toggleTheme}
            aria-label={state.theme === 'light' ? 'Ativar modo noturno' : 'Ativar modo claro'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] shadow-sm transition-colors hover:text-[var(--accent-blue)]"
          >
            {state.theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          <button
            onClick={signOut}
            aria-label="Finalizar sessao"
            className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[12px] font-medium text-[var(--text-secondary)] shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
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
              className="fixed left-0 top-0 z-[110] h-full w-[min(88vw,320px)] overflow-hidden shadow-2xl md:hidden"
            >
              <MobileSidebarDrawer onClose={onClose} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
