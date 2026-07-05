import {CheckCircle2, Clapperboard, ExternalLink, Layers3, Video} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {AppButton} from '../../../../../components/ui/AppButton';
import {Text} from '../../../../../components/ui/Text';
import type {Content, RecordingBlock} from '../../../../../lib/database';
import {
  getContentBlockSummary,
  type ContentStage,
} from '../../../lib/contentPipeline';
import { buildMarkContentRecordedTransition } from '../../../../recording/lib/recordingWorkflow';

interface RecordingSectionProps {
  content: Content;
  stage: ContentStage;
  recordingBlocks: RecordingBlock[];
  allContents?: Content[];
  onPersist: (updates?: Partial<Content>, options?: {advanceToReady?: boolean}) => Promise<void>;
  onDispatch: (action: {type: string; payload?: unknown}) => Promise<void>;
  onOpenBlockSheet?: () => void;
}

export function RecordingSection({
  content,
  stage,
  recordingBlocks,
  allContents,
  onPersist,
  onDispatch,
  onOpenBlockSheet,
}: RecordingSectionProps) {
  const navigate = useNavigate();
  const blockSummary = getContentBlockSummary(content.id, recordingBlocks, allContents ?? [content]);
  const isRecorded = Boolean(content.recordedAt);

  const markRecorded = async () => {
    if (!blockSummary?.block) return;

    const transition = buildMarkContentRecordedTransition({
      block: blockSummary.block,
      contentId: content.id,
      contents: [content],
    });
    if (!transition) return;

    await onPersist({
      status: transition.updatedContent.status,
      recordedAt: transition.updatedContent.recordedAt,
      updatedAt: transition.updatedContent.updatedAt,
    });
    await onDispatch({
      type: 'UPDATE_BLOCK_CONTENTS',
      payload: {blockId: blockSummary.block.id, contents: transition.updatedBlockContents},
    });
  };

  return (
    <div className="grid gap-[var(--space-xl)]">
      <section className="rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-sm md:p-6">
        <p className="t-label t-label-uppercase font-semibold text-[var(--text-tertiary)]">Bloco</p>
        <Text variant="sectionTitle" className="mt-2">
          {blockSummary ? blockSummary.block.name : 'Sem bloco atribuido'}
        </Text>

        {blockSummary ? (
          <div className="mt-4 stack-lg">
            <p className="text-sm text-[var(--text-secondary)]">
              Ordem {blockSummary.order ?? '-'} de {blockSummary.total} · {blockSummary.progressPercentage}% concluido
            </p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Status: {isRecorded ? 'Gravado' : 'Em execucao'}
            </p>
            <div className="flex flex-wrap gap-3">
              <AppButton
                variant="primary"
                leftIcon={<Video className="h-4 w-4" />}
                onClick={() => navigate(`/gravacao/${blockSummary.block.id}`)}
              >
                Abrir bloco
              </AppButton>
              <AppButton
                variant="secondary"
                leftIcon={<Layers3 className="h-4 w-4" />}
                onClick={() => navigate(`/gravacao/${blockSummary.block.id}?burst=1`)}
              >
                Iniciar modo gravacao
              </AppButton>
              {!isRecorded ? (
                <AppButton
                  variant="secondary"
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  onClick={() => void markRecorded()}
                >
                  Marcar gravado
                </AppButton>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-4 stack-lg">
            <p className="text-sm text-[var(--text-secondary)]">
              Guarde este conteudo em um bloco para montar a sessao de gravacao.
            </p>
            <div className="flex flex-wrap gap-3">
              {onOpenBlockSheet ? (
                <AppButton
                  variant="primary"
                  leftIcon={<Clapperboard className="h-4 w-4" />}
                  onClick={onOpenBlockSheet}
                >
                  Guardar em bloco
                </AppButton>
              ) : null}
              <AppButton
                variant="secondary"
                leftIcon={<Clapperboard className="h-4 w-4" />}
                onClick={() => navigate('/gravacao?tab=queue')}
              >
                Ir para Gravacao
              </AppButton>
            </div>
          </div>
        )}

        <AppButton
          variant="ghost"
          className="mt-4"
          leftIcon={<ExternalLink className="h-4 w-4" />}
          onClick={() => navigate('/gravacao?tab=blocks')}
        >
          Ver blocos de gravacao
        </AppButton>
      </section>
    </div>
  );
}
