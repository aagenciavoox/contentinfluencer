import { useMemo, useState } from 'react';
import { Layers, Plus } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { QueryViewState } from '../../../components/ui/QueryViewState';
import { SelectField } from '../../../components/ui/SelectField';
import { Text } from '../../../components/ui/Text';
import { ToolbarSearchInput } from '../../../components/ui/ToolbarSearchInput';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useScrollMemory } from '../../../hooks/useSessionState';
import { PAGE_SECTION } from '../../../layouts/navigation/navConfig';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { cn } from '../../../lib/utils';
import { SeriesMobileScreen } from '../../../mobile/screens/settings/SeriesMobileScreen';
import { ClubesSecao } from '../../clubes/components/ClubesSecao';
import { PreferenciasSeries, ResultadoDaLista } from '../components/series-list/SeriesListResultado';
import { SerieCreateModal, type SerieCreateModalTarget } from '../components/SerieCreateModal';
import { SerieRitmoDrawer, SerieRitmoProvider } from '../components/SerieRitmoDrawer';
import { useSeriesLista, type SeriesListaModelo } from '../hooks/useSeriesLista';
import type { FiltroTipoLista } from '../lib/seriesListaView';

export function SeriesSettingsPage() {
  const isMobile = useIsMobile();
  const [modalTarget, setModalTarget] = useState<SerieCreateModalTarget | null>(null);
  const [ritmoSerieId, setRitmoSerieId] = useState<string | null>(null);
  const modelo = useSeriesLista(setModalTarget);

  const contagensPorTipo = useMemo(() => {
    let serie = 0;
    let quadro = 0;
    let familia = 0;
    for (const item of modelo.lista.itens.values()) {
      if (item.tipo === 'serie') serie += 1;
      else if (item.tipo === 'quadro') quadro += 1;
      else if (item.tipo === 'familia') familia += 1;
    }
    return {
      // Todos mostra só as séries: os quadros aparecem na visão Quadros.
      todos: serie,
      serie,
      quadro,
      familia,
    };
  }, [modelo.lista.itens, modelo.total]);

  const criarSerie = () => setModalTarget({ tipo: 'serie' });
  const criarFamilia = () => setModalTarget({ tipo: 'familia' });

  const drawers = (
    <>
      <SerieCreateModal
        target={modalTarget}
        onClose={() => setModalTarget(null)}
      />
      <SerieRitmoDrawer
        serieId={ritmoSerieId}
        onClose={() => setRitmoSerieId(null)}
      />
    </>
  );

  if (isMobile) {
    return (
      <SerieRitmoProvider onOpen={setRitmoSerieId}>
        <div className="min-h-full bg-[var(--bg-primary)]">
          <SeriesMobileScreen modelo={modelo} onCreate={criarSerie} onCreateFamilia={criarFamilia} />
        </div>
        {drawers}
      </SerieRitmoProvider>
    );
  }

  return (
    <SerieRitmoProvider onOpen={setRitmoSerieId}>
      <PageLayout
        header={
          <DesktopPageHeader
            section={PAGE_SECTION.producao}
            title="Inventário & Projetos"
            subtitle="Séries com ritmo, quadros sob demanda, famílias para a vitrine e clubes para reunir roteiros."
            actions={[
              <AppButton key="nova-serie" variant="primary" onClick={criarSerie} leftIcon={<Plus className="h-4 w-4" />}>
                Nova série
              </AppButton>,
              <AppButton key="nova-familia" variant="secondary" onClick={criarFamilia} leftIcon={<Plus className="h-4 w-4" />}>
                Nova família
              </AppButton>,
            ]}
          />
        }
        toolbar={
          modelo.total > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-3">
              <ToolbarSearchInput
                value={modelo.filtros.busca}
                onChange={valor => modelo.atualizarFiltro('busca', valor)}
                placeholder="Buscar por nome, jargão ou descrição..."
                className="min-w-[280px] max-w-md flex-1"
              />
              <div
                className="flex items-center gap-1 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-1"
                role="group"
                aria-label="Filtrar por tipo"
              >
                {[
                  { id: 'todos', label: 'Todos', count: contagensPorTipo.todos },
                  { id: 'serie', label: 'Séries', count: contagensPorTipo.serie },
                  { id: 'quadro', label: 'Quadros', count: contagensPorTipo.quadro },
                ].map(tab => {
                  const ativo = modelo.filtros.tipo === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      aria-pressed={ativo}
                      onClick={() => modelo.atualizarFiltro('tipo', tab.id as FiltroTipoLista)}
                      className={cn(
                        'rounded-[var(--radius-sm)] px-3 py-1.5 transition-colors',
                        ativo
                          ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
                      )}
                    >
                      <span className="t-button">
                        {tab.label} ({tab.count})
                      </span>
                    </button>
                  );
                })}
              </div>
              <SelectField
                value={modelo.filtros.pilar}
                onChange={valor => modelo.atualizarFiltro('pilar', valor)}
                options={modelo.opcoesPilar}
                prefix="Pilar:"
                ariaLabel="Filtrar por pilar"
                selected={modelo.filtros.pilar !== 'todos'}
              />
              {modelo.familias.length > 0 ? (
                <div className="flex w-full flex-wrap items-center gap-2" role="group" aria-label="Filtrar por família">
                  <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">Família</Text>
                  {[{ id: 'todas', label: 'Todas' }, ...modelo.familias.map(item => ({ id: item.serie.id, label: item.serie.name.trim() || 'Sem nome' }))].map(chip => {
                    const ativo = modelo.filtros.familia === chip.id;
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        aria-pressed={ativo}
                        onClick={() => modelo.atualizarFiltro('familia', chip.id)}
                        className={cn(
                          'rounded-full border px-3 py-1 transition-colors',
                          ativo
                            ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                            : 'border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
                        )}
                      >
                        <span className="t-button">{chip.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : undefined
        }
      >
        <SeriesListaDesktop modelo={modelo} onCreate={criarSerie} />
        {drawers}
      </PageLayout>
    </SerieRitmoProvider>
  );
}

function SeriesListaDesktop({ modelo, onCreate }: { modelo: SeriesListaModelo; onCreate: () => void }) {
  const rolagem = useScrollMemory('criaki:series:lista', modelo.status === 'ready');

  return (
    <div ref={rolagem} className="stack-lg">
      <ClubesSecao grande />
      <PreferenciasSeries preferencias={modelo.preferencias} />

      <QueryViewState
        status={modelo.status}
        onRetry={modelo.tentarDeNovo}
        skeletonCount={6}
        skeletonVariant="card"
        emptyIcon={<Layers className="h-8 w-8" />}
        emptyTitle="Nenhuma série criada"
        emptyDescription="Crie a primeira série para organizar conteúdos recorrentes."
        emptyAction={
          <AppButton variant="secondary" leftIcon={<Plus className="h-4 w-4" />} onClick={onCreate}>
            Criar série
          </AppButton>
        }
      >
        <ResultadoDaLista modelo={modelo} />
      </QueryViewState>
    </div>
  );
}
