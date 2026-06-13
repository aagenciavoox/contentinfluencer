import {Suspense, lazy, useEffect, useMemo, useState} from 'react';
import {useLocation, useNavigate, useSearchParams} from 'react-router-dom';
import {Check, Loader2, Table as TableIcon, Trash2, X} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {ConfirmModal} from '../../../components/feedback/modals/ConfirmModal';
import {AppButton} from '../../../components/ui/AppButton';
import {useAppContext} from '../../../context/AppContext';
import {broadcastDataSync} from '../../../lib/syncBroadcast';
import {notifySaveFeedback} from '../../../lib/saveFeedback';
import {useIsMobile} from '../../../hooks/useIsMobile';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import {PageLayout} from '../../../layouts/page/PageLayout';
import {Content} from '../../../lib/database';
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
import {
  EDITORIAL_CONTENT_STATUSES,
  getContentStatusOptions,
  getEditorialContents,
  getPostedContents,
  PRODUCTION_CONTENT_STATUSES,
  RECORDING_READY_STATUS,
} from '../lib/contentWorkflow';
import {ContentsListView, ContentsViewMode, CONTENTS_DESKTOP_PAGE_SIZE, SortDirection, SortField} from '../types';

const MOBILE_PAGE_SIZE = 8;
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

  useEffect(() => {
    void ensureDataDomains(['production', 'content']);
  }, [ensureDataDomains]);
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
  const [bulkSeriesValue, setBulkSeriesValue] = useState(KEEP_VALUE);
  const [bulkPillarValue, setBulkPillarValue] = useState(KEEP_VALUE);
  const [bulkStatusValue, setBulkStatusValue] = useState(KEEP_VALUE);
  const [bulkUpdateMessage, setBulkUpdateMessage] = useState<string | null>(null);
  const [bulkUpdateError, setBulkUpdateError] = useState<string | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [confirm, setConfirm] = useState<{message: string; onConfirm: () => void} | null>(null);
  const [desktopPage, setDesktopPage] = useState(1);
  const [isCompact, setIsCompact] = useState(pipelinePrefs.isCompact);
  const [previewContent, setPreviewContent] = useState<Content | null>(null);

  const isPipeline = listView === 'pipeline';
  const isPublicados = listView === 'publicados';
  const effectiveViewMode: ContentsViewMode = isPublicados
    ? 'grid'
    : viewMode === 'kanban'
      ? 'kanban'
      : viewMode;
  const statusOptions = useMemo(() => getContentStatusOptions(isPipeline ? 'editorial' : 'history'), [isPipeline]);

  const matchesPipelineFilters = useMemo(() => {
    return (content: Content, includeStatusFilter: boolean) => {
      const normalizedSearch = searchTerm.trim().toLowerCase();
      const seriesName = state.series.find(series => series.id === content.seriesId)?.name || '';
      const pillarName = state.pilares.find(pillar => pillar.id === content.pilarId)?.nome || '';
      const bibliotecaItem = content.bibliotecaItemId
        ? state.bibliotecaItems.find(item => item.id === content.bibliotecaItemId)
        : null;
      const bibliotecaLabel = bibliotecaItem
        ? `${bibliotecaItem.titulo} ${bibliotecaItem.autorDiretor}`
        : '';

      if (isPublicados) {
        const dateLabel = content.publishDate
          ? new Date(content.publishDate).toLocaleDateString('pt-BR').toLowerCase()
          : '';
        return (
          normalizedSearch.length === 0 ||
          content.title.toLowerCase().includes(normalizedSearch) ||
          dateLabel.includes(normalizedSearch)
        );
      }

      const statusMatch = !includeStatusFilter || filterStatus === 'Todos' || content.status === filterStatus;
      const seriesMatch = filterSeries === 'Todas' || content.seriesId === filterSeries;
      const pillarMatch = filterPillar === 'Todos' || content.pilarId === filterPillar;
      const searchMatch =
        normalizedSearch.length === 0 ||
        content.title.toLowerCase().includes(normalizedSearch) ||
        (content.notes || '').toLowerCase().includes(normalizedSearch) ||
        seriesName.toLowerCase().includes(normalizedSearch) ||
        pillarName.toLowerCase().includes(normalizedSearch) ||
        bibliotecaLabel.toLowerCase().includes(normalizedSearch);

      return statusMatch && seriesMatch && pillarMatch && searchMatch;
    };
  }, [
    filterPillar,
    filterSeries,
    filterStatus,
    isPublicados,
    searchTerm,
    state.bibliotecaItems,
    state.pilares,
    state.series,
  ]);

  const statusCounts = useMemo(() => {
    if (!isPipeline) return {};

    const base = getEditorialContents(state.contents).filter(content =>
      matchesPipelineFilters(content, false)
    );
    const counts: Record<string, number> = {Todos: base.length};

    for (const status of EDITORIAL_CONTENT_STATUSES) {
      counts[status] = base.filter(content => content.status === status).length;
    }

    return counts;
  }, [isPipeline, matchesPipelineFilters, state.contents]);

  useEffect(() => {
    if (!isPipeline) return;
    savePipelinePreferences({viewMode, isCompact, filterStatus});
  }, [filterStatus, isCompact, isPipeline, viewMode]);

  const filteredContents = useMemo(() => {
    return (isPipeline ? getEditorialContents(state.contents) : getPostedContents(state.contents)).filter(
      content => matchesPipelineFilters(content, true)
    );
  }, [isPipeline, matchesPipelineFilters, state.contents]);

  const filteredSeriesOptions = useMemo(() => {
    const seriesSet = new Set<string>();
    filteredContents.forEach(c => {
      if (c.seriesId) seriesSet.add(c.seriesId);
    });
    return Array.from(seriesSet).map(id => {
      const s = state.series.find(s => s.id === id);
      return s ? { id: s.id, name: s.name } : null;
    }).filter(Boolean) as { id: string; name: string }[];
  }, [filteredContents, state.series]);

  const filteredPillarOptions = useMemo(() => {
    const pillarSet = new Set<string>();
    filteredContents.forEach(c => {
      if (c.pilarId) pillarSet.add(c.pilarId);
    });
    return Array.from(pillarSet).map(id => {
      const p = state.pilares.find(p => p.id === id);
      return p ? { id: p.id, nome: p.nome } : null;
    }).filter(Boolean) as { id: string; nome: string }[];
  }, [filteredContents, state.pilares]);

  useEffect(() => {
    if (isPublicados) {
      setViewMode('grid');
      setSelectedIds(new Set());
    }
  }, [isPublicados]);

  useEffect(() => {
    if (selectedIds.size === 0) {
      setBulkSeriesValue(KEEP_VALUE);
      setBulkPillarValue(KEEP_VALUE);
      setBulkStatusValue(KEEP_VALUE);
      setBulkUpdateMessage(null);
      setBulkUpdateError(null);
    }
  }, [selectedIds]);

  const sortedContents = useMemo(() => {
    return [...filteredContents].sort((a, b) => {
      const valA =
        sortField === 'seriesName'
          ? state.series.find(series => series.id === a.seriesId)?.name || ''
          : sortField === 'pillarName'
            ? state.pilares.find(pillar => pillar.id === a.pilarId)?.nome || ''
            : a[sortField as keyof Content] || '';
      const valB =
        sortField === 'seriesName'
          ? state.series.find(series => series.id === b.seriesId)?.name || ''
          : sortField === 'pillarName'
            ? state.pilares.find(pillar => pillar.id === b.pilarId)?.nome || ''
            : b[sortField as keyof Content] || '';

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredContents, sortDirection, sortField, state.pilares, state.series]);

  const mobileContents = useMemo(() => {
    return sortedContents;
  }, [sortedContents]);

  const bulkStatusOptions = useMemo(() => {
    const uniqueStatuses = new Set<string>([
      ...EDITORIAL_CONTENT_STATUSES,
      RECORDING_READY_STATUS,
      ...PRODUCTION_CONTENT_STATUSES,
    ]);

    return Array.from(uniqueStatuses);
  }, []);

  const totalDesktopPages = Math.max(1, Math.ceil(sortedContents.length / CONTENTS_DESKTOP_PAGE_SIZE));

  const paginatedDesktopContents = useMemo(() => {
    const start = (desktopPage - 1) * CONTENTS_DESKTOP_PAGE_SIZE;
    return sortedContents.slice(start, start + CONTENTS_DESKTOP_PAGE_SIZE);
  }, [desktopPage, sortedContents]);

  useEffect(() => {
    setDesktopPage(1);
  }, [listView, filterStatus, filterSeries, filterPillar, searchTerm, sortField, sortDirection, viewMode]);

  useEffect(() => {
    if (desktopPage > totalDesktopPages) {
      setDesktopPage(totalDesktopPages);
    }
  }, [desktopPage, totalDesktopPages]);

  const lookAlerts = useMemo(() => {
    if (!isPipeline) return {};

    const alerts: Record<string, string> = {};

    for (let i = 0; i < sortedContents.length - 2; i += 1) {
      const current = sortedContents[i];
      const next1 = sortedContents[i + 1];
      const next2 = sortedContents[i + 2];

      const currentKey = normalizeRecordingTags(current.tags || []).sort().join('|');
      const nextKey1 = normalizeRecordingTags(next1.tags || []).sort().join('|');
      const nextKey2 = normalizeRecordingTags(next2.tags || []).sort().join('|');

      if (currentKey && currentKey === nextKey1 && currentKey === nextKey2) {
        alerts[current.id] = `3 videos seguidos com os mesmos marcadores: ${normalizeRecordingTags(current.tags || []).join(', ')}`;
      }
    }

    return alerts;
  }, [isPipeline, sortedContents]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(previous => (previous === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection('asc');
  };

  const conteudosListPath = `${location.pathname}${location.search}`;

  const handleAddContent = () => {
    setFilterStatus(CONTENT_STATUS.ROTEIRO);
    setFilterSeries('Todas');
    setFilterPillar('Todos');
    const newContent = createContentDraft({
      title: 'Novo Conteudo',
      status: isPipeline ? CONTENT_STATUS.ROTEIRO : CONTENT_STATUS.GRAVADO,
    });
    void dispatch({type: 'ADD_CONTENT', payload: newContent});
    navigate(`${buildContentDetailRoute(newContent.id)}&focus=script`, buildDetailBackState(conteudosListPath));
  };

  const handleToggleSelect = (id: string) => {
    if (isPublicados) return;

    setSelectedIds(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (isPublicados) return;

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
    setConfirm({
      message: `Remover ${selectedIds.size} itens selecionados?`,
      onConfirm: () => {
        selectedIds.forEach(id => dispatch({type: 'DELETE_CONTENT', payload: id}));
        setSelectedIds(new Set());
      },
    });
  };

  const hasBulkChanges =
    bulkSeriesValue !== KEEP_VALUE || bulkPillarValue !== KEEP_VALUE || bulkStatusValue !== KEEP_VALUE;

  const handleBulkSetStatus = async (status: string) => {
    if (selectedIds.size === 0 || isBulkUpdating) return;

    const selectedContents = state.contents.filter(content => selectedIds.has(content.id));
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
      setBulkUpdateError('Nao foi possivel atualizar o status em massa.');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkApply = async () => {
    if (!hasBulkChanges || selectedIds.size === 0 || isBulkUpdating) return;

    const selectedContents = state.contents.filter(content => selectedIds.has(content.id));
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
      setBulkUpdateError('Nao foi possivel aplicar as alteracoes em massa.');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const pageTitle = isPipeline ? 'Pipeline' : 'Publicados';
  const surfaceMode = isPipeline ? 'pipeline' : 'publicados';

  const openContentDetail = (content: Content, tab: 'roteiro' | 'publicar' = 'roteiro') => {
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
          pageSize={MOBILE_PAGE_SIZE}
          allContents={state.contents}
          series={state.series}
          pilares={state.pilares}
          onSelect={content => {
            openContentDetail(content, isPublicados ? 'publicar' : 'roteiro');
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
          isCompact={isCompact}
        />

        {isPipeline && isCSVUploadOpen && (
          <Suspense fallback={<ModalFallback />}>
            <CSVUploadModal onClose={() => setIsCSVUploadOpen(false)} />
          </Suspense>
        )}

        <ConfirmModal
          open={!!confirm}
          message={confirm?.message || ''}
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
          section="Operacao"
          title={pageTitle}
          icon={TableIcon}
          className="mb-0"
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
          isCompact={isCompact}
          onCompactToggle={() => setIsCompact(prev => !prev)}
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
          onImportClick={() => setIsCSVUploadOpen(true)}
          onCreateClick={handleAddContent}
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
      <ContentsDesktop
        mode={surfaceMode}
        viewMode={effectiveViewMode}
        contents={paginatedDesktopContents}
        kanbanContents={sortedContents}
        totalItems={sortedContents.length}
        currentPage={desktopPage}
        totalPages={totalDesktopPages}
        lookAlerts={lookAlerts}
        sortField={sortField}
        sortDirection={sortDirection}
        selectedIds={selectedIds}
        isCompact={isCompact}
        filterStatus={filterStatus}
        onSelect={content => openContentDetail(content, isPublicados ? 'publicar' : 'roteiro')}
        onPreview={handlePreview}
        onSort={handleSort}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
        onPageChange={setDesktopPage}
      />

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
        {!isPublicados && selectedIds.size > 0 && (
          <motion.div
            initial={{y: 80}}
            animate={{y: 0}}
            exit={{y: 80}}
            className="fixed bottom-6 left-1/2 z-30 w-[min(1100px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl bg-[var(--text-primary)] px-4 py-3 text-[var(--bg-primary)] shadow-xl shadow-black/20"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 overflow-hidden">
                {/* Contador */}
                <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold tabular-nums">
                  {selectedIds.size} sel.
                </span>

                {/* Selects — largura fixa, sem wrap */}
                <div className="flex shrink-0 items-center gap-1.5">
                  <BulkSelect
                    label="Pilar"
                    value={bulkPillarValue}
                    onChange={setBulkPillarValue}
                    options={[
                      {label: 'Pilar', value: KEEP_VALUE},
                      {label: 'Sem pilar', value: EMPTY_VALUE},
                      ...state.pilares.map(pillar => ({label: pillar.nome, value: pillar.id})),
                    ]}
                  />
                  <BulkSelect
                    label="Serie"
                    value={bulkSeriesValue}
                    onChange={setBulkSeriesValue}
                    options={[
                      {label: 'Serie', value: KEEP_VALUE},
                      {label: 'Sem serie', value: EMPTY_VALUE},
                      ...state.series.map(series => ({label: series.name, value: series.id})),
                    ]}
                  />
                  <BulkSelect
                    label="Status"
                    value={bulkStatusValue}
                    onChange={setBulkStatusValue}
                    options={[
                      {label: 'Status', value: KEEP_VALUE},
                      ...bulkStatusOptions.map(status => ({label: status, value: status})),
                    ]}
                  />
                </div>

                {/* Separador */}
                <div className="h-5 w-px shrink-0 bg-white/15" />

                {/* Acoes */}
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void handleBulkSetStatus(RECORDING_READY_STATUS)}
                    disabled={isBulkUpdating}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-white/15 disabled:opacity-40"
                  >
                    Pronto p/ gravar
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkApply}
                    disabled={!hasBulkChanges || isBulkUpdating}
                    className="inline-flex h-8 items-center gap-1 rounded-lg bg-white px-3 text-[11px] font-bold text-[#0F172A] transition-colors hover:bg-white/90 disabled:opacity-40"
                  >
                    {isBulkUpdating
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Check className="h-3 w-3" />}
                    Aplicar
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20 text-red-300 transition-colors hover:bg-red-500/30"
                    aria-label="Excluir selecionados"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/60 transition-colors hover:bg-white/15 hover:text-white"
                    aria-label="Limpar selecao"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {bulkUpdateError ? <p className="text-xs text-red-300">{bulkUpdateError}</p> : null}
              {bulkUpdateMessage ? <p className="text-xs text-emerald-300">{bulkUpdateMessage}</p> : null}
            </div>
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
        onConfirm={() => {
          confirm?.onConfirm();
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </PageLayout>
  );
}

interface BulkSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{label: string; value: string}>;
}

function BulkSelect({label, value, onChange, options}: BulkSelectProps) {
  return (
    <select
      value={value}
      onChange={event => onChange(event.target.value)}
      aria-label={label}
      className="h-8 w-[115px] cursor-pointer rounded-lg border border-white/15 bg-white/10 px-2 text-[11px] font-semibold text-white outline-none transition-colors hover:bg-white/15 focus:border-white/30"
    >
      {options.map(option => (
        <option key={`${label}-${option.value}`} value={option.value} className="bg-[#1e293b] text-white">
          {option.label}
        </option>
      ))}
    </select>
  );
}
