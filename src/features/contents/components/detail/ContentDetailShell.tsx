import {ArrowLeft, AlertTriangle, CheckCircle2, Clock3} from 'lucide-react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {getSaveFeedbackState, subscribeSaveFeedback, type SaveFeedbackState} from '../../../../lib/saveFeedback';
import {useContentDetailBack} from '../../../../lib/navigation/useContentDetailBack';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {SendToRecordingSheet} from '../../../../mobile/components/SendToRecordingSheet';
import {AppButton} from '../../../../components/ui/AppButton';
import {useAppContext} from '../../../../context/AppContext';
import {useAuth} from '../../../../context/AuthContext';
import type {Content} from '../../../../lib/database';
import {PageScaffold} from '../../../../layouts/page/PageScaffold';
import {ContentDetailMobileScreen} from '../../../../mobile/screens/contents/ContentDetailMobileScreen';
import {
  CONTENT_STATUS,
  getContentBlockSummary,
  ContentStage,
  getContentStage,
  getInitialTabForContext,
  getPostingAutomationStatus,
  getPostingAlerts,
  getPrimaryAction,
  type ContentDetailTab,
} from '../../lib/contentPipeline';
import {ContentDetailHeader} from './ContentDetailHeader';
import {ContentPipelineStepper} from './ContentPipelineStepper';
import {ContentDetailTabs} from './ContentDetailTabs';
import {HistorySection} from './sections/HistorySection';
import {PostingSection} from './sections/PostingSection';
import {ProductionSection} from './sections/ProductionSection';
import {RecordingSection} from './sections/RecordingSection';
import {ContentOperationalPanel} from './ContentOperationalPanel';
import {RoteiroSection} from './sections/RoteiroSection';

interface ContentDetailShellProps {
  content: Content;
  mode?: 'desktop' | 'mobile';
}

type ContentDraft = Pick<
  Content,
  | 'title'
  | 'seriesId'
  | 'pilarId'
  | 'slotType'
  | 'formatoVisual'
  | 'script'
  | 'scriptNotes'
  | 'referencias'
  | 'notes'
  | 'status'
  | 'publishDate'
  | 'recordingDate'
  | 'plataformas'
>;

