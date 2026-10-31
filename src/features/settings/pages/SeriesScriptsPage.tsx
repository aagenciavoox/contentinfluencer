import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowDownUp, Layers, Plus } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { FilterChips } from '../../../components/ui/FilterChips';
import { QueryViewState } from '../../../components/ui/QueryViewState';
import { resolveQueryViewStatus } from '../../../components/ui/queryViewStatus';
import { SelectField } from '../../../components/ui/SelectField';
import { Text } from '../../../components/ui/Text';
import { ToolbarSearchInput } from '../../../components/ui/ToolbarSearchInput';
import { useAppContext } from '../../../context/AppContext';
import { resolveDomainStatus } from '../../../context/domainLoading';
import { useDomainsReady } from '../../../hooks/useDomainsReady';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useScrollMemory, useSessionState } from '../../../hooks/useSessionState';
import { PageLayout } from '../../../layouts/page/PageLayout';
import type { AppDataDomain, Content } from '../../../lib/database';
import { withDetailBack } from '../../../lib/navigation/detailBack';
import { notifySaveFeedback } from '../../../lib/saveFeedback';
import { broadcastDataSync } from '../../../lib/syncBroadcast';
import { cn } from '../../../lib/utils';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import { CONTENT_STATUS } from '../../contents/lib/contentPipeline';
import { createContentDraft } from '../../contents/lib/createContentDraft';
import { OpenInfoNotice } from '../../editorial/components/OpenInfoNotice';
import { ETAPA_LABEL, ETAPAS_DE_CONTEUDO } from '../../editorial/lib/etapas';
import { FUNCAO_LABELS, isFuncaoEditorial } from '../../editorial/lib/funcoes';
import { formatOpenItems, getSerieOpenItems } from '../../editorial/lib/serieCompleteness';
import { ancestraisDaSerie, filhosDaSerie } from '../../editorial/lib/serieArvore';
import { escopoTemporadas, temporadasDoEscopo } from '../../editorial/lib/temporadas';
import { SerieCard } from '../components/series-list/SerieCard';
import { SeriesBulkDrawer, type PedidoMassa } from '../components/series-detail/SeriesBulkDrawer';
import { SeriesConteudosSecoes, type AcoesDasSecoes } from '../components/series-detail/SeriesConteudosSecoes';
import { SeriesDetailHeader } from '../components/series-detail/SeriesDetailHeader';
import { SeriesTemporadasPanel } from '../components/series-detail/SeriesTemporadasPanel';
import { podeTerTemporadas, rotaParaCriarFilho } from '../lib/serieHierarquia';
import { generateUUID } from '../../../utils/uuid';
import { SeriesAboutPanel, SeriesSettingsPanel } from '../components/series-detail/SeriesReadPanels';
import {
  contarConteudos,
  pilarEfetivoDaSerie,
  plural,
  textoConteudos,
  tipoDaSerie,
  tiposDasSeries,
  TIPO_AGRUPAMENTO_PLURAL,
} from '../lib/serieAgrupamento';
import { FILTROS_LISTA_PADRAO, montarListaSeries } from '../lib/seriesListaView';
import {
  contagemDoEscopo,
  FILTROS_PADRAO,
  filtrosAtivos,
  montarSecoes,
  type FiltroEtapa,
  type FiltroTipoConteudo,
  type FiltrosConteudos,
  type OrdemConteudos,
} from '../lib/seriesSecoes';
import { useAuth } from '../../../context/AuthContext';

type AbaSerie = 'conteudos' | 'quadros' | 'temporadas' | 'sobre';

const DOMINIOS_DA_SERIE: readonly AppDataDomain[] = ['production', 'content'];

const ORDENS: Array<{ value: OrdemConteudos; label: string }> = [
  { value: 'criacao', label: 'Ordem de criação' },
  { value: 'recentes', label: 'Editados por último' },
  { value: 'titulo', label: 'Título A–Z' },
];

type EstadoDaPagina = {
  filtros: FiltrosConteudos;
  abertas: Record<string, boolean>;
};

