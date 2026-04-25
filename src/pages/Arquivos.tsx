import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Plus, ChevronRight, FileText } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Series } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useIsMobile } from '../hooks/useIsMobile';

export function Arquivos() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const submitNewSeries = () => {
    if (!newName.trim()) {
      setIsAdding(false);
      return;
    }
    const newSeries: Series = {
      id: Math.random().toString(36).substr(2, 9),
      name: newName.trim(),
      template: '',
      notes: '',
      cor: '#F5C543',
    };
    dispatch({ type: 'ADD_SERIES', payload: newSeries });
    setNewName('');
    setIsAdding(false);
    navigate(`/series/${newSeries.id}`);
  };

  return (
    <div className="content-wide mx-auto px-6 md:px-10 py-10 md:py-16">
      <div className="flex items-end justify-between mb-12 gap-6">
        <div>
          <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.4em] mb-2 italic">
            Estrutura de Formatos
          </p>
          <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight italic">
            Arquivos
          </h1>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-5 py-3 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova Série
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-8 flex gap-3 items-center bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-4"
          >
            <Layers className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') submitNewSeries();
                if (e.key === 'Escape') { setIsAdding(false); setNewName(''); }
              }}
              placeholder="Nome da nova série..."
              className="flex-1 text-sm bg-transparent border-none focus:ring-0 text-[var(--text-primary)] placeholder:opacity-30"
            />
            <button
              onClick={submitNewSeries}
              className="px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Criar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
        {state.series.map(series => {
          const contentsCount = state.contents.filter(c => c.seriesId === series.id).length;
          return (
            <motion.button
              key={series.id}
              layout
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => navigate(`/series/${series.id}`)}
              className="flex flex-col md:flex-row md:items-center gap-3 md:gap-5 px-4 py-4 md:px-6 md:py-5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl hover:border-[var(--text-primary)]/30 transition-all text-left group"
            >
              <div
                className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl shrink-0 flex items-center justify-center"
                style={{ backgroundColor: (series.cor || '#F5C543') + '22' }}
              >
                <div
                  className="w-2 h-2 md:w-3 md:h-3 rounded-full"
                  style={{ backgroundColor: series.cor || '#F5C543' }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-black text-[var(--text-primary)] truncate uppercase italic tracking-tight">
                  {series.name}
                </p>
                <p className="text-[9px] md:text-[10px] text-[var(--text-secondary)] opacity-40 mt-0.5 flex items-center gap-1.5">
                  <FileText className="w-2.5 h-2.5 md:w-3 h-3" />
                  {contentsCount} <span className="hidden xs:inline">itens</span>
                </p>
              </div>
              {!isMobile && <ChevronRight className="w-4 h-4 text-[var(--text-primary)] opacity-20 group-hover:opacity-50 transition-opacity shrink-0" />}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
