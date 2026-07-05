import {Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useLocation, useNavigate, useSearchParams} from 'react-router-dom';
import {Check, ChevronDown, Clapperboard, Lightbulb, Loader2, Plus, Table as TableIcon, Trash2, Upload, X} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {ConfirmModal} from '../../../components/feedback/modals/ConfirmModal';
import {CONFIRM, ERRORS, GLOSSARY, type ConfirmState} from '../../../lib/uiCopy';
import {AppButton} from '../../../components/ui/AppButton';
import {SkeletonList} from '../../../components/ui/Skeleton';
import {useAppContext} from '../../../context/AppContext';
import {useAuth} from '../../../context/AuthContext';
import {broadcastDataSync} from '../../../lib/syncBroadcast';
import {notifySaveFeedback} from '../../../lib/saveFeedback';
import {useIsMobile} from '../../../hooks/useIsMobile';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import {PageLayout} from '../../../layouts/page/PageLayout';
import {Content, fetchContentStatusCounts, fetchContentsPage} from '../../../lib/database';
import {usePaginatedQuery} from '../../../hooks/usePaginatedQuery';
import {ContentsMobileScreen} from '../../../mobile/screens/contents/ContentsMobileScreen';
import {ContentsDesktop} from '../components/desktop/ContentsDesktop';
import {ContentPreviewSheet} from '../components/desktop/ContentPreviewSheet';
import {ContentsToolbar} from '../components/filters/ContentsToolbar';
import {loadPipelinePreferences, savePipelinePreferences} from '../lib/pipelinePreferences';
import {buildDetailBackState} from '../../../lib/navigation/detailBack';
import {createContentDraft} from '../lib/createContentDraft';
import {buildContentDetailRoute} from '../lib/contentDetailRoute';
import {CONTENT_STATUS} from '../lib/contentPipeline';
import {normalizeRecordingTags} from '../../recording/lib/recordingWorkflow';
import {getActivePilares} from '../../settings/lib/activePilares';
import {generateUUID} from '../../../utils/uuid';
import type {RecordingBlock, RecordingBlockContent} from '../../../lib/database';
import {
  EDITORIAL_CONTENT_STATUSES,
  getContentStatusOptions,
  getEditorialContents,
  PRODUCTION_CONTENT_STATUSES,
  RECORDING_READY_STATUS,
} from '../lib/contentWorkflow';
import {ContentsListView, ContentsViewMode, SortDirection, SortField} from '../types';
import {
  buildListPageSearchParams,
  parseListLimitParam,
  parseListPageParam,
} from '../lib/contentsListUrl';

const KEEP_VALUE = '__KEEP__';
const EMPTY_VALUE = '__EMPTY__';

const CSVUploadModal = lazy(() =>
  import('../components/modals/CSVUploadModal').then(module => ({default: module.CSVUploadModal}))
);

function ModalFallback() {
  return (
    <div className="fixed inset-0 z-[120] bg-[rgba(9,13,24,0.38)] " aria-hidden="true" />
  );
}

function resolveListView(view: string | null): ContentsListView {
  if (view === 'publicados' || view === 'historico') return 'publicados';
  return 'pipeline';
}

