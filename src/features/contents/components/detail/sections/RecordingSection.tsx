import {CheckCircle2, Clapperboard, Plus, Video} from 'lucide-react';
import {useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {AppButton} from '../../../../../components/ui/AppButton';
import {useIsMobile} from '../../../../../hooks/useIsMobile';
import type {Content, RecordingBlock, RecordingBlockContent} from '../../../../../lib/database';
import {cn} from '../../../../../lib/utils';
import {
  CONTENT_STATUS,
  canAdvanceToRecording,
  getContentBlockSummary,
  type ContentStage,
} from '../../../lib/contentPipeline';
import {buildMarkContentRecordedTransition, normalizeRecordingTags} from '../../../../recording/lib/recordingWorkflow';

interface RecordingSectionProps {
  content: Content;
  stage: ContentStage;
  recordingBlocks: RecordingBlock[];
  onPersist: (updates?: Partial<Content>, options?: {advanceToReady?: boolean}) => Promise<void>;
  onDispatch: (action: any) => Promise<void>;
}

export function RecordingSection({
  content,
  stage,
  recordingBlocks,
  onPersist,
  onDispatch,
}: RecordingSectionProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [blockName, setBlockName] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const blockSummary = getContentBlockSummary(content.id, recordingBlocks);
  const availableBlocks = useMemo(
    () => recordingBlocks.filter(block => !block.contents.some(item => item.contentId === content.id)),
    [content.id, recordingBlocks]
  );
  const readinessItems = [
    {
      id: 'title',
      label: 'Titulo definido',
      done: content.title.trim().length > 0,
    },
    {
      id: 'script',
      label: 'Roteiro preenchido',
      done: canAdvanceToRecording(content),
    },
  ];
  const canMoveToReady = readinessItems.every(item => item.done);

  const createBlockForCurrentContent = async () => {
    if (!blockName.trim()) return;

    setIsBusy(true);
    setFeedback(null);

    try {
      const blockId = crypto.randomUUID();
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

      const blockContents: RecordingBlockContent[] = [
        {
          blockId,
          contentId: content.id,
          ordem: 0,
          gravado: content.status === CONTENT_STATUS.GRAVADO,
        },
      ];

      await onDispatch({type: 'ADD_RECORDING_BLOCK', payload: block});
      await onDispatch({type: 'UPDATE_BLOCK_CONTENTS', payload: {blockId, contents: blockContents}});

      if (content.status === CONTENT_STATUS.ROTEIRO && canMoveToReady) {
        await onPersist({}, {advanceToReady: true});
      }

      setBlockName('');
      setFeedback(`Bloco criado: ${block.name}. Este conteudo entrou na ordem 1.`);
      if (isMobile) {
        navigate(`/gravacao/${blockId}`);
      }
    } finally {
      setIsBusy(false);
    }
  };

  const addToExistingBlock = async () => {
    if (!selectedBlockId) return;

    const block = recordingBlocks.find(item => item.id === selectedBlockId);
    if (!block) return;

    setIsBusy(true);
    setFeedback(null);

    try {
      const ordered = [...block.contents].sort((left, right) => left.ordem - right.ordem);
      const nextOrder = ordered.length;
      const nextContents: RecordingBlockContent[] = [
        ...ordered,
        {
          blockId: block.id,
          contentId: content.id,
          ordem: nextOrder,
          gravado: content.status === CONTENT_STATUS.GRAVADO,
        },
      ];

      await onDispatch({
        type: 'UPDATE_BLOCK_CONTENTS',
        payload: {blockId: block.id, contents: nextContents},
      });

      if (content.status === CONTENT_STATUS.ROTEIRO && canMoveToReady) {
        await onPersist({}, {advanceToReady: true});
      }

      setSelectedBlockId('');
      setFeedback(`Conteudo adicionado ao bloco ${block.name} na ordem ${nextOrder + 1}.`);
      if (isMobile) {
        navigate(`/gravacao/${block.id}`);
      }
    } finally {
      setIsBusy(false);
    }
  };

  const markRecorded = async () => {
    if (!blockSummary?.block) return;

    const transition = buildMarkContentRecordedTransition({
      block: blockSummary.block,
      contentId: content.id,
      contents: [content],
    });
    if (!transition) return;

    setIsBusy(true);
    setFeedback(null);

    try {
      await onPersist({
        status: transition.updatedContent.status,
        updatedAt: transition.updatedContent.updatedAt,
      });
      await onDispatch({
        type: 'UPDATE_BLOCK_CONTENTS',
        payload: {blockId: blockSummary.block.id, contents: transition.updatedBlockContents},
      });
      setFeedback('Gravacao confirmada e salva imediatamente no conteudo e no bloco.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              Prontidao
            </p>
            <h2 className="mt-2 text-2xl font-black text-[var(--text-primary)]">Preparacao para gravar</h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
              O conteudo avanca para a fila quando titulo e roteiro estao prontos. Depois disso, o bloco vira a
              camada operacional.
            </p>
          </div>

          <span
            className={cn(
              'rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]',
              canMoveToReady
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'bg-amber-500/10 text-amber-500'
            )}
          >
            {canMoveToReady ? 'Pronto para fila' : 'Faltam ajustes'}
          </span>
        </div>

        <div className="mt-5 grid gap-3">
          {readinessItems.map(item => (
            <article
              key={item.id}
              className="flex items-center justify-between rounded-[20px] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-4"
            >
              <div>
                <p className="text-sm font-black text-[var(--text-primary)]">{item.label}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {item.done ? 'OK para seguir.' : 'Ainda precisa ser concluido antes de ir para gravacao.'}
                </p>
              </div>
              <CheckCircle2
                className={cn('h-5 w-5', item.done ? 'text-emerald-500' : 'text-[var(--text-tertiary)]')}
              />
            </article>
          ))}
        </div>

        {content.status === CONTENT_STATUS.ROTEIRO ? (
          <div className="mt-5 rounded-[22px] border border-dashed border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-4">
            <p className="text-sm font-semibold text-[var(--text-secondary)]">
              O CTA principal do header ja envia este conteudo para gravacao quando a prontidao estiver completa.
            </p>
          </div>
        ) : null}
      </section>

      <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm md:p-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Bloco</p>
          <h2 className="mt-2 text-2xl font-black text-[var(--text-primary)]">Camada operacional</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            O bloco organiza ordem, progresso e execucao. O conteudo continua sendo a fonte de verdade.
          </p>
        </div>

        {blockSummary ? (
          <div className="mt-5 space-y-4">
            <article className="rounded-[22px] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                    Bloco atual
                  </p>
                  <h3 className="mt-2 text-lg font-black text-[var(--text-primary)]">{blockSummary.block.name}</h3>
                </div>
                <span className="rounded-full bg-[var(--bg-hover)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Ordem {blockSummary.order ?? '-'} de {blockSummary.total}
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Metric label="Progresso" value={`${blockSummary.progressPercentage}%`} />
                <Metric label="Gravados" value={`${blockSummary.completedCount}`} />
                <Metric label="Status" value={stage === 'GRAVADO' ? 'Gravado' : 'Em execucao'} />
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <AppButton
                  variant="secondary"
                  leftIcon={<Video className="h-4 w-4" />}
                  onClick={() => navigate(`/gravacao/${blockSummary.block.id}`)}
                >
                  Ir para execucao
                </AppButton>

                {content.status !== CONTENT_STATUS.GRAVADO ? (
                  <AppButton
                    variant="primary"
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    disabled={isBusy}
                    onClick={() => void markRecorded()}
                  >
                    {isBusy ? 'Salvando...' : 'Marcar como gravado'}
                  </AppButton>
                ) : null}
              </div>
            </article>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <article className="rounded-[22px] border border-dashed border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Este conteudo ainda nao esta em um bloco.
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Crie um bloco novo para esta gravacao ou adicione o conteudo a um bloco existente com ordem explicita.
              </p>
            </article>

            <div className="rounded-[22px] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                Criar bloco
              </p>
              <div className="mt-3 flex flex-col gap-3 md:flex-row">
                <input
                  value={blockName}
                  onChange={event => setBlockName(event.target.value)}
                  placeholder="Nome do bloco"
                  className="flex-1 rounded-[18px] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] outline-none"
                />
                <AppButton
                  variant="primary"
                  leftIcon={<Plus className="h-4 w-4" />}
                  disabled={isBusy || !blockName.trim()}
                  onClick={() => void createBlockForCurrentContent()}
                >
                  {isBusy ? 'Criando...' : 'Criar e adicionar'}
                </AppButton>
              </div>
            </div>

            <div className="rounded-[22px] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                Adicionar a bloco existente
              </p>
              <div className="mt-3 flex flex-col gap-3 md:flex-row">
                <select
                  value={selectedBlockId}
                  onChange={event => setSelectedBlockId(event.target.value)}
                  className="flex-1 rounded-[18px] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] outline-none"
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
                  leftIcon={<Clapperboard className="h-4 w-4" />}
                  disabled={isBusy || !selectedBlockId}
                  onClick={() => void addToExistingBlock()}
                >
                  Adicionar
                </AppButton>
              </div>
              {availableBlocks.length === 0 ? (
                <p className="mt-3 text-xs font-semibold text-[var(--text-secondary)]">
                  Nenhum bloco disponivel sem este conteudo no momento.
                </p>
              ) : null}
            </div>
          </div>
        )}

        {feedback ? (
          <article className="mt-4 rounded-[20px] border border-emerald-500/20 bg-emerald-500/8 px-4 py-4 text-sm font-semibold text-emerald-600">
            {feedback}
          </article>
        ) : null}
      </section>
    </div>
  );
}

function Metric({label, value}: {label: string; value: string}) {
  return (
    <div className="rounded-[18px] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{label}</p>
      <p className="mt-2 text-sm font-black text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
