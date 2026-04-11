import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { CommandPalette } from './components/CommandPalette';
import { Onboarding } from './components/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { Contents } from './pages/Contents';
import { Ideas } from './pages/Ideas';
import { SeriesDetail } from './pages/Series';
import { Arquivos } from './pages/Arquivos';
import { Results } from './pages/Results';
import { EditorialCalendar } from './pages/EditorialCalendar';
import { Biblioteca } from './pages/Biblioteca';
import { BookDetail } from './pages/BookDetail';
import { Settings } from './pages/Settings';
import { PilaresSettings } from './pages/settings/Pilares';
import { LooksSettings } from './pages/settings/LooksScenarios';
import { RegrasDeOuro } from './pages/settings/RegrasDeOuro';
import { DNAVozSettings } from './pages/settings/DNAVoz';
import { Login } from './pages/Login';
import { Menu, Loader2 } from 'lucide-react';
import { useAppContext } from './context/AppContext';

function AppContent() {
  const { state } = useAppContext();
  const { user, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

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

      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-6 pt-12 pb-5 bg-[var(--bg-primary)] border-b border-[var(--border-color)] z-20 shadow-sm relative">
        <button 
          onClick={() => setIsMobileMenuOpen(true)} 
          className="p-3 -ml-3 hover:bg-[var(--bg-hover)] rounded-2xl transition-colors active:scale-90"
        >
          <Menu className="w-6 h-6 text-[var(--text-primary)]" />
        </button>
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-primary)] animate-pulse" />
           <span className="font-black text-[10px] uppercase tracking-[0.4em] text-[var(--text-primary)] opacity-90">Content OS</span>
        </div>
        <div className="w-12 text-right">
           {/* Espaço para balancear o menu ou colocar um mini-perfil futuramente */}
        </div>
      </div>

      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <main className="flex-1 overflow-y-auto bg-[var(--bg-secondary)]">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/contents" element={<Contents />} />
          <Route path="/ideas" element={<Ideas />} />
          <Route path="/arquivos" element={<Arquivos />} />
          <Route path="/series/:id" element={<SeriesDetail />} />
          <Route path="/results" element={<Results />} />
          <Route path="/calendar" element={<Navigate to="/editorial" replace />} />
          <Route path="/editorial" element={<EditorialCalendar />} />
          {/* Biblioteca */}
          <Route path="/biblioteca" element={<Biblioteca />} />
          <Route path="/biblioteca/:id" element={<BookDetail />} />
          {/* Configurações */}
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/pilares" element={<PilaresSettings />} />
          <Route path="/settings/looks" element={<LooksSettings />} />
          <Route path="/settings/regras" element={<RegrasDeOuro />} />
          <Route path="/settings/dna" element={<DNAVozSettings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Onboarding — aparece na primeira vez */}
      {!state.onboardingCompleto && <Onboarding />}
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
