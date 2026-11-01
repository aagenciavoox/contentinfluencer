import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Layers, List, Plus } from 'lucide-react';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { OverlayBody } from '../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../components/overlays/OverlayHeader';
import { AppButton } from '../../../components/ui/AppButton';
import { MoreMenu } from '../../../components/ui/MoreMenu';
import { FilterBar } from '../../../components/ui/FilterBar';
import { PageToolbar } from '../../../components/ui/PageToolbar';
import { QueryViewState } from '../../../components/ui/QueryViewState';
import { Text } from '../../../components/ui/Text';
import { ViewModeToggle } from '../../../components/ui/ViewModeToggle';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useScrollMemory } from '../../../hooks/useSessionState';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import type { Serie } from '../../../lib/database';
import { SeriesMobileScreen } from '../../../mobile/screens/settings/SeriesMobileScreen';
import { generateUUID } from '../../../utils/uuid';
import { PreferenciasSeries, ResultadoDaLista } from '../components/series-list/SeriesListResultado';
import { SerieCreateModal, type SerieCreateModalTarget } from '../components/SerieCreateModal';
import { useSeriesLista, type SeriesListaModelo } from '../hooks/useSeriesLista';
import { PILAR_PRESET_CORES } from '../lib/pilarConstants';
import { isSerieColorTaken, nextFreeSerieColor, serieColorKey, takenSerieColorKeys } from '../lib/serieColors';
import type { FiltroSituacao, FiltroTipoLista, VistaLista } from '../lib/seriesListaView';

export function SeriesSettingsPage() {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [modalTarget, setModalTarget] = useState<SerieCreateModalTarget | null>(null);
  const modelo = useSeriesLista(setModalTarget);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickColor, setQuickColor] = useState(() => nextFreeSerieColor([]));

  const criarSerie = () => {
    if (state.editorial.quickSeriesCreate) {
      setQuickColor(nextFreeSerieColor(state.series));
      setQuickCreateOpen(true);
      return;
    }
    navigate('/series/novo');
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

  const createModals = (
    <>
      {quickSheet}
      <SerieCreateModal
        target={modalTarget}
        onClose={() => setModalTarget(null)}
      />
    </>
  );

  if (isMobile) {
    return (
      <>
        <div className="min-h-full bg-[var(--bg-primary)]">
          <SeriesMobileScreen modelo={modelo} onCreate={criarSerie} onCreateFamilia={() => setModalTarget({ tipo: 'familia' })} />
        </div>
        {createModals}
      </>
    );
  }

  return (
    <PageLayout
      header={
        <DesktopPageHeader
          section="Criação"
          title="Séries e quadros"
          meta="Organize seus conteúdos recorrentes."
          actions={[
            <MoreMenu key="mais" items={[{ id: 'criar-familia', label: 'Criar família', onClick: () => setModalTarget({ tipo: 'familia' }) }]} />,
            <AppButton key="serie" variant="primary" onClick={criarSerie} leftIcon={<Plus className="h-4 w-4" />}>
              Criar série
            </AppButton>,
          ]}
        />
      }
      toolbar={
        modelo.total > 0 ? (
          <PageToolbar
            filters={
              <FilterBar
                searchValue={modelo.filtros.busca}
                onSearchChange={valor => modelo.atualizarFiltro('busca', valor)}
                searchPlaceholder="Buscar séries e quadros"
                filters={[
                  {
                    id: 'tipo',
                    label: 'Tipo',
                    value: modelo.filtros.tipo,
                    emptyValue: 'todos',
                    onChange: valor => modelo.atualizarFiltro('tipo', valor as FiltroTipoLista),
                    options: modelo.opcoesTipo,
                  },
                  {
                    id: 'pilar',
                    label: 'Pilar',
                    value: modelo.filtros.pilar,
                    emptyValue: 'todos',
                    onChange: valor => modelo.atualizarFiltro('pilar', valor),
                    options: modelo.opcoesPilar,
                  },
                  {
                    id: 'situacao',
                    label: 'Situação',
                    value: modelo.filtros.situacao,
                    emptyValue: 'ativas',
                    onChange: valor => modelo.atualizarFiltro('situacao', valor as FiltroSituacao),
                    options: modelo.opcoesSituacao,
                  },
                ]}
              />
            }
            view={
              <ViewModeToggle<VistaLista>
                ariaLabel="Ver como"
                value={modelo.filtros.vista}
                onChange={vista => modelo.atualizarFiltro('vista', vista)}
                options={[
                  { value: 'cards', label: 'Cards', icon: LayoutGrid },
                  { value: 'lista', label: 'Lista', icon: List },
                ]}
              />
            }
          />
        ) : undefined
      }
    >
      <SeriesListaDesktop modelo={modelo} onCreate={criarSerie} />
      {createModals}
    </PageLayout>
  );
}

function SeriesListaDesktop({ modelo, onCreate }: { modelo: SeriesListaModelo; onCreate: () => void }) {
  const rolagem = useScrollMemory('criaki:series:lista', modelo.status === 'ready');

  return (
    <div ref={rolagem} className="stack-lg">
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
          <AppButton variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={onCreate}>
            Criar série
          </AppButton>
        }
      >
        <ResultadoDaLista modelo={modelo} />
      </QueryViewState>
    </div>
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
        <Text variant="sectionTitle">Criar série</Text>
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
            className="ds-input w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 t-body"
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
