import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, Lightbulb, Table, Plus, BookOpen, FileText, X, Rocket } from 'lucide-react';
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
      color: 'text-[var(--accent-blue)]',
      bgColor: 'bg-[var(--accent-blue)]/10'
    },
    { 
      label: 'Nova Ideia', 
      icon: <Lightbulb className="w-5 h-5" />, 
      onClick: () => { window.location.href = '/ideas'; setIsMenuOpen(false); },
      color: 'text-[var(--accent-orange)]',
      bgColor: 'bg-[var(--accent-orange)]/10'
    },
    { 
      label: 'Nota de Leitura', 
      icon: <BookOpen className="w-5 h-5" />, 
      onClick: () => {
        if (currentBook) {
          setIsBookModalOpen(true);
          setIsMenuOpen(false);
        }
      },
      color: 'text-[var(--accent-purple)]',
      bgColor: 'bg-[var(--accent-purple)]/10',
      disabled: !currentBook
    },
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-primary)]/90 backdrop-blur-xl border-t border-[var(--border-color)] px-6 pb-safe pt-3 z-[90] flex items-center justify-between shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
        <NavLink
          to="/"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1.5 transition-all duration-300',
              isActive ? 'text-[var(--text-primary)] scale-110' : 'text-[var(--text-tertiary)] opacity-50'
            )
          }
        >
          <Home className="w-5 h-5" />
          <span className="text-[8px] font-black uppercase tracking-[0.2em]">Início</span>
        </NavLink>

        <NavLink
          to="/editorial"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1.5 transition-all duration-300',
              isActive ? 'text-[var(--text-primary)] scale-110' : 'text-[var(--text-tertiary)] opacity-50'
            )
          }
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[8px] font-black uppercase tracking-[0.2em]">Agenda</span>
        </NavLink>

        {/* Botão Central de Ação Rápida */}
        <div className="relative -top-5">
           <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={cn(
              "w-14 h-14 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-[1.5rem] flex items-center justify-center shadow-2xl transition-all duration-500 active:scale-90",
              isMenuOpen ? "rotate-[135deg] bg-[var(--accent-pink)] scale-90" : "hover:scale-105"
            )}
          >
            <Plus className="w-8 h-8 stroke-[3px]" />
          </button>
        </div>

        <NavLink
          to="/ideas"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1.5 transition-all duration-300',
              isActive ? 'text-[var(--text-primary)] scale-110' : 'text-[var(--text-tertiary)] opacity-50'
            )
          }
        >
          <Lightbulb className="w-5 h-5" />
          <span className="text-[8px] font-black uppercase tracking-[0.2em]">Ideias</span>
        </NavLink>

        <NavLink
          to="/contents"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1.5 transition-all duration-300',
              isActive ? 'text-[var(--text-primary)] scale-110' : 'text-[var(--text-tertiary)] opacity-50'
            )
          }
        >
          <Table className="w-5 h-5" />
          <span className="text-[8px] font-black uppercase tracking-[0.2em]">Estoque</span>
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
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[85] md:hidden"
            />
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
              className="fixed bottom-[110px] left-6 right-6 z-[90] md:hidden"
            >
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[2.5rem] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.2)] space-y-1">
                <div className="px-5 py-3 mb-2 border-b border-[var(--border-color)]">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)] italic">Operações Rápidas</p>
                </div>
                {actions.map((action, i) => (
                  <button
                    key={i}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-2xl transition-all active:bg-[var(--bg-hover)] active:scale-[0.98]",
                      action.disabled ? "opacity-20" : ""
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn("p-3 rounded-xl shadow-sm", action.bgColor, action.color)}>
                        {action.icon}
                      </div>
                      <span className="text-[13px] font-black text-[var(--text-primary)] uppercase tracking-widest">
                        {action.label}
                      </span>
                    </div>
                    {action.label === 'Nota de Leitura' && currentBook && (
                      <div className="flex items-center gap-2 bg-[var(--bg-hover)] px-3 py-1 rounded-full border border-[var(--border-color)]">
                        <div className="w-1 h-1 rounded-full bg-[var(--accent-purple)] animate-pulse" />
                        <span className="text-[9px] font-bold text-[var(--text-tertiary)] italic truncate max-w-[80px]">
                          {currentBook.titulo}
                        </span>
                      </div>
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
