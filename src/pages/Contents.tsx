import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { PILLARS, FORMATS, STATUS_STAGES } from '../constants';
import { Plus, Table as TableIcon, Layers, Calendar, X, Check, Video, Trash2, Upload } from 'lucide-react';
import { Content, ContentStatus } from '../types';
import { cn } from '../lib/utils';
import { ContentDetailModal } from '../components/ContentDetailModal';
import { CSVUploadModal } from '../components/CSVUploadModal';
import { ContentTable } from '../components/contents/ContentTable';
import { ContentEcosystem } from '../components/contents/ContentEcosystem';
import { ContentTimeline } from '../components/contents/ContentTimeline';
import { RecordingTab } from '../components/contents/RecordingTab';
import { motion, AnimatePresence } from 'motion/react';
import { PageGuide } from '../components/PageGuide';
import { useIsMobile } from '../hooks/useIsMobile';

type SortField = keyof Content | 'seriesName';
type SortDirection = 'asc' | 'desc';

export function Contents() {
  const { state, dispatch } = useAppContext();
  const [searchParams] = useSearchParams();
  const [filterStatus, setFilterStatus] = useState<string>(searchParams.get('status') || 'Todos');
  const [filterSeries, setFilterSeries] = useState<string>('Todas');
  const [filterPillar, setFilterPillar] = useState<string>('Todos');
  const [mainTab, setMainTab] = useState<'inventory' | 'recording'>('inventory');
  const [viewMode, setViewMode] = useState<'table' | 'ecosystem' | 'timeline'>('table');
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [isNewModal, setIsNewModal] = useState(false);
  const [isCSVUploadOpen, setIsCSVUploadOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<ContentStatus>('Pronto para Gravar');
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const isMobile = useIsMobile();

  const filteredContents = useMemo(() => {
    return state.contents.filter(c => {
      let statusMatch = filterStatus === 'Todos' || c.status === filterStatus;
      if (filterStatus === 'No Escuro') {
        statusMatch = c.status === 'Pronto para Gravar' && (!c.recordingDate || !c.lookId);
      }
      const seriesMatch = filterSeries === 'Todas' || c.seriesId === filterSeries;
      const pillarMatch = filterPillar === 'Todos' || c.pillar === filterPillar;
      return statusMatch && seriesMatch && pillarMatch;
    });
  }, [state.contents, filterStatus, filterSeries, filterPillar]);

  const sortedContents = useMemo(() => {
    const sorted = [...filteredContents].sort((a, b) => {
      let valA: any;
      let valB: any;
      if (sortField === 'seriesName') {
        valA = state.series.find(s => s.id === a.seriesId)?.name || '';
        valB = state.series.find(s => s.id === b.seriesId)?.name || '';
      } else {
        valA = a[sortField as keyof Content] || '';
        valB = b[sortField as keyof Content] || '';
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredContents, sortField, sortDirection, state.series]);

  const lookAlerts = useMemo(() => {
    const alerts: Record<string, string> = {};
    const sorted = [...sortedContents];
    for (let i = 0; i < sorted.length - 2; i++) {
      const current = sorted[i];
      const next1 = sorted[i + 1];
      const next2 = sorted[i + 2];
      if (current.lookId && current.lookId === next1.lookId && current.lookId === next2.lookId) {
        alerts[current.id] = `3 vídeos seguidos com ${current.lookId}`;
      }
    }
    return alerts;
  }, [sortedContents]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleAddContent = () => {
    const newContent: Content = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'Novo Conteúdo',
      seriesId: '',
      pillar: state.pilares[0]?.nome || 'Sem Pilar',
      format: FORMATS[0],
      status: 'Ideia',
      createdAt: new Date().toISOString(),
    };
    setSelectedContent(newContent);
    setIsNewModal(true);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === sortedContents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedContents.map(c => c.id)));
    }
  };

  const handleApplyBulkStatus = () => {
    selectedIds.forEach(id => {
      const content = state.contents.find(c => c.id === id);
      if (content) {
        dispatch({ type: 'UPDATE_CONTENT', payload: { ...content, status: bulkStatus } });
      }
    });
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    setConfirm({ 
      message: `Tem certeza que deseja deletar ${selectedIds.size} itens?`, 
      onConfirm: () => { 
        selectedIds.forEach(id => { dispatch({ type: 'DELETE_CONTENT', payload: id }); }); 
        setSelectedIds(new Set()); 
      } 
    });
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)] transition-colors duration-200 w-full overflow-x-hidden">
      <PageGuide 
        pageId="inventory"
        title="O Coração da Operação"
        description="Aqui você gerencia todos os seus roteiros."
        icon={TableIcon}
      />
      
      <header className="px-4 md:px-10 pt-6 md:pt-8 pb-3 md:pb-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50 backdrop-blur-md sticky top-0 z-20 flex flex-col gap-3 md:gap-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 md:gap-6">
          <div className="flex flex-wrap items-center gap-2 md:gap-6">
            <div className="flex bg-[var(--bg-hover)] p-0.5 rounded-xl border border-[var(--border-color)] shrink-0">
              <button 
                onClick={() => setMainTab('inventory')}
                className={cn(
                  "px-3 md:px-6 py-1.5 text-[8px] md:text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", 
                  mainTab === 'inventory' ? "bg-[var(--bg-primary)] shadow-sm" : "text-[var(--text-secondary)] italic"
                )}
              >
                Estoque
              </button>
              <button 
                onClick={() => setMainTab('recording')}
                className={cn(
                  "px-3 md:px-6 py-1.5 text-[8px] md:text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5", 
                  mainTab === 'recording' ? "bg-[var(--bg-primary)] shadow-sm" : "text-[var(--text-secondary)] italic"
                )}
              >
                <Video className="w-2.5 md:w-3.5 h-2.5 md:h-3.5" /> Blocos
              </button>
            </div>

            {mainTab === 'inventory' && !isMobile && (
              <div className="flex bg-[var(--bg-hover)] rounded-xl p-1 border border-[var(--border-color)] shrink-0">
                <button onClick={() => setViewMode('table')} className={cn("p-2 rounded-lg transition-all", viewMode === 'table' ? "bg-[var(--bg-primary)] text-[var(--accent-blue)]" : "text-[var(--text-tertiary)]")}><TableIcon className="w-4 h-4" /></button>
                <button onClick={() => setViewMode('ecosystem')} className={cn("p-2 rounded-lg transition-all", viewMode === 'ecosystem' ? "bg-[var(--bg-primary)] text-[var(--accent-blue)]" : "text-[var(--text-tertiary)]")}><Layers className="w-4 h-4" /></button>
                <button onClick={() => setViewMode('timeline')} className={cn("p-2 rounded-lg transition-all", viewMode === 'timeline' ? "bg-[var(--bg-primary)] text-[var(--accent-blue)]" : "text-[var(--text-tertiary)]")}><Calendar className="w-4 h-4" /></button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <button onClick={() => setIsCSVUploadOpen(true)} className="flex items-center justify-center gap-1.5 bg-[var(--bg-hover)] text-[var(--text-primary)] px-3 py-2 rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-widest border border-[var(--border-color)]"><Upload className="w-2.5 h-2.5" /> Importar</button>
            <button onClick={handleAddContent} className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 bg-[var(--text-primary)] text-[var(--bg-primary)] px-4 py-2 rounded-lg text-[10px] md:text-sm font-black shadow-xl"><Plus className="w-3 h-3" /> Novo Roteiro</button>
          </div>
        </div>

        {mainTab === 'inventory' && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 md:gap-4">
              <select value={filterSeries} onChange={(e) => setFilterSeries(e.target.value)} className="text-[8px] md:text-[10px] font-black uppercase bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-lg px-2 py-2">
                <option value="Todas">Séries</option>
                {state.series.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={filterPillar} onChange={(e) => setFilterPillar(e.target.value)} className="text-[8px] md:text-[10px] font-black uppercase bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-lg px-2 py-2">
                <option value="Todos">Pilares</option>
                {state.pilares.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
              </select>
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {['Todos', 'No Escuro', ...STATUS_STAGES].map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)} className={cn("shrink-0 px-2.5 py-1.5 text-[7.5px] md:text-[9px] font-black uppercase rounded-full border whitespace-nowrap", filterStatus === s ? "bg-[var(--text-primary)] text-[var(--bg-primary)]" : "bg-[var(--bg-hover)] text-[var(--text-tertiary)]")}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-auto px-4 md:px-10 py-6 md:py-10">
        {mainTab === 'recording' ? <RecordingTab /> : viewMode === 'table' ? (
          <ContentTable contents={sortedContents} onSelect={setSelectedContent} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} lookAlerts={lookAlerts} selectedIds={selectedIds} onToggleSelect={handleToggleSelect} onSelectAll={handleSelectAll} />
        ) : viewMode === 'ecosystem' ? (
          <ContentEcosystem contents={sortedContents} onSelect={setSelectedContent} lookAlerts={lookAlerts} filterSeries={filterSeries} />
        ) : (
          <ContentTimeline contents={sortedContents} onSelect={setSelectedContent} />
        )}
      </main>

      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-6 py-3 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full shadow-2xl">
            <span className="text-[10px] font-black uppercase">{selectedIds.size} selecionados</span>
            <button onClick={handleBulkDelete} className="p-2 bg-red-500/20 text-red-300 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            <button onClick={() => setSelectedIds(new Set())} className="p-2"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedContent && (
        <ContentDetailModal content={state.contents.find(c => c.id === selectedContent.id) || selectedContent} isNewContent={isNewModal} onClose={() => { setSelectedContent(null); setIsNewModal(false); }} />
      )}
      {isCSVUploadOpen && <CSVUploadModal onClose={() => setIsCSVUploadOpen(false)} />}
      <ConfirmModal open={!!confirm} message={confirm?.message || ''} onConfirm={() => { confirm?.onConfirm(); setConfirm(null); }} onCancel={() => setConfirm(null)} />
    </div>
  );
}
