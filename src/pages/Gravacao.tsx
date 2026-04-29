import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Plus, Trash2, ChevronRight, Filter } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import type { RecordingBlock, RecordingBlockContent } from '../lib/database';
import { cn } from '../lib/utils';

export function Gravacao() {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [blockName, setBlockName] = useState('');
  const [showBlockForm, setShowBlockForm] = useState(false);

  // Filtros
  const [filterPilar, setFilterPilar] = useState('');
  const [filterSerie, setFilterSerie] = useState('');
  const [filterLook, setFilterLook] = useState('');
  const [filterCenario, setFilterCenario] = useState('');
  const [filterEnergia, setFilterEnergia] = useState('');

  const prontos = state.contents.filter(c => {
    if (c.status !== 'Pronto p/ Gravar') return false;
    if (filterPilar && c.pilarId !== filterPilar) return false;
    if (filterSerie && c.seriesId !== filterSerie) return false;
    if (filterLook && c.lookId !== filterLook) return false;
    if (filterCenario && c.cenarioId !== filterCenario) return false;
    if (filterEnergia && c.energiaNecessaria !== filterEnergia) return false;
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCriarBloco = () => {
    if (!blockName.trim() || selectedIds.size === 0) return;

    const block: RecordingBlock = {
      id: crypto.randomUUID(),
      userId: user?.id || '',
      name: blockName.trim(),
      createdAt: new Date().toISOString(),
      contents: [],
    };

    const blockContents: RecordingBlockContent[] = Array.from(selectedIds).map((contentId, idx) => ({
      blockId: block.id,
      contentId,
      ordem: idx,
      gravado: false,
    }));

    dispatch({ type: 'ADD_RECORDING_BLOCK', payload: block });
    dispatch({ type: 'UPDATE_BLOCK_CONTENTS', payload: { blockId: block.id, contents: blockContents } });

    setSelectedIds(new Set());
    setBlockName('');
    setShowBlockForm(false);
  };

  const handleDeleteBlock = (blockId: string) => {
    if (!window.confirm('Excluir este bloco de gravação?')) return;
    dispatch({ type: 'DELETE_RECORDING_BLOCK', payload: blockId });
  };

  const getPilarNome = (pilarId: string | null) =>
    state.pilares.find(p => p.id === pilarId)?.nome || '';

  const getProgresso = (block: RecordingBlock) => {
    const total = block.contents.length;
    const gravados = block.contents.filter(c => c.gravado).length;
    return { total, gravados };
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <div className="content-narrow mx-auto px-6 md:px-12 py-10 md:py-16">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.4em] mb-2 italic">
            Produção
          </p>
          <h1 className="text-4xl md:text-5xl font-black text-[var(--text-primary)] leading-none tracking-tight flex items-center gap-4">
            <Video className="w-10 h-10 opacity-20" />
            Gravação
          </h1>
        </div>

        {/* SEÇÃO 1 — Planejamento */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-black uppercase tracking-widest opacity-40">
              Prontos para Gravar
              {prontos.length > 0 && <span className="ml-2 opacity-70">({prontos.length})</span>}
            </h2>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest opacity-30">
              <Filter className="w-3 h-3" />
              Filtrar:
            </div>
            <select
              value={filterPilar}
              onChange={e => setFilterPilar(e.target.value)}
              className="px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[10px] font-bold text-[var(--text-primary)] focus:outline-none"
            >
              <option value="">Pilar</option>
              {state.pilares.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <select
              value={filterSerie}
              onChange={e => setFilterSerie(e.target.value)}
              className="px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[10px] font-bold text-[var(--text-primary)] focus:outline-none"
            >
              <option value="">Série</option>
              {state.series.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select
              value={filterLook}
              onChange={e => setFilterLook(e.target.value)}
              className="px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[10px] font-bold text-[var(--text-primary)] focus:outline-none"
            >
              <option value="">Look</option>
              {state.looks.map(l => <option key={l.id} value={l.id}>Look {l.numero}</option>)}
            </select>
            <select
              value={filterCenario}
              onChange={e => setFilterCenario(e.target.value)}
              className="px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[10px] font-bold text-[var(--text-primary)] focus:outline-none"
            >
              <option value="">Cenário</option>
              {state.cenarios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <select
              value={filterEnergia}
              onChange={e => setFilterEnergia(e.target.value)}
              className="px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[10px] font-bold text-[var(--text-primary)] focus:outline-none"
            >
              <option value="">Energia</option>
              <option value="baixa">Baixa</option>
              <option value="média">Média</option>
              <option value="alta">Alta</option>
            </select>
          </div>

          {prontos.length === 0 ? (
            <div className="text-center py-12">
              <Video className="w-10 h-10 mx-auto opacity-10 mb-3" />
              <p className="text-sm font-black uppercase tracking-widest opacity-30">Nenhum conteúdo pronto para gravar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {prontos.map(c => (
                <button
                  key={c.id}
                  onClick={() => toggleSelect(c.id)}
                  className={cn(
                    'w-full flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all text-left',
                    selectedIds.has(c.id)
                      ? 'border-[var(--text-primary)] bg-[var(--bg-hover)]'
                      : 'border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-[var(--text-primary)]/30'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                    selectedIds.has(c.id) ? 'border-[var(--text-primary)] bg-[var(--text-primary)]' : 'border-[var(--border-color)]'
                  )}>
                    {selectedIds.has(c.id) && <div className="w-2 h-2 rounded-sm bg-[var(--bg-primary)]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-[var(--text-primary)] truncate">{c.title || '(sem título)'}</p>
                    <div className="flex gap-3 mt-0.5 flex-wrap">
                      {c.pilarId && <span className="text-[10px] font-bold opacity-40">{getPilarNome(c.pilarId)}</span>}
                      {c.energiaNecessaria && <span className="text-[10px] font-bold opacity-40 capitalize">⚡ {c.energiaNecessaria}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedIds.size > 0 && (
            <div className="mt-4">
              {showBlockForm ? (
                <div className="flex gap-3">
                  <input
                    autoFocus
                    value={blockName}
                    onChange={e => setBlockName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCriarBloco()}
                    placeholder={`Nome do bloco (${selectedIds.size} selecionados)`}
                    className="flex-1 px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none focus:border-[var(--text-primary)]/40"
                  />
                  <button
                    onClick={handleCriarBloco}
                    disabled={!blockName.trim()}
                    className="px-6 py-3 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl text-[11px] font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-30"
                  >
                    Criar
                  </button>
                  <button
                    onClick={() => setShowBlockForm(false)}
                    className="px-4 py-3 border border-[var(--border-color)] rounded-xl text-[11px] font-black uppercase tracking-widest opacity-50 hover:opacity-80"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowBlockForm(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-2xl text-[11px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                  Criar bloco ({selectedIds.size})
                </button>
              )}
            </div>
          )}
        </section>

        {/* SEÇÃO 2 — Blocos existentes */}
        {state.recordingBlocks.length > 0 && (
          <section>
            <h2 className="text-[11px] font-black uppercase tracking-widest opacity-40 mb-4">Blocos de Gravação</h2>
            <div className="space-y-3">
              {state.recordingBlocks.map(block => {
                const { total, gravados } = getProgresso(block);
                const pct = total > 0 ? Math.round((gravados / total) * 100) : 0;
                return (
                  <div key={block.id} className="flex items-center gap-4 px-5 py-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl">
                    <button
                      onClick={() => navigate(`/gravacao/${block.id}`)}
                      className="flex-1 text-left"
                    >
                      <p className="text-sm font-black text-[var(--text-primary)]">{block.name}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex-1 h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--text-primary)] rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black opacity-40 shrink-0">{gravados}/{total}</span>
                      </div>
                    </button>
                    <button
                      onClick={() => navigate(`/gravacao/${block.id}`)}
                      className="p-2 opacity-30 hover:opacity-80 transition-opacity"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteBlock(block.id)}
                      className="p-2 opacity-20 hover:opacity-60 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
