import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { BarChart3, CheckCircle2, TrendingUp, X, Eye, Heart, MessageCircle, Bookmark, Share2, Users, Repeat, Radio } from 'lucide-react';
import { Content, Result, DetailedMetrics } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function Results() {
  const { state, dispatch } = useAppContext();
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);

  const postedContents = state.contents.filter(c => c.status === 'Postado');

  const openMetricsModal = (content: Content) => {
    setSelectedContent(content);
  };

  const closeModal = () => {
    setSelectedContent(null);
  };

  return (
    <div className="max-w-7xl mx-auto py-10 md:py-16 px-6 md:px-10 transition-colors duration-200">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-[var(--text-primary)] mb-4 tracking-tight">Resultados</h1>
          <p className="text-lg text-[var(--text-tertiary)] font-bold max-w-2xl opacity-80">
            Apenas conteúdos postados. Preencha as métricas para retroalimentar o sistema.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {postedContents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(content => {
          const result = state.results.find(r => r.contentId === content.id);
          const hasMetrics = !!result?.detailedMetrics || !!result?.metrics;

          return (
            <div 
              key={content.id}
              onClick={() => openMetricsModal(content)}
              className="p-6 md:p-8 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[2rem] hover:shadow-2xl transition-all group flex flex-col justify-between cursor-pointer hover:-translate-y-1 hover:border-[var(--text-primary)]/30"
            >
              <div>
                <div className="flex justify-between items-start mb-6">
                  <span className="text-[9px] font-black px-3 py-1 bg-[var(--accent-green)]/10 text-[var(--accent-green)] border border-[var(--accent-green)]/20 rounded-full uppercase tracking-widest shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                    {content.status}
                  </span>
                  {hasMetrics && (
                    <div className="flex items-center gap-2 text-[10px] font-black text-[var(--accent-blue)] bg-[var(--accent-blue)]/10 px-3 py-1 rounded-full border border-[var(--accent-blue)]/20">
                      <BarChart3 className="w-3.5 h-3.5" /> METRIFICADO
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight mb-2 leading-tight uppercase group-hover:text-black dark:group-hover:text-white transition-colors line-clamp-2">
                  {content.title}
                </h3>
              </div>
              
              <div className="mt-8 pt-6 border-t border-[var(--border-color)] space-y-4">
                {result?.detailedMetrics ? (
                  <div className="grid grid-cols-3 gap-4">
                     <div className="text-center">
                       <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-tertiary)] opacity-60">Views</p>
                       <p className="text-sm font-black text-[var(--text-primary)]">{result.detailedMetrics.views.toLocaleString('pt-BR')}</p>
                     </div>
                     <div className="text-center">
                       <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-tertiary)] opacity-60">Likes</p>
                       <p className="text-sm font-black text-[var(--text-primary)]">{result.detailedMetrics.likes.toLocaleString('pt-BR')}</p>
                     </div>
                     <div className="text-center">
                       <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-tertiary)] opacity-60">Salvos</p>
                       <p className="text-sm font-black text-[var(--text-primary)]">{result.detailedMetrics.saves.toLocaleString('pt-BR')}</p>
                     </div>
                  </div>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-40 italic">
                    Nenhum dado cadastrado
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {postedContents.length === 0 && (
          <div className="col-span-full py-32 text-center border-2 border-dashed border-[var(--border-color)] rounded-[3rem] opacity-30 flex flex-col items-center gap-6">
            <CheckCircle2 className="w-12 h-12" />
            <p className="text-sm font-black uppercase tracking-[0.3em] italic">Nenhum conteúdo postado ainda</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedContent && (
          <MetricsModal 
            content={selectedContent} 
            existingResult={state.results.find(r => r.contentId === selectedContent.id)}
            onClose={closeModal} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function MetricsModal({ content, existingResult, onClose }: { content: Content, existingResult?: Result, onClose: () => void }) {
  const { dispatch } = useAppContext();

  const [detailed, setDetailed] = useState<DetailedMetrics>(existingResult?.detailedMetrics || {
    views: 0, interactions: 0, likes: 0, comments: 0, 
    saves: 0, shares: 0, newFollowers: 0, reposts: 0, accountsReached: 0
  });

  const [qualitative, setQualitative] = useState(existingResult?.qualitativeNotes || '');
  const [worthIt, setWorthIt] = useState<'Sim' | 'Não' | 'Mais ou menos'>(existingResult?.worthIt || 'Sim');

  const handleChange = (field: keyof DetailedMetrics, value: string) => {
    const num = parseInt(value.replace(/\D/g, ''), 10);
    setDetailed(prev => ({ ...prev, [field]: isNaN(num) ? 0 : num }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const resultPayload: Result = {
      id: existingResult?.id || Math.random().toString(36).substr(2, 9),
      contentId: content.id,
      metrics: '', // Legacy
      detailedMetrics: detailed,
      qualitativeNotes: qualitative,
      worthIt,
      createdAt: existingResult?.createdAt || new Date().toISOString(),
    };

    if (existingResult) {
      dispatch({ type: 'UPDATE_RESULT', payload: resultPayload });
    } else {
      dispatch({ type: 'ADD_RESULT', payload: resultPayload });
    }

    onClose();
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed inset-x-4 top-[5%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[800px] h-[90vh] bg-[var(--bg-primary)] border border-[var(--border-color)] shadow-2xl z-50 rounded-[2rem] overflow-hidden flex flex-col"
      >
        <div className="p-6 md:p-8 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight">{content.title}</h2>
            <p className="text-xs uppercase font-black text-[var(--text-tertiary)] tracking-widest mt-1 opacity-60">Registro de Performance</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-hover)] rounded-full transition-colors">
             <X className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar bg-[var(--bg-primary)]">
          <form id="metrics-form" onSubmit={handleSubmit} className="space-y-12">
            
            <section>
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--accent-orange)] mb-6 flex items-center gap-3">
                <BarChart3 className="w-4 h-4" /> Hard Metrics
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                <MetricInput icon={Eye} label="Visualizações" value={detailed.views} onChange={(v) => handleChange('views', v)} />
                <MetricInput icon={Users} label="Interações" value={detailed.interactions} onChange={(v) => handleChange('interactions', v)} />
                <MetricInput icon={Heart} label="Curtidas" value={detailed.likes} onChange={(v) => handleChange('likes', v)} />
                <MetricInput icon={MessageCircle} label="Comentários" value={detailed.comments} onChange={(v) => handleChange('comments', v)} />
                <MetricInput icon={Bookmark} label="Salvamentos" value={detailed.saves} onChange={(v) => handleChange('saves', v)} />
                <MetricInput icon={Share2} label="Compartilhamentos" value={detailed.shares} onChange={(v) => handleChange('shares', v)} />
                <MetricInput icon={TrendingUp} label="Seguidores Novos" value={detailed.newFollowers} onChange={(v) => handleChange('newFollowers', v)} />
                <MetricInput icon={Repeat} label="Republicados" value={detailed.reposts} onChange={(v) => handleChange('reposts', v)} />
                <MetricInput icon={Radio} label="Contas Alcançadas" value={detailed.accountsReached} onChange={(v) => handleChange('accountsReached', v)} />
              </div>
            </section>

            <section className="space-y-8">
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-tertiary)] mb-4 flex items-center gap-3 opacity-60">
                   O Veredito Qualitativo
                </h3>
                <textarea 
                  value={qualitative}
                  onChange={(e) => setQualitative(e.target.value)}
                  placeholder="O que aprendemos com a performance deste conteúdo?"
                  className="w-full min-h-[120px] text-sm font-bold bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-2xl px-6 py-4 focus:ring-0 focus:border-[var(--text-primary)] transition-all shadow-sm resize-none"
                />
              </div>

              <div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-tertiary)] mb-4 opacity-60">Escalabilidade (Valeu a pena?)</h3>
                <div className="grid grid-cols-3 gap-4">
                  {['Sim', 'Não', 'Mais ou menos'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setWorthIt(option as any)}
                      className={cn(
                        "py-3 text-[10px] font-black uppercase tracking-widest rounded-xl border-2 transition-all",
                        worthIt === option 
                          ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)] shadow-md scale-[1.02]' 
                          : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)] border-[var(--border-color)] hover:border-[var(--text-primary)]/40 opacity-70 hover:opacity-100'
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </form>
        </div>

        <div className="p-6 md:p-8 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] flex justify-end shrink-0">
          <button 
            type="submit"
            form="metrics-form"
            className="w-full md:w-auto bg-[var(--text-primary)] text-[var(--bg-primary)] px-10 py-4 md:py-5 rounded-[1.5rem] md:rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
          >
            {existingResult ? 'Atualizar Métricas' : 'Salvar Métricas'}
          </button>
        </div>
      </motion.div>
    </>
  );
}

function MetricInput({ icon: Icon, label, value, onChange }: { icon: any, label: string, value: number, onChange: (v: string) => void }) {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-4 md:p-5 focus-within:border-[var(--accent-orange)] focus-within:ring-1 focus-within:ring-[var(--accent-orange)] transition-all">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-[var(--text-tertiary)] opacity-60" />
        <label className="text-[9px] uppercase tracking-[0.2em] font-black text-[var(--text-tertiary)] opacity-80">{label}</label>
      </div>
      <input 
        type="text"
        inputMode="numeric"
        value={value === 0 ? '' : value.toLocaleString('pt-BR')}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="w-full text-xl md:text-2xl font-black bg-transparent border-none p-0 text-[var(--text-primary)] focus:ring-0 placeholder:opacity-20"
      />
    </div>
  );
}
