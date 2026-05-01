import React, {useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {
  CheckCircle2,
  Layers,
  MapPin,
  Pause,
  Play,
  Shirt,
  SkipForward,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import {BottomSheetModal} from '../../../../components/feedback/modals/BottomSheetModal';
import {ConfirmModal} from '../../../../components/feedback/modals/ConfirmModal';
import {useAppContext} from '../../../../context/AppContext';
import {BurstModeExperience} from '../../../contents/components/burst-mode/BurstModeExperience';
import {Content, RecordingBlock} from '../../../../lib/database';
import {cn, htmlToReadableText} from '../../../../lib/utils';
import {RECORDING_READY_STATUS} from '../../../contents/lib/contentWorkflow';
import {
  buildSaveRecordingSessionTransition,
  isRecordingBlockTeleprompterEnabled,
  resolveRecordingBlockLookLabel,
  resolveRecordingBlockScenarioLabel,
} from '../../lib/recordingWorkflow';

type ConfirmState = {message: string; onConfirm: () => void} | null;

type BlockSummary = {
  firstContent: Content | null;
  readyContents: Content[];
  totalCount: number;
  completedCount: number;
  progressPercentage: number;
  isCompleted: boolean;
};

function getBlockContents(block: RecordingBlock, contents: Content[]) {
  return block.contents
    .map(({contentId}) => contents.find(content => content.id === contentId) ?? null)
    .filter((content): content is Content => content !== null);
}

function getReadyContents(contents: Content[]) {
  return contents.filter(content => content.status === RECORDING_READY_STATUS);
}

function getBlockSummary(contents: Content[]): BlockSummary {
  const readyContents = getReadyContents(contents);
  const totalCount = contents.length;
  const completedCount = totalCount - readyContents.length;
  const progressPercentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return {
    firstContent: contents[0] ?? null,
    readyContents,
    totalCount,
    completedCount,
    progressPercentage,
    isCompleted: totalCount > 0 && readyContents.length === 0,
  };
}

function getScriptLabel(script: string | null | undefined, fallback: string) {
  const normalized = htmlToReadableText(script);
  return normalized ? normalized : fallback;
}

export function RecordingQueueTab() {
  const {state, dispatch} = useAppContext();
  const navigate = useNavigate();
  const [selectedBlock, setSelectedBlock] = useState<RecordingBlock | null>(null);
  const [isBurstMode, setIsBurstMode] = useState(false);
  const [sessionCompletedIds, setSessionCompletedIds] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const handleDeleteBlock = (id: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setConfirm({
      message: 'Tem certeza que deseja deletar este bloco de gravação?',
      onConfirm: () => dispatch({type: 'DELETE_RECORDING_BLOCK', payload: id}),
    });
  };

  return (
    <div className="space-y-8">
      {!isBurstMode && (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {state.recordingBlocks.length === 0 ? (
              <div className="col-span-full mt-8 flex flex-col items-center gap-6 rounded-[3rem] border-2 border-dashed border-[var(--border-color)] py-32 text-center opacity-30">
                <Video className="h-12 w-12" />
                <p className="text-sm font-black uppercase tracking-[0.3em]">Nenhum bloco montado</p>
                <span className="mt-2 text-center text-xs font-bold uppercase tracking-widest opacity-70">
                  Selecione os roteiros &quot;{RECORDING_READY_STATUS}&quot; e clique em &quot;Criar Bloco&quot;
                </span>
              </div>
            ) : (
              state.recordingBlocks.map(block => (
                <RecordingBlockCard
                  key={block.id}
                  block={block}
                  contents={getBlockContents(block, state.contents)}
                  onOpen={() => setSelectedBlock(block)}
                  onDelete={handleDeleteBlock}
                />
              ))
            )}
          </div>

          <BottomSheetModal
            open={!!selectedBlock}
            onClose={() => setSelectedBlock(null)}
            desktopMaxW="max-w-4xl"
            zIndex="z-50"
          >
            {selectedBlock && (
              <BlockAnalysisModal
                block={selectedBlock}
                contents={getBlockContents(selectedBlock, state.contents)}
                onClose={() => setSelectedBlock(null)}
                onStart={() => setIsBurstMode(true)}
              />
            )}
          </BottomSheetModal>
        </>
      )}

      {isBurstMode && selectedBlock && (
        <BurstModeExperience
          block={selectedBlock}
          completedIds={sessionCompletedIds}
          setCompletedIds={setSessionCompletedIds}
          onExit={() => {
            setIsBurstMode(false);
            setSessionCompletedIds(new Set());
            setSelectedBlock(null);
            navigate('/conteudos/historico');
          }}
        />
      )}

      <ConfirmModal
        open={!!confirm}
        message={confirm?.message || ''}
        onConfirm={() => {
          confirm?.onConfirm();
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

type RecordingBlockCardProps = {
  block: RecordingBlock;
  contents: Content[];
  onOpen: () => void;
  onDelete: (id: string, event: React.MouseEvent<HTMLButtonElement>) => void;
};

function RecordingBlockCard({block, contents, onOpen, onDelete}: RecordingBlockCardProps) {
  const {state} = useAppContext();
  const {firstContent, completedCount, isCompleted, progressPercentage, totalCount} =
    getBlockSummary(contents);

  return (
    <div
      onClick={onOpen}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Abrir bloco ${block.name}`}
      className={cn(
        'group flex cursor-pointer flex-col justify-between rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 transition-all hover:-translate-y-1 hover:shadow-2xl',
        isCompleted && 'grayscale-[0.8] opacity-60'
      )}
    >
      <div>
        <div className="mb-4 flex items-center justify-between">
          <span
            className={cn(
              'rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest',
              isCompleted
                ? 'border-[var(--accent-green)]/20 bg-[var(--accent-green)]/10 text-[var(--accent-green)] shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                : 'border-[var(--accent-blue)]/20 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]'
            )}
          >
            {isCompleted ? 'Finalizado' : 'Aguardando Câmera'}
          </span>

          <button
            type="button"
            aria-label={`Deletar bloco ${block.name}`}
            onClick={event => onDelete(block.id, event)}
            className="rounded-full p-2 text-[var(--accent-pink)] opacity-0 transition-opacity hover:!opacity-100 hover:bg-[var(--accent-pink)]/10 group-hover:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <h3 className="mb-2 line-clamp-2 text-xl font-black uppercase text-[var(--text-primary)]">
          {block.name}
        </h3>

        {firstContent && (
          <p className="mb-6 line-clamp-1 text-xs font-bold text-[var(--text-tertiary)]">
            Ex: {firstContent.title}
          </p>
        )}

        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">
            <span>Progresso</span>
            <span>
              {completedCount} de {totalCount} gravados ({progressPercentage}%)
            </span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)]">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                isCompleted
                  ? 'bg-[var(--accent-green)] shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                  : 'bg-[var(--text-primary)]'
              )}
              style={{width: `${progressPercentage}%`}}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 border-t border-[var(--border-color)] pt-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
            <Layers className="h-3 w-3" /> Vídeos
          </div>
          <p className="text-lg font-black text-[var(--text-primary)]">{contents.length}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
            <Shirt className="h-3 w-3" /> Look
          </div>
          <p className="truncate text-xs font-bold text-[var(--text-primary)]">
            {resolveRecordingBlockLookLabel({
              block,
              content: firstContent,
              looks: state.looks,
            })}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
            <MapPin className="h-3 w-3" /> Cenário
          </div>
          <p className="truncate text-xs font-bold text-[var(--text-primary)]">
            {resolveRecordingBlockScenarioLabel({
              block,
              content: firstContent,
              cenarios: state.cenarios,
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

type BlockAnalysisModalProps = {
  block: RecordingBlock;
  contents: Content[];
  onClose: () => void;
  onStart: () => void;
};

function BlockAnalysisModal({block, contents, onClose, onStart}: BlockAnalysisModalProps) {
  const {state, dispatch} = useAppContext();
  const {readyContents} = getBlockSummary(contents);
  const teleprompterEnabled = isRecordingBlockTeleprompterEnabled(block);

  const handleTeleprompterToggle = () => {
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

  return (
    <div className="flex h-full flex-col bg-[var(--bg-primary)]">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 md:p-8">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-[var(--text-primary)] md:text-3xl">
            {block.name}
          </h2>
          <p className="mt-2 text-xs font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
            Detalhamento do bloco
          </p>
        </div>

        <button
          type="button"
          aria-label="Fechar modal"
          onClick={onClose}
          className="rounded-full p-3 transition-colors hover:bg-[var(--bg-hover)]"
        >
          <X className="h-6 w-6 text-[var(--text-primary)]" />
        </button>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto divide-y divide-[var(--border-color)] p-6 md:p-10">
        <section className="pb-6">
          <div className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                  Teleprompter
                </p>
                <h3 className="mt-2 text-base font-black uppercase text-[var(--text-primary)] md:text-lg">
                  {teleprompterEnabled ? 'Ativado para este bloco' : 'Desativado para este bloco'}
                </h3>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-[var(--text-secondary)]">
                  Quando ativado, o modo explosão usa rolagem guiada no mobile e no desktop. Quando desativado,
                  o bloco abre em leitura estática do roteiro.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTeleprompterToggle}
                className={cn(
                  'inline-flex items-center justify-center rounded-2xl border px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] transition-all',
                  teleprompterEnabled
                    ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                    : 'border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)]'
                )}
              >
                {teleprompterEnabled ? 'Desativar teleprompter' : 'Ativar teleprompter'}
              </button>
            </div>
          </div>
        </section>

        {contents.length === 0 ? (
          <div className="flex min-h-[16rem] flex-col items-center justify-center gap-4 rounded-[2rem] border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] px-6 text-center">
            <Video className="h-10 w-10 text-[var(--text-tertiary)] opacity-50" />
            <div className="space-y-2">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-primary)]">
                Nenhum conteúdo neste bloco
              </p>
              <p className="text-sm font-medium text-[var(--text-tertiary)]">
                Este bloco ainda não possui roteiros disponíveis para análise.
              </p>
            </div>
          </div>
        ) : (
          contents.map((content, index) => {
            const isDone = content.status !== RECORDING_READY_STATUS;

            return (
              <div
                key={content.id}
                className={cn('flex items-start gap-4 py-6 transition-all', isDone && 'grayscale opacity-40')}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[var(--text-primary)] bg-[var(--bg-hover)] text-xs font-black">
                  {index + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <h4 className="text-lg font-black uppercase italic leading-tight text-[var(--text-primary)]">
                      {content.title}
                    </h4>
                    {isDone && (
                      <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-green-500">
                        <CheckCircle2 className="h-3 w-3" /> Gravado
                      </span>
                    )}
                  </div>

                  <div className="mb-4 flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                    <span className="flex min-w-0 items-center gap-1">
                      <Shirt className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {resolveRecordingBlockLookLabel({
                          block,
                          content,
                          looks: state.looks,
                        })}
                      </span>
                    </span>
                    <span className="flex min-w-0 items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {resolveRecordingBlockScenarioLabel({
                          block,
                          content,
                          cenarios: state.cenarios,
                        })}
                      </span>
                    </span>
                  </div>

                  <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-hover)] p-4">
                    <p className="line-clamp-3 whitespace-pre-wrap text-sm font-medium italic leading-relaxed text-[var(--text-tertiary)]">
                      {getScriptLabel(content.script, 'Sem roteiro')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex shrink-0 justify-end border-t border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 md:p-8">
        <button
          type="button"
          onClick={onStart}
          disabled={readyContents.length === 0}
          className="flex w-full items-center justify-center gap-3 rounded-[2rem] bg-[var(--text-primary)] px-10 py-5 text-sm font-black uppercase tracking-[0.2em] text-[var(--bg-primary)] shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:opacity-30 md:w-auto"
        >
          {readyContents.length === 0 ? (
            'Tudo finalizado'
          ) : (
            <>
              <Play className="h-5 w-5 fill-current" />
              Iniciar Modo Explosão
            </>
          )}
        </button>
      </div>
    </div>
  );
}

type BurstModeSessionProps = {
  block: RecordingBlock;
  completedIds: Set<string>;
  setCompletedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  onExit: () => void;
};

function BurstModeSession({block, completedIds, setCompletedIds, onExit}: BurstModeSessionProps) {
  const {state, dispatch} = useAppContext();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [confirmBurst, setConfirmBurst] = useState<ConfirmState>(null);

  const readyContents = useMemo(
    () => getReadyContents(getBlockContents(block, state.contents)),
    [block, state.contents]
  );

  const currentContent = readyContents[currentIndex] ?? null;

  const saveSessionProgress = () => {
    const transition = buildSaveRecordingSessionTransition(block, state.contents, completedIds);

    transition.updatedContents.forEach(content => {
      dispatch({
        type: 'UPDATE_CONTENT',
        payload: content,
      });
    });

    dispatch({
      type: 'UPDATE_BLOCK_CONTENTS',
      payload: {
        blockId: block.id,
        contents: transition.updatedBlockContents,
      },
    });
  };

  const handleFinishBlock = () => {
    setConfirmBurst({
      message: 'Salvar progresso do bloco de gravação? Pausar agora não perde o que foi marcado nesta sessão.',
      onConfirm: () => {
        saveSessionProgress();
        onExit();
      },
    });
  };

  const toggleComplete = (id: string) => {
    setCompletedIds(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!currentContent) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Sessão de gravação do bloco ${block.name}`}
        className="fixed inset-0 z-[100] flex min-h-screen flex-col items-center justify-center bg-[var(--bg-primary)] p-6 text-center"
      >
        <CheckCircle2 className="mx-auto mb-8 h-24 w-24 animate-bounce text-[var(--accent-green)]" />
        <h1 className="mb-4 text-4xl font-black uppercase italic tracking-tight text-[var(--text-primary)] md:text-5xl">
          Parabéns!
        </h1>
        <p className="mb-4 text-lg font-bold text-[var(--text-tertiary)]">
          Você finalizou ou pausou a sessão deste bloco.
        </p>
        <p className="mb-12 max-w-xl text-sm font-medium text-[var(--text-secondary)]">
          Os itens marcados como gravados nesta sessão ainda precisam ser salvos para atualizar o bloco.
        </p>
        <button
          type="button"
          aria-label="Salvar e fechar sala"
          onClick={handleFinishBlock}
          className="rounded-2xl bg-[var(--text-primary)] px-12 py-5 text-sm font-black uppercase tracking-widest text-[var(--bg-primary)] shadow-2xl transition-all hover:scale-105"
        >
          Salvar e Fechar Sala
        </button>
        <ConfirmModal
          open={!!confirmBurst}
          message={confirmBurst?.message || ''}
          onConfirm={() => {
            confirmBurst?.onConfirm();
            setConfirmBurst(null);
          }}
          onCancel={() => setConfirmBurst(null)}
        />
      </div>
    );
  }

  const isCurrentCompleted = completedIds.has(currentContent.id);
  const pendingCount = completedIds.size;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Sessão de gravação do bloco ${block.name}`}
      className="fixed inset-0 z-[100] flex min-h-screen flex-col overflow-hidden bg-[var(--bg-primary)]"
    >
      <header className="relative flex shrink-0 items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 md:p-8">
        <div className="z-10 flex items-center gap-3">
          <button
            type="button"
            aria-label="Pausar rotina"
            onClick={handleFinishBlock}
            className="group flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-hover)] px-4 py-2.5 text-[9px] font-black uppercase tracking-widest text-[var(--text-primary)] transition-all hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
          >
            <Pause className="h-3.5 w-3.5 fill-current" />
            <span className="hidden sm:inline">Pausar Rotina</span>
            <span className="sm:hidden">Sair</span>
          </button>
        </div>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--text-primary)]">
              Modo Explosão
            </span>
          </div>
        </div>

        <div className="z-10 flex items-center gap-4">
          <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
            {currentIndex + 1} / {readyContents.length}
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <div className="custom-scrollbar relative flex-1 overflow-y-auto px-5 pb-36 pt-6 md:p-16 lg:px-24 lg:py-20">
          <div className="mx-auto mb-6 flex max-w-5xl flex-col items-center gap-3 text-center md:mb-10">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-500">
                {pendingCount} marcado{pendingCount === 1 ? '' : 's'} na sessão
              </span>
              <span className="rounded-full border border-[var(--border-color)] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
                Salve ao sair para confirmar o progresso
              </span>
            </div>

            <h1 className="max-w-5xl break-words text-2xl font-black uppercase italic leading-[1.1] tracking-tight text-[var(--text-primary)] md:text-5xl lg:text-6xl">
              {currentContent.title}
            </h1>
          </div>

          <div className="mx-auto max-w-4xl">
            <div className="relative rounded-2xl border border-transparent bg-[var(--bg-hover)]/30 p-4 text-left text-lg font-black leading-[1.6] text-[var(--text-primary)] shadow-sm md:rounded-none md:border-none md:bg-transparent md:p-0 md:text-4xl md:tracking-tight md:shadow-none lg:text-5xl">
              {getScriptLabel(currentContent.script, 'Sem roteiro. Grave no freestyle.')}
            </div>
          </div>
        </div>

        <aside className="z-20 flex w-full shrink-0 flex-col border-t border-[var(--border-color)] bg-[var(--bg-secondary)] md:w-80 md:border-l md:border-t-0">
          <BurstSidebar
            block={block}
            currentContent={currentContent}
            isCurrentCompleted={isCurrentCompleted}
            pendingCount={pendingCount}
            onToggleComplete={() => toggleComplete(currentContent.id)}
          />

          <BurstMobileControls
            block={block}
            currentContent={currentContent}
            isCurrentCompleted={isCurrentCompleted}
            pendingCount={pendingCount}
            onToggleComplete={() => toggleComplete(currentContent.id)}
          />

          <div className="sticky bottom-0 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-[0_-12px_30px_rgba(0,0,0,0.08)] md:static md:border-t-0 md:p-8 md:shadow-none">
            <button
              type="button"
              aria-label="Próximo vídeo"
              onClick={() => setCurrentIndex(previous => Math.min(previous + 1, readyContents.length))}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--text-primary)] px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--bg-primary)] shadow-xl transition-all hover:scale-[1.03] md:rounded-[2rem] md:py-5 md:text-xs"
            >
              Próximo Vídeo <SkipForward className="h-4 w-4 fill-current" />
            </button>
          </div>
        </aside>
      </main>

      <ConfirmModal
        open={!!confirmBurst}
        message={confirmBurst?.message || ''}
        onConfirm={() => {
          confirmBurst?.onConfirm();
          setConfirmBurst(null);
        }}
        onCancel={() => setConfirmBurst(null)}
      />
    </div>
  );
}

type BurstSidebarProps = {
  block: RecordingBlock;
  currentContent: Content;
  isCurrentCompleted: boolean;
  pendingCount: number;
  onToggleComplete: () => void;
};

function BurstSidebar({
  block,
  currentContent,
  isCurrentCompleted,
  pendingCount,
  onToggleComplete,
}: BurstSidebarProps) {
  const {state} = useAppContext();

  return (
    <div className="custom-scrollbar hidden flex-1 flex-col space-y-8 overflow-y-auto p-8 md:flex">
      <div className="space-y-3">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-50">
          Controle de Progresso
        </h3>
        <p className="text-xs font-medium leading-relaxed text-[var(--text-secondary)]">
          {pendingCount === 0
            ? 'Nenhum item marcado nesta sessão ainda.'
            : `${pendingCount} item(ns) marcado(s) nesta sessão. O progresso será salvo ao sair.`}
        </p>
      </div>

      <button
        type="button"
        aria-label="Marcar como gravado"
        onClick={onToggleComplete}
        className={cn(
          'group flex w-full flex-col gap-4 rounded-2xl border-2 p-6 text-left transition-all',
          isCurrentCompleted
            ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10 text-[var(--accent-green)] shadow-[0_0_20px_rgba(34,197,94,0.15)]'
            : 'border-[var(--border-strong)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:border-[var(--text-primary)]/40'
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-black uppercase tracking-widest">
            {isCurrentCompleted ? 'Marcado na sessão' : 'Marcar como gravado'}
          </span>
          <CheckCircle2
            className={cn(
              'h-6 w-6 transition-transform group-hover:scale-110',
              isCurrentCompleted ? 'fill-current' : 'opacity-40'
            )}
          />
        </div>
        <p className="text-xs font-medium leading-relaxed">
          {isCurrentCompleted
            ? 'Este vídeo está marcado nesta sessão e será salvo ao fechar a sala.'
            : 'Use este atalho para marcar o vídeo atual antes de avançar.'}
        </p>
      </button>

      <div className="h-px w-full bg-[var(--border-strong)] opacity-50" />

      <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-50">
        Neste Script
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
          <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
            <Shirt className="h-3 w-3" /> Look
          </span>
          <span className="max-w-[9rem] truncate text-right text-xs font-bold text-[var(--text-primary)]">
            {resolveRecordingBlockLookLabel({
              block,
              content: currentContent,
              looks: state.looks,
            })}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
          <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
            <MapPin className="h-3 w-3" /> Cenário
          </span>
          <span className="max-w-[9rem] truncate text-right text-xs font-bold text-[var(--text-primary)]">
            {resolveRecordingBlockScenarioLabel({
              block,
              content: currentContent,
              cenarios: state.cenarios,
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

type BurstMobileControlsProps = {
  block: RecordingBlock;
  currentContent: Content;
  isCurrentCompleted: boolean;
  pendingCount: number;
  onToggleComplete: () => void;
};

function BurstMobileControls({
  block,
  currentContent,
  isCurrentCompleted,
  pendingCount,
  onToggleComplete,
}: BurstMobileControlsProps) {
  const {state} = useAppContext();

  return (
    <div className="border-b border-[var(--border-color)] p-4 md:hidden">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-amber-500">
          {pendingCount} na sessão
        </span>
        <span className="text-[10px] font-medium text-[var(--text-secondary)]">
          Salve ao sair para persistir
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label="Marcar como gravado"
          onClick={onToggleComplete}
          className={cn(
            'flex min-w-0 items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all',
            isCurrentCompleted
              ? 'border-[var(--accent-green)] bg-[var(--accent-green)] text-white shadow-lg'
              : 'border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)]'
          )}
        >
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{isCurrentCompleted ? 'Marcado na sessão' : 'Marcar gravado'}</span>
        </button>

        <div className="flex min-w-0 max-w-full items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-3 py-2">
          <Shirt className="h-3 w-3 shrink-0 text-[var(--text-tertiary)]" />
          <span className="max-w-[7rem] truncate text-[9px] font-black uppercase text-[var(--text-primary)]">
            {resolveRecordingBlockLookLabel({
              block,
              content: currentContent,
              looks: state.looks,
            })}
          </span>
        </div>

        <div className="flex min-w-0 max-w-full items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-3 py-2">
          <MapPin className="h-3 w-3 shrink-0 text-[var(--text-tertiary)]" />
          <span className="max-w-[7rem] truncate text-[9px] font-black uppercase text-[var(--text-primary)]">
            {resolveRecordingBlockScenarioLabel({
              block,
              content: currentContent,
              cenarios: state.cenarios,
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
