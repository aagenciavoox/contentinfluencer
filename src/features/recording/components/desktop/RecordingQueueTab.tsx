import {useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Trash2, Video} from 'lucide-react';
import {AppButton} from '../../../../components/ui/AppButton';
import {EmptyState} from '../../../../components/ui/EmptyState';
import {ConfirmModal} from '../../../../components/feedback/modals/ConfirmModal';
import {CONFIRM, EMPTY, type ConfirmState} from '../../../../lib/uiCopy';
import {Text} from '../../../../components/ui/Text';
import {useAppContext} from '../../../../context/AppContext';
import {Content, RecordingBlock} from '../../../../lib/database';
import {RecordingBlockCard} from './RecordingBlockCard';

type ConfirmStateLocal = ConfirmState | null;

function getBlockContents(block: RecordingBlock, contents: Content[]) {
  return [...block.contents]
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

  const handleDeleteBlock = (id: string) => {
    setConfirm({
      ...CONFIRM.excluirBloco,
      onConfirm: () => dispatch({type: 'DELETE_RECORDING_BLOCK', payload: id}),
    });
  };

  return (
    <div className="stack-2xl">
      <div className="grid-content recording-blocks-grid">
        {filled.length === 0 && empty.length === 0 ? (
          <EmptyState
            className="col-span-full"
            icon={<Video className="h-12 w-12" />}
            title={EMPTY.blocos.title}
            description={EMPTY.blocos.description}
          />
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
          <div className="grid-content recording-blocks-grid">
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

