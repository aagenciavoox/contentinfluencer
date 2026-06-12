import React, {useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {CheckCircle2, Layers, Pencil, Play, Tags, Trash2, Video, X} from 'lucide-react';
import {BottomSheetModal} from '../../../../components/feedback/modals/BottomSheetModal';
import {ConfirmModal} from '../../../../components/feedback/modals/ConfirmModal';
import {useAppContext} from '../../../../context/AppContext';
import {Content, RecordingBlock} from '../../../../lib/database';
import {cn, htmlToReadableText} from '../../../../lib/utils';
import {buildContentDetailRoute} from '../../../contents/lib/contentDetailRoute';
import {getRecordingQueueContents, RECORDING_READY_STATUS} from '../../../contents/lib/contentWorkflow';
import {
  getRecordingBlockProgress,
  isBlockContentComplete,
  normalizeRecordingTags,
  resolveRecordingContextSummary,
} from '../../lib/recordingWorkflow';
import {RecordingBlockEditor} from '../RecordingBlockEditor';

type ConfirmState = {message: string; onConfirm: () => void} | null;

function getBlockContents(block: RecordingBlock, contents: Content[]) {
  return block.contents
    .sort((left, right) => left.ordem - right.ordem)
    .map(({contentId}) => contents.find(content => content.id === contentId) ?? null)
    .filter((content): content is Content => content !== null);
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
  const queueContents = getRecordingQueueContents(state.contents, state.recordingBlocks);
  const availableTags = Array.from(
    new Set(queueContents.flatMap(content => normalizeRecordingTags(content.tags || [])))
  ).sort((left, right) => left.localeCompare(right, 'pt-BR'));

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
      message: 'Remover este bloco de gravacao?',
      onConfirm: () => dispatch({type: 'DELETE_RECORDING_BLOCK', payload: id}),
    });
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {state.recordingBlocks.length === 0 ? (
          <div className="col-span-full mt-8 flex flex-col items-center gap-6 rounded-[3rem] border-2 border-dashed border-[var(--border-color)] py-32 text-center opacity-30">
            <Video className="h-12 w-12" />
            <p className="text-sm font-semibold uppercase tracking-[0.3em]">Nenhum bloco montado</p>
            <span className="mt-2 text-center text-xs font-bold  opacity-70">
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
        desktopMaxW="max-w-5xl"
        zIndex="z-50"
      >
        {selectedBlock && (
          <BlockAnalysisModal
            block={selectedBlock}
            contents={getBlockContents(selectedBlock, state.contents)}
            queueContents={queueContents}
            availableTags={availableTags}
            onClose={() => setSelectedBlockId(null)}
            onOpenContent={contentId => navigate(buildContentDetailRoute(contentId, 'gravacao'))}
            onUpdateBlock={block => void dispatch({type: 'UPDATE_RECORDING_BLOCK', payload: block})}
            onUpdateContents={contents =>
              void dispatch({
                type: 'UPDATE_BLOCK_CONTENTS',
                payload: {blockId: selectedBlock.id, contents},
              })
            }
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
  const firstContent = contents[0] ?? null;
  const {completedCount, isCompleted, progressPercentage, totalCount} = getRecordingBlockProgress(
    block,
    contents
  );

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
        'group flex cursor-pointer flex-col justify-between rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-sm',
        isCompleted && 'opacity-70'
      )}
    >
      <div>
        <div className="mb-4 flex items-center justify-between">
          <span
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold ',
              isCompleted
                ? 'border-[var(--accent-green)]/20 bg-[var(--accent-green)]/10 text-[var(--accent-green)]'
                : 'border-[var(--accent-blue)]/20 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]'
            )}
          >
            {isCompleted ? 'Finalizado' : 'Aguardando camera'}
          </span>

          <button
            type="button"
            aria-label={`Remover bloco ${block.name}`}
            onClick={event => onDelete(block.id, event)}
            className="rounded-full p-2 text-[var(--accent-pink)] opacity-0 transition-opacity hover:!opacity-100 hover:bg-[var(--accent-pink)]/10 group-hover:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-[var(--text-primary)]">
            {block.name}
          </h3>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-hover)] px-2 py-1 text-xs font-semibold text-[var(--text-tertiary)] opacity-0 transition-opacity group-hover:opacity-100">
            <Pencil className="h-3 w-3" />
            Editar
          </span>
        </div>

        {firstContent ? (
          <p className="mb-6 line-clamp-1 text-xs font-bold text-[var(--text-tertiary)]">
            Ex: {firstContent.title}
          </p>
        ) : null}

        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold  text-[var(--text-secondary)]">
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
          <div className="flex items-center gap-2 text-xs font-semibold  text-[var(--text-tertiary)]">
            <Layers className="h-3 w-3" /> Videos
          </div>
          <p className="text-lg font-semibold text-[var(--text-primary)]">{contents.length}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold  text-[var(--text-tertiary)]">
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
  queueContents: Content[];
  availableTags: string[];
  onClose: () => void;
  onStart: () => void;
  onOpenContent: (contentId: string) => void;
  onUpdateBlock: (block: RecordingBlock) => void;
  onUpdateContents: (contents: RecordingBlock['contents']) => void;
};

