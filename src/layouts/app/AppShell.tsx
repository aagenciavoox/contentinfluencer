import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
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
import { LOADING } from '../../lib/uiCopy';
import { getModuleFlags } from '../../features/settings/lib/moduleFlags';
import { prefetchPrimaryRoutes } from '../../app/router/routePrefetch';

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
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { state, syncFromServer } = useAppContext();
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
    if (!state.isLoaded) return;
    const idleId = window.requestIdleCallback?.(() => prefetchPrimaryRoutes());
    if (idleId !== undefined) {
      return () => window.cancelIdleCallback?.(idleId);
    }
    const timer = window.setTimeout(prefetchPrimaryRoutes, 250);
    return () => window.clearTimeout(timer);
  }, [state.isLoaded]);

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

      <SaveFeedbackToast />
    </div>
  );
}
