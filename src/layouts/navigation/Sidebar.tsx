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
  Video,
  X,
} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {useAppContext} from '../../context/AppContext';
import {useAuth} from '../../context/AuthContext';
import {getEditorialContents, getPostingContents} from '../../features/contents/lib/contentWorkflow';
import {getModuleFlags} from '../../features/settings/lib/moduleFlags';
import {cn} from '../../lib/utils';

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
      title: 'central',
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
      title: 'fluxo',
      items: [
        {to: '/ideias', label: 'Ideias', icon: Lightbulb},
        {
          to: '/conteudos',
          label: 'Conteudo',
          icon: FileText,
          badge: getEditorialContents(state.contents).length || undefined,
        },
        {
          to: '/gravacao',
          label: 'Gravacao',
          icon: Camera,
          hidden: !moduleFlags.recording,
        },
        {
          to: '/conteudos/historico',
          label: 'Postagem',
          icon: Video,
          badge: getPostingContents(state.contents).length || undefined,
        },
      ],
    },
    {
      title: 'organizacao',
      items: [
        {to: '/calendario', label: 'Calendario', icon: Calendar, hidden: !moduleFlags.calendar},
        {to: '/projetos', label: 'Projetos', icon: FolderKanban, hidden: !moduleFlags.projects},
      ],
    },
    {
      title: 'marketing',
      items: [
        {to: '/analise', label: 'Analise', icon: BarChart3, hidden: !moduleFlags.analytics},
        {to: '/configuracoes/templates', label: 'Templates', icon: LayoutTemplate},
        {to: '/configuracoes/pilares', label: 'Pilares Editoriais', icon: Layers},
        {to: '/configuracoes/regras', label: 'Regras de Ouro', icon: ShieldCheck},
        {to: '/configuracoes/series', label: 'Series', icon: Palette},
      ],
    },
    {
      title: 'configuracoes',
      items: [
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
          'group relative flex items-center gap-3 rounded-[12px] border px-3 py-1.5 transition-all duration-200',
          isActive
            ? 'border-[#f0f2f6] bg-white text-[#1f2430] shadow-sm'
            : 'border-transparent text-[#64748b] hover:bg-[#f7f8fc] hover:text-[#1f2430]'
        )
      }
    >
      {({isActive}) => (
        <>
          <div
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg transition-all',
              isActive ? 'bg-[#4c63ff] text-white' : 'text-[#94a3b8] group-hover:text-[#4c63ff]'
            )}
          >
            <Icon className="h-4 w-4 stroke-[2.2]" />
          </div>
          <span className={cn('flex-1 truncate text-[13px]', isActive ? 'font-bold' : 'font-medium')}>
            {label}
          </span>
          {badge ? (
            <span className="text-[9px] font-bold text-[#94a3b8]">
              {badge}
            </span>
          ) : null}
          {isActive ? (
            <motion.div
              layoutId="active-pill"
              className="absolute left-0 h-4 w-1 rounded-r-full bg-[#4c63ff]"
            />
          ) : null}
        </>
      )}
    </NavLink>
  );

  const sidebarContent = (
    <div className="flex h-full w-full flex-col overflow-hidden border-r border-[#edf0f6] bg-[linear-gradient(180deg,#fdfdff_0%,#fbfbfd_100%)] px-4 py-4 text-[#1f2430]">
      <div className="mb-4 flex items-start justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#18233f] text-white shadow-lg">
            <Fingerprint className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[0.9rem] font-black uppercase tracking-[0.3em] text-[#202635]">Core</p>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#9caed8]">Creator</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="rounded-xl border border-[#e8ebf3] bg-white p-2 text-[#7e8798] transition-colors hover:text-[#1f2430] active:scale-90 md:hidden"
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <button
        onClick={openCommandPalette}
        className="group mb-4 flex w-full items-center gap-3 rounded-[16px] border border-[#e8ebf3] bg-white px-4 py-2 text-left text-[#8a92a4] shadow-sm transition-all hover:border-[#4c63ff]/30"
      >
        <Search className="h-4 w-4 shrink-0 transition-colors group-hover:text-[#4c63ff]" />
        <span className="flex-1 text-[13px] font-semibold">Procurar...</span>
        <span className="rounded-xl bg-[#f3f5f8] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#7e8798]">
          Ctrl K
        </span>
      </button>

      <nav className="flex flex-1 flex-col" role="navigation" aria-label="Principal">
        <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto pr-1">
          {sections.map(section => {
            const visibleItems = section.items.filter(item => !item.hidden);
            if (visibleItems.length === 0) return null;

            return (
              <section key={section.title}>
                <p className="mb-1.5 px-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#9cadcf]">
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
          className="flex w-full items-center gap-3 rounded-2xl border border-transparent bg-[#f8faff] p-2 text-left transition-all hover:border-[#e7ebf3] hover:shadow-sm"
          aria-label="Abrir perfil"
        >
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#4c63ff] to-[#18233f] text-white shadow-sm">
            <User className="h-5 w-5" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-start overflow-hidden">
            <span className="w-full truncate text-[13px] font-bold text-[#202635]">{userName}</span>
            <span className="w-full truncate text-[10px] font-medium text-[#94a3b8]">{userEmail}</span>
          </div>
          <ChevronRight className="h-4 w-4 text-[#94a3b8]" />
        </button>
      </div>

      <div className="shrink-0 border-t border-[#eef1f6] pt-3">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={toggleTheme}
            aria-label={state.theme === 'light' ? 'Ativar modo noturno' : 'Ativar modo claro'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#e7ebf3] bg-white text-[#667287] shadow-sm transition-colors hover:text-[#4c63ff]"
          >
            {state.theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          <button
            onClick={signOut}
            aria-label="Finalizar sessao"
            className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-[#e7ebf3] bg-white text-[11px] font-semibold text-[#667287] shadow-sm transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-500"
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
              className="fixed left-0 top-0 z-[110] h-full w-[88vw] max-w-sm overflow-hidden bg-[#fcfcfd] shadow-2xl md:hidden"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
