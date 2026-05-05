import React, {useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {CheckCircle2, Layers, Play, Tags, Trash2, Video, X} from 'lucide-react';
import {BottomSheetModal} from '../../../../components/feedback/modals/BottomSheetModal';
import {ConfirmModal} from '../../../../components/feedback/modals/ConfirmModal';
import {useAppContext} from '../../../../context/AppContext';
import {Content, RecordingBlock} from '../../../../lib/database';
import {cn, htmlToReadableText} from '../../../../lib/utils';
import {buildContentDetailRoute} from '../../../contents/lib/contentDetailRoute';
import {RECORDING_READY_STATUS} from '../../../contents/lib/contentWorkflow';
import {isRecordingBlockTeleprompterEnabled, resolveRecordingContextSummary} from '../../lib/recordingWorkflow';

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
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const selectedBlock = useMemo(
    () => state.recordingBlocks.find(block => block.id === selectedBlockId) ?? null,
    [selectedBlockId, state.recordingBlocks]
  );

  useEffect(() => {
    if (selectedBlockId && !selectedBlock) {
      setSelectedBlockId(null);
    }
  }, [selectedBlock, selectedBlockId]);

  const handleDeleteBlock = (id: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setConfirm({
      message: 'Tem certeza que deseja deletar este bloco de gravacao?',
      onConfirm: () => dispatch({type: 'DELETE_RECORDING_BLOCK', payload: id}),
    });
  };

  return (
    <div className="space-y-8">
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
              onOpen={() => setSelectedBlockId(block.id)}
              onDelete={handleDeleteBlock}
            />
          ))
        )}
      </div>

      <BottomSheetModal
        open={!!selectedBlock}
        onClose={() => setSelectedBlockId(null)}
        desktopMaxW="max-w-4xl"
        zIndex="z-50"
      >
        {selectedBlock && (
          <BlockAnalysisModal
            block={selectedBlock}
            contents={getBlockContents(selectedBlock, state.contents)}
            onClose={() => setSelectedBlockId(null)}
                    onOpenContent={contentId => navigate(buildContentDetailRoute(contentId, 'gravacao'))}
            onStart={() => {
              setSelectedBlockId(null);
              navigate(`/gravacao/${selectedBlock.id}`);
            }}
          />
        )}
      </BottomSheetModal>

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
                ? 'border-[var(--accent-green)]/20 bg-[var(--accent-green)]/10 text-[var(--accent-green)]'
                : 'border-[var(--accent-blue)]/20 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]'
            )}
          >
            {isCompleted ? 'Finalizado' : 'Aguardando camera'}
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

        {firstContent ? (
          <p className="mb-6 line-clamp-1 text-xs font-bold text-[var(--text-tertiary)]">
            Ex: {firstContent.title}
          </p>
        ) : null}

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
                isCompleted ? 'bg-[var(--accent-green)]' : 'bg-[var(--text-primary)]'
              )}
              style={{width: `${progressPercentage}%`}}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 border-t border-[var(--border-color)] pt-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
            <Layers className="h-3 w-3" /> Videos
          </div>
          <p className="text-lg font-black text-[var(--text-primary)]">{contents.length}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
            <Tags className="h-3 w-3" /> Marcadores
          </div>
          <p className="truncate text-xs font-bold text-[var(--text-primary)]">
            {resolveRecordingContextSummary({block, content: firstContent})}
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
  onOpenContent: (contentId: string) => void;
};

function BlockAnalysisModal({
  block,
  contents,
  onClose,
  onStart,
  onOpenContent,
}: BlockAnalysisModalProps) {
  const {dispatch} = useAppContext();
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
                  A execucao agora sempre segue para a pagina do bloco, com persistencia imediata do progresso.
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
                Nenhum conteudo neste bloco
              </p>
              <p className="text-sm font-medium text-[var(--text-tertiary)]">
                Este bloco ainda nao possui roteiros disponiveis para analise.
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
                    <button
                      type="button"
                      onClick={() => onOpenContent(content.id)}
                      className="text-left"
                    >
                      <h4 className="text-lg font-black uppercase italic leading-tight text-[var(--text-primary)]">
                        {content.title}
                      </h4>
                    </button>
                    {isDone ? (
                      <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-green-500">
                        <CheckCircle2 className="h-3 w-3" /> Gravado
                      </span>
                    ) : null}
                  </div>

                  <div className="mb-4 flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                    <span className="flex min-w-0 items-center gap-1">
                      <Tags className="h-3 w-3 shrink-0" />
                      <span className="truncate">{resolveRecordingContextSummary({block, content})}</span>
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
              Iniciar execucao
            </>
          )}
        </button>
      </div>
    </div>
  );
}
