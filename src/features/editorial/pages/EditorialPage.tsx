import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Hash, Layers3, Palette, Plus, Settings2, SlidersHorizontal } from 'lucide-react';
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
import { MobileToggleSwitch } from '../../../mobile/components/MobileToggleSwitch';
import {
  createEmptyPilarPlataforma,
  resolvePlatformUuid,
  shouldPersistPilarPlataforma,
} from '../../settings/lib/pilarPostingSchedule';
import { sortPilares } from '../../settings/lib/activePilares';
import {
  EDITORIAL_SETTINGS_PREFERENCE_KEY,
  getEditorialSettings,
  type EditorialSettings,
} from '../lib/editorialSettings';
import { rotuloFuncaoPadrao } from '../lib/funcoes';
import { DistribuicaoFuncoesPanel } from '../components/DistribuicaoFuncoesPanel';
import { NotasConfiguracaoEditorial } from '../components/NotasConfiguracaoEditorial';
import { LeiturasLista } from '../components/LeiturasLista';
import { computeReadingsFromApp, leiturasDoEditorial } from '../lib/editorialReadings';
import { rotuloEspacos, somaEspacosSemana } from '../lib/distribuirEspacos';
import { checkEditorialConfig } from '../lib/checkEditorialConfig';
import { getSerieOpenItems } from '../lib/serieCompleteness';
import { contarEstoque, textoEstoque } from '../lib/estoque';
import { LIMITE_HASHTAGS_PADRAO } from '../lib/editorialSettings';

type EditorialTab = 'pilares' | 'series' | 'funil' | 'hashtags' | 'ajustes';
type SeriesFilter = 'todas' | 'ativas' | 'inativas' | 'abertas';

const TABS: Array<{ id: EditorialTab; label: string }> = [
  { id: 'pilares', label: 'Pilares' },
  { id: 'series', label: 'Séries' },
  { id: 'funil', label: 'Funil' },
  { id: 'hashtags', label: 'Hashtags' },
  { id: 'ajustes', label: 'Ajustes' },
];

function isEditorialTab(value: string | null): value is EditorialTab {
  return TABS.some(tab => tab.id === value);
}

function PillarsPanel() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const pilares = useMemo(() => sortPilares(state.pilares), [state.pilares]);
  const counts = useMemo(() => {
    const result = new Map<string, number>();
    state.contents.forEach(content => {
      if (content.pilarId) result.set(content.pilarId, (result.get(content.pilarId) ?? 0) + 1);
    });
    return result;
  }, [state.contents]);

  const remove = (pilar: Pilar) => {
    setConfirm({
      ...CONFIRM.excluirPilar,
      onConfirm: () => dispatch({ type: 'DELETE_PILAR', payload: pilar.id }),
    });
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <Text variant="secondary">
          Organize os temas, o ritmo editorial e a publicação por plataforma.
          Total da semana, pilares ativos: {rotuloEspacos(somaEspacosSemana(pilares))}.
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
            const count = counts.get(pilar.id) ?? 0;
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
                onEdit={() => navigate(`/editorial/pilares/${pilar.id}`)}
                onDelete={() => remove(pilar)}
                badges={
                  <>
                    <Badge>{count} roteiro{count === 1 ? '' : 's'}</Badge>
                    <Badge>{pilar.plataformas.length} redes</Badge>
                    <Badge>{pilar.frequenciaSemanal == null ? 'Sem espaços' : `${rotuloEspacos(pilar.frequenciaSemanal)}/sem`}</Badge>
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
        <AppButton
          variant="primary"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => navigate('/editorial/series/nova')}
        >
          Nova série
        </AppButton>
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
                description={serie.estruturaRoteiro || undefined}
                color={serie.cor || undefined}
                imageUrl={serie.capaUrl}
                active={serie.ativa}
                dimmed={!serie.ativa}
                onOpen={() => navigate(`/editorial/series/${serie.id}`)}
                onEdit={() => navigate(`/editorial/series/${serie.id}`)}
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

function notasDaConfiguracao(state: ReturnType<typeof useAppContext>['state']) {
  const settings = getEditorialSettings(state.preferences);
  return checkEditorialConfig({
    pilares: state.pilares,
    series: state.series,
    settings,
    plataformas: state.platforms,
  });
}

function FunnelPanel() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const settings = getEditorialSettings(state.preferences);
  const update = (patch: Partial<EditorialSettings>) => dispatch({
    type: 'SET_PREFERENCE',
    payload: {
      key: EDITORIAL_SETTINGS_PREFERENCE_KEY,
      value: { ...settings, ...patch },
    },
  });

  return (
    <DistribuicaoFuncoesPanel
      pilares={state.pilares}
      series={state.series}
      settings={settings}
      plataformas={state.platforms}
      onOpenSerie={serieId => navigate(`/editorial/series/${serieId}`)}
      onOpenPilares={() => navigate('/editorial?aba=pilares')}
      onChange={distribuicaoFuncoes => update({ distribuicaoFuncoes })}
      onChangeRede={redeReferenciaId => update({ redeReferenciaId })}
    />
  );
}

