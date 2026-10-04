import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {getSaveFeedbackState, subscribeSaveFeedback, type SaveFeedbackState} from '../../../../lib/saveFeedback';
import {useLocation, useNavigate, useSearchParams} from 'react-router-dom';
import {useNavigationBlocker} from '../../../../lib/navigation/NavigationBlockerContext';
import {resolveContentDetailBack} from '../../../../lib/navigation/detailBack';
import {SendToRecordingSheet} from '../../../../mobile/components/SendToRecordingSheet';
import {ConfirmModal} from '../../../../components/feedback/modals/ConfirmModal';
import {useAppContext} from '../../../../context/AppContext';
import {useAuth} from '../../../../context/AuthContext';
import type {Content} from '../../../../lib/database';
import {cn} from '../../../../lib/utils';
import {PageLayout} from '../../../../layouts/page/PageLayout';
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
  normalizeContentStatus,
  withProductionTag,
  type ContentDetailTab,
} from '../../lib/contentPipeline';
import {ContentDetailHeader} from './ContentDetailHeader';
import {ContentPipelineStepper} from './ContentPipelineStepper';
import {PublishingSection} from './sections/PublishingSection';
import {MarkPostedSheet} from '../MarkPostedSheet';
import {RecordingSection} from './sections/RecordingSection';
import {ContentOperationalPanel} from './ContentOperationalPanel';
import {isContentBodyLoaded} from '../../lib/contentBody';
import {RoteiroSection, type ScriptDraft} from './sections/RoteiroSection';
import {isWritingWorkspaceEnabled} from '../../../settings/lib/writingWorkspace';
import {IdeaDetailSection, IdeaOrganizationPanel} from './sections/IdeaDetailSection';
import {promoteContentToScript} from '../../lib/creationContent';
import {resolveSeriesScriptTemplate} from '../../lib/seriesScriptTemplate';
import {livroIdsEfetivos} from '../../../../lib/livroIds';

interface ContentDetailShellProps {
  content: Content;
  mode?: 'desktop' | 'mobile';
  bodyLoading?: boolean;
  bodyError?: string | null;
  onRetryBody?: () => void;
}

type ContentDraft = ScriptDraft & Pick<Content, 'energiaNecessaria'>;

function normalizePlain(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim();
  if (
    !trimmed
    || trimmed === '<p></p>'
    || trimmed === '<p><br></p>'
    || trimmed === '<p><br/></p>'
  ) {
    return '';
  }
  return trimmed;
}

function draftFromContent(content: Content): ContentDraft {
  return {
    title: content.title,
    seriesId: content.seriesId,
    pilarId: content.pilarId,
    bibliotecaItemId: content.bibliotecaItemId,
    livroIds: livroIdsEfetivos(content),
    slotType: content.slotType,
    formatoVisual: content.formatoVisual,
    funcao: content.funcao ?? null,
    funcaoOrigem: content.funcaoOrigem ?? null,
    classificacaoCongeladaEm: content.classificacaoCongeladaEm ?? null,
    contaNaGrade: content.contaNaGrade ?? true,
    energiaNecessaria: content.energiaNecessaria,
    script: content.script,
    scriptNotes: content.scriptNotes || [],
    referencias: content.referencias,
    notes: content.notes,
    writingNotes: content.writingNotes,
    status: content.status,
    publishDate: content.publishDate,
    publishTime: content.publishTime,
    recordingDate: content.recordingDate,
    postedAt: content.postedAt,
    plataformas: content.plataformas || [],
    legendaBase: content.legendaBase ?? null,
  };
}

function mergeLoadedBody(draft: ContentDraft, live: Content): ContentDraft {
  let next = draft;
  const assignIfMissing = <K extends 'script' | 'notes' | 'referencias' | 'writingNotes'>(key: K, value: ContentDraft[K]) => {
    if (draft[key] !== undefined || value === undefined) return;
    if (next === draft) next = {...draft};
    next[key] = value;
  };
  assignIfMissing('script', live.script);
  assignIfMissing('notes', live.notes);
  assignIfMissing('referencias', live.referencias);
  assignIfMissing('writingNotes', live.writingNotes);
  return next;
}

