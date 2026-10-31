import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Layers, List, Plus } from 'lucide-react';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { OverlayBody } from '../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../components/overlays/OverlayHeader';
import { AppButton } from '../../../components/ui/AppButton';
import { QueryViewState } from '../../../components/ui/QueryViewState';
import { SelectField } from '../../../components/ui/SelectField';
import { Text } from '../../../components/ui/Text';
import { ToolbarSearchInput } from '../../../components/ui/ToolbarSearchInput';
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
import { useSeriesLista, type SeriesListaModelo } from '../hooks/useSeriesLista';
import { PILAR_PRESET_CORES } from '../lib/pilarConstants';
import { isSerieColorTaken, nextFreeSerieColor, serieColorKey, takenSerieColorKeys } from '../lib/serieColors';
import type { FiltroSituacao, FiltroTipoLista, VistaLista } from '../lib/seriesListaView';

export function SeriesSettingsPage() {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const modelo = useSeriesLista();
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

  if (isMobile) {
    return (
      <>
        <div className="min-h-full bg-[var(--bg-primary)]">
          <SeriesMobileScreen modelo={modelo} onCreate={criarSerie} onCreateFamilia={() => navigate('/series/novo?tipo=familia')} />
        </div>
        {quickSheet}
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
            <AppButton key="familia" variant="secondary" onClick={() => navigate('/series/novo?tipo=familia')} leftIcon={<Plus className="h-4 w-4" />}>
              Criar família
            </AppButton>,
            <AppButton key="serie" variant="primary" onClick={criarSerie} leftIcon={<Plus className="h-4 w-4" />}>
              Criar série
            </AppButton>,
          ]}
        />
      }
    >
      <SeriesListaDesktop modelo={modelo} onCreate={criarSerie} />
      {quickSheet}
    </PageLayout>
  );
}

function SeriesListaDesktop({ modelo, onCreate }: { modelo: SeriesListaModelo; onCreate: () => void }) {
  const { filtros, atualizarFiltro, lista } = modelo;
  const rolagem = useScrollMemory('criaki:series:lista', modelo.status === 'ready');

  return (
    <div ref={rolagem} className="stack-lg">
      {modelo.total > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <ToolbarSearchInput
            value={filtros.busca}
            onChange={valor => atualizarFiltro('busca', valor)}
            placeholder="Buscar séries e quadros"
            className="min-w-[14rem] flex-1"
          />
          <SelectField
            ariaLabel="Tipo"
            prefix="Tipo:"
            value={filtros.tipo}
            onChange={valor => atualizarFiltro('tipo', valor as FiltroTipoLista)}
            options={modelo.opcoesTipo}
          />
          <SelectField
            ariaLabel="Pilar"
            prefix="Pilar:"
            value={filtros.pilar}
            onChange={valor => atualizarFiltro('pilar', valor)}
            options={modelo.opcoesPilar}
          />
          <SelectField
            ariaLabel="Situação"
            value={filtros.situacao}
            onChange={valor => atualizarFiltro('situacao', valor as FiltroSituacao)}
            options={modelo.opcoesSituacao}
          />
          <ViewModeToggle<VistaLista>
            ariaLabel="Ver como"
            value={filtros.vista}
            onChange={vista => atualizarFiltro('vista', vista)}
            options={[
              { value: 'cards', label: 'Cards', icon: LayoutGrid },
              { value: 'lista', label: 'Lista', icon: List },
            ]}
          />
        </div>
      ) : null}

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
