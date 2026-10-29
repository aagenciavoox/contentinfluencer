import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Plus } from 'lucide-react';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { OverlayBody } from '../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../components/overlays/OverlayHeader';
import { SettingsPageScaffold } from '../../../components/settings/SettingsPageScaffold';
import { SettingsGridCard, SETTINGS_ENTITY_GRID_CLASS } from '../../../components/settings/SettingsGridCard';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { FilterChips } from '../../../components/ui/FilterChips';
import { QueryViewState, resolveQueryViewStatus } from '../../../components/ui/QueryViewState';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { ToggleRow } from '../../../components/ui/ToggleSwitch';
import { ToolbarSearchInput } from '../../../components/ui/ToolbarSearchInput';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import type { Serie } from '../../../lib/database';
import { CONFIRM, type ConfirmState } from '../../../lib/uiCopy';
import { SeriesMobileScreen } from '../../../mobile/screens/settings/SeriesMobileScreen';
import { generateUUID } from '../../../utils/uuid';
import { atualizarPreferencias } from '../../editorial/lib/editorialSettings';
import { rotuloFuncaoPadrao } from '../../editorial/lib/funcoes';
import { formatOpenItems, getSerieOpenItems } from '../../editorial/lib/serieCompleteness';
import { caminhoDaSerie } from '../../editorial/lib/serieArvore';
import { exibirSeriesVisiveis, type SerieListaModo } from '../../editorial/lib/serieLista';
import { CONTENT_STATUS, normalizeContentStatus } from '../../contents/lib/contentPipeline';
import { isActiveCreation } from '../../contents/lib/contentWorkflow';
import { PILAR_PRESET_CORES } from '../lib/pilarConstants';
import { isSerieColorTaken, nextFreeSerieColor, serieColorKey, takenSerieColorKeys } from '../lib/serieColors';

type SeriesFilter = 'todas' | 'ativas' | 'inativas' | 'abertas';

