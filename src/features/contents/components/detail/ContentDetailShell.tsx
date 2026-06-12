import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {getSaveFeedbackState, subscribeSaveFeedback, type SaveFeedbackState} from '../../../../lib/saveFeedback';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {SendToRecordingSheet} from '../../../../mobile/components/SendToRecordingSheet';
import {useAppContext} from '../../../../context/AppContext';
import {useAuth} from '../../../../context/AuthContext';
import type {Content} from '../../../../lib/database';
import {cn} from '../../../../lib/utils';
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
  getVisibleTabsForContent,
  isTabLocked,
  shouldShowPublishingSection,
  type ContentDetailTab,
} from '../../lib/contentPipeline';
import {ContentDetailHeader} from './ContentDetailHeader';
import {ContentPipelineStepper} from './ContentPipelineStepper';
import {PublishingSection} from './sections/PublishingSection';
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
  | 'publishTime'
  | 'recordingDate'
  | 'plataformas'
>;

export function ContentDetailShell({content, mode = 'desktop'}: ContentDetailShellProps) {
  const {state, dispatch, updateContent} = useAppContext();
  const {user} = useAuth();
  const navigate = useNavigate();
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
    publishTime: content.publishTime,
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
  const blockSummary = getContentBlockSummary(content.id, state.recordingBlocks, state.contents);
  const mergedContent = {...liveContent, ...draft};
  const stage = getContentStage(mergedContent, {block: blockSummary?.block});
  const showPublishingSection = shouldShowPublishingSection(stage);
  const stageOptions = useMemo(
    () => ({block: blockSummary?.block ?? null}),
    [blockSummary?.block]
  );
  const visibleTabs = getVisibleTabsForContent(mergedContent, stageOptions);

  useEffect(() => {
    const tabAvailable = visibleTabs.includes(activeTab);
    const tabLocked = isTabLocked(activeTab, mergedContent, stageOptions);
    if (tabAvailable && !tabLocked) return;

    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      next.set('tab', visibleTabs[0] ?? 'roteiro');
      return next;
    });
  }, [activeTab, mergedContent, setSearchParams, stageOptions, visibleTabs]);

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
      publishTime: liveContent.publishTime,
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
    liveContent.publishTime,
    liveContent.recordingDate,
    liveContent.plataformas,
  ]);

  const handleDraftChange = useCallback((updates: Partial<ContentDraft>) => {
    draftDirtyRef.current = true;
    setDraftDirty(true);
    setDraft(previous => ({...previous, ...updates}));
  }, []);

  const pillar = state.pilares.find(item => item.id === draft.pilarId) || null;
  const serie = state.series.find(item => item.id === draft.seriesId) || null;
  const primaryAction = getPrimaryAction(mergedContent, {block: blockSummary?.block});
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

  const setTab = (tab: ContentDetailTab) => {
    if (isTabLocked(tab, mergedContent, stageOptions)) return;

    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      next.set('tab', tab);
      return next;
    });
  };

  const handlePrimaryAction = async () => {
    switch (primaryAction.id) {
      case 'advance_to_recording':
        await persist({}, {advanceToReady: true});
        setIsRecordingSheetOpen(true);
        return;
      case 'add_to_block':
        setIsRecordingSheetOpen(true);
        return;
      case 'send_to_posting':
        setTab('publicacao');
        return;
      case 'go_to_execution':
        if (blockSummary?.block) {
          navigate(`/gravacao/${blockSummary.block.id}`);
          return;
        }
        navigate('/gravacao?tab=queue');
        return;
      case 'save_schedule':
        await persist();
        return;
      default:
        if (primaryAction.id === 'none' && stage === ContentStage.POSTADO) {
          navigate('/analise');
          return;
        }
        setTab(primaryAction.targetTab);
    }
  };

  const stageLabel: Record<string, string> = {
    IDEIA: 'Ideia',
    ROTEIRO: 'Roteiro',
    PRONTO_PARA_GRAVAR: 'Pronto para gravacao',
    EM_BLOCO: 'Em bloco',
    GRAVADO: 'Gravado',
    PRODUCAO: 'Publicacao',
    PROGRAMADO: 'Programado',
    POSTADO: 'Postado',
  };

  const tabAlertCounts = {
    publicacao: postingAlerts.length,
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
    ) : activeTab === 'gravacao' || !showPublishingSection ? (
      <RecordingSection
        content={mergedContent}
        stage={stage}
        recordingBlocks={state.recordingBlocks}
        allContents={state.contents}
        onPersist={persist}
        onDispatch={dispatch}
        onOpenBlockSheet={() => setIsRecordingSheetOpen(true)}
      />
    ) : (
      <PublishingSection
        draft={draft}
        pilar={pillar}
        serie={serie}
        alerts={postingAlerts}
        onChange={handleDraftChange}
        isSaving={isSaving}
        onMarkPosted={() => void persist({status: CONTENT_STATUS.POSTADO})}
      />
    );

  if (mode === 'mobile') {
    return (
      <>
        <ContentDetailMobileScreen
          content={mergedContent}
          activeTab={activeTab}
          visibleTabs={visibleTabs}
          onTabChange={setTab}
          primaryAction={primaryAction}
          onPrimaryAction={() => void handlePrimaryAction()}
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
          content={mergedContent}
          recordingBlocks={state.recordingBlocks}
          onPersist={persist}
          onDispatch={dispatch}
        />
      </>
    );
  }

  return (
    <PageScaffold contentWidth="full" contentClassName="pb-12 md:pb-10">
      <div
        className={cn(
          'mx-auto flex max-w-[1280px] flex-col px-4 md:px-8',
          activeTab === 'roteiro' ? 'gap-2 md:pt-4' : 'gap-6 md:pt-8',
        )}
      >
        <div className={activeTab === 'roteiro' ? 'space-y-1.5' : 'contents'}>
          <ContentDetailHeader
            content={mergedContent}
            title={draft.title}
            onTitleChange={value => handleDraftChange({title: value})}
            primaryAction={primaryAction}
            onPrimaryAction={() => void handlePrimaryAction()}
            onSaveDraft={() => void persist()}
            onStatusChange={status => void persist({status})}
            isSaving={isSaving}
            blockName={blockSummary?.block.name ?? null}
            blockOrder={blockSummary?.order ?? null}
            saveHint={saveHint}
            pilar={pillar}
            authorName={user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'}
            compact={activeTab === 'roteiro'}
          />

          <ContentPipelineStepper
            content={mergedContent}
            activeTab={activeTab}
            stageOptions={stageOptions}
            onTabChange={setTab}
            compact={activeTab === 'roteiro'}
          />
        </div>

        <div className={cn(activeTab === 'roteiro' ? 'gap-3' : 'gap-6', 'grid')}>
          {activeTab === 'roteiro' ? (
            detailSection
          ) : (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div>{detailSection}</div>
              <aside className="space-y-4">
                <ContentOperationalPanel
                  draft={draft}
                  series={state.series}
                  pilares={state.pilares}
                  authorName={user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'}
                  onChange={handleDraftChange}
                  onStatusChange={status => void persist({status})}
                  density="compact"
                  showTitle={false}
                />
              </aside>
            </div>
          )}
        </div>
      </div>

      <SendToRecordingSheet
        open={isRecordingSheetOpen}
        onClose={() => setIsRecordingSheetOpen(false)}
        content={mergedContent}
        recordingBlocks={state.recordingBlocks}
        onPersist={persist}
        onDispatch={dispatch}
      />
    </PageScaffold>
  );
}
