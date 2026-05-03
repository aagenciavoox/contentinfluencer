import {Suspense, lazy, useEffect, useMemo, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {Check, Loader2, Table as TableIcon, Trash2, X} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {ConfirmModal} from '../../../components/feedback/modals/ConfirmModal';
import {AppButton} from '../../../components/ui/AppButton';
import {useAppContext} from '../../../context/AppContext';
import {useIsMobile} from '../../../hooks/useIsMobile';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import {PageScaffold} from '../../../layouts/page/PageScaffold';
import {Content} from '../../../lib/database';
import {ContentsMobileScreen} from '../../../mobile/screens/contents/ContentsMobileScreen';
import {generateUUID} from '../../../utils/uuid';
import {ContentsDesktop} from '../components/desktop/ContentsDesktop';
import {ContentsToolbar} from '../components/filters/ContentsToolbar';
import {normalizeRecordingTags} from '../../recording/lib/recordingWorkflow';
import {
  EDITORIAL_CONTENT_STATUSES,
  getContentStatusOptions,
  getEditorialContents,
  getPostedContents,
  getPostingContents,
  PRODUCTION_CONTENT_STATUSES,
  RECORDING_READY_STATUS,
} from '../lib/contentWorkflow';
import {ContentsViewMode, PostingTab, SortDirection, SortField} from '../types';

const DESKTOP_PAGE_SIZE = 12;
const MOBILE_PAGE_SIZE = 8;
const KEEP_VALUE = '__KEEP__';
const EMPTY_VALUE = '__EMPTY__';

const ContentDetailModal = lazy(() =>
  import('../components/modals/ContentDetailModal').then(module => ({default: module.ContentDetailModal}))
);
const ScriptPreviewModal = lazy(() =>
  import('../components/modals/ScriptPreviewModal').then(module => ({default: module.ScriptPreviewModal}))
);
const PostedContentPreviewModal = lazy(() =>
  import('../components/modals/PostedContentPreviewModal').then(module => ({
    default: module.PostedContentPreviewModal,
  }))
);
const CSVUploadModal = lazy(() =>
  import('../components/modals/CSVUploadModal').then(module => ({default: module.CSVUploadModal}))
);

function ModalFallback() {
  return (
    <div className="fixed inset-0 z-[120] bg-[rgba(9,13,24,0.38)] backdrop-blur-sm" aria-hidden="true" />
  );
}

function createEmptyContent(
  state: ReturnType<typeof useAppContext>['state'],
  status: Content['status'] = 'Roteiro'
): Content {
  return {
    id: generateUUID(),
    userId: '',
    title: 'Novo Conteudo',
    status,
    slotType: null,
    seriesId: null,
    pilarId: null,
    cenarioId: null,
    lookId: null,
    formatoVisual: null,
    script: null,
    scriptNotes: [],
    tags: [],
    notes: null,
    referencias: null,
    energiaNecessaria: null,
    publishDate: null,
    recordingDate: null,
    link: null,
    bibliotecaItemId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    plataformas: [],
  };
}

export function ContentsPage({mode = 'editorial'}: {mode?: 'editorial' | 'history'}) {
  const {state, dispatch, updateContent} = useAppContext();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [postingTab, setPostingTab] = useState<PostingTab>('postagem');
  const [filterStatus, setFilterStatus] = useState<string>(
    searchParams.get('status') === RECORDING_READY_STATUS ? 'Todos' : searchParams.get('status') || 'Todos'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeries, setFilterSeries] = useState<string>('Todas');
  const [filterPillar, setFilterPillar] = useState<string>('Todos');
  const [viewMode, setViewMode] = useState<ContentsViewMode>('table');
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [previewContent, setPreviewContent] = useState<Content | null>(null);
  const [historyPreviewContent, setHistoryPreviewContent] = useState<Content | null>(null);
  const [isNewModal, setIsNewModal] = useState(false);
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

  const isEditorialMode = mode === 'editorial';
  const isPostingHistory = mode === 'history' && postingTab === 'historico';
  const effectiveViewMode = isPostingHistory ? 'grid' : viewMode;
  const statusOptions = useMemo(() => getContentStatusOptions(mode), [mode]);

  useEffect(() => {
    if (isPostingHistory) {
      setViewMode('grid');
      setSelectedIds(new Set());
    }
  }, [isPostingHistory]);

  useEffect(() => {
    if (selectedIds.size === 0) {
      setBulkSeriesValue(KEEP_VALUE);
      setBulkPillarValue(KEEP_VALUE);
      setBulkStatusValue(KEEP_VALUE);
      setBulkUpdateMessage(null);
      setBulkUpdateError(null);
    }
  }, [selectedIds]);

  const sourceContents = useMemo(() => {
    if (mode === 'editorial') return getEditorialContents(state.contents);
    return postingTab === 'historico'
      ? getPostedContents(state.contents)
      : getPostingContents(state.contents);
  }, [mode, postingTab, state.contents]);

  const filteredContents = useMemo(() => {
    return sourceContents.filter(content => {
      const normalizedSearch = searchTerm.trim().toLowerCase();
      const seriesName = state.series.find(series => series.id === content.seriesId)?.name || '';
      const pillarName = state.pilares.find(pillar => pillar.id === content.pilarId)?.nome || '';

      if (isPostingHistory) {
        const dateLabel = content.publishDate
          ? new Date(content.publishDate).toLocaleDateString('pt-BR').toLowerCase()
          : '';
        return (
          normalizedSearch.length === 0 ||
          content.title.toLowerCase().includes(normalizedSearch) ||
          dateLabel.includes(normalizedSearch)
        );
      }

      const statusMatch = filterStatus === 'Todos' || content.status === filterStatus;

      const seriesMatch = filterSeries === 'Todas' || content.seriesId === filterSeries;
      const pillarMatch = filterPillar === 'Todos' || content.pilarId === filterPillar;
      const searchMatch =
        normalizedSearch.length === 0 ||
        content.title.toLowerCase().includes(normalizedSearch) ||
        (content.notes || '').toLowerCase().includes(normalizedSearch) ||
        seriesName.toLowerCase().includes(normalizedSearch) ||
        pillarName.toLowerCase().includes(normalizedSearch);

      return statusMatch && seriesMatch && pillarMatch && searchMatch;
    });
  }, [
    filterPillar,
    filterSeries,
    filterStatus,
    isPostingHistory,
    mode,
    searchTerm,
    sourceContents,
    state.pilares,
    state.series,
  ]);

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

  const totalDesktopPages = Math.max(1, Math.ceil(sortedContents.length / DESKTOP_PAGE_SIZE));

  const paginatedDesktopContents = useMemo(() => {
    const start = (desktopPage - 1) * DESKTOP_PAGE_SIZE;
    return sortedContents.slice(start, start + DESKTOP_PAGE_SIZE);
  }, [desktopPage, sortedContents]);

  useEffect(() => {
    setDesktopPage(1);
  }, [mode, postingTab, filterStatus, filterSeries, filterPillar, searchTerm, sortField, sortDirection, viewMode]);

  useEffect(() => {
    if (desktopPage > totalDesktopPages) {
      setDesktopPage(totalDesktopPages);
    }
  }, [desktopPage, totalDesktopPages]);

  const lookAlerts = useMemo(() => {
    if (!isEditorialMode && postingTab !== 'postagem') return {};

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
  }, [isEditorialMode, postingTab, sortedContents]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(previous => (previous === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection('asc');
  };

  const handleAddContent = () => {
    setFilterStatus('Todos');
    setFilterSeries('Todas');
    setFilterPillar('Todos');
    setSelectedContent(createEmptyContent(state, isEditorialMode ? 'Roteiro' : 'Gravado'));
    setIsNewModal(true);
  };

  const handleToggleSelect = (id: string) => {
    if (isPostingHistory) return;

    setSelectedIds(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (isPostingHistory) return;

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
      message: `Tem certeza que deseja deletar ${selectedIds.size} itens?`,
      onConfirm: () => {
        selectedIds.forEach(id => dispatch({type: 'DELETE_CONTENT', payload: id}));
        setSelectedIds(new Set());
      },
    });
  };

  const hasBulkChanges =
    bulkSeriesValue !== KEEP_VALUE || bulkPillarValue !== KEEP_VALUE || bulkStatusValue !== KEEP_VALUE;

  const handleBulkApply = async () => {
    if (!hasBulkChanges || selectedIds.size === 0 || isBulkUpdating) return;

    const selectedContents = state.contents.filter(content => selectedIds.has(content.id));
    if (selectedContents.length === 0) return;

    setIsBulkUpdating(true);
    setBulkUpdateMessage(null);
    setBulkUpdateError(null);

    try {
      await Promise.all(
        selectedContents.map(content =>
          updateContent({
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
          })
        )
      );

      setBulkUpdateMessage(`${selectedContents.length} conteudos atualizados.`);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('[ContentsPage] bulk update failed:', error);
      setBulkUpdateError('Nao foi possivel aplicar as alteracoes em massa.');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const activeContent = selectedContent
    ? state.contents.find(content => content.id === selectedContent.id) || selectedContent
    : null;

  const pageTitle = isEditorialMode ? 'Conteudo' : 'Postagem';
  const pageSubtitle = isEditorialMode
    ? 'Gerencie o estoque editorial antes de cada roteiro seguir para gravacao.'
    : postingTab === 'historico'
      ? 'Consulte o historico do que ja foi postado e abra cada item em visualizacao.'
      : 'Concentre plataforma, legenda, datas e publicacao sem misturar com a criacao do roteiro.';
  const surfaceMode = isEditorialMode ? 'editorial' : isPostingHistory ? 'historico' : 'postagem';

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
            if (isPostingHistory) {
              setHistoryPreviewContent(content);
              return;
            }
            setSelectedContent(content);
          }}
          onPreview={setPreviewContent}
          onCreate={handleAddContent}
        />

        {activeContent && (
          <Suspense fallback={<ModalFallback />}>
          <ContentDetailModal
            content={activeContent}
            isNewContent={isNewModal}
            initialTab={isEditorialMode ? 'roteiro' : 'producao'}
            visibleTabs={isEditorialMode ? ['roteiro'] : ['producao']}
            onClose={() => {
              setSelectedContent(null);
              setIsNewModal(false);
            }}
          />
          </Suspense>
        )}

        {previewContent && (
          <Suspense fallback={<ModalFallback />}>
            <ScriptPreviewModal
              content={state.contents.find(content => content.id === previewContent.id) || previewContent}
              onClose={() => setPreviewContent(null)}
            />
          </Suspense>
        )}

        {historyPreviewContent && (
          <Suspense fallback={<ModalFallback />}>
            <PostedContentPreviewModal
              content={
                state.contents.find(content => content.id === historyPreviewContent.id) || historyPreviewContent
              }
              onClose={() => setHistoryPreviewContent(null)}
              onOpenScript={() => {
                setPreviewContent(historyPreviewContent);
                setHistoryPreviewContent(null);
              }}
            />
          </Suspense>
        )}

        {mode === 'editorial' && isCSVUploadOpen && (
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
    <PageScaffold
      contentWidth="full"
      contentClassName="pb-32 md:pb-10"
      header={
        <DesktopPageHeader
          section="Operacao"
          title={pageTitle}
          subtitle={pageSubtitle}
          icon={TableIcon}
          className="mb-0"
        />
      }
      toolbar={
        <ContentsToolbar
          mode={mode}
          postingTab={postingTab}
          isMobile={isMobile}
          viewMode={effectiveViewMode}
          searchTerm={searchTerm}
          filterStatus={filterStatus}
          filterSeries={filterSeries}
          filterPillar={filterPillar}
          sortValue={`${sortField}:${sortDirection}`}
          statusOptions={statusOptions}
          seriesOptions={state.series}
          pillarOptions={state.pilares}
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
          onPostingTabChange={setPostingTab}
        />
      }
    >
      <ContentsDesktop
        mode={surfaceMode}
        viewMode={effectiveViewMode}
        contents={paginatedDesktopContents}
        totalItems={sortedContents.length}
        currentPage={desktopPage}
        totalPages={totalDesktopPages}
        lookAlerts={lookAlerts}
        sortField={sortField}
        sortDirection={sortDirection}
        selectedIds={selectedIds}
        onSelect={content => {
          if (isPostingHistory) {
            setHistoryPreviewContent(content);
            return;
          }
          setSelectedContent(content);
        }}
        onPreview={setPreviewContent}
        onSort={handleSort}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
        onPageChange={setDesktopPage}
      />

      <AnimatePresence>
        {!isPostingHistory && selectedIds.size > 0 && (
          <motion.div
            initial={{y: 80}}
            animate={{y: 0}}
            exit={{y: 80}}
            className="fixed bottom-6 left-1/2 z-30 w-[min(1100px,calc(100vw-2rem))] -translate-x-1/2 rounded-[28px] bg-[var(--text-primary)] px-4 py-4 text-[var(--bg-primary)] shadow-2xl"
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]">
                  {selectedIds.size} selecionados
                </span>
                <span className="text-xs text-white/70">Aplique pilar, serie e status de uma vez.</span>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                <BulkSelect
                  label="Pilar"
                  value={bulkPillarValue}
                  onChange={setBulkPillarValue}
                  options={[
                    {label: 'Manter pilar atual', value: KEEP_VALUE},
                    {label: 'Sem pilar', value: EMPTY_VALUE},
                    ...state.pilares.map(pillar => ({label: pillar.nome, value: pillar.id})),
                  ]}
                />
                <BulkSelect
                  label="Serie"
                  value={bulkSeriesValue}
                  onChange={setBulkSeriesValue}
                  options={[
                    {label: 'Manter serie atual', value: KEEP_VALUE},
                    {label: 'Sem serie', value: EMPTY_VALUE},
                    ...state.series.map(series => ({label: series.name, value: series.id})),
                  ]}
                />
                <BulkSelect
                  label="Status"
                  value={bulkStatusValue}
                  onChange={setBulkStatusValue}
                  options={[
                    {label: 'Manter status atual', value: KEEP_VALUE},
                    ...bulkStatusOptions.map(status => ({label: status, value: status})),
                  ]}
                />

                <div className="flex flex-wrap items-end gap-2">
                  <AppButton
                    variant="primary"
                    onClick={handleBulkApply}
                    disabled={!hasBulkChanges || isBulkUpdating}
                    leftIcon={isBulkUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    className="bg-white text-[#0F172A] hover:bg-white/90"
                  >
                    Aplicar
                  </AppButton>
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    className="rounded-xl bg-red-500/20 p-3 text-red-200 transition-colors hover:bg-red-500/30"
                    aria-label="Excluir selecionados"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="rounded-xl bg-white/10 p-3 text-white transition-colors hover:bg-white/15"
                    aria-label="Limpar selecao"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {bulkUpdateError ? <p className="text-xs text-red-200">{bulkUpdateError}</p> : null}
              {bulkUpdateMessage ? <p className="text-xs text-emerald-200">{bulkUpdateMessage}</p> : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeContent && (
        <Suspense fallback={<ModalFallback />}>
          <ContentDetailModal
            content={activeContent}
            isNewContent={isNewModal}
            initialTab={isEditorialMode ? 'roteiro' : 'producao'}
            visibleTabs={isEditorialMode ? ['roteiro'] : ['producao']}
            onClose={() => {
              setSelectedContent(null);
              setIsNewModal(false);
            }}
          />
        </Suspense>
      )}

      {previewContent && (
        <Suspense fallback={<ModalFallback />}>
          <ScriptPreviewModal
            content={state.contents.find(content => content.id === previewContent.id) || previewContent}
            onClose={() => setPreviewContent(null)}
          />
        </Suspense>
      )}

      {historyPreviewContent && (
        <Suspense fallback={<ModalFallback />}>
          <PostedContentPreviewModal
            content={
              state.contents.find(content => content.id === historyPreviewContent.id) || historyPreviewContent
            }
            onClose={() => setHistoryPreviewContent(null)}
            onOpenScript={() => {
              setPreviewContent(historyPreviewContent);
              setHistoryPreviewContent(null);
            }}
          />
        </Suspense>
      )}

      {mode === 'editorial' && isCSVUploadOpen && (
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
    </PageScaffold>
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
    <label className="flex min-w-0 flex-col gap-2">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/70">{label}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="h-11 rounded-2xl border border-white/10 bg-white px-4 text-sm font-semibold text-[#0F172A] outline-none transition-colors focus:border-white/40"
      >
        {options.map(option => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
