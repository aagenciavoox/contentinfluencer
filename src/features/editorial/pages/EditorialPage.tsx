import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarRange, Layers3, Palette, Plus, SlidersHorizontal } from 'lucide-react';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { SettingsGridCard, SETTINGS_ENTITY_GRID_CLASS } from '../../../components/settings/SettingsGridCard';
import { SettingsPageScaffold } from '../../../components/settings/SettingsPageScaffold';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { FilterChips } from '../../../components/ui/FilterChips';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useAppContext } from '../../../context/AppContext';
import type { Pilar, Serie } from '../../../lib/database';
import { CONFIRM, type ConfirmState } from '../../../lib/uiCopy';
import { AjustesEditorialPanel } from '../components/plano/AjustesEditorialPanel';
import { PeriodoPanel } from '../components/plano/PeriodoPanel';
import { periodoInicial, type PeriodoSelecionado } from '../components/plano/PeriodoEditorialControl';
import { lerPeriodoSalvo } from '../lib/periodoEditorial';
import { rotuloFuncaoPadrao } from '../lib/funcoes';
import { formatOpenItems, getSerieOpenItems } from '../lib/serieCompleteness';
import { sortPilares } from '../../settings/lib/activePilares';

type EditorialTab = 'pilares' | 'series' | 'periodo' | 'ajustes';
type SeriesFilter = 'todas' | 'ativas' | 'inativas' | 'abertas';

const TABS: Array<{ id: EditorialTab; label: string }> = [
  { id: 'pilares', label: 'Pilares' },
  { id: 'series', label: 'Séries' },
  { id: 'periodo', label: 'Período' },
  { id: 'ajustes', label: 'Ajustes' },
];

const TAB_ICONS = {
  pilares: Palette,
  series: Layers3,
  periodo: CalendarRange,
  ajustes: SlidersHorizontal,
} satisfies Record<EditorialTab, typeof Palette>;

function nomeChave(nome: string): string {
  return nome.trim().toLocaleLowerCase('pt-BR');
}

// Endereços antigos continuam abrindo a aba certa: links salvos e telas que ainda apontam para eles.
function abaPedida(value: string | null): EditorialTab {
  if (value === 'pilares' || value === 'series' || value === 'periodo' || value === 'ajustes') return value;
  if (value === 'visao' || value === 'plano' || value === 'funil') return 'periodo';
  if (value === 'hashtags') return 'ajustes';
  return 'pilares';
}

function PillarsPanel() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const pilares = useMemo(() => sortPilares(state.pilares), [state.pilares]);

  const nomesRepetidos = useMemo(() => {
    const result = new Map<string, number>();
    pilares.forEach(pilar => {
      const chave = nomeChave(pilar.nome);
      result.set(chave, (result.get(chave) ?? 0) + 1);
    });
    return result;
  }, [pilares]);

  const remove = (pilar: Pilar) => {
    setConfirm({
      ...CONFIRM.excluirPilar,
      onConfirm: () => dispatch({ type: 'DELETE_PILAR', payload: pilar.id }),
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Text variant="secondary" className="max-w-xl">
          Organize os assuntos que fazem parte do perfil. Quantos roteiros cada um tem num período fica na aba Período.
        </Text>
        <AppButton
          variant="primary"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => navigate('/editorial/pilares/nova')}
        >
          Novo pilar
        </AppButton>
      </div>
      {pilares.length === 0 ? (
        <Surface className="text-center">
          <Text variant="sectionTitle">Nenhum pilar cadastrado</Text>
          <Text variant="secondary" className="mt-1">
            Adicione o primeiro pilar para organizar os temas editoriais.
          </Text>
        </Surface>
      ) : (
        <div className={SETTINGS_ENTITY_GRID_CLASS}>
          {pilares.map(pilar => {
            const nomeRepetido = (nomesRepetidos.get(nomeChave(pilar.nome)) ?? 0) > 1;
            return (
              <SettingsGridCard
                key={pilar.id}
                title={pilar.nome}
                description={pilar.descricao || 'Descrição ainda não preenchida'}
                color={pilar.cor}
                active={pilar.ativo}
                dimmed={!pilar.ativo}
                onToggle={() => dispatch({ type: 'UPDATE_PILAR', payload: { ...pilar, ativo: !pilar.ativo } })}
                onOpen={() => navigate(`/editorial/pilares/${pilar.id}`)}
                onDelete={() => remove(pilar)}
                meta={nomeRepetido ? 'Outro pilar tem o mesmo nome. Renomeie ou exclua um deles.' : undefined}
                badges={
                  <>
                    {nomeRepetido ? (
                      <Badge variant="neutral" className="bg-[color-mix(in_srgb,var(--warning)_18%,transparent)] text-[var(--text-primary)]">
                        Nome repetido
                      </Badge>
                    ) : null}
                    <Badge>
                      {pilar.plataformas.length === 0
                        ? 'Sem redes'
                        : `${pilar.plataformas.length} ${pilar.plataformas.length === 1 ? 'rede' : 'redes'}`}
                    </Badge>
                  </>
                }
              />
            );
          })}
        </div>
      )}
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
    </>
  );
}

