import React from 'react';
import {NavLink, useLocation} from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  Calendar,
  Camera,
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
  const {signOut} = useAuth();
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

  const renderNavItem = ({to, label, icon: Icon, badge, end = true}: NavItem) => (
    <NavLink
      key={`${to}-${label}`}
      to={to}
      end={end}
      className={({isActive}) =>
        cn(
          'group relative flex items-center gap-3 rounded-[16px] px-3 py-3 transition-all duration-200',
          isActive
            ? 'bg-[linear-gradient(180deg,#f6f7ff_0%,#f1f3ff_100%)] text-[#1f2430] shadow-[0_10px_24px_rgba(80,92,140,0.08)]'
            : 'text-[#1f2430] hover:bg-[#f7f8fc]'
        )
      }
    >
      {({isActive}) => (
        <>
          {isActive ? (
            <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-full bg-[#4c63ff]" />
          ) : null}
          <div
            className={cn(
              'ml-1 flex h-8 w-8 items-center justify-center rounded-xl transition-colors',
              isActive ? 'text-[#1d2332]' : 'text-[#202532]'
            )}
          >
            <Icon className="h-[18px] w-[18px] stroke-[2.2]" />
          </div>
          <span className="flex-1 truncate text-[14px] font-semibold">{label}</span>
          {badge ? (
            <span
              className={cn(
                'min-w-6 rounded-full px-2 py-0.5 text-center text-[10px] font-bold',
                isActive
                  ? 'bg-white text-[#7a8293] shadow-[0_4px_10px_rgba(80,92,140,0.08)]'
                  : 'bg-[#f0f2f6] text-[#7a8293]'
              )}
            >
              {badge}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );

  const sidebarContent = (
    <div className="flex h-full w-full flex-col border-r border-[#edf0f6] bg-[linear-gradient(180deg,#fdfdff_0%,#fbfbfd_100%)] px-4 py-4 text-[#1f2430] md:px-4 md:py-4">
      <div className="mb-5 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-[54px] w-[54px] items-center justify-center rounded-[18px] bg-[#18233f] text-white shadow-[0_14px_24px_rgba(24,35,63,0.18)]">
            <Fingerprint className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[1rem] font-black uppercase tracking-[0.34em] text-[#202635]">Core</p>
            <p className="mt-0.5 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#9caed8]">
              Creator
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="rounded-2xl border border-[#e8ebf3] bg-white p-3 text-[#7e8798] shadow-sm transition-colors hover:text-[#1f2430] md:hidden"
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <button
        onClick={openCommandPalette}
        className="mb-5 flex w-full items-center gap-3 rounded-[18px] border border-[#e8ebf3] bg-white px-4 py-2.5 text-left text-[#8a92a4] shadow-[0_8px_18px_rgba(17,24,39,0.04)] transition-colors hover:border-[#dbe1ee] hover:text-[#1f2430]"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-[14px] font-semibold">Buscar...</span>
        <span className="rounded-xl bg-[#f3f5f8] px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#7e8798]">
          Ctrl K
        </span>
      </button>

      <nav className="custom-scrollbar flex-1 overflow-y-auto pr-1">
        <div className="space-y-5">
          {sections.map(section => {
            const visibleItems = section.items.filter(item => !item.hidden);
            if (visibleItems.length === 0) return null;

            return (
              <section key={section.title}>
                <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.24em] text-[#9cadcf]">
                  {section.title}
                </p>
                <div className="space-y-1.5">{visibleItems.map(renderNavItem)}</div>
              </section>
            );
          })}
        </div>
      </nav>

      <div className="mt-3 border-t border-[#eef1f6] pt-4">
        <div className="flex items-center justify-center gap-5">
          <button
            onClick={toggleTheme}
            aria-label={state.theme === 'light' ? 'Ativar modo noturno' : 'Ativar modo claro'}
            className="flex h-[54px] w-[54px] items-center justify-center rounded-[18px] border border-[#e7ebf3] bg-white text-[#667287] shadow-[0_10px_22px_rgba(17,24,39,0.04)] transition-colors hover:bg-[#f8faff] hover:text-[#1f2430]"
          >
            {state.theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>

          <button
            onClick={signOut}
            aria-label="Finalizar sessao"
            className="flex h-[54px] w-[54px] items-center justify-center rounded-[18px] border border-[#e7ebf3] bg-white text-[#667287] shadow-[0_10px_22px_rgba(17,24,39,0.04)] transition-colors hover:bg-[#fff8f8] hover:text-[#d96a6a]"
          >
            <LogOut className="h-5 w-5" />
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
