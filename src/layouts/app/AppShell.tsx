import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lightbulb, Loader2, Search, X } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from '../navigation/Sidebar';
import { CommandPalette } from '../../components/overlays/CommandPalette';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useHideOnScroll } from '../../hooks/useHideOnScroll';
import { MobileAppShell } from '../../mobile/components/shell';
import { MobileActionMenu } from '../../mobile/components/shell';
import { MobileBottomNav } from '../../mobile/components/shell';
import { MobileHeaderIOS } from '../../mobile/components/shell';
import type { MobileChromeOutletContext } from '../../mobile/components/shell';
import { MobileScrollLockProvider } from '../../context/MobileScrollLockContext';
import { resolveMobileRouteMeta } from '../../mobile/config/mobileRouteMeta';
import { resolveRouteBack } from '../../lib/navigation/detailBack';
import { SaveFeedbackToast } from '../../components/ui/SaveFeedbackToast';
import { Text } from '../../components/ui/Text';
import { useAppContext } from '../../context/AppContext';
import { forceMobileRefresh } from '../../lib/pwaRefresh';
import { IdeaQuickCapture } from '../../features/ideas/components/IdeaQuickCapture';
import { buildIdeaFields } from '../../features/ideas/lib/ideaText';
import { LOADING } from '../../lib/uiCopy';
import { getModuleFlags } from '../../features/settings/lib/moduleFlags';
import { createContentDraft } from '../../features/contents/lib/createContentDraft';
import { CONTENT_STATUS } from '../../features/contents/lib/contentPipeline';

function AppDataLoadingScreen() {
  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center gap-3 bg-[var(--bg-primary)]">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--text-primary)]" aria-hidden="true" />
      <Text variant="meta">{LOADING.dados}</Text>
    </div>
  );
}