const ESTADO_INICIAL: EstadoDaPagina = { filtros: FILTROS_PADRAO, abertas: {} };

function validarEstado(valor: unknown): EstadoDaPagina | null {
  if (!valor || typeof valor !== 'object') return null;
  const bruto = valor as Partial<EstadoDaPagina>;
  const filtros = (bruto.filtros ?? {}) as Partial<FiltrosConteudos>;
  const etapas: readonly string[] = ['todas', ...ETAPAS_DE_CONTEUDO];
  return {
    filtros: {
      busca: typeof filtros.busca === 'string' ? filtros.busca : '',
      tipo: filtros.tipo === 'ideias' || filtros.tipo === 'roteiros' ? filtros.tipo : 'todos',
      etapa: typeof filtros.etapa === 'string' && etapas.includes(filtros.etapa) ? filtros.etapa as FiltroEtapa : 'todas',
      ordem: filtros.ordem === 'recentes' || filtros.ordem === 'titulo' ? filtros.ordem : 'criacao',
    },
    abertas: bruto.abertas && typeof bruto.abertas === 'object' ? bruto.abertas as Record<string, boolean> : {},
  };
}

export function SeriesScriptsPage() {
  const { serieId = '', temporadaId = null } = useParams<{ serieId: string; temporadaId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, dispatch, domainStatus, ensureDataDomains } = useAppContext();
  const { user } = useAuth();
  const celular = useIsMobile();
  const emMassa = location.pathname.endsWith('/criacao-em-massa');

  const [estado, setEstado] = useSessionState<EstadoDaPagina>(`criaki:serie:${serieId}`, ESTADO_INICIAL, validarEstado);
  const { filtros } = estado;
  const filtrando = filtrosAtivos(filtros);

  const serie = state.series.find(item => item.id === serieId) ?? null;
  const temporada = temporadaId ? state.temporadas.find(item => item.id === temporadaId) ?? null : null;
  const pronto = useDomainsReady(DOMINIOS_DA_SERIE);
  const falhou = DOMINIOS_DA_SERIE.some(dominio => resolveDomainStatus(domainStatus, dominio) === 'error');
  const rolagem = useScrollMemory(`criaki:serie:${serieId}${temporadaId ? `:${temporadaId}` : ''}`, pronto && Boolean(serie));

  const tipos = useMemo(() => tiposDasSeries(state.series), [state.series]);
  const filhos = useMemo(() => (serie ? filhosDaSerie(serie.id, state.series) : []), [serie, state.series]);
  const secoes = useMemo(
    () => (serie
      ? montarSecoes({ serieId: serie.id, series: state.series, temporadas: state.temporadas, contents: state.contents, filtros, temporadaId })
      : []),
    [filtros, serie, state.contents, state.series, state.temporadas, temporadaId],
  );
  const contagem = useMemo(() => {
    const todos = secoes.flatMap(secao => [
      ...secao.contents,
      ...(secao.temporadas ?? []).flatMap(faixa => faixa.contents),
    ]);
    // O total é sempre o do escopo inteiro; o filtro só muda quantos aparecem.
    const total = serie
      ? contagemDoEscopo({ serieId: serie.id, series: state.series, contents: state.contents, temporadaId })
      : contarConteudos([]);
    return { total, visiveis: contarConteudos(todos).conteudos };
  }, [secoes, serie, state.contents, state.series, temporadaId]);

  const itensDaLista = useMemo(
    () => montarListaSeries({
      series: state.series,
      contents: state.contents,
      filtros: { ...FILTROS_LISTA_PADRAO, situacao: 'todas' },
    }).itens,
    [state.contents, state.series],
  );

  const temporadasDaSerie = useMemo(() => {
    if (!serie) return [];
    const escopo = escopoTemporadas(serie.id, state.series);
    return escopo ? temporadasDoEscopo(escopo.id, state.temporadas) : [];
  }, [serie, state.series, state.temporadas]);

  const abaPedida = searchParams.get('aba');
  const tipo = serie ? tipos.get(serie.id) ?? tipoDaSerie(serie.id, state.series) : 'serie';
  // Família → séries, série → quadros e temporadas. Quadro não tem nada dentro.
  const mostraQuadros = tipo !== 'quadro' || filhos.length > 0;
  const mostraTemporadas = podeTerTemporadas(tipo);
  const aba: AbaSerie = abaPedida === 'sobre'
    ? 'sobre'
    : abaPedida === 'quadros' && mostraQuadros
      ? 'quadros'
      : abaPedida === 'temporadas' && mostraTemporadas ? 'temporadas' : 'conteudos';
  const rotaCriarFilho = serie ? rotaParaCriarFilho(serie.id, tipo) : null;
  const nomeDosFilhos = tipo === 'familia' ? TIPO_AGRUPAMENTO_PLURAL.serie : TIPO_AGRUPAMENTO_PLURAL.quadro;

  const trocarAba = (proxima: AbaSerie) => {
    const params = new URLSearchParams(searchParams);
    if (proxima === 'conteudos') params.delete('aba');
    else params.set('aba', proxima);
    setSearchParams(params, { replace: true });
  };

  const atualizarFiltro = <K extends keyof FiltrosConteudos>(chave: K, valor: FiltrosConteudos[K]) => {
    setEstado(atual => ({ ...atual, filtros: { ...atual.filtros, [chave]: valor } }));
  };
  const estaAberta = useCallback((id: string, padrao: boolean) => estado.abertas[id] ?? padrao, [estado.abertas]);
  const alternar = useCallback((id: string, padrao: boolean) => {
    setEstado(atual => ({ ...atual, abertas: { ...atual.abertas, [id]: !(atual.abertas[id] ?? padrao) } }));
  }, [setEstado]);

  const caminhoDaPagina = `${location.pathname.replace(/\/criacao-em-massa$/, '')}${location.search}`;
  const acoes: AcoesDasSecoes = {
    rotaDoConteudo: content => ({ to: buildContentDetailRoute(content.id), ...withDetailBack(caminhoDaPagina) }),
    onCopiarLink: content => {
      const url = `${window.location.origin}/conteudos/${content.id}`;
      void navigator.clipboard?.writeText(url).then(
        () => notifySaveFeedback({ status: 'success', message: 'Link copiado' }),
        () => notifySaveFeedback({ status: 'error', message: 'Não foi possível copiar o link.' }),
      );
    },
    onBulk: (destinoId, temporadaDestino) => {
      const params = new URLSearchParams();
      if (destinoId !== serieId) params.set('em', destinoId);
      if (temporadaDestino) params.set('temporada', temporadaDestino);
      const query = params.toString();
      navigate(`/series/${serieId}/criacao-em-massa${query ? `?${query}` : ''}`, { state: { voltarPara: caminhoDaPagina } });
    },
    onEditSerie: id => navigate(`/series/${id}/editar`),
  };

  const pedido = useMemo<PedidoMassa | null>(() => {
    if (!emMassa) return null;
    const em = searchParams.get('em');
    const temporadaPedida = searchParams.get('temporada') ?? temporadaId;
    return {
      nonce: `${location.key}`,
      origem: em || temporadaPedida ? 'grupo' : 'massa',
      serieId: em || serieId,
      temporadaId: temporadaPedida,
    };
  }, [emMassa, location.key, searchParams, serieId, temporadaId]);

  const idsExistentes = useMemo(() => new Set(state.contents.map(content => content.id)), [state.contents]);

  const criarConteudos = async (contents: Content[]) => {
    for (const content of contents) {
      await dispatch({ type: 'ADD_CONTENT', payload: content }, { silent: true, skipBroadcast: true });
    }
    broadcastDataSync();
  };

  const criarConteudo = () => {
    if (!serie) return;
    const novo = createContentDraft({
      title: 'Novo roteiro',
      status: CONTENT_STATUS.ROTEIRO,
      seriesId: serie.id,
      temporadaId: temporadaId ?? null,
      userId: user?.id || '',
    }, serie, state.series);
    void dispatch({ type: 'ADD_CONTENT', payload: novo });
    navigate(`${buildContentDetailRoute(novo.id)}&focus=script`, withDetailBack(caminhoDaPagina));
  };

  if (!serie) {
    const status = resolveQueryViewStatus({
      loading: !pronto,
      fetchAttempted: pronto,
      error: falhou ? 'falha' : null,
      itemCount: 0,
    });
    return (
      <PageLayout variant="settings">
        <QueryViewState
          status={status}
          onRetry={() => void ensureDataDomains(DOMINIOS_DA_SERIE, { force: true })}
          skeletonCount={5}
          skeletonVariant="row"
          emptyIcon={<Layers className="h-8 w-8" />}
          emptyTitle="Série não encontrada"
          emptyDescription="Ela pode ter sido excluída. As outras séries continuam na lista."
          emptyAction={<AppButton variant="secondary" onClick={() => navigate('/series')}>Voltar para séries</AppButton>}
        >
          {null}
        </QueryViewState>
      </PageLayout>
    );
  }

  const pilar = pilarEfetivoDaSerie(serie.id, state.series);
  const pilarNome = pilar.pilarId ? state.pilares.find(item => item.id === pilar.pilarId)?.nome ?? null : null;
  const objetivo = isFuncaoEditorial(serie.funcaoPadrao) ? FUNCAO_LABELS[serie.funcaoPadrao] : null;
  const resumo = [textoConteudos(contagem.total.conteudos), pilarNome, objetivo].filter(Boolean).join(' · ');
  const abertos = getSerieOpenItems(serie, { series: state.series, contents: state.contents });
  const abas: Array<{ id: AbaSerie; label: string }> = [
    { id: 'conteudos', label: 'Conteúdos' },
    ...(mostraQuadros ? [{ id: 'quadros' as const, label: nomeDosFilhos }] : []),
    ...(mostraTemporadas ? [{ id: 'temporadas' as const, label: 'Temporadas' }] : []),
    { id: 'sobre', label: 'Sobre' },
  ];
  const opcoesEtapa = [
    { value: 'todas', label: 'Todas as etapas' },
    ...ETAPAS_DE_CONTEUDO
      .filter(etapa => (filtros.tipo === 'roteiros' ? etapa !== 'ideia' : filtros.tipo === 'ideias' ? etapa === 'ideia' : true))
      .map(etapa => ({ value: etapa, label: ETAPA_LABEL[etapa] })),
  ];
  const ordemAtual = ORDENS.find(item => item.value === filtros.ordem) ?? ORDENS[0];
  const proximaOrdem = ORDENS[(ORDENS.indexOf(ordemAtual) + 1) % ORDENS.length];

  return (
    <PageLayout variant="settings" contentWidth="wide" contentStack="dense">
      <div ref={rolagem} className="stack-lg">
        <SeriesDetailHeader
          serie={serie}
          tipo={tipo}
          ancestrais={ancestraisDaSerie(serie.id, state.series).reverse().map(no => ({ id: no.id, name: no.name ?? '' }))}
          temporada={temporada}
          resumo={resumo}
          celular={celular}
          onEdit={() => navigate(`/series/${serie.id}/editar`)}
          onCreate={criarConteudo}
          onBulk={() => acoes.onBulk(serie.id, temporadaId)}
        />

        {state.editorial.openInfoNotices && abertos.length > 0 ? (
          <OpenInfoNotice
            items={abertos}
            title={`Esta série tem informações em aberto: ${formatOpenItems(abertos)}`}
            description={null}
            actionLabel="Editar"
            onAction={() => navigate(`/series/${serie.id}/editar`)}
          />
        ) : null}

        <div role="tablist" aria-label="Série" className="flex gap-6 border-b border-[var(--border-color)]">
          {abas.map(item => {
            const ativa = aba === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={ativa}
                onClick={() => trocarAba(item.id)}
                className={cn(
                  '-mb-px min-h-11 border-b-2 px-1 t-button focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                  ativa
                    ? 'border-[var(--text-primary)] text-[var(--text-primary)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {aba === 'conteudos' ? (
          <div className="stack-md">
            <div className="flex flex-wrap items-center gap-2">
              <ToolbarSearchInput
                value={filtros.busca}
                onChange={valor => atualizarFiltro('busca', valor)}
                placeholder="Buscar conteúdos"
                className={cn('min-w-0', celular ? 'w-full' : 'min-w-[14rem] flex-1')}
              />
              <FilterChips<FiltroTipoConteudo>
                ariaLabel="Mostrar"
                value={filtros.tipo}
                onChange={valor => setEstado(atual => ({
                  ...atual,
                  filtros: { ...atual.filtros, tipo: valor, etapa: 'todas' },
                }))}
                options={[
                  { id: 'todos', label: 'Todos' },
                  { id: 'ideias', label: 'Ideias' },
                  { id: 'roteiros', label: 'Roteiros' },
                ]}
              />
              {filtros.tipo !== 'ideias' ? (
                <SelectField
                  ariaLabel="Etapa"
                  value={filtros.etapa}
                  onChange={valor => atualizarFiltro('etapa', valor as FiltroEtapa)}
                  options={opcoesEtapa}
                />
              ) : null}
              <AppButton
                variant="secondary"
                iconOnly
                aria-label={`Ordem: ${ordemAtual.label}. Trocar para ${proximaOrdem.label}`}
                title={ordemAtual.label}
                onClick={() => atualizarFiltro('ordem', proximaOrdem.value)}
              >
                <ArrowDownUp className="h-4 w-4" />
              </AppButton>
            </div>

            <Text variant="meta" as="p">
              {[
                textoConteudos(contagem.total.conteudos),
                plural(contagem.total.roteiros, 'roteiro', 'roteiros'),
                plural(contagem.total.ideias, 'ideia', 'ideias'),
                filtrando ? `${contagem.visiveis} ${contagem.visiveis === 1 ? 'aparece' : 'aparecem'} com os filtros` : null,
                filtros.ordem !== 'criacao' ? ordemAtual.label : null,
              ].filter(Boolean).join(' · ')}
            </Text>

            {!pronto || falhou ? (
              <QueryViewState
                status={falhou && pronto ? 'error' : 'loading'}
                onRetry={() => void ensureDataDomains(DOMINIOS_DA_SERIE, { force: true })}
                skeletonCount={5}
                skeletonVariant="row"
                emptyTitle=""
                emptyDescription=""
              >
                {null}
              </QueryViewState>
            ) : secoes.length === 0 ? (
              <EmptyState
                compact
                title={filtros.busca.trim() ? `Nada encontrado para “${filtros.busca.trim()}”` : 'Nenhum conteúdo com estes filtros'}
                description="Ajuste a busca ou os filtros para ver outros conteúdos."
                action={(
                  <AppButton
                    variant="secondary"
                    onClick={() => setEstado(atual => ({ ...atual, filtros: { ...FILTROS_PADRAO, ordem: atual.filtros.ordem } }))}
                  >
                    Limpar busca e filtro
                  </AppButton>
                )}
              />
            ) : contagem.total.conteudos === 0 && filhos.length === 0 ? (
              <EmptyState
                compact
                title={temporada ? 'Nenhum conteúdo nesta temporada' : 'Nenhum conteúdo ainda'}
                description="Crie um conteúdo ou prepare vários de uma vez."
                action={(
                  <AppButton variant="secondary" onClick={() => acoes.onBulk(serie.id, temporadaId)}>
                    Adicionar em massa
                  </AppButton>
                )}
              />
            ) : (
              <SeriesConteudosSecoes
                secoes={secoes}
                serieDaPagina={serie.id}
                series={state.series}
                tipos={tipos}
                contas={state.platforms}
                celular={celular}
                filtrando={filtrando}
                estaAberta={estaAberta}
                alternar={alternar}
                acoes={acoes}
              />
            )}
          </div>
        ) : null}

        {aba === 'quadros' ? (
          <div className="stack-md">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Text variant="meta" as="p">
                {filhos.length === 0
                  ? `Nenhum ${tipo === 'familia' ? 'série' : 'quadro'} ainda.`
                  : plural(filhos.length, tipo === 'familia' ? 'série' : 'quadro', tipo === 'familia' ? 'séries' : 'quadros')}
              </Text>
              {rotaCriarFilho ? (
                <AppButton
                  variant="secondary"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => navigate(rotaCriarFilho)}
                >
                  {tipo === 'familia' ? 'Criar série nesta família' : 'Criar quadro'}
                </AppButton>
              ) : null}
            </div>
            {filhos.length > 0 ? (
              <div className={celular ? 'grid grid-cols-1 gap-3' : 'grid-content'}>
                {filhos.map(filho => {
                  const item = itensDaLista.get(filho.id);
                  if (!item) return null;
                  const pilarDoFilho = item.pilar.pilarId ? state.pilares.find(p => p.id === item.pilar.pilarId)?.nome ?? null : null;
                  return (
                    <SerieCard
                      key={filho.id}
                      item={item}
                      pilarNome={pilarDoFilho}
                      onOpen={id => navigate(`/series/${id}`)}
                      onOpenFilhos={id => navigate(`/series/${id}?aba=quadros`)}
                      onEdit={id => navigate(`/series/${id}/editar`)}
                      onCriarFilho={filhoItem => {
                        const rota = rotaParaCriarFilho(filhoItem.serie.id, filhoItem.tipo);
                        if (rota) navigate(rota);
                      }}
                      onToggleAtiva={id => {
                        const alvo = state.series.find(s => s.id === id);
                        if (!alvo) return;
                        void dispatch({ type: 'UPDATE_SERIE', payload: { ...alvo, ativa: !alvo.ativa, updatedAt: new Date().toISOString() } });
                      }}
                    />
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}

        {aba === 'temporadas' ? (
          <SeriesTemporadasPanel
            serie={serie}
            temporadas={temporadasDoEscopo(serie.id, state.temporadas)}
            contagem={id => contagemDoEscopo({ serieId: serie.id, series: state.series, contents: state.contents, temporadaId: id }).conteudos}
            onCriar={nome => {
              const agora = new Date().toISOString();
              void dispatch({
                type: 'ADD_TEMPORADA',
                payload: { id: generateUUID(), userId: user?.id || '', serieId: serie.id, nome, createdAt: agora },
              });
              // A primeira temporada liga o uso de temporadas na série.
              if (!serie.usaTemporadas) {
                void dispatch({ type: 'UPDATE_SERIE', payload: { ...serie, usaTemporadas: true, updatedAt: agora } });
              }
            }}
            onRenomear={(temporada, nome) => void dispatch({ type: 'UPDATE_TEMPORADA', payload: { ...temporada, nome } })}
            onExcluir={temporada => void dispatch({ type: 'DELETE_TEMPORADA', payload: temporada.id })}
          />
        ) : null}

        {aba === 'sobre' ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <SeriesAboutPanel
              serie={serie}
              series={state.series}
              pilares={state.pilares}
              temporadas={temporadasDaSerie}
              onEdit={() => navigate(`/series/${serie.id}/editar`)}
            />
            <SeriesSettingsPanel
              serie={serie}
              series={state.series}
              plataformas={state.platforms}
              onEdit={() => navigate(`/series/${serie.id}/editar`)}
            />
          </div>
        ) : null}
      </div>

      <SeriesBulkDrawer
        open={emMassa}
        onClose={() => {
          // Volta para onde a pessoa abriu (a série ou uma temporada); acesso direto volta para a série.
          const voltarPara = (location.state as { voltarPara?: unknown } | null)?.voltarPara;
          navigate(typeof voltarPara === 'string' && voltarPara.startsWith(`/series/${serie.id}`) ? voltarPara : `/series/${serie.id}`);
        }}
        seriePaginaId={serie.id}
        serieNome={serie.name}
        series={state.series}
        temporadas={temporadasDaSerie}
        plataformas={state.platforms}
        destinosPadrao={state.editorial.destinosPadrao}
        pedido={pedido}
        idsExistentes={idsExistentes}
        onCreate={criarConteudos}
      />
    </PageLayout>
  );
}