const AUTOSAVE_IDLE_MS = 5000;

type PersistDraftOptions = {advanceToReady?: boolean; silent?: boolean};

export function ContentDetailShell({
  content,
  mode = 'desktop',
  bodyLoading = false,
  bodyError = null,
  onRetryBody,
}: ContentDetailShellProps) {
  const {state, dispatch, updateContent, ensureDataDomains} = useAppContext();
  const {user} = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [draft, setDraft] = useState<ContentDraft>(() => draftFromContent(content));
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedbackState>(() => getSaveFeedbackState());
  const [isRecordingSheetOpen, setIsRecordingSheetOpen] = useState(false);
  const [recordingBlocksLoading, setRecordingBlocksLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [markPostedOpen, setMarkPostedOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const draftDirtyRef = useRef(false);
  const appliedSeriesTemplateRef = useRef<string | null>(null);
  const pendingSeriesTemplateRef = useRef<string | null>(null);
  const templatesRef = useRef(state.templates);
  const templatesReadyRef = useRef(false);
  const [templatesReady, setTemplatesReady] = useState(false);
  templatesRef.current = state.templates;
  templatesReadyRef.current = templatesReady || state.templates.length > 0;
  const [draftDirty, setDraftDirty] = useState(false);
  const [explicitSaving, setExplicitSaving] = useState(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveGenRef = useRef(0);
  const persistInFlightRef = useRef(false);
  const drainPersistQueueRef = useRef<() => Promise<void>>(async () => undefined);
  const persistQueueRef = useRef<Array<{
    updates?: Partial<Content>;
    options?: PersistDraftOptions;
    resolve: (ok: boolean) => void;
  }>>([]);
  const draftRef = useRef(draft);
  const liveContentRef = useRef(content);
  const persistRef = useRef<(
    updates?: Partial<Content>,
    options?: PersistDraftOptions
  ) => Promise<boolean>>(async () => false);
  const activeTab = getInitialTabForContext(searchParams.get('tab'));

  // Read the ref so clearing dirty before navigate is honored immediately
  // (state updates would still look dirty for one render and cancel leave).
  const blocker = useNavigationBlocker(() => draftDirtyRef.current);

  useEffect(() => subscribeSaveFeedback(() => setSaveFeedback(getSaveFeedbackState())), []);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve(ensureDataDomains(['templates'])).then(() => {
      if (!cancelled) setTemplatesReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [ensureDataDomains]);

  useEffect(() => {
    appliedSeriesTemplateRef.current = null;
    pendingSeriesTemplateRef.current = null;
  }, [content.id]);

  useEffect(() => {
    if (!isRecordingSheetOpen) {
      setRecordingBlocksLoading(false);
      return;
    }

    let cancelled = false;
    setRecordingBlocksLoading(true);
    void ensureDataDomains(['recording']).finally(() => {
      if (!cancelled) setRecordingBlocksLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [ensureDataDomains, isRecordingSheetOpen]);

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
    }, {replace: true});
  }, [activeTab, mergedContent, setSearchParams, stageOptions, visibleTabs]);

  useEffect(() => {
    if (draftDirtyRef.current) {
      setDraft(previous => mergeLoadedBody(previous, liveContent));
      return;
    }

    setDraft(draftFromContent(liveContent));
  }, [
    liveContent.id,
    liveContent.updatedAt,
    liveContent.title,
    liveContent.script,
    liveContent.status,
    liveContent.seriesId,
    liveContent.pilarId,
    liveContent.bibliotecaItemId,
    liveContent.livroIds?.join('\0'),
    liveContent.slotType,
    liveContent.formatoVisual,
    liveContent.funcao,
    liveContent.funcaoOrigem,
    liveContent.classificacaoCongeladaEm,
    liveContent.contaNaGrade,
    liveContent.energiaNecessaria,
    liveContent.scriptNotes,
    liveContent.referencias,
    liveContent.notes,
    liveContent.writingNotes,
    liveContent.publishDate,
    liveContent.publishTime,
    liveContent.recordingDate,
    liveContent.postedAt,
    liveContent.plataformas,
    liveContent.legendaBase,
  ]);

  const handleDraftChange = useCallback((incoming: Partial<ContentDraft>) => {
    setDraft(previous => {
      let updates = incoming;
      if (
        updates.status
        && normalizeContentStatus(updates.status) === CONTENT_STATUS.POSTADO
        && normalizeContentStatus(previous.status) !== CONTENT_STATUS.POSTADO
      ) {
        queueMicrotask(() => setMarkPostedOpen(true));
        const {status: _status, ...rest} = updates;
        updates = rest;
        if (Object.keys(updates).length === 0) return previous;
      }

      const nextUpdates = {...updates};
      if (
        'seriesId' in updates
        && (updates.seriesId ?? null) !== previous.seriesId
        && !('script' in updates)
        && normalizeContentStatus(previous.status) === CONTENT_STATUS.ROTEIRO
      ) {
        const resolution = resolveSeriesScriptTemplate({
          previousSeriesId: previous.seriesId,
          nextSeriesId: updates.seriesId ?? null,
          script: previous.script,
          templates: templatesRef.current,
          appliedTemplateHtml: appliedSeriesTemplateRef.current,
          templatesReady: templatesReadyRef.current,
        });
        appliedSeriesTemplateRef.current = resolution.appliedTemplateHtml;
        pendingSeriesTemplateRef.current = resolution.pendingSeriesId;
        if (resolution.script !== undefined) {
          nextUpdates.script = resolution.script;
        }
      }

      const changed = (Object.keys(nextUpdates) as Array<keyof ContentDraft>).some(key => {
        const nextValue = nextUpdates[key];
        const prevValue = previous[key];
        if (key === 'script' || key === 'notes' || key === 'referencias' || key === 'writingNotes') {
          return normalizePlain(prevValue as string | null) !== normalizePlain(nextValue as string | null);
        }
        if (key === 'scriptNotes' || key === 'plataformas' || key === 'livroIds') {
          return JSON.stringify(prevValue ?? null) !== JSON.stringify(nextValue ?? null);
        }
        return prevValue !== nextValue;
      });

      if (!changed) return previous;

      draftDirtyRef.current = true;
      saveGenRef.current += 1;
      setDraftDirty(true);

      if (updates.status && updates.status !== previous.status) {
        queueMicrotask(() => {
          void persistRef.current({status: updates.status});
        });
      }

      return {...previous, ...nextUpdates};
    });
  }, []);

  useEffect(() => {
    const seriesId = pendingSeriesTemplateRef.current;
    if (!seriesId || draft.seriesId !== seriesId) return;
    if (normalizeContentStatus(draft.status) !== CONTENT_STATUS.ROTEIRO) return;
    if (!templatesReady && state.templates.length === 0) return;

    const resolution = resolveSeriesScriptTemplate({
      previousSeriesId: null,
      nextSeriesId: seriesId,
      script: draft.script,
      templates: state.templates,
      appliedTemplateHtml: appliedSeriesTemplateRef.current,
      templatesReady: true,
    });
    if (resolution.pendingSeriesId) return;

    pendingSeriesTemplateRef.current = null;
    appliedSeriesTemplateRef.current = resolution.appliedTemplateHtml;
    if (resolution.script !== undefined) {
      handleDraftChange({script: resolution.script});
    }
  }, [draft.script, draft.seriesId, draft.status, handleDraftChange, state.templates, templatesReady]);

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
    options?: PersistDraftOptions
  ): Promise<boolean> => {
    return new Promise(resolve => {
      persistQueueRef.current.push({updates, options, resolve});
      void drainPersistQueueRef.current();
    });
  }, []);

  const runPersist = useCallback(async (
    updates?: Partial<Content>,
    options?: PersistDraftOptions
  ): Promise<boolean> => {
    const draftNow = mergeLoadedBody(draftRef.current, liveContentRef.current);
    const liveNow = liveContentRef.current;

    if (!isContentBodyLoaded(liveNow) && !isContentBodyLoaded(draftNow)) {
      return false;
    }

    const sentGen = saveGenRef.current;
    const silent = Boolean(options?.silent);
    setIsSaving(true);
    if (!silent) setExplicitSaving(true);

    try {
      let nextStatus =
        options?.advanceToReady && draftNow.status === CONTENT_STATUS.ROTEIRO
          ? CONTENT_STATUS.PRODUCAO
          : updates?.status ?? draftNow.status;

      const nextTags =
        options?.advanceToReady && draftNow.status === CONTENT_STATUS.ROTEIRO
          ? withProductionTag(updates?.tags ?? liveNow.tags ?? [], PRODUCTION_TAGS.GRAVAR)
          : updates?.tags ?? liveNow.tags;

      const statusMilestones = applyStatusMilestones(liveNow, nextStatus);

      const payload: Content = {
        ...liveNow,
        ...draftNow,
        energiaNecessaria: draftNow.energiaNecessaria,
        ...statusMilestones,
        ...updates,
        tags: nextTags,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      };

      await updateContent(payload, {silent, skipBroadcast: silent});

      if (saveGenRef.current === sentGen) {
        draftDirtyRef.current = false;
        setDraftDirty(false);
      }

      setDraft(previous => ({...previous, ...updates, status: nextStatus}));

      if (options?.advanceToReady) {
        setSearchParams(previous => {
          const next = new URLSearchParams(previous);
          next.set('tab', 'gravacao');
          return next;
        }, {replace: true});
      }

      return true;
    } catch {
      return false;
    } finally {
      setIsSaving(false);
      if (!silent) setExplicitSaving(false);
    }
  }, [setSearchParams, updateContent]);

  const drainPersistQueue = useCallback(async () => {
    if (persistInFlightRef.current) return;
    persistInFlightRef.current = true;

    try {
      while (persistQueueRef.current.length > 0) {
        const batch = persistQueueRef.current.splice(0);
        const lastExplicit = [...batch].reverse().find(item => !item.options?.silent);
        const last = lastExplicit ?? batch[batch.length - 1];
        const ok = await runPersist(last.updates, last.options);
        batch.forEach(item => item.resolve(ok));
      }
    } finally {
      persistInFlightRef.current = false;
      if (persistQueueRef.current.length > 0) {
        void drainPersistQueue();
      }
    }
  }, [runPersist]);

  persistRef.current = persist;
  drainPersistQueueRef.current = drainPersistQueue;
  draftRef.current = draft;
  liveContentRef.current = liveContent;

  useEffect(() => {
    if (!draftDirtyRef.current) return;
    if (!isContentBodyLoaded(liveContent)) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      void persistRef.current(undefined, {silent: true});
    }, AUTOSAVE_IDLE_MS);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [
    draft.energiaNecessaria,
    draft.funcao,
    draft.funcaoOrigem,
    draft.classificacaoCongeladaEm,
    draft.contaNaGrade,
    draft.formatoVisual,
    draft.bibliotecaItemId,
    draft.livroIds,
    draft.notes,
    draft.pilarId,
    draft.plataformas,
    draft.publishDate,
    draft.publishTime,
    draft.recordingDate,
    draft.referencias,
    draft.writingNotes,
    draft.script,
    draft.scriptNotes,
    draft.seriesId,
    draft.slotType,
    draft.title,
    liveContent,
  ]);

  useEffect(() => {
    const flush = () => {
      if (!draftDirtyRef.current) return;
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      void persistRef.current(undefined, {silent: true});
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return;
      event.preventDefault();
      if (!draftDirtyRef.current) return;
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      void persistRef.current();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const saveHint = isSaving || saveFeedback.status === 'saving'
    ? 'Salvando…'
    : saveFeedback.status === 'error'
      ? saveFeedback.detail || saveFeedback.message
      : draftDirty
        ? 'Não salvo'
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

  const handleSaveAndLeave = async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    for (let attempt = 0; attempt < 4 && draftDirtyRef.current; attempt += 1) {
      const ok = await persistRef.current(undefined, {silent: true});
      if (!ok) return;
    }

    if (draftDirtyRef.current) return;
    blocker.proceed?.();
  };

  const handleDiscardAndLeave = () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    draftDirtyRef.current = false;
    setDraftDirty(false);
    blocker.proceed?.();
  };

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
      // Clear dirty before leave so the navigation blocker cannot cancel it
      // after DELETE_CONTENT unmounts this shell.
      draftDirtyRef.current = false;
      setDraftDirty(false);
      setDeleteConfirmOpen(false);
      const backTo = resolveContentDetailBack(location.state as {from?: string} | null);
      await dispatch({type: 'DELETE_CONTENT', payload: content.id});
      navigate(backTo, {replace: true});
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMobileBack = () => {
    navigate(resolveContentDetailBack(location.state as {from?: string} | null));
  };

  const setTab = (tab: ContentDetailTab) => {
    if (isTabLocked(tab, mergedContent, stageOptions)) return;

    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      next.set('tab', tab);
      return next;
    }, {replace: true});
  };

  const handlePrimaryAction = async () => {
    switch (primaryAction.id) {
      case 'promote_to_script': {
        const promoted = promoteContentToScript(mergedContent);
        await persist({status: promoted.status, script: promoted.script});
        return;
      }
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
    PRODUCAO: 'Produção',
    EM_BLOCO: 'Em bloco',
    POSTADO: 'Postado',
  };

  const isIdea = normalizeContentStatus(mergedContent.status) === CONTENT_STATUS.IDEIA;
  const trashConfirmMessage = isIdea
    ? `Mover esta ideia para a lixeira — ${draft.title || 'Ideia sem título'}? Você pode restaurá-la depois.`
    : `Mover este roteiro para a lixeira — ${draft.title || 'Roteiro sem título'}? Você pode restaurá-lo depois.`;

  const detailSection =
    activeTab === 'roteiro' ? (
      isIdea ? (
        <IdeaDetailSection
          contentId={mergedContent.id}
          draft={draft}
          series={state.series}
          pilares={state.pilares}
          bibliotecaItems={state.bibliotecaItems}
          onChange={handleDraftChange}
          bodyLoading={bodyLoading}
          bodyError={bodyError}
          onRetryBody={onRetryBody}
          mobile={mode === 'mobile'}
          isSaving={explicitSaving}
          onPromote={() => void handlePrimaryAction()}
          authorName={user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'}
          saveState={editorSaveState}
          onSave={() => void persist()}
          hasUnsavedChanges={draftDirty}
        />
      ) : (
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
          writingWorkspace={mode === 'desktop' && isWritingWorkspaceEnabled(state.preferences)}
          contentId={mergedContent.id}
          title={draft.title}
          onTitleChange={value => handleDraftChange({title: value})}
          saveState={editorSaveState}
          onSave={() => void persist()}
          hasUnsavedChanges={draftDirty}
          bodyLoading={bodyLoading}
          bodyError={bodyError}
          onRetryBody={onRetryBody}
        />
      )
    ) : activeTab === 'publicacao' ? (
      <PublishingSection
        contentId={mergedContent.id}
        draft={draft}
        pilar={pillar}
        serie={serie}
        alerts={postingAlerts}
        onChange={handleDraftChange}
        isSaving={explicitSaving}
        onMarkPosted={() => setMarkPostedOpen(true)}
      />
    ) : (
      <RecordingSection
        content={mergedContent}
        stage={stage}
        recordingBlocks={state.recordingBlocks}
        allContents={state.contents}
        onPersist={async (updates, options) => {
          await persist(updates, options);
        }}
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
      blocksLoading={recordingBlocksLoading}
      onPersist={async (updates, options) => {
        await persist(updates, options);
      }}
      onDispatch={dispatch}
    />
  );

  const leaveConfirmModal = (
    <ConfirmModal
      open={blocker.state === 'blocked'}
      message="Você tem alterações não salvas."
      confirmLabel={isSaving ? 'Salvando…' : 'Salvar e sair'}
      cancelLabel="Continuar editando"
      altLabel="Sair sem salvar"
      confirmDisabled={isSaving}
      altDisabled={isSaving}
      onConfirm={() => void handleSaveAndLeave()}
      onCancel={() => blocker.reset?.()}
      onAlt={handleDiscardAndLeave}
    />
  );

  const markPostedSheet = (
    <MarkPostedSheet
      open={markPostedOpen}
      content={{
        ...mergedContent,
        ...draft,
        plataformas: draft.plataformas,
      }}
      serie={serie}
      platformName={platformId => (
        state.platforms.find(platform => platform.id === platformId || platform.nome === platformId)?.nome
        ?? platformId
      )}
      isSaving={explicitSaving}
      onClose={() => setMarkPostedOpen(false)}
      onConfirm={async marked => {
        const ok = await persist({
          status: marked.content.status,
          postedAt: marked.content.postedAt,
          funcao: marked.content.funcao,
          funcaoOrigem: marked.content.funcaoOrigem,
          classificacaoCongeladaEm: marked.content.classificacaoCongeladaEm,
          link: marked.content.link,
          plataformas: marked.publicacoes,
        });
        if (ok) setMarkPostedOpen(false);
      }}
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
          isSaving={explicitSaving || isDeleting}
          postingAlerts={postingAlerts}
          stageLabel={stageLabel[stage]}
          operationalPanel={
            isIdea ? (
              <IdeaOrganizationPanel
                draft={draft}
                series={state.series}
                pilares={state.pilares}
                bibliotecaItems={state.bibliotecaItems}
                contentId={mergedContent.id}
                onChange={handleDraftChange}
              />
            ) : (
              <ContentOperationalPanel
                draft={draft}
                series={state.series}
                pilares={state.pilares}
                onChange={handleDraftChange}
                density="compact"
                showTitle={false}
              />
            )
          }
          blockName={blockSummary?.block.name ?? null}
          blockOrder={blockSummary?.order ?? null}
          section={detailSection}
          onRetrySave={() => void persist()}
          saveHint={saveHint}
          saveState={editorSaveState}
          onBack={() => handleMobileBack()}
          onDelete={() => setDeleteConfirmOpen(true)}
          contentKind={isIdea ? 'idea' : 'script'}
        />
        {recordingSheet}
        {leaveConfirmModal}
        {markPostedSheet}
        <ConfirmModal
          open={deleteConfirmOpen}
          message={trashConfirmMessage}
          confirmLabel={isDeleting ? 'Movendo…' : 'Mover para a lixeira'}
          cancelLabel={isIdea ? 'Manter ideia' : 'Manter roteiro'}
          confirmDisabled={isDeleting}
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleteConfirmOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <PageLayout
        contentStack="none"
        header={(
          <ContentDetailHeader
            content={mergedContent}
            title={draft.title}
            onTitleChange={value => handleDraftChange({title: value})}
            primaryAction={primaryAction}
            onPrimaryAction={() => void handlePrimaryAction()}
            onRetrySave={() => void persist()}
            onDelete={() => setDeleteConfirmOpen(true)}
            isSaving={isSaving || isDeleting}
            primaryBusy={explicitSaving || isDeleting}
            blockName={blockSummary?.block.name ?? null}
            blockOrder={blockSummary?.order ?? null}
            saveHint={saveHint}
            pilar={pillar}
            authorName={user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'}
            compact={activeTab === 'roteiro'}
            breadcrumbMode={activeTab === 'roteiro' ? 'pipeline' : 'content'}
            saveState={editorSaveState}
            contentKind={isIdea ? 'idea' : 'script'}
          />
        )}
      >
        <div className={cn('flex flex-col', activeTab === 'roteiro' ? 'gap-4' : 'gap-6')}>
          {activeTab !== 'roteiro' ? (
            <ContentPipelineStepper
              content={mergedContent}
              activeTab={activeTab}
              visibleTabs={visibleTabs}
              stageOptions={stageOptions}
              onTabChange={setTab}
            />
          ) : null}

          {activeTab === 'roteiro' ? (
            detailSection
          ) : (
            <div className="grid-editor">
              <div className="min-w-0">{detailSection}</div>
              <aside className="min-w-0 stack-lg xl:border-l xl:border-[var(--border-color)] xl:pl-6">
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
      </PageLayout>
      {recordingSheet}
      {leaveConfirmModal}
      {markPostedSheet}
      <ConfirmModal
        open={deleteConfirmOpen}
      message={trashConfirmMessage}
        confirmLabel={isDeleting ? 'Movendo…' : 'Mover para a lixeira'}
        cancelLabel={isIdea ? 'Manter ideia' : 'Manter roteiro'}
        confirmDisabled={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </>
  );
}
