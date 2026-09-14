import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lightbulb, Loader2, Search } from 'lucide-react';
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
import { AppButton } from '../../components/ui/AppButton';
import { useAppContext } from '../../context/AppContext';
import { forceMobileRefresh } from '../../lib/pwaRefresh';
import { LOADING } from '../../lib/uiCopy';
import { getModuleFlags } from '../../features/settings/lib/moduleFlags';
import { createIdeaContent } from '../../features/contents/lib/creationContent';
import {
  CreationComposer,
  type CreationIdeaInput,
} from '../../features/creation/components/CreationComposer';

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

  const saveQuickNote = useCallback(async (input: CreationIdeaInput) => {
    await dispatch({
      type: 'ADD_CONTENT',
      payload: createIdeaContent(input),
    });
  }, [dispatch]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsCommandPaletteOpen((previous) => !previous);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isMobile) return;

    document.documentElement.classList.add('mobile-app-shell');
    return () => {
      document.documentElement.classList.remove('mobile-app-shell');
    };
  }, [isMobile]);

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
      <AppButton
        onClick={() => setIsQuickNoteOpen(true)}
        title="Nova ideia"
        aria-label="Nova ideia"
        variant="secondary"
        size="lg"
        iconOnly
        leftIcon={<Lightbulb className="h-5 w-5" />}
        className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full shadow-[var(--shadow-soft)] hover:scale-105"
      >
        Nova ideia
      </AppButton>

      {/* Modal de nota rapida */}
      <CreationComposer
        open={isQuickNoteOpen}
        state={state}
        onClose={() => setIsQuickNoteOpen(false)}
        onSave={saveQuickNote}
      />

      <SaveFeedbackToast />
    </div>
  );
}
