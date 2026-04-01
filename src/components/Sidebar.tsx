import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Table,
  Lightbulb,
  Layers,
  BarChart3,
  Calendar,
  Video,
  ChevronDown,
  ChevronRight,
  Fingerprint,
  Plus,
  X,
  Briefcase,
  Search,
  BookOpen,
  Settings,
  Palette,
  ShieldCheck,
  Shirt,
  Home,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Series } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDNA: () => void;
}

export function Sidebar({ isOpen, onClose, onOpenDNA }: SidebarProps) {
  const { state, dispatch } = useAppContext();
  const { user, signOut } = useAuth();
  const [seriesExpanded, setSeriesExpanded] = React.useState(true);
  const [settingsExpanded, setSettingsExpanded] = React.useState(false);
  const location = useLocation();

  const handleAddSeries = (e: React.MouseEvent) => {
    e.stopPropagation();
    const name = prompt('Nome da nova série:');
    if (!name) return;

    const newSeries: Series = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      template: '',
      notes: '',
    };
    dispatch({ type: 'ADD_SERIES', payload: newSeries });
  };

  React.useEffect(() => {
    onClose();
  }, [location.pathname]);

  const toggleTheme = () => {
    dispatch({ type: 'SET_THEME', payload: state.theme === 'light' ? 'dark' : 'light' });
  };

  const navLink = (to: string, Icon: React.ElementType, label: string) => (
    <NavLink
      key={to}
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-4 px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all',
          isActive
            ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] shadow-sm border-l-4 border-[var(--text-primary)]'
            : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)] opacity-60 hover:opacity-100 italic'
        )
      }
    >
      <Icon className="w-4 h-4" />
      {label}
    </NavLink>
  );

  const settingsItems = [
    { to: '/settings/pilares', icon: Palette, label: 'Pilares' },
    { to: '/settings/looks', icon: Shirt, label: 'Looks & Cenários' },
    { to: '/settings/regras', icon: ShieldCheck, label: 'Regras de Ouro' },
  ];

  const sidebarContent = (
    <div className="w-72 h-full bg-[var(--bg-primary)] border-r border-[var(--border-color)] flex flex-col pt-14 pb-8 md:py-8 select-none transition-colors duration-200">
      {/* Logo */}
      <div className="px-6 mb-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--text-primary)] rounded-xl flex items-center justify-center text-[var(--bg-primary)] shadow-lg">
            <Fingerprint className="w-5 h-5" />
          </div>
          <h1 className="text-[11px] font-black text-[var(--text-primary)] uppercase tracking-[0.4em] italic leading-none">
            Content OS
          </h1>
        </div>
        <button
          onClick={onClose}
          className="md:hidden p-3 -mr-2 bg-[var(--bg-hover)] rounded-2xl transition-all shadow-sm"
        >
          <X className="w-6 h-6 text-[var(--text-primary)] opacity-80 hover:opacity-100" />
        </button>
      </div>

        {/* Perfil do Usuário */}
        <div className="flex items-center gap-4 mb-10 px-2 py-4 border-b border-[var(--border-color)]">
          <div className="w-10 h-10 rounded-2xl bg-[var(--text-primary)] flex items-center justify-center text-[var(--bg-primary)] shadow-lg shrink-0">
             <span className="font-black text-sm uppercase">
               {user?.user_metadata?.full_name?.charAt(0) || 'U'}
             </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] truncate">
              {user?.user_metadata?.full_name || 'Agente de Operações'}
            </p>
            <p className="text-[9px] font-bold opacity-30 text-[var(--text-primary)] truncate">
              {user?.email}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 mb-8 overflow-y-auto pr-2 custom-scrollbar">
        {/* Busca */}
        <button
          onClick={() =>
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
          }
          className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[var(--text-primary)]/40 transition-all mb-6 group shadow-sm"
        >
          <Search className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
          <span className="flex-1 text-left italic">Diretório de Ideias</span>
          <span className="text-[9px] bg-[var(--border-color)] px-2 py-1 rounded-lg opacity-40 group-hover:opacity-100 font-bold">
            ⌘K
          </span>
        </button>

        {/* 1. Início */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-4 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all mb-2',
              isActive
                ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-xl scale-[1.02]'
                : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)] opacity-60 hover:opacity-100 italic'
            )
          }
        >
          <Home className="w-4 h-4" />
          Início
        </NavLink>

        {/* 2. Editorial */}
        {navLink('/editorial', Calendar, 'Editorial')}

        {/* 3. Biblioteca */}
        <NavLink
          to="/biblioteca"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-4 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all mb-4',
              isActive
                ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-xl scale-[1.02]'
                : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)] opacity-60 hover:opacity-100 italic'
            )
          }
        >
          <BookOpen className="w-4 h-4" />
          Biblioteca
          {state.books.length > 0 && (
            <span className="ml-auto text-[9px] bg-[var(--bg-hover)] px-2 py-0.5 rounded-full font-bold opacity-60">
              {state.books.length}
            </span>
          )}
        </NavLink>

        {/* 4. Inventário com Submenu Resultados */}
        <div className="py-2 space-y-1">
          {navLink('/contents', Table, 'Inventário')}
          <div className="ml-4 pl-4 border-l border-[var(--border-color)]">
            <NavLink
              to="/results"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                  isActive
                    ? 'text-[var(--text-primary)] opacity-100 underline decoration-2 underline-offset-4'
                    : 'text-[var(--text-primary)] opacity-50 hover:opacity-100 italic'
                )
              }
            >
              <BarChart3 className="w-3 h-3 shrink-0" /> Resultados
            </NavLink>
          </div>
        </div>

        {/* 5. Calendário (Agenda + Projetos) */}
        {navLink('/calendar', Calendar, 'Calendário')}

        {/* 6. Ideias */}
        {navLink('/ideas', Lightbulb, 'Ideias')}

        {/* Extras: Gestão e Produção Avançada */}
        <div className="pt-4 border-t border-[var(--border-color)] mt-4 space-y-1">
          {/* Outras áreas futuras de produção rápida podem entrar aqui */}
        </div>

        {/* Configurações */}
        <div className="pt-4 border-t border-[var(--border-color)] mt-4 space-y-1">
          <button
            onClick={() => setSettingsExpanded(!settingsExpanded)}
            className="w-full flex items-center gap-4 px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-50 hover:opacity-100 hover:bg-[var(--bg-hover)] transition-all"
          >
            <Settings className="w-4 h-4" />
            <span className="flex-1 text-left italic">Configurações</span>
            {settingsExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          <AnimatePresence>
            {settingsExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 ml-6 space-y-3 border-l border-[var(--border-color)] pl-3 overflow-hidden text-[10px] font-black uppercase tracking-widest"
              >
                {/* Modos e Telas de Configurações */}
                <div className="space-y-1">
                  {settingsItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-3 py-2 rounded-xl transition-all',
                          isActive
                            ? 'text-[var(--text-primary)] opacity-100 underline decoration-2 underline-offset-4'
                            : 'text-[var(--text-primary)] opacity-50 hover:opacity-100 italic'
                        )
                      }
                    >
                      <Icon className="w-3 h-3 shrink-0" />
                      {label}
                    </NavLink>
                  ))}
                </div>

                <div className="border-t border-[var(--border-color)]/50 pt-2 space-y-1">
                  {/* Arquivos de DNA / Séries */}
                  <button
                    onClick={() => setSeriesExpanded(!seriesExpanded)}
                    className="flex w-full items-center gap-3 px-3 py-2 rounded-xl text-[var(--text-primary)] opacity-60 hover:opacity-100 transition-all italic hover:bg-[var(--bg-hover)]"
                  >
                    <Layers className="w-3 h-3 shrink-0" />
                    <span className="flex-1 text-left">Arquivos de DNA</span>
                    <div className="flex items-center gap-2">
                       <span onClick={handleAddSeries} className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg opacity-80 hover:opacity-100 border border-transparent hover:border-[var(--border-color)] bg-white/5">
                         <Plus className="w-3 h-3" />
                       </span>
                    </div>
                  </button>

                  <AnimatePresence>
                    {seriesExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="ml-3 pl-3 border-l border-[var(--border-color)] overflow-hidden space-y-1 my-1"
                      >
                        {state.series.map((s) => (
                          <NavLink
                            key={s.id}
                            to={`/series/${s.id}`}
                            className={({ isActive }) =>
                              cn(
                                'flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-[9.5px]',
                                isActive
                                  ? 'text-[var(--text-primary)] opacity-100 underline decoration-2 underline-offset-4'
                                  : 'text-[var(--text-primary)] opacity-50 hover:opacity-100 italic'
                              )
                            }
                          >
                            <div
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: s.cor || 'currentColor', opacity: s.cor ? 1 : 0.3 }}
                            />
                            <span className="truncate">{s.name}</span>
                          </NavLink>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="border-t border-[var(--border-color)]/50 pt-2">
                   {/* Voz Única DNA */}
                  <button
                    onClick={onOpenDNA}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-[1rem] text-[var(--bg-primary)] bg-[var(--text-primary)] transition-all shadow-md group hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Fingerprint className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left">Voz Única (DNA)</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Rodapé */}
      <div className="px-4 mt-auto space-y-3 pt-6 border-t border-[var(--border-color)]">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-60 hover:opacity-100 hover:bg-[var(--bg-hover)] transition-all bg-[var(--bg-secondary)]/50 border border-transparent hover:border-[var(--border-color)]"
        >
          <div className="w-5 h-5 flex items-center justify-center text-lg">
            {state.theme === 'light' ? '☾' : '☼'}
          </div>
          {state.theme === 'light' ? 'Modo Noturno' : 'Modo Solar'}
        </button>

        <button
          onClick={signOut}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-red-500 opacity-60 hover:opacity-100 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <X className="w-4 h-4" />
          </div>
          Sair da Conta
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden md:block h-screen">{sidebarContent}</div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-full z-50 md:hidden"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
