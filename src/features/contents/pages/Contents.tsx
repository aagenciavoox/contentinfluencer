import {useMemo, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {Table as TableIcon, Trash2, X} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {useAppContext} from '../../../context/AppContext';
import {ConfirmModal} from '../../../components/modals/ConfirmModal';
import {CSVUploadModal} from '../../../components/CSVUploadModal';
import {ContentDetailModal} from '../../../components/ContentDetailModal';
import {PageScaffold} from '../../../components/layout/PageScaffold';
import {useIsMobile} from '../../../hooks/useIsMobile';
import {STATUS_STAGES} from '../../../constants';
import {Content} from '../../../lib/database';
import {ContentsDesktopView} from '../components/ContentsDesktopView';
import {ContentsHeader} from '../components/ContentsHeader';
import {ContentsMobileView} from '../components/ContentsMobileView';
import {ContentsViewMode, SortDirection, SortField} from '../types';
import {DesktopPageHeader} from '../../../components/layout/DesktopPageHeader';
import {generateUUID} from '../../../utils/uuid';

const RECORDING_READY_STATUS = 'Pronto para Gravar';

export function Contents() {
  const {state, dispatch} = useAppContext();
  const [searchParams] = useSearchParams();
  const [filterStatus, setFilterStatus] = useState<string>(
    searchParams.get('status') === RECORDING_READY_STATUS ? 'Todos' : searchParams.get('status') || 'Todos'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeries, setFilterSeries] = useState<string>('Todas');
  const [filterPillar, setFilterPillar] = useState<string>('Todos');
  const [viewMode, setViewMode] = useState<ContentsViewMode>('table');
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [isNewModal, setIsNewModal] = useState(false);
  const [isCSVUploadOpen, setIsCSVUploadOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{message: string; onConfirm: () => void} | null>(null);
  const isMobile = useIsMobile();

  const editorialContents = useMemo(
    () => state.contents.filter(content => content.status !== RECORDING_READY_STATUS),
    [state.contents]
  );

  const filteredContents = useMemo(() => {
    return editorialContents.filter(content => {
      const normalizedSearch = searchTerm.trim().toLowerCase();
      let statusMatch = filterStatus === 'Todos' || content.status === filterStatus;
      if (filterStatus === 'No Escuro') {
        statusMatch = content.status === RECORDING_READY_STATUS && (!content.recordingDate || !content.lookId);
      }

      const seriesMatch = filterSeries === 'Todas' || content.seriesId === filterSeries;
      const pillarMatch = filterPillar === 'Todos' || content.pilarId === filterPillar;
      const seriesName = state.series.find(series => series.id === content.seriesId)?.name || '';
      const pillarName = state.pilares.find(pillar => pillar.id === content.pilarId)?.nome || '';
      const searchMatch =
        normalizedSearch.length === 0 ||
        content.title.toLowerCase().includes(normalizedSearch) ||
        (content.notes || '').toLowerCase().includes(normalizedSearch) ||
        seriesName.toLowerCase().includes(normalizedSearch) ||
        pillarName.toLowerCase().includes(normalizedSearch);

      return statusMatch && seriesMatch && pillarMatch && searchMatch;
    });
  }, [editorialContents, filterStatus, filterSeries, filterPillar, searchTerm, state.series, state.pilares]);

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
  }, [filteredContents, sortField, sortDirection, state.series, state.pilares]);

  const lookAlerts = useMemo(() => {
    const alerts: Record<string, string> = {};

    for (let i = 0; i < sortedContents.length - 2; i += 1) {
      const current = sortedContents[i];
      const next1 = sortedContents[i + 1];
      const next2 = sortedContents[i + 2];

      if (current.lookId && current.lookId === next1.lookId && current.lookId === next2.lookId) {
        alerts[current.id] = `3 videos seguidos com ${current.lookId}`;
      }
    }

    return alerts;
  }, [sortedContents]);

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

    const newContent: Content = {
      id: generateUUID(),
      userId: '',
      title: 'Novo Conteudo',
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
    setSelectedIds(previous => {
      const next = new Set(previous);
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

  return (
    <PageScaffold
      contentWidth="full"
      contentClassName="pb-32 md:pb-10"
      header={
        <DesktopPageHeader
          section="Operacao"
          title="Conteúdos"
          subtitle="Gerencie o estoque editorial antes de cada roteiro seguir para gravação."
          icon={TableIcon}
          className="mb-0"
        />
      }
      toolbar={
        <ContentsHeader
          isMobile={isMobile}
          viewMode={viewMode}
          searchTerm={searchTerm}
          filterStatus={filterStatus}
          filterSeries={filterSeries}
          filterPillar={filterPillar}
          sortValue={`${sortField}:${sortDirection}`}
          statusStages={STATUS_STAGES}
          seriesOptions={state.series}
          pillarOptions={state.pilares}
          onViewModeChange={setViewMode}
          onSearchChange={setSearchTerm}
          onFilterStatusChange={setFilterStatus}
          onFilterSeriesChange={setFilterSeries}
          onFilterPillarChange={setFilterPillar}
          onSortChange={(value) => {
            const [field, direction] = value.split(':') as [SortField, SortDirection];
            setSortField(field);
            setSortDirection(direction);
          }}
          onImportClick={() => setIsCSVUploadOpen(true)}
          onCreateClick={handleAddContent}
        />
      }
    >
      {isMobile ? (
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
