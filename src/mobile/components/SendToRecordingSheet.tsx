import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clapperboard, Mic2, Plus, Video } from 'lucide-react';
import { BottomSheetModal } from '../../components/feedback/modals/BottomSheetModal';
import { AppButton } from '../../components/ui/AppButton';
import type { Content, RecordingBlock, RecordingBlockContent } from '../../lib/database';
import { CONTENT_STATUS, canAdvanceToRecording } from '../../features/contents/lib/contentPipeline';
import { normalizeRecordingTags } from '../../features/recording/lib/recordingWorkflow';
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
  const [createdBlockId, setCreatedBlockId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setCreatedBlockId(null);
      setBlockName('');
      setSelectedBlockId('');
    }
  }, [open]);

  const availableBlocks = useMemo(
    () => recordingBlocks.filter(block => !block.contents.some(item => item.contentId === content.id)),
    [content.id, recordingBlocks]
  );

  const canMoveToReady = content.title.trim().length > 0 && canAdvanceToRecording(content);
  const successBlockId = createdBlockId ?? (selectedBlockId || null);

  const attachToBlock = async (blockId: string, block: RecordingBlock, isNew: boolean) => {
    const ordered = [...block.contents].sort((left, right) => left.ordem - right.ordem);
    const nextContents: RecordingBlockContent[] = isNew
      ? [{ blockId, contentId: content.id, ordem: 0, gravado: content.status === CONTENT_STATUS.GRAVADO }]
      : [
          ...ordered,
          {
            blockId: block.id,
            contentId: content.id,
            ordem: ordered.length,
            gravado: content.status === CONTENT_STATUS.GRAVADO,
          },
        ];

    await onDispatch({
      type: 'UPDATE_BLOCK_CONTENTS',
      payload: { blockId: block.id, contents: nextContents },
    });

    if (content.status === CONTENT_STATUS.ROTEIRO && canMoveToReady) {
      await onPersist({}, { advanceToReady: true });
    }

    setCreatedBlockId(blockId);
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
      await attachToBlock(blockId, block, true);
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
      await attachToBlock(block.id, block, false);
    } finally {
      setIsBusy(false);
    }
  };

  const openTeleprompter = () => {
    if (!successBlockId) return;
    onClose();
    navigate(`/gravacao/${successBlockId}?burst=1`);
  };

  const openBlockPage = () => {
    if (!successBlockId) return;
    onClose();
    navigate(`/gravacao/${successBlockId}`);
  };

  return (
    <BottomSheetModal open={open} onClose={onClose} zIndex="z-[120]">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-recording-title"
        className="flex max-h-[85vh] flex-col overflow-hidden bg-[var(--bg-primary)]"
      >
        <div className="border-b border-[var(--border-color)] px-5 py-4">
          <p className="text-xs font-semibold  text-[var(--text-tertiary)]">
            Enviar para gravacao
          </p>
          <h3 id="send-recording-title" className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
            {successBlockId ? 'Pronto para gravar' : 'Escolha o bloco'}
          </h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {successBlockId
              ? 'Conteudo guardado para gravacao. Abra o teleprompter ou revise o bloco quando quiser.'
              : 'Crie um bloco novo ou adicione este roteiro a um bloco existente.'}
          </p>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-5">
          {successBlockId ? (
            <div className="space-y-3">
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
        </div>

        <div className="border-t border-[var(--border-color)] px-5 py-4 pb-safe">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 w-full rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]"
          >
            {successBlockId ? 'Fechar' : 'Cancelar'}
          </button>
        </div>
      </section>
    </BottomSheetModal>
  );
}
