import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Lightbulb, Search, SlidersHorizontal, X } from 'lucide-react';
import type { AppState } from '../../../app/providers/appState';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { MobileEmptyState } from '../../components/MobileEmptyState';
import { MobileFilterSheet } from '../../components/MobileFilterSheet';
import type { Idea } from '../../../lib/database';
import { cn } from '../../../lib/utils';
import { IdeaQuickCapture } from '../../../features/ideas/components/IdeaQuickCapture';
import { IdeaInboxCard } from '../../../features/ideas/components/IdeaInboxCard';

type MobileIdeasTab = 'all' | 'unprocessed' | 'favorites';

interface IdeasMobileScreenProps {
  newIdeaText: string;
  selectedPilarId: string;
  selectedSeries: string;
  selectedBibliotecaId: string;
  ideas: Idea[];
  state: AppState;
  composerOpen: boolean;
  onComposerOpenChange: (open: boolean) => void;
  onNewIdeaTextChange: (value: string) => void;
  onSelectedPilarIdChange: (value: string) => void;
  onSelectedSeriesChange: (value: string) => void;
  onSelectedBibliotecaIdChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onSave: () => void;
  onPromote: (idea: Idea) => void;
  onArchive: (idea: Idea) => void;
  onOpenIdea: (idea: Idea) => void;
}

const TAB_OPTIONS: { value: MobileIdeasTab; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'unprocessed', label: 'Não processadas' },
  { value: 'favorites', label: 'Favoritas' },
];

