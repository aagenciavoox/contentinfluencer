import { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PARTNERSHIP_STAGES } from '../constants';
import { Plus, ChevronRight, Search, ArrowUpDown, ArrowUp, ArrowDown, X, Trash2, Briefcase, Calendar, CheckCircle2, AlertCircle, LayoutDashboard, Table as TableIcon, Wallet, Edit3 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Partnership, PartnershipStatus } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useIsMobile } from '../hooks/useIsMobile';
import { ConfirmModal } from '../components/ConfirmModal';

export function Partnerships() {
  const { state, dispatch } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Todas');
  const [sortField, setSortField] = useState<keyof Partnership>('deadline');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedPartnership, setSelectedPartnership] = useState<Partnership | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'pipeline'>('pipeline');
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const filteredPartnerships = useMemo(() => {
    return state.partnerships.filter(p => {
      const matchesSearch = p.brand.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           p.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'Todas' || p.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [state.partnerships, searchTerm, filterStatus]);

  const sortedPartnerships = useMemo(() => {
    return [...filteredPartnerships].sort((a, b) => {
      const valA = a[sortField] || '';
      const valB = b[sortField] || '';
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredPartnerships, sortField, sortOrder]);

  const handleSort = (field: keyof Partnership) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleAddPartnership = () => {
    const brand = prompt('Marca/Cliente:');
    if (!brand) return;
    const title = prompt('Título do Projeto:');
    if (!title) return;

    const newPartnership: Partnership = {
      id: Math.random().toString(36).substr(2, 9),
      brand,
      brandColor: '#' + Math.floor(Math.random()*16777215).toString(16),
      title,
      status: PARTNERSHIP_STAGES[0],
      createdAt: new Date().toISOString()
    };

    dispatch({ type: 'ADD_PARTNERSHIP', payload: newPartnership });
    setSelectedPartnership(newPartnership);
  };

  const updatePartnership = (updates: Partial<Partnership>) => {
    if (!selectedPartnership) return;
    const updated = { ...selectedPartnership, ...updates };
    setSelectedPartnership(updated);
    dispatch({ type: 'UPDATE_PARTNERSHIP', payload: updated });
  };

  const handleDeletePartnership = (id: string) => {
    setConfirm({ message: 'Tem certeza que deseja excluir esta parceria?', onConfirm: () => { dispatch({ type: 'DELETE_PARTNERSHIP', payload: id }); setSelectedPartnership(null); } });
  };

  const isMobile = useIsMobile();

  const SortIcon = ({ field }: { field: keyof Partnership }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-20" />;
    return sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 text-[var(--accent-blue)]" /> : <ArrowDown className="w-3 h-3 ml-1 text-[var(--accent-blue)]" />;
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)] transition-colors duration-200">
      <header className="px-6 md:px-10 py-6 md:py-8 border-b border-[var(--border-color)] flex flex-col md:flex-row md:items-center justify-between bg-[var(--bg-secondary)] shadow-sm sticky top-0 z-20 gap-6">
        <div className="flex items-center gap-6">
          <div className="p-3 bg-[var(--accent-blue)]/10 rounded-2xl shadow-inner">
            <Briefcase className="w-6 h-6 text-[var(--accent-blue)]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Parcerias & Publis</h1>
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-[0.2em] font-black italic">Layer 2 — Paid Projects</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex bg-[var(--bg-hover)] p-1 rounded-xl border border-[var(--border-color)]">
            <button 
              onClick={() => setViewMode('pipeline')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'pipeline' ? "bg-white dark:bg-[var(--bg-secondary)] shadow-sm text-[var(--accent-blue)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              )}
              title="Pipeline View"
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'table' ? "bg-white dark:bg-[var(--bg-secondary)] shadow-sm text-[var(--accent-blue)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              )}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={handleAddPartnership}
            className="flex items-center gap-2 bg-[var(--text-primary)] text-[var(--bg-primary)] px-6 py-2.5 rounded-xl text-sm font-black hover:scale-105 active:scale-95 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" /> NOVO PROJETO
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto bg-[var(--bg-primary)]">
        <div className="px-6 md:px-10 py-10">
          <div className="mb-10 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] group-focus-within:text-[var(--accent-blue)] transition-colors" />
              <input 
                type="text" 
                placeholder="Buscar por marca ou projeto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl text-sm focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent transition-all"
              />
            </div>
          </div>

          {viewMode === 'pipeline' ? (
            <div className="flex gap-8 overflow-x-auto pb-8 min-h-[600px] no-scrollbar">
              {PARTNERSHIP_STAGES.map(stage => {
                const stagePartnerships = state.partnerships.filter(p => p.status === stage);
                return (
                  <div key={stage} className="flex-shrink-0 w-80">
                    <div className="flex items-center justify-between mb-6 px-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">{stage}</h3>
                        <span className="text-[10px] font-black bg-[var(--bg-hover)] px-2 py-0.5 rounded-full text-[var(--text-primary)] border border-[var(--border-color)]">{stagePartnerships.length}</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {stagePartnerships.map(partnership => (
                        <motion.div
                          layoutId={partnership.id}
                          key={partnership.id}
                          onClick={() => setSelectedPartnership(partnership)}
                          className="p-6 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
                        >
                          {/* Accent bar */}
                          <div 
                            className="absolute top-0 left-0 bottom-0 w-1.5 opacity-80" 
                            style={{ backgroundColor: partnership.brandColor }} 
                          />
                          
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">{partnership.brand}</span>
                            {partnership.deadline && (
                              <div className="flex items-center gap-1.5 text-[10px] font-black text-[var(--accent-orange)]">
                                <Calendar className="w-3.5 h-3.5" />
                                {format(new Date(partnership.deadline), 'dd/MM')}
                              </div>
                            )}
                          </div>
                          
                          <h4 className="text-base font-bold text-[var(--text-primary)] mb-6 line-clamp-2 leading-snug group-hover:text-black dark:group-hover:text-white transition-colors">{partnership.title}</h4>
                          
                          <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
                            <div className="flex items-center gap-3">
                              {partnership.value && (
                                <span className="text-[10px] font-black text-[var(--text-secondary)] flex items-center gap-1">
                                  <Wallet className="w-3 h-3 opacity-40" /> R$ {partnership.value.toLocaleString()}
                                </span>
                              )}
                              {partnership.status === 'Aprovação' && (
                                <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping" />
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] opacity-20 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </motion.div>
                      ))}
                      {stagePartnerships.length === 0 && (
                        <div className="py-12 border-2 border-dashed border-[var(--border-color)] rounded-2xl flex items-center justify-center opacity-30">
                          <span className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.3em] italic">Vazio</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-color)] overflow-hidden shadow-xl transition-all">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-[var(--bg-hover)] border-b border-[var(--border-color)] text-[11px] uppercase tracking-[0.2em] text-[var(--text-tertiary)] font-black">
                      <th className="py-5 px-8 font-black cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors" onClick={() => handleSort('brand')}>
                        <div className="flex items-center">Marca <SortIcon field="brand" /></div>
                      </th>
                      <th className="py-5 px-8 font-black cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors" onClick={() => handleSort('title')}>
                        <div className="flex items-center">Projeto <SortIcon field="title" /></div>
                      </th>
                      <th className="py-5 px-8 font-black cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors" onClick={() => handleSort('status')}>
                        <div className="flex items-center">Status <SortIcon field="status" /></div>
                      </th>
                      <th className="py-5 px-8 font-black cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors" onClick={() => handleSort('deadline')}>
                        <div className="flex items-center">Deadline <SortIcon field="deadline" /></div>
                      </th>
                      <th className="py-5 px-8 font-black">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {sortedPartnerships.map((p) => (
                      <tr 
                        key={p.id} 
                        onClick={() => setSelectedPartnership(p)}
                        className="group border-b border-[var(--border-color)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
                      >
                        <td className="py-5 px-8">
                          <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: p.brandColor }} />
                            <span className="font-black text-[var(--text-primary)] group-hover:text-black dark:group-hover:text-white transition-colors uppercase tracking-wider text-xs">{p.brand}</span>
                          </div>
                        </td>
                        <td className="py-5 px-8 text-[var(--text-primary)] font-bold">{p.title}</td>
                        <td className="py-5 px-8">
                          <span className="px-3 py-1 bg-[var(--bg-hover)] text-[var(--text-secondary)] text-[10px] font-black rounded-lg uppercase border border-transparent group-hover:border-[var(--border-color)] transition-all">
                            {p.status}
                          </span>
                        </td>
                        <td className="py-5 px-8 text-[var(--text-tertiary)] font-bold text-xs uppercase">
                          {p.deadline ? format(new Date(p.deadline), 'dd/MM/yy') : '-'}
                        </td>
                        <td className="py-5 px-8">
                          <ChevronRight className="w-5 h-5 text-[var(--text-tertiary)] opacity-20 group-hover:opacity-100 transition-opacity" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedPartnership && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPartnership(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100]"
            />
            <motion.div 
              initial={{ x: '100%', opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.5 }}
              transition={{ type: 'spring', damping: 30, stiffness: 250 }}
              className="fixed top-0 right-0 h-full w-full md:w-[700px] bg-[var(--bg-primary)] shadow-[0_0_100px_rgba(0,0,0,0.5)] z-[110] flex flex-col overflow-hidden border-l border-[var(--border-color)]"
            >
              <div className="p-8 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-secondary)]">
                <div className="flex items-center gap-6">
                  <button onClick={() => setSelectedPartnership(null)} className="p-3 hover:bg-[var(--bg-hover)] rounded-full transition-all">
                    <X className="w-6 h-6 text-[var(--text-primary)] opacity-40 hover:opacity-100" />
                  </button>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleDeletePartnership(selectedPartnership.id)}
                      className="p-3 hover:bg-[var(--accent-pink)]/10 rounded-2xl transition-all group"
                      title="Excluir Projeto"
                    >
                      <Trash2 className="w-5 h-5 text-[var(--accent-pink)] opacity-40 group-hover:opacity-100" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 px-4 py-2 bg-[var(--bg-hover)] rounded-2xl border border-[var(--border-color)]">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: selectedPartnership.brandColor }} />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">{selectedPartnership.brand}</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 md:p-14 custom-scrollbar" style={{ minHeight: 0 }}>
                <div className="mb-14">
                  <textarea 
                    value={selectedPartnership.title}
                    onChange={(e) => updatePartnership({ title: e.target.value })}
                    rows={2}
                    className="text-4xl font-black text-[var(--text-primary)] bg-transparent border-none focus:ring-0 p-0 w-full mb-8 resize-none leading-tight tracking-tight placeholder:opacity-10"
                    placeholder="Título do Projeto..."
                  />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 bg-[var(--bg-secondary)] p-10 rounded-[2.5rem] border border-[var(--border-color)] shadow-inner">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.2em] ml-1">Status do Pipeline</label>
                      <select 
                        value={selectedPartnership.status}
                        onChange={(e) => updatePartnership({ status: e.target.value as PartnershipStatus })}
                        className="w-full text-xs bg-[var(--bg-hover)] border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-[var(--accent-blue)] font-bold text-[var(--text-primary)] cursor-pointer"
                      >
                        {PARTNERSHIP_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.2em] ml-1">Deadline Final</label>
                      <input 
                        type="date" 
                        value={selectedPartnership.deadline || ''}
                        onChange={(e) => updatePartnership({ deadline: e.target.value })}
                        className="w-full text-xs bg-[var(--bg-hover)] border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-[var(--accent-blue)] font-bold text-[var(--text-primary)]"
                      />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.2em] ml-1">Valor do Contrato</label>
                      <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-tertiary)]">R$</span>
                        <input 
                          type="number" 
                          value={selectedPartnership.value || ''}
                          onChange={(e) => updatePartnership({ value: parseFloat(e.target.value) })}
                          placeholder="0,00"
                          className="w-full text-xs bg-[var(--bg-hover)] border-none rounded-2xl pl-12 pr-5 py-4 focus:ring-2 focus:ring-[var(--accent-blue)] font-bold text-[var(--text-primary)]"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.2em] ml-1">Identidade Visual</label>
                      <div className="flex items-center gap-4 bg-[var(--bg-hover)] rounded-2xl px-5 py-3">
                        <input 
                          type="color" 
                          value={selectedPartnership.brandColor}
                          onChange={(e) => updatePartnership({ brandColor: e.target.value })}
                          className="w-10 h-10 rounded-xl cursor-pointer border-none bg-transparent"
                        />
                        <span className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase">{selectedPartnership.brandColor}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-12">
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-[var(--accent-blue)]/10 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-[var(--accent-blue)]" />
                      </div>
                      <h3 className="text-[11px] uppercase tracking-[0.2em] font-black text-[var(--text-primary)]">Roteiro & Briefing</h3>
                    </div>
                    <textarea 
                      value={selectedPartnership.script || ''}
                      onChange={(e) => updatePartnership({ script: e.target.value })}
                      className="w-full min-h-[300px] text-base text-[var(--text-primary)] bg-transparent border-none focus:ring-0 p-0 resize-none placeholder:italic placeholder:opacity-20 custom-scrollbar leading-relaxed font-medium"
                      placeholder="Cole aqui o briefing da marca ou desenvolva o roteiro..."
                    />
                  </section>

                  <section className="pt-12 border-t border-[var(--border-color)]">
                    <div className="flex items-center gap-3 mb-6">
                       <div className="p-2 bg-[var(--text-tertiary)]/10 rounded-xl">
                        <Edit3 className="w-4 h-4 text-[var(--text-tertiary)]" />
                      </div>
                      <h3 className="text-[11px] uppercase tracking-[0.2em] font-black text-[var(--text-primary)]">Notas e Estratégia</h3>
                    </div>
                    <textarea 
                      value={selectedPartnership.notes || ''}
                      onChange={(e) => updatePartnership({ notes: e.target.value })}
                      className="w-full min-h-[150px] text-base text-[var(--text-primary)] bg-transparent border-none focus:ring-0 p-0 resize-none placeholder:italic placeholder:opacity-20 custom-scrollbar leading-relaxed font-medium"
                      placeholder="Lembretes internos, feedback da marca..."
                    />
                  </section>

                  {selectedPartnership.status === 'Métricas' && (
                    <section className="pt-12 border-t border-[var(--border-color)] bg-[var(--accent-green)]/5 p-10 rounded-[3rem] border border-[var(--accent-green)]/10 shadow-inner">
                      <h3 className="text-[12px] uppercase tracking-[0.3em] font-black text-[var(--accent-green)] mb-8 text-center italic">Avaliação de Performance</h3>
                      <div className="space-y-8">
                        <div className="flex items-center justify-between p-6 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)]">
                          <span className="text-sm font-bold text-[var(--text-primary)]">Entregue no prazo ideal?</span>
                          <button 
                            onClick={() => updatePartnership({ deliveredOnTime: !selectedPartnership.deliveredOnTime })}
                            className={cn(
                              "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                              selectedPartnership.deliveredOnTime ? "bg-[var(--accent-green)] text-white shadow-lg shadow-[var(--accent-green)]/20" : "bg-[var(--bg-hover)] text-[var(--text-tertiary)] border border-[var(--border-color)]"
                            )}
                          >
                            {selectedPartnership.deliveredOnTime ? 'PERFEITO' : 'ATRASO'}
                          </button>
                        </div>
                        <div className="flex items-center justify-between p-6 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)]">
                          <span className="text-sm font-bold text-[var(--text-primary)]">Qualidade da Relação</span>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button 
                                key={star}
                                onClick={() => updatePartnership({ relationshipQuality: star as any })}
                                className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black transition-all",
                                  selectedPartnership.relationshipQuality === star ? "bg-[var(--accent-blue)] text-white shadow-lg shadow-[var(--accent-blue)]/20" : "bg-[var(--bg-hover)] text-[var(--text-tertiary)] border border-[var(--border-color)] hover:border-[var(--accent-blue)]/40"
                                )}
                              >
                                {star}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-6 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)]">
                          <span className="text-sm font-bold text-[var(--text-primary)]">Faria de novo?</span>
                          <button 
                            onClick={() => updatePartnership({ wouldDoAgain: !selectedPartnership.wouldDoAgain })}
                            className={cn(
                              "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                              selectedPartnership.wouldDoAgain ? "bg-[var(--accent-green)] text-white shadow-lg shadow-[var(--accent-green)]/20" : "bg-[var(--bg-hover)] text-[var(--text-tertiary)] border border-[var(--border-color)]"
                            )}
                          >
                            {selectedPartnership.wouldDoAgain ? 'COM CERTEZA' : 'PREFIRO NÃO'}
                          </button>
                        </div>
                      </div>
                    </section>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-10 py-6 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] shrink-0">
                <button
                  onClick={() => setSelectedPartnership(null)}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-black uppercase tracking-widest rounded-2xl hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Salvar e Fechar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <ConfirmModal
        open={!!confirm}
        message={confirm?.message || ''}
        onConfirm={() => { confirm?.onConfirm(); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
