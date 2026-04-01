import { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PILLARS, FORMATS, STATUS_STAGES } from '../constants';
import { Plus, Table as TableIcon, Layers, Calendar, X, Check } from 'lucide-react';
import { Content, ContentStatus } from '../types';
import { cn } from '../lib/utils';
import { ContentDetailModal } from '../components/ContentDetailModal';
import { ContentTable } from '../components/contents/ContentTable';
import { ContentEcosystem } from '../components/contents/ContentEcosystem';
import { ContentTimeline } from '../components/contents/ContentTimeline';
import { motion, AnimatePresence } from 'motion/react';

type SortField = keyof Content | 'seriesName';
type SortDirection = 'asc' | 'desc';

export function Contents() {
  const { state, dispatch } = useAppContext();
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [filterSeries, setFilterSeries] = useState<string>('Todas');
  const [filterPillar, setFilterPillar] = useState<string>('Todos');
  const [viewMode, setViewMode] = useState<'table' | 'ecosystem' | 'timeline'>('table');
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<ContentStatus>('Pronto para Gravar');

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

  const handleClearSelection = () => setSelectedIds(new Set());

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)] transition-colors duration-200">
      <header className="px-6 md:px-10 py-6 md:py-8 border-b border-[var(--border-color)] flex flex-col md:flex-row md:items-center justify-between bg-[var(--bg-secondary)] shadow-sm sticky top-0 z-20 gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 md:gap-6">
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Inventário</h1>
          <div className="hidden sm:block h-6 w-[2px] bg-[var(--border-color)] opacity-50" />
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
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

            <div className="flex bg-[var(--bg-hover)] rounded-lg p-1 border border-[var(--border-color)]">
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
        </div>
        <button
          onClick={handleAddContent}
          className="flex items-center justify-center gap-2 bg-[var(--text-primary)] text-[var(--bg-primary)] px-6 py-2.5 rounded-xl text-sm font-black hover:scale-105 active:scale-95 transition-all shadow-lg w-full md:w-auto"
        >
          <Plus className="w-4 h-4" /> Novo Conteúdo
        </button>
      </header>

      <div className="flex-1 overflow-auto px-6 md:px-10 py-10 custom-scrollbar">
        {viewMode === 'table' ? (
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
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-5 py-3.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-2xl shadow-2xl border border-white/10"
          >
            <span className="text-xs font-black uppercase tracking-widest whitespace-nowrap">
              {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'itens'}
            </span>

            <div className="w-px h-5 bg-[var(--bg-primary)]/20" />

            <span className="text-[10px] font-bold opacity-60 whitespace-nowrap">Mover para</span>

            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value as ContentStatus)}
              className="text-xs font-black bg-[var(--bg-primary)]/15 border-none rounded-lg px-3 py-1.5 text-[var(--bg-primary)] focus:ring-0 cursor-pointer"
            >
              {STATUS_STAGES.map(s => (
                <option key={s} value={s} className="text-[var(--text-primary)] bg-[var(--bg-secondary)]">
                  {s}
                </option>
              ))}
            </select>

            <button
              onClick={handleApplyBulkStatus}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[var(--bg-primary)] text-[var(--text-primary)] text-xs font-black uppercase tracking-widest rounded-xl hover:scale-[1.04] active:scale-[0.97] transition-all shadow-md whitespace-nowrap"
            >
              <Check className="w-3.5 h-3.5" />
              Aplicar
            </button>

            <button
              onClick={handleClearSelection}
              className="p-1.5 hover:bg-[var(--bg-primary)]/20 rounded-lg transition-colors"
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