function HashtagsPanel() {
  const { state, dispatch } = useAppContext();
  const activePlatforms = state.platforms.filter(platform => platform.ativo);
  const [platformId, setPlatformId] = useState(activePlatforms[0]?.id ?? '');
  const platform = activePlatforms.find(item => item.id === platformId) ?? activePlatforms[0];
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const readPilarValue = (pilar: Pilar) => {
    if (!platform) return '';
    return pilar.plataformas.find(item => resolvePlatformUuid(state.platforms, item.platformId) === platform.id)?.hashtags ?? '';
  };
  const readSerieValue = (serie: Serie) => {
    if (!platform) return '';
    return serie.plataformas.find(item => item.platformId === platform.id || item.platformId === platform.nome)?.hashtags ?? '';
  };
  const draftKey = (kind: 'pilar' | 'serie', id: string) => `${platform?.id ?? ''}:${kind}:${id}`;
  const draftValue = (kind: 'pilar' | 'serie', id: string, stored: string) =>
    drafts[draftKey(kind, id)] ?? stored;

  const save = () => {
    if (!platform) return;
    state.pilares.filter(item => item.ativo).forEach(pilar => {
      const key = draftKey('pilar', pilar.id);
      if (!(key in drafts)) return;
      const existingIndex = pilar.plataformas.findIndex(
        item => resolvePlatformUuid(state.platforms, item.platformId) === platform.id,
      );
      const current = existingIndex >= 0
        ? pilar.plataformas[existingIndex]
        : createEmptyPilarPlataforma(pilar.id, platform.nome);
      const next = { ...current, hashtags: drafts[key].trim() };
      const plataformas = [...pilar.plataformas];
      if (existingIndex >= 0) plataformas.splice(existingIndex, 1);
      if (shouldPersistPilarPlataforma(next)) plataformas.push(next);
      dispatch({
        type: 'UPDATE_PILAR',
        payload: { ...pilar, plataformas, updatedAt: new Date().toISOString() },
      });
    });
    state.series.filter(item => item.ativa).forEach(serie => {
      const key = draftKey('serie', serie.id);
      if (!(key in drafts)) return;
      const plataformas = serie.plataformas.filter(
        item => item.platformId !== platform.id && item.platformId !== platform.nome,
      );
      const hashtags = drafts[key].trim();
      if (hashtags) plataformas.push({ serieId: serie.id, platformId: platform.nome, hashtags });
      dispatch({
        type: 'UPDATE_SERIE',
        payload: { ...serie, plataformas, updatedAt: new Date().toISOString() },
      });
    });
    const prefix = `${platform.id}:`;
    setDrafts(current => Object.fromEntries(
      Object.entries(current).filter(([key]) => !key.startsWith(prefix)),
    ));
  };

  if (activePlatforms.length === 0) {
    return (
      <Surface className="text-center">
        <Text variant="sectionTitle">Nenhuma plataforma ativa</Text>
        <Text variant="secondary" className="mt-1">
          Ative uma plataforma em Configurações para editar hashtags.
        </Text>
      </Surface>
    );
  }

  const limiteSalvo = platform
    ? getEditorialSettings(state.preferences).limitesHashtags[platform.id]
    : undefined;

  const salvarLimite = (value: string) => {
    if (!platform) return;
    const settings = getEditorialSettings(state.preferences);
    const digits = value.replace(/\D/g, '').slice(0, 2);
    const next = { ...settings.limitesHashtags };
    if (!digits) {
      delete next[platform.id];
    } else {
      const numero = Math.min(30, Math.max(1, Number.parseInt(digits, 10)));
      next[platform.id] = numero;
    }
    dispatch({
      type: 'SET_PREFERENCE',
      payload: {
        key: EDITORIAL_SETTINGS_PREFERENCE_KEY,
        value: { ...settings, limitesHashtags: next },
      },
    });
  };

  return (
    <div className="stack-lg">
      <div className="max-w-full overflow-x-auto">
        <SegmentTabs
          value={platform?.id ?? ''}
          onChange={setPlatformId}
          className="w-max min-w-full"
          options={activePlatforms.map(item => ({ id: item.id, label: item.nome }))}
        />
      </div>
      <Surface>
        <Text variant="bodyStrong">Limite nesta rede</Text>
        <Text variant="secondary" className="mt-1">
          A sugestão corta neste número. Vazio usa {LIMITE_HASHTAGS_PADRAO}.
        </Text>
        <input
          type="text"
          inputMode="numeric"
          aria-label={`Limite de hashtags em ${platform?.nome ?? 'rede'}`}
          placeholder={String(LIMITE_HASHTAGS_PADRAO)}
          value={limiteSalvo == null ? '' : String(limiteSalvo)}
          onChange={event => salvarLimite(event.target.value)}
          className="mt-3 min-h-11 w-full max-w-xs rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
        />
      </Surface>
      <Surface>
        <Text variant="sectionTitle">Pilares ativos</Text>
        <div className="mt-3 stack-md">
          {state.pilares.filter(item => item.ativo).map(pilar => (
            <label key={pilar.id} className="grid gap-2 sm:grid-cols-[minmax(10rem,1fr)_2fr] sm:items-center">
              <Text variant="bodyStrong">{pilar.nome}</Text>
              <input
                value={draftValue('pilar', pilar.id, readPilarValue(pilar))}
                onChange={event => setDrafts(current => ({ ...current, [draftKey('pilar', pilar.id)]: event.target.value }))}
                placeholder="#hashtag1 #hashtag2"
                className="w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-[var(--text-primary)]"
              />
            </label>
          ))}
        </div>
      </Surface>
      <Surface>
        <Text variant="sectionTitle">Séries ativas</Text>
        <div className="mt-3 stack-md">
          {state.series.filter(item => item.ativa).map(serie => (
            <label key={serie.id} className="grid gap-2 sm:grid-cols-[minmax(10rem,1fr)_2fr] sm:items-center">
              <Text variant="bodyStrong">{serie.name}</Text>
              <input
                value={draftValue('serie', serie.id, readSerieValue(serie))}
                onChange={event => setDrafts(current => ({ ...current, [draftKey('serie', serie.id)]: event.target.value }))}
                placeholder="#hashtag1 #hashtag2"
                className="w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-[var(--text-primary)]"
              />
            </label>
          ))}
        </div>
      </Surface>
      <div className="sticky bottom-0 z-20 flex justify-end border-t border-[var(--border-color)] bg-[var(--bg-primary)] py-3">
        <AppButton
          variant="primary"
          onClick={save}
          disabled={!Object.keys(drafts).some(key => key.startsWith(`${platform?.id ?? ''}:`))}
        >
          Salvar alterações
        </AppButton>
      </div>
    </div>
  );
}

