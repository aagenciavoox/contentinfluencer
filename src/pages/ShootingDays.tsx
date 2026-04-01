import { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Video, Clock, Shirt, MapPin, Play, CheckCircle2, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Content } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function ShootingDays() {
  const { state, dispatch } = useAppContext();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBurstMode, setIsBurstMode] = useState(false);
  const [view, setView] = useState<'planning' | 'sessions'>('planning');

  const readyToRecord = useMemo(() => {
    return state.contents.filter(c => c.status === 'Pronto para Gravar');
  }, [state.contents]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, Content[]> = {};
    state.contents.forEach(c => {
      if (c.recordingDate) {
        if (!groups[c.recordingDate]) groups[c.recordingDate] = [];
        groups[c.recordingDate].push(c);
      }
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [state.contents]);

  const selectedContents = useMemo(() => {
    return readyToRecord.filter(c => selectedIds.includes(c.id));
  }, [readyToRecord, selectedIds]);

  const optimizedOrder = useMemo(() => {
    return [...selectedContents].sort((a, b) => {
      if (a.scenario !== b.scenario) {
        return (a.scenario || '').localeCompare(b.scenario || '');
      }
      return (a.lookId || '').localeCompare(b.lookId || '');
    });
  }, [selectedContents]);

  const totalDuration = useMemo(() => {
    return selectedContents.reduce((acc, c) => acc + (c.estimatedDuration || 0), 0);
  }, [selectedContents]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleFinishRecording = () => {
    if (window.confirm('Finalizar gravação de todos os vídeos selecionados?')) {
      selectedIds.forEach(id => {
        const content = state.contents.find(c => c.id === id);
        if (content) {
          dispatch({ 
            type: 'UPDATE_CONTENT', 
            payload: { ...content, status: 'Gravado' } 
          });
        }
      });
      setSelectedIds([]);
      setIsBurstMode(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-10 md:py-16 px-6 md:px-10 transition-colors duration-200">
      <AnimatePresence mode="wait">
        {!isBurstMode ? (
          <motion.div 
            key="standard-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="space-y-6">
                <h1 className="text-4xl md:text-5xl font-black text-[var(--text-primary)] mb-6 tracking-tight">Crono-Gravação</h1>
                <div className="flex bg-[var(--bg-secondary)] p-1 rounded-2xl border border-[var(--border-color)] w-fit shadow-sm">
                  <button 
                    onClick={() => setView('planning')}
                    className={cn(
                      "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                      view === 'planning' ? "bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-lg" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    Contexto
                  </button>
                  <button 
                    onClick={() => setView('sessions')}
                    className={cn(
                      "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                      view === 'sessions' ? "bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-lg" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    Agendas
                  </button>
                </div>
              </div>

              {selectedIds.length > 0 && (
                <button 
                  onClick={() => setIsBurstMode(true)}
                  className="flex items-center gap-3 bg-[var(--accent-orange)] text-white px-8 py-4 rounded-2xl text-sm font-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[var(--accent-orange)]/20"
                >
                  <Play className="w-5 h-5 fill-current" /> MODO EXPLOSÃO
                </button>
              )}
            </header>

            {view === 'planning' ? (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 md:gap-16">
                <div className="lg:col-span-3 space-y-10">
                  <section>
                    <div className="flex items-center gap-3 mb-8 text-[var(--text-tertiary)]">
                      <Video className="w-5 h-5 text-[var(--accent-blue)]" />
                      <span className="text-[11px] uppercase tracking-[0.2em] font-black italic">Scripts Prontos ({readyToRecord.length})</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {readyToRecord.map(content => (
                        <div 
                          key={content.id}
                          onClick={() => toggleSelect(content.id)}
                          className={cn(
                            "p-6 rounded-[2rem] border transition-all cursor-pointer flex items-center justify-between group overflow-hidden relative",
                            selectedIds.includes(content.id) 
                              ? "bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-primary)] shadow-2xl scale-[1.02]" 
                              : "bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--text-primary)]/40 shadow-sm hover:shadow-xl hover:-translate-y-1"
                          )}
                        >
                          {selectedIds.includes(content.id) && (
                            <div className="absolute top-0 right-0 p-4">
                               <CheckCircle2 className="w-5 h-5 opacity-100" />
                            </div>
                          )}

                          <div className="flex items-center gap-5">
                            <div className={cn(
                              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                              selectedIds.includes(content.id) ? "bg-[var(--bg-primary)] border-[var(--bg-primary)] shadow-inner" : "border-[var(--border-color)] group-hover:border-[var(--text-primary)]"
                            )}>
                              {selectedIds.includes(content.id) && <div className="w-2.5 h-2.5 bg-[var(--text-primary)] rounded-full" />}
                            </div>
                            <div className="min-w-0 pr-4">
                              <h4 className="text-base font-bold truncate tracking-tight">{content.title}</h4>
                              <div className="flex flex-wrap gap-4 mt-2 text-[10px] font-black uppercase tracking-widest opacity-60">
                                <span className="flex items-center gap-2"><Shirt className="w-3.5 h-3.5" /> {content.lookId || 'Sem Look'}</span>
                                <span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {content.scenario || 'Sem Cenário'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-black opacity-40">{content.estimatedDuration || 0} MIN</span>
                          </div>
                        </div>
                      ))}
                      {readyToRecord.length === 0 && (
                        <div className="col-span-full py-24 text-center border-2 border-dashed border-[var(--border-color)] rounded-[3rem] opacity-30 flex flex-col items-center gap-4">
                          <Video className="w-10 h-10" />
                          <p className="text-xs font-black uppercase tracking-[0.3em] italic">Nenhum roteiro pronto</p>
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                <div className="lg:col-span-1">
                  <section className="p-10 bg-[var(--bg-secondary)] rounded-[2.5rem] border border-[var(--border-color)] shadow-xl lg:sticky lg:top-10 transition-all hover:shadow-2xl">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--accent-orange)] mb-10 italic">Plano de Bloco</h3>
                    
                    <div className="space-y-8">
                      <div className="flex items-center justify-between p-6 bg-[var(--bg-hover)] rounded-2xl border border-[var(--border-strong)]">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-sm">
                            <Video className="w-5 h-5 text-[var(--accent-blue)]" />
                          </div>
                          <span className="text-sm font-bold text-[var(--text-primary)]">Vídeos</span>
                        </div>
                        <span className="text-3xl font-black text-[var(--text-primary)]">{selectedIds.length}</span>
                      </div>

                      <div className="flex items-center justify-between p-6 bg-[var(--bg-hover)] rounded-2xl border border-[var(--border-strong)]">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-sm">
                            <Clock className="w-5 h-5 text-purple-500" />
                          </div>
                          <span className="text-sm font-bold text-[var(--text-primary)]">Total</span>
                        </div>
                        <span className="text-3xl font-black text-[var(--text-primary)]">{totalDuration}<span className="text-xs ml-1 opacity-40 font-black">MIN</span></span>
                      </div>

                      <div className="pt-8 border-t border-[var(--border-color)] space-y-4">
                        <div className="flex items-start gap-4">
                          <CheckCircle2 className="w-4 h-4 text-[var(--accent-green)] mt-1 shrink-0" />
                          <p className="text-[10px] text-[var(--text-tertiary)] font-bold uppercase tracking-widest leading-relaxed">
                            Otimizado por cenário e figurino para performance máxima.
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            ) : (
              <div className="space-y-16">
                {groupedByDate.map(([date, contents]) => (
                  <section key={date} className="animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center gap-8 mb-10">
                      <h3 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
                        {format(new Date(date), "dd 'de' MMMM", { locale: ptBR })}
                      </h3>
                      <div className="h-[2px] flex-1 bg-[var(--border-color)] opacity-50" />
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)] opacity-60">
                          {contents.length} vídeos • {contents.reduce((acc, c) => acc + (c.estimatedDuration || 0), 0)} MIN
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {contents.map(content => (
                        <div key={content.id} className="p-8 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[2.5rem] hover:shadow-2xl transition-all group shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-8">
                              <span className={cn(
                                "text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border",
                                content.status === 'Postado' ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)] border-[var(--accent-green)]/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)] border-[var(--accent-orange)]/20 shadow-[0_0_15px_rgba(249,115,22,0.1)]'
                              )}>
                                {content.status}
                              </span>
                              {content.lookId && (
                                <div className="flex items-center gap-2 text-[10px] font-black text-[var(--accent-blue)] bg-[var(--accent-blue)]/10 px-3 py-1 rounded-full border border-[var(--accent-blue)]/20">
                                  <Shirt className="w-3.5 h-3.5" /> {content.lookId}
                                </div>
                              )}
                            </div>
                            <h4 className="text-lg font-bold text-[var(--text-primary)] mb-8 leading-tight group-hover:text-black dark:group-hover:text-white transition-colors">{content.title}</h4>
                          </div>
                          <div className="flex items-center justify-between pt-6 border-t border-[var(--border-color)]">
                            <div className="flex items-center gap-3 text-[var(--text-tertiary)] opacity-60">
                              <MapPin className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase tracking-widest">{content.scenario || 'Padrão'}</span>
                            </div>
                            <span className="text-[10px] font-black text-[var(--text-tertiary)] opacity-40 uppercase tracking-widest">{content.estimatedDuration || 0} MIN</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
                {groupedByDate.length === 0 && (
                  <div className="py-32 text-center border-2 border-dashed border-[var(--border-color)] rounded-[3rem] opacity-30 flex flex-col items-center gap-6">
                    <CalendarIcon className="w-12 h-12" />
                    <p className="text-sm font-black uppercase tracking-[0.3em] italic">Nada agendado</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="burst-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="space-y-16"
          >
            <div className="flex items-center justify-between bg-[var(--accent-orange)] p-10 rounded-[3rem] border border-[var(--accent-orange)]/20 shadow-2xl shadow-[var(--accent-orange)]/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 -mr-32 -mt-32 bg-white/20 blur-3xl rounded-full" />
              <div className="absolute bottom-0 left-0 w-32 h-32 -ml-16 -mb-16 bg-black/10 blur-2xl rounded-full" />
              
              <div className="flex items-center gap-8 relative z-10">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/40 shadow-xl animate-pulse">
                  <Play className="w-8 h-8 fill-current ml-1" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tight uppercase">Modo Explosão Ativo</h2>
                  <p className="text-white/80 font-bold uppercase tracking-widest text-xs mt-1">Foco na Execução • {selectedIds.length} Vídeos na Fila</p>
                </div>
              </div>
              <button 
                onClick={handleFinishRecording}
                className="bg-white text-[var(--accent-orange)] px-10 py-5 rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl relative z-10"
              >
                FINALIZAR TUDO
              </button>
            </div>

            <div className="grid grid-cols-1 gap-12">
              {optimizedOrder.map((content, index) => {
                const isNewScenario = index === 0 || content.scenario !== optimizedOrder[index-1].scenario;
                const isNewLook = index === 0 || content.lookId !== optimizedOrder[index-1].lookId;

                return (
                  <div key={content.id} className="space-y-6">
                    {(isNewScenario || isNewLook) && (
                      <div className="flex flex-col sm:flex-row items-center gap-6 py-4 px-2">
                        {isNewScenario && (
                          <div className="flex items-center gap-4 px-6 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-sm">
                             <MapPin className="w-4 h-4 text-[var(--accent-orange)]" />
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)]">Setup: {content.scenario || 'Padrão'}</span>
                          </div>
                        )}
                        {isNewLook && (
                           <div className="flex items-center gap-4 px-6 py-2 bg-[var(--accent-blue)]/10 border border-[var(--accent-blue)]/20 rounded-2xl shadow-sm">
                             <Shirt className="w-4 h-4 text-[var(--accent-blue)]" />
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent-blue)]">Figurino: {content.lookId || 'Base'}</span>
                          </div>
                        )}
                        <div className="h-[2px] flex-1 bg-[var(--border-color)] opacity-40 hidden sm:block" />
                      </div>
                    )}
                    
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[3rem] overflow-hidden shadow-2xl group transition-all hover:border-[var(--accent-orange)]/40 hover:-translate-y-1">
                      <div className="p-10 md:p-14 border-b border-[var(--border-color)] bg-[var(--bg-hover)]/30 flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex items-center gap-8">
                          <span className="w-16 h-16 rounded-[2rem] bg-[var(--text-primary)] text-[var(--bg-primary)] flex items-center justify-center text-2xl font-black shadow-xl">
                            {index + 1}
                          </span>
                          <div>
                            <h3 className="text-3xl font-black text-[var(--text-primary)] tracking-tight mb-2 uppercase">{content.title}</h3>
                            <div className="flex gap-4">
                              <span className="text-xs font-black text-[var(--text-tertiary)] bg-[var(--bg-hover)] px-4 py-1 rounded-full uppercase tracking-widest border border-[var(--border-color)]">{content.estimatedDuration} MIN DE TELA</span>
                              <span className="text-xs font-black text-purple-500 bg-purple-500/10 px-4 py-1 rounded-full uppercase tracking-widest border border-purple-500/20">
                                {state.series.find(s => s.id === content.seriesId)?.name || 'Ecossistema'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="p-10 md:p-14 grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-24">
                        <div className="space-y-8">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-[var(--bg-hover)] rounded-xl border border-[var(--border-color)]">
                              <CheckCircle2 className="w-5 h-5 text-[var(--accent-blue)]" />
                            </div>
                            <h4 className="text-[11px] uppercase tracking-[0.3em] font-black text-[var(--text-tertiary)] italic">Roteiro Principal</h4>
                          </div>
                          <div className="text-xl text-[var(--text-primary)] leading-relaxed font-medium bg-[var(--bg-hover)]/50 p-8 rounded-3xl border border-[var(--border-color)]/30 min-h-[300px]">
                            {content.script ? (
                              <div className="whitespace-pre-wrap select-text">{content.script}</div>
                            ) : (
                              <span className="italic opacity-20">Nenhum roteiro detalhado.</span>
                            )}
                          </div>
                        </div>
                        <div className="space-y-8">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-[var(--bg-hover)] rounded-xl border border-[var(--border-color)]">
                               <AlertCircle className="w-5 h-5 text-[var(--accent-orange)]" />
                            </div>
                            <h4 className="text-[11px] uppercase tracking-[0.3em] font-black text-[var(--text-tertiary)] italic">Instruções de Performance</h4>
                          </div>
                          <div className="text-lg text-[var(--text-tertiary)] leading-relaxed italic border-l-4 border-[var(--accent-orange)] pl-8 py-4 opacity-80">
                            {content.notes || 'Foco no ritmo e clareza. Mantenha a energia alta.'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
