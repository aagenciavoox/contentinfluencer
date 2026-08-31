import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clapperboard, Mic2, Plus, Video } from 'lucide-react';
import { BottomSheetModal } from '../../components/feedback/modals/BottomSheetModal';
import { OverlayBody } from '../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../components/overlays/OverlayHeader';
import { AppButton } from '../../components/ui/AppButton';
import { Text } from '../../components/ui/Text';
import type { Content, RecordingBlock } from '../../lib/database';
import { CONTENT_STATUS, canAdvanceToRecording } from '../../features/contents/lib/contentPipeline';
import { normalizeRecordingTags, addBlockContent, getOrderedBlockContents } from '../../features/recording/lib/recordingWorkflow';
import { generateUUID } from '../../utils/uuid';

interface SendToRecordingSheetProps {
  open: boolean;
  onClose: () => void;
  content: Content;
  recordingBlocks: RecordingBlock[];
  onPersist: (updates?: Partial<Content>, options?: { advanceToReady?: boolean }) => Promise<void>;
  onDispatch: (action: { type: string; payload?: unknown }) => Promise<void>;
}

export function SendToRecordingSheet({
  open,
  onClose,
  content,
  recordingBlocks,
  onPersist,
  onDispatch,
}: SendToRecordingSheetProps) {
  const navigate = useNavigate();
  const [blockName, setBlockName] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [attachedBlockId, setAttachedBlockId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setAttachedBlockId(null);
      setBlockName('');
      setSelectedBlockId('');
    }
  }, [open]);

  const availableBlocks = useMemo(
    () => recordingBlocks.filter(block => !block.contents.some(item => item.contentId === content.id)),
    [content.id, recordingBlocks]
  );

  const canMoveToReady = content.title.trim().length > 0 && canAdvanceToRecording(content);

  const attachToBlock = async (blockId: string, block: RecordingBlock) => {
    const nextContents = addBlockContent(getOrderedBlockContents(block), block.id, content);

    await onDispatch({
      type: 'UPDATE_BLOCK_CONTENTS',
      payload: { blockId: block.id, contents: nextContents },
    });

    if (content.status === CONTENT_STATUS.ROTEIRO && canMoveToReady) {
      await onPersist({}, { advanceToReady: true });
    }

    setAttachedBlockId(blockId);
  };

  const createBlock = async () => {
    if (!blockName.trim()) return;

    setIsBusy(true);
    try {
      const blockId = generateUUID();
      const block: RecordingBlock = {
        id: blockId,
        userId: content.userId,
        name: blockName.trim(),
        lookLabel: null,
        cenarioLabel: null,
        metadata: {
          recordingTags: normalizeRecordingTags(content.tags || []),
          sourceContentIds: [content.id],
        },
        createdAt: new Date().toISOString(),
        contents: [],
      };

      await onDispatch({ type: 'ADD_RECORDING_BLOCK', payload: block });
      await attachToBlock(blockId, block);
      setBlockName('');
    } finally {
      setIsBusy(false);
    }
  };

  const addToExisting = async () => {
    if (!selectedBlockId) return;
    const block = recordingBlocks.find(item => item.id === selectedBlockId);
    if (!block) return;

    setIsBusy(true);
    try {
      await attachToBlock(block.id, block);
    } finally {
      setIsBusy(false);
    }
  };

  const openTeleprompter = () => {
    if (!attachedBlockId) return;
    onClose();
    navigate(`/gravacao/${attachedBlockId}?burst=1`);
  };

  const openBlockPage = () => {
    if (!attachedBlockId) return;
    onClose();
    navigate(`/gravacao/${attachedBlockId}`);
  };

  return (
    <BottomSheetModal
      open={open}
      onClose={onClose}
      zIndex="z-[120]"
      ariaLabel={attachedBlockId ? 'Pronto para gravar' : 'Escolha o bloco'}
    >
      <OverlayHeader>
        <p className="text-xs font-semibold  text-[var(--text-tertiary)]">
          Guardar em um bloco
        </p>
        <Text variant="itemTitle" className="mt-2">
          {attachedBlockId ? 'Pronto para gravar' : 'Escolha o bloco'}
        </Text>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {attachedBlockId
            ? 'Conteudo guardado para gravacao. Abra o teleprompter ou revise o bloco quando quiser.'
            : 'Crie um bloco novo ou adicione este roteiro a um bloco existente.'}
        </p>
      </OverlayHeader>

      <OverlayBody className="stack-lg py-6">
          {attachedBlockId ? (
            <div className="stack-md">
              <AppButton
                variant="primary"
                leftIcon={<Video className="h-4 w-4" />}
                className="min-h-11 w-full justify-center"
                onClick={openTeleprompter}
              >
                Abrir modo gravacao
              </AppButton>
              <AppButton
                variant="secondary"
                leftIcon={<Clapperboard className="h-4 w-4" />}
                className="min-h-11 w-full justify-center"
                onClick={openBlockPage}
              >
                Ver bloco de gravacao
              </AppButton>
            </div>
          ) : (
            <>
              <article className="rounded-[1.4rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4">
                <p className="text-xs font-semibold  text-[var(--text-tertiary)]">
                  Criar bloco novo
                </p>
                <input
                  value={blockName}
                  onChange={event => setBlockName(event.target.value)}
                  placeholder="Nome do bloco"
                  className="mt-3 min-h-11 w-full rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 text-sm font-semibold text-[var(--text-primary)] outline-none"
                />
                <AppButton
                  variant="primary"
                  leftIcon={<Plus className="h-4 w-4" />}
                  disabled={isBusy || !blockName.trim()}
                  className="mt-3 min-h-11 w-full justify-center"
                  onClick={() => void createBlock()}
                >
                  {isBusy ? 'Criando...' : 'Criar bloco e adicionar'}
                </AppButton>
              </article>

              <article className="rounded-[1.4rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4">
                <p className="text-xs font-semibold  text-[var(--text-tertiary)]">
                  Bloco existente
                </p>
                <select
                  value={selectedBlockId}
                  onChange={event => setSelectedBlockId(event.target.value)}
                  className="mt-3 min-h-11 w-full rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 text-sm font-semibold text-[var(--text-primary)] outline-none"
                >
                  <option value="">Selecione um bloco</option>
                  {availableBlocks.map(block => (
                    <option key={block.id} value={block.id}>
                      {block.name}
                    </option>
                  ))}
                </select>
                <AppButton
                  variant="secondary"
                  leftIcon={<Mic2 className="h-4 w-4" />}
                  disabled={isBusy || !selectedBlockId}
                  className="mt-3 min-h-11 w-full justify-center"
                  onClick={() => void addToExisting()}
                >
                  {isBusy ? 'Adicionando...' : 'Adicionar ao bloco'}
                </AppButton>
                {availableBlocks.length === 0 ? (
                  <p className="mt-3 text-xs font-semibold text-[var(--text-secondary)]">
                    Nenhum bloco disponivel sem este conteudo.
                  </p>
                ) : null}
              </article>
            </>
          )}
      </OverlayBody>

      <OverlayFooter className="pb-safe">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 w-full rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] text-sm font-semibold t-label-uppercase text-[var(--text-secondary)]"
        >
          {attachedBlockId ? 'Fechar' : 'Cancelar'}
        </button>
      </OverlayFooter>
    </BottomSheetModal>
  );
}
