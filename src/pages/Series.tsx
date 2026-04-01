import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Table, FileText, Edit3, Trash2, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export function SeriesDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useAppContext();
  const series = state.series.find(s => s.id === id);

  if (!series) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="p-6 bg-[var(--bg-secondary)] rounded-full border border-[var(--border-color)]">
        <Edit3 className="w-12 h-12 text-[var(--text-tertiary)] opacity-20" />
      </div>
      <p className="text-sm font-black uppercase tracking-[0.3em] text-[var(--text-tertiary)] italic">Série não encontrada</p>
      <button 
        onClick={() => navigate('/')}
        className="px-8 py-3 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl"
      >
        Voltar ao Início
      </button>
    </div>
  );

  const seriesContents = state.contents.filter(c => c.seriesId === id);

  const updateSeries = (updates: Partial<typeof series>) => {
    dispatch({ type: 'UPDATE_SERIES', payload: { ...series, ...updates } });
  };

  const handleDelete = () => {
    if (window.confirm('Tem certeza que deseja desintegrar esta série? O ecossistema continuará, mas as conexões serão perdidas.')) {
      dispatch({ type: 'DELETE_SERIES', payload: series.id });
      navigate('/');
    }
  };

  const handleRename = () => {
    const newName = prompt('Novo nome para a série:', series.name);
    if (newName && newName !== series.name) {
      updateSeries({ name: newName });
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-10 md:py-16 px-6 md:px-10 transition-colors duration-200">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-16 md:mb-24 flex flex-col md:flex-row md:items-end justify-between gap-10"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-[var(--text-tertiary)] opacity-60">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] italic">Estrutura de Formato</span>
          </div>
          <div className="flex flex-wrap items-center gap-6 group">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-[var(--text-primary)] tracking-tight italic uppercase decoration-4 decoration-[var(--border-color)] underline-offset-[12px] underlineDecoration">
              {series.name}
            </h1>
            <button 
              onClick={handleRename}
              className="p-4 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-2xl opacity-40 group-hover:opacity-100 transition-all shadow-sm hover:scale-105 active:scale-95"
            >
              <Pencil className="w-5 h-5 text-[var(--text-primary)]" />
            </button>
          </div>
        </div>
        
        <button 
          onClick={handleDelete}
          className="flex items-center gap-3 px-8 py-4 bg-red-500/5 hover:bg-red-500/10 text-red-500 border border-red-500/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:border-red-500/20 shadow-sm"
        >
          <Trash2 className="w-4 h-4" />
          Desintegrar Série
        </button>
      </motion.header>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-12 md:gap-16">
        <div className="xl:col-span-3 space-y-16">
          {/* Template Section */}
          <motion.section 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-10 md:p-14 bg-[var(--bg-secondary)] rounded-[3rem] border border-[var(--border-color)] shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
               <FileText className="w-48 h-48" />
            </div>
            
            <div className="flex items-center gap-4 mb-10 text-[var(--text-tertiary)] opacity-60">
              <FileText className="w-5 h-5" />
              <span className="text-[11px] font-black uppercase tracking-[0.3em] italic">The Blueprint (Template)</span>
            </div>
            <textarea
              value={series.template}
              onChange={(e) => updateSeries({ template: e.target.value })}
              className="w-full min-h-[300px] text-xl font-medium text-[var(--text-primary)] leading-relaxed border-none focus:ring-0 p-0 bg-transparent resize-none placeholder:italic placeholder:opacity-20 selection:bg-[var(--accent-blue)]/20"
              placeholder="Defina a lógica universal desta série. Ganchos, ritmos, cores e intenção..."
            />
          </motion.section>

          {/* Contents Section */}
          <section className="space-y-10">
            <div className="flex items-center gap-4 text-[var(--text-tertiary)] opacity-60 ml-2">
              <Table className="w-5 h-5" />
              <span className="text-[11px] font-black uppercase tracking-[0.3em] italic">Conteúdos Ativos nesta Frequência ({seriesContents.length})</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {seriesContents.map(content => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={content.id} 
                    className="flex items-center justify-between p-8 bg-[var(--bg-secondary)] rounded-[2.5rem] border border-[var(--border-color)] hover:border-[var(--text-primary)] group transition-all shadow-xl hover:-translate-y-1"
                  >
                    <div className="min-w-0 pr-4">
                      <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-40 mb-2 block italic">ID: {content.id.slice(0,6)}</span>
                      <h4 className="text-lg font-black text-[var(--text-primary)] tracking-tight truncate uppercase italic">{content.title}</h4>
                    </div>
                    <div className="flex flex-col items-end gap-3 shrink-0">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border",
                        content.status === 'Postado' ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)] border-[var(--accent-green)]/20' : 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)] border-[var(--accent-orange)]/20'
                      )}>
                        {content.status}
                      </span>
                      <span className="text-[10px] font-black text-[var(--text-tertiary)] opacity-40 uppercase tracking-tighter">
                        {content.publishDate ? format(new Date(content.publishDate), 'dd/MM/yy') : '--/--/--'}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {seriesContents.length === 0 && (
                <div className="col-span-full py-32 text-center border-2 border-dashed border-[var(--border-color)] rounded-[3rem] opacity-30 flex flex-col items-center gap-6">
                  <Table className="w-12 h-12" />
                  <p className="text-sm font-black uppercase tracking-[0.3em] italic">Frequência Silenciosa</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Evolution Notes */}
        <div className="xl:col-span-1">
          <motion.section 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-10 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-[3rem] shadow-2xl xl:sticky xl:top-10 transition-all hover:shadow-2xl hover:scale-[1.02]"
          >
            <div className="flex items-center gap-4 mb-10 text-[var(--bg-primary)] opacity-40">
              <Edit3 className="w-5 h-5" />
              <span className="text-[11px] font-black uppercase tracking-[0.3em] italic">Evolução de Formato</span>
            </div>
            <textarea
              value={series.notes}
              onChange={(e) => updateSeries({ notes: e.target.value })}
              className="w-full min-h-[500px] bg-transparent text-sm font-bold text-[var(--bg-primary)] leading-relaxed border-none focus:ring-0 p-0 resize-none placeholder:text-[var(--bg-primary)] placeholder:opacity-20 italic selection:bg-[var(--bg-primary)] selection:text-[var(--text-primary)]"
              placeholder="Auditando o ecossistema... O que funcionou? O que o público pediu? Próximos passos para este formato?"
            />
            <div className="mt-10 pt-10 border-t border-[var(--bg-primary)]/10">
               <p className="text-[9px] font-black uppercase tracking-widest text-[var(--bg-primary)] opacity-40 leading-relaxed italic">
                Notas registradas no DNA central. Toda mudança aqui ressoa em todo o ecossistema de conteúdo.
               </p>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