export function ContentsPage({mode = 'editorial'}: {mode?: 'editorial' | 'history' | 'auto'}) {
  const {state, dispatch, updateContent, ensureDataDomains} = useAppContext();
  const {user, loading: authLoading} = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const requestedView = searchParams.get('view');
  const listView = mode === 'auto' ? resolveListView(requestedView) : mode === 'history' ? 'publicados' : 'pipeline';
  const pipelinePrefs = loadPipelinePreferences();
  const [filterStatus, setFilterStatus] = useState<string>(() => {
    const urlStatus = searchParams.get('status');
    if (urlStatus === RECORDING_READY_STATUS) return 'Todos';
    if (urlStatus) return urlStatus;
    return pipelinePrefs.filterStatus;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeries, setFilterSeries] = useState<string>('Todas');
  const [filterPillar, setFilterPillar] = useState<string>('Todos');
  const [viewMode, setViewMode] = useState<ContentsViewMode>(pipelinePrefs.viewMode);
  const [isCSVUploadOpen, setIsCSVUploadOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkSeriesValue, setBulkSeriesValue] = useState(KEEP_VALUE);
  const [bulkPillarValue, setBulkPillarValue] = useState(KEEP_VALUE);
  const [bulkStatusValue, setBulkStatusValue] = useState(KEEP_VALUE);
  const [bulkUpdateMessage, setBulkUpdateMessage] = useState<string | null>(null);
  const [bulkUpdateError, setBulkUpdateError] = useState<string | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockMode, setBlockMode] = useState<'novo' | 'existente'>('novo');
  const [blockName, setBlockName] = useState('');
  const [targetBlockId, setTargetBlockId] = useState<string>('');
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const desktopPage = parseListPageParam(searchParams);
  const listLimit = parseListLimitParam(searchParams);
  const mobilePage = parseListPageParam(searchParams);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({Todos: 0});
  const [isCompact, setIsCompact] = useState(pipelinePrefs.isCompact);
  const [previewContent, setPreviewContent] = useState<Content | null>(null);
  const listFiltersKey = useMemo(
    () => JSON.stringify({
      listView,
      filterStatus,
      filterSeries,
      filterPillar,
      searchTerm,
      sortField,
      sortDirection,
      viewMode,
    }),
    [filterPillar, filterSeries, filterStatus, listView, searchTerm, sortDirection, sortField, viewMode],
  );
  const previousListFiltersKeyRef = useRef(listFiltersKey);
  const pilarParamAppliedRef = useRef(false);

  const isPipeline = listView === 'pipeline';
  const isPublicados = listView === 'publicados';
  const effectiveViewMode: ContentsViewMode = isPublicados
    ? 'grid'
    : viewMode === 'kanban'
      ? 'kanban'
      : viewMode;
  const statusOptions = useMemo(() => getContentStatusOptions(isPipeline ? 'editorial' : 'history'), [isPipeline]);

  const isKanban = isPipeline && effectiveViewMode === 'kanban';

  useEffect(() => {
    void ensureDataDomains(['production']);
  }, [ensureDataDomains]);

  useEffect(() => {
    if (!isKanban) return;
    void ensureDataDomains(['content']);
  }, [ensureDataDomains, isKanban]);

  useEffect(() => {
    if (pilarParamAppliedRef.current || state.pilares.length === 0) return;
    const pilarParam = searchParams.get('pilar');
    if (pilarParam && state.pilares.some(pilar => pilar.id === pilarParam)) {
      setFilterPillar(pilarParam);
    }
    pilarParamAppliedRef.current = true;
  }, [searchParams, state.pilares]);

  const activeAssignmentPilares = useMemo(
    () => getActivePilares(state.pilares),
    [state.pilares],
  );

  const listQueryBase = useMemo(() => ({
    pageSize: listLimit,
    listMode: isPipeline ? 'editorial' as const : 'published' as const,
    status: filterStatus,
    seriesId: filterSeries,
    pilarId: filterPillar,
    search: searchTerm,
    sortField,
    sortDirection,
  }), [
    filterPillar,
    filterSeries,
    filterStatus,
    isPipeline,
    listLimit,
    searchTerm,
    sortDirection,
    sortField,
  ]);

  const listQuery = useMemo(() => ({
    ...listQueryBase,
    page: desktopPage,
  }), [desktopPage, listQueryBase]);

  const mobileListQuery = useMemo(() => ({
    ...listQueryBase,
    page: mobilePage,
    sortField: 'updatedAt' as const,
    sortDirection: 'desc' as const,
  }), [listQueryBase, mobilePage]);

  const fetchContentsPageForUser = useCallback(
    (query: typeof listQuery) => {
      if (!user) return Promise.resolve({ items: [], total: 0 });
      return fetchContentsPage(user.id, query);
    },
    [user],
  );

  const {
    items: paginatedItems,
    total: paginatedTotal,
    loading: paginatedLoading,
    reload: reloadContentsPage,
  } = usePaginatedQuery({
    namespace: 'contents',
    query: listQuery,
    enabled: !!user && !isKanban && !isMobile,
    fetchPage: fetchContentsPageForUser,
  });

  const {
    items: mobileItems,
    total: mobileTotal,
    loading: mobileLoading,
    reload: reloadMobileContentsPage,
  } = usePaginatedQuery({
    namespace: 'contents',
    query: mobileListQuery,
    enabled: !!user && !isKanban && isMobile,
    fetchPage: fetchContentsPageForUser,
  });

  const statusCountQuery = useMemo(() => ({
    listMode: isPipeline ? 'editorial' as const : 'published' as const,
    seriesId: filterSeries,
    pilarId: filterPillar,
    search: searchTerm,
  }), [filterPillar, filterSeries, isPipeline, searchTerm]);

  useEffect(() => {
    if (!user || isKanban) return;

    let active = true;
    void fetchContentStatusCounts(user.id, statusCountQuery).then(counts => {
      if (!active) return;
      setStatusCounts(counts);
    });

    return () => {
      active = false;
    };
  }, [isKanban, statusCountQuery, user]);

  useEffect(() => {
    if (!isKanban) return;
    void reloadContentsPage();
  }, [isKanban, reloadContentsPage, state.contents.length]);

  const isContentsLoading = authLoading || paginatedLoading || (isMobile && mobileLoading && mobilePage === 1);

  const filteredSeriesOptions = useMemo(
    () => state.series.map(series => ({ id: series.id, name: series.name })),
    [state.series],
  );

  const filteredPillarOptions = useMemo(
    () => state.pilares.map(pilar => ({ id: pilar.id, nome: pilar.nome })),
    [state.pilares],
  );

  const kanbanContents = useMemo(() => {
    if (!isKanban) return [];
    return getEditorialContents(state.contents).filter(content => {
      const seriesMatch = filterSeries === 'Todas' || content.seriesId === filterSeries;
      const pillarMatch = filterPillar === 'Todos' || content.pilarId === filterPillar;
      const statusMatch = filterStatus === 'Todos' || content.status === filterStatus;
      const normalizedSearch = searchTerm.trim().toLowerCase();
      const searchMatch =
        normalizedSearch.length === 0 ||
        content.title.toLowerCase().includes(normalizedSearch) ||
        (content.notes || '').toLowerCase().includes(normalizedSearch);
      return seriesMatch && pillarMatch && statusMatch && searchMatch;
    });
  }, [filterPillar, filterSeries, filterStatus, isKanban, searchTerm, state.contents]);

  const sortedContents = isKanban ? kanbanContents : paginatedItems;
  const mobileContents = isMobile ? mobileItems : sortedContents;
  const totalDesktopPages = Math.max(1, Math.ceil(paginatedTotal / listLimit));
  const paginatedDesktopContents = isKanban ? kanbanContents : paginatedItems;

  const contentById = useMemo(() => {
    const map = new Map<string, Content>();
    [...state.contents, ...paginatedItems, ...mobileItems, ...kanbanContents].forEach(content => {
      map.set(content.id, content);
    });
    return map;
  }, [kanbanContents, mobileItems, paginatedItems, state.contents]);

  const resolveSelectedContents = useCallback(() => {
    return [...selectedIds]
      .map(id => contentById.get(id))
      .filter((content): content is Content => Boolean(content));
  }, [contentById, selectedIds]);

  useEffect(() => {
    if (!isPipeline) return;
    savePipelinePreferences({viewMode, isCompact, filterStatus});
  }, [filterStatus, isCompact, isPipeline, viewMode]);

  useEffect(() => {
    if (isPublicados) {
      setViewMode('grid');
      setSelectedIds(new Set());
      setSelectionMode(false);
    }
  }, [isPublicados]);

  useEffect(() => {
    if (!selectionMode) {
      setSelectedIds(new Set());
    }
  }, [selectionMode]);

  useEffect(() => {
    if (selectedIds.size === 0) {
      setBulkSeriesValue(KEEP_VALUE);
      setBulkPillarValue(KEEP_VALUE);
      setBulkStatusValue(KEEP_VALUE);
      setBulkUpdateMessage(null);
      setBulkUpdateError(null);
      setShowBlockForm(false);
      setBlockMode('novo');
      setBlockName('');
      setTargetBlockId('');
    }
  }, [selectedIds]);

  const bulkStatusOptions = useMemo(() => {
    const uniqueStatuses = new Set<string>([
      ...EDITORIAL_CONTENT_STATUSES,
      ...PRODUCTION_CONTENT_STATUSES,
    ]);

    return Array.from(uniqueStatuses);
  }, []);

  useEffect(() => {
    if (previousListFiltersKeyRef.current === listFiltersKey) return;
    previousListFiltersKeyRef.current = listFiltersKey;
    setSearchParams(
      previous => buildListPageSearchParams(previous, 1, listLimit),
      {replace: true},
    );
  }, [listFiltersKey, listLimit, setSearchParams]);

  useEffect(() => {
    if (desktopPage <= totalDesktopPages) return;
    setSearchParams(
      previous => buildListPageSearchParams(previous, totalDesktopPages, listLimit),
      {replace: true},
    );
  }, [desktopPage, listLimit, setSearchParams, totalDesktopPages]);

  const totalMobilePages = Math.max(1, Math.ceil(mobileTotal / listLimit));

  useEffect(() => {
    if (!isMobile || mobilePage <= totalMobilePages) return;
    setSearchParams(
      previous => buildListPageSearchParams(previous, totalMobilePages, listLimit),
      {replace: true},
    );
  }, [isMobile, listLimit, mobilePage, setSearchParams, totalMobilePages]);

  const lookAlerts = useMemo(() => {
    if (!isPipeline) return {};

    const alerts: Record<string, string> = {};

    for (let i = 0; i < paginatedDesktopContents.length - 2; i += 1) {
      const current = paginatedDesktopContents[i];
      const next1 = paginatedDesktopContents[i + 1];
      const next2 = paginatedDesktopContents[i + 2];

      const currentKey = normalizeRecordingTags(current.tags || []).sort().join('|');
      const nextKey1 = normalizeRecordingTags(next1.tags || []).sort().join('|');
      const nextKey2 = normalizeRecordingTags(next2.tags || []).sort().join('|');

      if (currentKey && currentKey === nextKey1 && currentKey === nextKey2) {
        alerts[current.id] = `3 videos seguidos com os mesmos marcadores: ${normalizeRecordingTags(current.tags || []).join(', ')}`;
      }
    }

    return alerts;
  }, [isPipeline, paginatedDesktopContents]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(previous => (previous === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection('asc');
  };

  const conteudosListPath = `${location.pathname}${location.search}`;

  const handleDesktopPageChange = useCallback((page: number) => {
    setSearchParams(
      previous => buildListPageSearchParams(previous, page, listLimit),
      {replace: true},
    );
  }, [listLimit, setSearchParams]);

  const handleMobilePageChange = useCallback((page: number) => {
    setSearchParams(
      previous => buildListPageSearchParams(previous, page, listLimit),
      {replace: true},
    );
  }, [listLimit, setSearchParams]);

  const handleMobileLimitChange = useCallback((limit: number) => {
    setSearchParams(
      previous => buildListPageSearchParams(previous, 1, limit),
      {replace: true},
    );
  }, [setSearchParams]);

  const handleAddContent = () => {
    setFilterStatus(CONTENT_STATUS.ROTEIRO);
    setFilterSeries('Todas');
    setFilterPillar('Todos');
    const newContent = createContentDraft({
      title: 'Novo Conteudo',
      status: isPipeline ? CONTENT_STATUS.ROTEIRO : CONTENT_STATUS.PRODUCAO,
    });
    void dispatch({type: 'ADD_CONTENT', payload: newContent});
    navigate(`${buildContentDetailRoute(newContent.id)}&focus=script`, buildDetailBackState(conteudosListPath));
  };

  const handleToggleSelect = (id: string) => {
    if (isPublicados || !selectionMode) return;

    setSelectedIds(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (isPublicados || !selectionMode) return;

    setSelectedIds(previous => {
      const pageIds = paginatedDesktopContents.map(content => content.id);
      const everyVisibleSelected = pageIds.every(id => previous.has(id));

      if (everyVisibleSelected) {
        const next = new Set(previous);
        pageIds.forEach(id => next.delete(id));
        return next;
      }

      const next = new Set(previous);
      pageIds.forEach(id => next.add(id));
      return next;
    });
  };

  const handleBulkDelete = () => {
    const copy = CONFIRM.excluirRoteiros(selectedIds.size);
    setConfirm({
      ...copy,
      onConfirm: () => {
        selectedIds.forEach(id => dispatch({type: 'DELETE_CONTENT', payload: id}));
        setSelectedIds(new Set());
      },
    });
  };

  const commitBulkMoveToIdeas = async () => {
    if (selectedIds.size === 0 || isBulkUpdating) return;

    const contentIds = [...selectedIds];
    setIsBulkUpdating(true);
    setBulkUpdateMessage(null);
    setBulkUpdateError(null);

    try {
      await ensureDataDomains(['ideas']);
      notifySaveFeedback({
        status: 'saving',
        message: `Movendo ${contentIds.length} roteiro${contentIds.length === 1 ? '' : 's'} para Ideias...`,
      });

      await dispatch(
        {
          type: 'DEMOTE_CONTENTS_TO_IDEAS',
          payload: {contentIds, contents: resolveSelectedContents()},
        },
        {silent: true, skipBroadcast: true},
      );

      broadcastDataSync();
      notifySaveFeedback({
        status: 'success',
        message:
          contentIds.length === 1
            ? 'Roteiro movido para Ideias'
            : `${contentIds.length} roteiros movidos para Ideias`,
        href: '/ideias',
        actionLabel: 'Ver ideias',
      });
      setBulkUpdateMessage(
        contentIds.length === 1
          ? '1 roteiro movido para Ideias.'
          : `${contentIds.length} roteiros movidos para Ideias.`,
      );
      setSelectedIds(new Set());
      void reloadContentsPage();
      void reloadMobileContentsPage();
    } catch (error) {
      console.error('[ContentsPage] bulk move to ideas failed:', error);
      setBulkUpdateError(ERRORS.moverParaIdeiasMassa);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkMoveToIdeas = () => {
    const copy = CONFIRM.moverParaIdeias(selectedIds.size);
    setConfirm({
      ...copy,
      onConfirm: () => {
        void commitBulkMoveToIdeas();
      },
    });
  };

  const hasBulkChanges =
    bulkSeriesValue !== KEEP_VALUE || bulkPillarValue !== KEEP_VALUE || bulkStatusValue !== KEEP_VALUE;

  const handleBulkSetStatus = async (status: string) => {
    if (selectedIds.size === 0 || isBulkUpdating) return;

    const selectedContents = resolveSelectedContents();
    if (selectedContents.length === 0) return;

    setIsBulkUpdating(true);
    setBulkUpdateMessage(null);
    setBulkUpdateError(null);

    try {
      notifySaveFeedback({
        status: 'saving',
        message: `Atualizando ${selectedContents.length} conteudos...`,
      });

      await Promise.all(
        selectedContents.map(content =>
          updateContent(
            {
              ...content,
              status,
              updatedAt: new Date().toISOString(),
            },
            { silent: true, skipBroadcast: true }
          )
        )
      );

      broadcastDataSync();
      notifySaveFeedback({
        status: 'success',
        message: `${selectedContents.length} conteudos atualizados`,
      });
      setBulkUpdateMessage(`${selectedContents.length} conteudos marcados como "${status}".`);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('[ContentsPage] bulk status update failed:', error);
      setBulkUpdateError(ERRORS.atualizarStatusMassa);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkApply = async () => {
    if (!hasBulkChanges || selectedIds.size === 0 || isBulkUpdating) return;

    const selectedContents = resolveSelectedContents();
    if (selectedContents.length === 0) return;

    setIsBulkUpdating(true);
    setBulkUpdateMessage(null);
    setBulkUpdateError(null);

    try {
      notifySaveFeedback({
        status: 'saving',
        message: `Atualizando ${selectedContents.length} conteudos...`,
      });

      await Promise.all(
        selectedContents.map(content =>
          updateContent(
            {
              ...content,
              seriesId:
                bulkSeriesValue === KEEP_VALUE
                  ? content.seriesId
                  : bulkSeriesValue === EMPTY_VALUE
                    ? null
                    : bulkSeriesValue,
              pilarId:
                bulkPillarValue === KEEP_VALUE
                  ? content.pilarId
                  : bulkPillarValue === EMPTY_VALUE
                    ? null
                    : bulkPillarValue,
              status: bulkStatusValue === KEEP_VALUE ? content.status : bulkStatusValue,
              updatedAt: new Date().toISOString(),
            },
            { silent: true, skipBroadcast: true }
          )
        )
      );

      broadcastDataSync();
      notifySaveFeedback({
        status: 'success',
        message: `${selectedContents.length} conteudos atualizados`,
      });
      setBulkUpdateMessage(`${selectedContents.length} conteudos atualizados.`);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('[ContentsPage] bulk update failed:', error);
      setBulkUpdateError(ERRORS.aplicarAlteracoesMassa);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleCriarBloco = async () => {
    if (!blockName.trim() || selectedIds.size === 0) return;

    const selectedContents = resolveSelectedContents();
    const recordingTags = normalizeRecordingTags(
      selectedContents.flatMap(content => content.tags || [])
    );

    const block: RecordingBlock = {
      id: generateUUID(),
      userId: user?.id || '',
      name: blockName.trim(),
      lookLabel: null,
      cenarioLabel: null,
      metadata: {
        recordingTags,
        sourceContentIds: selectedContents.map(content => content.id),
      },
      createdAt: new Date().toISOString(),
      contents: [],
    };

    const blockContents: RecordingBlockContent[] = selectedContents.map((content, index) => ({
      blockId: block.id,
      contentId: content.id,
      ordem: index,
      gravado: false,
    }));

    await dispatch({type: 'ADD_RECORDING_BLOCK', payload: block});
    await dispatch({type: 'UPDATE_BLOCK_CONTENTS', payload: {blockId: block.id, contents: blockContents}});

    setSelectedIds(new Set());
    navigate(`/gravacao/${block.id}`);
  };

  const handleAddToExistingBlock = async () => {
    if (!targetBlockId || selectedIds.size === 0) return;

    const existingBlock = state.recordingBlocks.find(b => b.id === targetBlockId);
    if (!existingBlock) return;

    const existingContentIds = new Set(existingBlock.contents.map(c => c.contentId));
    const selectedContents = resolveSelectedContents().filter(content => !existingContentIds.has(content.id));

    const merged: RecordingBlockContent[] = [
      ...existingBlock.contents,
      ...selectedContents.map((content, i) => ({
        blockId: targetBlockId,
        contentId: content.id,
        ordem: existingBlock.contents.length + i,
        gravado: false,
      })),
    ];

    await dispatch({type: 'UPDATE_BLOCK_CONTENTS', payload: {blockId: targetBlockId, contents: merged}});

    setSelectedIds(new Set());
    navigate(`/gravacao/${targetBlockId}`);
  };

  const pageTitle = isPipeline ? GLOSSARY.roteiro : GLOSSARY.publicados;
  const surfaceMode = isPipeline ? 'pipeline' : 'publicados';

  const openContentDetail = (content: Content, tab: 'roteiro' | 'publicacao' = 'roteiro') => {
    navigate(buildContentDetailRoute(content.id, tab), buildDetailBackState(conteudosListPath));
  };

  const handlePreview = (content: Content) => {
    setPreviewContent(content);
  };

  const previewPillar = previewContent?.pilarId
    ? state.pilares.find(pillar => pillar.id === previewContent.pilarId) ?? null
    : null;
  const previewSeries = previewContent?.seriesId
    ? state.series.find(series => series.id === previewContent.seriesId) ?? null
    : null;

  if (isMobile) {
    return (
      <div className="min-h-full bg-[var(--bg-primary)]">
        <ContentsMobileScreen
          mode={surfaceMode}
          contents={mobileContents}
          pageSize={listLimit}
          totalItems={mobileTotal}
          currentPage={mobilePage}
          totalPages={totalMobilePages}
          series={state.series}
          pilares={state.pilares}
          isLoading={isContentsLoading}
          onPageChange={handleMobilePageChange}
          onPageSizeChange={handleMobileLimitChange}
          onSelect={content => {
            openContentDetail(content, isPublicados ? 'publicacao' : 'roteiro');
          }}
          onPreview={handlePreview}
          onCreate={handleAddContent}
          onListViewChange={view => {
            setSearchParams(previous => {
              const next = new URLSearchParams(previous);
              if (view === 'publicados') next.set('view', 'publicados');
              else next.delete('view');
              return next;
            }, {replace: true});
          }}
        />

        {isPipeline && isCSVUploadOpen && (
          <Suspense fallback={<ModalFallback />}>
            <CSVUploadModal onClose={() => setIsCSVUploadOpen(false)} />
          </Suspense>
        )}

        <ConfirmModal
          open={!!confirm}
          message={confirm?.message || ''}
          confirmLabel={confirm?.confirmLabel}
          cancelLabel={confirm?.cancelLabel}
          onConfirm={() => {
            confirm?.onConfirm();
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      </div>
    );
  }

  return (
    <PageLayout
      contentWidth="full"
      contentClassName="pb-32 md:pb-10"
      header={
        <DesktopPageHeader
          section="Operação"
          title={pageTitle}
          icon={TableIcon}
          className="mb-0"
          actions={
            isPipeline ? (
              <>
                <AppButton
                  variant="secondary"
                  leftIcon={<Upload className="h-4 w-4" />}
                  onClick={() => setIsCSVUploadOpen(true)}
                >
                  Importar CSV
                </AppButton>
                <AppButton variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={handleAddContent}>
                  Novo roteiro
                </AppButton>
              </>
            ) : undefined
          }
        />
      }
      toolbar={
        <ContentsToolbar
          listView={listView}
          isMobile={isMobile}
          viewMode={effectiveViewMode}
          searchTerm={searchTerm}
          filterStatus={filterStatus}
          filterSeries={filterSeries}
          filterPillar={filterPillar}
          sortValue={`${sortField}:${sortDirection}`}
          statusOptions={statusOptions}
          statusCounts={statusCounts}
          seriesOptions={filteredSeriesOptions}
          pillarOptions={filteredPillarOptions}
          onViewModeChange={setViewMode}
          onSearchChange={setSearchTerm}
          onFilterStatusChange={setFilterStatus}
          onFilterSeriesChange={setFilterSeries}
          onFilterPillarChange={setFilterPillar}
          onSortChange={value => {
            const [field, direction] = value.split(':') as [SortField, SortDirection];
            setSortField(field);
            setSortDirection(direction);
          }}
          onListViewChange={view => {
            setSearchParams(previous => {
              const next = new URLSearchParams(previous);
              if (view === 'publicados') next.set('view', 'publicados');
              else next.delete('view');
              return next;
            }, {replace: true});
          }}
        />
      }
    >
      {isContentsLoading ? (
        <SkeletonList
          count={8}
          variant={effectiveViewMode === 'grid' ? 'content' : 'row'}
        />
      ) : (
      <ContentsDesktop
        mode={surfaceMode}
        viewMode={effectiveViewMode}
        contents={paginatedDesktopContents}
        kanbanContents={kanbanContents}
        totalItems={isKanban ? kanbanContents.length : paginatedTotal}
        currentPage={desktopPage}
        totalPages={totalDesktopPages}
        pageSize={listLimit}
        lookAlerts={lookAlerts}
        sortField={sortField}
        sortDirection={sortDirection}
        selectedIds={selectedIds}
        selectionMode={selectionMode}
        onSelectionModeChange={setSelectionMode}
        isCompact={isCompact}
        filterStatus={filterStatus}
        onSelect={content => openContentDetail(content, isPublicados ? 'publicacao' : 'roteiro')}
        onPreview={handlePreview}
        onSort={handleSort}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
        onPageChange={handleDesktopPageChange}
      />
      )}

      <ContentPreviewSheet
        content={previewContent}
        pillar={previewPillar}
        series={previewSeries}
        onClose={() => setPreviewContent(null)}
        onOpen={content => {
          setPreviewContent(null);
          openContentDetail(content, 'roteiro');
        }}
      />

      <AnimatePresence>
        {!isPublicados && selectionMode && selectedIds.size > 0 && (
          <motion.div
            initial={{y: 80}}
            animate={{y: 0}}
            exit={{y: 80}}
            className="fixed bottom-6 left-1/2 z-30 w-[min(1100px,calc(100vw-2rem))] -translate-x-1/2 rounded-[var(--radius-overlay)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 py-3 text-[var(--text-primary)] shadow-[var(--shadow-dropdown)]"
          >
            {showBlockForm ? (
              <div className="flex flex-col gap-2.5">
                {/* Cabecalho */}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    <Clapperboard className="mr-1.5 inline h-3.5 w-3.5 opacity-70" />
                    {selectedIds.size} {selectedIds.size === 1 ? 'roteiro' : 'roteiros'} selecionados
                  </p>
                  <button
                    type="button"
                    onClick={() => { setShowBlockForm(false); setBlockMode('novo'); setBlockName(''); setTargetBlockId(''); }}
                    className="rounded-[var(--radius-pill)] p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                    aria-label="Cancelar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Toggle novo / existente */}
                <div className="flex rounded-[var(--radius-input)] bg-[var(--bg-hover)] p-0.5 w-fit">
                  {(['novo', 'existente'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setBlockMode(mode)}
                      className={`px-3 py-1 rounded-[var(--radius-input)] text-2xs font-semibold transition-colors ${
                        blockMode === mode ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {mode === 'novo' ? 'Novo bloco' : 'Bloco existente'}
                    </button>
                  ))}
                </div>

                {/* Conteudo do form */}
                {blockMode === 'novo' ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={blockName}
                      onChange={event => setBlockName(event.target.value)}
                      onKeyDown={event => event.key === 'Enter' && blockName.trim() && void handleCriarBloco()}
                      placeholder="Nome do bloco..."
                      className="h-8 flex-1 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 text-2xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--border-strong)]"
                    />
                    <button
                      type="button"
                      onClick={() => void handleCriarBloco()}
                      disabled={!blockName.trim()}
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--radius-input)] bg-[var(--text-primary)] px-3 text-2xs font-bold text-[var(--bg-primary)] transition-colors hover:opacity-90 disabled:opacity-40"
                    >
                      <Check className="h-3 w-3" />
                      Criar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <select
                      autoFocus
                      value={targetBlockId}
                      onChange={e => setTargetBlockId(e.target.value)}
                      className="h-8 flex-1 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-2 text-2xs font-medium text-[var(--text-primary)] outline-none focus:border-[var(--border-strong)]"
                    >
                      <option value="">Escolher bloco...</option>
                      {state.recordingBlocks.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void handleAddToExistingBlock()}
                      disabled={!targetBlockId}
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--radius-input)] bg-[var(--text-primary)] px-3 text-2xs font-bold text-[var(--bg-primary)] transition-colors hover:opacity-90 disabled:opacity-40"
                    >
                      <Check className="h-3 w-3" />
                      Adicionar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Contador */}
                  <span className="shrink-0 rounded-[var(--radius-pill)] bg-[var(--bg-hover)] px-2.5 py-1 text-2xs font-bold text-[var(--text-secondary)] tabular-nums">
                    {selectedIds.size} sel.
                  </span>

                  {/* Dropdowns customizados */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    <BulkDropdown
                      label="Pilar"
                      value={bulkPillarValue}
                      onChange={setBulkPillarValue}
                      options={[
                        {label: 'Sem pilar', value: EMPTY_VALUE},
                        ...activeAssignmentPilares.map(pillar => ({label: pillar.nome, value: pillar.id})),
                      ]}
                    />
                    <BulkDropdown
                      label="Série"
                      value={bulkSeriesValue}
                      onChange={setBulkSeriesValue}
                      options={[
                        {label: 'Sem série', value: EMPTY_VALUE},
                        ...state.series.map(series => ({label: series.name, value: series.id})),
                      ]}
                    />
                    <BulkDropdown
                      label="Status"
                      value={bulkStatusValue}
                      onChange={setBulkStatusValue}
                      options={bulkStatusOptions.map(status => ({label: status, value: status}))}
                    />
                  </div>

                  {/* Separador */}
                  <div className="h-5 w-px shrink-0 bg-[var(--border-color)]" />

                  {/* Acoes */}
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleBulkMoveToIdeas}
                      disabled={isBulkUpdating}
                      className="inline-flex h-8 items-center gap-1 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-2.5 text-2xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-40"
                    >
                      <Lightbulb className="h-3 w-3" />
                      Ideias
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleBulkSetStatus(CONTENT_STATUS.PRODUCAO)}
                      disabled={isBulkUpdating}
                      className="inline-flex h-8 items-center gap-1 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-2.5 text-2xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-40"
                    >
                      Produção
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkApply}
                      disabled={!hasBulkChanges || isBulkUpdating}
                      className="inline-flex h-8 items-center gap-1 rounded-[var(--radius-input)] bg-[var(--text-primary)] px-3 text-2xs font-bold text-[var(--bg-primary)] transition-colors hover:opacity-90 disabled:opacity-40"
                    >
                      {isBulkUpdating
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Check className="h-3 w-3" />}
                      Aplicar
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBlockForm(true)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-2.5 text-2xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
                    >
                      <Clapperboard className="h-3 w-3" />
                      Criar bloco
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkDelete}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-input)] bg-[color-mix(in_srgb,var(--danger),transparent_86%)] text-[var(--danger)] transition-colors hover:bg-[color-mix(in_srgb,var(--danger),transparent_78%)]"
                      aria-label="Excluir selecionados"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set())}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-input)] bg-[var(--bg-hover)] text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
                      aria-label="Limpar selecao"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {bulkUpdateError ? <p className="text-xs text-[var(--danger)]">{bulkUpdateError}</p> : null}
                {bulkUpdateMessage ? <p className="text-xs text-[var(--success)]">{bulkUpdateMessage}</p> : null}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {isPipeline && isCSVUploadOpen && (
          <Suspense fallback={<ModalFallback />}>
            <CSVUploadModal onClose={() => setIsCSVUploadOpen(false)} />
          </Suspense>
        )}

      <ConfirmModal
        open={!!confirm}
        message={confirm?.message || ''}
        confirmLabel={confirm?.confirmLabel}
        cancelLabel={confirm?.cancelLabel}
        onConfirm={() => {
          confirm?.onConfirm();
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />

      {previewContent ? (
        <ContentPreviewSheet
          content={previewContent}
          pillar={previewPillar}
          series={previewSeries}
          onClose={() => setPreviewContent(null)}
          onOpen={() => openContentDetail(previewContent)}
        />
      ) : null}
    </PageLayout>
  );
}

interface BulkDropdownOption {
  label: string;
  value: string;
}

interface BulkDropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: BulkDropdownOption[];
}

function BulkDropdown({label, value, onChange, options}: BulkDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectedLabel = options.find(opt => opt.value === value)?.label;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-2.5 text-2xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
      >
        <span className="text-2xs font-bold uppercase tracking-wide text-[var(--text-tertiary)]">{label}</span>
        {selectedLabel ? (
          <>
            <span className="text-[var(--text-tertiary)]">·</span>
            <span className="max-w-[90px] truncate text-[var(--text-primary)]">{selectedLabel}</span>
          </>
        ) : null}
        <ChevronDown className={`h-3 w-3 text-[var(--text-tertiary)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className="absolute bottom-full left-0 z-50 mb-1.5 min-w-[160px] overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] shadow-[var(--shadow-dropdown)]">
          <button
            type="button"
            onClick={() => { onChange(KEEP_VALUE); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-2xs font-medium text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"
          >
            Limpar
          </button>
          <div className="my-1 h-px bg-[var(--border-color)]" />
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-2xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            >
              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                {value === opt.value ? <Check className="h-3 w-3 stroke-[3px]" /> : null}
              </span>
              <span className="truncate">{opt.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
