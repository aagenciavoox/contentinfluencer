import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { PILLARS } from '../constants';
import { Plus, ArrowUpRight, Clock, Lightbulb, X, Trash2, Edit3, Save, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Idea, Content } from '../types';
import { cn } from '../lib/utils';
import { BottomSheetModal } from '../components/BottomSheetModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { PageGuide } from '../components/PageGuide';
import { PageHeader } from '../components/PageHeader';
import { useIsMobile } from '../hooks/useIsMobile';
import { useScrollDirection } from '../hooks/useScrollDirection';

export function Ideas() {
  const { state, dispatch } = useAppContext();
  const [searchParams] = useSearchParams();
  const [newIdeaText, setNewIdeaText] = useState('');
  const [selectedPillar, setSelectedPillar] = useState<any>(PILLARS[0]);
  const [selectedSeries, setSelectedSeries] = useState<string>('');
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [viewingIdea, setViewingIdea] = useState<Idea | null>(null);
  const isMobile = useIsMobile();
  const scrollDirection = useScrollDirection();

  useEffect(() => {
    const livroId = searchParams.get('livroId');
    if (livroId) {
      setSelectedBook(livroId);
    }
  }, [searchParams]);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const allIdeas = state.ideas
    .filter(idea => !idea.archived)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleAddIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdeaText.trim()) return;

    const newIdea: Idea = {
      id: Math.random().toString(36).substr(2, 9),
      text: newIdeaText,
      createdAt: new Date().toISOString(),
      pillar: selectedPillar,
      seriesId: selectedSeries || undefined,
      livroOrigemId: selectedBook || undefined,
      archived: false,
    };

    dispatch({ type: 'ADD_IDEA', payload: newIdea });
    setNewIdeaText('');
    setSelectedBook('');
  };

  const handlePromote = (idea: Idea) => {
    const newContent: Content = {
      id: Math.random().toString(36).substr(2, 9),
      title: idea.text.split('\n')[0].slice(0, 50),
      seriesId: idea.seriesId || '',
      pillar: idea.pillar || PILLARS[0],
      format: 'Reels',
      status: 'Ideia',
      notes: idea.text,
      livroOrigemId: idea.livroOrigemId,
      createdAt: new Date().toISOString(),
    };

    dispatch({ 
      type: 'PROMOTE_IDEA', 
      payload: { ideaId: idea.id, contentId: newContent.id, content: newContent } 
    });
    setViewingIdea(null);
  };

  const handleDelete = (id: string) => {
    setConfirm({ message: 'Tem certeza que deseja excluir esta ideia?', onConfirm: () => { dispatch({ type: 'DELETE_IDEA', payload: id }); setViewingIdea(null); } });
  };

  const handleUpdate = () => {
    if (!viewingIdea || !editValue.trim()) return;
    dispatch({ 
      type: 'UPDATE_IDEA', 
      payload: { ...viewingIdea, text: editValue } 
    });
    setViewingIdea({ ...viewingIdea, text: editValue });
    setIsEditing(false);
  };

  const startEditing = () => {
    if (!viewingIdea) return;
    setEditValue(viewingIdea.text);
    setIsEditing(true);
  };

  const truncateText = (text: string, maxWords: number = 30) => {
    const words = text.split(/\s+/);
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '...';
  };

  return (
    <div className="page-container mx-auto py-6 md:py-16">
      <PageGuide 
        pageId="ideas"
        title="O Berçário de Insights"
        description="Capture tudo o que vier à cabeça aqui. Não se preocupe com a perfeição. Quando uma ideia amadurecer, use o botão 'Promover' para transformá-la em um roteiro no inventário."
        icon={Lightbulb}
      />
      <header className="px-4 md:px-10 py-6 md:py-8 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50 backdrop-blur-md sticky top-0 z-20 transition-colors duration-300">
        <div className="max-w-3xl mx-auto w-full">
          <PageHeader 
            title="Caixa de Ideias" 
            subtitle="Capture tudo, sem julgamento. Promova quando estiver pronto."
            className="!mb-0"
          />
        </div>
      </header>

      <form onSubmit={handleAddIdea} className="mb-8 md:mb-24 p-3 md:p-8 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] elevation-1 max-w-3xl mx-auto group focus-within:border-[var(--accent-blue)] transition-all">
        <textarea
          value={newIdeaText}
          onChange={(e) => setNewIdeaText(e.target.value)}
          placeholder="O que você está pensando?"
          className="w-full min-h-[60px] md:min-h-[120px] text-sm md:text-xl text-[var(--text-primary)] border-none focus:ring-0 p-0 resize-none placeholder:text-[var(--text-tertiary)] mb-3 md:mb-6 bg-transparent custom-scrollbar"
        />
        <div className="flex flex-col items-stretch lg:items-center justify-between pt-3 md:pt-6 border-t border-[var(--border-color)] gap-3 md:gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2 md:gap-3 flex-1">
            <select 
              value={selectedPillar}
              onChange={(e) => setSelectedPillar(e.target.value)}
              className="w-full lg:w-auto text-[9px] md:text-xs bg-[var(--bg-hover)] border-none rounded-lg md:rounded-xl px-2.5 py-2 md:px-4 md:py-3 focus:ring-2 focus:ring-[var(--accent-blue)] font-black text-[var(--text-primary)] uppercase tracking-widest cursor-pointer shadow-sm"
            >
              {PILLARS.map(p => <option key={p}>{p}</option>)}
            </select>
            <select 
              value={selectedSeries}
              onChange={(e) => setSelectedSeries(e.target.value)}
              className="w-full lg:w-auto text-[9px] md:text-xs bg-[var(--bg-hover)] border-none rounded-lg md:rounded-xl px-2.5 py-2 md:px-4 md:py-3 focus:ring-2 focus:ring-[var(--accent-blue)] font-black text-[var(--text-primary)] uppercase tracking-widest cursor-pointer shadow-sm"
            >
              <option value="">Série: Opcional</option>
              {state.series.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {state.books.length > 0 && (
              <select 
                value={selectedBook}
                onChange={(e) => setSelectedBook(e.target.value)}
                className="w-full lg:w-auto text-[9px] md:text-xs bg-[var(--bg-hover)] border-none rounded-lg md:rounded-xl px-2.5 py-2 md:px-4 md:py-3 focus:ring-2 focus:ring-[var(--accent-blue)] font-black text-[var(--text-primary)] uppercase tracking-widest cursor-pointer shadow-sm"
              >
                <option value="">Livro: Opcional</option>
                {state.books.map(b => (
                  <option key={b.id} value={b.id}>{b.titulo.slice(0, 30)}...</option>
                ))}
              </select>
            )}
          </div>
          <button 
            type="submit"
            disabled={!newIdeaText.trim()}
            className="flex items-center justify-center gap-2 md:gap-3 bg-[var(--text-primary)] text-[var(--bg-primary)] px-4 py-2.5 md:px-8 md:py-3.5 rounded-xl md:rounded-2xl text-[9px] md:text-xs font-black transition-all disabled:opacity-20 shadow-lg shrink-0 w-full lg:w-auto hover-action"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" /> CAPTURAR
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
        {allIdeas.map((idea) => (
          <div 
            key={idea.id} 
            onClick={() => {
              setViewingIdea(idea);
              setIsEditing(false);
            }}
            className={cn(
              "group p-5 md:p-8 rounded-2xl border transition-all overflow-hidden break-words cursor-pointer flex flex-col h-full relative",
              idea.archived 
                ? "bg-[var(--bg-hover)]/30 border-transparent grayscale" 
                : "bg-[var(--bg-secondary)] border-[var(--border-color)] hover-card elevation-1"
            )}
          >
            <div className="flex items-start justify-between mb-4 md:mb-6 gap-4">
              <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[9px] md:text-[10px] text-[var(--text-tertiary)] font-black uppercase tracking-[0.2em]">
                <Clock className="w-3 md:w-3.5 h-3 md:h-3.5" />
                {format(new Date(idea.createdAt), "dd 'DE' MMM", { locale: ptBR })}
              </div>
              {idea.archived && (
                <div className="flex items-center gap-1 text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] text-[var(--accent-green)] shrink-0">
                  PROMOVIDO <ArrowUpRight className="w-3 md:w-3.5 h-3 md:h-3.5" />
                </div>
              )}
            </div>
            
            <p className="text-sm md:text-base text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap break-words flex-1 font-medium italic group-hover:text-black dark:group-hover:text-white transition-opacity">
              "{truncateText(idea.text)}"
            </p>

            <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-[var(--border-color)] flex flex-wrap items-center gap-2 md:gap-3">
              {idea.pillar && (
                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.15em] text-[var(--accent-blue)] bg-[var(--accent-blue)]/10 px-2 md:px-3 py-1 rounded-full border border-[var(--accent-blue)]/20">
                  {idea.pillar}
                </span>
              )}
              {idea.seriesId && (
                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.15em] text-[var(--accent-green)] bg-[var(--accent-green)]/10 px-2 md:px-3 py-1 rounded-full border border-[var(--accent-green)]/20">
                  {state.series.find(s => s.id === idea.seriesId)?.name}
                </span>
              )}
              {idea.livroOrigemId && (
                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.15em] text-[var(--accent-orange)] bg-[var(--accent-orange)]/10 px-2 md:px-3 py-1 rounded-full border border-[var(--accent-orange)]/20 flex items-center gap-1">
                  <BookOpen className="w-2.5 md:w-3 h-2.5 md:h-3" />
                  {state.books.find(b => b.id === idea.livroOrigemId)?.titulo}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {allIdeas.length === 0 && (
        <div className="text-center py-20 md:py-32 border-2 border-dashed border-[var(--border-color)] rounded-[2rem] md:rounded-[3rem] opacity-30">
          <Lightbulb className="w-12 md:w-16 h-12 md:h-16 text-[var(--text-primary)] mx-auto mb-4 md:mb-6 opacity-10" />
          <p className="text-[10px] md:text-sm font-black uppercase tracking-[0.3em] text-[var(--text-tertiary)] italic px-6">Aguardando sua próxima faísca criativa...</p>
        </div>
      )}

      <BottomSheetModal
        open={!!viewingIdea}
        onClose={() => setViewingIdea(null)}
        desktopMaxW="max-w-3xl"
        zIndex="z-[100]"
      >
        {viewingIdea && (
          <>
            <div className="flex items-center justify-between p-4 md:p-8 border-b border-[var(--border-color)] shrink-0">
              <div className="flex items-center gap-3 md:gap-4 text-[9px] md:text-[10px] text-[var(--text-tertiary)] font-black uppercase tracking-[0.2em]">
                <Clock className="w-3.5 md:w-4 h-3.5 md:h-4" />
                {format(new Date(viewingIdea.createdAt), "dd 'DE' MMMM 'ÀS' HH:mm", { locale: ptBR })}
              </div>
              <button
                onClick={() => setViewingIdea(null)}
                className="p-2 md:p-3 hover:bg-[var(--bg-hover)] rounded-full transition-all text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 md:p-14 custom-scrollbar">
              <div className="flex flex-wrap gap-2 md:gap-3 mb-6 md:mb-8">
                  {viewingIdea.pillar && (
                    <span className="px-3 md:px-4 py-1 md:py-1.5 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-[var(--accent-blue)]/20">
                      {viewingIdea.pillar}
                    </span>
                  )}
                  {viewingIdea.seriesId && (
                    <span className="px-3 md:px-4 py-1 md:py-1.5 bg-[var(--accent-green)]/10 text-[var(--accent-green)] text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-[var(--accent-green)]/20">
                      {state.series.find(s => s.id === viewingIdea.seriesId)?.name}
                    </span>
                  )}
                  {viewingIdea.livroOrigemId && (
                    <span className="px-3 md:px-4 py-1 md:py-1.5 bg-[var(--accent-orange)]/10 text-[var(--accent-orange)] text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-[var(--accent-orange)]/20 flex items-center gap-1.5">
                      <BookOpen className="w-3 md:w-3.5 h-3 md:h-3.5" />
                      {state.books.find(b => b.id === viewingIdea.livroOrigemId)?.titulo}
                    </span>
                  )}
                  {viewingIdea.archived && (
                    <span className="px-3 md:px-4 py-1 md:py-1.5 bg-[var(--accent-orange)]/10 text-[var(--accent-orange)] text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-[var(--accent-orange)]/20">
                      PROMOVIDO
                    </span>
                  )}
                </div>
                
                {isEditing ? (
                  <textarea
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full min-h-[120px] md:min-h-[400px] text-lg md:text-2xl text-[var(--text-primary)] leading-relaxed border-none focus:ring-0 p-0 resize-none bg-transparent custom-scrollbar font-medium"
                    placeholder="Desenvolva sua ideia..."
                  />
                ) : (
                  <p className="text-lg md:text-2xl text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap break-words font-medium italic">
                    "{viewingIdea.text}"
                  </p>
                )}
              </div>

            <div className="p-4 md:p-8 bg-[var(--bg-hover)] border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3 shrink-0 pb-safe">
              <div className="flex items-center gap-3 flex-1">
                <button
                  onClick={() => handleDelete(viewingIdea.id)}
                  className="p-3 text-[var(--accent-pink)] hover:bg-[var(--accent-pink)]/10 rounded-2xl transition-all"
                  title="Excluir Definitivamente"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                {isEditing ? (
                  <button
                    onClick={handleUpdate}
                    className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-[var(--accent-green)] text-white px-6 py-2.5 rounded-2xl text-sm font-black hover:scale-105 transition-all shadow-xl shadow-[var(--accent-green)]/20"
                  >
                    <Save className="w-4 h-4" /> SALVAR
                  </button>
                ) : (
                  <button
                    onClick={startEditing}
                    className="p-3 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-2xl transition-all"
                    title="Editar Texto"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                )}
              </div>

              {!viewingIdea.archived && !isEditing && (
                <button
                  onClick={() => handlePromote(viewingIdea)}
                  className="flex items-center justify-center gap-2 bg-[var(--text-primary)] text-[var(--bg-primary)] px-5 py-3 rounded-2xl text-sm font-black transition-all shadow-2xl shadow-black/20 w-full md:w-auto hover-action"
                >
                  PROMOVER <ArrowUpRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </>
        )}
      </BottomSheetModal>
      <ConfirmModal
        open={!!confirm}
        message={confirm?.message || ''}
        onConfirm={() => { confirm?.onConfirm(); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
