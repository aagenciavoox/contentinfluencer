import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from '../navigation/Sidebar';
import { CommandPalette } from '../../components/overlays/CommandPalette';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useHideOnScroll } from '../../hooks/useHideOnScroll';
import { MobileActionMenu } from '../../mobile/components/MobileActionMenu';
import { MobileAppShell } from '../../mobile/components/MobileAppShell';
import { MobileBottomNav } from '../../mobile/components/MobileBottomNav';
import { MobileHeaderIOS } from '../../mobile/components/MobileHeaderIOS';
import { getMobileRouteMeta } from '../../mobile/config/mobileRouteMeta';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { isHidden, handleScroll } = useHideOnScroll(isMobile);
  const routeMeta = getMobileRouteMeta(location.pathname);

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
    setIsActionMenuOpen(false);
  }, [location.pathname]);

  if (isMobile) {
    return (
      <div className="bg-[var(--bg-primary)]">
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
        />

        <Sidebar
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />

        <MobileAppShell
          header={(
            <MobileHeaderIOS
              title={routeMeta.title}
              subtitle={routeMeta.subtitle}
              mode={routeMeta.mode}
              isHidden={isHidden}
              onLeftAction={() => {
                if (routeMeta.mode === 'back') {
                  navigate(-1);
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
            />
          )}
          overlay={(
            <MobileActionMenu
              open={isActionMenuOpen}
              onClose={() => setIsActionMenuOpen(false)}
            />
          )}
          onScroll={handleScroll}
        >
          {children}
        </MobileAppShell>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden flex-col md:flex-row bg-[var(--bg-primary)]">
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
        className="relative flex-1 overflow-y-auto bg-[var(--bg-secondary)] pb-24 transition-transform duration-300 ease-in-out md:pb-0 md:pt-0"
        style={
          isMobile
            ? {
                paddingTop: 'calc(env(safe-area-inset-top) + 88px)',
                transform: isHidden ? 'translateY(calc(-1 * (env(safe-area-inset-top) + 88px)))' : undefined,
              }
            : undefined
        }
      >
        <div className="min-h-full">{children}</div>
      </main>
    </div>
  );
}
