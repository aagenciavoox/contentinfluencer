import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarRange, Compass, Layers3, Palette, Plus, SlidersHorizontal } from 'lucide-react';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { SettingsGridCard, SETTINGS_ENTITY_GRID_CLASS } from '../../../components/settings/SettingsGridCard';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { FilterChips } from '../../../components/ui/FilterChips';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
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

const TABS = [
  { id: 'pilares', label: 'Pilares', icon: <Palette className="h-4 w-4" aria-hidden /> },
  { id: 'series', label: 'Séries', icon: <Layers3 className="h-4 w-4" aria-hidden /> },
  { id: 'periodo', label: 'Período', icon: <CalendarRange className="h-4 w-4" aria-hidden /> },
  { id: 'ajustes', label: 'Ajustes', icon: <SlidersHorizontal className="h-4 w-4" aria-hidden /> },
] satisfies Array<{ id: EditorialTab; label: string; icon: React.ReactNode }>;

/** Frase curta do header: diz o que cada aba guarda. */
const TAB_META: Record<EditorialTab, string> = {
  pilares: 'Os assuntos que fazem parte do perfil. Quantos roteiros cada um tem num período fica na aba Período.',
  series: 'Os formatos que se repetem. Produzir roteiros em lote fica na página Séries.',
  periodo: 'O que muda de um período para outro: prioridade, metas e capacidade.',
  ajustes: 'O que vale para todos os períodos.',
};

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
      {pilares.length === 0 ? (
        <EmptyState
          icon={<Palette className="h-8 w-8" />}
          title="Nenhum pilar cadastrado"
          description="Adicione o primeiro pilar para organizar os temas editoriais."
          action={(
            <AppButton variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/editorial/pilares/nova')}>
              Novo pilar
            </AppButton>
          )}
        />
      ) : (
        <div className={SETTINGS_ENTITY_GRID_CLASS}>
          {pilares.map(pilar => {
            const nomeRepetido = (nomesRepetidos.get(nomeChave(pilar.nome)) ?? 0) > 1;
            return (
              <SettingsGridCard
                key={pilar.id}
                title={pilar.nome}
                description={pilar.descricao || undefined}
                color={pilar.cor}
                active={pilar.ativo}
                dimmed={!pilar.ativo}
                onToggle={() => dispatch({ type: 'UPDATE_PILAR', payload: { ...pilar, ativo: !pilar.ativo } })}
                onOpen={() => navigate(`/editorial/pilares/${pilar.id}`)}
                onDelete={() => remove(pilar)}
                meta={[
                  pilar.plataformas.length === 0
                    ? 'Sem redes'
                    : pilar.plataformas.length === 1 ? '1 rede' : `${pilar.plataformas.length} redes`,
                  nomeRepetido ? 'Outro pilar tem o mesmo nome. Renomeie ou exclua um deles.' : null,
                ].filter(Boolean).join(' · ')}
                badges={nomeRepetido ? <Badge variant="warning">Nome repetido</Badge> : undefined}
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
  const avisosLigados = settings.openInfoNotices;
  // Sem os avisos, o filtro "Em aberto" mostraria séries sem nada no card dizendo por quê.
  const filtroAtivo: SeriesFilter = !avisosLigados && filter === 'abertas' ? 'todas' : filter;
  const counts = useMemo(() => {
    const active = state.series.filter(serie => serie.ativa).length;
    const opened = state.series.filter(serie => (openItems.get(serie.id)?.length ?? 0) > 0).length;
    return { todas: state.series.length, ativas: active, inativas: state.series.length - active, abertas: opened };
  }, [openItems, state.series]);
  const filtered = useMemo(
    () => state.series
      .filter(serie => {
        if (filtroAtivo === 'ativas') return serie.ativa;
        if (filtroAtivo === 'inativas') return !serie.ativa;
        if (filtroAtivo === 'abertas') return (openItems.get(serie.id)?.length ?? 0) > 0;
        return true;
      })
      .sort((a, b) => Number(b.ativa) - Number(a.ativa) || a.name.localeCompare(b.name, 'pt-BR')),
    [filtroAtivo, openItems, state.series],
  );

  const remove = (serie: Serie) => {
    setConfirm({
      ...CONFIRM.excluirSerie,
      onConfirm: () => dispatch({ type: 'DELETE_SERIE', payload: serie.id }),
    });
  };

  return (
    <>
      {state.series.length > 0 ? (
        <FilterChips<SeriesFilter>
          value={filtroAtivo}
          onChange={setFilter}
          ariaLabel="Filtrar séries"
          options={[
            { id: 'todas', label: 'Todas', count: counts.todas },
            { id: 'ativas', label: 'Ativas', count: counts.ativas },
            { id: 'inativas', label: 'Inativas', count: counts.inativas },
            ...(avisosLigados ? [{ id: 'abertas' as const, label: 'Em aberto', count: counts.abertas }] : []),
          ]}
        />
      ) : null}
      {state.series.length === 0 ? (
        <EmptyState
          icon={<Layers3 className="h-8 w-8" />}
          title="Nenhuma série criada"
          description="Crie a primeira série para agrupar roteiros recorrentes."
          action={(
            <AppButton variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/editorial/series/nova')}>
              Nova série
            </AppButton>
          )}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nenhuma série neste filtro"
          description="O filtro escolhido não tem séries agora."
          action={(
            <AppButton variant="secondary" onClick={() => setFilter('todas')}>
              Limpar filtro
            </AppButton>
          )}
        />
      ) : (
        <div className={SETTINGS_ENTITY_GRID_CLASS}>
          {filtered.map(serie => {
            const items = openItems.get(serie.id) ?? [];
            const aberta = avisosLigados && items.length > 0;
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
  const navigate = useNavigate();
  const tab = abaPedida(searchParams.get('aba'));

  const changeTab = (next: EditorialTab) => {
    const params = new URLSearchParams(searchParams);
    params.set('aba', next);
    setSearchParams(params, { replace: true });
  };

  // A ação principal da aba sobe para o header: uma só por tela.
  const acao = tab === 'pilares' ? (
    <AppButton variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/editorial/pilares/nova')}>
      Novo pilar
    </AppButton>
  ) : tab === 'series' ? (
    <AppButton variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/editorial/series/nova')}>
      Nova série
    </AppButton>
  ) : null;

  const abas = <SegmentTabs value={tab} onChange={changeTab} options={TABS} ariaLabel="Abas do Editorial" iconOnlyOnMobile />;

  return (
    <PageLayout
      header={(
        <DesktopPageHeader
          section="Criação"
          title="Editorial"
          icon={Compass}
          meta={TAB_META[tab]}
          actions={acao}
        />
      )}
      toolbar={abas}
      mobileToolbar={(
        <div className="stack-sm">
          {abas}
          {acao ? <div className="flex justify-end">{acao}</div> : null}
        </div>
      )}
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
    </PageLayout>
  );
}
