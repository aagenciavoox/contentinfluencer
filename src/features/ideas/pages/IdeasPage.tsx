import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../../../context/AppContext';
import { ArrowUpRight, Clock, Lightbulb, X, Trash2, Edit3, Save, BookOpen, Archive } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Idea } from '../../../lib/database';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { OverlayBody } from '../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../components/overlays/OverlayHeader';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { CONFIRM, EMPTY, type ConfirmState } from '../../../lib/uiCopy';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { IdeasMobileScreen } from '../../../mobile/screens/ideas/IdeasMobileScreen';
import { getEntityTagStyle, cn } from '../../../lib/utils';
import { generateUUID } from '../../../utils/uuid';
import { createContentDraft } from '../../contents/lib/createContentDraft';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import { CONTENT_STATUS } from '../../contents/lib/contentPipeline';
import { notifySaveFeedback } from '../../../lib/saveFeedback';
import { IdeaQuickCapture } from '../components/IdeaQuickCapture';
import { IdeaInboxCard } from '../components/IdeaInboxCard';
import { IdeasInboxToolbar } from '../components/IdeasInboxToolbar';
import { useIdeasInboxFilters } from '../hooks/useIdeasInboxFilters';
import { buildIdeaFields, getIdeaNotes, getIdeaTitle } from '../lib/ideaText';
import { ideaHasClassification } from '../lib/ideaFilters';

