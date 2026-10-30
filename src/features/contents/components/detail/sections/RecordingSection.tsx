import { ValorVazio } from '../../../../../components/ui/ValorVazio';
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
import { isCarouselContent } from '../../../lib/carouselSlides';

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
  const isCarousel = isCarouselContent(content);

  const markRecorded = async () => {
    if (!blockSummary?.block) return;

    const transition = buildMarkContentRecordedTransition({
      block: blockSummary.block,
      contentId: content.id,
      contents: [content],
    });
    if (!transition) return;

    // Gravado vai para Edição, ainda sem "pronto para publicar".
    const {status, recordedAt, edicaoConcluidaEm, edicaoDispensada, updatedAt} = transition.updatedContent;
    await onPersist({status, recordedAt, edicaoConcluidaEm, edicaoDispensada, updatedAt});
    await onDispatch({
      type: 'UPDATE_BLOCK_CONTENTS',
      payload: {blockId: blockSummary.block.id, contents: transition.updatedBlockContents},
    });
  };

  return (
    <div className="grid gap-[var(--space-xl)]">
      <section className="rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 md:p-6">
        <Text variant="label" as="p" className="t-label-uppercase text-[var(--text-tertiary)]">Bloco</Text>
        <Text variant="sectionTitle" className="mt-2">
          {blockSummary ? blockSummary.block.name : 'Sem bloco atribuído'}
        </Text>

        {blockSummary ? (
          <div className="mt-4 stack-lg">
            <Text variant="secondary" as="p" className="text-[var(--text-secondary)]">
              Ordem {blockSummary.order ?? <ValorVazio />} de {blockSummary.total} · {blockSummary.progressPercentage}% concluído
            </Text>
            <Text variant="itemTitle" as="p" className="text-[var(--text-primary)]">
              Status: {isRecorded ? 'Gravado' : 'Em execução'}
            </Text>
            <div className="flex flex-wrap gap-3">
              <AppButton
                variant="primary"
                leftIcon={<Video className="h-4 w-4" />}
                onClick={() => navigate(`/gravacao/${blockSummary.block.id}`)}
              >
                Abrir bloco
              </AppButton>
              {!isCarousel ? (
                <AppButton
                  variant="secondary"
                  leftIcon={<Layers3 className="h-4 w-4" />}
                  onClick={() => navigate(`/gravacao/${blockSummary.block.id}?burst=1`)}
                >
                  Iniciar modo gravação
                </AppButton>
              ) : null}
              {!isRecorded ? (
                <AppButton
                  variant="secondary"
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  onClick={() => void markRecorded()}
                >
                  Marcar como gravado
                </AppButton>
              ) : null}
            </div>
          </div>
        ) : isCarousel ? (
          <div className="mt-4 stack-lg">
            <Text variant="secondary" as="p" className="text-[var(--text-secondary)]">
              Carrossel não passa pela gravação nem pelo teleprompter. Quando as telas estiverem prontas, siga para a publicação.
            </Text>
          </div>
        ) : (
          <div className="mt-4 stack-lg">
            <Text variant="secondary" as="p" className="text-[var(--text-secondary)]">
              Guarde este roteiro em um bloco para montar a sessão de gravação.
            </Text>
            <div className="flex flex-wrap gap-3">
              {onOpenBlockSheet ? (
                <AppButton
                  variant="primary"
                  leftIcon={<Clapperboard className="h-4 w-4" />}
                  onClick={onOpenBlockSheet}
                >
                  Adicionar ao bloco
                </AppButton>
              ) : null}
              <AppButton
                variant="secondary"
                leftIcon={<Clapperboard className="h-4 w-4" />}
                onClick={() => navigate('/gravacao?tab=queue')}
              >
                Ir para Gravação
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
          Ver blocos de gravação
        </AppButton>
      </section>
    </div>
  );
}
