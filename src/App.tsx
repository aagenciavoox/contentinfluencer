import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { MobileNavBar } from './components/MobileNavBar';
import { useScrollDirection } from './hooks/useScrollDirection';
import { useIsMobile } from './hooks/useIsMobile';
import { cn } from './lib/utils';
import { CommandPalette } from './components/CommandPalette';
import { Onboarding } from './components/Onboarding';
import { Contents } from './pages/Contents';
import { Ideas } from './pages/Ideas';
import { EditorialCalendar } from './pages/EditorialCalendar';
import { Biblioteca } from './pages/Biblioteca';
import { BookDetail } from './pages/BookDetail';
import { Settings } from './pages/Settings';
import { PilaresSettings } from './pages/settings/Pilares';
import { LooksSettings } from './pages/settings/LooksScenarios';
import { RegrasDeOuro } from './pages/settings/RegrasDeOuro';
import { DNAVozSettings } from './pages/settings/DNAVoz';
import { SeriesSettings } from './pages/settings/Series';
import { PlataformasSettings } from './pages/settings/Plataformas';
import { TemplatesSettings } from './pages/settings/Templates';
import { Projetos } from './pages/Projetos';
import { ProjetoDetalhe } from './pages/ProjetoDetalhe';
import { Gravacao } from './pages/Gravacao';
import { GravacaoBloco } from './pages/GravacaoBloco';
import { Analise } from './pages/Analise';
import { Login } from './pages/Login';
import { Menu, Loader2 } from 'lucide-react';
import { useAppContext } from './context/AppContext';

function AppContent() {
  const { state } = useAppContext();
  const { user, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const isMobile = useIsMobile();
  const scrollDirection = useScrollDirection();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[var(--bg-primary)]">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--text-primary)]" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
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

      {/* Mobile Top Bar — Collapsible */}
      <div 
        className={cn(
          "md:hidden fixed top-0 left-0 right-0 flex items-center justify-between px-5 pt-10 pb-4 bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border-color)] z-[60] shadow-sm transition-transform duration-300 ease-in-out h-24",
          scrollDirection === 'down' ? "-translate-y-full" : "translate-y-0"
        )}
      >
        <button 
          onClick={() => setIsMobileMenuOpen(true)} 
          className="p-3 -ml-3 hover:bg-[var(--bg-hover)] rounded-2xl transition-colors active:scale-90"
        >
          <Menu className="w-6 h-6 text-[var(--text-primary)]" />
        </button>
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-primary)] animate-pulse" />
           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)] opacity-90">Core Creator</span>
        </div>
        <div className="w-12" />
      </div>

      <main className={cn(
        "flex-1 overflow-y-auto bg-[var(--bg-secondary)] pb-24 md:pb-0 relative pt-24 md:pt-0 transition-transform duration-300 ease-in-out",
        isMobile && scrollDirection === 'down' ? "-translate-y-24" : "translate-y-0"
      )}>
        <div className="min-h-full">
          <Routes>
          <Route path="/" element={<Navigate to="/conteudos" replace />} />
          <Route path="/conteudos" element={<Contents />} />
          <Route path="/ideias" element={<Ideas />} />
          <Route path="/calendario" element={<EditorialCalendar />} />
          <Route path="/biblioteca" element={<Biblioteca />} />
          <Route path="/biblioteca/:id" element={<BookDetail />} />
          
          {/* Projetos */}
          <Route path="/projetos" element={<Projetos />} />
          <Route path="/projetos/:id" element={<ProjetoDetalhe />} />

          {/* Gravação */}
          <Route path="/gravacao" element={<Gravacao />} />
          <Route path="/gravacao/:id" element={<GravacaoBloco />} />

          {/* Análise */}
          <Route path="/analise" element={<Analise />} />
          
          {/* Configurações */}
          <Route path="/configuracoes" element={<Settings />} />
          <Route path="/configuracoes/pilares" element={<PilaresSettings />} />
          <Route path="/configuracoes/looks" element={<LooksSettings />} />
          <Route path="/configuracoes/regras" element={<RegrasDeOuro />} />
          <Route path="/configuracoes/dna" element={<DNAVozSettings />} />
          <Route path="/configuracoes/series" element={<SeriesSettings />} />
          <Route path="/configuracoes/plataformas" element={<PlataformasSettings />} />
          <Route path="/configuracoes/templates" element={<TemplatesSettings />} />

          {/* Legacy Redirects */}
          <Route path="/contents" element={<Navigate to="/conteudos" replace />} />
          <Route path="/ideas" element={<Navigate to="/ideias" replace />} />
          <Route path="/editorial" element={<Navigate to="/calendario" replace />} />
          <Route path="/calendar" element={<Navigate to="/calendario" replace />} />
          <Route path="/results" element={<Navigate to="/analise" replace />} />
          <Route path="/settings/*" element={<Navigate to="/configuracoes" replace />} />
          
          <Route path="*" element={<Navigate to="/conteudos" replace />} />
        </Routes>
        </div>
      </main>

      <MobileNavBar />

      {/* Onboarding — aparece na primeira vez */}
      {state.preferences['onboarding_completo'] !== 'true' && <Onboarding />}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </AuthProvider>
    </Router>
  );
}
