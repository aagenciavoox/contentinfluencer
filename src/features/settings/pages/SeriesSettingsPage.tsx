import { useMemo, useState } from 'react';
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
import { cn } from '../../../lib/utils';
import { SeriesMobileScreen } from '../../../mobile/screens/settings/SeriesMobileScreen';
import { ClubesSecao } from '../../clubes/components/ClubesSecao';
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
  const [quickTipo, setQuickTipo] = useState<'serie' | 'familia'>('serie');
  const [quickName, setQuickName] = useState('');
  const [quickColor, setQuickColor] = useState(() => nextFreeSerieColor([]));

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
      todos: serie + quadro,
      serie,
      quadro,
      familia,
    };
  }, [modelo.lista.itens, modelo.total]);

  const criarSerie = () => {
    if (state.editorial.quickSeriesCreate) {
      setQuickTipo('serie');
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
      tipoAgrupamento: quickTipo,
    };
    dispatch({ type: 'ADD_SERIE', payload: serie });
    setQuickCreateOpen(false);
    setQuickName('');
    if (quickTipo !== 'familia') navigate(`/series/${serie.id}`);
  };

  const quickSheet = (
    <QuickCreateSheet
      open={quickCreateOpen}
      tipo={quickTipo}
      name={quickName}
      color={quickColor}
      takenColors={[...takenSerieColorKeys(state.series)]}
      onTipoChange={setQuickTipo}
      onNameChange={setQuickName}
      onColorChange={setQuickColor}
      onClose={() => setQuickCreateOpen(false)}
      onCreate={handleQuickCreate}
      onOpenFullForm={() => {
        setQuickCreateOpen(false);
        navigate(`/series/novo?tipo=${quickTipo}`);
      }}
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
          section="Produção"
          title="Inventário & Projetos"
          subtitle="Séries com ritmo, quadros sob demanda, famílias para a vitrine e clubes para reunir roteiros."
          actions={[
            <AppButton key="novo" variant="primary" onClick={criarSerie} leftIcon={<Plus className="h-4 w-4" />}>
              Novo Agrupamento
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
                        ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-sm'
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
      <ClubesSecao />
    </div>
  );
}

function QuickCreateSheet({
  open,
  tipo,
  name,
  color,
  takenColors,
  onTipoChange,
  onNameChange,
  onColorChange,
  onClose,
  onCreate,
  onOpenFullForm,
}: {
  open: boolean;
  tipo: 'serie' | 'familia';
  name: string;
  color: string;
  takenColors: readonly string[];
  onTipoChange: (tipo: 'serie' | 'familia') => void;
  onNameChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onClose: () => void;
  onCreate: () => void;
  onOpenFullForm: () => void;
}) {
  const taken = new Set(takenColors);
  const rotuloTipo = tipo === 'familia' ? 'família' : 'série';
  const tituloBotao = tipo === 'familia' ? 'Criar família' : 'Criar série';

  return (
    <BottomSheetModal open={open} onClose={onClose} desktopMaxW="max-w-md">
      <OverlayHeader onClose={onClose}>
        <Text variant="sectionTitle">Novo Agrupamento</Text>
        <Text variant="meta" className="mt-1 text-[var(--text-secondary)]">
          Comece escolhendo o tipo, nome e cor.
        </Text>
      </OverlayHeader>
      <OverlayBody className="stack-lg">
        {/* Seletor de Tipo */}
        <div>
          <Text variant="label" as="div" className="mb-2 block uppercase text-[var(--text-secondary)]">
            Tipo
          </Text>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onTipoChange('serie')}
              className={cn(
                'flex flex-col items-center justify-center rounded-[var(--radius-input)] border p-2.5 text-center transition-all',
                tipo === 'serie'
                  ? 'border-[var(--brand-accent)] bg-[var(--surface-subtle)] shadow-sm'
                  : 'border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-[var(--border-strong)]',
              )}
            >
              <Text
                variant="itemTitle"
                as="span"
                className={tipo === 'serie' ? 'text-[var(--brand-accent)]' : 'text-[var(--text-primary)]'}
              >
                Série
              </Text>
              <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
                Episódios e cadência
              </Text>
            </button>
            <button
              type="button"
              onClick={() => onTipoChange('familia')}
              className={cn(
                'flex flex-col items-center justify-center rounded-[var(--radius-input)] border p-2.5 text-center transition-all',
                tipo === 'familia'
                  ? 'border-[var(--brand-accent)] bg-[var(--surface-subtle)] shadow-sm'
                  : 'border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-[var(--border-strong)]',
              )}
            >
              <Text
                variant="itemTitle"
                as="span"
                className={tipo === 'familia' ? 'text-[var(--brand-accent)]' : 'text-[var(--text-primary)]'}
              >
                Família
              </Text>
              <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
                Grupo de séries
              </Text>
            </button>
          </div>
        </div>

        <label className="block">
          <Text variant="label" as="div" className="mb-1.5 block">
            Nome da {rotuloTipo}
          </Text>
          <input
            autoFocus
            value={name}
            onChange={event => onNameChange(event.target.value)}
            placeholder={tipo === 'familia' ? 'Ex.: Descomplicando' : 'Ex.: Descomplicando Sanderson'}
            className="input"
          />
        </label>
        <div>
          <Text variant="label" as="div" className="mb-2 block">
            Cor
          </Text>
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

        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={onOpenFullForm}
            className="text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <Text variant="meta" as="span" className="hover:underline">
              Mais opções e configuração completa →
            </Text>
          </button>
        </div>
      </OverlayBody>
      <OverlayFooter>
        <AppButton variant="secondary" onClick={onClose}>Cancelar</AppButton>
        <AppButton variant="primary" onClick={onCreate} disabled={!name.trim()}>{tituloBotao}</AppButton>
      </OverlayFooter>
    </BottomSheetModal>
  );
}
