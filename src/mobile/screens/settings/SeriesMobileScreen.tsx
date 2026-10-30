import { useMemo, useState } from 'react';
import { Layers, Plus } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { FilterChips } from '../../../components/ui/FilterChips';
import { MoreMenu } from '../../../components/ui/MoreMenu';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { Text } from '../../../components/ui/Text';
import { getSerieOpenItems } from '../../../features/editorial/lib/serieCompleteness';
import { caminhoDaSerie } from '../../../features/editorial/lib/serieArvore';
import { rotuloEpisodios } from '../../../features/editorial/lib/contarEpisodios';
import { exibirSeriesVisiveis, type SerieListaModo } from '../../../features/editorial/lib/serieLista';
import type { Content, Serie } from '../../../lib/database';
import { MobileListCard } from '../../components/MobileListCard';
import { MobileSearchBar } from '../../components/MobileSearchBar';

interface SeriesMobileScreenProps {
  series: Serie[];
  contents?: readonly Pick<Content, 'id' | 'seriesId' | 'deletedAt'>[];
  roteiroCountBySerie: Map<string, number>;
  onOpen: (serieId: string) => void;
  onCreate: () => void;
  onConfigure: (serieId: string) => void;
  onToggle: (serie: Serie) => void;
  showOpenBadges: boolean;
}

type SeriesFilter = 'todas' | 'ativas' | 'inativas' | 'abertas';

function formatEpisodioCount(count: number) {
  return rotuloEpisodios(count);
}

export function SeriesMobileScreen({
  series,
  contents = [],
  roteiroCountBySerie,
  onOpen,
  onCreate,
  onConfigure,
  onToggle,
  showOpenBadges,
}: SeriesMobileScreenProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<SeriesFilter>('todas');
  const [modoLista, setModoLista] = useState<SerieListaModo>('agrupada');
  const activeCount = series.filter(serie => serie.ativa).length;
  const filtroAtivo: SeriesFilter = !showOpenBadges && filter === 'abertas' ? 'todas' : filter;

  const filterCounts = useMemo(() => {
    const ativas = series.filter(serie => serie.ativa).length;
    const abertas = series.filter(serie => getSerieOpenItems(serie, { series, contents }).length > 0).length;
    return {
      todas: series.length,
      ativas,
      inativas: series.length - ativas,
      abertas,
    };
  }, [contents, series]);

  const exibicao = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtradas = series.filter(serie => {
      if (filtroAtivo === 'ativas' && !serie.ativa) return false;
      if (filtroAtivo === 'inativas' && serie.ativa) return false;
      if (filtroAtivo === 'abertas' && getSerieOpenItems(serie, { series, contents }).length === 0) return false;
      if (!query) return true;
      const haystack = [serie.name, serie.bordao, serie.notes, serie.frequenciaRecomendada]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
    return exibirSeriesVisiveis(filtradas, modoLista);
  }, [contents, filtroAtivo, modoLista, search, series]);

  return (
    <div className="stack-lg">
      <section className="stack-md">
        <Text variant="secondary" className="px-1">
          {series.length === 0
            ? 'Séries e quadros. Abrir um item mostra os episódios.'
            : `${activeCount} ativa${activeCount === 1 ? '' : 's'} · ${series.length} no total`}
        </Text>
        <AppButton
          variant="primary"
          fullWidth
          onClick={onCreate}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Nova série
        </AppButton>
      </section>

      {series.length > 0 ? (
        <section className="stack-sm">
          <MobileSearchBar
            value={search}
            onChange={setSearch}
            placeholder="Buscar série ou quadro…"
          />
          <FilterChips<SeriesFilter>
            ariaLabel="Filtrar séries"
            value={filtroAtivo}
            onChange={setFilter}
            options={[
              { id: 'todas', label: 'Todas', count: filterCounts.todas },
              { id: 'ativas', label: 'Ativas', count: filterCounts.ativas },
              { id: 'inativas', label: 'Inativas', count: filterCounts.inativas },
              ...(showOpenBadges ? [{ id: 'abertas' as const, label: 'Em aberto', count: filterCounts.abertas }] : []),
            ]}
          />
          <SegmentTabs<SerieListaModo>
            className="ml-auto"
            value={modoLista}
            onChange={setModoLista}
            ariaLabel="Visualização das séries"
            options={[
              { id: 'agrupada', label: 'Agrupada' },
              { id: 'lista', label: 'Lista' },
            ]}
          />
        </section>
      ) : null}

      <section className="stack-md">
        {series.length === 0 ? (
          <EmptyState
            compact
            title="Nenhuma série criada"
            description="Crie a primeira série para agrupar roteiros recorrentes."
            icon={<Layers className="h-8 w-8" />}
            action={
              <AppButton variant="secondary" onClick={onCreate} leftIcon={<Plus className="h-4 w-4" />}>
                Nova série
              </AppButton>
            }
          />
        ) : exibicao.length === 0 ? (
          <EmptyState
            compact
            title="Nenhuma série encontrada"
            description={search.trim() ? `Nada encontrado para “${search.trim()}”.` : 'Nenhuma série corresponde a este filtro.'}
            icon={<Layers className="h-8 w-8" />}
            action={
              <AppButton
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setFilter('todas');
                }}
              >
                Limpar busca e filtro
              </AppButton>
            }
          />
        ) : (
          exibicao.map(({ serie, profundidade }) => {
            const roteiroCount = roteiroCountBySerie.get(serie.id) || 0;
            const serieColor = serie.cor || 'var(--text-tertiary)';
            const caminho = profundidade > 0
              ? caminhoDaSerie(serie.id, series).slice(0, -1).map(item => item.name).filter(Boolean).join(' · ')
              : null;
            const aberta = showOpenBadges && getSerieOpenItems(serie, { series, contents }).length > 0;
            return (
              <div key={serie.id} style={profundidade > 0 ? { marginLeft: Math.min(profundidade, 3) * 12 } : undefined}>
                <MobileListCard
                  title={serie.name}
                  imageUrl={serie.capaUrl}
                  description={serie.notes?.trim() || undefined}
                  onClick={() => onOpen(serie.id)}
                  meta={
                    <Text variant="meta" as="p" className="leading-none">
                      <span
                        className="entity-color-dot mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                        style={{ backgroundColor: serieColor }}
                        aria-hidden
                      />
                      {[
                        caminho ? `Quadro de ${caminho}` : null,
                        serie.frequenciaRecomendada || 'Frequência não definida',
                        formatEpisodioCount(roteiroCount),
                      ].filter(Boolean).join(' · ')}
                    </Text>
                  }
                  trailing={
                    <div className="mt-1 flex items-start">
                      <MoreMenu
                        size="sm"
                        items={[
                          { label: serie.ativa ? 'Desativar' : 'Ativar', onClick: () => onToggle(serie) },
                          { label: 'Editar definições', onClick: () => onConfigure(serie.id) },
                        ]}
                        triggerClassName="border-transparent bg-transparent"
                      />
                    </div>
                  }
                  status={
                    !serie.ativa || aberta ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {!serie.ativa ? <Badge variant="neutral">Inativa</Badge> : null}
                        {aberta ? <Badge variant="neutral">Em aberto</Badge> : null}
                      </div>
                    ) : undefined
                  }
                />
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
