import { useState, useMemo } from 'react';
import { X, Trash2, ExternalLink, BookOpen, Check, ChevronDown, ChevronUp, Plus, BarChart3, Eye, Heart, MessageCircle, Bookmark, Share2, Users, Radio, FileText, Clapperboard, Award, TrendingUp, Settings2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { ConfirmModal } from './ConfirmModal';
import { STATUS_STAGES, VISUAL_FORMATS, DEFAULT_PLATFORMS } from '../constants';
import { Content, ContentPlataforma, ContentMetric } from '../lib/database';

type LocalMetric = Partial<ContentMetric> & { contentId: string; qualitativeNotes?: string; worthIt?: string };
import { cn } from '../lib/utils';
import { FixedPanelModal } from './FixedPanelModal';
import { RichTextEditor } from './RichTextEditor';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';

interface ContentDetailModalProps {
  content: Content;
  onClose: () => void;
  initialLivroOrigemId?: string;
  isNewContent?: boolean;
}

const CHAR_LIMITS: Record<string, number> = {
  Instagram: 2200,
  TikTok: 2200,
  YouTube: 5000,
};

export function ContentDetailModal({ content, onClose, initialLivroOrigemId, isNewContent = false }: ContentDetailModalProps) {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';

  const [activeTab, setActiveTab] = useState<'roteiro' | 'producao' | 'resultados'>('roteiro');
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [notesOpen, setNotesOpen] = useState(!!(content.notes));
  const [refsOpen, setRefsOpen] = useState(!!(content.referencias));
  const [isCreatingSeries, setIsCreatingSeries] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState('');

  const [local, setLocal] = useState<Content>(() => {
    const base = state.contents.find(c => c.id === content.id) || content;
    if (initialLivroOrigemId && !base.bibliotecaItemId) {
      return { ...base, bibliotecaItemId: initialLivroOrigemId };
    }
    return base;
  });

  const existingResult = useMemo(
    () => state.contentMetrics.find(r => r.contentId === local.id),
    [state.contentMetrics, local.id]
  );

  const [localResult, setLocalResult] = useState<LocalMetric>(() => existingResult || {
    contentId: local.id,
    views: 0, likes: 0, comments: 0, saves: 0, shares: 0,
    newFollowers: 0, accountsReached: 0,
    qualitativeNotes: '',
  });

  const [legendaTab, setLegendaTab] = useState<string>(() => {
    const plats = local.plataformas;
    if (!plats?.length) return 'Instagram';
    const first = plats[0];
    return typeof first === 'string' ? first : (first?.platformId || 'Instagram');
  });

  const updateLocal = (updates: Record<string, unknown>) => {
    let merged = { ...updates };

    if (merged.seriesId) {
      const serie = state.series.find(s => s.id === merged.seriesId);
      const livroOrigem = local.bibliotecaItemId
        ? state.bibliotecaItems.find(b => b.id === local.bibliotecaItemId)
        : null;
      if (serie?.estruturaRoteiro && !local.script && livroOrigem) {
        merged.script = serie.estruturaRoteiro
          .replace(/\{\{livro\}\}/g, livroOrigem.titulo || '')
          .replace(/\{\{autor\}\}/g, livroOrigem.autorDiretor || '');
      }
    }

    if (merged.plataformas && (merged.plataformas as ContentPlataforma[]).length > 0) {
      const ids = (merged.plataformas as ContentPlataforma[]).map(p => p.platformId);
      if (!ids.includes(legendaTab)) setLegendaTab(ids[0]);
    }

    setLocal(prev => ({ ...prev, ...merged }));
  };

  const handleAplicarTemplateManual = () => {
    const serie = state.series.find(s => s.id === local.seriesId);
    const livroOrigem = local.bibliotecaItemId
      ? state.bibliotecaItems.find(b => b.id === local.bibliotecaItemId)
      : null;
    if (!serie?.estruturaRoteiro) return;
    const scriptPreenchido = serie.estruturaRoteiro
      .replace(/\{\{livro\}\}/g, livroOrigem?.titulo || '')
      .replace(/\{\{autor\}\}/g, livroOrigem?.autorDiretor || '');
    setLocal(prev => ({ ...prev, script: scriptPreenchido }));
  };

  const updateLegenda = (plataforma: string, texto: string) => {
    const plats: ContentPlataforma[] = [...(local.plataformas || [])];
    const idx = plats.findIndex(p => p.platformId === plataforma);
    if (idx >= 0) {
      plats[idx] = { ...plats[idx], legenda: texto };
    } else {
      plats.push({ id: '', contentId: local.id, platformId: plataforma, legenda: texto, hashtags: '', publishDate: null });
    }
    setLocal(prev => ({ ...prev, plataformas: plats }));
  };

  const updateResultMetrics = (field: string, value: string) => {
    const num = parseInt(value.replace(/\D/g, ''), 10);
    const val = isNaN(num) ? 0 : num;
    setLocalResult(prev => ({ ...prev, [field]: val }));
  };

  const togglePlataforma = (plat: string) => {
    const curr = activePlataformaIds;
    const next = curr.includes(plat) ? curr.filter(p => p !== plat) : [...curr, plat];
    if (next.length === 0) return;
    const existing: ContentPlataforma[] = local.plataformas || [];
    const newPlataformas: ContentPlataforma[] = next.map(id => {
      const found = existing.find(p => p.platformId === id);
      return found ?? { id: '', contentId: local.id, platformId: id, legenda: '', hashtags: '', publishDate: null };
    });
    setLocal(prev => ({ ...prev, plataformas: newPlataformas }));
  };

  const handleAddAnnotation = (text: string, selection: { from: number; to: number }, comment: string) => {
    const newNote = {
      id: Math.random().toString(36).substr(2, 9),
      text, selection, comment,
      color: '#F5C543',
      createdAt: new Date().toISOString(),
    };
    setLocal(prev => ({ ...prev, scriptNotes: [...(prev.scriptNotes || []), newNote] }));
  };

  const handleRemoveAnnotation = (id: string) => {
    setLocal(prev => ({
      ...prev,
      scriptNotes: (prev.scriptNotes || []).filter(n => n.id !== id),
    }));
  };

  const handleUpdateAnnotation = (id: string, comment: string, color?: string) => {
    setLocal(prev => ({
      ...prev,
      scriptNotes: (prev.scriptNotes || []).map(n =>
        n.id === id ? { ...n, comment, color } : n
      ),
    }));
  };

  const handleSave = () => {
    dispatch({ type: isNewContent ? 'ADD_CONTENT' : 'UPDATE_CONTENT', payload: local as Content });

    const hasMetrics = (localResult.views || 0) > 0 || (localResult.likes || 0) > 0 ||
      (localResult.saves || 0) > 0 || (localResult.comments || 0) > 0 || !!localResult.qualitativeNotes;

    if (existingResult) {
      dispatch({ type: 'UPDATE_RESULT', payload: { ...existingResult, ...localResult } });
    } else if (hasMetrics) {
      dispatch({
        type: 'ADD_RESULT',
        payload: {
          ...localResult,
          id: Math.random().toString(36).substr(2, 9),
          userId: '',
          contentId: local.id,
          platformId: legendaTab,
          registeredAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      });
    }

    onClose();
  };

  const handleDeleteContent = () => {
    setConfirm({
      message: 'Tem certeza que deseja excluir este conteúdo?',
      onConfirm: () => { dispatch({ type: 'DELETE_CONTENT', payload: local.id }); onClose(); },
    });
  };

  const handleConfirmNewSeries = () => {
    if (!newSeriesName.trim()) { setIsCreatingSeries(false); return; }
    const newSeries = {
      id: Math.random().toString(36).substr(2, 9),
      userId: '',
      name: newSeriesName.trim(),
      template: '',
      notes: '',
      slotPadrao: null,
      formatoVisualPadrao: null,
      estruturaRoteiro: null,
      bordao: null,
      cor: '#F5C543',
      ativa: true,
      frequenciaRecomendada: null,
      pilarIds: [],
      plataformas: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_SERIES', payload: newSeries });
    updateLocal({ seriesId: newSeries.id });
    setNewSeriesName('');
    setIsCreatingSeries(false);
  };

  const activePlataformaIds: string[] = useMemo(() => {
    const plats = local.plataformas;
    if (!plats?.length) return ['Instagram'];
    return plats.map(p => p.platformId);
  }, [local.plataformas]);

  const pilarAtual = state.pilares.find(p => p.id === local.pilarId);
  const hashtagSugestao: Record<string, string> = pilarAtual
    ? Object.fromEntries(pilarAtual.plataformas.map(p => [p.platformId, p.hashtags]))
    : {};

  const livroOrigem = local.bibliotecaItemId
    ? state.bibliotecaItems.find(b => b.id === local.bibliotecaItemId)
    : null;

  const legendaAtual = useMemo(() => {
    const plats: ContentPlataforma[] = local.plataformas || [];
    const match = plats.find(p => p.platformId === legendaTab);
    if (!match) return '';
    return match.legenda || '';
  }, [local.plataformas, legendaTab]);

  const charLimit = CHAR_LIMITS[legendaTab];
  const charCount = legendaAtual.length;

  const sectionLabel = 'text-[10px] uppercase tracking-widest font-black text-[var(--text-tertiary)] mb-3 block';
  const groupTitle = 'text-[9px] uppercase tracking-[0.2em] font-black text-[var(--text-tertiary)] mb-4';
  const fieldLabel = 'text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-50 md:w-24 md:shrink-0';
  const selectClass = 'text-xs bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 focus:ring-0 text-[var(--text-primary)] w-full md:w-auto shadow-sm';
  const textareaClass = 'w-full text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:ring-0 p-4 resize-none placeholder:italic placeholder:opacity-30 bg-[var(--bg-hover)] rounded-xl';

  return (
    <>
    <FixedPanelModal open={true} onClose={onClose} desktopMaxW="md:max-w-[1240px]">
      <div className="flex h-full md:h-[85vh] flex-col md:flex-row overflow-hidden bg-[var(--bg-primary)]">

        {/* SIDEBAR STATUS (PC Only) */}
        {!isMobile && (
          <aside className="w-[220px] shrink-0 border-r border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col pt-8">
            <div className="px-8 mb-8">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)] mb-6 block">Fluxo de Vida</span>
              <div className="flex flex-col gap-1">
                {STATUS_STAGES.map((stage, i) => {
                  const currentIdx = STATUS_STAGES.indexOf(local.status);
                  const isDone = i < currentIdx;
                  const isActive = i === currentIdx;
                  return (
                    <button
                      key={stage}
                      onClick={() => updateLocal({ status: stage })}
                      className="flex items-center gap-3 group py-2 text-left shrink-0"
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                        isActive ? "border-[var(--text-primary)] bg-[var(--text-primary)]" :
                        isDone ? "border-[var(--accent-green)] bg-[var(--accent-green)]" : "border-[var(--border-color)] group-hover:border-[var(--text-primary)]/40"
                      )}>
                        {isDone && <Check className="w-3.5 h-3.5 text-[var(--bg-primary)]" />}
                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[var(--bg-primary)]" />}
                      </div>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest transition-all",
                        isActive ? "text-[var(--text-primary)] opacity-100" :
                        isDone ? "text-[var(--accent-green)] opacity-70" : "text-[var(--text-primary)] opacity-30 group-hover:opacity-60"
                      )}>
                        {stage}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-auto p-8 border-t border-[var(--border-color)] flex flex-col gap-2">
              <button
                onClick={() => setConfirm({ message: 'Excluir definitivamente?', onConfirm: () => { dispatch({ type: 'DELETE_CONTENT', payload: local.id }); onClose(); } })}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[var(--accent-pink)]/10 rounded-xl transition-colors group"
              >
                <Trash2 className="w-4 h-4 text-[var(--accent-pink)] opacity-40 group-hover:opacity-100" />
                <span className="text-[10px] font-black uppercase text-[var(--accent-pink)] opacity-40 group-hover:opacity-100">Excluir</span>
              </button>
            </div>
          </aside>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">

          {/* HEADER */}
          <header className={cn(
            "px-4 md:px-10 py-3 md:py-6 border-b border-[var(--border-color)] flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 bg-[var(--bg-primary)] z-10",
            isMobile && "pt-5"
          )}>
            {isMobile && (
              <div className="flex items-center justify-between w-full gap-2">
                <select
                  value={local.status}
                  onChange={(e) => updateLocal({ status: e.target.value })}
                  className="text-[9px] font-black uppercase tracking-widest bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 focus:ring-0 flex-1"
                >
                  {STATUS_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={handleSave} className="p-1.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-lg transition-all active:scale-95">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={onClose} className="p-1.5 bg-[var(--bg-hover)] rounded-lg text-[var(--text-primary)] border border-[var(--border-color)]">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 min-w-0 w-full">
              <input
                type="text"
                value={local.title}
                onChange={(e) => updateLocal({ title: e.target.value })}
                className={cn(
                  "w-full font-black text-[var(--text-primary)] focus:ring-0 placeholder:opacity-30 tracking-tight",
                  isMobile ? "text-xs bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5" : "text-3xl bg-transparent border-none p-0 truncate"
                )}
                placeholder="Título..."
              />
            </div>

            {!isMobile && (
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={handleSave} className="px-6 py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-2xl transition-all active:scale-95 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Salvar</span>
                </button>
                <button onClick={onClose} className="p-2 hover:bg-[var(--bg-hover)] rounded-full text-[var(--text-tertiary)]">
                  <X className="w-6 h-6" />
                </button>
              </div>
            )}
          </header>

          {/* ABAS */}
          <nav className="px-4 md:px-10 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex gap-1 overflow-x-auto no-scrollbar shrink-0">
            {[
              { id: 'roteiro', label: 'Roteiro', icon: FileText },
              { id: 'producao', label: 'Produção', icon: Clapperboard },
              { id: 'resultados', label: 'Resultados', icon: Award },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'roteiro' | 'producao' | 'resultados')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all shrink-0",
                  activeTab === tab.id
                    ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border border-[var(--border-strong)]"
                    : "text-[var(--text-primary)] opacity-40 hover:opacity-100"
                )}
              >
                <tab.icon className="w-3 h-3" />
                {tab.label}
              </button>
            ))}
          </nav>

          {/* CONTEÚDO SCROLLABLE */}
          <main className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar bg-[var(--bg-primary)]">

            {activeTab === 'roteiro' && (
              <div className="space-y-8 md:space-y-12 animate-in fade-in duration-300">
                <section>
                  <p className={groupTitle}>Classificação</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5 md:gap-y-6">
                    {/* Série */}
                    <div className="flex flex-col gap-2">
                      <span className={fieldLabel}>Série</span>
                      <div className="relative">
                        <select
                          value={isCreatingSeries ? 'new' : (local.seriesId ?? '')}
                          onChange={(e) => {
                            if (e.target.value === 'new') setIsCreatingSeries(true);
                            else updateLocal({ seriesId: e.target.value || null });
                          }}
                          className={cn(selectClass, "pr-10")}
                        >
                          <option value="">Sem Série</option>
                          {state.series.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                          <option value="new">+ Nova Série…</option>
                        </select>
                        {isCreatingSeries && (
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              autoFocus
                              type="text"
                              value={newSeriesName}
                              onChange={e => setNewSeriesName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleConfirmNewSeries();
                                if (e.key === 'Escape') { setIsCreatingSeries(false); setNewSeriesName(''); }
                              }}
                              placeholder="Nome da série..."
                              className="flex-1 text-xs bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)]"
                            />
                            <button onClick={handleConfirmNewSeries} className="p-2 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pilar */}
                    <div className="flex flex-col gap-2">
                      <span className={fieldLabel}>Pilar</span>
                      <select
                        value={local.pilarId || ''}
                        onChange={(e) => updateLocal({ pilarId: e.target.value || null })}
                        className={selectClass}
                      >
                        <option value="">Sem pilar</option>
                        {state.pilares.filter(p => p.ativo).map(p => (
                          <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                      </select>
                    </div>

                    {/* Slot */}
                    <div className="flex flex-col gap-2">
                      <span className={fieldLabel}>Slot</span>
                      <select
                        value={local.slotType || ''}
                        onChange={(e) => updateLocal({ slotType: e.target.value || null })}
                        className={selectClass}
                      >
                        <option value="">—</option>
                        <option value="ÚNICO">Único (Viral)</option>
                        <option value="SÉRIE">Série (Identidade)</option>
                        <option value="JANELA">Janela (Presença)</option>
                      </select>
                    </div>

                    {/* Formato Visual */}
                    <div className="flex flex-col gap-2">
                      <span className={fieldLabel}>Visual</span>
                      <select
                        value={local.formatoVisual || ''}
                        onChange={(e) => updateLocal({ formatoVisual: e.target.value || null })}
                        className={selectClass}
                      >
                        <option value="">—</option>
                        {VISUAL_FORMATS.map(f => <option key={f}>{f}</option>)}
                      </select>
                    </div>

                    {/* Plataformas */}
                    <div className="flex flex-col gap-2 md:col-span-1">
                      <span className={fieldLabel}>Plataformas</span>
                      <div className="flex gap-2 flex-wrap">
                        {DEFAULT_PLATFORMS.map(plat => {
                          const ativo = activePlataformaIds.includes(plat);
                          return (
                            <button
                              key={plat}
                              onClick={() => togglePlataforma(plat)}
                              className={cn(
                                "text-[9px] font-bold px-3 py-1.5 rounded-full border transition-all",
                                ativo ? "bg-[var(--text-primary)] text-[var(--bg-secondary)] border-[var(--text-primary)]" : "opacity-40 border-[var(--border-color)] hover:opacity-100"
                              )}
                            >
                              {plat}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Livro/Mídia */}
                    {state.bibliotecaItems.length > 0 && (
                      <div className="flex flex-col gap-4 md:col-span-2 pt-6 border-t border-[var(--border-color)]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
                            <span className={fieldLabel}>Vínculo com Livro</span>
                          </div>
                          <button
                            onClick={() => {
                              if (local.bibliotecaItemId) updateLocal({ bibliotecaItemId: null });
                              else updateLocal({ bibliotecaItemId: state.bibliotecaItems[0].id });
                            }}
                            className={cn(
                              "w-8 h-4 rounded-full relative transition-all duration-300",
                              local.bibliotecaItemId ? "bg-[var(--accent-blue)]" : "bg-[var(--bg-hover)]"
                            )}
                          >
                            <div className={cn(
                              "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-300",
                              local.bibliotecaItemId ? "left-4.5" : "left-0.5 shadow-sm"
                            )} />
                          </button>
                        </div>

                        {local.bibliotecaItemId && (
                          <div className="animate-in slide-in-from-top-2 duration-300">
                            <select
                              value={local.bibliotecaItemId}
                              onChange={(e) => updateLocal({ bibliotecaItemId: e.target.value })}
                              className={cn(selectClass, "w-full text-xs font-bold py-3.5 h-auto bg-[var(--bg-secondary)] border-2 border-[var(--accent-blue)]/20")}
                            >
                              {state.bibliotecaItems.map(b => (
                                <option key={b.id} value={b.id}>
                                  {b.titulo}{b.autorDiretor ? ` — ${b.autorDiretor}` : ''}
                                </option>
                              ))}
                            </select>
                            {livroOrigem && (
                              <div className="mt-2 flex items-center gap-2 px-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-blue)] animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-blue)] opacity-60">
                                  Status: {livroOrigem.status}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-4 border-b border-[var(--border-color)] pb-4">
                    <span className={sectionLabel}>Roteiro Final</span>
                    {(() => {
                      const serie = state.series.find(s => s.id === local.seriesId);
                      if (serie?.estruturaRoteiro) {
                        return (
                          <button
                            onClick={handleAplicarTemplateManual}
                            className="text-[9px] font-bold text-[var(--accent-blue)] hover:underline opacity-60 hover:opacity-100"
                          >
                            {local.script ? 'Reiniciar Template' : 'Usar template da série'}
                          </button>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <RichTextEditor
                    content={local.script || ''}
                    onChange={(html) => updateLocal({ script: html })}
                    placeholder="Abra o seu coração e escreva o roteiro..."
                    authorName={userName}
                    annotations={local.scriptNotes || []}
                    onAddAnnotation={handleAddAnnotation}
                    onRemoveAnnotation={handleRemoveAnnotation}
                    onUpdateAnnotation={handleUpdateAnnotation}
                  />
                </section>

                <section>
                  <div className="flex items-center justify-between mb-4">
                    <span className={sectionLabel}>Legenda & Copy</span>
                    <button
                      onClick={() => setConfirm({
                        message: 'Limpar a legenda atual?',
                        onConfirm: () => updateLegenda(legendaTab, ''),
                      })}
                      className="text-[9px] font-bold text-[var(--accent-blue)] hover:underline opacity-60 hover:opacity-100"
                    >
                      Limpar
                    </button>
                  </div>

                  <div className="flex gap-1 mb-3">
                    {activePlataformaIds.map(plat => (
                      <button
                        key={plat}
                        onClick={() => setLegendaTab(plat)}
                        className={cn(
                          "text-[9px] font-black px-3 py-1.5 rounded-lg transition-all",
                          legendaTab === plat ? "bg-[var(--text-primary)] text-[var(--bg-secondary)]" : "bg-[var(--bg-hover)] text-[var(--text-tertiary)]"
                        )}
                      >
                        {plat}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={legendaAtual}
                    onChange={(e) => updateLegenda(legendaTab, e.target.value)}
                    className={cn(textareaClass, "min-h-[200px]", charLimit && charCount > charLimit && 'border-[var(--accent-pink)]')}
                    placeholder={`Copy matadora para ${legendaTab}...`}
                  />

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {hashtagSugestao[legendaTab] && (
                        <button
                          onClick={() => {
                            const hashtags = hashtagSugestao[legendaTab];
                            if (hashtags && !legendaAtual.includes(hashtags.split(' ')[0])) {
                              updateLegenda(legendaTab, legendaAtual + '\n\n' + hashtags);
                            }
                          }}
                          className="text-[9px] font-black text-[var(--accent-green)] p-1.5 bg-[var(--accent-green)]/5 rounded-md hover:bg-[var(--accent-green)]/10 transition-colors uppercase tracking-widest"
                        >
                          + Adicionar Hashtags do Pilar
                        </button>
                      )}
                    </div>
                    {charLimit && (
                      <span className={cn('text-[10px] font-black tabular-nums opacity-30', charCount > charLimit && 'text-[var(--accent-pink)] opacity-100')}>
                        {charCount}/{charLimit}
                      </span>
                    )}
                  </div>
                </section>

                <section>
                  <button onClick={() => setRefsOpen(v => !v)} className="w-full flex items-center justify-between group">
                    <span className={sectionLabel}>Referências / Observações</span>
                    {refsOpen ? <ChevronUp className="w-4 h-4 opacity-30" /> : <ChevronDown className="w-4 h-4 opacity-30" />}
                  </button>
                  {refsOpen && (
                    <textarea
                      value={local.referencias || ''}
                      onChange={(e) => updateLocal({ referencias: e.target.value })}
                      className="input-inline w-full mt-4 min-h-[100px] resize-none text-sm text-[var(--text-primary)] placeholder:italic placeholder:opacity-30"
                      placeholder="Links, inspirações, vídeos de referência..."
                    />
                  )}
                </section>
              </div>
            )}

            {activeTab === 'producao' && (
              <div className="max-w-3xl space-y-12 animate-in slide-in-from-right-4 duration-300">
                <section>
                  <p className={groupTitle}>Cronograma</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    <div className="flex flex-col gap-2">
                      <span className={fieldLabel}>Gravação</span>
                      <input
                        type="date"
                        value={local.recordingDate || ''}
                        onChange={(e) => updateLocal({ recordingDate: e.target.value || null })}
                        className={selectClass}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className={fieldLabel}>Postagem</span>
                      <input
                        type="date"
                        value={local.publishDate || ''}
                        onChange={(e) => updateLocal({ publishDate: e.target.value || null })}
                        className={selectClass}
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <p className={groupTitle}>Set & Look</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    <div className="flex flex-col gap-2">
                      <span className={fieldLabel}>Look #</span>
                      {state.looks.length > 0 ? (
                        <select
                          value={local.lookId || ''}
                          onChange={(e) => updateLocal({ lookId: e.target.value || null })}
                          className={selectClass}
                        >
                          <option value="">— Sem look —</option>
                          {state.looks.filter(l => l.ativo).map(l => (
                            <option key={l.id} value={l.id}>Look {l.numero}{l.descricao ? ` — ${l.descricao}` : ''}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={local.lookId || ''}
                          onChange={(e) => updateLocal({ lookId: e.target.value || null })}
                          placeholder="Ex: Look 1"
                          className={selectClass}
                        />
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className={fieldLabel}>Cenário</span>
                      {state.cenarios.length > 0 ? (
                        <select
                          value={local.cenarioId || ''}
                          onChange={(e) => updateLocal({ cenarioId: e.target.value || null })}
                          className={selectClass}
                        >
                          <option value="">— Sem cenário —</option>
                          {state.cenarios.filter(c => c.ativo).map(c => (
                            <option key={c.id} value={c.id}>{c.nome}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={local.cenarioId || ''}
                          onChange={(e) => updateLocal({ cenarioId: e.target.value || null })}
                          placeholder="Ex: Mesa"
                          className={selectClass}
                        />
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <button onClick={() => setNotesOpen(v => !v)} className="w-full flex items-center justify-between group">
                    <span className={sectionLabel}>Notas de Gravação</span>
                    {notesOpen ? <ChevronUp className="w-4 h-4 opacity-30" /> : <ChevronDown className="w-4 h-4 opacity-30" />}
                  </button>
                  {notesOpen && (
                    <textarea
                      value={local.notes || ''}
                      onChange={(e) => updateLocal({ notes: e.target.value })}
                      className="input-inline w-full mt-4 min-h-[120px] resize-vertical text-sm text-[var(--text-primary)] placeholder:italic placeholder:opacity-30"
                      placeholder="Enquadramento, luz, roupa, lembretes..."
                    />
                  )}
                </section>
              </div>
            )}

            {activeTab === 'resultados' && (
              <div className="space-y-12 animate-in slide-in-from-right-4 duration-300">
                <section>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--accent-orange)] mb-8 flex items-center gap-3">
                    <BarChart3 className="w-4 h-4" /> Hard Metrics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <MetricInput icon={Eye} label="Views" value={localResult.views || 0} onChange={(v) => updateResultMetrics('views', v)} />
                    <MetricInput icon={Heart} label="Likes" value={localResult.likes || 0} onChange={(v) => updateResultMetrics('likes', v)} />
                    <MetricInput icon={MessageCircle} label="Coments" value={localResult.comments || 0} onChange={(v) => updateResultMetrics('comments', v)} />
                    <MetricInput icon={Bookmark} label="Saves" value={localResult.saves || 0} onChange={(v) => updateResultMetrics('saves', v)} />
                    <MetricInput icon={Share2} label="Shares" value={localResult.shares || 0} onChange={(v) => updateResultMetrics('shares', v)} />
                    <MetricInput icon={TrendingUp} label="Novos Seg." value={localResult.newFollowers || 0} onChange={(v) => updateResultMetrics('newFollowers', v)} />
                    <MetricInput icon={Radio} label="Alcance" value={localResult.accountsReached || 0} onChange={(v) => updateResultMetrics('accountsReached', v)} />
                    <MetricInput icon={Users} label="Reposts" value={localResult.reposts || 0} onChange={(v) => updateResultMetrics('reposts', v)} />
                  </div>
                </section>

                <section className="space-y-8">
                  <div>
                    <h3 className={sectionLabel}>Veredito Qualitativo</h3>
                    <textarea
                      value={localResult.qualitativeNotes || ''}
                      onChange={(e) => setLocalResult(prev => ({ ...prev, qualitativeNotes: e.target.value }))}
                      placeholder="O que aprendemos com a performance deste conteúdo?"
                      className={textareaClass}
                    />
                  </div>

                  <div>
                    <h3 className={sectionLabel}>Valeu a pena o esforço?</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {['Sim', 'Não', 'Mais ou menos'].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setLocalResult(prev => ({ ...prev, worthIt: option }))}
                          className={cn(
                            "py-3 text-[10px] font-black uppercase tracking-widest rounded-xl border-2 transition-all",
                            localResult.worthIt === option
                              ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]'
                              : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)] border-[var(--border-color)] opacity-60'
                          )}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            )}
          </main>

          {/* FOOTER */}
          <footer className="px-6 md:px-10 py-5 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between gap-4 shrink-0">
            <button onClick={onClose} className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)] opacity-30 hover:opacity-100 transition-opacity">
              Descartar
            </button>
            <button
              onClick={handleSave}
              className="px-10 py-3.5 bg-[var(--text-primary)] text-[var(--bg-primary)] text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg flex items-center gap-2"
            >
              <Check className="w-3.5 h-3.5" />
              Salvar Alterações
            </button>
          </footer>
        </div>
      </div>
    </FixedPanelModal>

    <ConfirmModal
      open={!!confirm}
      message={confirm?.message || ''}
      onConfirm={() => { confirm?.onConfirm(); setConfirm(null); }}
      onCancel={() => setConfirm(null)}
    />
    </>
  );
}

function MetricInput({ icon: Icon, label, value, onChange }: { icon: any; label: string; value: number; onChange: (v: string) => void }) {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 transition-all focus-within:border-[var(--text-primary)]/40">
      <div className="flex items-center gap-2 mb-2 opacity-40">
        <Icon className="w-3.5 h-3.5 text-[var(--text-primary)]" />
        <label className="text-[9px] uppercase tracking-[0.1em] font-black text-[var(--text-primary)]">{label}</label>
      </div>
      <input
        type="text"
        inputMode="numeric"
        value={value === 0 ? '' : value.toLocaleString('pt-BR')}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="w-full text-xl font-black bg-transparent border-none p-0 text-[var(--text-primary)] focus:ring-0 placeholder:opacity-10"
      />
    </div>
  );
}
