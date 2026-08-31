import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clapperboard, Loader2, Video } from 'lucide-react';
import { BottomSheetModal } from '../../components/feedback/modals/BottomSheetModal';
import { OverlayBody } from '../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../components/overlays/OverlayHeader';
import { AppButton } from '../../components/ui/AppButton';
import { Text } from '../../components/ui/Text';
import type { Content, RecordingBlock } from '../../lib/database';
import { CONTENT_STATUS, canAdvanceToRecording } from '../../features/contents/lib/contentPipeline';
import { normalizeRecordingTags, addBlockContent, getOrderedBlockContents } from '../../features/recording/lib/recordingWorkflow';
import { getErrorMessage } from '../../lib/saveFeedback';
import { generateUUID } from '../../utils/uuid';

interface SendToRecordingSheetProps {
  open: boolean;
  onClose: () => void;
  content: Content;
  recordingBlocks: RecordingBlock[];
  blocksLoading?: boolean;
  onPersist: (updates?: Partial<Content>, options?: { advanceToReady?: boolean }) => Promise<void>;
  onDispatch: (action: { type: string; payload?: unknown }) => Promise<void>;
}

export function SendToRecordingSheet({
  open,
  onClose,
  content,
  recordingBlocks,
  blocksLoading = false,
  onPersist,
  onDispatch,
}: SendToRecordingSheetProps) {
  const navigate = useNavigate();
  const [blockName, setBlockName] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [attachedBlockId, setAttachedBlockId] = useState<string | null>(null);
  const [attachedBlockName, setAttachedBlockName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setAttachedBlockId(null);
      setAttachedBlockName('');
      setBlockName('');
      setSelectedBlockId('');
      setErrorMessage(null);
      setIsBusy(false);
    }
  }, [open]);

  const availableBlocks = useMemo(
    () => recordingBlocks.filter(block => !block.contents.some(item => item.contentId === content.id)),
    [content.id, recordingBlocks]
  );

  const canMoveToReady = content.title.trim().length > 0 && canAdvanceToRecording(content);
  const canSave = Boolean(selectedBlockId || blockName.trim());

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
    setAttachedBlockName(block.name);
  };

  const handleSave = async () => {
    if (isBusy || !canSave) return;
    setErrorMessage(null);
    setIsBusy(true);

    try {
      if (selectedBlockId) {
        const block = recordingBlocks.find(item => item.id === selectedBlockId);
        if (!block) {
          setErrorMessage('Esse bloco ainda não carregou. Espere um instante e tente de novo.');
          return;
        }
        await attachToBlock(block.id, block);
        return;
      }

      const name = blockName.trim();
      if (!name) return;

      const blockId = generateUUID();
      const block: RecordingBlock = {
        id: blockId,
        userId: content.userId,
        name,
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
    } catch (error) {
      setAttachedBlockId(null);
      setAttachedBlockName('');
      setErrorMessage(getErrorMessage(error));
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

  const handleClose = () => {
    if (isBusy) return;
    onClose();
  };

  return (
    <BottomSheetModal
      open={open}
      onClose={handleClose}
      zIndex="z-[120]"
      ariaLabel={attachedBlockId ? 'Roteiro guardado no bloco' : 'Escolha o bloco'}
    >
      <OverlayHeader>
        <p className="text-xs font-semibold  text-[var(--text-tertiary)]">
          Guardar em um bloco
        </p>
        <Text variant="itemTitle" className="mt-2">
          {attachedBlockId ? 'Roteiro guardado' : 'Escolha o bloco'}
        </Text>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {attachedBlockId
            ? `Este roteiro entrou no bloco “${attachedBlockName}”.`
            : 'Crie um bloco novo ou adicione este roteiro a um bloco existente.'}
        </p>
      </OverlayHeader>

      <OverlayBody className="stack-lg py-6">
          {attachedBlockId ? (
            <div className="stack-md">
              <div className="flex items-start gap-3 rounded-[var(--radius-card-mobile)] border border-emerald-500/20 bg-emerald-500/8 px-4 py-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    Guardado em {attachedBlockName}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Já está na fila do bloco. Pode gravar agora ou revisar a ordem depois.
                  </p>
                </div>
              </div>
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
                  onChange={event => {
                    setBlockName(event.target.value);
                    if (event.target.value.trim()) setSelectedBlockId('');
                  }}
                  placeholder="Nome do bloco"
                  disabled={isBusy}
                  className="mt-3 min-h-11 w-full rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 text-sm font-semibold text-[var(--text-primary)] outline-none"
                />
              </article>

              <article className="rounded-[1.4rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4">
                <p className="text-xs font-semibold  text-[var(--text-tertiary)]">
                  Bloco existente
                </p>
                <select
                  value={selectedBlockId}
                  onChange={event => {
                    setSelectedBlockId(event.target.value);
                    if (event.target.value) setBlockName('');
                  }}
                  disabled={isBusy || (blocksLoading && availableBlocks.length === 0)}
                  className="mt-3 min-h-11 w-full rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 text-sm font-semibold text-[var(--text-primary)] outline-none"
                >
                  <option value="">
                    {blocksLoading && availableBlocks.length === 0 ? 'Carregando blocos...' : 'Selecione um bloco'}
                  </option>
                  {availableBlocks.map(block => (
                    <option key={block.id} value={block.id}>
                      {block.name}
                    </option>
                  ))}
                </select>
                {blocksLoading && availableBlocks.length === 0 ? (
                  <p className="mt-3 text-xs font-semibold text-[var(--text-secondary)]">
                    Buscando blocos salvos...
                  </p>
                ) : availableBlocks.length === 0 ? (
                  <p className="mt-3 text-xs font-semibold text-[var(--text-secondary)]">
                    Nenhum bloco disponivel sem este conteudo.
                  </p>
                ) : null}
              </article>

              {errorMessage ? (
                <p className="text-sm font-semibold text-[var(--danger)]">{errorMessage}</p>
              ) : null}
            </>
          )}
      </OverlayBody>

      <OverlayFooter className="pb-safe">
        {attachedBlockId ? (
          <AppButton variant="secondary" className="min-h-11 w-full justify-center" onClick={handleClose}>
            Fechar
          </AppButton>
        ) : (
          <>
            <AppButton
              variant="secondary"
              className="min-h-11 flex-1 justify-center"
              onClick={handleClose}
              disabled={isBusy}
            >
              Cancelar
            </AppButton>
            <AppButton
              variant="primary"
              className="min-h-11 flex-1 justify-center"
              leftIcon={isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
              disabled={isBusy || !canSave}
              onClick={() => void handleSave()}
            >
              {isBusy ? 'Guardando...' : selectedBlockId ? 'Guardar no bloco' : 'Criar e guardar'}
            </AppButton>
          </>
        )}
      </OverlayFooter>
    </BottomSheetModal>
  );
}
