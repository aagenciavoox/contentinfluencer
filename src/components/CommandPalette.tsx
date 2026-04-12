import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, FileText, Lightbulb, Handshake, ChevronRight, Command, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../hooks/useIsMobile';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const { state } = useAppContext();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const navigation = [
    { id: 'nav-1', title: 'Dashboard', path: '/', icon: <Search className="w-4 h-4" />, category: 'Navegação' },
    { id: 'nav-2', title: 'Inventário', path: '/contents', icon: <FileText className="w-4 h-4" />, category: 'Navegação' },
    { id: 'nav-3', title: 'Agenda', path: '/agenda', icon: <Search className="w-4 h-4" />, category: 'Navegação' },
    { id: 'nav-4', title: 'Calendário Editorial', path: '/editorial', icon: <Search className="w-4 h-4" />, category: 'Navegação' },
  ];

  const filteredResults = [
    ...navigation,
    ...state.contents.map(c => ({ id: c.id, title: c.title, path: '/contents', icon: <FileText className="w-4 h-4" />, category: 'Conteúdo', data: c })),
    ...state.ideas.map(i => ({ id: i.id, title: i.text, path: '/ideas', icon: <Lightbulb className="w-4 h-4" />, category: 'Ideias', data: i })),
    ...state.partnerships.map(p => ({ id: p.id, title: `${p.brand}: ${p.title}`, path: '/partnerships', icon: <Handshake className="w-4 h-4" />, category: 'Parcerias', data: p })),
  ].filter(item => 
    item.title.toLowerCase().includes(search.toLowerCase()) || 
    item.category.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 10);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredResults.length) % filteredResults.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelect(filteredResults[selectedIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredResults, selectedIndex]);

  const handleSelect = (item: any) => {
    if (!item) return;
    navigate(item.path);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className={`fixed inset-0 z-[100] flex ${isMobile ? 'items-stretch' : 'items-start justify-center pt-[15vh] px-4'}`}>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-md"
        />
        
        <motion.div 
          initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: -20 }}
          animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
          exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: -10 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className={`relative w-full ${isMobile ? 'h-full bg-[var(--bg-primary)] flex flex-col' : 'max-w-xl bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-2xl'}`}
        >
          {/* Header */}
          <div className={`flex items-center px-4 border-b border-[var(--border-color)] ${isMobile ? 'pt-14 pb-4' : ''}`}>
            <Search className="w-5 h-5 text-[var(--text-tertiary)]" />
            <input 
              ref={inputRef}
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isMobile ? "Buscar..." : "Busque por conteúdo, ideias, parcerias..."}
              className="flex-1 h-14 bg-transparent border-none focus:ring-0 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-base px-3"
            />
            {isMobile ? (
              <button onClick={onClose} className="p-2 bg-[var(--bg-hover)] rounded-xl">
                <X className="w-5 h-5" />
              </button>
            ) : (
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[var(--bg-hover)] border border-[var(--border-color)] rounded text-[10px] text-[var(--text-tertiary)] font-mono">
                <span className="text-[12px]">ESC</span>
              </div>
            )}
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            {filteredResults.length > 0 ? (
              <div className="space-y-1">
                {filteredResults.map((item, index) => (
                  <button
                    key={`${item.category}-${item.id}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => !isMobile && setSelectedIndex(index)}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all text-left group ${
                      index === selectedIndex ? 'bg-[var(--bg-hover)] shadow-sm' : ''
                    } ${isMobile ? 'active:bg-[var(--bg-hover)]' : ''}`}
                  >
                    <div className={`p-3 rounded-xl ${
                      index === selectedIndex ? 'bg-[var(--bg-secondary)] text-[var(--accent-blue)]' : 'bg-[var(--bg-hover)] text-[var(--text-tertiary)]'
                    }`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-medium text-[var(--text-primary)] truncate">{item.title}</span>
                      </div>
                      <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-[0.2em] font-black">
                        {item.category}
                      </span>
                    </div>
                    {!isMobile && index === selectedIndex && (
                      <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <Search className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4 opacity-10" />
                <p className="text-sm text-[var(--text-tertiary)]">Nenhum resultado para "{search}"</p>
              </div>
            )}
          </div>

          {/* Footer - Desktop Only */}
          {!isMobile && (
            <div className="px-4 py-3 bg-[var(--bg-primary)] border-t border-[var(--border-color)] flex items-center justify-between text-[10px] text-[var(--text-tertiary)] font-bold uppercase tracking-widest">
              <div className="flex gap-4">
                <span className="flex items-center gap-1"><Command className="w-3 h-3" /> + K para buscar</span>
                <span className="flex items-center gap-1">↑↓ para navegar</span>
                <span className="flex items-center gap-1">↵ para selecionar</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
