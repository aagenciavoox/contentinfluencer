import { useMemo, useState } from 'react';
import { Layers, Plus } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { FilterChips } from '../../../components/ui/FilterChips';
import { MoreMenu } from '../../../components/ui/MoreMenu';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { Text } from '../../../components/ui/Text';
import { ToggleRow } from '../../../components/ui/ToggleSwitch';
import { getSerieOpenItems } from '../../../features/editorial/lib/serieCompleteness';
import { caminhoDaSerie } from '../../../features/editorial/lib/serieArvore';
import { exibirSeriesVisiveis, type SerieListaModo } from '../../../features/editorial/lib/serieLista';
import type { Content, Serie } from '../../../lib/database';
import { MobileListCard } from '../../components/MobileListCard';
import { MobileSearchBar } from '../../components/MobileSearchBar';

interface SeriesMobileScreenProps {
  series: Serie[];
  contents?: readonly Pick<Content, 'seriesId' | 'deletedAt'>[];
  roteiroCountBySerie: Map<string, number>;
  onOpen: (serieId: string) => void;
  onCreate: () => void;
  onConfigure: (serieId: string) => void;
  showOpenBadges: boolean;
  preferencias?: Array<{ key: string; title: string; description: string; enabled: boolean; toggle: () => void }>;
}

type SeriesFilter = 'todas' | 'ativas' | 'inativas' | 'abertas';

function formatRoteiroCount(count: number) {
  return `${count} roteiro${count === 1 ? '' : 's'}`;
}

export function SeriesMobileScreen({
  series,
  contents = [],
  roteiroCountBySerie,
  onOpen,
  onCreate,
  onConfigure,
  showOpenBadges,
  preferencias = [],
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

      {preferencias.length > 0 ? (
        <section className="stack-sm rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
          {preferencias.map(row => (
            <ToggleRow
              key={row.key}
              id={`series-mobile-${row.key}`}
              enabled={row.enabled}
              onToggle={row.toggle}
              title={row.title}
              className="gap-4"
            >
              <span className="stack-xs">
                <Text variant="body" as="span">{row.title}</Text>
                <Text variant="secondary" as="span">{row.description}</Text>
              </span>
            </ToggleRow>
          ))}
        </section>
      ) : null}

      {series.length > 0 ? (
        <section className="stack-sm">
          <MobileSearchBar
            value={search}
            onChange={setSearch}
            placeholder="Buscar série ou quadro…"
          />
          <SegmentTabs<SerieListaModo>
            value={modoLista}
            onChange={setModoLista}
            ariaLabel="Visualização das séries"
            options={[
              { id: 'agrupada', label: 'Agrupada' },
              { id: 'lista', label: 'Lista' },
            ]}
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
            description="Ajuste a busca ou o filtro para ver outras séries."
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
                        serie.frequenciaRecomendada || 'Sob demanda',
                        formatRoteiroCount(roteiroCount),
                      ].filter(Boolean).join(' · ')}
                    </Text>
                  }
                  trailing={
                    <div className="mt-1 flex items-start">
                      <MoreMenu
                        size="sm"
                        items={[{ label: 'Editar definições', onClick: () => onConfigure(serie.id) }]}
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