function BlockAnalysisModal({
  block,
  contents,
  queueContents,
  availableTags,
  onClose,
  onStart,
  onOpenContent,
  onUpdateBlock,
  onUpdateContents,
}: BlockAnalysisModalProps) {
  const progress = getRecordingBlockProgress(block, contents);

  return (
    <div className="flex max-h-[90dvh] min-h-0 flex-col overflow-hidden bg-[var(--bg-primary)]">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 md:p-8">
        <div>
          <h2 className="text-xl font-semibold uppercase tracking-tight text-[var(--text-primary)] md:text-3xl">
            {block.name}
          </h2>
          <p className="mt-2 text-xs font-semibold text-[var(--text-tertiary)] opacity-60">
            Editar bloco · {progress.completedCount}/{progress.totalCount} gravados
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

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-6 md:p-10">
        <RecordingBlockEditor
          block={block}
          blockContents={contents}
          queueContents={queueContents}
          availableTags={availableTags}
          onUpdateBlock={onUpdateBlock}
          onUpdateContents={onUpdateContents}
        />

        {contents.length > 0 ? (
          <section className="mt-8 space-y-3 border-t border-[var(--border-color)] pt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              Previa dos roteiros
            </p>
            {contents.map((content, index) => {
              const blockContent = block.contents.find(item => item.contentId === content.id);
              const isDone = blockContent
                ? isBlockContentComplete(blockContent, content)
                : content.status !== RECORDING_READY_STATUS;

              return (
                <div
                  key={content.id}
                  className={cn('rounded-[var(--radius-card-mobile)] border p-4', isDone && 'opacity-60')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button type="button" onClick={() => onOpenContent(content.id)} className="text-left">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {index + 1}. {content.title}
                      </p>
                    </button>
                    {isDone ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-500">
                        <CheckCircle2 className="h-3 w-3" /> Gravado
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--text-secondary)]">
                    {getScriptLabel(content.script, 'Sem roteiro')}
                  </p>
                </div>
              );
            })}
          </section>
        ) : null}
      </div>

      <div className="flex shrink-0 justify-end border-t border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 md:p-8">
        <button
          type="button"
          onClick={onStart}
          disabled={progress.readyCount === 0}
          className="flex w-full items-center justify-center gap-3 rounded-[var(--radius-card-mobile)] bg-[var(--text-primary)] px-10 py-5 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--bg-primary)] shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:opacity-30 md:w-auto"
        >
          {progress.readyCount === 0 ? (
            'Tudo finalizado'
          ) : (
            <>
              <Play className="h-5 w-5 fill-current" />
              Iniciar modo gravacao
            </>
          )}
        </button>
      </div>
    </div>
  );
}
