import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Plus } from 'lucide-react';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { OverlayBody } from '../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../components/overlays/OverlayHeader';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { MoreMenu } from '../../../components/ui/MoreMenu';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { ToolbarSearchInput } from '../../../components/ui/ToolbarSearchInput';
import { QueryViewState, resolveQueryViewStatus } from '../../../components/ui/QueryViewState';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { SeriesMobileScreen } from '../../../mobile/screens/settings/SeriesMobileScreen';
import type { Serie } from '../../../lib/database';
import { SettingsPageScaffold } from '../../../components/settings/SettingsPageScaffold';
import { SETTINGS_ENTITY_GRID_CLASS } from '../../../components/settings/SettingsGridCard';
import { generateUUID } from '../../../utils/uuid';
import { getEditorialSettings } from '../../editorial/lib/editorialSettings';
import { getSerieOpenItems } from '../../editorial/lib/serieCompleteness';
import { PILAR_PRESET_CORES } from '../lib/pilarConstants';
import { isSerieColorTaken, nextFreeSerieColor, serieColorKey, takenSerieColorKeys } from '../lib/serieColors';

type SeriesFilter = 'todas' | 'ativas' | 'inativas';

function formatRoteiroCount(count: number) {
  return `${count} roteiro${count === 1 ? '' : 's'}`;
}

function seriesMetaLine(serie: Serie, roteiroCount: number) {
  const frequency = serie.frequenciaRecomendada || 'Sob demanda';
  const activeLabel = serie.ativa ? null : 'Inativa';
  return [frequency, formatRoteiroCount(roteiroCount), activeLabel]
    .filter(Boolean)
    .join(' · ');
}

export function SeriesSettingsPage() {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<SeriesFilter>('todas');
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickColor, setQuickColor] = useState(() => nextFreeSerieColor([]));
  const editorialSettings = getEditorialSettings(state.preferences);

  const openCreatePage = () => {
    if (editorialSettings.quickSeriesCreate) {
      setQuickColor(nextFreeSerieColor(state.series));
      setQuickCreateOpen(true);
      return;
    }
    navigate('/editorial/series/nova');
  };

  const handleQuickCreate = () => {
    const name = quickName.trim();
    if (!name) return;
    const now = new Date().toISOString();
    const serie: Serie = {
      id: generateUUID(),
      userId: user?.id || '',
      name,
      template: '',
      notes: '',
      slotPadrao: null,
      formatoVisualPadrao: null,
      estruturaRoteiro: null,
      bordao: null,
      cor: isSerieColorTaken(state.series, quickColor) ? nextFreeSerieColor(state.series) : quickColor,
      capaUrl: null,
      ativa: true,
      frequenciaRecomendada: null,
      funcaoPadrao: null,
      energiaPadrao: null,
      createdAt: now,
      updatedAt: now,
      pilarIds: [],
      plataformas: [],
    };
    dispatch({ type: 'ADD_SERIE', payload: serie });
    setQuickCreateOpen(false);
    setQuickName('');
    navigate(`/series/${serie.id}/roteiros`);
  };

  const roteiroCountBySerie = useMemo(() => {
    const map = new Map<string, number>();
    for (const content of state.contents) {
      if (content.seriesId) map.set(content.seriesId, (map.get(content.seriesId) || 0) + 1);
    }
    return map;
  }, [state.contents]);

  const filteredSeries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return state.series
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
  }, [filter, search, state.series]);

  const filterCounts = useMemo(() => {
    const ativas = state.series.filter(serie => serie.ativa).length;
    return {
      todas: state.series.length,
      ativas,
      inativas: state.series.length - ativas,
    };
  }, [state.series]);

  const seriesStatus = resolveQueryViewStatus({
    loading: !state.isLoaded,
    enabled: true,
    fetchAttempted: state.isLoaded,
    itemCount: state.series.length,
  });

  const openBulkPage = (serieId: string) => {
    navigate(`/series/${serieId}/roteiros`);
  };

  if (isMobile) {
    return (
      <>
        <div className="min-h-full bg-[var(--bg-primary)]">
          <SeriesMobileScreen
            series={state.series}
            roteiroCountBySerie={roteiroCountBySerie}
            onOpen={openBulkPage}
            onCreate={openCreatePage}
            onConfigure={serieId => navigate(`/editorial/series/${serieId}`)}
            showOpenBadges={editorialSettings.openInfoNotices}
          />
        </div>
        <QuickCreateSheet
          open={quickCreateOpen}
          name={quickName}
          color={quickColor}
          takenColors={[...takenSerieColorKeys(state.series)]}
          onNameChange={setQuickName}
          onColorChange={setQuickColor}
          onClose={() => setQuickCreateOpen(false)}
          onCreate={handleQuickCreate}
        />
      </>
    );
  }

  return (
    <SettingsPageScaffold
      section="Criação"
      title="Séries"
      icon={Layers}
      showBack={false}
      variant="default"
      toolbar={
        state.series.length > 0 ? (
          <div className="desktop-subheader !mb-0">
            <ToolbarSearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar série…"
              className="desktop-subheader-search"
            />
            <SegmentTabs<SeriesFilter>
              value={filter}
              onChange={setFilter}
              options={[
                { id: 'todas', label: `Todas ${filterCounts.todas}` },
                { id: 'ativas', label: `Ativas ${filterCounts.ativas}` },
                { id: 'inativas', label: `Inativas ${filterCounts.inativas}` },
              ]}
            />
          </div>
        ) : undefined
      }
      actions={
        <AppButton
          onClick={openCreatePage}
          variant="primary"
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Nova série
        </AppButton>
      }
    >
      <Text variant="secondary" className="mb-4">
        Criação em massa: abra uma série para produzir roteiros e ideias. A edição completa fica no Editorial.
      </Text>
      <QueryViewState
        status={seriesStatus}
        skeletonCount={6}
        skeletonVariant="row"
        emptyIcon={<Layers className="h-8 w-8" />}
        emptyTitle="Nenhuma série criada"
        emptyDescription="Crie a primeira série para agrupar roteiros recorrentes."
        emptyAction={
          <AppButton variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreatePage}>
            Nova série
          </AppButton>
        }
      >
        <div className={SETTINGS_ENTITY_GRID_CLASS}>
          {filteredSeries.length === 0 ? (
            <div className="col-span-full py-10 text-center">
              <p className="text-sm font-medium opacity-40">Nenhuma série encontrada</p>
            </div>
          ) : (
            filteredSeries.map(serie => {
              const roteiroCount = roteiroCountBySerie.get(serie.id) || 0;
              const structure = serie.estruturaRoteiro?.trim();

              return (
                <Surface
                  key={serie.id}
                  variant="outlined"
                  padding="md"
                  className={!serie.ativa ? 'relative opacity-55' : 'relative'}
                >
                  <div className="absolute right-2 top-2 z-10">
                    <MoreMenu
                      size="sm"
                      items={[{
                        label: 'Configurar no Editorial',
                        onClick: () => navigate(`/editorial/series/${serie.id}`),
                      }]}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => openBulkPage(serie.id)}
                    className="w-full pr-8 text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <Badge variant="neutral">
                        <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: serie.cor || '#6366f1' }} />
                        {serie.ativa ? 'Ativa' : 'Inativa'}
                      </Badge>
                      {editorialSettings.openInfoNotices && getSerieOpenItems(serie).length > 0 ? (
                        <Badge variant="neutral">Em aberto</Badge>
                      ) : null}
                    </div>
                    <Text variant="itemTitle">{serie.name}</Text>
                    {structure ? <Text variant="secondary" className="mt-1 line-clamp-2">{structure}</Text> : null}
                    <Text variant="meta" className="mt-2">{seriesMetaLine(serie, roteiroCount)}</Text>
                  </button>
                </Surface>
              );
            })
          )}
        </div>
      </QueryViewState>

      <QuickCreateSheet
        open={quickCreateOpen}
        name={quickName}
        color={quickColor}
        takenColors={[...takenSerieColorKeys(state.series)]}
        onNameChange={setQuickName}
        onColorChange={setQuickColor}
        onClose={() => setQuickCreateOpen(false)}
        onCreate={handleQuickCreate}
      />
    </SettingsPageScaffold>
  );
}

