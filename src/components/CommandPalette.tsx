import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, FileText, Lightbulb, Handshake, ChevronRight, Command } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const { state } = useAppContext();
  const navigate = useNavigate();
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
    navigate(item.path);
    onClose();
    // If it's a content item, we might want to open the modal directly in the future
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          className="relative w-full max-w-xl bg-[var(--bg-secondary)] shadow-2xl rounded-2xl border border-[var(--border-color)] overflow-hidden"
        >
          <div className="flex items-center px-4 border-b border-[var(--border-color)]">
            <Search className="w-5 h-5 text-[var(--text-tertiary)]" />
            <input 
              ref={inputRef}
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Busque por conteúdo, ideias, parcerias ou navegação..."
              className="flex-1 h-14 bg-transparent border-none focus:ring-0 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm px-3"
            />
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[var(--bg-hover)] border border-[var(--border-color)] rounded text-[10px] text-[var(--text-tertiary)] font-mono">
              <span className="text-[12px]">ESC</span>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
            {filteredResults.length > 0 ? (
              <div className="space-y-1">
                {filteredResults.map((item, index) => (
                  <button
                    key={`${item.category}-${item.id}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group ${
                      index === selectedIndex ? 'bg-[var(--bg-hover)] shadow-sm' : ''
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      index === selectedIndex ? 'bg-[var(--bg-secondary)] text-[var(--accent-blue)]' : 'bg-[var(--bg-hover)] text-[var(--text-tertiary)]'
                    }`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--text-primary)] truncate">{item.title}</span>
                      </div>
                      <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-bold">
                        {item.category}
                      </span>
                    </div>
                    {index === selectedIndex && (
                      <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Search className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-3 opacity-20" />
                <p className="text-sm text-[var(--text-tertiary)]">Nenhum resultado encontrado para "{search}"</p>
              </div>
            )}
          </div>

          <div className="px-4 py-3 bg-[var(--bg-primary)] border-t border-[var(--border-color)] flex items-center justify-between text-[10px] text-[var(--text-tertiary)] font-bold uppercase tracking-widest">
            <div className="flex gap-4">
              <span className="flex items-center gap-1"><Command className="w-3 h-3" /> + K para buscar</span>
              <span className="flex items-center gap-1">↑↓ para navegar</span>
              <span className="flex items-center gap-1">↵ para selecionar</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
