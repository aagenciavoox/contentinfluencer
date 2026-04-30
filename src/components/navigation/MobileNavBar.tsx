import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Plus,
  FileText,
  Lightbulb,
  BookOpen,
  Video,
  Handshake,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../../context/AppContext';
import { ContentDetailModal } from '../ContentDetailModal';
import { BookNotesModal } from '../BookNotesModal';
import { Content } from '../../lib/database';
import { generateUUID } from '../../utils/uuid';

function createEmptyContent(state: ReturnType<typeof useAppContext>['state']): Content {
  return {
    id: generateUUID(),
    userId: '',
    title: '',
    status: 'Ideia',
    slotType: null,
    seriesId: null,
    pilarId: state.pilares[0]?.id || null,
    cenarioId: null,
    lookId: null,
    formatoVisual: null,
    script: null,
    scriptNotes: [],
    tags: [],
    notes: null,
    referencias: null,
    energiaNecessaria: null,
    publishDate: null,
    recordingDate: null,
    link: null,
    bibliotecaItemId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    plataformas: [],
  };
}

type MobileNavItemProps = {
  to: string;
  icon: React.ElementType;
  label: string;
};

function MobileNavItem({ to, icon: Icon, label }: MobileNavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center gap-1.5 transition-all duration-300',
          isActive
            ? 'scale-110 text-[var(--text-primary)]'
            : 'text-[var(--text-tertiary)] opacity-50'
        )
      }
    >
      <Icon className="h-5 w-5" />
      <span className="t-nav uppercase">{label}</span>
    </NavLink>
  );
}

export function MobileNavBar() {
  const { state } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  const currentBook = state.bibliotecaItems.find((book) => book.status === 'Consumindo');

  React.useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  React.useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleNewContent = () => {
    const newContent = createEmptyContent(state);

    setSelectedContent(newContent);
    setIsMenuOpen(false);
  };

  const handleNewIdeia = () => {
    setIsMenuOpen(false);
    navigate('/ideias');
  };

  const handleNewAnotacao = () => {
    if (currentBook) {
      setIsBookModalOpen(true);
    }

    setIsMenuOpen(false);
  };

  const actions = [
    {
      label: 'Nova Ideia',
      icon: <Lightbulb className="h-5 w-5" />,
      onClick: handleNewIdeia,
      color: 'text-[var(--accent-orange)]',
      bgColor: 'bg-[var(--accent-orange)]/10',
      disabled: false,
      helperText: null,
    },
    {
      label: 'Novo Conteúdo',
      icon: <FileText className="h-5 w-5" />,
      onClick: handleNewContent,
      color: 'text-[var(--accent-blue)]',
      bgColor: 'bg-[var(--accent-blue)]/10',
      disabled: false,
      helperText: null,
    },
    {
      label: 'Nova Anotação',
      icon: <BookOpen className="h-5 w-5" />,
      onClick: handleNewAnotacao,
      color: 'text-[var(--accent-purple)]',
      bgColor: 'bg-[var(--accent-purple)]/10',
      disabled: !currentBook,
      helperText: currentBook ? currentBook.titulo : 'Sem livro em andamento',
    },
  ];

  return (
    <>
      <nav
        aria-label="Navegação mobile"
        className="fixed bottom-0 left-0 right-0 z-[90] flex items-center justify-between border-t border-[var(--border-color)] bg-[var(--bg-primary)]/90 px-6 pb-safe pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl md:hidden"
      >
        <MobileNavItem to="/calendario" icon={Calendar} label="Agenda" />
        <MobileNavItem to="/projetos" icon={Handshake} label="Projetos" />

        <div className="relative -top-5">
          <button
            type="button"
            aria-label={isMenuOpen ? 'Fechar menu de ações' : 'Abrir menu de ações'}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-[1.5rem] bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-2xl transition-all duration-500 active:scale-90',
              isMenuOpen
                ? 'scale-90 rotate-[135deg] bg-[var(--accent-pink)]'
                : 'hover:scale-105'
            )}
          >
            <Plus className="h-8 w-8 stroke-[3px]" />
          </button>
        </div>

        <MobileNavItem to="/gravacao" icon={Video} label="Gravação" />
        <MobileNavItem to="/conteudos" icon={FileText} label="Conteúdos" />
      </nav>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-[85] bg-black/40 backdrop-blur-sm md:hidden"
            />

            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
              className="fixed bottom-[110px] left-6 right-6 z-[90] md:hidden"
            >
              <div className="space-y-1 rounded-[2.5rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
                <div className="mb-2 border-b border-[var(--border-color)] px-5 py-3">
                  <p className="t-label text-[var(--text-tertiary)]">Operações Rápidas</p>
                </div>

                {actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    disabled={action.disabled}
                    aria-label={action.label}
                    className={cn(
                      'flex w-full items-center justify-between rounded-2xl p-4 transition-all active:scale-[0.98] active:bg-[var(--bg-hover)]',
                      action.disabled ? 'cursor-not-allowed opacity-30' : ''
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className={cn('rounded-xl p-3 shadow-sm', action.bgColor, action.color)}>
                        {action.icon}
                      </div>

                      <div className="min-w-0 text-left">
                        <span className="t-button t-button-uppercase block text-[var(--text-primary)]">
                          {action.label}
                        </span>

                        {action.helperText && (
                          <span className="t-secondary block max-w-[170px] truncate text-[var(--text-tertiary)]">
                            {action.helperText}
                          </span>
                        )}
                      </div>
                    </div>

                    {action.label === 'Nova Anotação' && currentBook && (
                      <div className="ml-3 flex shrink-0 items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-hover)] px-3 py-1">
                        <div className="h-1 w-1 animate-pulse rounded-full bg-[var(--accent-purple)]" />
                        <span className="t-secondary max-w-[80px] truncate">
                          Ativo
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {selectedContent && (
        <ContentDetailModal
          content={selectedContent}
          isNewContent={true}
          onClose={() => setSelectedContent(null)}
        />
      )}

      {isBookModalOpen && currentBook && (
        <BookNotesModal
          book={currentBook}
          onClose={() => setIsBookModalOpen(false)}
        />
      )}
    </>
  );
}
