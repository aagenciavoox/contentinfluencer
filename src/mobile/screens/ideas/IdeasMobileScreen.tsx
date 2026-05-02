import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { BookOpen, Clock3, Lightbulb, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { AppState } from '../../../app/providers/appState';
import { MobileEmptyState } from '../../components/MobileEmptyState';
import { MobileFilterSheet } from '../../components/MobileFilterSheet';
import { MobileListCard } from '../../components/MobileListCard';
import { MobileSearchBar } from '../../components/MobileSearchBar';
import { MobileSegmentTabs } from '../../components/MobileSegmentTabs';
import type { Idea } from '../../../lib/database';

type MobileIdeasTab = 'active' | 'promoted';

interface IdeasMobileScreenProps {
  newIdeaText: string;
  selectedPilarId: string;
  selectedSeries: string;
  selectedBibliotecaId: string;
  ideas: Idea[];
  state: AppState;
  onNewIdeaTextChange: (value: string) => void;
  onSelectedPilarIdChange: (value: string) => void;
  onSelectedSeriesChange: (value: string) => void;
  onSelectedBibliotecaIdChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onOpenIdea: (idea: Idea) => void;
}

export function IdeasMobileScreen({
  newIdeaText,
  selectedPilarId,
  selectedSeries,
  selectedBibliotecaId,
  ideas,
  state,
  onNewIdeaTextChange,
  onSelectedPilarIdChange,
  onSelectedSeriesChange,
  onSelectedBibliotecaIdChange,
  onSubmit,
  onOpenIdea,
}: IdeasMobileScreenProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<MobileIdeasTab>('active');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const consumindo = state.bibliotecaItems.filter((item) =>
    ['Consumindo', 'Lendo', 'Assistindo'].includes(item.status)
  );

  const filteredIdeas = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return ideas
      .filter((idea) => (activeTab === 'active' ? !idea.archived : idea.archived))
      .filter((idea) => {
        if (!normalizedSearch) return true;
        return idea.text.toLowerCase().includes(normalizedSearch);
      })
      .filter((idea) => (selectedPilarId ? idea.pilarId === selectedPilarId : true))
      .filter((idea) => (selectedSeries ? idea.seriesId === selectedSeries : true))
      .filter((idea) => (selectedBibliotecaId ? idea.origemId === selectedBibliotecaId : true));
  }, [activeTab, ideas, search, selectedBibliotecaId, selectedPilarId, selectedSeries]);

  const tabCounts = {
    active: ideas.filter((idea) => !idea.archived).length,
    promoted: ideas.filter((idea) => idea.archived).length,
  };

  const getPilarNome = (pilarId: string | null) =>
    state.pilares.find((pilar) => pilar.id === pilarId)?.nome ?? null;

  const getSerieNome = (seriesId: string | null) =>
    state.series.find((serie) => serie.id === seriesId)?.name ?? null;

  const getBibliotecaTitulo = (itemId: string | null) =>
    state.bibliotecaItems.find((item) => item.id === itemId)?.titulo ?? null;

  const focusAction = (
    <button
      type="button"
      onClick={() => {
        const composer = document.getElementById('ideas-mobile-composer');
        composer?.focus();
      }}
      className="button-primary w-full"
    >
      Capturar agora
    </button>
  );

  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl bg-[var(--accent-orange)]/12 p-3 text-[var(--accent-orange)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="t-section-title text-[var(--text-primary)]">Captura rapida</p>
            <p className="t-secondary">Escreva primeiro. Classifique depois.</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <textarea
            id="ideas-mobile-composer"
            value={newIdeaText}
            onChange={(event) => onNewIdeaTextChange(event.target.value)}
            placeholder="Registre uma ideia, gancho ou observacao."
            className="min-h-32 w-full rounded-[1.35rem] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 text-[var(--text-primary)]"
          />

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
              <p className="t-label text-[var(--text-tertiary)]">Ativas</p>
              <p className="mt-1 text-xl font-black text-[var(--text-primary)]">{tabCounts.active}</p>
            </div>
            <div className="rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
              <p className="t-label text-[var(--text-tertiary)]">Promovidas</p>
              <p className="mt-1 text-xl font-black text-[var(--text-primary)]">{tabCounts.promoted}</p>
            </div>
            <div className="rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
              <p className="t-label text-[var(--text-tertiary)]">Acervo</p>
              <p className="mt-1 text-xl font-black text-[var(--text-primary)]">{consumindo.length}</p>
            </div>
          </div>

          <button type="submit" disabled={!newIdeaText.trim()} className="button-primary w-full disabled:opacity-40">
            Capturar ideia
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <MobileSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar nas ideias"
          onFilterClick={() => setIsFilterSheetOpen(true)}
        />

        <MobileSegmentTabs
          tabs={[
            { value: 'active', label: 'Ativas', count: tabCounts.active },
            { value: 'promoted', label: 'Promovidas', count: tabCounts.promoted },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />

        {filteredIdeas.length === 0 ? (
          <MobileEmptyState
            title={activeTab === 'active' ? 'Nenhuma ideia encontrada' : 'Nada promovido ainda'}
            description={activeTab === 'active'
              ? 'Use a captura rapida para criar o primeiro item dessa lista.'
              : 'Promova uma ideia para abrir o historico de itens aproveitados.'}
            action={activeTab === 'active' ? focusAction : undefined}
            icon={<Lightbulb className="h-8 w-8" />}
          />
        ) : (
          <div className="space-y-3">
            {filteredIdeas.map((idea) => (
              <MobileListCard
                key={idea.id}
                onClick={() => onOpenIdea(idea)}
                eyebrow={format(new Date(idea.createdAt), "dd 'de' MMM", { locale: ptBR })}
                title={idea.text.split('\n')[0].slice(0, 64) || 'Ideia sem titulo'}
                description={idea.text}
                trailing={<Clock3 className="h-4 w-4 text-[var(--text-tertiary)]" />}
                meta={
                  <>
                    {idea.pilarId && getPilarNome(idea.pilarId) ? (
                      <span className="rounded-full bg-[var(--accent-blue)]/10 px-3 py-1 text-[11px] font-semibold text-[var(--accent-blue)]">
                        {getPilarNome(idea.pilarId)}
                      </span>
                    ) : null}
                    {idea.seriesId && getSerieNome(idea.seriesId) ? (
                      <span className="rounded-full bg-[var(--accent-green)]/10 px-3 py-1 text-[11px] font-semibold text-[var(--accent-green)]">
                        {getSerieNome(idea.seriesId)}
                      </span>
                    ) : null}
                    {idea.origemId && getBibliotecaTitulo(idea.origemId) ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-orange)]/10 px-3 py-1 text-[11px] font-semibold text-[var(--accent-orange)]">
                        <BookOpen className="h-3 w-3" />
                        {getBibliotecaTitulo(idea.origemId)}
                      </span>
                    ) : null}
                  </>
                }
              />
            ))}
          </div>
        )}
      </section>

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
