import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../../../context/AppContext';
import { ArrowUpRight, Clock, Inbox, Lightbulb, X, Trash2, Edit3, Save, BookOpen, Archive } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Idea } from '../../../lib/database';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { IdeasMobileScreen } from '../../../mobile/screens/ideas/IdeasMobileScreen';
import { getEntityTagStyle, cn } from '../../../lib/utils';
import { generateUUID } from '../../../utils/uuid';
import { createContentDraft } from '../../contents/lib/createContentDraft';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import { CONTENT_STATUS } from '../../contents/lib/contentPipeline';
import { IdeaQuickCapture } from '../components/IdeaQuickCapture';
import { IdeaInboxCard } from '../components/IdeaInboxCard';
import { PipelineActionBar } from '../../../components/pipeline/PipelineActionBar';

type InboxFilter = 'inbox' | 'archived';

export function IdeasPage() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [newIdeaText, setNewIdeaText] = useState('');
  const [selectedPilarId, setSelectedPilarId] = useState<string>('');
  const [selectedSeries, setSelectedSeries] = useState<string>('');
  const [selectedBibliotecaId, setSelectedBibliotecaId] = useState<string>('');
  const [viewingIdea, setViewingIdea] = useState<Idea | null>(null);
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>('inbox');

  useEffect(() => {
    const itemId = searchParams.get('itemId');
    if (itemId) setSelectedBibliotecaId(itemId);
  }, [searchParams]);

  const [composerOpen, setComposerOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('compose') === '1') {
      setComposerOpen(true);
    }
  }, [searchParams]);

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const allIdeas = [...state.ideas]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const activeIdeas = allIdeas.filter((idea) => !idea.archived);
  const archivedIdeas = allIdeas.filter((idea) => idea.archived);
  const inboxIdeas = inboxFilter === 'inbox' ? activeIdeas : archivedIdeas;

  const saveIdea = () => {
    if (!newIdeaText.trim()) return;

    const newIdea: Omit<Idea, 'createdAt'> = {
      id: generateUUID(),
      userId: '',
      text: newIdeaText.trim(),
      pilarId: selectedPilarId || null,
      seriesId: selectedSeries || null,
      origemId: selectedBibliotecaId || null,
      promotedToContentId: null,
      archived: false,
    };

    dispatch({ type: 'ADD_IDEA', payload: { ...newIdea, createdAt: new Date().toISOString() } });
    setNewIdeaText('');
    setSelectedPilarId('');
    setSelectedSeries('');
    setSelectedBibliotecaId('');
    setComposerOpen(false);
  };

  const handleAddIdea = (e: React.FormEvent) => {
    e.preventDefault();
    saveIdea();
  };

  const handleArchive = (idea: Idea) => {
    dispatch({ type: 'UPDATE_IDEA', payload: { ...idea, archived: true } });
    if (viewingIdea?.id === idea.id) setViewingIdea(null);
  };

  const handlePromote = (idea: Idea) => {
    const newContent = createContentDraft({
      title: idea.text.split('\n')[0].slice(0, 50),
      status: CONTENT_STATUS.ROTEIRO,
      seriesId: idea.seriesId,
      pilarId: idea.pilarId,
      notes: idea.text,
      bibliotecaItemId: idea.origemId,
    });

    dispatch({
      type: 'PROMOTE_IDEA',
      payload: {
        ideaId: idea.id,
        contentId: newContent.id,
        content: newContent,
      },
    });
    setViewingIdea(null);
    navigate(buildContentDetailRoute(newContent.id));
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

  const getPilarNome = (pilarId: string | null) =>
    state.pilares.find(p => p.id === pilarId)?.nome ?? null;

  const getPilar = (pilarId: string | null) =>
    state.pilares.find(p => p.id === pilarId) ?? null;

  const getSerie = (seriesId: string | null) =>
    state.series.find(s => s.id === seriesId) ?? null;

  const getBibliotecaTitulo = (itemId: string | null) =>
    state.bibliotecaItems.find(b => b.id === itemId)?.titulo ?? null;

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
          composerOpen={composerOpen}
          onComposerOpenChange={setComposerOpen}
          onNewIdeaTextChange={setNewIdeaText}
          onSelectedPilarIdChange={setSelectedPilarId}
          onSelectedSeriesChange={setSelectedSeries}
          onSelectedBibliotecaIdChange={setSelectedBibliotecaId}
          onSubmit={handleAddIdea}
          onSave={saveIdea}
          onPromote={handlePromote}
          onArchive={handleArchive}
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
                    <span
                      className="rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em]"
                      style={getEntityTagStyle(getPilar(viewingIdea.pilarId)?.cor)}
                    >
                      {getPilarNome(viewingIdea.pilarId)}
                    </span>
                  )}
                  {viewingIdea.seriesId && (
                    <span
                      className="rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em]"
                      style={getEntityTagStyle(getSerie(viewingIdea.seriesId)?.cor)}
                    >
                      {getSerie(viewingIdea.seriesId)?.name}
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
        <div className="desktop-header-frame space-y-4">
          <DesktopPageHeader
            section="Inbox editorial"
            title="Ideias"
            subtitle={`${activeIdeas.length} na caixa de entrada · capture rápido, classifique depois`}
            icon={Inbox}
            className="mb-0"
          />
          <IdeaQuickCapture
            text={newIdeaText}
            selectedPilarId={selectedPilarId}
            selectedSeries={selectedSeries}
            selectedBibliotecaId={selectedBibliotecaId}
            state={state}
            onTextChange={setNewIdeaText}
            onSelectedPilarIdChange={setSelectedPilarId}
            onSelectedSeriesChange={setSelectedSeries}
            onSelectedBibliotecaIdChange={setSelectedBibliotecaId}
            onSave={saveIdea}
          />
        </div>
      </header>

      <div className="desktop-content-frame max-w-6xl">
        {inboxIdeas[0] && inboxFilter === 'inbox' ? (
          <PipelineActionBar
            className="mb-4"
            title="Promover ideia para roteiro"
            description={`"${inboxIdeas[0].text.slice(0, 80)}${inboxIdeas[0].text.length > 80 ? '...' : ''}"`}
            primaryLabel="Promover para roteiro"
            onPrimary={() => handlePromote(inboxIdeas[0])}
          />
        ) : null}
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setInboxFilter('inbox')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors',
              inboxFilter === 'inbox'
                ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]'
            )}
          >
            Caixa de entrada ({activeIdeas.length})
          </button>
          <button
            type="button"
            onClick={() => setInboxFilter('archived')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors',
              inboxFilter === 'archived'
                ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]'
            )}
          >
            Arquivadas ({archivedIdeas.length})
          </button>
        </div>

        {inboxIdeas.length > 0 ? (
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {inboxIdeas.map((idea) => (
              <li key={idea.id} className="min-h-0">
                <IdeaInboxCard
                  idea={idea}
                  pilarNome={idea.pilarId ? getPilarNome(idea.pilarId) : null}
                  pilarCor={getPilar(idea.pilarId)?.cor}
                  serieNome={idea.seriesId ? getSerie(idea.seriesId)?.name ?? null : null}
                  serieCor={getSerie(idea.seriesId)?.cor}
                  origemTitulo={idea.origemId ? getBibliotecaTitulo(idea.origemId) : null}
                  onPromote={() => !idea.archived && handlePromote(idea)}
                  onEdit={() => {
                    setViewingIdea(idea);
                    setIsEditing(false);
                  }}
                  onArchive={() => handleArchive(idea)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-[var(--radius-input)] border border-dashed border-[var(--border-color)] py-12 text-center">
            <Lightbulb className="mx-auto mb-3 h-10 w-10 text-[var(--text-tertiary)] opacity-40" />
            <p className="text-xs font-medium text-[var(--text-secondary)]">
              {inboxFilter === 'inbox'
                ? 'Caixa de entrada vazia. Digite acima e pressione Enter.'
                : 'Nenhuma ideia arquivada ainda.'}
            </p>
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
                  <span
                    className="rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] md:px-4 md:py-1.5 md:text-[10px]"
                    style={getEntityTagStyle(getPilar(viewingIdea.pilarId)?.cor)}
                  >
                    {getPilarNome(viewingIdea.pilarId)}
                  </span>
                )}
                {viewingIdea.seriesId && (
                  <span
                    className="rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] md:px-4 md:py-1.5 md:text-[10px]"
                    style={getEntityTagStyle(getSerie(viewingIdea.seriesId)?.cor)}
                  >
                    {getSerie(viewingIdea.seriesId)?.name}
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
                <p className="text-lg md:text-xl text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap break-words font-medium">
                  {viewingIdea.text}
                </p>
              )}
            </div>

            <div className="p-4 md:p-8 bg-[var(--bg-hover)] border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3 shrink-0 pb-safe">
              <div className="flex items-center gap-2 flex-1">
                <button onClick={() => handleDelete(viewingIdea.id)} className="p-3 text-[var(--accent-pink)] hover:bg-[var(--accent-pink)]/10 rounded-2xl transition-all" title="Excluir">
                  <Trash2 className="w-5 h-5" />
                </button>
                {!viewingIdea.archived && !isEditing ? (
                  <button
                    onClick={() => handleArchive(viewingIdea)}
                    className="flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                    title="Arquivar"
                  >
                    <Archive className="w-4 h-4" /> Arquivar
                  </button>
                ) : null}
                {isEditing ? (
                  <button onClick={handleUpdate} className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-[var(--accent-green)] text-white px-6 py-2.5 rounded-2xl text-sm font-black hover:scale-105 transition-all shadow-xl shadow-[var(--accent-green)]/20">
                    <Save className="w-4 h-4" /> Salvar
                  </button>
                ) : (
                  <button onClick={startEditing} className="p-3 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-2xl transition-all" title="Editar">
                    <Edit3 className="w-5 h-5" />
                  </button>
                )}
              </div>
              {!viewingIdea.archived && !isEditing && (
                <button onClick={() => handlePromote(viewingIdea)} className="flex items-center justify-center gap-2 bg-[var(--text-primary)] text-[var(--bg-primary)] px-5 py-3 rounded-2xl text-sm font-black transition-all shadow-2xl shadow-black/20 w-full md:w-auto hover-action">
                  Promover para roteiro <ArrowUpRight className="w-4 h-4" />
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



