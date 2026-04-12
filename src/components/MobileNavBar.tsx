import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, Lightbulb, Table, Plus, BookOpen, FileText, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { ContentDetailModal } from './ContentDetailModal';
import { BookNotesModal } from './BookNotesModal';
import { FORMATS } from '../constants';
import { Content } from '../types';

export function MobileNavBar() {
  const { state } = useAppContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  const currentBook = state.books.find(b => b.statusLeitura === 'Lendo');

  const handleAddContent = () => {
    const newContent: Content = {
      id: Math.random().toString(36).substr(2, 9),
      title: '',
      seriesId: '',
      pillar: state.pilares[0]?.nome || 'Sem Pilar',
      format: FORMATS[0],
      status: 'Ideia',
      createdAt: new Date().toISOString(),
    };
    setSelectedContent(newContent);
    setIsMenuOpen(false);
  };

  const actions = [
    { 
      label: 'Novo Roteiro', 
      icon: <FileText className="w-5 h-5" />, 
      onClick: handleAddContent,
      color: 'text-blue-500' 
    },
    { 
      label: 'Nova Ideia', 
      icon: <Lightbulb className="w-5 h-5" />, 
      to: '/ideas',
      onClick: () => setIsMenuOpen(false),
      color: 'text-yellow-500' 
    },
    { 
      label: 'Nota de Leitura', 
      icon: <BookOpen className="w-5 h-5" />, 
      onClick: () => {
        if (currentBook) {
          setIsBookModalOpen(true);
          setIsMenuOpen(false);
        } else {
          alert('Nenhum livro sendo lido no momento.');
        }
      },
      color: 'text-orange-500',
      disabled: !currentBook
    },
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-t border-[var(--border-color)] px-5 pb-safe pt-3 z-[100] flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <NavLink
          to="/"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 transition-all',
              isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] opacity-60'
            )
          }
        >
          <Home className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase tracking-widest">Início</span>
        </NavLink>

        <NavLink
          to="/editorial"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 transition-all',
              isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] opacity-60'
            )
          }
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase tracking-widest">Agenda</span>
        </NavLink>

        {/* Botão Central de Ação Rápida */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={cn(
            "relative -top-6 w-14 h-14 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-2xl flex items-center justify-center shadow-xl shadow-[var(--text-primary)]/20 transition-all z-50",
            isMenuOpen ? "rotate-45 bg-red-500 text-white shadow-red-500/20" : ""
          )}
        >
          <Plus className="w-7 h-7" />
        </button>

        <NavLink
          to="/ideas"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 transition-all',
              isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] opacity-60'
            )
          }
        >
          <Lightbulb className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase tracking-widest">Ideias</span>
        </NavLink>

        <NavLink
          to="/contents"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 transition-all',
              isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] opacity-60'
            )
          }
        >
          <Table className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase tracking-widest">Estoque</span>
        </NavLink>
      </nav>

      {/* Menu de Ações Rápidas */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] md:hidden"
            />
            <motion.div
              initial={{ y: 100, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 100, opacity: 0, scale: 0.9 }}
              className="fixed bottom-24 left-6 right-6 z-[50] md:hidden"
            >
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[2.5rem] p-4 shadow-2xl space-y-2">
                {actions.map((action, i) => (
                  <button
                    key={i}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className={cn(
                      "w-full flex items-center justify-between p-5 rounded-2xl transition-all active:scale-[0.98]",
                      action.disabled ? "opacity-30" : "hover:bg-[var(--bg-hover)]"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn("p-3 rounded-xl bg-[var(--bg-primary)] shadow-sm", action.color)}>
                        {action.icon}
                      </div>
                      <span className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest">
                        {action.label}
                      </span>
                    </div>
                    {action.label === 'Nota de Leitura' && currentBook && (
                      <span className="text-[10px] font-medium text-[var(--text-tertiary)] italic">
                        {currentBook.titulo.slice(0, 15)}...
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modais acionados pela NavBar */}
      {selectedContent && (
        <ContentDetailModal
          content={selectedContent}
          isNewContent={true}
          onClose={() => setSelectedContent(null)}
        />
      )}
      
      {isBookModalOpen && currentBook && (
        <BookNotesModal
          book={currentBook}
          onClose={() => setIsBookModalOpen(false)}
        />
      )}
    </>
  );
}
