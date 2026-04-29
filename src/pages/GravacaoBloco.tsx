import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, Video } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { cn } from '../lib/utils';

export function GravacaoBloco() {
  const { id } = useParams<{ id: string }>();
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();

  const block = state.recordingBlocks.find(b => b.id === id);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [done, setDone] = useState(false);

  if (!block) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-sm font-black uppercase tracking-widest opacity-30">Bloco não encontrado</p>
          <button onClick={() => navigate('/gravacao')} className="text-[11px] font-black uppercase tracking-widest underline opacity-50">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const blockContents = [...block.contents].sort((a, b) => a.ordem - b.ordem);
  const total = blockContents.length;
  const gravados = blockContents.filter(c => c.gravado).length;
  const pct = total > 0 ? Math.round((gravados / total) * 100) : 0;

  const currentBlockContent = blockContents[currentIndex];
  const currentContent = currentBlockContent
    ? state.contents.find(c => c.id === currentBlockContent.contentId)
    : null;

  const marcarGravado = () => {
    if (!currentContent || !currentBlockContent) return;

    dispatch({
      type: 'UPDATE_CONTENT',
      payload: { ...currentContent, status: 'Gravado', updatedAt: new Date().toISOString() },
    } as any);

    const updatedContents = blockContents.map(bc =>
      bc.contentId === currentBlockContent.contentId ? { ...bc, gravado: true } : bc
    );
    dispatch({ type: 'UPDATE_BLOCK_CONTENTS', payload: { blockId: block.id, contents: updatedContents } });

    if (currentIndex < total - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setDone(true);
    }
  };

  const avancar = () => {
    if (currentIndex < total - 1) setCurrentIndex(currentIndex + 1);
    else setDone(true);
  };

  const recuar = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  if (done || gravados === total) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center px-6">
        <div className="text-center space-y-6 max-w-md w-full">
          <div className="text-6xl">🎉</div>
          <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">Bloco concluído!</h1>
          <p className="text-sm font-bold opacity-40">{block.name} · {total} conteúdos gravados</p>
          <button
            onClick={() => navigate('/gravacao')}
            className="px-8 py-4 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-2xl text-[11px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            Voltar para Gravação
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] flex flex-col md:flex-row">
      {/* Coluna principal — script */}
      <div className="flex-1 flex flex-col px-6 md:px-12 py-10 md:py-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/gravacao')}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            {block.name}
          </button>
          <div className="flex items-center gap-3">
            <div className="w-32 h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--text-primary)] rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] font-black opacity-40">{gravados}/{total}</span>
          </div>
        </div>

        {/* Conteúdo atual */}
        <div className="flex-1 flex flex-col">
          <div className="mb-2">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-30">
              {currentIndex + 1} de {total}
              {currentBlockContent?.gravado && (
                <span className="ml-2 text-green-400">✓ gravado</span>
              )}
            </span>
          </div>

          <h2 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] tracking-tight mb-6">
            {currentContent?.title || '(sem título)'}
          </h2>

          {currentContent?.script ? (
            <div className="flex-1 overflow-y-auto bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-6 md:p-8">
              <p className="text-sm md:text-base leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap font-medium">
                {currentContent.script}
              </p>
            </div>
          ) : (
            <div className="flex-1 bg-[var(--bg-primary)] border border-dashed border-[var(--border-color)] rounded-2xl flex items-center justify-center">
              <p className="text-sm opacity-20 font-black uppercase tracking-widest">Sem roteiro</p>
            </div>
          )}

          {/* Controles */}
          <div className="flex gap-3 mt-6 flex-wrap">
            <button
              onClick={recuar}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 px-5 py-3 border border-[var(--border-color)] rounded-2xl text-[11px] font-black uppercase tracking-widest opacity-50 hover:opacity-80 disabled:opacity-20 transition-opacity"
            >
              <ArrowLeft className="w-4 h-4" />
              Anterior
            </button>

            <button
              onClick={marcarGravado}
              disabled={currentBlockContent?.gravado}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all',
                currentBlockContent?.gravado
                  ? 'bg-green-400/10 text-green-400 opacity-60'
                  : 'bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-90'
              )}
            >
              <CheckCircle className="w-4 h-4" />
              {currentBlockContent?.gravado ? 'Gravado' : 'Marcar como gravado'}
            </button>

            <button
              onClick={avancar}
              disabled={currentIndex === total - 1}
              className="flex items-center gap-2 px-5 py-3 border border-[var(--border-color)] rounded-2xl text-[11px] font-black uppercase tracking-widest opacity-50 hover:opacity-80 disabled:opacity-20 transition-opacity ml-auto"
            >
              Próximo
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar desktop — lista do bloco */}
      <div className="hidden md:flex flex-col w-80 shrink-0 bg-[var(--bg-primary)] border-l border-[var(--border-color)] py-16 px-6">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">Bloco</p>
        <div className="space-y-2 overflow-y-auto">
          {blockContents.map((bc, idx) => {
            const c = state.contents.find(x => x.id === bc.contentId);
            return (
              <button
                key={bc.contentId}
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all',
                  idx === currentIndex
                    ? 'bg-[var(--bg-hover)] border border-[var(--text-primary)]/20'
                    : 'hover:bg-[var(--bg-hover)] opacity-50 hover:opacity-80'
                )}
              >
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                  bc.gravado ? 'border-green-400 bg-green-400/20' : 'border-[var(--border-color)]'
                )}>
                  {bc.gravado && <div className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-[var(--text-primary)] truncate">
                    {c?.title || '(sem título)'}
                  </p>
                  {idx === currentIndex && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Video className="w-3 h-3 opacity-40" />
                      <span className="text-[9px] font-bold opacity-40 uppercase tracking-widest">Atual</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
