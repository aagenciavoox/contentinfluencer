import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {getSaveFeedbackState, subscribeSaveFeedback, type SaveFeedbackState} from '../../../../lib/saveFeedback';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {useNavigationBlocker} from '../../../../lib/navigation/NavigationBlockerContext';
import {SendToRecordingSheet} from '../../../../mobile/components/SendToRecordingSheet';
import {ConfirmModal} from '../../../../components/feedback/modals/ConfirmModal';
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
  getPostingAlerts,
  getPrimaryAction,
  getVisibleTabsForContent,
  applyStatusMilestones,
  isTabLocked,
  PRODUCTION_TAGS,
  withProductionTag,
  type ContentDetailTab,
} from '../../lib/contentPipeline';
import {ContentDetailHeader} from './ContentDetailHeader';
import {ContentPipelineStepper} from './ContentPipelineStepper';
import {PublishingSection} from './sections/PublishingSection';
import {RecordingSection} from './sections/RecordingSection';
import {ContentOperationalPanel} from './ContentOperationalPanel';
import {isContentBodyLoaded} from '../../lib/contentBody';
import {RoteiroSection, type ScriptDraft} from './sections/RoteiroSection';

interface ContentDetailShellProps {
  content: Content;
  mode?: 'desktop' | 'mobile';
}

