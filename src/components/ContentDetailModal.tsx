import { useState } from 'react';
import { X, Trash2, ExternalLink, BookOpen, Check, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { ConfirmModal } from './ConfirmModal';
import { STATUS_STAGES, CAPTION_TEMPLATES, PLATFORMS, VISUAL_FORMATS } from '../constants';
import { Content, Platform, VisualFormat } from '../types';
import { cn } from '../lib/utils';
import { FixedPanelModal } from './FixedPanelModal';
import { RichTextEditor } from './RichTextEditor';
import { useAuth } from '../context/AuthContext';

interface ContentDetailModalProps {
  content: Content;
  onClose: () => void;
  initialLivroOrigemId?: string;
  isNewContent?: boolean;
}

const STATUS_SHORT: Record<string, string> = {
  'Ideia': 'Ideia',
  'Pronto para Gravar': 'P/ Gravar',
  'Gravado': 'Gravado',
  'A Editar': 'A Editar',
  'Editado': 'Editado',
  'Programado': 'Program.',
  'Postado': 'Postado',
};

const CHAR_LIMITS: Partial<Record<Platform, number>> = {
  Instagram: 2200,
  TikTok: 2200,
  YouTube: 5000,
};

export function ContentDetailModal({ content, onClose, initialLivroOrigemId, isNewContent = false }: ContentDetailModalProps) {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';


  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [notesOpen, setNotesOpen] = useState(!!(content.notes));
  const [refsOpen, setRefsOpen] = useState(!!(content.references));
  const [isCreatingSeries, setIsCreatingSeries] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState('');

  const [local, setLocal] = useState<Content>(() => {
    const base = state.contents.find(c => c.id === content.id) || content;
    if (initialLivroOrigemId && !base.livroOrigemId) {
      return { ...base, livroOrigemId: initialLivroOrigemId };
    }
    return base;
  });

  const [legendaTab, setLegendaTab] = useState<Platform>(() => {
    const plats = local.plataformas?.length ? local.plataformas : ['Instagram' as Platform];
    return plats[0];
  });

  const updateLocal = (updates: Partial<Content>) => {
    if (updates.pillar) {
      const template = CAPTION_TEMPLATES[updates.pillar];
      if (template) {
        const activePlataformas = local.plataformas?.length
          ? local.plataformas
          : ['Instagram' as Platform];
        const legendasAtuais = local.legendas || {};
        const novasLegendas = { ...legendasAtuais };
        activePlataformas.forEach((plat) => {
          if (!novasLegendas[plat]) novasLegendas[plat] = template;
        });
        updates.legendas = novasLegendas;
      }
    }

    if (updates.plataformas && updates.plataformas.length > 0) {
      if (!updates.plataformas.includes(legendaTab)) {
        setLegendaTab(updates.plataformas[0]);
      }
    }

    // Auto-fill roteiro via template da série quando seriesId é definido
    if (updates.seriesId) {
      const serie = state.series.find(s => s.id === updates.seriesId);
      const livroOrigem = local.livroOrigemId ? state.books.find(b => b.id === local.livroOrigemId) : null;
      if (serie?.estruturaRoteiro && !local.script && livroOrigem) {
        let scriptPreenchido = serie.estruturaRoteiro
          .replace(/\{\{livro\}\}/g, livroOrigem.titulo)
          .replace(/\{\{autor\}\}/g, livroOrigem.autor);
        updates.script = scriptPreenchido;
      }
    }

    setLocal(prev => ({ ...prev, ...updates }));
  };

  const handleAplicarTemplateManual = () => {
    const serie = state.series.find(s => s.id === local.seriesId);
    const livroOrigem = local.livroOrigemId ? state.books.find(b => b.id === local.livroOrigemId) : null;
    if (!serie?.estruturaRoteiro) return;
    const scriptPreenchido = serie.estruturaRoteiro
      .replace(/\{\{livro\}\}/g, livroOrigem?.titulo || '')
      .replace(/\{\{autor\}\}/g, livroOrigem?.autor || '');
    setLocal(prev => ({ ...prev, script: scriptPreenchido }));
  };

  const updateLegenda = (plataforma: Platform, texto: string) => {
    const legendas = { ...(local.legendas || {}) };
    legendas[plataforma] = texto;
    setLocal(prev => ({ ...prev, legendas }));
  };

  const togglePlataforma = (plat: Platform) => {
    const atual = local.plataformas || [];
    const novas = atual.includes(plat)
      ? atual.filter(p => p !== plat)
      : [...atual, plat];
    if (novas.length === 0) return;
    updateLocal({ plataformas: novas });
  };

  const handleAddAnnotation = (text: string, selection: { from: number; to: number }, comment: string) => {
    const newNote = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      selection,
      comment,
      authorName: userName,
      createdAt: new Date().toISOString()
    };
    const currentNotes = local.scriptNotes || [];
    setLocal(prev => ({ ...prev, scriptNotes: [...currentNotes, newNote] }));
  };

  const handleRemoveAnnotation = (id: string) => {
    const currentNotes = local.scriptNotes || [];
    setLocal(prev => ({ ...prev, scriptNotes: currentNotes.filter(n => n.id !== id) }));
  };

  const handleUpdateAnnotation = (id: string, comment: string, color?: string) => {
    const currentNotes = local.scriptNotes || [];
    setLocal(prev => ({
      ...prev,
      scriptNotes: currentNotes.map(n => n.id === id ? { ...n, comment, color } : n)
    }));
  };

  const handleSave = () => {
    dispatch({ type: 'UPDATE_CONTENT', payload: local });
    onClose();
  };

  const handleDeleteContent = () => {
    setConfirm({ message: 'Tem certeza que deseja excluir este conteúdo?', onConfirm: () => { dispatch({ type: 'DELETE_CONTENT', payload: local.id }); onClose(); } });
  };

  const handleConfirmNewSeries = () => {
    if (!newSeriesName.trim()) { setIsCreatingSeries(false); return; }
    const newSeries = {
      id: Math.random().toString(36).substr(2, 9),
      name: newSeriesName.trim(),
      template: '',
      notes: '',
      cor: '#F5C543',
    };
    dispatch({ type: 'ADD_SERIES', payload: newSeries });
    updateLocal({ seriesId: newSeries.id });
    setNewSeriesName('');
    setIsCreatingSeries(false);
  };

  const activePlataformas = local.plataformas?.length
    ? local.plataformas
    : ['Instagram' as Platform];

  const pilarAtual = state.pilares.find(p => p.nome === local.pillar);
  const hashtagSugestao: Partial<Record<Platform, string>> = pilarAtual
    ? {
        Instagram: pilarAtual.hashtagsInstagram,
        TikTok: pilarAtual.hashtagsTikTok,
        YouTube: pilarAtual.hashtagsYouTube,
      }
    : {};

  const livroOrigem = local.livroOrigemId
    ? state.books.find(b => b.id === local.livroOrigemId)
    : null;

  const legendaAtual = local.legendas?.[legendaTab] || local.caption || '';
  const charLimit = CHAR_LIMITS[legendaTab];
  const charCount = legendaAtual.length;

  const sectionLabel = 'text-[10px] uppercase tracking-widest font-black text-[var(--text-primary)] opacity-40 mb-3 block';
  const groupTitle = 'text-[9px] uppercase tracking-[0.2em] font-black text-[var(--text-primary)] opacity-25 mb-4';
  const fieldLabel = 'text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-50 md:w-24 md:shrink-0';
  const selectClass = 'text-xs bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 focus:ring-0 text-[var(--text-primary)] w-full md:w-auto shadow-sm';
  const textareaClass = 'w-full text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:ring-0 p-4 resize-none placeholder:italic placeholder:opacity-30 bg-[var(--bg-hover)] rounded-xl';

  return (
    <>
    <FixedPanelModal open={true} onClose={onClose} desktopMaxW="md:max-w-[1100px]">
      {/* Área rolável */}
      <div className="p-6 md:p-12 flex-1 overflow-y-auto custom-scrollbar">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-2">
            <button
              onClick={handleDeleteContent}
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-[var(--accent-pink)]/10 rounded-xl transition-colors group"
            >
              <Trash2 className="w-3.5 h-3.5 text-[var(--accent-pink)] opacity-40 group-hover:opacity-100" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-pink)] opacity-40 group-hover:opacity-100">Excluir</span>
            </button>
            {local.link && (
              <a
                href={local.link}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-[var(--bg-hover)] rounded-full"
              >
                <ExternalLink className="w-4 h-4 text-[var(--text-primary)] opacity-40" />
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-hover)] rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-[var(--text-primary)] opacity-40" />
          </button>
        </div>

        {/* Título */}
        <input
          type="text"
          value={local.title}
          onChange={(e) => updateLocal({ title: e.target.value })}
          className="w-full text-3xl md:text-4xl font-bold text-[var(--text-primary)] border-none focus:ring-0 p-0 mb-8 placeholder:opacity-20 bg-transparent"
          placeholder="Título sem título"
        />

        {/* Status Stepper */}
        <div className="mb-10">
          <span className={sectionLabel}>Status</span>
          <div className="flex items-center gap-0 overflow-x-auto pb-1">
            {STATUS_STAGES.map((stage, i) => {
              const currentIdx = STATUS_STAGES.indexOf(local.status);
              const isDone = i < currentIdx;
              const isActive = i === currentIdx;
              return (
                <button
                  key={stage}
                  onClick={() => updateLocal({ status: stage })}
                  className="flex items-center group shrink-0"
                >
                  <div className={cn(
                    'px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all',
                    isActive
                      ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-sm'
                      : isDone
                      ? 'text-[var(--text-primary)] opacity-40 hover:opacity-70'
                      : 'text-[var(--text-primary)] opacity-20 hover:opacity-50'
                  )}>
                    {STATUS_SHORT[stage]}
                  </div>
                  {i < STATUS_STAGES.length - 1 && (
                    <div className={cn(
                      'w-4 h-px mx-0.5 shrink-0',
                      i < currentIdx ? 'bg-[var(--text-primary)] opacity-40' : 'bg-[var(--border-color)]'
                    )} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Metadados em 3 grupos */}
        <div className="mb-10 space-y-8 py-6 border-y border-[var(--border-color)]">

          {/* Grupo 1: Classificação */}
          <div>
            <p className={groupTitle}>Classificação</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
              {/* Série */}
              <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4">
                <span className={fieldLabel}>Série</span>
                <div className="flex-1 md:flex-none">
                  <select
                    value={isCreatingSeries ? 'new' : (local.seriesId ?? '')}
                    onChange={(e) => {
                      if (e.target.value === 'new') {
                        setIsCreatingSeries(true);
                      } else {
                        updateLocal({ seriesId: e.target.value });
                      }
                    }}
                    className={cn(selectClass, !local.seriesId && 'opacity-50')}
                  >
                    <option value="">Sem Série</option>
                    {state.series.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                    <option value="new">+ Nova Série…</option>
                  </select>
                  {isCreatingSeries && (
                    <div className="flex items-center gap-2 mt-2">
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
                        className="flex-1 text-xs bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-xl px-3 py-2 focus:ring-0 text-[var(--text-primary)] placeholder:opacity-30"
                      />
                      <button
                        onClick={handleConfirmNewSeries}
                        disabled={!newSeriesName.trim()}
                        className="p-2 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl disabled:opacity-30 hover:scale-105 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setIsCreatingSeries(false); setNewSeriesName(''); }}
                        className="p-2 hover:bg-[var(--bg-hover)] rounded-xl transition-colors"
                      >
                        <X className="w-3.5 h-3.5 text-[var(--text-primary)] opacity-40" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Pilar */}
              <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4">
                <span className={fieldLabel}>Pilar</span>
                <select
                  value={local.pillar}
                  onChange={(e) => updateLocal({ pillar: e.target.value })}
                  className={cn(selectClass, !local.pillar && 'opacity-50')}
                >
                  <option value="">Sem pilar</option>
                  {state.pilares.filter(p => p.ativo).map(p => (
                    <option key={p.id} value={p.nome}>{p.nome}</option>
                  ))}
                  {local.pillar && !state.pilares.find(p => p.nome === local.pillar) && (
                    <option value={local.pillar}>{local.pillar} (legado)</option>
                  )}
                </select>
              </div>

              {/* Slot */}
              <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4">
                <span className={fieldLabel}>Slot</span>
                <select
                  value={local.slotType || ''}
                  onChange={(e) => updateLocal({ slotType: e.target.value as any })}
                  className={cn(selectClass, !local.slotType && 'opacity-50')}
                >
                  <option value="">—</option>
                  <option value="Curto">Curto (Viral)</option>
                  <option value="Série">Série (Identidade)</option>
                  <option value="Janela">Janela (Presença)</option>
                </select>
              </div>

              {/* Formato Visual */}
              <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4">
                <span className={fieldLabel}>Visual</span>
                <select
                  value={local.formatoVisual || ''}
                  onChange={(e) => updateLocal({ formatoVisual: e.target.value as VisualFormat || undefined })}
                  className={cn(selectClass, !local.formatoVisual && 'opacity-50')}
                >
                  <option value="">—</option>
                  {VISUAL_FORMATS.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Grupo 2: Produção */}
          <div>
            <p className={groupTitle}>Produção</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
              {/* Look */}
              <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4">
                <span className={fieldLabel}>Look #</span>
                {state.looks.length > 0 ? (
                  <select
                    value={local.lookId || ''}
                    onChange={(e) => updateLocal({ lookId: e.target.value || undefined })}
                    className={cn(selectClass, !local.lookId && 'opacity-50')}
                  >
                    <option value="">—</option>
                    {state.looks.filter(l => l.ativo).map(l => (
                      <option key={l.id} value={l.id}>Look {l.numero}{l.descricao ? ` — ${l.descricao}` : ''}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={local.lookId || ''}
                    onChange={(e) => updateLocal({ lookId: e.target.value || undefined })}
                    placeholder="Ex: Look 1"
                    className={cn(selectClass, 'placeholder:opacity-40')}
                  />
                )}
              </div>

              {/* Cenário */}
              <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4">
                <span className={fieldLabel}>Cenário</span>
                {state.cenarios.length > 0 ? (
                  <select
                    value={local.scenario || ''}
                    onChange={(e) => updateLocal({ scenario: e.target.value || undefined })}
                    className={cn(selectClass, !local.scenario && 'opacity-50')}
                  >
                    <option value="">—</option>
                    {state.cenarios.filter(c => c.ativo).map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={local.scenario || ''}
                    onChange={(e) => updateLocal({ scenario: e.target.value || undefined })}
                    placeholder="Ex: Mesa"
                    className={cn(selectClass, 'placeholder:opacity-40')}
                  />
                )}
              </div>

              {/* Duração */}
              <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4">
                <span className={fieldLabel}>Duração</span>
                <input
                  type="number"
                  value={local.estimatedDuration || ''}
                  onChange={(e) => updateLocal({ estimatedDuration: parseInt(e.target.value) || undefined })}
                  placeholder="Segundos"
                  className={cn(selectClass, 'w-full md:w-28 placeholder:opacity-40')}
                />
              </div>
            </div>
          </div>

          {/* Grupo 3: Publicação */}
          <div>
            <p className={groupTitle}>Publicação</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
              {/* Gravação */}
              <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4">
                <span className={fieldLabel}>Gravação</span>
                <input
                  type="date"
                  value={local.recordingDate || ''}
                  onChange={(e) => updateLocal({ recordingDate: e.target.value })}
                  className={cn(selectClass, !local.recordingDate && 'opacity-50')}
                />
              </div>

              {/* Postagem */}
              <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4">
                <span className={fieldLabel}>Postagem</span>
                <input
                  type="date"
                  value={local.publishDate || ''}
                  onChange={(e) => updateLocal({ publishDate: e.target.value })}
                  className={cn(selectClass, !local.publishDate && 'opacity-50')}
                />
              </div>

              {/* Livro de Origem */}
              {state.books.length > 0 && (
                <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4 sm:col-span-2">
                  <span className={cn(fieldLabel, 'flex items-center gap-1')}>
                    <BookOpen className="w-3 h-3" /> Livro
                  </span>
                  <div className="flex items-center gap-2 flex-1 md:flex-none">
                    <select
                      value={local.livroOrigemId || ''}
                      onChange={(e) => updateLocal({ livroOrigemId: e.target.value || undefined })}
                      className={cn(selectClass, 'flex-1 md:flex-none', !local.livroOrigemId && 'opacity-50')}
                    >
                      <option value="">Sem vínculo com livro</option>
                      {state.books.map(b => (
                        <option key={b.id} value={b.id}>{b.titulo.slice(0, 30)} — {b.autor}</option>
                      ))}
                    </select>
                    {livroOrigem && (
                      <span className="text-[10px] text-[var(--accent-blue)] opacity-70 shrink-0 font-bold">{livroOrigem.statusLeitura}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Plataformas */}
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:gap-4 sm:col-span-2">
                <span className={cn(fieldLabel, 'md:pt-1')}>Plataformas</span>
                <div className="flex gap-2 flex-wrap">
                  {PLATFORMS.map(plat => {
                    const ativo = activePlataformas.includes(plat);
                    return (
                      <button
                        key={plat}
                        onClick={() => togglePlataforma(plat)}
                        className={`text-[10px] font-bold px-2.5 py-1.5 rounded-full border transition-all ${
                          ativo
                            ? 'bg-[var(--text-primary)] text-[var(--bg-secondary)] border-[var(--text-primary)]'
                            : 'bg-transparent text-[var(--text-primary)] border-[var(--border-color)] opacity-40 hover:opacity-70'
                        }`}
                      >
                        {plat}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Seções de texto */}
        <div className="space-y-8">

          {/* Roteiro — seção principal */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-widest font-black text-[var(--text-primary)] opacity-50">
                Roteiro
              </span>
              {(() => {
                const serie = state.series.find(s => s.id === local.seriesId);
                if (serie?.estruturaRoteiro) {
                  return (
                    <button
                      onClick={handleAplicarTemplateManual}
                      className="text-[9px] font-bold text-[var(--accent-blue)] hover:underline opacity-60 hover:opacity-100 transition-opacity"
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
              placeholder="Escreva o roteiro aqui..."
              authorName={userName}
              annotations={local.scriptNotes || []}
              onAddAnnotation={handleAddAnnotation}
              onRemoveAnnotation={handleRemoveAnnotation}
              onUpdateAnnotation={handleUpdateAnnotation}
            />
          </section>

          {/* Legendas por plataforma */}
          <section className="pt-8 border-t border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase tracking-widest font-black text-[var(--text-primary)] opacity-50">
                Legenda
              </span>
              <button
                onClick={() =>
                  setConfirm({
                    message: 'Substituir a legenda atual pelo template do pilar?',
                    onConfirm: () => {
                      const template = CAPTION_TEMPLATES[local.pillar] || '';
                      const legendas = { ...(local.legendas || {}) };
                      legendas[legendaTab] = template;
                      setLocal(prev => ({ ...prev, legendas }));
                    },
                  })
                }
                className="text-[9px] font-bold text-[var(--accent-blue)] hover:underline opacity-60 hover:opacity-100 transition-opacity"
              >
                Resetar p/ Template
              </button>
            </div>

            {/* Abas de plataforma */}
            <div className="flex gap-1 mb-3">
              {activePlataformas.map(plat => (
                <button
                  key={plat}
                  onClick={() => setLegendaTab(plat)}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all ${
                    legendaTab === plat
                      ? 'bg-[var(--text-primary)] text-[var(--bg-secondary)]'
                      : 'bg-[var(--bg-hover)] text-[var(--text-primary)] opacity-50 hover:opacity-80'
                  }`}
                >
                  {plat}
                </button>
              ))}
            </div>

            <textarea
              value={legendaAtual}
              onChange={(e) => updateLegenda(legendaTab, e.target.value)}
              className={cn(
                textareaClass,
                legendaTab === 'YouTube' ? 'min-h-[400px]' : 'min-h-[150px]',
                charLimit && charCount > charLimit && 'border-[var(--accent-pink)]'
              )}
              placeholder={
                legendaTab === 'YouTube'
                  ? 'Descrição do vídeo para YouTube...\n\n📌 Sobre este vídeo:\n[Resumo do conteúdo]\n\n⏱ Capítulos:\n0:00 — Intro\n\n🔗 Me encontre aqui:\n→ Instagram: @\n→ TikTok: @\n\n📚 Livros mencionados:\n→ [Título] — [Autor]\n\n#hashtags'
                  : `Legenda para ${legendaTab}...`
              }
            />

            {/* Contador de caracteres + hashtags */}
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {hashtagSugestao[legendaTab] && (
                  <>
                    <span className="text-[9px] uppercase tracking-widest font-bold text-[var(--text-primary)] opacity-30">
                      Hashtags do Pilar
                    </span>
                    <button
                      onClick={() => {
                        const hashtags = hashtagSugestao[legendaTab]!;
                        if (!legendaAtual.includes(hashtags.split(' ')[0])) {
                          updateLegenda(legendaTab, legendaAtual + '\n\n' + hashtags);
                        }
                      }}
                      className="text-[9px] font-bold text-[var(--accent-green)] hover:underline"
                    >
                      + Inserir
                    </button>
                    <span className="text-[9px] text-[var(--text-secondary)] opacity-50 truncate max-w-[200px]">
                      {hashtagSugestao[legendaTab]}
                    </span>
                  </>
                )}
              </div>
              {charLimit && (
                <span className={cn(
                  'text-[9px] font-bold shrink-0 tabular-nums',
                  charCount > charLimit
                    ? 'text-[var(--accent-pink)]'
                    : charCount > charLimit * 0.9
                    ? 'text-[var(--accent-orange)]'
                    : 'text-[var(--text-primary)] opacity-25'
                )}>
                  {charCount}/{charLimit}
                </span>
              )}
            </div>
          </section>

          {/* Notas de Gravação — colapsável */}
          <section className="pt-8 border-t border-[var(--border-color)]">
            <button
              onClick={() => setNotesOpen(v => !v)}
              className="w-full flex items-center justify-between mb-3 group"
            >
              <span className="text-[10px] uppercase tracking-widest font-black text-[var(--text-primary)] opacity-40 group-hover:opacity-70 transition-opacity">
                Notas de Gravação
              </span>
              {notesOpen
                ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-primary)] opacity-30" />
                : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-primary)] opacity-30" />
              }
            </button>
            {notesOpen && (
              <textarea
                value={local.notes || ''}
                onChange={(e) => updateLocal({ notes: e.target.value })}
                className={cn(textareaClass, 'min-h-[100px]')}
                placeholder="Enquadramento, luz, roupa, lembretes..."
              />
            )}
          </section>

          {/* Referências — colapsável */}
          <section className="pt-8 border-t border-[var(--border-color)]">
            <button
              onClick={() => setRefsOpen(v => !v)}
              className="w-full flex items-center justify-between mb-3 group"
            >
              <span className="text-[10px] uppercase tracking-widest font-black text-[var(--text-primary)] opacity-40 group-hover:opacity-70 transition-opacity">
                Referências
              </span>
              {refsOpen
                ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-primary)] opacity-30" />
                : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-primary)] opacity-30" />
              }
            </button>
            {refsOpen && (
              <textarea
                value={local.references || ''}
                onChange={(e) => updateLocal({ references: e.target.value })}
                className={cn(textareaClass, 'min-h-[100px]')}
                placeholder="Links, inspirações, vídeos de referência..."
              />
            )}
          </section>
        </div>
      </div>

      {/* Footer fixo */}
      <div className="px-6 md:px-12 py-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between gap-3 shrink-0 pb-safe">
        <button
          onClick={onClose}
          className="text-xs font-bold text-[var(--text-primary)] opacity-40 hover:opacity-80 transition-opacity"
        >
          Fechar
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
        >
          <Check className="w-3.5 h-3.5" />
          Salvar
        </button>
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