function QuickCreateSheet({
  open,
  name,
  color,
  takenColors,
  onNameChange,
  onColorChange,
  onClose,
  onCreate,
}: {
  open: boolean;
  name: string;
  color: string;
  takenColors: readonly string[];
  onNameChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onClose: () => void;
  onCreate: () => void;
}) {
  const taken = new Set(takenColors);
  return (
    <BottomSheetModal open={open} onClose={onClose} desktopMaxW="max-w-md">
      <OverlayHeader onClose={onClose}>
        <Text variant="sectionTitle">Nova série</Text>
        <Text variant="meta" className="mt-1 text-[var(--text-secondary)]">Comece com nome e cor.</Text>
      </OverlayHeader>
      <OverlayBody className="stack-lg">
        <label className="block">
          <Text variant="label" className="mb-1.5 block">Nome</Text>
          <input
            autoFocus
            value={name}
            onChange={event => onNameChange(event.target.value)}
            placeholder="Nome da série"
            className="ds-input w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm"
          />
        </label>
        <div>
          <Text variant="label" className="mb-2 block">Cor</Text>
          <div className="flex flex-wrap gap-2">
            {PILAR_PRESET_CORES.map(item => {
              const used = taken.has(serieColorKey(item) || item);
              return (
                <button
                  key={item}
                  type="button"
                  disabled={used}
                  aria-label={used ? `Cor ${item} já usada em outra série` : `Escolher cor ${item}`}
                  aria-pressed={color === item}
                  onClick={() => onColorChange(item)}
                  className="h-9 w-9 rounded-full border-2 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-30"
                  style={{ backgroundColor: item, borderColor: color === item ? 'var(--text-primary)' : 'transparent' }}
                />
              );
            })}
          </div>
        </div>
      </OverlayBody>
      <OverlayFooter>
        <AppButton variant="secondary" onClick={onClose}>Cancelar</AppButton>
        <AppButton variant="primary" onClick={onCreate} disabled={!name.trim()}>Criar série</AppButton>
      </OverlayFooter>
    </BottomSheetModal>
  );
}
