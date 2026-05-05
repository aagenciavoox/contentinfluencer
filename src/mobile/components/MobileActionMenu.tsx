import { useEffect, useState } from 'react';
import { BookOpen, FileText, Lightbulb, Pin } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { BookAnnotationComposerSheet } from '../../features/library/components/modals/BookAnnotationComposerSheet';
import { createContentDraft } from '../../features/contents/lib/createContentDraft';
import { buildContentDetailRoute } from '../../features/contents/lib/contentDetailRoute';
import { cn } from '../../lib/utils';

interface MobileActionMenuProps {
  open: boolean;
  onClose: () => void;
}

export function MobileActionMenu({ open, onClose }: MobileActionMenuProps) {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [isBookComposerOpen, setIsBookComposerOpen] = useState(false);

  const preferredBookId = typeof state.preferences.mobile_notes_primary_book_id === 'string'
    ? state.preferences.mobile_notes_primary_book_id
    : null;

  const currentBook = (
    (preferredBookId ? state.bibliotecaItems.find(book => book.id === preferredBookId) : null)
    ?? state.bibliotecaItems.find((book) => ['Consumindo', 'Lendo', 'Assistindo'].includes(book.status))
  );

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  const handleNewIdea = () => {
    navigate('/ideias?compose=1');
    onClose();
  };

  const handleNewContent = () => {
    const newContent = createContentDraft();
    void dispatch({ type: 'ADD_CONTENT', payload: newContent });
    navigate(buildContentDetailRoute(newContent.id));
    onClose();
  };

  const handleNewAnnotation = () => {
    if (currentBook) {
      setIsBookComposerOpen(true);
    }
    onClose();
  };

  const actions = [
    {
      label: 'Nova ideia',
      helper: 'Captura rapida na tela de ideias',
      icon: <Lightbulb className="h-5 w-5" />,
      onClick: handleNewIdea,
      accentClassName: 'text-[var(--accent-orange)] bg-[var(--accent-orange)]/10',
      disabled: false,
      trailing: null,
    },
    {
      label: 'Novo conteudo',
      helper: 'Abre o modal editorial',
      icon: <FileText className="h-5 w-5" />,
      onClick: handleNewContent,
      accentClassName: 'text-[var(--accent-blue)] bg-[var(--accent-blue)]/10',
      disabled: false,
      trailing: null,
    },
    {
      label: 'Nova anotacao',
      helper: currentBook ? currentBook.titulo : 'Defina um item ativo no acervo',
      icon: <BookOpen className="h-5 w-5" />,
      onClick: handleNewAnnotation,
      accentClassName: 'text-[var(--accent-purple)] bg-[var(--accent-purple)]/10',
      disabled: !currentBook,
      trailing: currentBook ? (
        <div className="ml-3 flex shrink-0 items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-hover)] px-3 py-1">
          {preferredBookId === currentBook.id ? (
            <Pin className="h-3 w-3 text-[var(--accent-purple)]" />
          ) : (
            <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent-purple)]" />
          )}
          <span className="t-secondary">{preferredBookId === currentBook.id ? 'Principal' : 'Ativo'}</span>
        </div>
      ) : null,
    },
  ];

  return (
    <>
      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[84] bg-black/35 backdrop-blur-sm md:hidden"
              onClick={onClose}
            />

            <motion.section
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ type: 'spring', damping: 24, stiffness: 320 }}
              className="fixed inset-x-4 bottom-[6.5rem] z-[85] rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.24)] md:hidden"
            >
              <div className="border-b border-[var(--border-color)] px-3 pb-3 pt-1">
                <p className="t-label text-[var(--text-tertiary)]">Acoes rapidas</p>
              </div>

              <div className="mt-2 space-y-2">
                {actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className={cn(
                      'flex w-full items-center justify-between rounded-[1.4rem] p-4 text-left transition-colors active:scale-[0.99]',
                      action.disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-[var(--bg-hover)]'
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={cn('rounded-2xl p-3', action.accentClassName)}>
                        {action.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="t-button t-button-uppercase text-[var(--text-primary)]">{action.label}</p>
                        <p className="t-secondary truncate">{action.helper}</p>
                      </div>
                    </div>

                    {action.trailing}
                  </button>
                ))}
              </div>
            </motion.section>
          </>
        ) : null}
      </AnimatePresence>

      {currentBook ? (
        <BookAnnotationComposerSheet
          book={currentBook}
          open={isBookComposerOpen}
          onClose={() => setIsBookComposerOpen(false)}
        />
      ) : null}
    </>
  );
}