function SeriesPanel() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<SeriesFilter>('todas');
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const settings = state.editorial;
  const openItems = useMemo(
    () => new Map(state.series.map(serie => [serie.id, getSerieOpenItems(serie)])),
    [state.series],
  );
  const counts = useMemo(() => {
    const active = state.series.filter(serie => serie.ativa).length;
    const opened = state.series.filter(serie => (openItems.get(serie.id)?.length ?? 0) > 0).length;
    return { todas: state.series.length, ativas: active, inativas: state.series.length - active, abertas: opened };
  }, [openItems, state.series]);
  const filtered = useMemo(
    () => state.series
      .filter(serie => {
        if (filter === 'ativas') return serie.ativa;
        if (filter === 'inativas') return !serie.ativa;
        if (filter === 'abertas') return (openItems.get(serie.id)?.length ?? 0) > 0;
        return true;
      })
      .sort((a, b) => Number(b.ativa) - Number(a.ativa) || a.name.localeCompare(b.name, 'pt-BR')),
    [filter, openItems, state.series],
  );

  const remove = (serie: Serie) => {
    setConfirm({
      ...CONFIRM.excluirSerie,
      onConfirm: () => dispatch({ type: 'DELETE_SERIE', payload: serie.id }),
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterChips<SeriesFilter>
          value={filter}
          onChange={setFilter}
          ariaLabel="Filtrar séries"
          options={[
            { id: 'todas', label: 'Todas', count: counts.todas },
            { id: 'ativas', label: 'Ativas', count: counts.ativas },
            { id: 'inativas', label: 'Inativas', count: counts.inativas },
            { id: 'abertas', label: 'Em aberto', count: counts.abertas },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <AppButton variant="secondary" onClick={() => navigate('/series')}>
            Criação em massa
          </AppButton>
          <AppButton
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/editorial/series/nova')}
          >
            Nova série
          </AppButton>
        </div>
      </div>
      {filtered.length === 0 ? (
        <Surface className="text-center">
          <Text variant="sectionTitle">Nenhuma série neste filtro</Text>
          <Text variant="secondary" className="mt-1">
            Escolha outro filtro ou crie uma série.
          </Text>
        </Surface>
      ) : (
        <div className={SETTINGS_ENTITY_GRID_CLASS}>
          {filtered.map(serie => {
            const items = openItems.get(serie.id) ?? [];
            const aberta = settings.openInfoNotices && items.length > 0;
            return (
              <SettingsGridCard
                key={serie.id}
                compact
                title={serie.name}
                color={serie.cor || undefined}
                imageUrl={serie.capaUrl}
                active={serie.ativa}
                dimmed={!serie.ativa}
                onOpen={() => navigate(`/editorial/series/${serie.id}`)}
                onToggle={() => dispatch({
                  type: 'UPDATE_SERIE',
                  payload: { ...serie, ativa: !serie.ativa, updatedAt: new Date().toISOString() },
                })}
                onDelete={() => remove(serie)}
                meta={[serie.frequenciaRecomendada || 'Sob demanda', rotuloFuncaoPadrao(serie.funcaoPadrao)]
                  .filter(Boolean)
                  .join(' · ')}
              >
                {serie.estruturaRoteiro || aberta ? (
                  <div className="stack-sm mt-1">
                    {serie.estruturaRoteiro ? (
                      <Text variant="secondary" className="line-clamp-2">{serie.estruturaRoteiro}</Text>
                    ) : null}
                    {/* O que falta aparece no próprio card: o card já abre a série para completar. */}
                    {aberta ? (
                      <Text variant="meta" as="p" className="text-[var(--text-primary)]">
                        Em aberto: {formatOpenItems(items)}
                      </Text>
                    ) : null}
                  </div>
                ) : null}
              </SettingsGridCard>
            );
          })}
        </div>
      )}
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
    </>
  );
}

export function EditorialPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, dispatch } = useAppContext();
  const periodo = useMemo(
    () => (state.editorialVisao ? lerPeriodoSalvo(state.editorialVisao) : null) ?? periodoInicial(),
    [state.editorialVisao],
  );
  const salvarPeriodo = (next: PeriodoSelecionado) => {
    dispatch({ type: 'SET_EDITORIAL_VISAO', payload: next });
  };
  const tab = abaPedida(searchParams.get('aba'));
  const Icon = TAB_ICONS[tab];

  const changeTab = (next: EditorialTab) => {
    const params = new URLSearchParams(searchParams);
    params.set('aba', next);
    setSearchParams(params, { replace: true });
  };

  return (
    <SettingsPageScaffold
      section="Criação"
      title="Editorial"
      icon={Icon}
      showBack={false}
      variant="default"
      toolbar={
        <div className="max-w-full overflow-x-auto pb-1">
          <SegmentTabs
            value={tab}
            onChange={changeTab}
            options={TABS}
            className="w-max min-w-full"
          />
        </div>
      }
    >
      {tab === 'pilares' ? <PillarsPanel /> : null}
      {tab === 'series' ? <SeriesPanel /> : null}
      {tab === 'periodo' ? (
        <PeriodoPanel
          periodo={periodo}
          onPeriodoChange={salvarPeriodo}
          onAbrirAjustes={() => changeTab('ajustes')}
        />
      ) : null}
      {tab === 'ajustes' ? <AjustesEditorialPanel /> : null}
    </SettingsPageScaffold>
  );
}
