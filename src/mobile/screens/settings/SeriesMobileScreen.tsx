import { useMemo, useState } from 'react';
import { Layers, Plus } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { MoreMenu } from '../../../components/ui/MoreMenu';
import { Text } from '../../../components/ui/Text';
import { ToggleRow } from '../../../components/ui/ToggleSwitch';
import type { Serie } from '../../../lib/database';
import { EmptyState } from '../../../components/ui/EmptyState';
import { MobileListCard } from '../../components/MobileListCard';
import { MobileSearchBar } from '../../components/MobileSearchBar';
import { FilterChips } from '../../../components/ui/FilterChips';
import { getSerieOpenItems } from '../../../features/editorial/lib/serieCompleteness';

interface SeriesMobileScreenProps {
  series: Serie[];
  roteiroCountBySerie: Map<string, number>;
  onOpen: (serieId: string) => void;
  onCreate: () => void;
  onConfigure: (serieId: string) => void;
  showOpenBadges: boolean;
  /** Preferências de séries (criação rápida, avisos em aberto); as mesmas do computador. */
  preferencias?: Array<{ key: string; title: string; description: string; enabled: boolean; toggle: () => void }>;
}

type SeriesFilter = 'todas' | 'ativas' | 'inativas';

function formatRoteiroCount(count: number) {
  return `${count} roteiro${count === 1 ? '' : 's'}`;
}

export function SeriesMobileScreen({
  series,
  roteiroCountBySerie,
  onOpen,
  onCreate,
  onConfigure,
  showOpenBadges,
  preferencias = [],
}: SeriesMobileScreenProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<SeriesFilter>('todas');

  const activeCount = series.filter(serie => serie.ativa).length;

  const filterCounts = useMemo(() => {
    const ativas = series.filter(serie => serie.ativa).length;
    return {
      todas: series.length,
      ativas,
      inativas: series.length - ativas,
    };
  }, [series]);

  const filteredSeries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return series
      .filter(serie => {
        if (filter === 'ativas' && !serie.ativa) return false;
        if (filter === 'inativas' && serie.ativa) return false;
        if (!query) return true;
        const haystack = [
          serie.name,
          serie.bordao,
          serie.estruturaRoteiro,
          serie.frequenciaRecomendada,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => {
        if (a.ativa !== b.ativa) return a.ativa ? -1 : 1;
        return a.name.localeCompare(b.name, 'pt-BR');
      });
  }, [filter, search, series]);

  return (
    <div className="stack-lg">
      {/* O cabeçalho já diz "Séries": aqui fica só o resumo e a ação da tela. */}
      <section className="stack-md">
        <Text variant="secondary" className="px-1">
          {series.length === 0
            ? 'Criação em massa de roteiros. A configuração completa fica no Editorial.'
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
            placeholder="Buscar série…"
          />
          <FilterChips<SeriesFilter>
            ariaLabel="Filtrar séries"
            value={filter}
            onChange={setFilter}
            options={[
              { id: 'todas', label: 'Todas', count: filterCounts.todas },
              { id: 'ativas', label: 'Ativas', count: filterCounts.ativas },
              { id: 'inativas', label: 'Inativas', count: filterCounts.inativas },
            ]}
          />
        </section>
      ) : null}

      <section className="stack-md">
        {series.length === 0 ? (
          <EmptyState
            compact
            title="Nenhuma série criada"
            description="Adicione a primeira série recorrente para estruturar o calendário editorial."
            icon={<Layers className="h-8 w-8" />}
            action={
              <AppButton variant="secondary" onClick={onCreate} leftIcon={<Plus className="h-4 w-4" />}>
                Nova série
              </AppButton>
            }
          />
        ) : filteredSeries.length === 0 ? (
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
          filteredSeries.map(serie => {
            const roteiroCount = roteiroCountBySerie.get(serie.id) || 0;
            // Sem cor própria, o ponto usa a cor neutra do tema (não um roxo fixo).
            const serieColor = serie.cor || 'var(--text-tertiary)';
            const structure = serie.estruturaRoteiro?.trim();
            const frequency = serie.frequenciaRecomendada || 'Sob demanda';

            return (
              // Série inativa: o selo "Inativa" já diz o estado; o card não fica apagado
              // (a opacidade derrubava o contraste do texto).
              <MobileListCard
                key={serie.id}
                title={serie.name}
                imageUrl={serie.capaUrl}
                description={structure
                  ? structure.slice(0, 120) + (structure.length > 120 ? '…' : '')
                  : undefined}
                onClick={() => onOpen(serie.id)}
                meta={
                  <Text variant="meta" as="p" className="leading-none">
                    <span
                      className="entity-color-dot mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                      style={{ backgroundColor: serieColor }}
                      aria-hidden
                    />
                    {[
                      frequency,
                      formatRoteiroCount(roteiroCount),
                    ].filter(Boolean).join(' · ')}
                  </Text>
                }
                trailing={
                  <div className="mt-1 flex items-start">
                    <MoreMenu
                      size="sm"
                      items={[
                        {
                          label: 'Configurar no Editorial',
                          onClick: () => onConfigure(serie.id),
                        },
                      ]}
                      triggerClassName="border-transparent bg-transparent"
                    />
                  </div>
                }
                status={
                  !serie.ativa || (showOpenBadges && getSerieOpenItems(serie).length > 0) ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {!serie.ativa ? <Badge variant="neutral">Inativa</Badge> : null}
                      {showOpenBadges && getSerieOpenItems(serie).length > 0 ? (
                        <Badge variant="neutral">Em aberto</Badge>
                      ) : null}
                    </div>
                  ) : undefined
                }
              />
            );
          })
        )}
      </section>

    </div>
  );
}
