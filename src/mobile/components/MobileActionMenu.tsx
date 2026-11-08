import { InlineNotice } from '../../components/ui/InlineNotice';
import { Text } from '../../components/ui/Text';
import { useEffect, useMemo, useState } from 'react';
import { BookOpen, BookPlus, FileText, Lightbulb, Pin, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { createScriptWithPublications } from '../../features/contents/lib/creationContent';
import { buildContentDetailRoute } from '../../features/contents/lib/contentDetailRoute';
import { ScriptComposer } from '../../features/creation/components/ScriptComposer';
import { BookAnnotationComposerSheet } from '../../features/library/components/modals/BookAnnotationComposerSheet';
import { getModuleFlags } from '../../features/settings/lib/moduleFlags';
import { fetchBibliotecaItemById, type BibliotecaItem, type ContentPlataforma } from '../../lib/database';
import { buildDetailBackState } from '../../lib/navigation/detailBack';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { IconButton } from '../../components/ui/IconButton';
import { cn } from '../../lib/utils';

interface MobileActionMenuProps {
  open: boolean;
  onClose: () => void;
}

export function MobileActionMenu({ open, onClose }: MobileActionMenuProps) {
  const { state, ensureDataDomains, dispatch } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isBookComposerOpen, setIsBookComposerOpen] = useState(false);
  const [isScriptComposerOpen, setIsScriptComposerOpen] = useState(false);
  const [fetchedBook, setFetchedBook] = useState<BibliotecaItem | null>(null);
  const [pinnedLookup, setPinnedLookup] = useState<'idle' | 'loading' | 'missing'>('idle');

  const pinnedBookId = typeof state.preferences.mobile_notes_primary_book_id === 'string'
    ? state.preferences.mobile_notes_primary_book_id
    : null;

  const bookFromState = useMemo(() => {
    if (!pinnedBookId) return null;
    return state.bibliotecaItems.find(book => book.id === pinnedBookId) ?? null;
  }, [pinnedBookId, state.bibliotecaItems]);

  const pinnedBook = bookFromState ?? (fetchedBook?.id === pinnedBookId ? fetchedBook : null);

  useBodyScrollLock(open);

  useEffect(() => {
    void ensureDataDomains(['library']);
  }, [ensureDataDomains]);

  useEffect(() => {
    if (!pinnedBookId || bookFromState) {
      setFetchedBook(null);
      setPinnedLookup('idle');
      return undefined;
    }

    if (!user?.id) {
      setFetchedBook(null);
      setPinnedLookup('missing');
      return undefined;
    }

    let cancelled = false;
    setPinnedLookup('loading');
    void fetchBibliotecaItemById(user.id, pinnedBookId).then(book => {
      if (cancelled) return;
      setFetchedBook(book);
      setPinnedLookup(book ? 'idle' : 'missing');
    });

    return () => {
      cancelled = true;
    };
  }, [bookFromState, pinnedBookId, user?.id]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  const moduleFlags = getModuleFlags(state.preferences);

  const handleNewIdea = () => {
    navigate('/criacao?compose=idea');
    onClose();
  };

  // Novo roteiro passa antes pela escolha das redes, como na Criação.
  const handleNewContent = () => {
    setIsScriptComposerOpen(true);
    onClose();
  };

  const handleCreateScript = (plataformas: ContentPlataforma[]) => {
    setIsScriptComposerOpen(false);
    const content = createScriptWithPublications(plataformas, { title: 'Novo roteiro' });
    void dispatch({ type: 'ADD_CONTENT', payload: content });
    navigate(
      `${buildContentDetailRoute(content.id)}&focus=script`,
      buildDetailBackState('/criacao?tab=roteiros'),
    );
  };

  const handleNewLibraryItem = () => {
    navigate('/biblioteca?compose=novo');
    onClose();
  };

  const handleNewAnnotation = () => {
    if (!pinnedBook) return;
    setIsBookComposerOpen(true);
    onClose();
  };

  const openLibraryToPin = () => {
    navigate('/biblioteca');
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
    ...(moduleFlags.library
      ? [{
          label: 'Novo item',
          icon: <BookPlus className="h-5 w-5" />,
          onClick: handleNewLibraryItem,
          accentClassName: 'text-[var(--accent-green)] bg-[var(--accent-green)]/10',
          disabled: false,
        }]
      : []),
    {
      label: 'Nova anotação',
      icon: <BookOpen className="h-5 w-5" />,
      onClick: handleNewAnnotation,
      accentClassName: 'text-[var(--accent-purple)] bg-[var(--accent-purple)]/10',
      disabled: false,
    },
  ];

  const pinNotice = !pinnedBookId
    ? 'Fixe um item na biblioteca. A anotação rápida só entra no item com o alfinete.'
    : pinnedLookup === 'missing'
      ? 'O item fixado não está mais na biblioteca. Fixe outro para anotar.'
      : null;

  return (
    <>
      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-[var(--backdrop-medium)] backdrop-blur-[2px]"
              onClick={onClose}
              aria-hidden="true"
            />

            <motion.section
              role="dialog"
              aria-modal="true"
              aria-label="Ações rápidas"
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
              className="fixed inset-x-0 bottom-0 z-[110] rounded-t-[var(--radius-overlay)] border border-b-0 border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-[var(--shadow-modal)]"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 4.5rem)' }}
            >
              <div className="relative flex h-14 items-start justify-center pt-3">
                <div className="h-1 w-10 rounded-full bg-[var(--border-strong)]" aria-hidden="true" />
                <IconButton
                  label="Fechar"
                  onClick={onClose}
                  className="absolute right-3 top-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)]"
                >
                  <X className="h-4 w-4" aria-hidden />
                </IconButton>
              </div>

              <div className={cn('grid gap-2 px-4 pb-3', actions.length > 3 ? 'grid-cols-2' : 'grid-cols-3')}>
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
                    <div className={cn('rounded-[var(--radius-card)] p-2.5', action.accentClassName)}>
                      {action.icon}
                    </div>
                    <Text variant="bodyStrong" as="span" className="text-[var(--text-primary)]">
                      {action.label.replace('Nova ', '').replace('Novo ', '')}
                    </Text>
                  </button>
                ))}
              </div>

              {pinnedBook ? (
                <Text variant="meta" as="p" className="px-4 pb-2 text-center text-[var(--text-tertiary)]">
                  <span className="inline-flex items-center gap-1">
                    <Pin className="h-3 w-3 text-[var(--accent-purple)]" />
                    Anotação em {pinnedBook.titulo}
                  </span>
                </Text>
              ) : pinNotice ? (
                <div className="px-4 pb-3">
                  <InlineNotice
                    texto={pinNotice}
                    acao={{ rotulo: 'Abrir biblioteca', onClick: openLibraryToPin }}
                  />
                </div>
              ) : null}
            </motion.section>
          </>
        ) : null}
      </AnimatePresence>

      <ScriptComposer
        open={isScriptComposerOpen}
        onClose={() => setIsScriptComposerOpen(false)}
        onCreate={handleCreateScript}
      />

      {pinnedBook ? (
        <BookAnnotationComposerSheet
          book={pinnedBook}
          open={isBookComposerOpen}
          onClose={() => setIsBookComposerOpen(false)}
        />
      ) : null}
    </>
  );
}
