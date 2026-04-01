import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { BarChart3, CheckCircle2, MessageSquare, TrendingUp, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Result } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function Results() {
  const { state, dispatch } = useAppContext();
  const [resultType, setResultType] = useState<'organic' | 'partnership'>('organic');
  const [selectedId, setSelectedId] = useState('');
  const [metrics, setMetrics] = useState('');
  const [qualitative, setQualitative] = useState('');
  const [worthIt, setWorthIt] = useState<'Sim' | 'Não' | 'Mais ou menos'>('Sim');
  
  // Organic specific
  const [engagement, setEngagement] = useState('');
  const [creativeSatisfaction, setCreativeSatisfaction] = useState<number>(3);
  const [learningBySeries, setLearningBySeries] = useState('');

  const postedContents = state.contents.filter(c => c.status === 'Postado');
  const finishedPartnerships = state.partnerships.filter(p => p.status === 'Métricas');
  const results = [...state.results].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleAddResult = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;

    const newResult: Result = {
      id: Math.random().toString(36).substr(2, 9),
      contentId: resultType === 'organic' ? selectedId : undefined,
      partnershipId: resultType === 'partnership' ? selectedId : undefined,
      metrics,
      qualitativeNotes: qualitative,
      worthIt,
      engagement: resultType === 'organic' ? engagement : undefined,
      creativeSatisfaction: resultType === 'organic' ? creativeSatisfaction as any : undefined,
      learningBySeries: resultType === 'organic' ? learningBySeries : undefined,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_RESULT', payload: newResult });
    setSelectedId('');
    setMetrics('');
    setQualitative('');
    setEngagement('');
    setLearningBySeries('');
  };

  return (
    <div className="max-w-6xl mx-auto py-10 md:py-16 px-6 md:px-10 transition-colors duration-200">
      <header className="mb-16 md:mb-24">
        <h1 className="text-4xl md:text-5xl font-black text-[var(--text-primary)] mb-6 tracking-tight italic">Laboratório de Dados</h1>
        <p className="text-lg text-[var(--text-tertiary)] font-medium leading-relaxed max-w-2xl">
          Métricas são bússolas, não destinos. Transforme números em estratégia e audiência em ecossistema.
        </p>
      </header>

      <div className="flex bg-[var(--bg-secondary)] p-1.5 rounded-2xl border border-[var(--border-color)] mb-12 shadow-sm w-full sm:w-fit">
        <button 
          onClick={() => { setResultType('organic'); setSelectedId(''); }}
          className={cn(
            "px-8 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] rounded-xl transition-all",
            resultType === 'organic' ? "bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-lg" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] opacity-60 hover:opacity-100"
          )}
        >
          Conteúdo Orgânico
        </button>
        <button 
          onClick={() => { setResultType('partnership'); setSelectedId(''); }}
          className={cn(
            "px-8 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] rounded-xl transition-all",
            resultType === 'partnership' ? "bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-lg" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] opacity-60 hover:opacity-100"
          )}
        >
          Parcerias & Publis
        </button>
      </div>

      <motion.form
        layout
        onSubmit={handleAddResult}
        className="mb-20 md:mb-24 p-6 md:p-14 bg-[var(--bg-secondary)] rounded-[2rem] md:rounded-[3rem] border border-[var(--border-color)] shadow-2xl relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
          <BarChart3 className="w-64 h-64" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16 mb-12 relative z-10">
          <div className="space-y-10">
            <div>
              <label className="text-[10px] uppercase tracking-[0.3em] font-black text-[var(--text-tertiary)] block mb-4 opacity-70 italic">
                {resultType === 'organic' ? 'DNA do Conteúdo' : 'Entregável da Marca'}
              </label>
              <select 
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full text-sm font-bold bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-2xl px-6 py-4 focus:ring-0 focus:border-[var(--text-primary)] transition-all shadow-sm"
              >
                <option value="">Selecione para auditar...</option>
                {resultType === 'organic' ? (
                  postedContents.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))
                ) : (
                  finishedPartnerships.map(p => (
                    <option key={p.id} value={p.id}>{p.brand} — {p.title}</option>
                  ))
                )}
              </select>
            </div>
            {resultType === 'organic' ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
                <div>
                  <label className="text-[10px] uppercase tracking-[0.3em] font-black text-[var(--text-tertiary)] block mb-4 opacity-70 italic">Engajamento Brutal (Stats)</label>
                  <input 
                    type="text"
                    value={engagement}
                    onChange={(e) => setEngagement(e.target.value)}
                    placeholder="Ex: 15.2k views • 430 salvos"
                    className="w-full text-sm font-bold bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-2xl px-6 py-4 focus:ring-0 focus:border-[var(--text-primary)] transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.3em] font-black text-[var(--text-tertiary)] block mb-4 opacity-70 italic">Química Criativa (1-5)</label>
                  <div className="flex gap-4">
                    {[1, 2, 3, 4, 5].map(num => (
                      <button 
                        key={num}
                        type="button"
                        onClick={() => setCreativeSatisfaction(num)}
                        className={cn(
                          "w-12 h-12 rounded-xl text-xs font-black transition-all border-2",
                          creativeSatisfaction === num 
                            ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)] shadow-lg scale-110" 
                            : "bg-[var(--bg-hover)] text-[var(--text-tertiary)] border-[var(--border-color)] hover:border-[var(--text-primary)]/40"
                        )}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-left-4">
                <label className="text-[10px] uppercase tracking-[0.3em] font-black text-[var(--text-tertiary)] block mb-4 opacity-70 italic">Métricas de Conversão</label>
                <textarea 
                  value={metrics}
                  onChange={(e) => setMetrics(e.target.value)}
                  placeholder="Vendas rastreadas, cliques no link, cupons..."
                  className="w-full min-h-[160px] text-sm font-bold bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-2xl px-6 py-4 focus:ring-0 focus:border-[var(--text-primary)] transition-all shadow-sm resize-none"
                />
              </div>
            )}
          </div>
          <div className="space-y-10">
            <div>
              <label className="text-[10px] uppercase tracking-[0.3em] font-black text-[var(--text-tertiary)] block mb-4 opacity-70 italic">O Veridito Qualitativo</label>
              <textarea 
                value={qualitative}
                onChange={(e) => setQualitative(e.target.value)}
                placeholder={resultType === 'organic' ? "O que o algoritmo nos ensinou hoje?" : "A marca entendeu o ecossistema ou foi apenas um anúncio?"}
                className="w-full min-h-[160px] text-sm font-bold bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-2xl px-6 py-4 focus:ring-0 focus:border-[var(--text-primary)] transition-all shadow-sm resize-none"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.3em] font-black text-[var(--text-tertiary)] block mb-4 opacity-70 italic">Escalabilidade (Valeu a pena?)</label>
              <div className="grid grid-cols-3 gap-4">
                {['Sim', 'Não', 'Mais ou menos'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setWorthIt(option as any)}
                    className={cn(
                      "py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl border-2 transition-all",
                      worthIt === option 
                        ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)] shadow-xl scale-[1.05]' 
                        : 'bg-[var(--bg-hover)] text-[var(--text-tertiary)] border-[var(--border-color)] hover:border-[var(--text-primary)]/40 opacity-60 hover:opacity-100'
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end relative z-10">
          <button 
            type="submit"
            disabled={!selectedId}
            className="w-full md:w-auto bg-[var(--text-primary)] text-[var(--bg-primary)] px-12 py-5 rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-2xl disabled:opacity-20 disabled:scale-100 grayscale-[0.5]"
          >
            Sincronizar Arquivo
          </button>
        </div>
      </motion.form>

      <div className="space-y-10">
        <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-[var(--text-tertiary)] mb-10 opacity-60 italic">Memória de Performance</h2>
        <AnimatePresence mode="popLayout">
          {results.map((result) => {
            const content = result.contentId ? state.contents.find(c => c.id === result.contentId) : null;
            const partnership = result.partnershipId ? state.partnerships.find(p => p.id === result.partnershipId) : null;
            const type = result.contentId ? 'Orgânico' : 'Parceria';

            return (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={result.id}
                className="p-6 md:p-14 bg-[var(--bg-secondary)] rounded-[2rem] md:rounded-[3rem] border border-[var(--border-color)] shadow-xl relative group hover:shadow-2xl transition-all overflow-hidden mb-10"
              >
                <div className={`absolute left-0 top-0 w-2 h-full ${type === 'Orgânico' ? 'bg-[var(--accent-blue)]' : 'bg-[var(--accent-orange)]'} opacity-40`} />

                <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 md:mb-12 gap-6 md:gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border",
                        type === 'Orgânico' ? "bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border-[var(--accent-blue)]/20" : "bg-[var(--accent-orange)]/10 text-[var(--accent-orange)] border-[var(--accent-orange)]/20"
                      )}>
                        {type}
                      </span>
                      <h3 className="text-2xl font-black text-[var(--text-primary)] tracking-tight uppercase italic underline decoration-2 decoration-[var(--border-color)] underline-offset-8">
                        {content?.title || partnership?.title || (partnership ? `${partnership.brand} — ${partnership.title}` : 'ID Desconhecido')}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)] font-black uppercase tracking-[0.2em] opacity-60">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {format(new Date(result.createdAt), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border-2 shadow-sm",
                      result.worthIt === 'Sim' ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)] border-[var(--accent-green)]/20' : 
                      result.worthIt === 'Não' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)] border-[var(--accent-orange)]/20'
                    )}>
                      RETORNO: {result.worthIt}
                    </div>
                    <button 
                      onClick={() => {
                        if (window.confirm('Excluir este registro permanentemente do arquivo?')) {
                          dispatch({ type: 'DELETE_RESULT', payload: result.id });
                        }
                      }}
                      className="p-3 text-red-500/40 hover:text-red-500 hover:bg-red-500/5 rounded-2xl transition-all border border-transparent hover:border-red-500/20"
                      title="Excluir Registro"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
                  <section className="space-y-6">
                    <div className="flex items-center gap-3 text-[var(--text-tertiary)] opacity-60">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-[10px] uppercase tracking-[0.3em] font-black italic">Métricas de Impacto</span>
                    </div>
                    <div className="space-y-4 bg-[var(--bg-hover)]/40 p-8 rounded-3xl border border-[var(--border-color)]/30">
                      {result.engagement && (
                        <div className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest border-b border-[var(--border-color)] pb-3">
                          ALCANCE: <span className="text-[var(--text-tertiary)] ml-2">{result.engagement}</span>
                        </div>
                      )}
                      {result.creativeSatisfaction && (
                        <div className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest border-b border-[var(--border-color)] pb-3">
                          SATISFAÇÃO: <span className="text-[var(--text-tertiary)] ml-2">{result.creativeSatisfaction}/5</span>
                        </div>
                      )}
                      <p className="text-base text-[var(--text-primary)] leading-relaxed font-medium pt-2 italic opacity-80">{result.metrics || 'Sem métricas brutas registradas.'}</p>
                    </div>
                  </section>
                  <section className="space-y-6">
                    <div className="flex items-center gap-3 text-[var(--text-tertiary)] opacity-60">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-[10px] uppercase tracking-[0.3em] font-black italic">Aprendizado Auditado</span>
                    </div>
                    <div className="text-lg text-[var(--text-primary)] leading-relaxed font-bold italic border-l-4 border-[var(--border-color)] pl-8 py-2 opacity-90 underline decoration-[var(--border-color)] underline-offset-4 decoration-1">
                      {result.qualitativeNotes || 'Nenhuma nota de aprendizado registrada.'}
                    </div>
                  </section>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {results.length === 0 && (
          <div className="py-32 text-center border-2 border-dashed border-[var(--border-color)] rounded-[3rem] opacity-30 flex flex-col items-center gap-6">
            <BarChart3 className="w-12 h-12" />
            <p className="text-sm font-black uppercase tracking-[0.3em] italic">Nenhum dado processado</p>
          </div>
        )}
      </div>
    </div>
  );
}
