import { useState } from 'react';
import { Layers, Plus } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { QueryViewState } from '../../../components/ui/QueryViewState';
import { Text } from '../../../components/ui/Text';
import { useScrollMemory } from '../../../hooks/useSessionState';
import { PreferenciasSeries, ResultadoDaLista } from '../../../features/settings/components/series-list/SeriesListResultado';
import type { SeriesListaModelo } from '../../../features/settings/hooks/useSeriesLista';
import type { FiltroSituacao, FiltroTipoLista } from '../../../features/settings/lib/seriesListaView';
import { MobileFilterSelect, MobileFilterSheet } from '../../components/MobileFilterSheet';
import { MobileSearchBar } from '../../components/MobileSearchBar';

/** Lista de séries no celular: uma coluna, busca no topo e os filtros num painel. */
export function SeriesMobileScreen({
  modelo,
  onCreate,
  onCreateFamilia,
}: {
  modelo: SeriesListaModelo;
  onCreate: () => void;
  onCreateFamilia: () => void;
}) {
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const { filtros, atualizarFiltro } = modelo;
  const rolagem = useScrollMemory('criaki:series:lista-celular', modelo.status === 'ready');
  const rotuloOpcao = (opcoes: readonly { value: string; label: string }[], valor: string) =>
    opcoes.find(opcao => opcao.value === valor)?.label ?? valor;
  const ativos = [
    filtros.tipo !== 'todos' ? `Tipo: ${rotuloOpcao(modelo.opcoesTipo, filtros.tipo)}` : null,
    filtros.pilar !== 'todos' ? `Pilar: ${rotuloOpcao(modelo.opcoesPilar, filtros.pilar)}` : null,
    filtros.situacao !== 'ativas' ? `Situação: ${modelo.rotulosSituacao[filtros.situacao]}` : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <div ref={rolagem} className="stack-lg">
      <div className="grid grid-cols-2 gap-2">
        <AppButton variant="secondary" fullWidth onClick={onCreateFamilia} leftIcon={<Plus className="h-4 w-4" />}>
          Criar família
        </AppButton>
        <AppButton variant="primary" fullWidth onClick={onCreate} leftIcon={<Plus className="h-4 w-4" />}>
          Criar série
        </AppButton>
      </div>

      {modelo.total > 0 ? (
        <section className="stack-sm">
          <MobileSearchBar
            value={filtros.busca}
            onChange={valor => atualizarFiltro('busca', valor)}
            placeholder="Buscar séries e quadros"
            onFilterClick={() => setFiltrosAbertos(true)}
            filterLabel={ativos.length > 0 ? `Abrir filtros (${ativos.length} ativos)` : 'Abrir filtros'}
          />
          {ativos.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
              <Text variant="meta" as="span">{ativos.join(' · ')}</Text>
              <button
                type="button"
                onClick={modelo.limparFiltros}
                className="min-h-11 t-button text-[var(--text-primary)] underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                Limpar filtros
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      <PreferenciasSeries preferencias={modelo.preferencias} />

      <QueryViewState
        status={modelo.status}
        onRetry={modelo.tentarDeNovo}
        skeletonCount={4}
        skeletonVariant="row"
        emptyIcon={<Layers className="h-8 w-8" />}
        emptyTitle="Nenhuma série criada"
        emptyDescription="Crie a primeira série para organizar conteúdos recorrentes."
        emptyAction={
          <AppButton variant="secondary" leftIcon={<Plus className="h-4 w-4" />} onClick={onCreate}>
            Criar série
          </AppButton>
        }
      >
        <ResultadoDaLista modelo={modelo} celular />
      </QueryViewState>

      <MobileFilterSheet
        open={filtrosAbertos}
        title="Filtros"
        onClose={() => setFiltrosAbertos(false)}
        onClear={() => {
          modelo.limparFiltros();
          setFiltrosAbertos(false);
        }}
      >
        <MobileFilterSelect
          label="Tipo"
          value={filtros.tipo}
          onChange={valor => atualizarFiltro('tipo', valor as FiltroTipoLista)}
          options={modelo.opcoesTipo}
        />
        <MobileFilterSelect
          label="Pilar"
          value={filtros.pilar}
          onChange={valor => atualizarFiltro('pilar', valor)}
          options={modelo.opcoesPilar}
        />
        <MobileFilterSelect
          label="Situação"
          value={filtros.situacao}
          onChange={valor => atualizarFiltro('situacao', valor as FiltroSituacao)}
          options={modelo.opcoesSituacao}
        />
      </MobileFilterSheet>
    </div>
  );
}
