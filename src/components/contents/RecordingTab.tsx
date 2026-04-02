import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Plus, Table as TableIcon, Layers, Calendar, X, Check, Video, Trash2, Clock, Shirt, MapPin, Play, CheckCircle2, Pause, SkipForward } from 'lucide-react';
import { RecordingBlock, Content } from '../../types';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { BottomSheetModal } from '../BottomSheetModal';
import { ConfirmModal } from '../ConfirmModal';

export function RecordingTab() {
  const { state, dispatch } = useAppContext();
  const [selectedBlock, setSelectedBlock] = useState<RecordingBlock | null>(null);
  const [isBurstMode, setIsBurstMode] = useState(false);
  const [sessionCompletedIds, setSessionCompletedIds] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // Delete Block
  const handleDeleteBlock = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirm({ message: 'Tem certeza que deseja deletar este bloco de gravação?', onConfirm: () => dispatch({ type: 'DELETE_RECORDING_BLOCK', payload: id }) });
  };

  // When block is clicked, we look at contents.
  // We only care about contentIds for this block.
  const getContentsForBlock = (block: RecordingBlock) => {
    return block.contentIds
      .map(id => state.contents.find(c => c.id === id))
      .filter(Boolean) as Content[];
  };

  return (
    <div className="space-y-8">
      {!isBurstMode && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {state.recordingBlocks.length === 0 ? (
              <div className="col-span-full py-32 text-center border-2 border-dashed border-[var(--border-color)] rounded-[3rem] opacity-30 flex flex-col items-center gap-6 mt-8">
                <Video className="w-12 h-12" />
                <p className="text-sm font-black uppercase tracking-[0.3em] italic">Nenhum bloco montado</p>
                <span className="text-xs uppercase font-bold tracking-widest text-center mt-2 opacity-70">
                  Selecione os roteiros "Pronto para Gravar" e clique em "Criar Bloco"
                </span>
              </div>
            ) : (
              state.recordingBlocks.map(block => {
                const contents = getContentsForBlock(block);
                // "Nome do bloco, roupa, cenário e titulo dele, quantidade de vídeos"
                // Assuming "roupa" and "cenário" from the first script.
                const first = contents[0];
                const readyContents = contents.filter(c => c.status === 'Pronto para Gravar');
                const isCompleted = readyContents.length === 0 && contents.length > 0;
                const totalCount = contents.length;
                const completedCount = totalCount - readyContents.length;
                const progressPercentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

                return (
                  <div
                    key={block.id}
                    onClick={() => setSelectedBlock(block)}
                    className={cn(
                      "bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[2rem] p-6 cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all group flex flex-col justify-between",
                      isCompleted && "opacity-60 grayscale-[0.8]"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border",
                          isCompleted ? "bg-[var(--accent-green)]/10 text-[var(--accent-green)] border-[var(--accent-green)]/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]" : "bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border-[var(--accent-blue)]/20"
                        )}>
                          {isCompleted ? 'Finalizado' : 'Aguardando Câmera'}
                        </span>
                        <button
                          onClick={(e) => handleDeleteBlock(block.id, e)}
                          className="p-2 text-[var(--accent-pink)] opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity rounded-full hover:bg-[var(--accent-pink)]/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h3 className="text-xl font-black text-[var(--text-primary)] mb-2 uppercase line-clamp-2">
                        {block.name}
                      </h3>
                      {first && (
                        <p className="text-xs font-bold text-[var(--text-tertiary)] opacity-70 line-clamp-1 italic mb-6">
                          Ex: {first.title}
                        </p>
                      )}

                      {/* Barra de Progresso */}
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-80">
                          <span>Progresso</span>
                          <span>{completedCount} de {totalCount} Gravados ({progressPercentage}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden border border-[var(--border-color)]">
                          <div 
                            className={cn("h-full transition-all duration-500 rounded-full", isCompleted ? "bg-[var(--accent-green)] shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-[var(--text-primary)]")}
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-[var(--border-color)]">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
                           <Layers className="w-3 h-3" /> Vídeos
                        </div>
                        <p className="text-lg font-black text-[var(--text-primary)]">{contents.length}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
                          <Shirt className="w-3 h-3" /> Roupa
                        </div>
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate">{first?.lookId || 'N/A'}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
                          <MapPin className="w-3 h-3" /> Cenário
                        </div>
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate">{first?.scenario || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <BottomSheetModal
            open={!!selectedBlock}
            onClose={() => setSelectedBlock(null)}
            desktopMaxW="max-w-4xl"
            zIndex="z-50"
          >
            {selectedBlock && (
              <BlockAnalysis
                block={selectedBlock}
                onClose={() => setSelectedBlock(null)}
                onStart={() => setIsBurstMode(true)}
              />
            )}
          </BottomSheetModal>
        </>
      )}

      {isBurstMode && selectedBlock && (
        <BurstModeSession
          block={selectedBlock}
          completedIds={sessionCompletedIds}
          setCompletedIds={setSessionCompletedIds}
          onExit={() => {
            setIsBurstMode(false);
            setSessionCompletedIds(new Set());
            setSelectedBlock(null);
          }}
        />
      )}
      <ConfirmModal
        open={!!confirm}
        message={confirm?.message || ''}
        onConfirm={() => { confirm?.onConfirm(); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

// Subcomponent: Block Analysis Modal
function BlockAnalysis({ block, onClose, onStart }: { block: RecordingBlock, onClose: () => void, onStart: () => void }) {
  const { state } = useAppContext();
  const contents = block.contentIds.map(id => state.contents.find(c => c.id === id)).filter(Boolean) as Content[];
  const readyContents = contents.filter(c => c.status === 'Pronto para Gravar');

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)]">
      <div className="p-6 md:p-8 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl md:text-3xl font-black text-[var(--text-primary)] tracking-tight uppercase">{block.name}</h2>
          <p className="text-xs font-black uppercase tracking-widest text-[var(--text-tertiary)] mt-2 opacity-60">Detalhamento do Bloco</p>
        </div>
        <button onClick={onClose} className="p-3 hover:bg-[var(--bg-hover)] rounded-full transition-colors">
          <X className="w-6 h-6 text-[var(--text-primary)]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar divide-y divide-[var(--border-color)]">
        {contents.map((content, idx) => {
          const isDone = content.status !== 'Pronto para Gravar';
          return (
            <div key={content.id} className={cn("py-6 flex items-start gap-4 transition-all", isDone && "opacity-40 grayscale")}>
              <div className="w-8 h-8 rounded-full border-2 border-[var(--text-primary)] flex items-center justify-center font-black text-xs shrink-0 bg-[var(--bg-hover)]">
                {idx + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <h4 className="text-lg font-black text-[var(--text-primary)] uppercase italic leading-tight">{content.title}</h4>
                  {isDone && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full flex items-center gap-1.5 shrink-0">
                      <CheckCircle2 className="w-3 h-3" /> Gravado
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] opacity-80 mb-4">
                  {content.lookId && <span className="flex items-center gap-1"><Shirt className="w-3 h-3" /> {content.lookId}</span>}
                  {content.scenario && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {content.scenario}</span>}
                  {content.estimatedDuration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {content.estimatedDuration}m</span>}
                </div>
                <div className="bg-[var(--bg-hover)] p-4 rounded-xl border border-[var(--border-strong)]">
                  <p className="text-sm font-medium text-[var(--text-tertiary)] whitespace-pre-wrap leading-relaxed line-clamp-3 italic">
                    {content.script || 'S/ Roteiro'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-6 md:p-8 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] flex justify-end shrink-0">
        <button
          onClick={onStart}
          disabled={readyContents.length === 0}
          className="w-full md:w-auto flex items-center justify-center gap-3 bg-[var(--text-primary)] text-[var(--bg-primary)] px-10 py-5 rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl disabled:opacity-30 disabled:scale-100"
        >
          {readyContents.length === 0 ? 'Tudo Finalizado' : <><Play className="w-5 h-5 fill-current" /> Iniciar Bloco Explosão</>}
        </button>
      </div>
    </div>
  );
}

// Subcomponent: Burst Mode Session
function BurstModeSession({ block, completedIds, setCompletedIds, onExit }: { block: RecordingBlock, completedIds: Set<string>, setCompletedIds: React.Dispatch<React.SetStateAction<Set<string>>>, onExit: () => void }) {
  const { state, dispatch } = useAppContext();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [confirmBurst, setConfirmBurst] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // We only load scripts that are "Pronto para Gravar" over the block
  const readyContents = useMemo(() => {
    return block.contentIds
      .map(id => state.contents.find(c => c.id === id))
      .filter(c => c && c.status === 'Pronto para Gravar') as Content[];
  }, [state.contents, block.contentIds]);

  const currentContent = readyContents[currentIndex];

  const handleFinishBlock = () => {
    setConfirmBurst({ message: 'Salvar progresso do bloco de gravação? (Pausar e concluir o resto em outro dia não há problema)', onConfirm: () => {
      completedIds.forEach(id => {
        const content = state.contents.find(c => c.id === id);
        if (content) {
          dispatch({ type: 'UPDATE_CONTENT', payload: { ...content, status: 'Gravado' } });
        }
      });
      onExit();
    } });
  };

  const toggleComplete = (id: string) => {
    setCompletedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!currentContent) {
    return (
      <div className="fixed inset-0 min-h-screen bg-[var(--bg-primary)] z-[100] flex flex-col items-center justify-center p-6 text-center">
         <CheckCircle2 className="w-24 h-24 text-[var(--accent-green)] mb-8 animate-bounce mx-auto" />
         <h1 className="text-4xl md:text-5xl font-black text-[var(--text-primary)] uppercase tracking-tight mb-4 italic">Parabéns!</h1>
         <p className="text-lg text-[var(--text-tertiary)] font-bold mb-12">Você finalizou (ou pausou) o bloco inteiro.</p>
         <button
           onClick={handleFinishBlock}
           className="bg-[var(--text-primary)] text-[var(--bg-primary)] px-12 py-5 rounded-3xl text-sm font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all"
         >
           Salvar e Fechar Sala
         </button>
         <ConfirmModal
           open={!!confirmBurst}
           message={confirmBurst?.message || ''}
           onConfirm={() => { confirmBurst?.onConfirm(); setConfirmBurst(null); }}
           onCancel={() => setConfirmBurst(null)}
         />
      </div>
    );
  }

  const isCurrentCompleted = completedIds.has(currentContent.id);

  return (
    <div className="fixed inset-0 min-h-screen bg-[var(--bg-primary)] z-[100] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
      
      {/* HUD Header */}
      <header className="flex-none p-4 md:p-8 flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-secondary)] relative shrink-0">
        <div className="flex items-center gap-3 z-10">
          <button 
            onClick={handleFinishBlock}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--bg-hover)] border border-[var(--border-color)] text-[9px] uppercase font-black tracking-widest text-[var(--text-primary)] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all group"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Pausar Rotina</span>
            <span className="sm:hidden">Sair</span>
          </button>
        </div>
        
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--text-primary)]">EXPLOSÃO</span>
          </div>
        </div>

        <div className="flex items-center gap-4 z-10">
          <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
             {currentIndex + 1} / {readyContents.length}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Script Viewer */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-16 lg:p-24 relative pb-32 md:pb-16">
           <h1 className="text-2xl md:text-5xl lg:text-6xl font-black text-[var(--text-primary)] leading-[1.1] mb-8 md:mb-12 uppercase italic pt-6 md:pt-10 text-center mx-auto max-w-5xl tracking-tight">
             {currentContent.title}
           </h1>
           <div className="max-w-4xl mx-auto">
             <div className="text-xl md:text-4xl lg:text-5xl text-[var(--text-primary)] leading-[1.6] font-black whitespace-pre-wrap md:tracking-tight mx-auto text-left relative focus:outline-none p-4 md:p-6 rounded-2xl bg-[var(--bg-hover)]/30 border border-transparent md:bg-transparent md:border-none shadow-sm md:shadow-none">
                {currentContent.script || 'Sem roteiro... vá no freestyle!'}
             </div>
           </div>
        </div>

        {/* Sidebar Actions / Bottom Controls on Mobile */}
        <aside className="w-full md:w-80 bg-[var(--bg-secondary)] border-t md:border-t-0 md:border-l border-[var(--border-color)] flex flex-col shrink-0 z-20">
          <div className="hidden md:flex flex-1 flex-col overflow-y-auto p-8 custom-scrollbar space-y-8">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-50 mb-6">Controle de Progresso</h3>
            
            <button
               onClick={() => toggleComplete(currentContent.id)}
               className={cn(
                 "w-full p-6 text-left rounded-3xl border-2 transition-all group flex flex-col gap-4 ",
                 isCurrentCompleted 
                   ? "bg-[var(--accent-green)]/10 border-[var(--accent-green)] text-[var(--accent-green)] shadow-[0_0_20px_rgba(34,197,94,0.15)]" 
                   : "bg-[var(--bg-primary)] border-[var(--border-strong)] text-[var(--text-primary)] hover:border-[var(--text-primary)]/40"
               )}
            >
               <div className="flex items-center justify-between">
                 <span className="text-[10px] uppercase font-black tracking-widest">{isCurrentCompleted ? 'Gravado (Salvo)' : 'Marcar como Gravado'}</span>
                 <CheckCircle2 className={cn("w-6 h-6 transition-transform group-hover:scale-110", isCurrentCompleted ? "fill-current" : "opacity-40")} />
               </div>
            </button>
            <div className="w-full h-px bg-[var(--border-strong)] opacity-50" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-50 mb-6 mt-8">Neste Script</h3>
            <div className="space-y-4">
               {currentContent.lookId && (
                 <div className="flex items-center justify-between p-4 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)]">
                   <span className="text-[9px] uppercase font-black tracking-widest text-[var(--text-tertiary)] flex items-center gap-2">
                     <Shirt className="w-3 h-3" /> Look
                   </span>
                   <span className="text-xs font-bold text-[var(--text-primary)]">{currentContent.lookId}</span>
                 </div>
               )}
               {currentContent.scenario && (
                 <div className="flex items-center justify-between p-4 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)]">
                   <span className="text-[9px] uppercase font-black tracking-widest text-[var(--text-tertiary)] flex items-center gap-2">
                     <MapPin className="w-3 h-3" /> Cenario
                   </span>
                   <span className="text-xs font-bold text-[var(--text-primary)]">{currentContent.scenario}</span>
                 </div>
               )}
            </div>
          </div>

          {/* Mobile Quick Controls */}
          <div className="md:hidden p-4 border-b border-[var(--border-color)] flex items-center gap-3 overflow-x-auto no-scrollbar">
             <button
               onClick={() => toggleComplete(currentContent.id)}
               className={cn(
                 "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all whitespace-nowrap text-[9px] font-black uppercase tracking-widest",
                 isCurrentCompleted 
                   ? "bg-[var(--accent-green)] border-[var(--accent-green)] text-white shadow-lg" 
                   : "bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-primary)]"
               )}
             >
               <CheckCircle2 className="w-3.5 h-3.5" /> {isCurrentCompleted ? 'Gravado' : 'Marcar Gravado'}
             </button>
             {currentContent.lookId && (
                <div className="px-3 py-2 bg-[var(--bg-hover)] rounded-xl border border-[var(--border-color)] flex items-center gap-2 shrink-0">
                   <Shirt className="w-3 h-3 text-[var(--text-tertiary)]" />
                   <span className="text-[9px] font-black text-[var(--text-primary)] uppercase">{currentContent.lookId}</span>
                </div>
             )}
              {currentContent.scenario && (
                <div className="px-3 py-2 bg-[var(--bg-hover)] rounded-xl border border-[var(--border-color)] flex items-center gap-2 shrink-0">
                   <MapPin className="w-3 h-3 text-[var(--text-tertiary)]" />
                   <span className="text-[9px] font-black text-[var(--text-primary)] uppercase">{currentContent.scenario}</span>
                </div>
             )}
          </div>

          <div className="p-4 md:p-8 bg-[var(--bg-secondary)]">
            <button
              onClick={() => setCurrentIndex(prev => Math.min(prev + 1, readyContents.length))}
              className="w-full flex items-center justify-center gap-3 bg-[var(--text-primary)] text-[var(--bg-primary)] px-6 py-4 md:py-5 rounded-2xl md:rounded-[2rem] text-[10px] md:text-xs font-black uppercase tracking-[0.2em] hover:scale-[1.03] transition-all shadow-xl"
            >
              PRÓXIMO VÍDEO <SkipForward className="w-4 h-4 fill-current" />
            </button>
          </div>
        </aside>
      </main>
      <ConfirmModal
        open={!!confirmBurst}
        message={confirmBurst?.message || ''}
        onConfirm={() => { confirmBurst?.onConfirm(); setConfirmBurst(null); }}
        onCancel={() => setConfirmBurst(null)}
      />
    </div>
  );
}
