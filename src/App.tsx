import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { DNAVozDrawer } from './components/DNAVozDrawer';
import { CommandPalette } from './components/CommandPalette';
import { Onboarding } from './components/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { Contents } from './pages/Contents';
import { Ideas } from './pages/Ideas';
import { SeriesDetail } from './pages/Series';
import { Results } from './pages/Results';
import { ShootingDays } from './pages/ShootingDays';
import { Harvest } from './pages/Harvest';
import { Partnerships } from './pages/Partnerships';
import { EditorialCalendar } from './pages/EditorialCalendar';
import { Biblioteca } from './pages/Biblioteca';
import { BookDetail } from './pages/BookDetail';
import { Settings } from './pages/Settings';
import { PilaresSettings } from './pages/settings/Pilares';
import { LooksSettings } from './pages/settings/LooksScenarios';
import { RegrasDeOuro } from './pages/settings/RegrasDeOuro';
import { Menu } from 'lucide-react';
import { useAppContext } from './context/AppContext';

function AppLayout() {
  const { state } = useAppContext();
  const [isDNAOpen, setIsDNAOpen] = useState(false);
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

  return (
    <div className="flex h-screen overflow-hidden flex-col md:flex-row bg-[var(--bg-primary)]">
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[var(--bg-primary)] border-b border-[var(--border-color)] z-20">
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-1">
          <Menu className="w-6 h-6 text-[var(--text-primary)]" />
        </button>
        <span className="font-bold text-sm text-[var(--text-primary)]">Content OS</span>
        <div className="w-8" />
      </div>

      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onOpenDNA={() => {
          setIsDNAOpen(true);
          setIsMobileMenuOpen(false);
        }}
      />

      <main className="flex-1 overflow-y-auto bg-[var(--bg-secondary)]">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/contents" element={<Contents />} />
          <Route path="/ideas" element={<Ideas />} />
          <Route path="/series/:id" element={<SeriesDetail />} />
          <Route path="/results" element={<Results />} />
          <Route path="/shooting" element={<ShootingDays />} />
          <Route path="/harvest" element={<Harvest />} />
          <Route path="/partnerships" element={<Partnerships />} />
          <Route path="/editorial" element={<EditorialCalendar />} />
          {/* Biblioteca */}
          <Route path="/biblioteca" element={<Biblioteca />} />
          <Route path="/biblioteca/:id" element={<BookDetail />} />
          {/* Configurações */}
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/pilares" element={<PilaresSettings />} />
          <Route path="/settings/looks" element={<LooksSettings />} />
          <Route path="/settings/regras" element={<RegrasDeOuro />} />
        </Routes>
      </main>

      <DNAVozDrawer isOpen={isDNAOpen} onClose={() => setIsDNAOpen(false)} />

      {/* Onboarding — aparece na primeira vez */}
      {!state.onboardingCompleto && <Onboarding />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router>
        <AppLayout />
      </Router>
    </AppProvider>
  );
}
