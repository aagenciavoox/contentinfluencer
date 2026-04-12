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
import { PageHeader } from '../components/PageHeader';
import { useIsMobile } from '../hooks/useIsMobile';
import { useScrollDirection } from '../hooks/useScrollDirection';

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

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<ContentStatus>('Pronto para Gravar');
  const [isCreatingBlock, setIsCreatingBlock] = useState(false);
  const [blockName, setBlockName] = useState('');
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const isMobile = useIsMobile();
  const scrollDirection = useScrollDirection();

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

  // Multi-select handlers
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
    setConfirm({ message: `Tem certeza que deseja deletar ${selectedIds.size} itens?`, onConfirm: () => { selectedIds.forEach(id => { dispatch({ type: 'DELETE_CONTENT', payload: id }); }); setSelectedIds(new Set()); } });
  };

  const handleCreateBlock = () => {
    if (!blockName.trim()) return;
    const newBlock = {
      id: Math.random().toString(36).substr(2, 9),
      name: blockName,
      contentIds: Array.from(selectedIds),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_RECORDING_BLOCK', payload: newBlock });
    selectedIds.forEach(id => {
        const content = state.contents.find(c => c.id === id);
        if (content && content.status === 'Ideia') {
           dispatch({ type: 'UPDATE_CONTENT', payload: { ...content, status: 'Pronto para Gravar' } });
        }
    });
    setBlockName('');
    setIsCreatingBlock(false);
    setSelectedIds(new Set());
    alert('Bloco criado com sucesso!');
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setIsCreatingBlock(false);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)] transition-colors duration-200 w-full overflow-x-hidden">
      <PageGuide 
        pageId="inventory"
        title="O Coração da Operação"
        description="Aqui você gerencia todos os seus roteiros. Use as abas para alternar entre a visão de Tabela, Ecossistema (visual) ou Linha do Tempo. Você também pode criar 'Blocos de Gravação' para produzir em lote."
        icon={TableIcon}
      />
      
      <header className="px-5 md:px-10 pt-8 pb-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50 backdrop-blur-md sticky top-0 z-20 flex flex-col gap-4 md:gap-6 transition-colors duration-300">
        {/* ROW 1: Navegação Principal e Ações Primárias */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6">
          <div className="flex flex-wrap items-center gap-3 md:gap-6">
            <div className="flex bg-[var(--bg-hover)] p-1 rounded-2xl border border-[var(--border-color)] shrink-0 max-w-full">
              <button 
                onClick={() => setMainTab('inventory')}
                className={cn(
                  "px-4 md:px-6 py-2 md:py-2.5 text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] rounded-xl transition-all whitespace-nowrap", 
                  mainTab === 'inventory' ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)] italic hover:bg-[var(--bg-primary)]/50"
                )}
              >
                Inventário
              </button>
              <button 
                onClick={() => setMainTab('recording')}
                className={cn(
                  "px-4 md:px-6 py-2 md:py-2.5 text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] rounded-xl transition-all flex items-center gap-2 whitespace-nowrap", 
                  mainTab === 'recording' ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)] italic hover:bg-[var(--bg-primary)]/50"
                )}
              >
                <Video className="w-3 md:w-3.5 h-3 md:h-3.5" /> Blocos
              </button>
            </div>

            <div className="hidden lg:block w-px h-8 bg-[var(--border-color)]" />

            {/* View Modes (Só no inventário) */}
            {mainTab === 'inventory' && (
              <div className="flex bg-[var(--bg-hover)] rounded-xl p-1 border border-[var(--border-color)] shrink-0">
                <button
                  onClick={() => { setViewMode('table'); setSelectedIds(new Set()); }}
                  className={cn("p-2 rounded-lg transition-all", viewMode === 'table' ? "bg-[var(--bg-primary)] shadow-sm text-[var(--accent-blue)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]")}
                  title="Tabela"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setViewMode('ecosystem'); setSelectedIds(new Set()); }}
                  className={cn("p-2 rounded-lg transition-all", viewMode === 'ecosystem' ? "bg-[var(--bg-primary)] shadow-sm text-[var(--accent-blue)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]")}
                  title="Ecossistema"
                >
                  <Layers className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setViewMode('timeline'); setSelectedIds(new Set()); }}
                  className={cn("p-2 rounded-lg transition-all", viewMode === 'timeline' ? "bg-[var(--bg-primary)] shadow-sm text-[var(--accent-blue)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]")}
                  title="Linha do Tempo"
                >
                  <Calendar className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setIsCSVUploadOpen(true)}
              className="group flex-1 lg:flex-none flex items-center justify-center gap-2 bg-[var(--bg-hover)] text-[var(--text-primary)] px-3 md:px-5 py-2.5 md:py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all border border-[var(--border-color)]"
            >
              <Upload className="w-3 h-3 md:w-3.5 md:h-3.5 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]" /> <span className="hidden xs:inline">Importar</span>
            </button>
            <button
              onClick={handleAddContent}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-[var(--text-primary)] text-[var(--bg-primary)] px-4 md:px-8 py-2.5 md:py-3 rounded-xl text-[11px] md:text-sm font-black transition-all shadow-xl hover-action"
            >
              <Plus className="w-3.5 md:w-4 h-3.5 md:h-4" /> <span className="whitespace-nowrap">Novo Conteúdo</span>
            </button>
          </div>
        </div>

        {/* ROW 2: Barra de Ferramentas e Filtros */}
        {mainTab === 'inventory' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 md:gap-4">
              <div className="flex items-center gap-2 flex-1 min-w-[140px] md:min-w-[200px]">
                <select
                  value={filterSeries}
                  onChange={(e) => setFilterSeries(e.target.value)}
                  className="w-full text-[9px] md:text-[10px] font-black uppercase tracking-widest bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl px-3 md:px-4 py-2 md:py-3 focus:ring-2 focus:ring-[var(--accent-blue)]/20 cursor-pointer appearance-none shadow-sm"
                >
                  <option value="Todas">Séries</option>
                  {state.series.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

               <div className="flex items-center gap-2 flex-1 min-w-[120px] md:min-w-[160px]">
                <select
                  value={filterPillar}
                  onChange={(e) => setFilterPillar(e.target.value)}
                  className="w-full text-[9px] md:text-[10px] font-black uppercase tracking-widest bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl px-3 md:px-4 py-2 md:py-3 focus:ring-2 focus:ring-[var(--accent-blue)]/20 cursor-pointer appearance-none shadow-sm"
                >
                  <option value="Todos">Pilares</option>
                  {state.pilares.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                </select>
              </div>

              <div className="h-4 w-px bg-[var(--border-color)] hidden md:block mx-2" />

              {/* Status Bar (Compacta) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 w-full md:w-auto -mx-4 px-4 md:mx-0 md:px-0">
                {['Todos', 'No Escuro', ...STATUS_STAGES].map(s => {
                  const isActive = filterStatus === s;
                  const isSpecial = s === 'No Escuro';
                  return (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className={cn(
                        "px-3 md:px-4 py-2 md:py-2.5 text-[8px] md:text-[9px] font-black uppercase tracking-[0.1em] md:tracking-[0.15em] rounded-full transition-all whitespace-nowrap border flex items-center gap-1.5 md:gap-2",
                        isActive 
                          ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)] shadow-lg"
                          : "bg-[var(--bg-hover)] text-[var(--text-tertiary)] border-[var(--border-color)] hover:border-[var(--text-primary)]/30 hover:text-[var(--text-primary)]"
                      )}
                    >
                      {isSpecial && <span className={cn("w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-orange-500", isActive && "bg-white")} />}
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-auto px-5 md:px-10 py-10 custom-scrollbar max-w-[80rem] mx-auto w-full">
        {mainTab === 'recording' ? (
          <RecordingTab />
        ) : viewMode === 'table' ? (
          <ContentTable
            contents={sortedContents}
            onSelect={setSelectedContent}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            lookAlerts={lookAlerts}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
          />
        ) : viewMode === 'ecosystem' ? (
          <ContentEcosystem
            contents={sortedContents}
            onSelect={setSelectedContent}
            lookAlerts={lookAlerts}
            filterSeries={filterSeries}
          />
        ) : (
          <ContentTimeline
            contents={sortedContents}
            onSelect={setSelectedContent}
          />
        )}
      </div>

      {/* Barra de ação bulk */}
      <AnimatePresence>
        {mainTab === 'inventory' && selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center justify-center gap-2 px-4 py-3 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full shadow-2xl border border-white/10 w-[90%] md:w-auto"
          >
            <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap px-2">
              {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'itens'}
            </span>

            <div className="w-px h-5 bg-[var(--bg-primary)]/20 hidden md:block" />

            {isCreatingBlock ? (
              <div className="flex items-center gap-2 flex-grow">
                <input
                  type="text"
                  placeholder="Nome do bloco..."
                  value={blockName}
                  onChange={e => setBlockName(e.target.value)}
                  className="text-[10px] font-black bg-[var(--bg-primary)]/15 border-none rounded-lg px-3 py-1.5 text-[var(--bg-primary)] focus:ring-1 focus:ring-[var(--accent-blue)] placeholder-[var(--bg-primary)]/50 w-full"
                  autoFocus
                />
                <button
                  onClick={handleCreateBlock}
                  disabled={!blockName.trim()}
                  className="px-3 py-1.5 bg-[var(--accent-blue)] text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all disabled:opacity-50 hover-action"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setIsCreatingBlock(false)}
                  className="p-1.5 bg-[var(--bg-primary)]/20 text-[var(--bg-primary)] rounded-lg hover:bg-[var(--bg-primary)]/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <select
                  value={bulkStatus}
                  onChange={e => setBulkStatus(e.target.value as ContentStatus)}
                  className="text-[10px] font-black bg-[var(--bg-primary)]/15 border-none rounded-lg px-2 py-1.5 text-[var(--bg-primary)] focus:ring-0 cursor-pointer min-w-[80px]"
                >
                   <option disabled className="text-[var(--text-tertiary)]">Mover p/</option>
                  {STATUS_STAGES.map(s => (
                    <option key={s} value={s} className="text-[var(--text-primary)] bg-[var(--bg-secondary)]">
                      {s}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleApplyBulkStatus}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[var(--bg-primary)]/20 text-[var(--bg-primary)] text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-[var(--bg-primary)]/30 transition-all whitespace-nowrap"
                  title="Aplicar status"
                >
                  <Check className="w-3 h-3" />
                  <span>Aplicar</span>
                </button>

                <button
                  onClick={() => setIsCreatingBlock(true)}
                  className="px-3 py-1.5 bg-[var(--accent-blue)] text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap hover-action"
                >
                  Criar Bloco
                </button>

                <button
                  onClick={handleBulkDelete}
                  className="px-2 py-1.5 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
                  title="Deletar permanentemente"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <div className="w-px h-5 bg-[var(--bg-primary)]/20 mx-1" />

            <button
              onClick={handleClearSelection}
              className="p-1.5 hover:bg-[var(--bg-primary)]/20 rounded-lg transition-colors shrink-0"
              title="Desmarcar tudo"
            >
              <X className="w-4 h-4 opacity-70" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedContent && (
        <ContentDetailModal
          content={state.contents.find(c => c.id === selectedContent.id) || selectedContent}
          isNewContent={isNewModal}
          onClose={() => { setSelectedContent(null); setIsNewModal(false); }}
        />
      )}
      {isCSVUploadOpen && (
        <CSVUploadModal onClose={() => setIsCSVUploadOpen(false)} />
      )}
      <ConfirmModal
        open={!!confirm}
        message={confirm?.message || ''}
        onConfirm={() => { confirm?.onConfirm(); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