export function SeriesSettingsPage() {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<SeriesFilter>('todas');
  const [modoLista, setModoLista] = useState<SerieListaModo>('agrupada');
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickColor, setQuickColor] = useState(() => nextFreeSerieColor([]));
  const editorialSettings = state.editorial;
  const preferenciasSeries = [
    {
      key: 'quickSeriesCreate',
      title: 'Criação rápida de séries',
      description: 'Crie com nome e cor e complete os detalhes depois.',
      enabled: editorialSettings.quickSeriesCreate,
      toggle: () => dispatch({
        type: 'SET_EDITORIAL',
        payload: atualizarPreferencias({ ...editorialSettings, quickSeriesCreate: !editorialSettings.quickSeriesCreate }, {}),
      }),
    },
    {
      key: 'openInfoNotices',
      title: 'Avisar sobre informações em aberto',
      description: 'Sinaliza séries sem pilar, função, recorrência, formato ou esforço.',
      enabled: editorialSettings.openInfoNotices,
      toggle: () => dispatch({
        type: 'SET_EDITORIAL',
        payload: atualizarPreferencias({ ...editorialSettings, openInfoNotices: !editorialSettings.openInfoNotices }, {}),
      }),
    },
  ];

  const openCreatePage = () => {
    if (editorialSettings.quickSeriesCreate) {
      setQuickColor(nextFreeSerieColor(state.series));
      setQuickCreateOpen(true);
      return;
    }
    navigate('/series/nova');
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
      formatoVisualPadrao: [],
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
    navigate(`/series/${serie.id}`);
  };

  const roteiroCountBySerie = useMemo(() => {
    const map = new Map<string, number>();
    for (const content of state.contents) {
      if (!content.seriesId || !isActiveCreation(content)) continue;
      if (normalizeContentStatus(content.status) === CONTENT_STATUS.IDEIA) continue;
      map.set(content.seriesId, (map.get(content.seriesId) || 0) + 1);
    }
    return map;
  }, [state.contents]);

  const openItems = useMemo(
    () => new Map(state.series.map(serie => [
      serie.id,
      getSerieOpenItems(serie, { series: state.series, contents: state.contents }),
    ])),
    [state.contents, state.series],
  );
  const avisosLigados = editorialSettings.openInfoNotices;
  const filtroAtivo: SeriesFilter = !avisosLigados && filter === 'abertas' ? 'todas' : filter;

  const filtradas = useMemo(() => {
    const query = search.trim().toLowerCase();
    return state.series.filter(serie => {
      if (filtroAtivo === 'ativas' && !serie.ativa) return false;
      if (filtroAtivo === 'inativas' && serie.ativa) return false;
      if (filtroAtivo === 'abertas' && (openItems.get(serie.id)?.length ?? 0) === 0) return false;
      if (!query) return true;
      const haystack = [serie.name, serie.bordao, serie.notes, serie.frequenciaRecomendada]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [filtroAtivo, openItems, search, state.series]);

  const exibicao = useMemo(
    () => exibirSeriesVisiveis(filtradas, modoLista),
    [filtradas, modoLista],
  );

  const filterCounts = useMemo(() => {
    const ativas = state.series.filter(serie => serie.ativa).length;
    const abertas = state.series.filter(serie => (openItems.get(serie.id)?.length ?? 0) > 0).length;
    return {
      todas: state.series.length,
      ativas,
      inativas: state.series.length - ativas,
      abertas,
    };
  }, [openItems, state.series]);

  const seriesStatus = resolveQueryViewStatus({
    loading: !state.isLoaded,
    enabled: true,
    fetchAttempted: state.isLoaded,
    itemCount: state.series.length,
  });

  const remover = (serie: Serie) => {
    setConfirm({
      ...CONFIRM.excluirSerie,
      onConfirm: () => dispatch({ type: 'DELETE_SERIE', payload: serie.id }),
    });
  };

  const quickSheet = (
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
  );

  if (isMobile) {
    return (
      <>
        <div className="min-h-full bg-[var(--bg-primary)]">
          <SeriesMobileScreen
            series={state.series}
            contents={state.contents}
            roteiroCountBySerie={roteiroCountBySerie}
            onOpen={serieId => navigate(`/series/${serieId}`)}
            onCreate={openCreatePage}
            onConfigure={serieId => navigate(`/series/${serieId}/editar`)}
            showOpenBadges={avisosLigados}
            preferencias={preferenciasSeries}
          />
        </div>
        {quickSheet}
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
              placeholder="Buscar série ou quadro…"
              className="desktop-subheader-search"
            />
            <FilterChips<SeriesFilter>
              value={filtroAtivo}
              onChange={setFilter}
              ariaLabel="Filtrar séries"
              options={[
                { id: 'todas', label: 'Todas', count: filterCounts.todas },
                { id: 'ativas', label: 'Ativas', count: filterCounts.ativas },
                { id: 'inativas', label: 'Inativas', count: filterCounts.inativas },
                ...(avisosLigados ? [{ id: 'abertas' as const, label: 'Em aberto', count: filterCounts.abertas }] : []),
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
        Séries e quadros. Abrir um item mostra os episódios.
      </Text>
      <Surface padding="sm" className="mb-4 grid gap-x-6 gap-y-2 md:grid-cols-2">
        {preferenciasSeries.map(row => (
          <ToggleRow
            key={row.key}
            id={`series-${row.key}`}
            enabled={row.enabled}
            onToggle={row.toggle}
            title={row.title}
            className="gap-4 py-1"
          >
            <span className="stack-xs">
              <Text variant="body" as="span">{row.title}</Text>
              <Text variant="secondary" as="span">{row.description}</Text>
            </span>
          </ToggleRow>
        ))}
      </Surface>
      {state.series.length > 0 ? (
        <div className="mb-4">
          <SegmentTabs<SerieListaModo>
            value={modoLista}
            onChange={setModoLista}
            ariaLabel="Visualização das séries"
            options={[
              { id: 'agrupada', label: 'Agrupada' },
              { id: 'lista', label: 'Lista' },
            ]}
          />
        </div>
      ) : null}
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
        {exibicao.length === 0 ? (
          <div className="py-10 text-center">
            <Text variant="body" className="text-[var(--text-tertiary)]">Nenhuma série encontrada</Text>
          </div>
        ) : (
          <div className={SETTINGS_ENTITY_GRID_CLASS}>
            {exibicao.map(({ serie, profundidade }) => {
              const items = openItems.get(serie.id) ?? [];
              const aberta = avisosLigados && items.length > 0;
              const caminho = profundidade > 0
                ? caminhoDaSerie(serie.id, state.series).slice(0, -1).map(item => item.name).filter(Boolean).join(' · ')
                : null;
              const roteiros = roteiroCountBySerie.get(serie.id) || 0;
              return (
                <SettingsGridCard
                  key={serie.id}
                  compact
                  title={serie.name}
                  color={serie.cor || undefined}
                  imageUrl={serie.capaUrl}
                  active={serie.ativa}
                  dimmed={!serie.ativa}
                  onOpen={() => navigate(`/series/${serie.id}`)}
                  onToggle={() => dispatch({
                    type: 'UPDATE_SERIE',
                    payload: { ...serie, ativa: !serie.ativa, updatedAt: new Date().toISOString() },
                  })}
                  onDelete={() => remover(serie)}
                  meta={[
                    caminho ? `Quadro de ${caminho}` : null,
                    serie.frequenciaRecomendada || 'Sob demanda',
                    rotuloFuncaoPadrao(serie.funcaoPadrao),
                    `${roteiros} ${roteiros === 1 ? 'roteiro' : 'roteiros'}`,
                  ].filter(Boolean).join(' · ')}
                  footer={(
                    <AppButton variant="secondary" size="sm" onClick={() => navigate(`/series/${serie.id}/editar`)}>
                      Editar definições
                    </AppButton>
                  )}
                >
                  {aberta ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="neutral">Em aberto</Badge>
                      <Text variant="meta" as="span">{formatOpenItems(items)}</Text>
                    </div>
                  ) : null}
                </SettingsGridCard>
              );
            })}
          </div>
        )}
      </QueryViewState>
      {quickSheet}
      <ConfirmModal
        open={Boolean(confirm)}
        message={confirm?.message ?? ''}
        confirmLabel={confirm?.confirmLabel}
        cancelLabel={confirm?.cancelLabel}
        onConfirm={() => {
          confirm?.onConfirm();
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
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
