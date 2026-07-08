import type { FormEvent } from 'react';
import { Lightbulb } from 'lucide-react';
import type { AppState } from '../../../app/providers/appState';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { OverlayBody } from '../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../components/overlays/OverlayHeader';
import { AppButton } from '../../../components/ui/AppButton';
import { Text } from '../../../components/ui/Text';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { Idea } from '../../../lib/database';
import { cn } from '../../../lib/utils';
import { IdeaQuickCapture } from '../../../features/ideas/components/IdeaQuickCapture';
import { IdeaInboxCard } from '../../../features/ideas/components/IdeaInboxCard';
import { IdeasInboxToolbar } from '../../../features/ideas/components/IdeasInboxToolbar';
import { useIdeasInboxFilters } from '../../../features/ideas/hooks/useIdeasInboxFilters';
import type { MobileIdeasTab } from '../../../features/ideas/lib/ideaFilters';

interface IdeasMobileScreenProps {
  newIdeaTitle: string;
  newIdeaNotes: string;
  selectedPilarId: string;
  selectedSeries: string;
  selectedBibliotecaId: string;
  ideas: Idea[];
  state: AppState;
  composerOpen: boolean;
  onComposerOpenChange: (open: boolean) => void;
  onNewIdeaTitleChange: (value: string) => void;
  onNewIdeaNotesChange: (value: string) => void;
  onSelectedPilarIdChange: (value: string) => void;
  onSelectedSeriesChange: (value: string) => void;
  onSelectedBibliotecaIdChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onSave: () => void;
  onOpenIdea: (idea: Idea, startInEditMode?: boolean) => void;
  onPromoteIdea?: (idea: Idea) => void;
  onArchiveIdea?: (idea: Idea) => void;
}

const TAB_OPTIONS: { value: MobileIdeasTab; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'unprocessed', label: 'Não processadas' },
  { value: 'favorites', label: 'Favoritas' },
];

