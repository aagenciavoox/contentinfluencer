import {useEffect, useMemo, useState} from 'react';
import {useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {Video} from 'lucide-react';
import {useAppContext} from '../../../context/AppContext';
import {useHydrateContentBodies} from '../../../hooks/useHydrateContentBodies';
import {useIsMobile} from '../../../hooks/useIsMobile';
import {BurstModeExperience} from '../../contents/components/burst-mode/BurstModeExperience';
import {getRecordingQueueContents} from '../../contents/lib/contentWorkflow';
import {isCarouselContent} from '../../contents/lib/carouselSlides';
import {RecordingBlockEditor} from '../components/RecordingBlockEditor';
import {
  buildMarkContentRecordedTransition,
  getRecordingBlockProgress,
  isBlockContentComplete,
  normalizeRecordingTags,
} from '../lib/recordingWorkflow';
import {AppButton} from '../../../components/ui/AppButton';
import {Surface} from '../../../components/ui/Surface';
import {Text} from '../../../components/ui/Text';
import {BurstModeMobileScreen} from '../../../mobile/screens/recording/BurstModeMobileScreen';
import type {Content} from '../../../lib/database';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import {PageLayout} from '../../../layouts/page/PageLayout';
import {PAGE_SECTION} from '../../../layouts/navigation/navConfig';

export function RecordingBlockPage() {
  const {id} = useParams<{id: string}>();
  const [searchParams, setSearchParams] = useSearchParams();
  const {state, dispatch} = useAppContext();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const block = state.recordingBlocks.find(candidate => candidate.id === id);
  const [isBurstOpen, setIsBurstOpen] = useState(false);
  const [isMobileBurstOpen, setIsMobileBurstOpen] = useState(false);

  const burstLaunch = searchParams.get('burst') === '1';

  useEffect(() => {
    if (!burstLaunch) return;
    if (isMobile) setIsMobileBurstOpen(true);
    else setIsBurstOpen(true);
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      next.delete('burst');
      return next;
    }, {replace: true});
  }, [burstLaunch, isMobile, setSearchParams]);

  const blockContents = useMemo(
    () => (block ? [...block.contents].sort((left, right) => left.ordem - right.ordem) : []),
    [block]
  );

  const blockContentIds = useMemo(
    () => blockContents.map(item => item.contentId),
    [blockContents]
  );
  useHydrateContentBodies(blockContentIds);

  const resolvedContents = useMemo(
    () =>
      blockContents
        .map(blockContent => state.contents.find(item => item.id === blockContent.contentId) ?? null)
        .filter((content): content is Content => content !== null),
    [blockContents, state.contents]
  );

  const mobileEntries = useMemo(
    () =>
      blockContents
        .map(blockContent => {
          const content = state.contents.find(item => item.id === blockContent.contentId);
          // Carrossel não vai para o teleprompter.
          if (!content || isCarouselContent(content)) return null;
          return {content, gravado: isBlockContentComplete(blockContent, content)};
        })
        .filter((entry): entry is {content: Content; gravado: boolean} => entry !== null),
    [blockContents, state.contents]
  );

  const queueContents = getRecordingQueueContents(state.contents, state.recordingBlocks);
  const availableTags = useMemo(
    () =>
      Array.from(
        new Set([
          ...queueContents.flatMap(content => normalizeRecordingTags(content.tags || [])),
          ...resolvedContents.flatMap(content => normalizeRecordingTags(content.tags || [])),
        ])
      ).sort((left, right) => left.localeCompare(right, 'pt-BR')),
    [queueContents, resolvedContents]
  );

  const recordedIds = useMemo(
    () =>
      new Set(
        blockContents
          .filter(item => {
            const content = state.contents.find(candidate => candidate.id === item.contentId);
            return isBlockContentComplete(item, content);
          })
          .map(item => item.contentId)
      ),
    [blockContents, state.contents]
  );

  const progress = block ? getRecordingBlockProgress(block, resolvedContents) : null;

  const handleMarkRecorded = async (contentId: string) => {
    if (!block) return;

    const previous = state.contents.find(content => content.id === contentId);
    const transition = buildMarkContentRecordedTransition({
      block,
      contentId,
      contents: state.contents,
    });
    if (!transition) return;

    try {
      await dispatch({type: 'UPDATE_CONTENT', payload: transition.updatedContent} as never);
      try {
        await dispatch({
          type: 'UPDATE_BLOCK_CONTENTS',
          payload: {blockId: block.id, contents: transition.updatedBlockContents},
        });
      } catch (error) {
        if (previous) await dispatch({type: 'UPDATE_CONTENT', payload: previous});
        throw error;
      }
    } catch {
      // O aviso de erro sai do dispatch; o roteiro volta ao estado anterior se o bloco não gravou.
    }
  };

  const handleUpdateBlock = (nextBlock: NonNullable<typeof block>) => {
    void dispatch({type: 'UPDATE_RECORDING_BLOCK', payload: nextBlock});
  };

  const handleUpdateContents = (contents: NonNullable<typeof block>['contents']) => {
    if (!block) return;
    void dispatch({
      type: 'UPDATE_BLOCK_CONTENTS',
      payload: {blockId: block.id, contents},
    });
  };

  if (!block) {
    if (isMobile) {
      return (
        <MobileBlockStatus
          title="Bloco não encontrado"
          message="Este bloco de gravação não existe mais."
          secondaryLabel="Voltar à Gravação"
          onSecondary={() => navigate('/gravacao?tab=blocks')}
        />
      );
    }

    return (
      <PageLayout
        header={(
          <DesktopPageHeader
            section={PAGE_SECTION.producao}
            title="Bloco não encontrado"
            backLabel="Gravação"
            backTo="/gravacao?tab=blocks"
          />
        )}
      >
        <Text variant="secondary">Este bloco de gravação não existe mais.</Text>
      </PageLayout>
    );
  }

  if (progress?.isCompleted) {
    const completedMessage = `${block.name} · ${progress.totalCount} ${progress.totalCount === 1 ? 'roteiro gravado' : 'roteiros gravados'}`;
    if (isMobile) {
      return (
        <MobileBlockStatus
          title="Bloco concluído"
          message={completedMessage}
          primaryLabel="Ir para Edição"
          onPrimary={() => navigate('/criacao?tab=edicao')}
          secondaryLabel="Voltar à Gravação"
          onSecondary={() => navigate('/gravacao?tab=blocks')}
        />
      );
    }

    return (
      <PageLayout
        header={(
          <DesktopPageHeader
            section={PAGE_SECTION.producao}
            title="Bloco concluído"
            backLabel="Gravação"
            backTo="/gravacao?tab=blocks"
            rowAlign="center"
            actions={(
              <AppButton variant="primary" onClick={() => navigate('/criacao?tab=edicao')}>
                Ir para Edição
              </AppButton>
            )}
          />
        )}
      >
        <Text variant="secondary">{completedMessage}</Text>
      </PageLayout>
    );
  }

  if (isBurstOpen) {
    return (
      <BurstModeExperience
        block={block}
        recordedIds={recordedIds}
        onMarkRecorded={handleMarkRecorded}
        onExit={() => {
          setIsBurstOpen(false);
          if (getRecordingBlockProgress(block, resolvedContents).isCompleted) {
            navigate('/criacao?tab=edicao');
          }
        }}
      />
    );
  }

  if (isMobile) {
    const readyCount = progress?.readyCount ?? 0;

    return (
      <>
        <div className="stack-lg pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <Surface variant="outlined" padding="md">
            <Text variant="label" as="p" className="text-[var(--text-tertiary)]">Bloco de gravação</Text>
            <Text variant="secondary" as="p" className="mt-1 text-[var(--text-secondary)]">
              Edite o bloco, revise os roteiros e inicie o Modo gravação quando estiver pronto.
            </Text>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Metric label="Roteiros" value={String(mobileEntries.length)} />
              <Metric label="Prontos" value={String(readyCount)} />
              <Metric label="Gravados" value={String(progress?.completedCount ?? 0)} />
            </div>
          </Surface>

          <RecordingBlockEditor
            block={block}
            blockContents={resolvedContents}
            queueContents={queueContents}
            availableTags={availableTags}
            onUpdateBlock={handleUpdateBlock}
            onUpdateContents={handleUpdateContents}
            layout="stack"
          />

          <AppButton
            variant="primary"
            fullWidth
            onClick={() => setIsMobileBurstOpen(true)}
            disabled={readyCount === 0}
            leftIcon={<Video className="h-4 w-4" />}
          >
            Iniciar Modo gravação
          </AppButton>
        </div>

        {isMobileBurstOpen ? (
          <BurstModeMobileScreen
            block={block}
            entries={mobileEntries}
            onClose={() => setIsMobileBurstOpen(false)}
            onMarkRecorded={handleMarkRecorded}
            onFinish={() => {
              setIsMobileBurstOpen(false);
              navigate('/criacao?tab=edicao');
            }}
          />
        ) : null}
      </>
    );
  }

  const completedCount = progress?.completedCount ?? 0;
  const totalCount = progress?.totalCount ?? 0;
  const progressLabel = `${completedCount} de ${totalCount} ${totalCount === 1 ? 'gravado' : 'gravados'}`;

  return (
    <PageLayout
      header={(
        <DesktopPageHeader
          section={PAGE_SECTION.producao}
          title={block.name}
          titleContent={(
            <>
              <Text variant="pageTitle" className="truncate">{block.name}</Text>
              <div className="mt-1.5 flex items-center gap-4">
                <Text variant="body" as="p" className="shrink-0 text-[var(--text-secondary)]">{progressLabel}</Text>
                <div
                  role="progressbar"
                  aria-label="Roteiros gravados"
                  aria-valuemin={0}
                  aria-valuemax={totalCount}
                  aria-valuenow={completedCount}
                  aria-valuetext={progressLabel}
                  className="h-2 w-full max-w-md overflow-hidden rounded-full border border-[var(--border-color)] bg-[var(--bg-hover)]"
                >
                  <div
                    className="h-full rounded-full bg-[var(--brand-accent)] transition-[width] duration-300"
                    style={{width: `${progress?.progressPercentage ?? 0}%`}}
                  />
                </div>
              </div>
            </>
          )}
          backLabel="Gravação"
          backTo="/gravacao?tab=blocks"
          actions={(
            <AppButton
              variant="primary"
              onClick={() => setIsBurstOpen(true)}
              disabled={(progress?.readyCount ?? 0) === 0}
              leftIcon={<Video className="h-4 w-4" />}
            >
              Iniciar Modo gravação
            </AppButton>
          )}
        />
      )}
    >
      <RecordingBlockEditor
        block={block}
        blockContents={resolvedContents}
        queueContents={queueContents}
        availableTags={availableTags}
        onUpdateBlock={handleUpdateBlock}
        onUpdateContents={handleUpdateContents}
        layout="columns"
      />
    </PageLayout>
  );
}

function MobileBlockStatus({
  title,
  message,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  title: string;
  message: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel: string;
  onSecondary: () => void;
}) {
  return (
    <div className="stack-lg pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Surface variant="outlined" padding="md">
        <Text variant="sectionTitle">{title}</Text>
        <Text variant="secondary" as="p" className="mt-2">{message}</Text>
      </Surface>
      {primaryLabel && onPrimary ? (
        <AppButton variant="primary" fullWidth onClick={onPrimary}>
          {primaryLabel}
        </AppButton>
      ) : null}
      <AppButton variant="secondary" fullWidth onClick={onSecondary}>
        {secondaryLabel}
      </AppButton>
    </div>
  );
}

function Metric({label, value}: {label: string; value: string}) {
  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-hover)] px-3 py-3">
      <Text variant="label" as="p" className="text-[var(--text-tertiary)]">{label}</Text>
      <Text variant="bodyStrong" as="p" className="mt-1 text-[var(--text-primary)]">{value}</Text>
    </div>
  );
}
