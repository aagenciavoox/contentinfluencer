import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Plus, ChevronRight, FileText } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Series } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export function Arquivos() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
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
              disabled={!newName.trim()}
              className="px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:scale-[1.02] transition-all"
            >
              Criar
            </button>
            <button
              onClick={() => { setIsAdding(false); setNewName(''); }}
              className="px-4 py-2 border border-[var(--border-color)] rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-50 hover:opacity-100 transition-all"
            >
              Cancelar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {state.series.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 gap-6 opacity-30">
          <div className="p-8 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)]">
            <Layers className="w-12 h-12 text-[var(--text-primary)]" />
          </div>
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[var(--text-primary)] italic">
            Nenhuma série criada ainda
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {state.series.map(series => {
            const contentsCount = state.contents.filter(c => c.seriesId === series.id).length;
            return (
              <motion.button
                key={series.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => navigate(`/series/${series.id}`)}
                className="flex items-center gap-5 px-6 py-5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl hover:border-[var(--text-primary)]/30 hover:shadow-md transition-all text-left group"
              >
                <div
                  className="w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: (series.cor || '#F5C543') + '22' }}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: series.cor || '#F5C543' }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-[var(--text-primary)] truncate uppercase italic tracking-tight">
                    {series.name}
                  </p>
                  <p className="text-[10px] text-[var(--text-secondary)] opacity-40 mt-0.5 flex items-center gap-1.5">
                    <FileText className="w-3 h-3" />
                    {contentsCount} conteúdo{contentsCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-primary)] opacity-20 group-hover:opacity-50 transition-opacity shrink-0" />
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
