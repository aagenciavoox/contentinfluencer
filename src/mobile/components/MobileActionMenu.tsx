import { useEffect, useMemo, useState } from 'react';
import { BookOpen, FileText, Lightbulb, Pin } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { BookAnnotationComposerSheet } from '../../features/library/components/modals/BookAnnotationComposerSheet';
import { createContentDraft } from '../../features/contents/lib/createContentDraft';
import { buildContentDetailRoute } from '../../features/contents/lib/contentDetailRoute';
import { fetchBibliotecaItemById, type BibliotecaItem } from '../../lib/database';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { cn } from '../../lib/utils';

interface MobileActionMenuProps {
  open: boolean;
  onClose: () => void;
}

const ACTIVE_READING_STATUSES = ['Consumindo', 'Lendo', 'Assistindo'] as const;

export function MobileActionMenu({ open, onClose }: MobileActionMenuProps) {
  const { state, dispatch, ensureDataDomains } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isBookComposerOpen, setIsBookComposerOpen] = useState(false);
  const [fetchedBook, setFetchedBook] = useState<BibliotecaItem | null>(null);

  const preferredBookId = typeof state.preferences.mobile_notes_primary_book_id === 'string'
    ? state.preferences.mobile_notes_primary_book_id
    : null;

  const bookFromState = useMemo(() => {
    if (preferredBookId) {
      const pinned = state.bibliotecaItems.find(book => book.id === preferredBookId);
      if (pinned) return pinned;
    }

    return state.bibliotecaItems.find((book) =>
      ACTIVE_READING_STATUSES.includes(book.status as (typeof ACTIVE_READING_STATUSES)[number])
    ) ?? null;
  }, [preferredBookId, state.bibliotecaItems]);

  const currentBook = bookFromState ?? fetchedBook;

  useBodyScrollLock(open);

  useEffect(() => {
    void ensureDataDomains(['library']);
  }, [ensureDataDomains]);

  useEffect(() => {
    if (bookFromState) {
      setFetchedBook(null);
      return undefined;
    }

    if (!preferredBookId || !user?.id) {
      setFetchedBook(null);
      return undefined;
    }

    let cancelled = false;
    void fetchBibliotecaItemById(user.id, preferredBookId).then(book => {
      if (!cancelled) setFetchedBook(book);
    });

    return () => {
      cancelled = true;
    };
  }, [bookFromState, preferredBookId, user?.id]);

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
    const newContent = createContentDraft({ title: '' });
    void dispatch({ type: 'ADD_CONTENT', payload: newContent });
    navigate(`${buildContentDetailRoute(newContent.id)}&focus=script`, { replace: true });
    onClose();
  };

  const handleNewAnnotation = () => {
    if (!currentBook) return;
    setIsBookComposerOpen(true);
    onClose();
  };

  const actions = [
    {
      label: 'Nova ideia',
      icon: <Lightbulb className="h-5 w-5" />,
      onClick: handleNewIdea,
      accentClassName: 'text-[var(--accent-orange)] bg-[var(--accent-orange)]/10',
      disabled: false,
    },
    {
      label: 'Novo roteiro',
      icon: <FileText className="h-5 w-5" />,
      onClick: handleNewContent,
      accentClassName: 'text-[var(--accent-blue)] bg-[var(--accent-blue)]/10',
      disabled: false,
    },
    {
      label: 'Nova anotacao',
      icon: <BookOpen className="h-5 w-5" />,
      onClick: handleNewAnnotation,
      accentClassName: 'text-[var(--accent-purple)] bg-[var(--accent-purple)]/10',
      disabled: !currentBook,
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
              className="fixed inset-0 z-[100] bg-[var(--backdrop-medium)] backdrop-blur-[2px] md:hidden"
              onClick={onClose}
              aria-hidden="true"
            />

            <motion.section
              role="dialog"
              aria-modal="true"
              aria-label="Acoes rapidas"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.12}
              onDragEnd={(_, info) => {
                if (info.offset.y > 72 || info.velocity.y > 600) onClose();
              }}
              className="fixed inset-x-0 bottom-0 z-[110] rounded-t-[1.75rem] border border-b-0 border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-[0_-12px_40px_rgba(0,0,0,0.2)] md:hidden"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 4.5rem)' }}
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="h-1 w-10 rounded-full bg-[var(--border-strong)]" aria-hidden="true" />
              </div>

              <div className="grid grid-cols-3 gap-2 px-4 pb-3">
                {actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className={cn(
                      'flex min-h-11 flex-col items-center justify-center gap-2 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-2 py-3 text-center transition-colors active:scale-[0.98]',
                      action.disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-[var(--bg-hover)]'
                    )}
                  >
                    <div className={cn('rounded-xl p-2.5', action.accentClassName)}>
                      {action.icon}
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-primary)]">
                      {action.label.replace('Nova ', '').replace('Novo ', '')}
                    </span>
                  </button>
                ))}
              </div>

              {currentBook ? (
                <p className="px-4 pb-2 text-center text-xs text-[var(--text-tertiary)]">
                  {preferredBookId === currentBook.id ? (
                    <span className="inline-flex items-center gap-1">
                      <Pin className="h-3 w-3 text-[var(--accent-purple)]" />
                      Anotacao em {currentBook.titulo}
                    </span>
                  ) : (
                    <>Anotacao em {currentBook.titulo}</>
                  )}
                </p>
              ) : null}
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
