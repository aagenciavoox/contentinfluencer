import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '../../../context/AppContext';
import { Plus, ArrowUpRight, Clock, Lightbulb, X, Trash2, Edit3, Save, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Idea, Content } from '../../../lib/database';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { IdeasMobileScreen } from '../../../mobile/screens/ideas/IdeasMobileScreen';
import { generateUUID } from '../../../utils/uuid';

export function IdeasPage() {
  const { state, dispatch } = useAppContext();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [newIdeaText, setNewIdeaText] = useState('');
  const [selectedPilarId, setSelectedPilarId] = useState<string>('');
  const [selectedSeries, setSelectedSeries] = useState<string>('');
  const [selectedBibliotecaId, setSelectedBibliotecaId] = useState<string>('');
  const [viewingIdea, setViewingIdea] = useState<Idea | null>(null);

  useEffect(() => {
    const itemId = searchParams.get('itemId');
    if (itemId) setSelectedBibliotecaId(itemId);
  }, [searchParams]);

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const allIdeas = [...state.ideas]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const activeIdeas = allIdeas.filter(idea => !idea.archived);

  const handleAddIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdeaText.trim()) return;

    const newIdea: Omit<Idea, 'createdAt'> = {
      id: generateUUID(),
      userId: '',
      text: newIdeaText,
      pilarId: selectedPilarId || null,
      seriesId: selectedSeries || null,
      origemId: selectedBibliotecaId || null,
      promotedToContentId: null,
      archived: false,
    };

    dispatch({ type: 'ADD_IDEA', payload: { ...newIdea, createdAt: new Date().toISOString() } });
    setNewIdeaText('');
    setSelectedBibliotecaId('');
  };

  const handlePromote = (idea: Idea) => {
    const newContent: Omit<Content, 'createdAt' | 'deletedAt' | 'plataformas' | 'scriptNotes'> = {
      id: generateUUID(),
      userId: '',
      title: idea.text.split('\n')[0].slice(0, 50),
      status: 'Ideia',
      slotType: null,
      seriesId: idea.seriesId,
      pilarId: idea.pilarId,
      cenarioId: null,
      lookId: null,
      formatoVisual: null,
      script: null,
      tags: [],
      notes: idea.text,
      referencias: null,
      energiaNecessaria: null,
      publishDate: null,
      recordingDate: null,
      link: null,
      bibliotecaItemId: idea.origemId,
      updatedAt: new Date().toISOString(),
    };

    dispatch({
      type: 'PROMOTE_IDEA',
      payload: {
        ideaId: idea.id,
        contentId: newContent.id,
        content: { ...newContent, createdAt: new Date().toISOString(), deletedAt: null, plataformas: [], scriptNotes: [] },
      },
    });
    setViewingIdea(null);
  };

  const handleDelete = (id: string) => {
    setConfirm({
      message: 'Tem certeza que deseja excluir esta ideia?',
      onConfirm: () => { dispatch({ type: 'DELETE_IDEA', payload: id }); setViewingIdea(null); },
    });
  };

  const handleUpdate = () => {
    if (!viewingIdea || !editValue.trim()) return;
    dispatch({ type: 'UPDATE_IDEA', payload: { ...viewingIdea, text: editValue } });
    setViewingIdea({ ...viewingIdea, text: editValue });
    setIsEditing(false);
  };

  const startEditing = () => {
    if (!viewingIdea) return;
    setEditValue(viewingIdea.text);
    setIsEditing(true);
  };

  const truncateText = (text: string, maxWords = 30) => {
    const words = text.split(/\s+/);
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '...';
  };

  const getPilarNome = (pilarId: string | null) =>
    state.pilares.find(p => p.id === pilarId)?.nome ?? null;

  const getBibliotecaTitulo = (itemId: string | null) =>
    state.bibliotecaItems.find(b => b.id === itemId)?.titulo ?? null;

  const consumindo = state.bibliotecaItems.filter(b => ['Consumindo', 'Lendo', 'Assistindo'].includes(b.status));

  if (isMobile) {
    return (
      <>
        <IdeasMobileScreen
          newIdeaText={newIdeaText}
          selectedPilarId={selectedPilarId}
          selectedSeries={selectedSeries}
          selectedBibliotecaId={selectedBibliotecaId}
          ideas={allIdeas}
          state={state}
          onNewIdeaTextChange={setNewIdeaText}
          onSelectedPilarIdChange={setSelectedPilarId}
          onSelectedSeriesChange={setSelectedSeries}
          onSelectedBibliotecaIdChange={setSelectedBibliotecaId}
          onSubmit={handleAddIdea}
          onOpenIdea={(idea) => {
            setViewingIdea(idea);
            setIsEditing(false);
          }}
        />
        <BottomSheetModal open={!!viewingIdea} onClose={() => setViewingIdea(null)} desktopMaxW="max-w-3xl" zIndex="z-[100]">
          {viewingIdea && (
            <>
              <div className="flex items-center justify-between border-b border-[var(--border-color)] p-4 shrink-0">
                <div className="flex items-center gap-3 text-[9px] text-[var(--text-tertiary)] font-black uppercase tracking-[0.2em]">
                  <Clock className="h-3.5 w-3.5" />
                  {format(new Date(viewingIdea.createdAt), "dd 'DE' MMMM 'AS' HH:mm", { locale: ptBR })}
                </div>
                <button onClick={() => setViewingIdea(null)} className="rounded-full p-2 text-[var(--text-tertiary)] transition-all hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                <div className="mb-6 flex flex-wrap gap-2">
                  {viewingIdea.pilarId && getPilarNome(viewingIdea.pilarId) && (
                    <span className="rounded-full border border-[var(--accent-blue)]/20 bg-[var(--accent-blue)]/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--accent-blue)]">
                      {getPilarNome(viewingIdea.pilarId)}
                    </span>
                  )}
                  {viewingIdea.seriesId && (
                    <span className="rounded-full border border-[var(--accent-green)]/20 bg-[var(--accent-green)]/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--accent-green)]">
                      {state.series.find(s => s.id === viewingIdea.seriesId)?.name}
                    </span>
                  )}
                  {viewingIdea.origemId && getBibliotecaTitulo(viewingIdea.origemId) && (
                    <span className="flex items-center gap-1.5 rounded-full border border-[var(--accent-orange)]/20 bg-[var(--accent-orange)]/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--accent-orange)]">
                      <BookOpen className="h-3 w-3" />
                      {getBibliotecaTitulo(viewingIdea.origemId)}
                    </span>
                  )}
                  {viewingIdea.archived && (
                    <span className="rounded-full border border-[var(--accent-orange)]/20 bg-[var(--accent-orange)]/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--accent-orange)]">
                      Promovido
                    </span>
                  )}
                </div>

                {isEditing ? (
                  <textarea
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="min-h-[220px] w-full resize-none border-none bg-transparent p-0 text-lg font-medium leading-relaxed text-[var(--text-primary)] custom-scrollbar"
                    placeholder="Desenvolva sua ideia..."
                  />
                ) : (
                  <p className="text-lg font-medium italic leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap break-words">
                    "{viewingIdea.text}"
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-color)] bg-[var(--bg-hover)] p-4 pb-safe shrink-0">
                <div className="flex flex-1 items-center gap-3">
                  <button onClick={() => handleDelete(viewingIdea.id)} className="rounded-2xl p-3 text-[var(--accent-pink)] transition-all hover:bg-[var(--accent-pink)]/10" title="Excluir">
                    <Trash2 className="h-5 w-5" />
                  </button>
                  {isEditing ? (
                    <button onClick={handleUpdate} className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-[var(--accent-green)] px-6 py-2.5 text-sm font-black text-white shadow-xl shadow-[var(--accent-green)]/20 transition-all">
                      <Save className="h-4 w-4" /> SALVAR
                    </button>
                  ) : (
                    <button onClick={startEditing} className="rounded-2xl p-3 text-[var(--text-tertiary)] transition-all hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]" title="Editar">
                      <Edit3 className="h-5 w-5" />
                    </button>
                  )}
                </div>
                {!viewingIdea.archived && !isEditing && (
                  <button onClick={() => handlePromote(viewingIdea)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--text-primary)] px-5 py-3 text-sm font-black text-[var(--bg-primary)] shadow-2xl shadow-black/20 transition-all">
                    PROMOVER <ArrowUpRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </>
          )}
        </BottomSheetModal>
        <ConfirmModal open={!!confirm} message={confirm?.message || ''} onConfirm={() => { confirm?.onConfirm(); setConfirm(null); }} onCancel={() => setConfirm(null)} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <header className="desktop-header-sticky transition-colors duration-300">
        <div className="desktop-header-frame">
          <DesktopPageHeader
            section="Inventário Criativo"
            title="Ideias"
            subtitle="Capture, organize e promova temas que ainda vão virar conteúdo."
            icon={Lightbulb}
            className="mb-0"
          />
        </div>
      </header>

      <div className="desktop-content-frame">
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
              value={selectedPilarId}
              onChange={(e) => setSelectedPilarId(e.target.value)}
              className="w-full lg:w-auto text-[9px] md:text-xs bg-[var(--bg-hover)] border-none rounded-lg md:rounded-xl px-2.5 py-2 md:px-4 md:py-3 focus:ring-2 focus:ring-[var(--accent-blue)] font-black text-[var(--text-primary)] uppercase tracking-widest cursor-pointer shadow-sm"
            >
              <option value="">Pilar: Opcional</option>
              {state.pilares.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <select
              value={selectedSeries}
              onChange={(e) => setSelectedSeries(e.target.value)}
              className="w-full lg:w-auto text-[9px] md:text-xs bg-[var(--bg-hover)] border-none rounded-lg md:rounded-xl px-2.5 py-2 md:px-4 md:py-3 focus:ring-2 focus:ring-[var(--accent-blue)] font-black text-[var(--text-primary)] uppercase tracking-widest cursor-pointer shadow-sm"
            >
              <option value="">Série: Opcional</option>
              {state.series.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {consumindo.length > 0 && (
              <select
                value={selectedBibliotecaId}
                onChange={(e) => setSelectedBibliotecaId(e.target.value)}
                className="w-full lg:w-auto text-[9px] md:text-xs bg-[var(--bg-hover)] border-none rounded-lg md:rounded-xl px-2.5 py-2 md:px-4 md:py-3 focus:ring-2 focus:ring-[var(--accent-blue)] font-black text-[var(--text-primary)] uppercase tracking-widest cursor-pointer shadow-sm"
              >
                <option value="">Origem: Opcional</option>
                {consumindo.map(b => (
                  <option key={b.id} value={b.id}>{b.titulo.slice(0, 30)}</option>
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
        {activeIdeas.map((idea) => (
          <div
            key={idea.id}
            onClick={() => { setViewingIdea(idea); setIsEditing(false); }}
            className="group p-5 md:p-8 rounded-2xl border transition-all overflow-hidden break-words cursor-pointer flex flex-col h-full relative bg-[var(--bg-secondary)] border-[var(--border-color)] hover-card elevation-1"
          >
            <div className="flex items-start justify-between mb-4 md:mb-6 gap-4">
              <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[9px] md:text-[10px] text-[var(--text-tertiary)] font-black uppercase tracking-[0.2em]">
                <Clock className="w-3 md:w-3.5 h-3 md:h-3.5" />
                {format(new Date(idea.createdAt), "dd 'DE' MMM", { locale: ptBR })}
              </div>
            </div>

            <p className="text-sm md:text-base text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap break-words flex-1 font-medium italic group-hover:text-black dark:group-hover:text-white transition-opacity">
              "{truncateText(idea.text)}"
            </p>

            <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-[var(--border-color)] flex flex-wrap items-center gap-2 md:gap-3">
              {idea.pilarId && getPilarNome(idea.pilarId) && (
                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.15em] text-[var(--accent-blue)] bg-[var(--accent-blue)]/10 px-2 md:px-3 py-1 rounded-full border border-[var(--accent-blue)]/20">
                  {getPilarNome(idea.pilarId)}
                </span>
              )}
              {idea.seriesId && (
                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.15em] text-[var(--accent-green)] bg-[var(--accent-green)]/10 px-2 md:px-3 py-1 rounded-full border border-[var(--accent-green)]/20">
                  {state.series.find(s => s.id === idea.seriesId)?.name}
                </span>
              )}
              {idea.origemId && getBibliotecaTitulo(idea.origemId) && (
                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.15em] text-[var(--accent-orange)] bg-[var(--accent-orange)]/10 px-2 md:px-3 py-1 rounded-full border border-[var(--accent-orange)]/20 flex items-center gap-1">
                  <BookOpen className="w-2.5 md:w-3 h-2.5 md:h-3" />
                  {getBibliotecaTitulo(idea.origemId)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {activeIdeas.length === 0 && (
        <div className="text-center py-20 md:py-32 border-2 border-dashed border-[var(--border-color)] rounded-[2rem] md:rounded-[3rem] opacity-30">
          <Lightbulb className="w-12 md:w-16 h-12 md:h-16 text-[var(--text-primary)] mx-auto mb-4 md:mb-6 opacity-10" />
          <p className="text-[10px] md:text-sm font-black uppercase tracking-[0.3em] text-[var(--text-tertiary)] italic px-6">Aguardando sua próxima faísca criativa...</p>
        </div>
      )}

      <BottomSheetModal open={!!viewingIdea} onClose={() => setViewingIdea(null)} desktopMaxW="max-w-3xl" zIndex="z-[100]">
        {viewingIdea && (
          <>
            <div className="flex items-center justify-between p-4 md:p-8 border-b border-[var(--border-color)] shrink-0">
              <div className="flex items-center gap-3 md:gap-4 text-[9px] md:text-[10px] text-[var(--text-tertiary)] font-black uppercase tracking-[0.2em]">
                <Clock className="w-3.5 md:w-4 h-3.5 md:h-4" />
                {format(new Date(viewingIdea.createdAt), "dd 'DE' MMMM 'ÀS' HH:mm", { locale: ptBR })}
              </div>
              <button onClick={() => setViewingIdea(null)} className="p-2 md:p-3 hover:bg-[var(--bg-hover)] rounded-full transition-all text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 md:p-14 custom-scrollbar">
              <div className="flex flex-wrap gap-2 md:gap-3 mb-6 md:mb-8">
                {viewingIdea.pilarId && getPilarNome(viewingIdea.pilarId) && (
                  <span className="px-3 md:px-4 py-1 md:py-1.5 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-[var(--accent-blue)]/20">
                    {getPilarNome(viewingIdea.pilarId)}
                  </span>
                )}
                {viewingIdea.seriesId && (
                  <span className="px-3 md:px-4 py-1 md:py-1.5 bg-[var(--accent-green)]/10 text-[var(--accent-green)] text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-[var(--accent-green)]/20">
                    {state.series.find(s => s.id === viewingIdea.seriesId)?.name}
                  </span>
                )}
                {viewingIdea.origemId && getBibliotecaTitulo(viewingIdea.origemId) && (
                  <span className="px-3 md:px-4 py-1 md:py-1.5 bg-[var(--accent-orange)]/10 text-[var(--accent-orange)] text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-[var(--accent-orange)]/20 flex items-center gap-1.5">
                    <BookOpen className="w-3 md:w-3.5 h-3 md:h-3.5" />
                    {getBibliotecaTitulo(viewingIdea.origemId)}
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
                <button onClick={() => handleDelete(viewingIdea.id)} className="p-3 text-[var(--accent-pink)] hover:bg-[var(--accent-pink)]/10 rounded-2xl transition-all" title="Excluir">
                  <Trash2 className="w-5 h-5" />
                </button>
                {isEditing ? (
                  <button onClick={handleUpdate} className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-[var(--accent-green)] text-white px-6 py-2.5 rounded-2xl text-sm font-black hover:scale-105 transition-all shadow-xl shadow-[var(--accent-green)]/20">
                    <Save className="w-4 h-4" /> SALVAR
                  </button>
                ) : (
                  <button onClick={startEditing} className="p-3 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-2xl transition-all" title="Editar">
                    <Edit3 className="w-5 h-5" />
                  </button>
                )}
              </div>
              {!viewingIdea.archived && !isEditing && (
                <button onClick={() => handlePromote(viewingIdea)} className="flex items-center justify-center gap-2 bg-[var(--text-primary)] text-[var(--bg-primary)] px-5 py-3 rounded-2xl text-sm font-black transition-all shadow-2xl shadow-black/20 w-full md:w-auto hover-action">
                  PROMOVER <ArrowUpRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </>
        )}
      </BottomSheetModal>
      <ConfirmModal open={!!confirm} message={confirm?.message || ''} onConfirm={() => { confirm?.onConfirm(); setConfirm(null); }} onCancel={() => setConfirm(null)} />
      </div>
    </div>
  );
}



