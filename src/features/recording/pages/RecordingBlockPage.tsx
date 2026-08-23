import {useEffect, useMemo, useState} from 'react';
import {useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {ArrowLeft, CheckCircle2, Video} from 'lucide-react';
import {useAppContext} from '../../../context/AppContext';
import {useIsMobile} from '../../../hooks/useIsMobile';
import {cn, htmlToReadableText} from '../../../lib/utils';
import {BurstModeExperience} from '../../contents/components/burst-mode/BurstModeExperience';
import {getRecordingQueueContents} from '../../contents/lib/contentWorkflow';
import {RecordingBlockEditor} from '../components/RecordingBlockEditor';
import {
  buildMarkContentRecordedTransition,
  getRecordingBlockProgress,
  isBlockContentComplete,
  normalizeRecordingTags,
  resolveRecordingContextSummary,
} from '../lib/recordingWorkflow';
import {AppButton} from '../../../components/ui/AppButton';
import {Text} from '../../../components/ui/Text';
import {BurstModeMobileScreen} from '../../../mobile/screens/recording/BurstModeMobileScreen';
import type {Content} from '../../../lib/database';

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
          if (!content) return null;
          return {content, gravado: blockContent.gravado};
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

  const handleMarkRecorded = (contentId: string) => {
    if (!block) return;

    const transition = buildMarkContentRecordedTransition({
      block,
      contentId,
      contents: state.contents,
    });
    if (!transition) return;

    dispatch({type: 'UPDATE_CONTENT', payload: transition.updatedContent} as never);
    dispatch({
      type: 'UPDATE_BLOCK_CONTENTS',
      payload: {blockId: block.id, contents: transition.updatedBlockContents},
    });
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
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-secondary)]">
        <div className="stack-lg text-center">
          <p className="text-sm font-semibold opacity-30">Bloco nao encontrado</p>
          <button onClick={() => navigate('/gravacao')} className="text-xs font-semibold underline opacity-50">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (progress?.isCompleted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-secondary)] px-6">
        <div className="w-full max-w-md stack-xl text-center">
          <div className="text-6xl">Ã°Å¸Å½"°</div>
          <Text variant="pageTitle">Bloco concluido!</Text>
          <p className="text-sm font-bold opacity-40">
            {block.name} · {progress.totalCount} roteiros gravados
          </p>
          <button
            onClick={() => navigate('/criacao?tab=producao')}
            className="rounded-[var(--radius-card-mobile)] bg-[var(--text-primary)] px-8 py-4 text-xs font-semibold text-[var(--bg-primary)] transition-opacity hover:opacity-90 md:rounded-[var(--radius-card)]"
          >
            Ir para Producao
          </button>
        </div>
      </div>
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
            navigate('/criacao?tab=producao');
          }
        }}
      />
    );
  }

  if (isMobile) {
    const readyCount = progress?.readyCount ?? 0;

    return (
      <>
        <div className="stack-lg">
          <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
            <p className="text-xs font-semibold text-[var(--text-tertiary)]">Bloco de gravação</p>
            <Text variant="pageTitle" className="mt-2">{block.name}</Text>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Edite o bloco, revise os roteiros e inicie o modo gravação quando estiver pronto.
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Metric label="Fila" value={String(mobileEntries.length)} />
              <Metric label="Prontos" value={String(readyCount)} />
              <Metric label="Feitos" value={String(progress?.completedCount ?? 0)} />
            </div>
          </section>

          <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
            <RecordingBlockEditor
              block={block}
              blockContents={resolvedContents}
              queueContents={queueContents}
              availableTags={availableTags}
              onUpdateBlock={handleUpdateBlock}
              onUpdateContents={handleUpdateContents}
            />
          </section>

          <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <Text variant="sectionTitle">Ordem de execução</Text>
              <span className="rounded-full bg-[var(--bg-hover)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                {resolveRecordingContextSummary({block, content: mobileEntries[0]?.content ?? null})}
              </span>
            </div>

            <div className="stack-md">
              {mobileEntries.map((entry, index) => (
                <div
                  key={entry.content.id}
                  className={cn(
                    'rounded-[1.4rem] border px-4 py-4',
                    entry.gravado || recordedIds.has(entry.content.id)
                      ? 'border-emerald-500/20 bg-emerald-500/8'
                      : 'border-[var(--border-color)] bg-[var(--bg-primary)]'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-hover)] text-xs font-semibold text-[var(--text-primary)]">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {entry.content.title || 'Roteiro sem título'}
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {htmlToReadableText(entry.content.script)
                          ? 'Roteiro pronto para leitura.'
                          : 'Sem roteiro escrito.'}
                      </p>
                    </div>
                    {entry.gravado || recordedIds.has(entry.content.id) ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">
                        <CheckCircle2 className="h-3 w-3" />
                        Gravado
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <AppButton
            variant="primary"
            fullWidth
            onClick={() => setIsMobileBurstOpen(true)}
            disabled={readyCount === 0}
            leftIcon={<Video className="h-4 w-4" />}
          >
            Iniciar modo gravação
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
              navigate('/criacao');
            }}
          />
        ) : null}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <div className="mx-auto max-w-5xl px-6 py-10 md:px-10 md:py-14">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => navigate('/gravacao?tab=blocks')}
            className="inline-flex items-center gap-2 text-xs font-semibold opacity-50 transition-opacity hover:opacity-80"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para blocos
          </button>

          <div className="flex items-center gap-3">
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-[var(--bg-hover)]">
              <div
                className="h-full rounded-full bg-[var(--text-primary)] transition-all duration-500"
                style={{width: `${progress?.progressPercentage ?? 0}%`}}
              />
            </div>
            <span className="text-xs font-semibold opacity-40">
              {progress?.completedCount ?? 0}/{progress?.totalCount ?? 0}
            </span>
          </div>
        </div>

        <div className="mb-8 stack-sm">
          <p className="t-label t-label-uppercase font-semibold text-[var(--text-tertiary)]">
            Bloco de gravação
          </p>
          <Text variant="pageTitle">{block.name}</Text>
          <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
            Edite nome, marcadores e ordem dos roteiros. Quando estiver pronto, abra o modo gravação com teleprompter.
          </p>
        </div>

        <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-6 md:p-8">
          <RecordingBlockEditor
            block={block}
            blockContents={resolvedContents}
            queueContents={queueContents}
            availableTags={availableTags}
            onUpdateBlock={handleUpdateBlock}
            onUpdateContents={handleUpdateContents}
          />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setIsBurstOpen(true)}
            disabled={(progress?.readyCount ?? 0) === 0}
            className="inline-flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--text-primary)] px-6 py-3 text-sm font-semibold text-[var(--bg-primary)] transition-opacity hover:opacity-90 disabled:opacity-30"
          >
            <Video className="h-4 w-4" />
            Iniciar modo gravação
          </button>
        </div>
      </div>
    </div>
  );
}

function Metric({label, value}: {label: string; value: string}) {
  return (
    <div className="rounded-[1.15rem] bg-[var(--bg-hover)] px-3 py-3">
      <p className="text-xs font-semibold text-[var(--text-tertiary)]">{label}</p>
      <p className="mt-1 text-base font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
