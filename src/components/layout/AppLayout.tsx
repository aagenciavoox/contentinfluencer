import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Sidebar } from '../navigation/Sidebar';
import { MobileHeader } from '../navigation/MobileHeader';
import { CommandPalette } from '../CommandPalette';
import { MobileNavBar } from '../navigation/MobileNavBar';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useHideOnScroll } from '../../hooks/useHideOnScroll';
import { cn } from '../../lib/utils';
import { useAppContext } from '../../context/AppContext';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { state, dispatch } = useAppContext();
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

  const onboardingComplete = state.preferences.onboarding_completo === 'true';

  return (
    <div className="flex h-screen overflow-hidden flex-col md:flex-row bg-[var(--bg-primary)]">
      {!onboardingComplete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(9,13,24,0.56)] p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-primary)] p-8 shadow-2xl">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
              Guia de Operacao
            </p>
            <h2 className="mb-3 text-2xl font-black text-[var(--text-primary)]">
              Bem-vindo ao Content OS
            </h2>
            <p className="mb-6 text-sm text-[var(--text-secondary)]">
              Use Conteudos para organizar o pipeline, Calendario para planejar datas e Biblioteca
              para transformar repertorio em ideias e roteiros.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-primary)]">1. Capture</p>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">Registre ideias e referencias na Biblioteca e em Ideias.</p>
              </div>
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-primary)]">2. Produza</p>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">Estruture roteiros, monte blocos e acompanhe o status.</p>
              </div>
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-primary)]">3. Analise</p>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">Revise regras, mix editorial e performance em um so lugar.</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => dispatch({ type: 'SET_PREFERENCE', payload: { key: 'onboarding_completo', value: 'true' } })}
                className="rounded-2xl bg-[var(--text-primary)] px-6 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--bg-primary)]"
              >
                Comecar
              </button>
            </div>
          </div>
        </div>
      )}

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
        className={cn(
          'flex-1 overflow-y-auto bg-[var(--bg-secondary)] pb-24 md:pb-0 relative pt-24 md:pt-0 transition-transform duration-300 ease-in-out',
          isMobile && isHidden ? '-translate-y-24' : 'translate-y-0'
        )}
      >
        <div className="min-h-full">{children}</div>
      </main>

      <MobileNavBar />
    </div>
  );
}
