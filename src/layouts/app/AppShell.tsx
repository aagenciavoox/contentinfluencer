import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Sidebar } from '../navigation/Sidebar';
import { MobileHeader } from '../navigation/MobileHeader';
import { CommandPalette } from '../../components/overlays/CommandPalette';
import { MobileNavBar } from '../navigation/MobileNavBar';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useHideOnScroll } from '../../hooks/useHideOnScroll';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const isMobile = useIsMobile();
  const { isHidden, handleScroll } = useHideOnScroll(isMobile);

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

      <MobileHeader
        isHidden={isHidden}
        onMenuClick={() => setIsMobileMenuOpen(true)}
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

      <MobileNavBar />
    </div>
  );
}
