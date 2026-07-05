import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Layers, Pencil, Tags, Trash2, Video} from 'lucide-react';
import {ConfirmModal} from '../../../../components/feedback/modals/ConfirmModal';
import {CONFIRM, EMPTY, type ConfirmState} from '../../../../lib/uiCopy';
import {Text} from '../../../../components/ui/Text';
import {useAppContext} from '../../../../context/AppContext';
import {Content, RecordingBlock} from '../../../../lib/database';
import {cn} from '../../../../lib/utils';
import {RECORDING_READY_STATUS} from '../../../contents/lib/contentWorkflow';
import {
  getRecordingBlockProgress,
  resolveRecordingContextSummary,
} from '../../lib/recordingWorkflow';

type ConfirmStateLocal = ConfirmState | null;

function getBlockContents(block: RecordingBlock, contents: Content[]) {
  return block.contents
    .sort((left, right) => left.ordem - right.ordem)
    .map(({contentId}) => contents.find(content => content.id === contentId) ?? null)
    .filter((content): content is Content => content !== null);
}

export function RecordingQueueTab() {
  const {state, dispatch} = useAppContext();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState<ConfirmStateLocal>(null);

  const handleDeleteBlock = (id: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setConfirm({
      ...CONFIRM.excluirBloco,
      onConfirm: () => dispatch({type: 'DELETE_RECORDING_BLOCK', payload: id}),
    });
  };

  return (
    <div className="stack-2xl">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {state.recordingBlocks.length === 0 ? (
          <div className="col-span-full mt-8 flex flex-col items-center gap-6 rounded-[3rem] border-2 border-dashed border-[var(--border-color)] py-32 text-center opacity-30">
            <Video className="h-12 w-12" />
            <p className="text-sm font-semibold uppercase tracking-[0.3em]">{EMPTY.blocos.title}</p>
            <span className="mt-2 text-center text-xs font-bold  opacity-70">
              {EMPTY.blocos.description}
            </span>
          </div>
        ) : (
          state.recordingBlocks.map(block => (
            <RecordingBlockCard
              key={block.id}
              block={block}
              contents={getBlockContents(block, state.contents)}
              onOpen={() => navigate(`/gravacao/${block.id}`)}
              onDelete={handleDeleteBlock}
            />
          ))
        )}
      </div>

      <ConfirmModal
        open={!!confirm}
        message={confirm?.message || ''}
        confirmLabel={confirm?.confirmLabel}
        cancelLabel={confirm?.cancelLabel}
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
        'group flex cursor-pointer flex-col justify-between rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-6 transition-all hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-sm',
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
          <Text variant="itemTitle" className="line-clamp-2 leading-snug">
            {block.name}
          </Text>
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

        <div className="mt-2 stack-sm">
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
        <div className="stack-sm">
          <div className="flex items-center gap-2 text-xs font-semibold  text-[var(--text-tertiary)]">
            <Layers className="h-3 w-3" /> Videos
          </div>
          <p className="text-lg font-semibold text-[var(--text-primary)]">{contents.length}</p>
        </div>

        <div className="stack-sm">
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

