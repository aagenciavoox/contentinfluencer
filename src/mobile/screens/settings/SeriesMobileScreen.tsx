import { useMemo, useState } from 'react';
import { ChevronRight, Layers, Plus } from 'lucide-react';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { OverlayBody } from '../../../components/overlays/OverlayBody';
import { OverlayHeader } from '../../../components/overlays/OverlayHeader';
import { AppButton } from '../../../components/ui/AppButton';
import { Text } from '../../../components/ui/Text';
import { ToolbarSearchInput } from '../../../components/ui/ToolbarSearchInput';
import type { Content, Serie } from '../../../lib/database';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SeriesForm } from '../../../features/settings/pages/SeriesSettingsPage';
import { MobileListCard } from '../../components/MobileListCard';
import { MobilePillButton } from '../../components/MobilePillButton';
import { MobileSectionHeader } from '../../components/MobileSectionHeader';
import { MobileSegmentTabs } from '../../components/MobileSegmentTabs';
import { cn } from '../../../lib/utils';

interface SeriesMobileScreenProps {
  series: Serie[];
  roteiroCountBySerie: Map<string, number>;
  platformNames: string[];
  contents: Content[];
  onSave: (serie: Serie) => void;
  onToggle: (serie: Serie) => void;
  onDelete: (serieId: string) => void;
  onOpen: (serieId: string) => void;
}

type SeriesFilter = 'todas' | 'ativas' | 'inativas';

function formatRoteiroCount(count: number) {
  return `${count} roteiro${count === 1 ? '' : 's'}`;
}

export function SeriesMobileScreen({
  series,
  roteiroCountBySerie,
  platformNames,
  contents,
  onSave,
  onToggle,
  onDelete,
  onOpen,
}: SeriesMobileScreenProps) {
  const [panelMode, setPanelMode] = useState<'create' | 'edit' | null>(null);
  const [editingSerie, setEditingSerie] = useState<Serie | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<SeriesFilter>('todas');

  const closePanel = () => {
    setPanelMode(null);
    setEditingSerie(null);
  };

  const handleSave = (serie: Serie) => {
    onSave(serie);
    closePanel();
  };

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
    <div className="stack-xl">
      <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <MobileSectionHeader
          icon={Layers}
          tone="purple"
          title="Séries"
          description={
            series.length === 0
              ? 'Quadros recorrentes com identidade e roteiros vinculados.'
              : `${activeCount} ativa${activeCount === 1 ? '' : 's'} · ${series.length} no total`
          }
        />

        <AppButton
          variant="primary"
          fullWidth
          onClick={() => {
            setEditingSerie(null);
            setPanelMode('create');
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Nova série
        </AppButton>
      </section>

      {series.length > 0 ? (
        <section className="stack-sm">
          <ToolbarSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar série..."
            size="compact"
          />
          <MobileSegmentTabs<SeriesFilter>
            value={filter}
            onChange={setFilter}
            tabs={[
              { value: 'todas', label: 'Todas', count: filterCounts.todas },
              { value: 'ativas', label: 'Ativas', count: filterCounts.ativas },
              { value: 'inativas', label: 'Inativas', count: filterCounts.inativas },
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
          />
        ) : filteredSeries.length === 0 ? (
          <EmptyState
            compact
            title="Nenhuma série encontrada"
            description="Ajuste a busca ou o filtro para ver outras séries."
            icon={<Layers className="h-8 w-8" />}
          />
        ) : (
          filteredSeries.map(serie => {
            const roteiroCount = roteiroCountBySerie.get(serie.id) || 0;
            const serieColor = serie.cor || '#6366f1';
            const structure = serie.estruturaRoteiro?.trim();
            const frequency = serie.frequenciaRecomendada || 'Sob demanda';

            return (
              <div
                key={serie.id}
                className={cn(!serie.ativa && 'opacity-55')}
              >
              <MobileListCard
                title={serie.name}
                description={structure
                  ? structure.slice(0, 120) + (structure.length > 120 ? '…' : '')
                  : undefined}
                onClick={() => onOpen(serie.id)}
                meta={
                  <Text variant="meta" as="p" className="leading-none">
                    <span
                      className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                      style={{ backgroundColor: serieColor }}
                      aria-hidden
                    />
                    {[frequency, formatRoteiroCount(roteiroCount), serie.ativa ? null : 'Inativa']
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                }
                trailing={
                  <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-[var(--text-tertiary)]" />
                }
                status={
                  <div className="flex flex-wrap items-center gap-2">
                    <MobilePillButton
                      tone={serie.ativa ? 'success' : 'muted'}
                      onClick={event => {
                        event.stopPropagation();
                        onToggle(serie);
                      }}
                    >
                      {serie.ativa ? 'Ativa' : 'Inativa'}
                    </MobilePillButton>
                    <MobilePillButton
                      tone="muted"
                      onClick={event => {
                        event.stopPropagation();
                        setEditingSerie(serie);
                        setPanelMode('edit');
                      }}
                    >
                      Editar
                    </MobilePillButton>
                    <MobilePillButton
                      tone="danger"
                      onClick={event => {
                        event.stopPropagation();
                        onDelete(serie.id);
                      }}
                    >
                      Excluir
                    </MobilePillButton>
                  </div>
                }
              />
              </div>
            );
          })
        )}
      </section>

      <BottomSheetModal
        open={panelMode !== null}
        onClose={closePanel}
        desktopMaxW="max-w-xl"
        zIndex="z-[110]"
      >
        <OverlayHeader>
          <div className="flex items-center gap-3">
            <span
              className="h-10 w-10 shrink-0 rounded-[var(--radius-card)] border border-[var(--border-color)]"
              style={{ backgroundColor: editingSerie?.cor || '#6366f1' }}
            />
            <div className="min-w-0">
              <Text variant="sectionTitle" truncate>
                {panelMode === 'edit' ? editingSerie?.name : 'Nova série'}
              </Text>
              <Text variant="meta" className="text-[var(--text-secondary)]">
                Identidade, estrutura e hashtags
              </Text>
            </div>
          </div>
        </OverlayHeader>

        <OverlayBody className="py-6 pb-safe">
          <SeriesForm
            key={editingSerie?.id || 'new'}
            initial={editingSerie ?? {}}
            onSave={handleSave}
            onCancel={closePanel}
            platformNames={platformNames}
            contents={contents}
          />
        </OverlayBody>
      </BottomSheetModal>
    </div>
  );
}
