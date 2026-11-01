import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowDownUp, Layers, Plus } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { FilterChips } from '../../../components/ui/FilterChips';
import { PageToolbar } from '../../../components/ui/PageToolbar';
import { QueryViewState } from '../../../components/ui/QueryViewState';
import { resolveQueryViewStatus } from '../../../components/ui/queryViewStatus';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { SelectField } from '../../../components/ui/SelectField';
import { Text } from '../../../components/ui/Text';
import { ToolbarSearchInput } from '../../../components/ui/ToolbarSearchInput';
import { useAppContext } from '../../../context/AppContext';
import { resolveDomainStatus } from '../../../context/domainLoading';
import { useDomainsReady } from '../../../hooks/useDomainsReady';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useScrollMemory, useSessionState } from '../../../hooks/useSessionState';
import { PageLayout } from '../../../layouts/page/PageLayout';
import type { AppDataDomain, Content, RedeSocial, Temporada } from '../../../lib/database';
import { withDetailBack } from '../../../lib/navigation/detailBack';
import { notifySaveFeedback } from '../../../lib/saveFeedback';
import { broadcastDataSync } from '../../../lib/syncBroadcast';
import { cn } from '../../../lib/utils';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import { OpenInfoNotice } from '../../editorial/components/OpenInfoNotice';
import { destinosPadraoAtivos, publicacoesDosDestinos } from '../../editorial/lib/destinations';
import { ETAPA_LABEL, ETAPAS_DE_CONTEUDO } from '../../editorial/lib/etapas';
import { FUNCAO_LABELS, isFuncaoEditorial } from '../../editorial/lib/funcoes';
import { formatOpenItems, getSerieOpenItems } from '../../editorial/lib/serieCompleteness';
import { ancestraisDaSerie, filhosDaSerie } from '../../editorial/lib/serieArvore';
import { escopoTemporadas, temporadasDoEscopo } from '../../editorial/lib/temporadas';
import { SerieCreateModal, type SerieCreateModalTarget } from '../components/SerieCreateModal';
import { NovoConteudoDialog, type PedidoNovoConteudo } from '../components/series-detail/NovoConteudoDialog';
import { SeriesBulkDrawer, type PedidoMassa } from '../components/series-detail/SeriesBulkDrawer';
import { SeriesDetailHeader } from '../components/series-detail/SeriesDetailHeader';
import { SeriesGruposLista, type AcoesDosGrupos, type SelecaoDaLista } from '../components/series-detail/SeriesGruposLista';
import { MoverConteudosSheet, SeriesSelectionBar } from '../components/series-detail/SeriesSelecao';
import { TemporadaDialogs, type EdicaoTemporada } from '../components/series-detail/TemporadaDialogs';
import { rotaParaCriarFilho } from '../lib/serieHierarquia';
import { generateUUID } from '../../../utils/uuid';
import {
  contarConteudos,
  pilarEfetivoDaSerie,
  plural,
  textoConteudos,
  tipoDaSerie,
  tiposDasSeries,
} from '../lib/serieAgrupamento';
import { conteudoDoBloco, criarBloco } from '../lib/seriesBulkDraft';
import {
  agruparPadrao,
  conteudosDaPagina,
  conteudosQueMudam,
  modosDeAgrupar,
  montarGrupos,
  moverConteudo,
  redesDeCostume,
  redesDoConteudo,
  redesUsadas,
  rotuloDoModo,
  type AgruparPor,
  type DestinoMover,
} from '../lib/seriesGrupos';
import {
  contagemDoEscopo,
  FILTROS_PADRAO,
  filtrosAtivos,
  type FiltroEtapa,
  type FiltroTipoConteudo,
  type FiltrosConteudos,
  type OrdemConteudos,
} from '../lib/seriesSecoes';
import { useAuth } from '../../../context/AuthContext';

const DOMINIOS_DA_SERIE: readonly AppDataDomain[] = ['production', 'content'];

const ORDENS: Array<{ value: OrdemConteudos; label: string }> = [
  { value: 'criacao', label: 'Ordem de criação' },
  { value: 'recentes', label: 'Editados por último' },
  { value: 'titulo', label: 'Título A–Z' },
];

type EstadoDaPagina = {
  filtros: FiltrosConteudos;
  abertas: Record<string, boolean>;
  /** Null segue o padrão: temporada quando a série usa temporadas, senão quadro. */
  agruparPor: AgruparPor | null;
};

