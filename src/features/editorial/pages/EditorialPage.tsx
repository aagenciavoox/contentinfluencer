import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarRange, Layers3, LayoutDashboard, Palette, Plus } from 'lucide-react';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { SettingsGridCard, SETTINGS_ENTITY_GRID_CLASS } from '../../../components/settings/SettingsGridCard';
import { SettingsPageScaffold } from '../../../components/settings/SettingsPageScaffold';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useAppContext } from '../../../context/AppContext';
import type { Pilar, Serie } from '../../../lib/database';
import { CONFIRM, type ConfirmState } from '../../../lib/uiCopy';
import { PlanoPeriodoPanel } from '../components/plano/PlanoPeriodoPanel';
import {
  periodoInicial,
  useContagemDoPeriodo,
  type PeriodoSelecionado,
} from '../components/plano/PeriodoEditorialControl';
import { VisaoGeralPanel } from '../components/plano/VisaoGeralPanel';
import { LeiturasLista } from '../components/LeiturasLista';
import { getEditorialSettings } from '../lib/editorialSettings';
import { expectativaNoIntervalo, lerFrequencia } from '../lib/frequenciaSerie';
import { rotuloFuncaoPadrao } from '../lib/funcoes';
import type { GradeCounts } from '../lib/gradeCounts';
import { computeReadingsFromApp, leiturasDoEditorial } from '../lib/editorialReadings';
import { getSerieOpenItems } from '../lib/serieCompleteness';
import { sortPilares } from '../../settings/lib/activePilares';

type EditorialTab = 'pilares' | 'series' | 'visao' | 'plano';
type SeriesFilter = 'todas' | 'ativas' | 'inativas' | 'abertas';

const TABS: Array<{ id: EditorialTab; label: string }> = [
  { id: 'pilares', label: 'Pilares' },
  { id: 'series', label: 'Séries' },
  { id: 'visao', label: 'Visão geral' },
  { id: 'plano', label: 'Plano do período' },
];

const TAB_ICONS = {
  pilares: Palette,
  series: Layers3,
  visao: LayoutDashboard,
  plano: CalendarRange,
} satisfies Record<EditorialTab, typeof Palette>;

function nomeChave(nome: string): string {
  return nome.trim().toLocaleLowerCase('pt-BR');
}

function abaPedida(value: string | null): EditorialTab {
  if (value === 'pilares' || value === 'series' || value === 'visao' || value === 'plano') return value;
  if (value === 'funil') return 'visao';
  if (value === 'hashtags' || value === 'ajustes') return 'plano';
  return 'pilares';
}

function contagemDoPilar(contagem: GradeCounts, pilarId: string): number {
  return contagem.pilares.find(linha => linha.id === pilarId)?.previsto ?? 0;
}

function comparacaoDaSerie(
  serie: Serie,
  itens: GradeCounts['itens'],
  inicio: string,
  fim: string,
): string {
  const expectativa = expectativaNoIntervalo(lerFrequencia({
    frequenciaRecomendada: serie.frequenciaRecomendada,
    vezes: serie.frequenciaVezes,
    unidade: serie.frequenciaUnidade,
    aPartirDe: serie.frequenciaAPartirDe,
  }), inicio, fim);
  if (expectativa == null) return 'Quando houver pauta';
  const contados = itens.filter(item => item.serieId === serie.id).length;
  return `${contados} de ${expectativa} neste período`;
}

function PillarsPanel({ contagem }: { contagem: GradeCounts }) {
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
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <Text variant="secondary" className="max-w-xl">
          Organize os assuntos que fazem parte do perfil. As quantidades são calculadas a partir do que foi previsto e planejado.
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
            const count = contagemDoPilar(contagem, pilar.id);
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
                    <Badge>{count} neste período</Badge>
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

function SeriesPanel({
  contagem,
  inicio,
  fim,
}: {
  contagem: GradeCounts;
  inicio: string;
  fim: string;
}) {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<SeriesFilter>('todas');
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const settings = getEditorialSettings(state.preferences);
  const leiturasSerie = useMemo(
    () => leiturasDoEditorial(computeReadingsFromApp(state)),
    [state],
  );
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
      {leiturasSerie.length > 0 ? (
        <div className="mb-4">
          <LeiturasLista leituras={leiturasSerie} />
        </div>
      ) : null}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SegmentTabs<SeriesFilter>
          value={filter}
          onChange={value => setFilter(value)}
          className="max-w-full overflow-x-auto"
          options={[
            { id: 'todas', label: `Todas ${counts.todas}` },
            { id: 'ativas', label: `Ativas ${counts.ativas}` },
            { id: 'inativas', label: `Inativas ${counts.inativas}` },
            { id: 'abertas', label: `Em aberto ${counts.abertas}` },
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
                badges={settings.openInfoNotices && items.length > 0
                  ? <Badge variant="neutral">Em aberto · {items.length}</Badge>
                  : undefined}
              >
                <div className="stack-sm mt-1">
                  {serie.estruturaRoteiro ? (
                    <Text variant="secondary" className="line-clamp-2">{serie.estruturaRoteiro}</Text>
                  ) : null}
                  <Text variant="meta" as="p">{comparacaoDaSerie(serie, contagem.itens, inicio, fim)}</Text>
                </div>
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
  const [periodo, setPeriodo] = useState<PeriodoSelecionado>(() => periodoInicial());
  const contagem = useContagemDoPeriodo(periodo.inicio, periodo.fim);
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
      {tab === 'pilares' ? <PillarsPanel contagem={contagem} /> : null}
      {tab === 'series' ? (
        <SeriesPanel contagem={contagem} inicio={periodo.inicio} fim={periodo.fim} />
      ) : null}
      {tab === 'visao' ? (
        <VisaoGeralPanel
          periodo={periodo}
          onPeriodoChange={setPeriodo}
          contagem={contagem}
          onAbrirPlano={() => changeTab('plano')}
        />
      ) : null}
      {tab === 'plano' ? (
        <PlanoPeriodoPanel periodo={periodo} onPeriodoChange={setPeriodo} />
      ) : null}
    </SettingsPageScaffold>
  );
}