function SettingsPanel() {
  const { state, dispatch } = useAppContext();
  const settings = getEditorialSettings(state.preferences);
  const estoque = contarEstoque(state.contents);
  const update = (patch: Partial<EditorialSettings>) => dispatch({
    type: 'SET_PREFERENCE',
    payload: {
      key: EDITORIAL_SETTINGS_PREFERENCE_KEY,
      value: { ...settings, ...patch },
    },
  });
  const rows = [
    {
      key: 'quickSeriesCreate',
      title: 'Criação rápida de série',
      description: 'Na tela Séries, criar uma série só com nome e cor e completar aqui depois.',
      enabled: settings.quickSeriesCreate,
      toggle: () => update({ quickSeriesCreate: !settings.quickSeriesCreate }),
    },
    {
      key: 'openInfoNotices',
      title: 'Avisos de informações em aberto',
      description: 'Mostrar quando uma série ainda não tem pilar, função, recorrência, formato ou esforço.',
      enabled: settings.openInfoNotices,
      toggle: () => update({ openInfoNotices: !settings.openInfoNotices }),
    },
  ] as const;

  const notas = notasDaConfiguracao(state);
  const leiturasSerie = useMemo(
    () => leiturasDoEditorial(computeReadingsFromApp(state)),
    [state],
  );
  const ativas = state.platforms.filter(platform => platform.ativo);
  const referenciaAtual = state.platforms.find(platform => platform.id === settings.redeReferenciaId);
  const opcoesReferencia = referenciaAtual && !ativas.some(platform => platform.id === referenciaAtual.id)
    ? [referenciaAtual, ...ativas]
    : ativas;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {notas.length > 0 ? (
        <div className="sm:col-span-2">
          <NotasConfiguracaoEditorial notas={notas} />
        </div>
      ) : null}
      {leiturasSerie.length > 0 ? (
        <div className="sm:col-span-2">
          <LeiturasLista leituras={leiturasSerie} />
        </div>
      ) : null}
      {rows.map(row => (
        <Surface key={row.key} className="flex items-center justify-between gap-4">
          <div>
            <Text variant="bodyStrong">{row.title}</Text>
            <Text variant="secondary" className="mt-1">{row.description}</Text>
          </div>
          <MobileToggleSwitch enabled={row.enabled} onToggle={row.toggle} label={row.title} />
        </Surface>
      ))}
      <Surface className="grid gap-4 sm:col-span-2">
        <div>
          <Text variant="bodyStrong">Rede de referência</Text>
          <Text variant="secondary" className="mt-1">
            A grade lê a data desta rede. O que sai só em outra rede aparece como extra.
          </Text>
          <select
            value={settings.redeReferenciaId ?? ''}
            onChange={event => update({ redeReferenciaId: event.target.value || null })}
            className="mt-3 min-h-11 w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)]"
          >
            <option value="">Nenhuma</option>
            {opcoesReferencia.map(platform => (
              <option key={platform.id} value={platform.id}>{platform.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <Text variant="bodyStrong">Destinos padrão</Text>
          <Text variant="secondary" className="mt-1">
            Roteiros novos já nascem com estas redes marcadas.
          </Text>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Destinos padrão">
            {ativas.map(platform => {
              const marcado = settings.destinosPadrao.includes(platform.id);
              return (
                <button
                  key={platform.id}
                  type="button"
                  aria-pressed={marcado}
                  onClick={() => update({
                    destinosPadrao: marcado
                      ? settings.destinosPadrao.filter(id => id !== platform.id)
                      : [...settings.destinosPadrao, platform.id],
                  })}
                  className={marcado
                    ? 'inline-flex min-h-11 items-center rounded-[var(--radius-input)] border border-[var(--accent)] bg-[var(--accent)] px-3 text-sm font-medium text-[var(--bg-primary)]'
                    : 'inline-flex min-h-11 items-center rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 text-sm font-medium text-[var(--text-secondary)]'}
                >
                  {platform.nome}
                </button>
              );
            })}
          </div>
        </div>
      </Surface>
      <Surface className="grid gap-3 sm:col-span-2">
        <div>
          <Text variant="bodyStrong">Estoque desejado</Text>
          <Text variant="secondary" className="mt-1">
            Vídeos gravados que entram na grade e estão prontos para postar.
          </Text>
        </div>
        <Text variant="bodyStrong">{textoEstoque(estoque, settings.estoqueDesejado)}</Text>
        <input
          type="text"
          inputMode="numeric"
          placeholder="7"
          aria-label="Estoque desejado"
          value={settings.estoqueDesejado == null ? '' : String(settings.estoqueDesejado)}
          onChange={event => {
            const digits = event.target.value.replace(/\D/g, '').slice(0, 4);
            update({ estoqueDesejado: digits ? Number.parseInt(digits, 10) : null });
          }}
          className="min-h-11 w-full max-w-xs rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
        />
      </Surface>
    </div>
  );
}

const TAB_ICONS = {
  pilares: Palette,
  series: Layers3,
  funil: SlidersHorizontal,
  hashtags: Hash,
  ajustes: Settings2,
} satisfies Record<EditorialTab, typeof Palette>;

export function EditorialPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('aba');
  const tab: EditorialTab = isEditorialTab(requestedTab) ? requestedTab : 'pilares';
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
      {tab === 'funil' ? <FunnelPanel /> : null}
      {tab === 'hashtags' ? <HashtagsPanel /> : null}
      {tab === 'ajustes' ? <SettingsPanel /> : null}
    </SettingsPageScaffold>
  );
}