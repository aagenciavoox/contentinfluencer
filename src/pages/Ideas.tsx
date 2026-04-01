import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { PILLARS } from '../constants';
import { Plus, Archive, ArrowUpRight, Clock, Lightbulb, X, Trash2, Edit3, Save, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Idea, Content } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function Ideas() {
  const { state, dispatch } = useAppContext();
  const [newIdeaText, setNewIdeaText] = useState('');
  const [selectedPillar, setSelectedPillar] = useState<any>(PILLARS[0]);
  const [selectedSeries, setSelectedSeries] = useState<string>('');
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [viewingIdea, setViewingIdea] = useState<Idea | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const allIdeas = [...state.ideas]
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
    if (window.confirm('Tem certeza que deseja excluir esta ideia?')) {
      dispatch({ type: 'DELETE_IDEA', payload: id });
      setViewingIdea(null);
    }
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
    <div className="max-w-7xl mx-auto py-10 md:py-16 px-6 md:px-10 transition-colors duration-200">
      <header className="mb-12 md:mb-16 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-black text-[var(--text-primary)] mb-6 tracking-tight italic">Caixa de Ideias</h1>
        <p className="text-base text-[var(--text-tertiary)] font-medium">Capture tudo, sem julgamento. Promova quando estiver pronto.</p>
      </header>

      <form onSubmit={handleAddIdea} className="mb-16 md:mb-24 p-8 bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-color)] shadow-xl max-w-3xl group focus-within:border-[var(--accent-blue)] transition-all">
        <textarea
          value={newIdeaText}
          onChange={(e) => setNewIdeaText(e.target.value)}
          placeholder="O que você está pensando?"
          className="w-full min-h-[120px] text-lg md:text-xl text-[var(--text-primary)] border-none focus:ring-0 p-0 resize-none placeholder:text-[var(--text-tertiary)] placeholder:opacity-30 mb-6 bg-transparent custom-scrollbar"
        />
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-6 border-t border-[var(--border-color)] gap-6">
          <div className="flex items-center gap-3">
            <select 
              value={selectedPillar}
              onChange={(e) => setSelectedPillar(e.target.value)}
              className="text-xs bg-[var(--bg-hover)] border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-[var(--accent-blue)] font-black text-[var(--text-primary)] uppercase tracking-widest cursor-pointer"
            >
              {PILLARS.map(p => <option key={p}>{p}</option>)}
            </select>
            <select 
              value={selectedSeries}
              onChange={(e) => setSelectedSeries(e.target.value)}
              className="text-xs bg-[var(--bg-hover)] border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-[var(--accent-blue)] font-black text-[var(--text-primary)] uppercase tracking-widest cursor-pointer"
            >
              <option value="">Série: Opcional</option>
              {state.series.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {state.books.length > 0 && (
              <select 
                value={selectedBook}
                onChange={(e) => setSelectedBook(e.target.value)}
                className="text-xs bg-[var(--bg-hover)] border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-[var(--accent-blue)] font-black text-[var(--text-primary)] uppercase tracking-widest cursor-pointer"
              >
                <option value="">Livro: Opcional</option>
                {state.books.map(b => <option key={b.id} value={b.id}>{b.titulo}</option>)}
              </select>
            )}
          </div>
          <button 
            type="submit"
            disabled={!newIdeaText.trim()}
            className="flex items-center justify-center gap-3 bg-[var(--text-primary)] text-[var(--bg-primary)] px-8 py-3 rounded-2xl text-sm font-black hover:scale-105 active:scale-95 transition-all disabled:opacity-20 shadow-lg"
          >
            <Plus className="w-5 h-5" /> CAPTURAR
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {allIdeas.map((idea) => (
          <div 
            key={idea.id} 
            onClick={() => {
              setViewingIdea(idea);
              setIsEditing(false);
            }}
            className={cn(
              "group p-6 md:p-8 rounded-3xl border transition-all overflow-hidden break-words cursor-pointer flex flex-col h-full relative",
              idea.archived 
                ? "bg-[var(--bg-hover)]/30 border-transparent opacity-50 grayscale" 
                : "bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-[var(--border-strong)] hover:shadow-2xl hover:-translate-y-1 shadow-sm"
            )}
          >
            <div className="flex items-start justify-between mb-6 gap-4">
              <div className="flex flex-wrap items-center gap-3 text-[10px] text-[var(--text-tertiary)] font-black uppercase tracking-[0.2em]">
                <Clock className="w-3.5 h-3.5" />
                {format(new Date(idea.createdAt), "dd 'DE' MMM", { locale: ptBR })}
              </div>
              {idea.archived && (
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--accent-green)] shrink-0">
                  PROMOVIDO <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
            
            <p className="text-base text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap break-words flex-1 font-medium italic opacity-90 group-hover:opacity-100 transition-opacity">
              "{truncateText(idea.text)}"
            </p>

            <div className="mt-8 pt-6 border-t border-[var(--border-color)] flex flex-wrap items-center gap-3">
              {idea.pillar && (
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-[var(--accent-blue)] bg-[var(--accent-blue)]/10 px-3 py-1 rounded-full border border-[var(--accent-blue)]/20">
                  {idea.pillar}
                </span>
              )}
              {idea.seriesId && (
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-[var(--accent-green)] bg-[var(--accent-green)]/10 px-3 py-1 rounded-full border border-[var(--accent-green)]/20">
                  {state.series.find(s => s.id === idea.seriesId)?.name}
                </span>
              )}
              {idea.livroOrigemId && (
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-[var(--accent-orange)] bg-[var(--accent-orange)]/10 px-3 py-1 rounded-full border border-[var(--accent-orange)]/20 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {state.books.find(b => b.id === idea.livroOrigemId)?.titulo}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {allIdeas.length === 0 && (
        <div className="text-center py-32 border-2 border-dashed border-[var(--border-color)] rounded-[3rem] opacity-30">
          <Lightbulb className="w-16 h-16 text-[var(--text-primary)] mx-auto mb-6 opacity-20" />
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[var(--text-tertiary)] italic">Aguardando sua próxima faísca criativa...</p>
        </div>
      )}

      <AnimatePresence>
        {viewingIdea && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingIdea(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative w-full max-w-3xl bg-[var(--bg-secondary)] rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[85vh] border border-[var(--border-color)]"
            >
              <div className="flex items-center justify-between p-8 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-4 text-[10px] text-[var(--text-tertiary)] font-black uppercase tracking-[0.2em]">
                  <Clock className="w-4 h-4" />
                  {format(new Date(viewingIdea.createdAt), "dd 'DE' MMMM 'ÀS' HH:mm", { locale: ptBR })}
                </div>
                <button 
                  onClick={() => setViewingIdea(null)}
                  className="p-3 hover:bg-[var(--bg-hover)] rounded-full transition-all text-[var(--text-primary)] opacity-40 hover:opacity-100"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 md:p-14 custom-scrollbar">
                <div className="flex flex-wrap gap-3 mb-10">
                  {viewingIdea.pillar && (
                    <span className="px-4 py-1.5 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-[var(--accent-blue)]/20">
                      {viewingIdea.pillar}
                    </span>
                  )}
                  {viewingIdea.seriesId && (
                    <span className="px-4 py-1.5 bg-[var(--accent-green)]/10 text-[var(--accent-green)] text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-[var(--accent-green)]/20">
                      {state.series.find(s => s.id === viewingIdea.seriesId)?.name}
                    </span>
                  )}
                  {viewingIdea.livroOrigemId && (
                    <span className="px-4 py-1.5 bg-[var(--accent-orange)]/10 text-[var(--accent-orange)] text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-[var(--accent-orange)]/20 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      {state.books.find(b => b.id === viewingIdea.livroOrigemId)?.titulo}
                    </span>
                  )}
                  {viewingIdea.archived && (
                    <span className="px-4 py-1.5 bg-[var(--accent-orange)]/10 text-[var(--accent-orange)] text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-[var(--accent-orange)]/20">
                      PROMOVIDO
                    </span>
                  )}
                </div>
                
                {isEditing ? (
                  <textarea
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full min-h-[400px] text-xl md:text-2xl text-[var(--text-primary)] leading-relaxed border-none focus:ring-0 p-0 resize-none bg-transparent custom-scrollbar font-medium"
                    placeholder="Desenvolva sua ideia..."
                  />
                ) : (
                  <p className="text-xl md:text-2xl text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap break-words font-medium italic opacity-90">
                    "{viewingIdea.text}"
                  </p>
                )}
              </div>

              <div className="p-8 bg-[var(--bg-hover)] border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleDelete(viewingIdea.id)}
                    className="p-4 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
                    title="Excluir Definitivamente"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                  {isEditing ? (
                    <button
                      onClick={handleUpdate}
                      className="flex items-center gap-3 bg-[var(--accent-green)] text-white px-8 py-3 rounded-2xl text-sm font-black hover:scale-105 transition-all shadow-xl shadow-[var(--accent-green)]/20"
                    >
                      <Save className="w-5 h-5" /> SALVAR ALTERAÇÕES
                    </button>
                  ) : (
                    <button
                      onClick={startEditing}
                      className="p-4 text-[var(--text-primary)] opacity-30 hover:opacity-100 hover:bg-[var(--bg-secondary)] rounded-2xl transition-all"
                      title="Editar Texto"
                    >
                      <Edit3 className="w-6 h-6" />
                    </button>
                  )}
                </div>

                {!viewingIdea.archived && !isEditing && (
                  <button
                    onClick={() => handlePromote(viewingIdea)}
                    className="flex items-center gap-3 bg-[var(--text-primary)] text-[var(--bg-primary)] px-8 py-4 rounded-2xl text-sm font-black hover:scale-105 transition-all shadow-2xl shadow-black/20"
                  >
                    PROMOVER PARA CONTEÚDO <ArrowUpRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
