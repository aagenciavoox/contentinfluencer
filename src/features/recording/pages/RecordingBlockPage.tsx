import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, CheckCircle2, Mic, Video } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { cn, htmlToReadableText } from '../../../lib/utils';
import { PipelineActionBar } from '../../../components/pipeline/PipelineActionBar';
import {buildMarkContentRecordedTransition, isRecordingBlockTeleprompterEnabled, resolveRecordingContextSummary} from '../lib/recordingWorkflow';
import { BurstModeMobileScreen } from '../../../mobile/screens/recording/BurstModeMobileScreen';
import type { Content } from '../../../lib/database';

export function RecordingBlockPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const block = state.recordingBlocks.find(b => b.id === id);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [isMobileBurstOpen, setIsMobileBurstOpen] = useState(false);

  const burstLaunch = searchParams.get('burst') === '1';

  useEffect(() => {
    if (!isMobile || !burstLaunch) return;
    setIsMobileBurstOpen(true);
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      next.delete('burst');
      return next;
    }, { replace: true });
  }, [burstLaunch, isMobile, setSearchParams]);

  const blockContents = useMemo(
    () => (block ? [...block.contents].sort((a, b) => a.ordem - b.ordem) : []),
    [block]
  );

  const mobileEntries = useMemo(
    () =>
      blockContents
        .map(blockContent => {
          const content = state.contents.find(item => item.id === blockContent.contentId);
          if (!content) return null;

          return {
            content,
            gravado: blockContent.gravado,
          };
        })
        .filter((entry): entry is { content: Content; gravado: boolean } => entry !== null),
    [blockContents, state.contents]
  );

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

  const total = blockContents.length;
  const gravados = blockContents.filter(c => c.gravado).length;
  const pct = total > 0 ? Math.round((gravados / total) * 100) : 0;

  const currentBlockContent = blockContents[currentIndex];
  const currentContent = currentBlockContent
    ? state.contents.find(c => c.id === currentBlockContent.contentId)
    : null;

  const teleprompterEnabled = isRecordingBlockTeleprompterEnabled(block);

  const handleMobileTeleprompterToggle = () => {
    void dispatch({
      type: 'UPDATE_RECORDING_BLOCK',
      payload: {
        ...block,
        metadata: {
          ...(block.metadata || {}),
          teleprompterEnabled: !teleprompterEnabled,
        },
      },
    });
  };

  if (isMobile) {
    const readyCount = mobileEntries.filter(entry => !entry.gravado).length;

    return (
      <>
        <div className="space-y-4">
          <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
            <button
              type="button"
              onClick={() => navigate('/gravacao?tab=blocks')}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-secondary)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>

            <p className="mt-4 text-[11px] font-black uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
              Bloco de gravacao
            </p>
            <h1 className="mt-2 text-2xl font-black leading-tight text-[var(--text-primary)]">{block.name}</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Revise os roteiros, escolha o modo de leitura e inicie o modo explosao quando quiser sobrepor o app inteiro.
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-[1.15rem] bg-[var(--bg-hover)] px-3 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Fila</p>
                <p className="mt-1 text-base font-black text-[var(--text-primary)]">{mobileEntries.length}</p>
              </div>
              <div className="rounded-[1.15rem] bg-[var(--bg-hover)] px-3 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Prontos</p>
                <p className="mt-1 text-base font-black text-[var(--text-primary)]">{readyCount}</p>
              </div>
              <div className="rounded-[1.15rem] bg-[var(--bg-hover)] px-3 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Feitos</p>
                <p className="mt-1 text-base font-black text-[var(--text-primary)]">{mobileEntries.length - readyCount}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                  Teleprompter
                </p>
                <h2 className="mt-2 text-base font-black text-[var(--text-primary)]">
                  {teleprompterEnabled ? 'Ativado para este bloco' : 'Desativado para este bloco'}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                  Com teleprompter ligado, o roteiro rola automaticamente. Desligado, o modo explosao abre em leitura estatica limpa.
                </p>
              </div>

              <button
                type="button"
                onClick={handleMobileTeleprompterToggle}
                className={cn(
                  'inline-flex items-center justify-center rounded-2xl border px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] transition-all',
                  teleprompterEnabled
                    ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                    : 'border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)]'
                )}
              >
                <Mic className="mr-2 h-4 w-4" />
                {teleprompterEnabled ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                  Roteiros do bloco
                </p>
                <h2 className="mt-2 text-base font-black text-[var(--text-primary)]">
                  Ordem de execucao
                </h2>
              </div>

              <span className="rounded-full bg-[var(--bg-hover)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                {resolveRecordingContextSummary({ block, content: mobileEntries[0]?.content ?? null })}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {mobileEntries.map((entry, index) => (
                <div
                  key={entry.content.id}
                  className={cn(
                    'rounded-[1.4rem] border px-4 py-4',
                    entry.gravado
                      ? 'border-emerald-500/20 bg-emerald-500/8'
                      : 'border-[var(--border-color)] bg-[var(--bg-primary)]'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-hover)] text-xs font-black text-[var(--text-primary)]">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-[var(--text-primary)]">{entry.content.title || 'Conteudo sem titulo'}</p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {htmlToReadableText(entry.content.script) ? 'Roteiro pronto para leitura.' : 'Sem roteiro escrito.'}
                      </p>
                    </div>

                    {entry.gravado ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-500">
                        <CheckCircle2 className="h-3 w-3" />
                        Gravado
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <button
            type="button"
            onClick={() => setIsMobileBurstOpen(true)}
            disabled={readyCount === 0}
            className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Video className="h-4 w-4" />
            Iniciar modo explosao
          </button>
        </div>

        {isMobileBurstOpen && (
          <BurstModeMobileScreen
            block={block}
            entries={mobileEntries}
            onClose={() => setIsMobileBurstOpen(false)}
            onMarkRecorded={(contentId) => {
              const transition = buildMarkContentRecordedTransition({
                block,
                contentId,
                contents: state.contents,
              });
              if (!transition) return;

              dispatch({
                type: 'UPDATE_CONTENT',
                payload: transition.updatedContent,
              } as any);

              dispatch({
                type: 'UPDATE_BLOCK_CONTENTS',
                payload: {blockId: block.id, contents: transition.updatedBlockContents},
              });
            }}
            onFinish={() => {
              setIsMobileBurstOpen(false);
              navigate('/conteudos?view=postagem');
            }}
          />
        )}
      </>
    );
  }

  const marcarGravado = () => {
    if (!currentContent || !currentBlockContent) return;

    const transition = buildMarkContentRecordedTransition({
      block,
      contentId: currentBlockContent.contentId,
      contents: state.contents,
    });
    if (!transition) return;

    dispatch({
      type: 'UPDATE_CONTENT',
      payload: transition.updatedContent,
    } as any);

    dispatch({
      type: 'UPDATE_BLOCK_CONTENTS',
      payload: {blockId: block.id, contents: transition.updatedBlockContents},
    });

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
            onClick={() => navigate('/conteudos?view=postagem')}
            className="px-8 py-4 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-2xl text-[11px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            Ir para Produção
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
                {htmlToReadableText(currentContent.script)}
              </p>
            </div>
          ) : (
            <div className="flex-1 bg-[var(--bg-primary)] border border-dashed border-[var(--border-color)] rounded-2xl flex items-center justify-center">
              <p className="text-sm opacity-20 font-black uppercase tracking-widest">Sem roteiro</p>
            </div>
          )}

          <PipelineActionBar
            className="mt-6"
            title="Proximo passo"
            description="Finalize a gravacao deste roteiro para seguir para edicao e postagem."
            primaryLabel="Marcar como gravado"
            onPrimary={marcarGravado}
            disabled={Boolean(currentBlockContent?.gravado)}
          />

          {/* Controles */}
          <div className="flex gap-3 mt-4 flex-wrap">
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


