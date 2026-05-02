import {Suspense, lazy, useEffect, useMemo, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {Table as TableIcon, Trash2, X} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {ConfirmModal} from '../../../components/feedback/modals/ConfirmModal';
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
  getContentStatusOptions,
  getEditorialContents,
  getPostedContents,
  getPostingContents,
  RECORDING_READY_STATUS,
} from '../lib/contentWorkflow';
import {ContentsViewMode, PostingTab, SortDirection, SortField} from '../types';

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
  status: Content['status'] = 'Ideia'
): Content {
  return {
    id: generateUUID(),
    userId: '',
    title: 'Novo Conteudo',
    status,
    slotType: null,
    seriesId: null,
    pilarId: state.pilares[0]?.id || null,
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
  const {state, dispatch} = useAppContext();
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
  const [confirm, setConfirm] = useState<{message: string; onConfirm: () => void} | null>(null);

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

      let statusMatch = filterStatus === 'Todos' || content.status === filterStatus;
      if (mode === 'editorial' && filterStatus === 'No Escuro') {
        statusMatch =
          content.status === RECORDING_READY_STATUS &&
          (!content.recordingDate || normalizeRecordingTags(content.tags || []).length === 0);
      }

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
    if (isEditorialMode && isMobile) {
      return sortedContents.filter(content => content.status === 'Roteiro');
    }

    return sortedContents;
  }, [isEditorialMode, isMobile, sortedContents]);

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
    setSelectedContent(createEmptyContent(state, isEditorialMode && isMobile ? 'Roteiro' : 'Ideia'));
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

    if (selectedIds.size === sortedContents.length) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(new Set(sortedContents.map(content => content.id)));
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
        contents={sortedContents}
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
      />

      <AnimatePresence>
        {!isPostingHistory && selectedIds.size > 0 && (
          <motion.div
            initial={{y: 80}}
            animate={{y: 0}}
            exit={{y: 80}}
            className="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[var(--text-primary)] px-6 py-3 text-[var(--bg-primary)] shadow-2xl"
          >
            <span className="text-[10px] font-black uppercase">{selectedIds.size} selecionados</span>
            <button type="button" onClick={handleBulkDelete} className="rounded-lg bg-red-500/20 p-2 text-red-300">
              <Trash2 className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setSelectedIds(new Set())} className="p-2">
              <X className="h-4 w-4" />
            </button>
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