export function IdeasMobileScreen({
  newIdeaText,
  selectedPilarId,
  selectedSeries,
  selectedBibliotecaId,
  ideas,
  state,
  composerOpen,
  onComposerOpenChange,
  onNewIdeaTextChange,
  onSelectedPilarIdChange,
  onSelectedSeriesChange,
  onSelectedBibliotecaIdChange,
  onSubmit,
  onSave,
  onPromote,
  onArchive,
  onOpenIdea,
}: IdeasMobileScreenProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<MobileIdeasTab>('all');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const consumindo = state.bibliotecaItems.filter((item) =>
    ['Consumindo', 'Lendo', 'Assistindo'].includes(item.status)
  );

  const filteredIdeas = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return ideas
      .filter((idea) => {
        if (activeTab === 'unprocessed') return !idea.archived;
        if (activeTab === 'favorites') return idea.archived;
        return true;
      })
      .filter((idea) => {
        if (!normalizedSearch) return true;
        return idea.text.toLowerCase().includes(normalizedSearch);
      })
      .filter((idea) => (selectedPilarId ? idea.pilarId === selectedPilarId : true))
      .filter((idea) => (selectedSeries ? idea.seriesId === selectedSeries : true))
      .filter((idea) => (selectedBibliotecaId ? idea.origemId === selectedBibliotecaId : true));
  }, [activeTab, ideas, search, selectedBibliotecaId, selectedPilarId, selectedSeries]);

  const getPilar = (pilarId: string | null) =>
    state.pilares.find((pilar) => pilar.id === pilarId) ?? null;

  const handleComposerSubmit = (event: FormEvent) => {
    onSubmit(event);
  };

  const emptyTitle =
    activeTab === 'favorites'
      ? 'Nenhuma favorita aqui'
      : activeTab === 'unprocessed'
        ? 'Nenhuma nota aqui'
        : 'Nenhuma ideia encontrada';

  const emptyDescription =
    activeTab === 'favorites'
      ? 'Ideias promovidas aparecem nesta aba. Promova uma nota para acompanhar o que ja virou conteudo.'
      : 'Tente outro filtro ou crie uma nova ideia para comecar seu processo editorial.';

  return (
    <div className="relative pb-4">
      <section className="sticky top-0 z-10 mb-4 -mx-1 bg-[color-mix(in_srgb,var(--bg-primary)_92%,transparent)] pb-2 backdrop-blur-md">
        <IdeaQuickCapture
          text={newIdeaText}
          selectedPilarId={selectedPilarId}
          selectedSeries={selectedSeries}
          selectedBibliotecaId={selectedBibliotecaId}
          state={state}
          onTextChange={onNewIdeaTextChange}
          onSelectedPilarIdChange={onSelectedPilarIdChange}
          onSelectedSeriesChange={onSelectedSeriesChange}
          onSelectedBibliotecaIdChange={onSelectedBibliotecaIdChange}
          onSave={onSave}
        />
      </section>

      <section className="mb-4">
        <div className="group relative">
          <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
            <Search className="h-4 w-4 text-[var(--text-tertiary)] transition-colors group-focus-within:text-[var(--accent-blue)]" />
          </div>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar notas e ideias..."
            className="h-12 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] pl-11 pr-20 text-sm text-[var(--text-primary)] shadow-sm outline-none transition-all placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)]/20"
          />
          <div className="absolute inset-y-0 right-2 flex items-center gap-1">
            {search ? (
              <button
                type="button"
                aria-label="Limpar busca"
                onClick={() => setSearch('')}
                className="rounded-full p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)]"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
            <button
              type="button"
              aria-label="Filtrar ideias"
              onClick={() => setIsFilterSheetOpen(true)}
              className="rounded-full p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)]"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="mb-5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-1 rounded-xl bg-[var(--bg-hover)] p-1">
          {TAB_OPTIONS.map((tab) => {
            const active = activeTab === tab.value;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  'rounded-lg px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.05em] transition-all',
                  active
                    ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-sm'
                    : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)]/80'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {filteredIdeas.length === 0 ? (
        <MobileEmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={(
            <button
              type="button"
              onClick={() => onComposerOpenChange(true)}
              className="button-primary w-full max-w-xs"
            >
              Nova ideia
            </button>
          )}
          icon={<Lightbulb className="h-8 w-8" />}
        />
      ) : (
        <ul className="space-y-2">
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
                  onPromote={() => onPromote(idea)}
                  onEdit={() => onOpenIdea(idea)}
                  onArchive={() => onArchive(idea)}
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
        zIndex="z-[90]"
      >
        <form onSubmit={handleComposerSubmit} className="flex flex-col bg-[var(--bg-primary)]">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-4">
            <div>
              <h2 className="text-base font-black text-[var(--text-primary)]">Nova ideia</h2>
              <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">Escreva primeiro. Classifique depois.</p>
            </div>
            <button
              type="button"
              onClick={() => onComposerOpenChange(false)}
              className="rounded-full p-2 text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 p-5">
            <textarea
              autoFocus
              value={newIdeaText}
              onChange={(event) => onNewIdeaTextChange(event.target.value)}
              placeholder="Registre uma ideia, gancho ou observacao."
              className="min-h-36 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)]"
            />

            <label className="block space-y-2">
              <span className="t-label text-[var(--text-tertiary)]">Pilar</span>
              <select
                value={selectedPilarId}
                onChange={(event) => onSelectedPilarIdChange(event.target.value)}
                className="w-full"
              >
                <option value="">Opcional</option>
                {state.pilares.map((pilar) => (
                  <option key={pilar.id} value={pilar.id}>
                    {pilar.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="t-label text-[var(--text-tertiary)]">Serie</span>
              <select
                value={selectedSeries}
                onChange={(event) => onSelectedSeriesChange(event.target.value)}
                className="w-full"
              >
                <option value="">Opcional</option>
                {state.series.map((serie) => (
                  <option key={serie.id} value={serie.id}>
                    {serie.name}
                  </option>
                ))}
              </select>
            </label>

            {consumindo.length > 0 ? (
              <label className="block space-y-2">
                <span className="t-label text-[var(--text-tertiary)]">Origem</span>
                <select
                  value={selectedBibliotecaId}
                  onChange={(event) => onSelectedBibliotecaIdChange(event.target.value)}
                  className="w-full"
                >
                  <option value="">Opcional</option>
                  {consumindo.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.titulo}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <div className="border-t border-[var(--border-color)] p-5 pb-safe">
            <button type="submit" disabled={!newIdeaText.trim()} className="button-primary w-full disabled:opacity-40">
              Capturar ideia
            </button>
          </div>
        </form>
      </BottomSheetModal>

      <MobileFilterSheet
        open={isFilterSheetOpen}
        title="Filtrar ideias"
        onClose={() => setIsFilterSheetOpen(false)}
      >
        <label className="block space-y-2">
          <span className="t-label text-[var(--text-tertiary)]">Pilar</span>
          <select value={selectedPilarId} onChange={(event) => onSelectedPilarIdChange(event.target.value)}>
            <option value="">Todos os pilares</option>
            {state.pilares.map((pilar) => (
              <option key={pilar.id} value={pilar.id}>
                {pilar.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="t-label text-[var(--text-tertiary)]">Serie</span>
          <select value={selectedSeries} onChange={(event) => onSelectedSeriesChange(event.target.value)}>
            <option value="">Todas as series</option>
            {state.series.map((serie) => (
              <option key={serie.id} value={serie.id}>
                {serie.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="t-label text-[var(--text-tertiary)]">Origem</span>
          <select value={selectedBibliotecaId} onChange={(event) => onSelectedBibliotecaIdChange(event.target.value)}>
            <option value="">Qualquer origem</option>
            {consumindo.map((item) => (
              <option key={item.id} value={item.id}>
                {item.titulo}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => {
            onSelectedPilarIdChange('');
            onSelectedSeriesChange('');
            onSelectedBibliotecaIdChange('');
            setIsFilterSheetOpen(false);
          }}
          className="button-primary w-full"
        >
          Limpar filtros
        </button>
      </MobileFilterSheet>
    </div>
  );
}