export function IdeasMobileScreen({
  newIdeaTitle,
  newIdeaNotes,
  selectedPilarId,
  selectedSeries,
  selectedBibliotecaId,
  ideas,
  state,
  composerOpen,
  onComposerOpenChange,
  onNewIdeaTitleChange,
  onNewIdeaNotesChange,
  onSelectedPilarIdChange,
  onSelectedSeriesChange,
  onSelectedBibliotecaIdChange,
  onSubmit,
  onSave,
  onOpenIdea,
  onPromoteIdea,
  onArchiveIdea,
}: IdeasMobileScreenProps) {
  const {
    search,
    setSearch,
    mobileTab,
    setMobileTab,
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
    filteredIdeas,
  } = useIdeasInboxFilters(ideas);

  const getPilar = (pilarId: string | null) =>
    state.pilares.find((pilar) => pilar.id === pilarId) ?? null;

  const handleComposerSubmit = (event: FormEvent) => {
    onSubmit(event);
  };

  const emptyTitle =
    mobileTab === 'favorites'
      ? 'Nenhuma favorita aqui'
      : mobileTab === 'unprocessed'
        ? 'Nenhuma nota aqui'
        : 'Nenhuma ideia encontrada';

  const emptyDescription =
    mobileTab === 'favorites'
      ? 'Ideias promovidas aparecem nesta aba. Promova uma nota para acompanhar o que ja virou conteudo.'
      : 'Tente outro filtro ou crie uma nova ideia para comecar seu processo editorial.';

  return (
    <div className="stack-lg relative pb-4">
      <section className="sticky top-0 z-10 mb-3 -mx-1 bg-[color-mix(in_srgb,var(--bg-primary)_92%,transparent)] pb-2 backdrop-blur-md">
        <IdeaQuickCapture
          title={newIdeaTitle}
          notes={newIdeaNotes}
          selectedPilarId={selectedPilarId}
          selectedSeries={selectedSeries}
          selectedBibliotecaId={selectedBibliotecaId}
          state={state}
          variant="compact"
          autoFocus={false}
          onTitleChange={onNewIdeaTitleChange}
          onNotesChange={onNewIdeaNotesChange}
          onSelectedPilarIdChange={onSelectedPilarIdChange}
          onSelectedSeriesChange={onSelectedSeriesChange}
          onSelectedBibliotecaIdChange={onSelectedBibliotecaIdChange}
          onSave={onSave}
        />
      </section>

      <section className="mb-3 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-1 rounded-xl bg-[var(--bg-hover)] p-1">
          {TAB_OPTIONS.map((tab) => {
            const active = mobileTab === tab.value;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setMobileTab(tab.value)}
                className={cn(
                  'rounded-lg px-6 py-2 text-xs font-semibold uppercase tracking-[0.05em] transition-all',
                  active
                    ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-sm'
                    : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)]/80',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

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

      {filteredIdeas.length === 0 ? (
        <EmptyState
          compact
          title={emptyTitle}
          description={emptyDescription}
          action={(
            <AppButton variant="primary" fullWidth onClick={() => onComposerOpenChange(true)} className="max-w-xs">
              Nova ideia
            </AppButton>
          )}
          icon={<Lightbulb className="h-8 w-8" />}
        />
      ) : (
        <ul className="stack-sm">
          {filteredIdeas.map((idea) => {
            const pilar = idea.pilarId ? getPilar(idea.pilarId) : null;
            const serie = idea.seriesId ? state.series.find((s) => s.id === idea.seriesId) : null;
            const origem = idea.origemId
              ? state.bibliotecaItems.find((b) => b.id === idea.origemId)
              : null;

            return (
              <li key={idea.id}>
                <IdeaInboxCard
                  idea={idea}
                  pilarNome={pilar?.nome ?? null}
                  pilarCor={pilar?.cor}
                  serieNome={serie?.name ?? null}
                  serieCor={serie?.cor}
                  origemTitulo={origem?.titulo ?? null}
                  onOpen={() => onOpenIdea(idea)}
                  onPromote={!idea.archived && onPromoteIdea ? () => onPromoteIdea(idea) : undefined}
                  onArchive={!idea.archived && onArchiveIdea ? () => onArchiveIdea(idea) : undefined}
                  onEdit={!idea.archived ? () => onOpenIdea(idea, true) : undefined}
                  showActions={!idea.archived}
                />
              </li>
            );
          })}
        </ul>
      )}

      <BottomSheetModal
        open={composerOpen}
        onClose={() => onComposerOpenChange(false)}
        desktopMaxW="max-w-lg"
        zIndex="z-[110]"
        ariaLabel="Nova ideia"
      >
        <form onSubmit={handleComposerSubmit} className="flex min-h-0 flex-1 flex-col">
          <OverlayHeader
            title="Nova ideia"
            subtitle="Escreva primeiro. Classifique depois."
            onClose={() => onComposerOpenChange(false)}
          />

          <OverlayBody className="stack-lg py-6">
            <IdeaQuickCapture
              title={newIdeaTitle}
              notes={newIdeaNotes}
              selectedPilarId={selectedPilarId}
              selectedSeries={selectedSeries}
              selectedBibliotecaId={selectedBibliotecaId}
              state={state}
              variant="default"
              onTitleChange={onNewIdeaTitleChange}
              onNotesChange={onNewIdeaNotesChange}
              onSelectedPilarIdChange={onSelectedPilarIdChange}
              onSelectedSeriesChange={onSelectedSeriesChange}
              onSelectedBibliotecaIdChange={onSelectedBibliotecaIdChange}
              onSave={onSave}
            />
          </OverlayBody>

          <OverlayFooter className="pb-safe">
            <AppButton type="submit" variant="primary" fullWidth disabled={!newIdeaTitle.trim() && !newIdeaNotes.trim()}>
              Capturar ideia
            </AppButton>
          </OverlayFooter>
        </form>
      </BottomSheetModal>
    </div>
  );
}