export function ContentDetailShell({content, mode = 'desktop'}: ContentDetailShellProps) {
  const {state, dispatch, updateContent} = useAppContext();
  const {user} = useAuth();
  const navigate = useNavigate();
  const goBackToConteudos = useContentDetailBack();
  const [searchParams, setSearchParams] = useSearchParams();
  const [draft, setDraft] = useState<ContentDraft>(() => ({
    title: content.title,
    seriesId: content.seriesId,
    pilarId: content.pilarId,
    slotType: content.slotType,
    formatoVisual: content.formatoVisual,
    script: content.script,
    scriptNotes: content.scriptNotes || [],
    referencias: content.referencias,
    notes: content.notes,
    status: content.status,
    publishDate: content.publishDate,
    recordingDate: content.recordingDate,
    plataformas: content.plataformas || [],
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedbackState>(() => getSaveFeedbackState());
  const [isRecordingSheetOpen, setIsRecordingSheetOpen] = useState(false);
  const draftDirtyRef = useRef(false);
  const [draftDirty, setDraftDirty] = useState(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeTab = getInitialTabForContext(searchParams.get('tab'));

  useEffect(() => subscribeSaveFeedback(() => setSaveFeedback(getSaveFeedbackState())), []);

  useEffect(() => {
    if (mode !== 'mobile' || searchParams.get('focus') !== 'script') return;
    const timer = window.setTimeout(() => {
      setSearchParams(previous => {
        if (!previous.get('focus')) return previous;
        const next = new URLSearchParams(previous);
        next.delete('focus');
        return next;
      }, { replace: true });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [content.id, mode, searchParams, setSearchParams]);

  const liveContent = state.contents.find(item => item.id === content.id) || content;

  useEffect(() => {
    if (draftDirtyRef.current) return;

    setDraft({
      title: liveContent.title,
      seriesId: liveContent.seriesId,
      pilarId: liveContent.pilarId,
      slotType: liveContent.slotType,
      formatoVisual: liveContent.formatoVisual,
      script: liveContent.script,
      scriptNotes: liveContent.scriptNotes || [],
      referencias: liveContent.referencias,
      notes: liveContent.notes,
      status: liveContent.status,
      publishDate: liveContent.publishDate,
      recordingDate: liveContent.recordingDate,
      plataformas: liveContent.plataformas || [],
    });
  }, [
    liveContent.id,
    liveContent.updatedAt,
    liveContent.title,
    liveContent.script,
    liveContent.status,
    liveContent.seriesId,
    liveContent.pilarId,
    liveContent.slotType,
    liveContent.formatoVisual,
    liveContent.scriptNotes,
    liveContent.referencias,
    liveContent.notes,
    liveContent.publishDate,
    liveContent.recordingDate,
    liveContent.plataformas,
  ]);

  const handleDraftChange = useCallback((updates: Partial<ContentDraft>) => {
    draftDirtyRef.current = true;
    setDraftDirty(true);
    setDraft(previous => ({...previous, ...updates}));
  }, []);
  const series = state.series.find(item => item.id === draft.seriesId) || null;
  const pillar = state.pilares.find(item => item.id === draft.pilarId) || null;
  const blockSummary = getContentBlockSummary(content.id, state.recordingBlocks);
  const primaryAction = getPrimaryAction(
    {
      ...liveContent,
      ...draft,
    },
    {block: blockSummary?.block}
  );
  const postingAlerts = useMemo(
    () =>
      getPostingAlerts({
        publishDate: draft.publishDate,
        status: draft.status,
      }),
    [draft.publishDate, draft.status]
  );

  const persist = useCallback(async (
    updates?: Partial<Content>,
    options?: {advanceToReady?: boolean; silent?: boolean}
  ) => {
    setIsSaving(true);

    try {
      let nextStatus =
        options?.advanceToReady && draft.status === CONTENT_STATUS.ROTEIRO
          ? CONTENT_STATUS.PRONTO_PARA_GRAVAR
          : updates?.status ?? draft.status;

      const nextPublishDate = updates?.publishDate ?? draft.publishDate;
      nextStatus = getPostingAutomationStatus({
        publishDate: nextPublishDate,
        status: nextStatus,
      });

      const payload: Content = {
        ...liveContent,
        ...draft,
        ...updates,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      };

      await updateContent(payload, {silent: options?.silent});
      draftDirtyRef.current = false;
      setDraftDirty(false);
      setDraft(previous => ({...previous, ...updates, status: nextStatus}));

      if (options?.advanceToReady) {
        setSearchParams(previous => {
          const next = new URLSearchParams(previous);
          next.set('tab', 'gravacao');
          return next;
        });
      }
    } finally {
      setIsSaving(false);
    }
  }, [draft, liveContent, setSearchParams, updateContent]);

  const persistRef = useRef(persist);
  persistRef.current = persist;

  useEffect(() => {
    if (!draftDirtyRef.current) return;
    if (activeTab !== 'roteiro') return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      void persistRef.current(undefined, {silent: true});
    }, 1800);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [activeTab, draft.script, draft.title, draft.notes, draft.referencias]);

  const saveHint = isSaving || saveFeedback.status === 'saving'
    ? 'Salvando no servidor...'
    : saveFeedback.status === 'error'
      ? saveFeedback.detail || saveFeedback.message
      : saveFeedback.status === 'success'
        ? saveFeedback.message
        : draftDirty
          ? 'Salvamento automatico em breve'
          : 'Sincronizado';

  const handlePrimaryAction = async () => {
    switch (primaryAction.id) {
      case 'advance_to_recording':
        if (mode === 'mobile') {
          await persist();
          setIsRecordingSheetOpen(true);
          return;
        }
        await persist({}, {advanceToReady: true});
        return;
      case 'add_to_block':
        if (mode === 'mobile') {
          setIsRecordingSheetOpen(true);
          return;
        }
        setSearchParams(previous => {
          const next = new URLSearchParams(previous);
          next.set('tab', 'gravacao');
          return next;
        });
        return;
      case 'send_to_posting':
        setSearchParams(previous => {
          const next = new URLSearchParams(previous);
          next.set('tab', 'postagem');
          return next;
        });
        return;
      case 'go_to_execution':
        if (blockSummary?.block) {
          navigate(`/gravacao/${blockSummary.block.id}`);
          return;
        }
        setSearchParams(previous => {
          const next = new URLSearchParams(previous);
          next.set('tab', 'gravacao');
          return next;
        });
        return;
      case 'save_schedule':
        await persist();
        return;
      default:
        if (primaryAction.id === 'none' && stage === ContentStage.POSTADO) {
          navigate('/analise');
          return;
        }
        setSearchParams(previous => {
          const next = new URLSearchParams(previous);
          next.set('tab', primaryAction.targetTab);
          return next;
        });
    }
  };

  const stage = getContentStage({...liveContent, ...draft}, {block: blockSummary?.block});
  const stageLabel: Record<string, string> = {
    IDEIA: 'Ideia',
    ROTEIRO: 'Roteiro',
    PRONTO_PARA_GRAVAR: 'Pronto para gravacao',
    EM_BLOCO: 'Em bloco',
    GRAVADO: 'Gravado',
    PRODUCAO: 'Producao',
    PROGRAMADO: 'Programado',
    POSTADO: 'Postado',
  };

  const tabAlertCounts = {
    postagem: postingAlerts.length,
  };

  const detailSection =
    activeTab === 'roteiro' ? (
      <RoteiroSection
        draft={draft}
        series={state.series}
        pilares={state.pilares}
        authorName={user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'}
        onChange={handleDraftChange}
        onStatusChange={status => void persist({status})}
        mobileComposer={mode === 'mobile'}
        autoFocusScript={mode === 'mobile' && searchParams.get('focus') === 'script'}
        layout={mode === 'desktop' ? 'workspace' : 'stack'}
      />
    ) : activeTab === 'gravacao' ? (
      <RecordingSection
        content={{...liveContent, ...draft}}
        stage={stage}
        recordingBlocks={state.recordingBlocks}
        onPersist={persist}
        onDispatch={dispatch}
      />
    ) : activeTab === 'producao' ? (
      <ProductionSection
        draft={draft}
        pilar={pillar}
        onChange={handleDraftChange}
      />
    ) : activeTab === 'postagem' ? (
      <PostingSection
        draft={draft}
        alerts={postingAlerts}
        onChange={handleDraftChange}
      />
    ) : activeTab === 'historico' ? (
      <HistorySection content={{...liveContent, ...draft}} />
    ) : (
      <PlaceholderSection
        tab={activeTab}
        blockName={blockSummary?.block.name ?? null}
        progress={blockSummary?.progressPercentage ?? null}
      />
    );

  if (mode === 'mobile') {
    return (
      <>
      <ContentDetailMobileScreen
        content={{...liveContent, ...draft}}
        activeTab={activeTab}
        onTabChange={tab =>
          setSearchParams(previous => {
            const next = new URLSearchParams(previous);
            next.set('tab', tab);
            return next;
          })
        }
        primaryAction={primaryAction}
        onPrimaryAction={() => void handlePrimaryAction()}
        onStatusChange={status => void persist({status})}
        isSaving={isSaving}
        postingAlerts={postingAlerts}
        stageLabel={stageLabel[stage]}
        operationalPanel={
          <ContentOperationalPanel
            draft={draft}
            series={state.series}
            pilares={state.pilares}
            onChange={handleDraftChange}
            onStatusChange={status => void persist({status})}
            density="compact"
          />
        }
        blockName={blockSummary?.block.name ?? null}
        blockOrder={blockSummary?.order ?? null}
        section={detailSection}
        onSave={() => void persist()}
        saveHint={saveHint}
      />

      <SendToRecordingSheet
        open={isRecordingSheetOpen}
        onClose={() => setIsRecordingSheetOpen(false)}
        content={{...liveContent, ...draft}}
        recordingBlocks={state.recordingBlocks}
        onPersist={persist}
        onDispatch={dispatch}
      />
      </>
    );
  }

  return (
    <PageScaffold contentWidth="full" contentClassName="pb-12 md:pb-10">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
        <div className="flex items-center justify-between gap-3 pt-4 md:pt-8">
          <AppButton variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={goBackToConteudos}>
            Voltar
          </AppButton>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Etapa atual
            </p>
            <p className="text-sm font-black text-[var(--text-primary)]">{stageLabel[stage]}</p>
          </div>
        </div>

        <ContentDetailHeader
          content={{...liveContent, ...draft}}
          title={draft.title}
          onTitleChange={value => handleDraftChange({title: value})}
          primaryAction={primaryAction}
          onPrimaryAction={() => void handlePrimaryAction()}
          onStatusChange={status => void persist({status})}
          isSaving={isSaving}
          blockName={blockSummary?.block.name ?? null}
          blockOrder={blockSummary?.order ?? null}
          saveHint={saveHint}
        />

        <ContentPipelineStepper
          content={{...liveContent, ...draft}}
          activeTab={activeTab}
          onTabChange={tab =>
            setSearchParams(previous => {
              const next = new URLSearchParams(previous);
              next.set('tab', tab);
              return next;
            })
          }
        />

        {postingAlerts.length > 0 ? (
          <section className="grid gap-3">
            {postingAlerts.map(alert => (
              <article
                key={alert.id}
                className="ds-card flex items-start gap-3 bg-[var(--bg-secondary)] px-4 py-4"
              >
                {alert.tone === 'warning' ? (
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
                ) : (
                  <Clock3 className="mt-0.5 h-5 w-5 text-sky-500" />
                )}
                <p className="text-sm font-semibold text-[var(--text-primary)]">{alert.message}</p>
              </article>
            ))}
          </section>
        ) : null}

        <ContentDetailTabs
          activeTab={activeTab}
          alertCounts={tabAlertCounts}
          onTabChange={tab =>
            setSearchParams(previous => {
              const next = new URLSearchParams(previous);
              next.set('tab', tab);
              return next;
            })
          }
        />

        {detailSection}
      </div>
    </PageScaffold>
  );
}

function PlaceholderSection({
  tab,
  blockName,
  progress,
}: {
  tab: ContentDetailTab;
  blockName: string | null;
  progress: number | null;
}) {
  const copyByTab: Record<ContentDetailTab, {title: string; body: string}> = {
    roteiro: {
      title: 'Roteiro',
      body: 'A escrita central do conteudo ja foi migrada para o shell novo.',
    },
    gravacao: {
      title: 'Gravacao',
      body: blockName
        ? `Este conteudo ja esta no bloco "${blockName}" com progresso atual de ${progress ?? 0}%.`
        : 'A gravacao agora vive na aba dedicada deste mesmo detalhe.',
    },
    producao: {
      title: 'Producao',
      body: 'Assets, copy e preparacao de distribuicao entram nesta aba na proxima fase.',
    },
    postagem: {
      title: 'Postagem',
      body: 'Plataformas, datas, alertas e agendamento vao viver aqui no mesmo detalhe.',
    },
    historico: {
      title: 'Historico',
      body: 'A timeline com mudancas e eventos sera derivada dos campos atuais na fase seguinte.',
    },
  };

  const copy = copyByTab[tab];

  return (
    <section className="ds-card border-dashed bg-[var(--bg-secondary)] p-8 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-[var(--accent-green)]" />
      <h2 className="mt-4 text-2xl font-black text-[var(--text-primary)]">{copy.title}</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-[var(--text-secondary)]">
        {copy.body}
      </p>
    </section>
  );
}