export function IdeasPage() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [newIdeaNotes, setNewIdeaNotes] = useState('');
  const [selectedPilarId, setSelectedPilarId] = useState<string>('');
  const [selectedSeries, setSelectedSeries] = useState<string>('');
  const [selectedBibliotecaId, setSelectedBibliotecaId] = useState<string>('');
  const [viewingIdea, setViewingIdea] = useState<Idea | null>(null);

  const {
    search,
    setSearch,
    inboxFilter,
    setInboxFilter,
    sort,
    setSort,
    quickFilter,
    toggleQuickFilter,
    filterPilarId,
    setFilterPilarId,
    filterSeriesId,
    setFilterSeriesId,
    filterOrigemId,
    setFilterOrigemId,
    activeIdeas,
    archivedIdeas,
    filteredIdeas,
  } = useIdeasInboxFilters(state.ideas);

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
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const allIdeas = state.ideas;

  const saveIdea = () => {
    const fields = buildIdeaFields({title: newIdeaTitle, notes: newIdeaNotes});
    if (!fields.title && !fields.notes) return;

    const newIdea: Omit<Idea, 'createdAt'> = {
      id: generateUUID(),
      userId: '',
      ...fields,
      pilarId: selectedPilarId || null,
      seriesId: selectedSeries || null,
      origemId: selectedBibliotecaId || null,
      promotedToContentId: null,
      demotedFromContentId: null,
      archived: false,
    };

    dispatch({ type: 'ADD_IDEA', payload: { ...newIdea, createdAt: new Date().toISOString() } });
    setNewIdeaTitle('');
    setNewIdeaNotes('');
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

  const doPromote = (idea: Idea) => {
    const title = getIdeaTitle(idea);
    const notes = getIdeaNotes(idea);
    const newContent = createContentDraft({
      title: title.slice(0, 50) || 'Novo roteiro',
      status: CONTENT_STATUS.ROTEIRO,
      seriesId: idea.seriesId,
      pilarId: idea.pilarId,
      notes: notes || null,
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

    const detailRoute = buildContentDetailRoute(newContent.id);
    notifySaveFeedback({
      status: 'success',
      message: 'Ideia transformada em conteúdo',
      href: detailRoute,
      actionLabel: 'Abrir roteiro',
    });

    window.setTimeout(() => {
      setViewingIdea(null);
      navigate(detailRoute);
    }, 2000);
  };

  // Spec: promover abre um modal pequeno de confirmacao antes de criar o roteiro.
  const handlePromote = (idea: Idea) => {
    setConfirm({
      ...CONFIRM.promoverIdeia,
      onConfirm: () => doPromote(idea),
    });
  };

  const handleDelete = (id: string) => {
    setConfirm({
      ...CONFIRM.excluirIdeia,
      onConfirm: () => { dispatch({ type: 'DELETE_IDEA', payload: id }); setViewingIdea(null); },
    });
  };

  const handleUpdate = () => {
    if (!viewingIdea) return;
    const fields = buildIdeaFields({title: editTitle, notes: editNotes});
    if (!fields.title && !fields.notes) return;

    const updatedIdea = {...viewingIdea, ...fields};
    dispatch({ type: 'UPDATE_IDEA', payload: updatedIdea });
    setViewingIdea(updatedIdea);
    setIsEditing(false);
  };

  const openIdea = (idea: Idea, startInEditMode = false) => {
    setViewingIdea(idea);
    setIsEditing(startInEditMode);
    if (startInEditMode) {
      setEditTitle(getIdeaTitle(idea));
      setEditNotes(getIdeaNotes(idea));
    }
  };

  const closeIdeaModal = () => {
    setViewingIdea(null);
    setIsEditing(false);
  };

  const startEditing = () => {
    if (!viewingIdea) return;
    setEditTitle(getIdeaTitle(viewingIdea));
    setEditNotes(getIdeaNotes(viewingIdea));
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

  const ideaHasClassificationTags = (idea: Idea) =>
    ideaHasClassification(idea) &&
    Boolean(
      (idea.pilarId && getPilarNome(idea.pilarId)) ||
      (idea.seriesId && getSerie(idea.seriesId)?.name) ||
      (idea.origemId && getBibliotecaTitulo(idea.origemId)),
    );

  if (isMobile) {
    return (
      <>
        <IdeasMobileScreen
          newIdeaTitle={newIdeaTitle}
          newIdeaNotes={newIdeaNotes}
          selectedPilarId={selectedPilarId}
          selectedSeries={selectedSeries}
          selectedBibliotecaId={selectedBibliotecaId}
          ideas={allIdeas}
          state={state}
          composerOpen={composerOpen}
          onComposerOpenChange={setComposerOpen}
          onNewIdeaTitleChange={setNewIdeaTitle}
          onNewIdeaNotesChange={setNewIdeaNotes}
          onSelectedPilarIdChange={setSelectedPilarId}
          onSelectedSeriesChange={setSelectedSeries}
          onSelectedBibliotecaIdChange={setSelectedBibliotecaId}
          onSubmit={handleAddIdea}
          onSave={saveIdea}
          onOpenIdea={openIdea}
          onPromoteIdea={handlePromote}
          onArchiveIdea={handleArchive}
        />
        <BottomSheetModal open={!!viewingIdea} onClose={closeIdeaModal} desktopMaxW="max-w-3xl" zIndex="z-[110]">
          {viewingIdea && (
            <>
              <OverlayHeader onClose={closeIdeaModal}>
                <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)] font-semibold t-label-uppercase">
                  <Clock className="h-3.5 w-3.5" />
                  {format(new Date(viewingIdea.createdAt), "dd 'DE' MMMM 'AS' HH:mm", { locale: ptBR })}
                </div>
              </OverlayHeader>

              <OverlayBody className="custom-scrollbar py-6">
                <div className="mb-6 flex flex-wrap gap-2">
                  {viewingIdea.pilarId && getPilarNome(viewingIdea.pilarId) && (
                    <span
                      className="rounded-full border px-3 py-1 t-label t-label-uppercase font-semibold"
                      style={getEntityTagStyle(getPilar(viewingIdea.pilarId)?.cor)}
                    >
                      {getPilarNome(viewingIdea.pilarId)}
                    </span>
                  )}
                  {viewingIdea.seriesId && (
                    <span
                      className="rounded-full border px-3 py-1 t-label t-label-uppercase font-semibold"
                      style={getEntityTagStyle(getSerie(viewingIdea.seriesId)?.cor)}
                    >
                      {getSerie(viewingIdea.seriesId)?.name}
                    </span>
                  )}
                  {viewingIdea.origemId && getBibliotecaTitulo(viewingIdea.origemId) && (
                    <span className="flex items-center gap-1.5 rounded-full border border-[var(--accent-orange)]/20 bg-[var(--accent-orange)]/10 px-3 py-1 t-label t-label-uppercase font-semibold text-[var(--accent-orange)]">
                      <BookOpen className="h-3 w-3" />
                      {getBibliotecaTitulo(viewingIdea.origemId)}
                    </span>
                  )}
                  {!ideaHasClassificationTags(viewingIdea) ? (
                    <span className="rounded-full border border-[var(--border-color)] px-3 py-1 t-label t-label-uppercase font-semibold text-[var(--text-tertiary)]">
                      Sem classificação
                    </span>
                  ) : null}
                  {viewingIdea.archived && (
                    <span className="rounded-full border border-[var(--accent-orange)]/20 bg-[var(--accent-orange)]/10 px-3 py-1 t-label t-label-uppercase font-semibold text-[var(--accent-orange)]">
                      Promovido
                    </span>
                  )}
                </div>

                {isEditing ? (
                  <div className="stack-md">
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full border-none bg-transparent p-0 text-lg font-semibold text-[var(--text-primary)] focus:ring-0"
                      placeholder="Título da ideia"
                    />
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="min-h-[220px] w-full resize-none border-none bg-transparent p-0 text-base font-medium leading-relaxed text-[var(--text-primary)] custom-scrollbar"
                      placeholder="Observações..."
                    />
                  </div>
                ) : (
                  <div className="stack-md">
                    <p className="text-lg font-semibold leading-snug text-[var(--text-primary)] break-words">
                      {getIdeaTitle(viewingIdea)}
                    </p>
                    {getIdeaNotes(viewingIdea) ? (
                      <p className="text-base leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap break-words">
                        {getIdeaNotes(viewingIdea)}
                      </p>
                    ) : null}
                  </div>
                )}
              </OverlayBody>

              <OverlayFooter className="flex-wrap bg-[var(--bg-hover)] pb-safe">
                <div className="flex flex-1 items-center gap-3">
                  <button onClick={() => handleDelete(viewingIdea.id)} className="rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] p-3 text-[var(--accent-pink)] transition-all hover:bg-[var(--accent-pink)]/10" title="Excluir">
                    <Trash2 className="h-5 w-5" />
                  </button>
                  {!viewingIdea.archived && !isEditing ? (
                    <button
                      onClick={() => handleArchive(viewingIdea)}
                      className="flex items-center gap-2 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] px-3 py-2 text-xs font-semibold t-label-uppercase text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                      title="Arquivar"
                    >
                      <Archive className="h-4 w-4" /> Arquivar
                    </button>
                  ) : null}
                  {isEditing ? (
                    <button onClick={handleUpdate} className="flex flex-1 items-center justify-center gap-3 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] bg-[var(--accent-green)] px-6 py-2.5 text-sm font-semibold text-white shadow-xl shadow-[var(--accent-green)]/20 transition-all">
                      <Save className="h-4 w-4" /> SALVAR
                    </button>
                  ) : (
                    <button onClick={startEditing} className="rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] p-3 text-[var(--text-tertiary)] transition-all hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]" title="Editar">
                      <Edit3 className="h-5 w-5" />
                    </button>
                  )}
                </div>
                {!viewingIdea.archived && !isEditing && (
                  <button onClick={() => handlePromote(viewingIdea)} className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] bg-[var(--text-primary)] px-6 py-3 text-sm font-semibold text-[var(--bg-primary)] shadow-none shadow-black/20 transition-all">
                    PROMOVER <ArrowUpRight className="h-4 w-4" />
                  </button>
                )}
              </OverlayFooter>
            </>
          )}
        </BottomSheetModal>
        <ConfirmModal open={!!confirm} message={confirm?.message || ''} confirmLabel={confirm?.confirmLabel} cancelLabel={confirm?.cancelLabel} onConfirm={() => { confirm?.onConfirm(); setConfirm(null); }} onCancel={() => setConfirm(null)} />
      </>
    );
  }

  return (
    <>
    <PageLayout
      header={
        <DesktopPageHeader
          section="Inbox editorial"
          title="Ideias"
          meta={`${activeIdeas.length} na caixa de entrada · capture rápido, classifique depois`}
          hideSearch
        >
          <IdeaQuickCapture
            title={newIdeaTitle}
            notes={newIdeaNotes}
            selectedPilarId={selectedPilarId}
            selectedSeries={selectedSeries}
            selectedBibliotecaId={selectedBibliotecaId}
            state={state}
            onTitleChange={setNewIdeaTitle}
            onNotesChange={setNewIdeaNotes}
            onSelectedPilarIdChange={setSelectedPilarId}
            onSelectedSeriesChange={setSelectedSeries}
            onSelectedBibliotecaIdChange={setSelectedBibliotecaId}
            onSave={saveIdea}
          />
        </DesktopPageHeader>
      }
    >
        <div className="tab-bar mb-3">
          <button
            type="button"
            onClick={() => setInboxFilter('inbox')}
            className={cn('tab-item', inboxFilter === 'inbox' && 'tab-item-active')}
          >
            Caixa de entrada
            {inboxFilter === 'inbox' ? (
              <span className="ml-1.5 text-[var(--text-tertiary)]">({activeIdeas.length})</span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setInboxFilter('archived')}
            className={cn('tab-item', inboxFilter === 'archived' && 'tab-item-active')}
          >
            Arquivadas
            {inboxFilter === 'archived' ? (
              <span className="ml-1.5 text-[var(--text-tertiary)]">({archivedIdeas.length})</span>
            ) : null}
          </button>
        </div>

        <IdeasInboxToolbar
          className="mb-3"
          state={state}
          search={search}
          onSearchChange={setSearch}
          sort={sort}
          onSortChange={setSort}
          quickFilter={quickFilter}
          onQuickFilterToggle={toggleQuickFilter}
          filterPilarId={filterPilarId}
          onFilterPilarIdChange={setFilterPilarId}
          filterSeriesId={filterSeriesId}
          onFilterSeriesIdChange={setFilterSeriesId}
          filterOrigemId={filterOrigemId}
          onFilterOrigemIdChange={setFilterOrigemId}
        />

        {filteredIdeas.length > 0 ? (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredIdeas.map((idea) => (
              <li key={idea.id} className="min-h-0">
                <IdeaInboxCard
                  idea={idea}
                  pilarNome={idea.pilarId ? getPilarNome(idea.pilarId) : null}
                  pilarCor={getPilar(idea.pilarId)?.cor}
                  serieNome={idea.seriesId ? getSerie(idea.seriesId)?.name ?? null : null}
                  serieCor={getSerie(idea.seriesId)?.cor}
                  origemTitulo={idea.origemId ? getBibliotecaTitulo(idea.origemId) : null}
                  onOpen={() => openIdea(idea)}
                  onPromote={!idea.archived ? () => handlePromote(idea) : undefined}
                  onArchive={!idea.archived ? () => handleArchive(idea) : undefined}
                  onEdit={!idea.archived ? () => openIdea(idea, true) : undefined}
                  showActions={!idea.archived}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            compact
            icon={<Lightbulb className="h-8 w-8" />}
            title={inboxFilter === 'inbox' ? EMPTY.ideias.title : EMPTY.ideiasArquivadas.title}
            description={inboxFilter === 'inbox' ? EMPTY.ideias.description : EMPTY.ideiasArquivadas.description}
          />
        )}
    </PageLayout>
    <BottomSheetModal open={!!viewingIdea} onClose={closeIdeaModal} desktopMaxW="max-w-3xl" zIndex="z-[100]">
        {viewingIdea && (
          <>
            <div className="flex items-center justify-between p-4 md:p-8 border-b border-[var(--border-color)] shrink-0">
              <div className="flex items-center gap-3 md:gap-4 text-xs md:text-xs text-[var(--text-tertiary)] font-semibold t-label-uppercase">
                <Clock className="w-3.5 md:w-4 h-3.5 md:h-4" />
                {format(new Date(viewingIdea.createdAt), "dd 'DE' MMMM 'ÀS' HH:mm", { locale: ptBR })}
              </div>
              <button onClick={closeIdeaModal} className="p-2 md:p-3 hover:bg-[var(--bg-hover)] rounded-full transition-all text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-14 custom-scrollbar">
              <div className="flex flex-wrap gap-2 md:gap-3 mb-6 md:mb-8">
                {viewingIdea.pilarId && getPilarNome(viewingIdea.pilarId) && (
                  <span
                    className="rounded-full border px-3 py-1 t-label t-label-uppercase font-semibold md:px-4 md:py-1.5 md:text-xs"
                    style={getEntityTagStyle(getPilar(viewingIdea.pilarId)?.cor)}
                  >
                    {getPilarNome(viewingIdea.pilarId)}
                  </span>
                )}
                {viewingIdea.seriesId && (
                  <span
                    className="rounded-full border px-3 py-1 t-label t-label-uppercase font-semibold md:px-4 md:py-1.5 md:text-xs"
                    style={getEntityTagStyle(getSerie(viewingIdea.seriesId)?.cor)}
                  >
                    {getSerie(viewingIdea.seriesId)?.name}
                  </span>
                )}
                {viewingIdea.origemId && getBibliotecaTitulo(viewingIdea.origemId) && (
                  <span className="px-3 md:px-4 py-1 md:py-1.5 bg-[var(--accent-orange)]/10 text-[var(--accent-orange)] text-xs md:t-label t-label-uppercase font-semibold rounded-full border border-[var(--accent-orange)]/20 flex items-center gap-1.5">
                    <BookOpen className="w-3 md:w-3.5 h-3 md:h-3.5" />
                    {getBibliotecaTitulo(viewingIdea.origemId)}
                  </span>
                )}
                {!ideaHasClassificationTags(viewingIdea) ? (
                  <span className="rounded-full border border-[var(--border-color)] px-3 md:px-4 py-1 md:py-1.5 t-label t-label-uppercase font-semibold text-[var(--text-tertiary)]">
                    Sem classificação
                  </span>
                ) : null}
                {viewingIdea.archived && (
                  <span className="px-3 md:px-4 py-1 md:py-1.5 bg-[var(--accent-orange)]/10 text-[var(--accent-orange)] text-xs md:t-label t-label-uppercase font-semibold rounded-full border border-[var(--accent-orange)]/20">
                    PROMOVIDO
                  </span>
                )}
              </div>

              {isEditing ? (
                <div className="stack-lg">
                  <input
                    autoFocus
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full border-none bg-transparent p-0 text-xl md:text-2xl font-semibold text-[var(--text-primary)] focus:ring-0"
                    placeholder="Título da ideia"
                  />
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full min-h-[120px] md:min-h-[320px] text-lg md:text-xl text-[var(--text-primary)] leading-relaxed border-none focus:ring-0 p-0 resize-none bg-transparent custom-scrollbar font-medium"
                    placeholder="Observações..."
                  />
                </div>
              ) : (
                <div className="stack-lg">
                  <p className="text-xl md:text-2xl font-semibold leading-snug text-[var(--text-primary)] break-words">
                    {getIdeaTitle(viewingIdea)}
                  </p>
                  {getIdeaNotes(viewingIdea) ? (
                    <p className="text-lg md:text-xl text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap break-words font-medium">
                      {getIdeaNotes(viewingIdea)}
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <div className="p-4 md:p-8 bg-[var(--bg-hover)] border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3 shrink-0 pb-safe">
              <div className="flex items-center gap-2 flex-1">
                <button onClick={() => handleDelete(viewingIdea.id)} className="p-3 text-[var(--accent-pink)] hover:bg-[var(--accent-pink)]/10 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] transition-all" title="Excluir">
                  <Trash2 className="w-5 h-5" />
                </button>
                {!viewingIdea.archived && !isEditing ? (
                  <button
                    onClick={() => handleArchive(viewingIdea)}
                    className="flex items-center gap-2 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] px-3 py-2 text-xs font-semibold t-label-uppercase text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                    title="Arquivar"
                  >
                    <Archive className="w-4 h-4" /> Arquivar
                  </button>
                ) : null}
                {isEditing ? (
                  <button onClick={handleUpdate} className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-[var(--accent-green)] text-white px-6 py-2.5 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] text-sm font-semibold hover:scale-105 transition-all shadow-xl shadow-[var(--accent-green)]/20">
                    <Save className="w-4 h-4" /> Salvar
                  </button>
                ) : (
                  <button onClick={startEditing} className="p-3 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] transition-all" title="Editar">
                    <Edit3 className="w-5 h-5" />
                  </button>
                )}
              </div>
              {!viewingIdea.archived && !isEditing && (
                <button onClick={() => handlePromote(viewingIdea)} className="flex items-center justify-center gap-2 bg-[var(--text-primary)] text-[var(--bg-primary)] px-6 py-3 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] text-sm font-semibold transition-all shadow-none shadow-black/20 w-full md:w-auto hover-action">
                  Promover para roteiro <ArrowUpRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </>
        )}
      </BottomSheetModal>
      <ConfirmModal open={!!confirm} message={confirm?.message || ''} confirmLabel={confirm?.confirmLabel} cancelLabel={confirm?.cancelLabel} onConfirm={() => { confirm?.onConfirm(); setConfirm(null); }} onCancel={() => setConfirm(null)} />
    </>
  );
}

