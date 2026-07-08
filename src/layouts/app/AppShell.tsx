import { useCallback, useEffect, useState } from 'react';
import { Lightbulb, Search, X } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from '../navigation/Sidebar';
import { CommandPalette } from '../../components/overlays/CommandPalette';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useHideOnScroll } from '../../hooks/useHideOnScroll';
import { MobileActionMenu } from '../../mobile/components/MobileActionMenu';
import { MobileAppShell } from '../../mobile/components/MobileAppShell';
import { MobileBottomNav } from '../../mobile/components/MobileBottomNav';
import { MobileHeaderIOS } from '../../mobile/components/MobileHeaderIOS';
import { getMobileRouteMeta } from '../../mobile/config/mobileRouteMeta';
import { resolveRouteBack } from '../../lib/navigation/detailBack';
import { SaveFeedbackToast } from '../../components/ui/SaveFeedbackToast';
import { useAppContext } from '../../context/AppContext';
import { forceMobileRefresh } from '../../lib/pwaRefresh';
import { IdeaQuickCapture } from '../../features/ideas/components/IdeaQuickCapture';
import { buildIdeaFields } from '../../features/ideas/lib/ideaText';
import { generateUUID } from '../../utils/uuid';
import type { Idea } from '../../lib/database';
import { getModuleFlags } from '../../features/settings/lib/moduleFlags';

export function AppShell() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
  const [quickNoteTitle, setQuickNoteTitle] = useState('');
  const [quickNoteNotes, setQuickNoteNotes] = useState('');
  const [quickNotePilarId, setQuickNotePilarId] = useState('');
  const [quickNoteSeries, setQuickNoteSeries] = useState('');
  const [quickNoteBibliotecaId, setQuickNoteBibliotecaId] = useState('');

  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { isHidden, handleScroll } = useHideOnScroll(isMobile);
  const routeMeta = getMobileRouteMeta(location.pathname);
  const { state, dispatch, syncFromServer } = useAppContext();
  const moduleFlags = getModuleFlags(state.preferences);

  const handlePullRefresh = useCallback(async () => {
    await forceMobileRefresh(() => syncFromServer({ silent: true, force: true }));
  }, [syncFromServer]);

  const saveQuickNote = useCallback(() => {
    const fields = buildIdeaFields({title: quickNoteTitle, notes: quickNoteNotes});
    if (!fields.title && !fields.notes) return;
    const newIdea: Idea = {
      id: generateUUID(),
      userId: '',
      ...fields,
      pilarId: quickNotePilarId || null,
      seriesId: quickNoteSeries || null,
      origemId: quickNoteBibliotecaId || null,
      promotedToContentId: null,
      demotedFromContentId: null,
      archived: false,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_IDEA', payload: newIdea });
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
    setIsActionMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobile) return;

    document.documentElement.classList.add('mobile-app-shell');
    return () => {
      document.documentElement.classList.remove('mobile-app-shell');
    };
  }, [isMobile]);

  if (isMobile) {
    return (
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
          compactHeader={routeMeta.titleVariant === 'compact-center'}
          header={(
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
                    routeMeta.backTo ?? '/dashboard',
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
          bottomNav={(
            <MobileBottomNav
              isActionOpen={isActionMenuOpen}
              onActionToggle={() => setIsActionMenuOpen((previous) => !previous)}
              moduleFlags={moduleFlags}
            />
          )}
          overlay={(
            <MobileActionMenu
              open={isActionMenuOpen}
              onClose={() => setIsActionMenuOpen(false)}
            />
          )}
          onScroll={handleScroll}
          onPullRefresh={handlePullRefresh}
        >
          <Outlet />
        </MobileAppShell>
        <SaveFeedbackToast />
      </div>
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
