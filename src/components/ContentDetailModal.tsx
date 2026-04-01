import { useState } from 'react';
import { X, Trash2, ExternalLink, BookOpen, Check } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { STATUS_STAGES, CAPTION_TEMPLATES, PLATFORMS, VISUAL_FORMATS } from '../constants';
import { Content, Platform, VisualFormat } from '../types';
import { cn } from '../lib/utils';
import { BottomSheetModal } from './BottomSheetModal';

interface ContentDetailModalProps {
  content: Content;
  onClose: () => void;
  initialLivroOrigemId?: string;
}

export function ContentDetailModal({ content, onClose, initialLivroOrigemId }: ContentDetailModalProps) {
  const { state, dispatch } = useAppContext();

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

    setLocal(prev => ({ ...prev, ...updates }));
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

  const handleSave = () => {
    dispatch({ type: 'UPDATE_CONTENT', payload: local });
    onClose();
  };

  const handleDeleteContent = () => {
    if (window.confirm('Tem certeza que deseja excluir este conteúdo?')) {
      dispatch({ type: 'DELETE_CONTENT', payload: local.id });
      onClose();
    }
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

  return (
    <BottomSheetModal open={true} onClose={onClose} desktopMaxW="max-w-[820px]">
          {/* Área rolável */}
          <div className="p-6 md:p-12 flex-1 overflow-y-auto custom-scrollbar">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteContent}
                  className="p-2 hover:bg-red-50 rounded-full transition-colors group"
                  title="Excluir Conteúdo"
                >
                  <Trash2 className="w-4 h-4 text-red-500 opacity-40 group-hover:opacity-100" />
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

            {/* Metadados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8 mb-10 py-6 border-y border-[var(--border-strong)]">
              {/* Status */}
              <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-50 md:w-20 md:shrink-0">Status</span>
                <select
                  value={local.status}
                  onChange={(e) => updateLocal({ status: e.target.value as any })}
                  className="text-xs bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded-lg px-3 py-2.5 focus:ring-0 text-[var(--text-primary)] w-full md:w-auto shadow-sm"
                >
                  {STATUS_STAGES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              {/* Série */}
              <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-50 md:w-20 md:shrink-0">Série</span>
                <select
                  value={local.seriesId ?? ''}
                  onChange={(e) => {
                    if (e.target.value === 'new') {
                      const name = prompt('Nome da nova série:');
                      if (name) {
                        const newSeries = {
                          id: Math.random().toString(36).substr(2, 9),
                          name,
                          template: '',
                          notes: '',
                        };
                        dispatch({ type: 'ADD_SERIES', payload: newSeries });
                        updateLocal({ seriesId: newSeries.id });
                      }
                    } else {
                      updateLocal({ seriesId: e.target.value });
                    }
                  }}
                  className={`text-xs bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded-lg px-3 py-2.5 focus:ring-0 text-[var(--text-primary)] w-full md:w-auto shadow-sm ${!local.seriesId ? 'opacity-50' : ''}`}
                >
                  <option value="">Sem Série</option>
                  {state.series.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                  <option value="new">+ Nova Série...</option>
                </select>
              </div>

              {/* Livro de Origem */}
              {state.books.length > 0 && (
                <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4 sm:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-50 md:w-20 md:shrink-0 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> Livro
                  </span>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <select
                      value={local.livroOrigemId || ''}
                      onChange={(e) => updateLocal({ livroOrigemId: e.target.value || undefined })}
                      className={`text-xs bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded-lg px-3 py-2.5 focus:ring-0 text-[var(--text-primary)] flex-1 md:flex-none shadow-sm ${!local.livroOrigemId ? 'opacity-50' : ''}`}
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

              {/* Slot */}
              <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-50 md:w-20 md:shrink-0">Slot</span>
                <select
                  value={local.slotType || ''}
                  onChange={(e) => updateLocal({ slotType: e.target.value as any })}
                  className={`text-xs bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded-lg px-3 py-2.5 focus:ring-0 text-[var(--text-primary)] w-full md:w-auto shadow-sm ${!local.slotType ? 'opacity-50' : ''}`}
                >
                  <option value="">—</option>
                  <option value="Curto">Curto (Viral)</option>
                  <option value="Série">Série (Identidade)</option>
                  <option value="Janela">Janela (Presença)</option>
                </select>
              </div>

              {/* Pilar */}
              <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-50 md:w-20 md:shrink-0">Pilar</span>
                <select
                  value={local.pillar}
                  onChange={(e) => updateLocal({ pillar: e.target.value })}
                  className={`text-xs bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded-lg px-3 py-2.5 focus:ring-0 text-[var(--text-primary)] w-full md:w-auto shadow-sm ${!local.pillar ? 'opacity-50' : ''}`}
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

              {/* Formato Visual */}
              <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-50 md:w-20 md:shrink-0">Visual</span>
                <select
                  value={local.formatoVisual || ''}
                  onChange={(e) => updateLocal({ formatoVisual: e.target.value as VisualFormat || undefined })}
                  className={`text-xs bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded-lg px-3 py-2.5 focus:ring-0 text-[var(--text-primary)] w-full md:w-auto shadow-sm ${!local.formatoVisual ? 'opacity-50' : ''}`}
                >
                  <option value="">—</option>
                  {VISUAL_FORMATS.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>

              {/* Look */}
              <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-50 md:w-20 md:shrink-0">Look #</span>
                {state.looks.length > 0 ? (
                  <select
                    value={local.lookId || ''}
                    onChange={(e) => updateLocal({ lookId: e.target.value || undefined })}
                    className={`text-xs bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded-lg px-3 py-2.5 focus:ring-0 text-[var(--text-primary)] w-full md:w-auto shadow-sm ${!local.lookId ? 'opacity-50' : ''}`}
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
                    className="text-xs bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded-lg px-3 py-2.5 focus:ring-0 text-[var(--text-primary)] placeholder:opacity-40 w-full md:w-auto shadow-sm"
                  />
                )}
              </div>

              {/* Cenário */}
              <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-50 md:w-20 md:shrink-0">Cenário</span>
                {state.cenarios.length > 0 ? (
                  <select
                    value={local.scenario || ''}
                    onChange={(e) => updateLocal({ scenario: e.target.value || undefined })}
                    className={`text-xs bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded-lg px-3 py-2.5 focus:ring-0 text-[var(--text-primary)] w-full md:w-auto shadow-sm ${!local.scenario ? 'opacity-50' : ''}`}
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
                    className="text-xs bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded-lg px-3 py-2.5 focus:ring-0 text-[var(--text-primary)] placeholder:opacity-40 w-full md:w-auto shadow-sm"
                  />
                )}
              </div>

              {/* Duração */}
              <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-50 md:w-20 md:shrink-0">Duração</span>
                <input
                  type="number"
                  value={local.estimatedDuration || ''}
                  onChange={(e) => updateLocal({ estimatedDuration: parseInt(e.target.value) || undefined })}
                  placeholder="Segundos"
                  className="text-xs bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded-lg px-3 py-2.5 focus:ring-0 w-full md:w-28 text-[var(--text-primary)] placeholder:opacity-40 shadow-sm"
                />
              </div>

              {/* Gravação */}
              <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-50 md:w-20 md:shrink-0">Gravação</span>
                <input
                  type="date"
                  value={local.recordingDate || ''}
                  onChange={(e) => updateLocal({ recordingDate: e.target.value })}
                  className={`text-xs bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded-lg px-3 py-2.5 focus:ring-0 w-full md:w-auto text-[var(--text-primary)] shadow-sm ${!local.recordingDate ? 'opacity-50' : ''}`}
                />
              </div>

              {/* Postagem */}
              <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-50 md:w-20 md:shrink-0">Postagem</span>
                <input
                  type="date"
                  value={local.publishDate || ''}
                  onChange={(e) => updateLocal({ publishDate: e.target.value })}
                  className={`text-xs bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded-lg px-3 py-2.5 focus:ring-0 w-full md:w-auto text-[var(--text-primary)] shadow-sm ${!local.publishDate ? 'opacity-50' : ''}`}
                />
              </div>

              {/* Plataformas */}
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:gap-4 sm:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-50 md:w-20 md:shrink-0 md:pt-1">Plataformas</span>
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
                            : 'bg-transparent text-[var(--text-primary)] border-[var(--border-strong)] opacity-40 hover:opacity-70'
                        }`}
                      >
                        {plat}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Seções de texto */}
            <div className="space-y-8">
              {/* Roteiro */}
              <section>
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-primary)] opacity-50 mb-3">
                  Roteiro
                </h3>
                <textarea
                  value={local.script || ''}
                  onChange={(e) => updateLocal({ script: e.target.value })}
                  className="w-full min-h-[200px] text-sm text-[var(--text-primary)] border border-[var(--border-strong)] focus:ring-0 p-4 resize-none placeholder:italic placeholder:opacity-40 bg-[var(--bg-hover)] rounded-xl"
                  placeholder="Escreva o roteiro aqui..."
                />
              </section>

              {/* Legendas por plataforma */}
              <section className="pt-8 border-t border-[var(--border-strong)]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-primary)] opacity-50">
                    Legenda
                  </h3>
                  <button
                    onClick={() => {
                      const template = CAPTION_TEMPLATES[local.pillar] || '';
                      const legendas = { ...(local.legendas || {}) };
                      legendas[legendaTab] = template;
                      setLocal(prev => ({ ...prev, legendas }));
                    }}
                    className="text-[9px] font-bold text-[var(--accent-blue)] hover:underline"
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
                  value={local.legendas?.[legendaTab] || local.caption || ''}
                  onChange={(e) => updateLegenda(legendaTab, e.target.value)}
                  className={cn(
                    "w-full text-sm text-[var(--text-primary)] border-none focus:ring-0 p-4 resize-none placeholder:italic bg-blue-50/20 rounded-xl",
                    legendaTab === 'YouTube' ? 'min-h-[400px]' : 'min-h-[150px]'
                  )}
                  placeholder={
                    legendaTab === 'YouTube'
                      ? 'Descrição do vídeo para YouTube...\n\n📌 Sobre este vídeo:\n[Resumo do conteúdo]\n\n⏱ Capítulos:\n0:00 — Intro\n\n🔗 Me encontre aqui:\n→ Instagram: @\n→ TikTok: @\n\n📚 Livros mencionados:\n→ [Título] — [Autor]\n\n#hashtags'
                      : `Legenda para ${legendaTab}...`
                  }
                />

                {/* Sugestão de hashtags do pilar */}
                {hashtagSugestao[legendaTab] && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[9px] uppercase tracking-widest font-bold text-[var(--text-primary)] opacity-30">
                      Hashtags do Pilar
                    </span>
                    <button
                      onClick={() => {
                        const legendaAtual = local.legendas?.[legendaTab] || '';
                        const hashtags = hashtagSugestao[legendaTab]!;
                        if (!legendaAtual.includes(hashtags.split(' ')[0])) {
                          updateLegenda(legendaTab, legendaAtual + '\n\n' + hashtags);
                        }
                      }}
                      className="text-[9px] font-bold text-[var(--accent-green)] hover:underline"
                    >
                      + Inserir
                    </button>
                    <span className="text-[9px] text-[var(--text-secondary)] opacity-60">
                      {hashtagSugestao[legendaTab]}
                    </span>
                  </div>
                )}
              </section>

              {/* Tags */}
              <section className="pt-8 border-t border-[var(--border-strong)]">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-primary)] opacity-50 mb-3">
                  Tags & Hashtags
                </h3>
                <input
                  type="text"
                  value={local.tags || ''}
                  onChange={(e) => updateLocal({ tags: e.target.value })}
                  className="w-full text-sm text-[var(--text-primary)] border border-[var(--border-strong)] focus:ring-0 px-4 py-3 placeholder:italic placeholder:opacity-40 bg-[var(--bg-hover)] rounded-xl"
                  placeholder="#livros #booktok #literatura"
                />
              </section>

              {/* Notas de Gravação */}
              <section className="pt-8 border-t border-[var(--border-strong)]">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-primary)] opacity-50 mb-3">
                  Notas de Gravação
                </h3>
                <textarea
                  value={local.notes || ''}
                  onChange={(e) => updateLocal({ notes: e.target.value })}
                  className="w-full min-h-[100px] text-sm text-[var(--text-primary)] border border-[var(--border-strong)] focus:ring-0 p-4 resize-none placeholder:italic placeholder:opacity-40 bg-[var(--bg-hover)] rounded-xl"
                  placeholder="Enquadramento, luz, roupa, lembretes..."
                />
              </section>

              {/* Referências */}
              <section className="pt-8 border-t border-[var(--border-strong)]">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-primary)] opacity-50 mb-3">
                  Referências
                </h3>
                <textarea
                  value={local.references || ''}
                  onChange={(e) => updateLocal({ references: e.target.value })}
                  className="w-full min-h-[100px] text-sm text-[var(--text-primary)] border border-[var(--border-strong)] focus:ring-0 p-4 resize-none placeholder:italic placeholder:opacity-40 bg-[var(--bg-hover)] rounded-xl"
                  placeholder="Links, inspirações, vídeos de referência..."
                />
              </section>
            </div>
          </div>

          {/* Footer fixo */}
          <div className="px-6 md:px-12 py-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between gap-3 shrink-0 pb-safe">
            <button
              onClick={onClose}
              className="text-xs font-bold text-[var(--text-primary)] opacity-40 hover:opacity-80 transition-opacity"
            >
              Descartar
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
            >
              <Check className="w-3.5 h-3.5" />
              Salvar
            </button>
          </div>
    </BottomSheetModal>
  );
}
