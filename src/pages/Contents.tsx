import { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PILLARS, FORMATS, STATUS_STAGES } from '../constants';
import { Plus, Table as TableIcon, Layers, Calendar, X, Check, Video, Trash2 } from 'lucide-react';
import { Content, ContentStatus } from '../types';
import { cn } from '../lib/utils';
import { ContentDetailModal } from '../components/ContentDetailModal';
import { ContentTable } from '../components/contents/ContentTable';
import { ContentEcosystem } from '../components/contents/ContentEcosystem';
import { ContentTimeline } from '../components/contents/ContentTimeline';
import { RecordingTab } from '../components/contents/RecordingTab';
import { motion, AnimatePresence } from 'motion/react';
import { PageGuide } from '../components/PageGuide';

type SortField = keyof Content | 'seriesName';
type SortDirection = 'asc' | 'desc';

export function Contents() {
  const { state, dispatch } = useAppContext();
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [filterSeries, setFilterSeries] = useState<string>('Todas');
  const [filterPillar, setFilterPillar] = useState<string>('Todos');
  const [mainTab, setMainTab] = useState<'inventory' | 'recording'>('inventory');
  const [viewMode, setViewMode] = useState<'table' | 'ecosystem' | 'timeline'>('table');
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<ContentStatus>('Pronto para Gravar');
  const [isCreatingBlock, setIsCreatingBlock] = useState(false);
  const [blockName, setBlockName] = useState('');

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
      pillar: PILLARS[0],
      format: FORMATS[0],
      status: 'Ideia',
      slotType: 'Série',
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_CONTENT', payload: newContent });
    setSelectedContent(newContent);
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
    if (window.confirm(`Tem certeza que deseja deletar ${selectedIds.size} itens?`)) {
      selectedIds.forEach(id => {
        dispatch({ type: 'DELETE_CONTENT', payload: id });
      });
      setSelectedIds(new Set());
    }
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
    <div className="h-full flex flex-col bg-[var(--bg-primary)] transition-colors duration-200">
      <PageGuide 
        pageId="inventory"
        title="O Coração da Operação"
        description="Aqui você gerencia todos os seus roteiros. Use as abas para alternar entre a visão de Tabela, Ecossistema (visual) ou Linha do Tempo. Você também pode criar 'Blocos de Gravação' para produzir em lote."
        icon={TableIcon}
      />
      <header className="px-6 md:px-10 py-6 md:py-8 border-b border-[var(--border-color)] flex flex-col md:flex-row md:items-center justify-between bg-[var(--bg-secondary)] shadow-sm sticky top-0 z-20 gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 md:gap-6 w-full">
          <div className="flex bg-[var(--bg-hover)] p-1 rounded-2xl border border-[var(--border-color)] overflow-x-auto no-scrollbar shrink-0">
             <button 
               onClick={() => setMainTab('inventory')}
               className={cn("px-5 sm:px-6 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap", mainTab === 'inventory' ? "bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-md" : "text-[var(--text-tertiary)] opacity-60 hover:opacity-100")}
             >
               Todos os Roteiros
             </button>
             <button 
               onClick={() => setMainTab('recording')}
               className={cn("px-5 sm:px-6 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 whitespace-nowrap", mainTab === 'recording' ? "bg-[var(--accent-blue)] text-white shadow-md focus:ring-0" : "text-[var(--text-tertiary)] opacity-60 hover:opacity-100")}
             >
               <Video className="w-3.5 h-3.5" /> Blocos de Gravação
             </button>
           </div>
          
          <div className="hidden sm:block h-6 w-[2px] bg-[var(--border-color)] opacity-50 shrink-0" />
          
          {mainTab === 'inventory' && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 flex-1">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs bg-[var(--bg-hover)] text-[var(--text-primary)] font-bold border-none rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--accent-blue)] cursor-pointer whitespace-nowrap"
              >
                <option>Todos</option>
                <option value="No Escuro">No Escuro 🔦</option>
                {['Ideia', 'Pronto para Gravar', 'Gravado', 'A Editar', 'Editado', 'Programado', 'Postado'].map(s => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <select
                value={filterSeries}
                onChange={(e) => setFilterSeries(e.target.value)}
                className="text-xs bg-[var(--bg-hover)] text-[var(--text-primary)] font-bold border-none rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--accent-blue)] cursor-pointer whitespace-nowrap"
              >
                <option value="Todas">Série: Todas</option>
                {state.series.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              <div className="flex bg-[var(--bg-hover)] rounded-lg p-1 border border-[var(--border-color)] ml-auto">
                <button
                  onClick={() => { setViewMode('table'); setSelectedIds(new Set()); }}
                  className={cn("p-1.5 rounded-md transition-all", viewMode === 'table' ? "bg-white dark:bg-[var(--bg-secondary)] shadow-sm text-[var(--accent-blue)]" : "opacity-40 text-[var(--text-primary)]")}
                  title="Tabela"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setViewMode('ecosystem'); setSelectedIds(new Set()); }}
                  className={cn("p-1.5 rounded-md transition-all", viewMode === 'ecosystem' ? "bg-white dark:bg-[var(--bg-secondary)] shadow-sm text-[var(--accent-blue)]" : "opacity-40 text-[var(--text-primary)]")}
                  title="Ecossistema"
                >
                  <Layers className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setViewMode('timeline'); setSelectedIds(new Set()); }}
                  className={cn("p-1.5 rounded-md transition-all", viewMode === 'timeline' ? "bg-white dark:bg-[var(--bg-secondary)] shadow-sm text-[var(--accent-blue)]" : "opacity-40 text-[var(--text-primary)]")}
                  title="Linha do Tempo"
                >
                  <Calendar className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
        {mainTab === 'inventory' && (
          <button
            onClick={handleAddContent}
            className="flex items-center justify-center gap-2 bg-[var(--text-primary)] text-[var(--bg-primary)] px-6 py-2.5 rounded-xl text-sm font-black hover:scale-105 active:scale-95 transition-all shadow-lg w-full md:w-auto shrink-0"
          >
            <Plus className="w-4 h-4" /> Novo Conteúdo
          </button>
        )}
      </header>

      <div className="flex-1 overflow-auto px-6 md:px-10 py-10 custom-scrollbar">
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
                  className="px-3 py-1.5 bg-[var(--accent-blue)] text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:scale-[1.04] active:scale-[0.97] transition-all disabled:opacity-50 disabled:scale-100"
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
                  className="px-3 py-1.5 bg-[var(--accent-blue)] text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:scale-105 transition-all whitespace-nowrap"
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
          onClose={() => setSelectedContent(null)}
        />
      )}
    </div>
  );
}
