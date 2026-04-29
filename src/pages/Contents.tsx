import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Table as TableIcon, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { CSVUploadModal } from '../components/CSVUploadModal';
import { ContentDetailModal } from '../components/ContentDetailModal';
import { RecordingTab } from '../components/contents/RecordingTab';
import { PageScaffold } from '../components/shell/PageScaffold';
import { useIsMobile } from '../hooks/useIsMobile';
import { STATUS_STAGES } from '../constants';
import { Content } from '../lib/database';
import { ContentsDesktopView } from '../features/contents/ContentsDesktopView';
import { ContentsHeader } from '../features/contents/ContentsHeader';
import { ContentsMobileView } from '../features/contents/ContentsMobileView';
import { ContentsMainTab, ContentsViewMode, SortDirection, SortField } from '../features/contents/types';

export function Contents() {
  const { state, dispatch } = useAppContext();
  const [searchParams] = useSearchParams();
  const [filterStatus, setFilterStatus] = useState<string>(searchParams.get('status') || 'Todos');
  const [filterSeries, setFilterSeries] = useState<string>('Todas');
  const [filterPillar, setFilterPillar] = useState<string>('Todos');
  const [mainTab, setMainTab] = useState<ContentsMainTab>('inventory');
  const [viewMode, setViewMode] = useState<ContentsViewMode>('table');
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [isNewModal, setIsNewModal] = useState(false);
  const [isCSVUploadOpen, setIsCSVUploadOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const isMobile = useIsMobile();

  const filteredContents = useMemo(() => {
    return state.contents.filter((content) => {
      let statusMatch = filterStatus === 'Todos' || content.status === filterStatus;
      if (filterStatus === 'No Escuro') {
        statusMatch = content.status === 'Pronto para Gravar' && (!content.recordingDate || !content.lookId);
      }

      const seriesMatch = filterSeries === 'Todas' || content.seriesId === filterSeries;
      const pillarMatch = filterPillar === 'Todos' || content.pilarId === filterPillar;

      return statusMatch && seriesMatch && pillarMatch;
    });
  }, [state.contents, filterStatus, filterSeries, filterPillar]);

  const sortedContents = useMemo(() => {
    return [...filteredContents].sort((a, b) => {
      const valA = sortField === 'seriesName'
        ? state.series.find((series) => series.id === a.seriesId)?.name || ''
        : a[sortField as keyof Content] || '';
      const valB = sortField === 'seriesName'
        ? state.series.find((series) => series.id === b.seriesId)?.name || ''
        : b[sortField as keyof Content] || '';

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredContents, sortField, sortDirection, state.series]);

  const lookAlerts = useMemo(() => {
    const alerts: Record<string, string> = {};

    for (let i = 0; i < sortedContents.length - 2; i += 1) {
      const current = sortedContents[i];
      const next1 = sortedContents[i + 1];
      const next2 = sortedContents[i + 2];

      if (current.lookId && current.lookId === next1.lookId && current.lookId === next2.lookId) {
        alerts[current.id] = `3 vídeos seguidos com ${current.lookId}`;
      }
    }

    return alerts;
  }, [sortedContents]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection('asc');
  };

  const handleAddContent = () => {
    const newContent: Content = {
      id: Math.random().toString(36).substr(2, 9),
      userId: '',
      title: 'Novo Conteúdo',
      status: 'Ideia',
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

    setSelectedContent(newContent);
    setIsNewModal(true);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === sortedContents.length) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(new Set(sortedContents.map((content) => content.id)));
  };

  const handleBulkDelete = () => {
    setConfirm({
      message: `Tem certeza que deseja deletar ${selectedIds.size} itens?`,
      onConfirm: () => {
        selectedIds.forEach((id) => dispatch({ type: 'DELETE_CONTENT', payload: id }));
        setSelectedIds(new Set());
      },
    });
  };

  const activeContent = selectedContent
    ? state.contents.find((content) => content.id === selectedContent.id) || selectedContent
    : null;

  return (
    <PageScaffold
      guide={{
        pageId: 'inventory',
        title: 'O Coração da Operação',
        description: 'Aqui você gerencia todos os seus roteiros.',
        icon: TableIcon,
      }}
      toolbar={(
        <ContentsHeader
          isMobile={isMobile}
          mainTab={mainTab}
          viewMode={viewMode}
          filterStatus={filterStatus}
          filterSeries={filterSeries}
          filterPillar={filterPillar}
          statusStages={STATUS_STAGES}
          seriesOptions={state.series}
          pillarOptions={state.pilares}
          onMainTabChange={setMainTab}
          onViewModeChange={setViewMode}
          onFilterStatusChange={setFilterStatus}
          onFilterSeriesChange={setFilterSeries}
          onFilterPillarChange={setFilterPillar}
          onImportClick={() => setIsCSVUploadOpen(true)}
          onCreateClick={handleAddContent}
        />
      )}
    >
      {mainTab === 'recording' ? (
        <RecordingTab />
      ) : isMobile ? (
        <ContentsMobileView
          contents={sortedContents}
          lookAlerts={lookAlerts}
          sortField={sortField}
          sortDirection={sortDirection}
          selectedIds={selectedIds}
          onSelect={setSelectedContent}
          onSort={handleSort}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
        />
      ) : (
        <ContentsDesktopView
          viewMode={viewMode}
          contents={sortedContents}
          lookAlerts={lookAlerts}
          filterSeries={filterSeries}
          sortField={sortField}
          sortDirection={sortDirection}
          selectedIds={selectedIds}
          onSelect={setSelectedContent}
          onSort={handleSort}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
        />
      )}

      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-6 py-3 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full shadow-2xl"
          >
            <span className="text-[10px] font-black uppercase">{selectedIds.size} selecionados</span>
            <button type="button" onClick={handleBulkDelete} className="p-2 bg-red-500/20 text-red-300 rounded-lg">
              <Trash2 className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setSelectedIds(new Set())} className="p-2">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {activeContent && (
        <ContentDetailModal
          content={activeContent}
          isNewContent={isNewModal}
          onClose={() => {
            setSelectedContent(null);
            setIsNewModal(false);
          }}
        />
      )}

      {isCSVUploadOpen && <CSVUploadModal onClose={() => setIsCSVUploadOpen(false)} />}
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