export function AppShell() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [quickNoteTitle, setQuickNoteTitle] = useState('');
  const [quickNoteNotes, setQuickNoteNotes] = useState('');
  const [quickNotePilarId, setQuickNotePilarId] = useState('');
  const [quickNoteSeries, setQuickNoteSeries] = useState('');
  const [quickNoteBibliotecaId, setQuickNoteBibliotecaId] = useState('');

  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { state, dispatch, syncFromServer } = useAppContext();
  const { isHidden, handleScroll } = useHideOnScroll(isMobile);
  const moduleFlags = getModuleFlags(state.preferences);

  const routeMeta = useMemo(() => {
    const contentId = location.pathname.startsWith('/conteudos/')
      ? location.pathname.split('/')[2]
      : null;
    const bibliotecaMatch = location.pathname.match(/^\/biblioteca\/([^/]+)/);
    const bibliotecaId = bibliotecaMatch?.[1];
    const recordingId = location.pathname.startsWith('/gravacao/')
      ? location.pathname.split('/')[2]
      : null;

    return resolveMobileRouteMeta(location.pathname, {
      contentTitle: contentId
        ? state.contents.find(item => item.id === contentId)?.title
        : null,
      bibliotecaTitle: bibliotecaId && bibliotecaId !== 'analise'
        ? state.bibliotecaItems.find(item => item.id === bibliotecaId)?.titulo
        : null,
      recordingBlockName: recordingId
        ? state.recordingBlocks.find(block => block.id === recordingId)?.name
        : null,
    }, location.search);
  }, [location.pathname, location.search, state.bibliotecaItems, state.contents, state.recordingBlocks]);

  const handleOpenCreateMenu = useCallback(() => {
    setIsActionMenuOpen(true);
  }, []);

  const handlePullRefresh = useCallback(async () => {
    await forceMobileRefresh(() => syncFromServer({ silent: true, force: true }));
  }, [syncFromServer]);

  const saveQuickNote = useCallback(() => {
    const fields = buildIdeaFields({title: quickNoteTitle, notes: quickNoteNotes});
    if (!fields.title && !fields.notes) return;
    const newIdea = createContentDraft({
      title: fields.title || 'Ideia sem título',
      status: CONTENT_STATUS.IDEIA,
      notes: fields.notes || null,
      pilarId: quickNotePilarId || null,
      seriesId: quickNoteSeries || null,
      bibliotecaItemId: quickNoteBibliotecaId || null,
    });
    void dispatch({ type: 'ADD_CONTENT', payload: newIdea });
    setQuickNoteTitle('');
    setQuickNoteNotes('');
    setQuickNotePilarId('');
    setQuickNoteSeries('');
    setQuickNoteBibliotecaId('');
    setIsQuickNoteOpen(false);
  }, [quickNoteTitle, quickNoteNotes, quickNotePilarId, quickNoteSeries, quickNoteBibliotecaId, dispatch]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsCommandPaletteOpen((previous) => !previous);
      }
      if (event.key === 'Escape' && isQuickNoteOpen) {
        setIsQuickNoteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuickNoteOpen]);

  useEffect(() => {
    if (!isMobile) return;

    document.documentElement.classList.add('mobile-app-shell');
    return () => {
      document.documentElement.classList.remove('mobile-app-shell');
    };
  }, [isMobile]);

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)');
    const iosStandalone = Boolean(
      (window.navigator as Navigator & { standalone?: boolean }).standalone,
    );

    const sync = () => {
      const isStandalone = mq.matches || iosStandalone;
      root.classList.toggle('pwa-standalone', isStandalone);
    };

    sync();
    mq.addEventListener('change', sync);
    return () => {
      mq.removeEventListener('change', sync);
      root.classList.remove('pwa-standalone');
    };
  }, []);

  const chromeActions: MobileChromeOutletContext = {
    openMobileMenu: () => setIsMobileMenuOpen(true),
    openSearch: () => setIsCommandPaletteOpen(true),
  };

  if (!state.isLoaded) {
    return <AppDataLoadingScreen />;
  }

  if (isMobile) {
    return (
      <MobileScrollLockProvider>
        <div className="h-dvh overflow-hidden bg-[var(--bg-primary)]">
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
        />
        <Sidebar
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
        <MobileAppShell
          hideHeader={Boolean(routeMeta.hideHeader)}
          hideBottomNav={Boolean(routeMeta.hideBottomNav)}
          compactHeader={routeMeta.titleVariant === 'compact-center'}
          header={routeMeta.hideHeader ? null : (
            <MobileHeaderIOS
              title={routeMeta.title}
              subtitle={routeMeta.subtitle}
              titleVariant={routeMeta.titleVariant}
              mode={routeMeta.mode}
              isHidden={isHidden}
              onLeftAction={() => {
                if (routeMeta.mode === 'back') {
                  const target = resolveRouteBack(
                    location.pathname,
                    location.state as { from?: string } | null,
                    routeMeta.backTo ?? '/criacao',
                  );
                  navigate(target);
                  return;
                }
                setIsMobileMenuOpen(true);
              }}
              onRightAction={() => setIsCommandPaletteOpen(true)}
              rightActionIcon={<Search className="h-4 w-4" />}
            />
          )}
          bottomNav={routeMeta.hideBottomNav ? null : (
            <MobileBottomNav
              onOpenCreateMenu={handleOpenCreateMenu}
              moduleFlags={moduleFlags}
            />
          )}
          onScroll={handleScroll}
          onPullRefresh={handlePullRefresh}
        >
          <Outlet context={chromeActions} />
        </MobileAppShell>
        <MobileActionMenu
          open={isActionMenuOpen}
          onClose={() => setIsActionMenuOpen(false)}
        />
        <SaveFeedbackToast />
        </div>
      </MobileScrollLockProvider>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden flex-col md:flex-row bg-transparent">
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <main
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto bg-transparent pb-24 transition-transform duration-300 ease-in-out md:pb-0 md:pt-0"
      >
        <div className="min-h-full">
          <Outlet />
        </div>
      </main>

      {/* Botao flutuante de nota rapida */}
      <button
        onClick={() => setIsQuickNoteOpen(true)}
        title="Nova ideia"
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] shadow-lg transition-all hover:scale-105 hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        <Lightbulb className="h-5 w-5" />
      </button>

      {/* Modal de nota rapida */}
      {isQuickNoteOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-6">
          <div
            className="absolute inset-0 bg-[var(--backdrop-soft)] backdrop-blur-[2px]"
            onClick={() => setIsQuickNoteOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs font-semibold  text-[var(--text-tertiary)]">
                Nova ideia
              </span>
              <button
                onClick={() => setIsQuickNoteOpen(false)}
                className="rounded-lg p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <IdeaQuickCapture
              title={quickNoteTitle}
              notes={quickNoteNotes}
              selectedPilarId={quickNotePilarId}
              selectedSeries={quickNoteSeries}
              selectedBibliotecaId={quickNoteBibliotecaId}
              state={state}
              onTitleChange={setQuickNoteTitle}
              onNotesChange={setQuickNoteNotes}
              onSelectedPilarIdChange={setQuickNotePilarId}
              onSelectedSeriesChange={setQuickNoteSeries}
              onSelectedBibliotecaIdChange={setQuickNoteBibliotecaId}
              onSave={saveQuickNote}
            />
          </div>
        </div>
      )}

      <SaveFeedbackToast />
    </div>
  );
}