type ContentDraft = ScriptDraft;

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
    postedAt: content.postedAt,
    plataformas: content.plataformas || [],
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedbackState>(() => getSaveFeedbackState());
  const [isRecordingSheetOpen, setIsRecordingSheetOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const draftDirtyRef = useRef(false);
  const [draftDirty, setDraftDirty] = useState(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeTab = getInitialTabForContext(searchParams.get('tab'));

  const blocker = useNavigationBlocker(() => draftDirty);

  useEffect(() => subscribeSaveFeedback(() => setSaveFeedback(getSaveFeedbackState())), []);

  useEffect(() => {
    if (!draftDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [draftDirty]);

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
      postedAt: liveContent.postedAt,
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
    liveContent.postedAt,
    liveContent.plataformas,
  ]);

  const handleDraftChange = useCallback((updates: Partial<ContentDraft>) => {
    draftDirtyRef.current = true;
    setDraftDirty(true);
    setDraft(previous => ({...previous, ...updates}));
    if ('status' in updates && updates.status) {
      void persistRef.current({status: updates.status});
    }
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
          ? CONTENT_STATUS.PRODUCAO
          : updates?.status ?? draft.status;

      const nextTags =
        options?.advanceToReady && draft.status === CONTENT_STATUS.ROTEIRO
          ? withProductionTag(updates?.tags ?? liveContent.tags ?? [], PRODUCTION_TAGS.GRAVAR)
          : updates?.tags ?? liveContent.tags;

      const statusMilestones = applyStatusMilestones(liveContent, nextStatus);

      const payload: Content = {
        ...liveContent,
        ...draft,
        ...updates,
        ...statusMilestones,
        tags: nextTags,
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
    if (!isContentBodyLoaded(liveContent)) return;

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
  }, [
    draft.formatoVisual,
    draft.notes,
    draft.pilarId,
    draft.plataformas,
    draft.publishDate,
    draft.publishTime,
    draft.recordingDate,
    draft.referencias,
    draft.script,
    draft.scriptNotes,
    draft.seriesId,
    draft.slotType,
    draft.title,
    liveContent,
  ]);

  const saveHint = isSaving || saveFeedback.status === 'saving'
    ? 'Salvando…'
    : saveFeedback.status === 'error'
      ? saveFeedback.detail || saveFeedback.message
      : draftDirty
        ? 'Salvando em instantes…'
        : saveFeedback.status === 'success'
          ? 'Salvo agora'
          : 'Salvo';

  const editorSaveState: 'idle' | 'saving' | 'saved' | 'error' =
    isSaving || saveFeedback.status === 'saving'
      ? 'saving'
      : saveFeedback.status === 'error'
        ? 'error'
        : draftDirty
          ? 'idle'
          : 'saved';

  const handleDelete = async () => {
    setIsDeleting(true);
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    try {
      if (draftDirtyRef.current) {
        await persistRef.current(undefined, {silent: true});
      }
      await dispatch({type: 'DELETE_CONTENT', payload: content.id});
      draftDirtyRef.current = false;
      setDraftDirty(false);
      setDeleteConfirmOpen(false);
      navigate('/criacao?tab=roteiros', {replace: true});
    } finally {
      setIsDeleting(false);
    }
  };

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
        setTab(primaryAction.targetTab);
    }
  };

  const stageLabel: Record<string, string> = {
    IDEIA: 'Ideia',
    ROTEIRO: 'Roteiro',
    PRODUCAO: 'Producao',
    EM_BLOCO: 'Em bloco',
    POSTADO: 'Postado',
  };

  const detailSection =
    activeTab === 'roteiro' ? (
      <RoteiroSection
        draft={draft}
        series={state.series}
        pilares={state.pilares}
        pilar={pillar}
        serie={serie}
        authorName={user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'}
        onChange={handleDraftChange}
        mobileComposer={mode === 'mobile'}
        autoFocusScript={mode === 'mobile' && searchParams.get('focus') === 'script'}
        layout={mode === 'desktop' ? 'workspace' : 'stack'}
        title={draft.title}
        onTitleChange={value => handleDraftChange({title: value})}
        saveState={editorSaveState}
      />
    ) : activeTab === 'publicacao' ? (
      <PublishingSection
        draft={draft}
        pilar={pillar}
        serie={serie}
        alerts={postingAlerts}
        onChange={handleDraftChange}
        isSaving={isSaving}
        onMarkPosted={() => void persist({status: CONTENT_STATUS.POSTADO})}
      />
    ) : (
      <RecordingSection
        content={mergedContent}
        stage={stage}
        recordingBlocks={state.recordingBlocks}
        allContents={state.contents}
        onPersist={persist}
        onDispatch={dispatch}
        onOpenBlockSheet={() => setIsRecordingSheetOpen(true)}
      />
    );

  const recordingSheet = (
    <SendToRecordingSheet
      open={isRecordingSheetOpen}
      onClose={() => setIsRecordingSheetOpen(false)}
      content={mergedContent}
      recordingBlocks={state.recordingBlocks}
      onPersist={persist}
      onDispatch={dispatch}
    />
  );

  const leaveConfirmModal = (
    <ConfirmModal
      open={blocker.state === 'blocked'}
      message="Você tem alterações não salvas. Sair mesmo assim?"
      confirmLabel="Sair mesmo assim"
      cancelLabel="Continuar editando"
      onConfirm={() => blocker.proceed?.()}
      onCancel={() => blocker.reset?.()}
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
          isSaving={isSaving || isDeleting}
          postingAlerts={postingAlerts}
          stageLabel={stageLabel[stage]}
          operationalPanel={
            <ContentOperationalPanel
              draft={draft}
              series={state.series}
              pilares={state.pilares}
              onChange={handleDraftChange}
              density="compact"
            />
          }
          blockName={blockSummary?.block.name ?? null}
          blockOrder={blockSummary?.order ?? null}
          section={detailSection}
          onRetrySave={() => void persist()}
          saveHint={saveHint}
          saveState={editorSaveState}
          onDelete={() => setDeleteConfirmOpen(true)}
        />
        {recordingSheet}
        {leaveConfirmModal}
        <ConfirmModal
          open={deleteConfirmOpen}
          message={`Mover este roteiro para a lixeira — ${draft.title || 'Roteiro sem título'}? Você poderá restaurá-lo depois.`}
          confirmLabel={isDeleting ? 'Movendo...' : 'Mover para a lixeira'}
          cancelLabel="Manter roteiro"
          confirmDisabled={isDeleting}
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleteConfirmOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <PageScaffold contentWidth="narrow" contentStack="none">
        <div
          className={cn(
            'flex flex-col',
            activeTab === 'roteiro' ? 'gap-4' : 'gap-6',
          )}
        >
          <div className={activeTab === 'roteiro' ? 'stack-sm' : 'contents'}>
            <ContentDetailHeader
              content={mergedContent}
              title={draft.title}
              onTitleChange={value => handleDraftChange({title: value})}
              primaryAction={primaryAction}
              onPrimaryAction={() => void handlePrimaryAction()}
              onRetrySave={() => void persist()}
              onDelete={() => setDeleteConfirmOpen(true)}
              isSaving={isSaving || isDeleting}
              blockName={blockSummary?.block.name ?? null}
              blockOrder={blockSummary?.order ?? null}
              saveHint={saveHint}
              pilar={pillar}
              authorName={user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'}
              compact={activeTab === 'roteiro'}
              breadcrumbMode={activeTab === 'roteiro' ? 'pipeline' : 'content'}
              saveState={editorSaveState}
            />

            {activeTab !== 'roteiro' ? (
              <ContentPipelineStepper
                content={mergedContent}
                activeTab={activeTab}
                visibleTabs={visibleTabs}
                stageOptions={stageOptions}
                onTabChange={setTab}
              />
            ) : null}
          </div>

          <div className={cn(activeTab === 'roteiro' ? 'gap-3' : 'gap-6', 'grid')}>
            {activeTab === 'roteiro' ? (
              detailSection
            ) : (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
                <div>{detailSection}</div>
                <aside className="stack-lg xl:border-l xl:border-[var(--border-color)] xl:pl-6">
                  <ContentOperationalPanel
                    draft={draft}
                    series={state.series}
                    pilares={state.pilares}
                    authorName={user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'}
                    onChange={handleDraftChange}
                    density="compact"
                    showTitle={false}
                  />
                </aside>
              </div>
            )}
          </div>
        </div>
      </PageScaffold>
      {recordingSheet}
      {leaveConfirmModal}
      <ConfirmModal
        open={deleteConfirmOpen}
        message={`Mover este roteiro para a lixeira — ${draft.title || 'Roteiro sem título'}? Você poderá restaurá-lo depois.`}
        confirmLabel={isDeleting ? 'Movendo...' : 'Mover para a lixeira'}
        cancelLabel="Manter roteiro"
        confirmDisabled={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </>
  );
}
