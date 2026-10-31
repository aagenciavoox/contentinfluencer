import React, {useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Layers, Pencil, Play, Tags, Trash2, Video} from 'lucide-react';
import {dia} from '../../../../lib/dates';
import {AppButton} from '../../../../components/ui/AppButton';
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

  // Blocos com roteiro primeiro, mais novos antes; os vazios ficam num grupo à parte.
  const {filled, empty} = useMemo(() => {
    const withContents = state.recordingBlocks.map(block => ({
      block,
      contents: getBlockContents(block, state.contents),
    }));
    const byNewest = (left: {block: RecordingBlock}, right: {block: RecordingBlock}) =>
      right.block.createdAt.localeCompare(left.block.createdAt);
    return {
      filled: withContents.filter(item => item.contents.length > 0).sort(byNewest),
      empty: withContents.filter(item => item.contents.length === 0).sort(byNewest),
    };
  }, [state.contents, state.recordingBlocks]);

  const handleDeleteEmpty = () => {
    setConfirm({
      message: empty.length === 1
        ? 'Excluir o bloco vazio? Ele não tem roteiros.'
        : `Excluir os ${empty.length} blocos vazios? Nenhum deles tem roteiros.`,
      confirmLabel: empty.length === 1 ? 'Excluir bloco' : 'Excluir blocos',
      cancelLabel: 'Manter',
      onConfirm: () => empty.forEach(item => dispatch({type: 'DELETE_RECORDING_BLOCK', payload: item.block.id})),
    });
  };

  const handleDeleteBlock = (id: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setConfirm({
      ...CONFIRM.excluirBloco,
      onConfirm: () => dispatch({type: 'DELETE_RECORDING_BLOCK', payload: id}),
    });
  };

  return (
    <div className="stack-2xl">
      <div className="grid-content">
        {filled.length === 0 && empty.length === 0 ? (
          <div className="col-span-full mt-8 flex flex-col items-center gap-6 rounded-[var(--radius-card)] border-2 border-dashed border-[var(--border-color)] py-32 text-center opacity-30">
            <Video className="h-12 w-12" />
            <Text variant="eyebrow" as="p">{EMPTY.blocos.title}</Text>
            <Text variant="meta" as="span" className="mt-2 text-center opacity-70">
              {EMPTY.blocos.description}
            </Text>
          </div>
        ) : (
          filled.map(({block, contents}) => (
            <RecordingBlockCard
              key={block.id}
              block={block}
              contents={contents}
              onOpen={() => navigate(`/gravacao/${block.id}`)}
              onRecord={() => navigate(`/gravacao/${block.id}?burst=1`)}
              onDelete={handleDeleteBlock}
            />
          ))
        )}
      </div>

      {empty.length > 0 ? (
        <section className="stack-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Text variant="sectionTitle">Vazios</Text>
              <Text variant="meta" as="p">Blocos sem roteiro. Abra para adicionar ou exclua.</Text>
            </div>
            <AppButton variant="ghost" size="sm" leftIcon={<Trash2 className="h-4 w-4" />} onClick={handleDeleteEmpty}>
              {empty.length === 1 ? 'Excluir o vazio' : `Excluir os ${empty.length} vazios`}
            </AppButton>
          </div>
          <div className="grid-content">
            {empty.map(({block, contents}) => (
              <RecordingBlockCard
                key={block.id}
                block={block}
                contents={contents}
                onOpen={() => navigate(`/gravacao/${block.id}`)}
                onDelete={handleDeleteBlock}
              />
            ))}
          </div>
        </section>
      ) : null}

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
  onRecord?: () => void;
  onDelete: (id: string, event: React.MouseEvent<HTMLButtonElement>) => void;
};

function formatBlockDate(value: string): string | null {
  if (!value || Number.isNaN(new Date(value).getTime())) return null;
  return dia(value);
}

function RecordingBlockCard({block, contents, onOpen, onRecord, onDelete}: RecordingBlockCardProps) {
  const firstContent = contents[0] ?? null;
  const {completedCount, isCompleted, progressPercentage, totalCount} = getRecordingBlockProgress(
    block,
    contents
  );
  const isEmpty = totalCount === 0;
  const createdLabel = formatBlockDate(block.createdAt);

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
        'ds-card ds-card-interactive group flex cursor-pointer flex-col justify-between p-6',
        isCompleted && !isEmpty && 'opacity-70'
      )}
    >
      <div>
        <div className="mb-4 flex items-center justify-between">
          <Text variant="label" as="span"
            className={cn(
              'rounded-full border px-3 py-1 ',
              isEmpty
                ? 'border-[var(--border-color)] bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                : isCompleted
                ? 'border-[var(--accent-green)]/20 bg-[var(--accent-green)]/10 text-[var(--accent-green)]'
                : 'border-[var(--accent-blue)]/20 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]'
            )}
          >
            {isEmpty ? 'Vazio' : isCompleted ? 'Gravado' : 'Para gravar'}
          </Text>

          <button
            type="button"
            aria-label={`Excluir bloco ${block.name}`}
            onClick={event => onDelete(block.id, event)}
            className="card-actions rounded-full p-2 text-[var(--accent-pink)] hover:bg-[var(--accent-pink)]/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-2 flex items-start justify-between gap-2">
          <Text variant="itemTitle" className="line-clamp-2 leading-snug">
            {block.name}
          </Text>
          <Text variant="label" as="span" className="card-actions inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-hover)] px-2 py-1 text-[var(--text-tertiary)]">
            <Pencil className="h-3 w-3" />
            Editar
          </Text>
        </div>

        {createdLabel ? (
          <Text variant="meta" as="p" className="mb-2">Criado em {createdLabel}</Text>
        ) : null}

        {firstContent ? (
          <Text variant="secondary" className="mb-6 line-clamp-2">
            {/* "Ex.:" é o prefixo de placeholder da casa; num título real parecia campo vazio. */}
            Começa com: {firstContent.title}
          </Text>
        ) : null}

        <div className="mt-2 stack-sm">
          <div className="flex items-center justify-between t-label text-[var(--text-secondary)]">
            <span>Progresso</span>
            <span>
              {completedCount} de {totalCount} gravados ({progressPercentage}%)
            </span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)]">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                isCompleted && !isEmpty ? 'bg-[var(--accent-green)]' : 'bg-[var(--text-primary)]'
              )}
              style={{width: `${progressPercentage}%`}}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="stack-sm">
          <div className="flex items-center gap-2 t-label text-[var(--text-tertiary)]">
            <Layers className="h-3 w-3" /> Roteiros
          </div>
          <Text variant="sectionTitle" as="p" className="text-[var(--text-primary)]">{contents.length}</Text>
        </div>

        <div className="stack-sm">
          <div className="flex items-center gap-2 t-label text-[var(--text-tertiary)]">
            <Tags className="h-3 w-3" /> Marcadores
          </div>
          <Text variant="label" as="p" className="truncate text-[var(--text-primary)]">
            {resolveRecordingContextSummary({block, content: firstContent})}
          </Text>
        </div>
      </div>

      {onRecord && !isEmpty && !isCompleted ? (
        <AppButton
          variant="secondary"
          fullWidth
          className="mt-5"
          leftIcon={<Play className="h-4 w-4" />}
          onClick={event => {
            event.stopPropagation();
            onRecord();
          }}
        >
          Gravar
        </AppButton>
      ) : null}
    </div>
  );
}