const ESTADO_INICIAL: EstadoDaPagina = { filtros: FILTROS_PADRAO, abertas: {}, agruparPor: null };

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
    agruparPor: bruto.agruparPor === 'temporada' || bruto.agruparPor === 'quadro' || bruto.agruparPor === 'rede'
      ? bruto.agruparPor
      : null,
  };
}

/** Links antigos abriam as abas Quadros e Temporadas; hoje viram o agrupamento da lista. */
function agruparDoLink(aba: string | null): AgruparPor | null {
  if (aba === 'quadros') return 'quadro';
  if (aba === 'temporadas') return 'temporada';
  return null;
}

type Selecao = { ativa: boolean; ids: ReadonlySet<string> };
const SEM_SELECAO: Selecao = { ativa: false, ids: new Set() };

export function SeriesScriptsPage() {
  const { serieId = '', temporadaId = null } = useParams<{ serieId: string; temporadaId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, dispatch, updateContent, domainStatus, ensureDataDomains } = useAppContext();
  const { user } = useAuth();
  const celular = useIsMobile();
  const emMassa = location.pathname.endsWith('/criacao-em-massa');
  const [modalTarget, setModalTarget] = useState<SerieCreateModalTarget | null>(null);
  const [novoEm, setNovoEm] = useState<{ serieId: string; temporadaId: string | null } | null>(null);
  const [edicaoTemporada, setEdicaoTemporada] = useState<EdicaoTemporada | null>(null);
  const [excluirTemporada, setExcluirTemporada] = useState<Temporada | null>(null);
  const [selecao, setSelecao] = useState<Selecao>(SEM_SELECAO);
  const [movendo, setMovendo] = useState(false);

  const [estado, setEstado] = useSessionState<EstadoDaPagina>(`criaki:serie:${serieId}`, ESTADO_INICIAL, validarEstado);
  const { filtros } = estado;
  const filtrando = filtrosAtivos(filtros);

  const serie = state.series.find(item => item.id === serieId) ?? null;
  const temporada = temporadaId ? state.temporadas.find(item => item.id === temporadaId) ?? null : null;
  const pronto = useDomainsReady(DOMINIOS_DA_SERIE);
  const falhou = DOMINIOS_DA_SERIE.some(dominio => resolveDomainStatus(domainStatus, dominio) === 'error');
  const rolagem = useScrollMemory(`criaki:serie:${serieId}${temporadaId ? `:${temporadaId}` : ''}`, pronto && Boolean(serie));

  // Seleção é desta página: trocar de série ou de temporada começa do zero.
  useEffect(() => setSelecao(SEM_SELECAO), [serieId, temporadaId]);

  const tipos = useMemo(() => tiposDasSeries(state.series), [state.series]);
  const filhos = useMemo(() => (serie ? filhosDaSerie(serie.id, state.series) : []), [serie, state.series]);
  const tipo = serie ? tipos.get(serie.id) ?? tipoDaSerie(serie.id, state.series) : 'serie';

  const modos = useMemo<AgruparPor[]>(
    () => (serie ? modosDeAgrupar({ serieId: serie.id, series: state.series, temporadaId }) : ['quadro']),
    [serie, state.series, temporadaId],
  );
  const pedidoDoLink = agruparDoLink(searchParams.get('aba'));
  const agruparPor: AgruparPor = [pedidoDoLink, estado.agruparPor].find(
    (modo): modo is AgruparPor => Boolean(modo && modos.includes(modo)),
  ) ?? agruparPadrao(modos);

  const grupos = useMemo(
    () => (serie
      ? montarGrupos({
        serieId: serie.id,
        tipo,
        series: state.series,
        temporadas: state.temporadas,
        contents: state.contents,
        contas: state.platforms,
        destinosPadrao: state.editorial.destinosPadrao,
        filtros,
        agruparPor,
        temporadaId,
      })
      : []),
    [agruparPor, filtros, serie, state.contents, state.editorial.destinosPadrao, state.platforms, state.series, state.temporadas, temporadaId, tipo],
  );
  const visiveis = useMemo(
    () => grupos.flatMap(grupo => [...grupo.contents, ...grupo.blocos.flatMap(bloco => bloco.contents)]),
    [grupos],
  );
  // O total é sempre o do escopo inteiro; o filtro só muda quantos aparecem.
  const total = useMemo(
    () => (serie
      ? contagemDoEscopo({ serieId: serie.id, series: state.series, contents: state.contents, temporadaId })
      : contarConteudos([])),
    [serie, state.contents, state.series, temporadaId],
  );

  const escopoTemporada = useMemo(
    () => (serie ? escopoTemporadas(serie.id, state.series) : null),
    [serie, state.series],
  );
  const temporadasDaSerie = useMemo(
    () => (escopoTemporada ? temporadasDoEscopo(escopoTemporada.id, state.temporadas) : []),
    [escopoTemporada, state.temporadas],
  );
  // Temporadas moram na série: a série cria; o quadro cria na série dele.
  const serieDasTemporadas = tipo === 'serie'
    ? serie
    : tipo === 'quadro' ? escopoTemporada ?? state.series.find(item => item.id === serie?.parentId) ?? null : null;

  // "Criar temporada" na página do conteúdo chega aqui com ?nova=temporada.
  useEffect(() => {
    if (searchParams.get('nova') !== 'temporada' || !serieDasTemporadas) return;
    setEdicaoTemporada({ modo: 'criar' });
    const params = new URLSearchParams(searchParams);
    params.delete('nova');
    setSearchParams(params, { replace: true });
  }, [searchParams, serieDasTemporadas, setSearchParams]);

  // No celular as redes de cada linha só aparecem quando fogem das de costume.
  const redesForaDoPadrao = useMemo(() => {
    const usadas = redesUsadas(conteudosDaPagina(serieId, state.series, state.contents, temporadaId), state.platforms);
    const costumes = new Map<string, Set<RedeSocial>>();
    return (content: Content) => {
      if (!content.seriesId) return false;
      let costume = costumes.get(content.seriesId);
      if (!costume) {
        costume = redesDeCostume(content.seriesId, state.series, state.platforms, state.editorial.destinosPadrao, usadas);
        costumes.set(content.seriesId, costume);
      }
      const redes = redesDoConteudo(content, state.platforms);
      return redes.length > 0 && (redes.length !== costume.size || redes.some(rede => !costume.has(rede)));
    };
  }, [serieId, state.contents, state.editorial.destinosPadrao, state.platforms, state.series, temporadaId]);

  const trocarAgrupamento = (proximo: AgruparPor) => {
    setEstado(atual => ({ ...atual, agruparPor: proximo }));
    if (searchParams.has('aba')) {
      const params = new URLSearchParams(searchParams);
      params.delete('aba');
      setSearchParams(params, { replace: true });
    }
  };

  const atualizarFiltro = <K extends keyof FiltrosConteudos>(chave: K, valor: FiltrosConteudos[K]) => {
    setEstado(atual => ({ ...atual, filtros: { ...atual.filtros, [chave]: valor } }));
  };
  const estaAberta = useCallback((id: string, padrao: boolean) => estado.abertas[id] ?? padrao, [estado.abertas]);
  const alternar = useCallback((id: string, padrao: boolean) => {
    setEstado(atual => ({ ...atual, abertas: { ...atual.abertas, [id]: !(atual.abertas[id] ?? padrao) } }));
  }, [setEstado]);

  const selecaoDaLista: SelecaoDaLista = {
    ativa: selecao.ativa,
    ids: selecao.ids,
    alternar: id => setSelecao(atual => {
      const ids = new Set(atual.ids);
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      // No computador a seleção nasce da caixinha; desmarcar a última encerra.
      return { ativa: celular || ids.size > 0, ids };
    }),
    entrar: id => setSelecao(atual => ({ ativa: true, ids: id ? new Set([...atual.ids, id]) : atual.ids })),
  };
  const selecionados = useMemo(
    () => state.contents.filter(content => selecao.ids.has(content.id)),
    [selecao.ids, state.contents],
  );

  const caminhoDaPagina = `${location.pathname.replace(/\/criacao-em-massa$/, '')}${location.search}`;
  const abrirMassa = (destinoId: string, temporadaDestino: string | null) => {
    const params = new URLSearchParams();
    if (destinoId !== serieId) params.set('em', destinoId);
    if (temporadaDestino) params.set('temporada', temporadaDestino);
    const query = params.toString();
    navigate(`/series/${serieId}/criacao-em-massa${query ? `?${query}` : ''}`, { state: { voltarPara: caminhoDaPagina } });
  };
  const acoes: AcoesDosGrupos = {
    rotaDoConteudo: content => ({ to: buildContentDetailRoute(content.id), ...withDetailBack(caminhoDaPagina) }),
    onCopiarLink: content => {
      const url = `${window.location.origin}/conteudos/${content.id}`;
      void navigator.clipboard?.writeText(url).then(
        () => notifySaveFeedback({ status: 'success', message: 'Link copiado' }),
        () => notifySaveFeedback({ status: 'error', message: 'Não foi possível copiar o link.' }),
      );
    },
    onNovo: (destinoId, temporadaDestino) => setNovoEm({ serieId: destinoId, temporadaId: temporadaDestino }),
    onBulk: abrirMassa,
    onConfigurar: id => navigate(`/series/${id}/editar`),
    onEditarTemporada: item => setEdicaoTemporada({ modo: 'renomear', temporada: item }),
    onExcluirTemporada: setExcluirTemporada,
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

  const criarUm = (novo: PedidoNovoConteudo) => {
    const destino = novoEm ? state.series.find(item => item.id === novoEm.serieId) : null;
    if (!novoEm || !destino) return;
    const bloco = {
      ...criarBloco({ id: novo.id, serieId: destino.id, temporadaId: novoEm.temporadaId, modo: novo.modo }),
      titulo: novo.titulo,
      texto: novo.texto,
    };
    const base = conteudoDoBloco(bloco, destino, state.series);
    // Mesmos destinos do "Em massa": os padrão de conteúdo novo.
    const contas = state.platforms.filter(conta => conta.ativo).map(conta => ({ id: conta.id, nome: conta.nome }));
    const destinos = destinosPadraoAtivos(state.editorial.destinosPadrao, contas);
    const content: Content = {
      ...base,
      userId: user?.id || '',
      plataformas: publicacoesDosDestinos({ destinos, contentId: base.id }),
    };
    void dispatch({ type: 'ADD_CONTENT', payload: content });
    setNovoEm(null);
    const rota = buildContentDetailRoute(content.id);
    navigate(novo.modo === 'roteiro' ? `${rota}&focus=script` : rota, withDetailBack(caminhoDaPagina));
  };

  const mover = async (destino: DestinoMover) => {
    const mudam = conteudosQueMudam(selecionados, destino, state.series, state.temporadas);
    setMovendo(false);
    setSelecao(SEM_SELECAO);
    if (mudam.length === 0) {
      notifySaveFeedback({ status: 'success', message: 'Os selecionados já estavam aí' });
      return;
    }
    notifySaveFeedback({ status: 'saving', message: 'Movendo…' });
    try {
      const agora = new Date().toISOString();
      for (const content of mudam) {
        await updateContent(moverConteudo(content, destino, state.series, state.temporadas, agora), { silent: true });
      }
      notifySaveFeedback({ status: 'success', message: plural(mudam.length, 'conteúdo movido', 'conteúdos movidos') });
    } catch {
      notifySaveFeedback({ status: 'error', message: 'Não foi possível mover todos. Confira a lista e tente de novo.' });
    }
  };

  if (!serie) {
    const status = resolveQueryViewStatus({
      loading: !pronto,
      fetchAttempted: pronto,
      error: falhou ? 'falha' : null,
      itemCount: 0,
    });
    return (
      <PageLayout>
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

  const pilar = tipo === 'familia' ? null : pilarEfetivoDaSerie(serie.id, state.series);
  const pilarNome = pilar?.pilarId ? state.pilares.find(item => item.id === pilar.pilarId)?.nome ?? null : null;
  const objetivo = tipo !== 'familia' && isFuncaoEditorial(serie.funcaoPadrao) ? FUNCAO_LABELS[serie.funcaoPadrao] : null;
  const resumo = [
    filhos.length > 0 ? plural(filhos.length, tipo === 'familia' ? 'série' : 'quadro', tipo === 'familia' ? 'séries' : 'quadros') : null,
    !temporada && temporadasDaSerie.length > 0 ? plural(temporadasDaSerie.length, 'temporada', 'temporadas') : null,
    pilarNome,
    objetivo,
  ].filter(Boolean).join(' · ');
  const abertos = tipo === 'familia' ? [] : getSerieOpenItems(serie, { series: state.series, contents: state.contents });
  const opcoesEtapa = [
    { value: 'todas', label: 'Todas as etapas' },
    ...ETAPAS_DE_CONTEUDO
      .filter(etapa => (filtros.tipo === 'roteiros' ? etapa !== 'ideia' : filtros.tipo === 'ideias' ? etapa === 'ideia' : true))
      .map(etapa => ({ value: etapa, label: ETAPA_LABEL[etapa] })),
  ];
  const ordemAtual = ORDENS.find(item => item.value === filtros.ordem) ?? ORDENS[0];
  const proximaOrdem = ORDENS[(ORDENS.indexOf(ordemAtual) + 1) % ORDENS.length];
  const rotaCriarFilho = rotaParaCriarFilho(serie.id, tipo);
  const criarFilho = () => {
    if (tipo === 'serie') {
      setModalTarget({ tipo: 'quadro', seriePaiId: serie.id });
      return;
    }
    if (rotaCriarFilho) navigate(rotaCriarFilho);
  };
  const ondeVaiFicar = novoEm
    ? [
      state.series.find(item => item.id === novoEm.serieId)?.name?.trim() || 'Sem nome',
      novoEm.temporadaId ? state.temporadas.find(item => item.id === novoEm.temporadaId)?.nome : null,
    ].filter(Boolean).join(' · ')
    : '';

  const ancestrais = ancestraisDaSerie(serie.id, state.series).reverse().map(no => ({ id: no.id, name: no.name ?? '' }));
  const toolbar = (
    <PageToolbar
      leading={(
        <span className="flex min-w-0 items-center gap-2">
          <Text variant="meta" as="span" className="shrink-0">Agrupar por</Text>
          <SegmentTabs<AgruparPor>
            ariaLabel="Agrupar por"
            value={agruparPor}
            onChange={trocarAgrupamento}
            options={modos.map(modo => ({ id: modo, label: rotuloDoModo(modo, tipo, filhos.length > 0) }))}
          />
        </span>
      )}
      search={(
        <ToolbarSearchInput
          value={filtros.busca}
          onChange={valor => atualizarFiltro('busca', valor)}
          placeholder="Buscar conteúdos"
          className={cn('min-w-0', celular ? 'w-full' : 'min-w-[14rem] flex-1')}
        />
      )}
      chips={(
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
      )}
      filters={
        filtros.tipo !== 'ideias' ? (
          <SelectField
            ariaLabel="Etapa"
            value={filtros.etapa}
            onChange={valor => atualizarFiltro('etapa', valor as FiltroEtapa)}
            options={opcoesEtapa}
          />
        ) : undefined
      }
      sort={(
        <AppButton
          variant="secondary"
          iconOnly
          aria-label={`Ordem: ${ordemAtual.label}. Trocar para ${proximaOrdem.label}`}
          title={ordemAtual.label}
          onClick={() => atualizarFiltro('ordem', proximaOrdem.value)}
        >
          <ArrowDownUp className="h-4 w-4" />
        </AppButton>
      )}
    />
  );
  const rodape = (
    <>
      {serieDasTemporadas && !temporada ? (
        <AppButton variant="ghost" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEdicaoTemporada({ modo: 'criar' })}>
          Nova temporada
        </AppButton>
      ) : null}
      {rotaCriarFilho ? (
        <AppButton variant="ghost" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={criarFilho}>
          {tipo === 'familia' ? 'Nova série' : 'Novo quadro'}
        </AppButton>
      ) : null}
    </>
  );
  const cabecalho = (noCelular: boolean) => (
    <SeriesDetailHeader
      serie={serie}
      tipo={tipo}
      ancestrais={ancestrais}
      temporada={temporada}
      resumo={resumo}
      celular={noCelular}
      onConfigure={() => navigate(`/series/${serie.id}/editar`)}
      onCreate={() => setNovoEm({ serieId: serie.id, temporadaId: temporadaId ?? null })}
      onBulk={() => abrirMassa(serie.id, temporadaId)}
    />
  );

  return (
    <PageLayout
      contentWidth="wide"
      contentStack="dense"
      header={cabecalho(false)}
      toolbar={toolbar}
      mobileHeader={cabecalho(true)}
      mobileToolbar={toolbar}
    >
      <div ref={rolagem} className="stack-lg">
        {state.editorial.openInfoNotices && abertos.length > 0 ? (
          <OpenInfoNotice
            items={abertos}
            title={`Esta série tem informações em aberto: ${formatOpenItems(abertos)}`}
            description={null}
            actionLabel="Configurar"
            onAction={() => navigate(`/series/${serie.id}/editar`)}
          />
        ) : null}

        <div className="stack-md">
          <Text variant="meta" as="p">
            {[
              textoConteudos(total.conteudos),
              plural(total.roteiros, 'roteiro', 'roteiros'),
              plural(total.ideias, 'ideia', 'ideias'),
              filtrando ? `${visiveis.length} ${visiveis.length === 1 ? 'aparece' : 'aparecem'} com os filtros` : null,
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
          ) : grupos.length === 0 && filtrando ? (
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
          ) : grupos.length === 0 ? (
            <EmptyState
              compact
              title={temporada ? 'Nenhum conteúdo nesta temporada' : 'Nenhum conteúdo ainda'}
              description="Crie um conteúdo ou prepare vários de uma vez."
              action={(
                <AppButton variant="secondary" onClick={() => setNovoEm({ serieId: serie.id, temporadaId: temporadaId ?? null })}>
                  Novo conteúdo
                </AppButton>
              )}
            />
          ) : (
            <SeriesGruposLista
              grupos={grupos}
              agruparPor={agruparPor}
              serieDaPagina={serie.id}
              series={state.series}
              tipos={tipos}
              temporadas={state.temporadas}
              contas={state.platforms}
              celular={celular}
              filtrando={filtrando}
              estaAberta={estaAberta}
              alternar={alternar}
              acoes={acoes}
              selecao={selecaoDaLista}
              redesForaDoPadrao={redesForaDoPadrao}
              rodape={rotaCriarFilho || (serieDasTemporadas && !temporada) ? rodape : undefined}
            />
          )}
        </div>

        {selecao.ativa ? (
          <SeriesSelectionBar
            quantidade={selecao.ids.size}
            disponiveis={visiveis.length}
            onToggleTodos={() => setSelecao(atual => (
              visiveis.every(content => atual.ids.has(content.id))
                ? { ativa: celular, ids: new Set() }
                : { ativa: true, ids: new Set(visiveis.map(content => content.id)) }
            ))}
            onMover={() => setMovendo(true)}
            onCancelar={() => setSelecao(SEM_SELECAO)}
          />
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

      <NovoConteudoDialog
        open={Boolean(novoEm)}
        ondeVaiFicar={ondeVaiFicar}
        onClose={() => setNovoEm(null)}
        onCreate={criarUm}
      />

      <MoverConteudosSheet
        open={movendo}
        quantidade={selecao.ids.size}
        serie={serie}
        tipo={tipo}
        series={state.series}
        temporadas={state.temporadas}
        onClose={() => setMovendo(false)}
        onMover={destino => void mover(destino)}
      />

      {serieDasTemporadas ? (
        <TemporadaDialogs
          escopoId={serieDasTemporadas.id}
          escopoNome={serieDasTemporadas.name ?? ''}
          temporadas={temporadasDoEscopo(serieDasTemporadas.id, state.temporadas)}
          edicao={edicaoTemporada}
          excluir={excluirTemporada}
          contagem={id => contagemDoEscopo({ serieId: serieDasTemporadas.id, series: state.series, contents: state.contents, temporadaId: id }).conteudos}
          onFecharEdicao={() => setEdicaoTemporada(null)}
          onFecharExcluir={() => setExcluirTemporada(null)}
          onCriar={(nome, descricao) => {
            const alvo = state.series.find(item => item.id === serieDasTemporadas.id);
            if (!alvo) return;
            const agora = new Date().toISOString();
            void dispatch({
              type: 'ADD_TEMPORADA',
              payload: { id: generateUUID(), userId: user?.id || '', serieId: alvo.id, nome, descricao, createdAt: agora },
            });
            // A primeira temporada liga o uso de temporadas na série.
            if (!alvo.usaTemporadas) {
              void dispatch({ type: 'UPDATE_SERIE', payload: { ...alvo, usaTemporadas: true, updatedAt: agora } });
            }
          }}
          onRenomear={(item, nome, descricao) => void dispatch({ type: 'UPDATE_TEMPORADA', payload: { ...item, nome, descricao } })}
          onExcluir={item => void dispatch({ type: 'DELETE_TEMPORADA', payload: item.id })}
        />
      ) : null}

      <SerieCreateModal
        target={modalTarget}
        onClose={() => setModalTarget(null)}
      />
    </PageLayout>
  );
}
