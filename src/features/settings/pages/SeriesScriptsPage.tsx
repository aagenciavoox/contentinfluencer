import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Layers, Plus } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Text } from '../../../components/ui/Text';
import { QueryViewState } from '../../../components/ui/QueryViewState';
import { resolveQueryViewStatus } from '../../../components/ui/queryViewStatus';
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
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import { OpenInfoNotice } from '../../editorial/components/OpenInfoNotice';
import { comModoDaEscolha } from '../../contents/lib/creationContent';
import { FUNCAO_LABELS, isFuncaoEditorial } from '../../editorial/lib/funcoes';
import { formatOpenItems, getSerieOpenItems } from '../../editorial/lib/serieCompleteness';
import { ancestraisDaSerie, filhosDaSerie } from '../../editorial/lib/serieArvore';
import { focoEfetivo } from '../../editorial/lib/focoTemporada';
import { escopoTemporadas, temporadasDoEscopo } from '../../editorial/lib/temporadas';
import { SerieCreateModal, type SerieCreateModalTarget } from '../components/SerieCreateModal';
import { NovoConteudoDialog, type PedidoNovoConteudo } from '../components/series-detail/NovoConteudoDialog';
import { SeriesBulkDrawer, type PedidoMassa } from '../components/series-detail/SeriesBulkDrawer';
import { SeriesDetailHeader } from '../components/series-detail/SeriesDetailHeader';
import { SeriesGruposLista, type AcoesDosGrupos, type SelecaoDaLista } from '../components/series-detail/SeriesGruposLista';
import { BarraDeAcoes, CaixaMarcacao, DefinirQuadroSheet, DefinirTemporadaSheet } from '../components/series-detail/SeriesAcoesEmMassa';
import { ExcluirEstruturaDialog, type AlvoExclusao } from '../components/series-detail/ExcluirEstruturaDialog';
import { TemporadaDialogs, type EdicaoTemporada } from '../components/series-detail/TemporadaDialogs';
import { rotaParaCriarFilho } from '../lib/serieHierarquia';
import { metaDoCabecalho, totaisDoCabecalho } from '../lib/serieCabecalho';
import { hojeIso, periodoInicial, useItensDaJanela } from '../../editorial/components/plano/PeriodoEditorialControl';
import { lerPeriodoSalvo } from '../../editorial/lib/periodoEditorial';
import { verificarMoverEpisodios } from '../../../lib/database';
import {
  alternarVarios,
  chaveDaSelecao,
  depoisDoEnvio,
  destinosDeQuadro,
  estadoDaMarcacao,
  ordemAposSetaNaSecao,
  ordemFinalNoFim,
  planoDefinirQuadro,
  planoDefinirTemporada,
  temporadasComuns,
  textoQuantidade,
} from '../lib/selecaoEpisodios';
import { SeriesListaToolbar } from '../components/series-detail/SeriesListaToolbar';
import {
  ETAPAS_DO_FILTRO,
  FILTROS_LISTA_PADRAO,
  colunaDeOrdemDisponivel,
  episodiosDaPagina,
  filtrosListaAtivos,
  exibidosDoGrupo,
  filtrosValidos,
  montarLista,
  opcoesDeAgrupar,
  opcoesDeOrdem,
  ordenarLista,
  resolverAgrupar,
  resolverOrdem,
  rotuloDaConta,
  setasDisponiveis,
  temporadasDaSerie as temporadasValidasDaSerie,
  type AgruparLista,
  type ContextoLista,
  type FiltrosLista,
} from '../lib/seriesLista';
import { gravarPreferenciaLista, lerPreferenciaLista, type PreferenciaLista } from '../lib/preferenciaLista';
import { generateUUID } from '../../../utils/uuid';
import {
  pilarEfetivoDaSerie,
  plural,
  tipoDaSerie,
  tiposDasSeries,
} from '../lib/serieAgrupamento';
import { conteudoDoBloco, criarBloco } from '../lib/seriesBulkDraft';
import {
  conteudosDaPagina,
  redeDoBloco,
  redesDeCostume,
  redesDoConteudo,
  redesUsadas,
} from '../lib/seriesGrupos';
import { contagemDoEscopo } from '../lib/seriesSecoes';
import { useAuth } from '../../../context/AuthContext';

const DOMINIOS_DA_SERIE: readonly AppDataDomain[] = ['production', 'content'];

type EstadoDaPagina = {
  filtros: FiltrosLista;
  abertas: Record<string, boolean>;
};

const ESTADO_INICIAL: EstadoDaPagina = { filtros: FILTROS_LISTA_PADRAO, abertas: {} };

function texto(valor: unknown, padrao: string): string {
  return typeof valor === 'string' && valor ? valor : padrao;
}

function validarEstado(valor: unknown): EstadoDaPagina | null {
  if (!valor || typeof valor !== 'object') return null;
  const bruto = valor as Partial<EstadoDaPagina>;
  const filtros = (bruto.filtros ?? {}) as Partial<FiltrosLista>;
  const etapas: readonly string[] = ETAPAS_DO_FILTRO.map(item => item.value);
  return {
    filtros: {
      busca: typeof filtros.busca === 'string' ? filtros.busca : '',
      etapa: typeof filtros.etapa === 'string' && etapas.includes(filtros.etapa) ? filtros.etapa : 'todas',
      quadro: texto(filtros.quadro, 'todos'),
      conta: texto(filtros.conta, 'todas'),
      temporada: texto(filtros.temporada, 'todas'),
    },
    abertas: bruto.abertas && typeof bruto.abertas === 'object' ? bruto.abertas as Record<string, boolean> : {},
  };
}

/** Links antigos abriam as abas Quadros e Temporadas; hoje viram o agrupamento da lista. */
function agruparDoLink(aba: string | null): AgruparLista | null {
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
  const { state, dispatch, domainStatus, ensureDataDomains } = useAppContext();
  const { user } = useAuth();
  const celular = useIsMobile();
  const emMassa = location.pathname.endsWith('/criacao-em-massa');
  const [modalTarget, setModalTarget] = useState<SerieCreateModalTarget | null>(null);
  const [novoEm, setNovoEm] = useState<{ serieId: string; temporadaId: string | null } | null>(null);
  const [edicaoTemporada, setEdicaoTemporada] = useState<EdicaoTemporada | null>(null);
  const [excluirAlvo, setExcluirAlvo] = useState<AlvoExclusao | null>(null);
  const [selecao, setSelecao] = useState<Selecao>(SEM_SELECAO);
  const [formulario, setFormulario] = useState<'quadro' | 'temporada' | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroDoFormulario, setErroDoFormulario] = useState<string | null>(null);
  // Setas e ações em massa só existem quando o banco tem a operação mover_episodios (migration aplicada).
  const [rpcDisponivel, setRpcDisponivel] = useState<boolean | null>(null);
  useEffect(() => {
    let vivo = true;
    void verificarMoverEpisodios().then(ok => { if (vivo) setRpcDisponivel(ok); });
    return () => { vivo = false; };
  }, []);

  const [estado, setEstado] = useSessionState<EstadoDaPagina>(`criaki:serie:${serieId}`, ESTADO_INICIAL, validarEstado);

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

  // Lista: busca, filtros, agrupamento e ordem. Só apresentação: nada aqui grava episódio.
  const episodios = useMemo(
    () => (serie ? episodiosDaPagina(serie.id, state.series, state.contents, temporadaId) : []),
    [serie, state.contents, state.series, temporadaId],
  );
  // Filtro e agrupamento de temporada só quando a série usa temporadas (e fora da página de uma temporada).
  const temporadasValidas = useMemo(
    () => (serie && !temporadaId ? temporadasValidasDaSerie(serie.id, state.series, state.temporadas) : null),
    [serie, state.series, state.temporadas, temporadaId],
  );
  // Sem a migration de ordem_episodio o banco não devolve o campo: a ordem manual fica indisponível.
  const ordemDisponivel = useMemo(() => colunaDeOrdemDisponivel(state.contents), [state.contents]);
  const [preferencia, setPreferencia] = useState<PreferenciaLista>(() => lerPreferenciaLista(serieId));
  useEffect(() => setPreferencia(lerPreferenciaLista(serieId)), [serieId]);
  const mudarPreferencia = (patch: PreferenciaLista) => setPreferencia(atual => {
    const proxima = { ...atual, ...patch };
    gravarPreferenciaLista(serieId, proxima);
    return proxima;
  });
  const opcoesDaLista = { temQuadros: filhos.length > 0, temTemporadas: Boolean(temporadasValidas) };
  const opcoesAgrupar = opcoesDeAgrupar(opcoesDaLista);
  const pedidoDoLink = agruparDoLink(searchParams.get('aba'));
  const agrupar = resolverAgrupar(pedidoDoLink && opcoesAgrupar.includes(pedidoDoLink) ? pedidoDoLink : preferencia.agrupar, opcoesDaLista);
  const ordem = resolverOrdem(preferencia.ordem, ordemDisponivel);
  const contasDaLista = useMemo(
    () => state.platforms.map(conta => ({ id: conta.id, label: rotuloDaConta(conta) })),
    [state.platforms],
  );
  const filtros = useMemo(
    () => filtrosValidos(estado.filtros, {
      quadros: filhos.map(filho => filho.id),
      contas: state.platforms.map(conta => conta.id),
      temporadas: temporadasValidas ? temporadasValidas.map(item => item.id) : null,
    }),
    [estado.filtros, filhos, state.platforms, temporadasValidas],
  );
  const filtrando = filtrosListaAtivos(filtros);
  // Redes de costume de cada agrupamento (contas dele ou de cima; senão destinos padrão; senão as usadas).
  const costumeDe = useMemo(() => {
    const usadas = redesUsadas(conteudosDaPagina(serieId, state.series, state.contents, temporadaId), state.platforms);
    const costumes = new Map<string, Set<RedeSocial>>();
    return (id: string) => {
      let costume = costumes.get(id);
      if (!costume) {
        costume = redesDeCostume(id, state.series, state.platforms, state.editorial.destinosPadrao, usadas);
        costumes.set(id, costume);
      }
      return costume;
    };
  }, [serieId, state.contents, state.editorial.destinosPadrao, state.platforms, state.series, temporadaId]);
  // Mesma regra do bloco "Só ..." de antes, restrita ao YouTube.
  const soYoutube = useCallback(
    (content: Content) => Boolean(content.seriesId)
      && redeDoBloco(redesDoConteudo(content, state.platforms), costumeDe(content.seriesId as string)) === 'youtube',
    [costumeDe, state.platforms],
  );
  // Mudar busca ou filtros limpa a seleção; recolher grupos ou trocar o agrupamento não.
  const chaveFiltros = chaveDaSelecao(filtros);
  useEffect(() => setSelecao(atual => (atual.ids.size > 0 ? { ...atual, ids: new Set() } : atual)), [chaveFiltros]);
  const ctxLista = useMemo<ContextoLista>(
    () => ({ serieId, series: state.series, contas: state.platforms, temporadasValidas: temporadasValidas ?? [] }),
    [serieId, state.platforms, state.series, temporadasValidas],
  );
  const grupos = useMemo(
    () => montarLista({ episodios, filtros, agrupar, ordem, ctx: ctxLista, temporadas: temporadasValidas ?? [], soYoutube }),
    [agrupar, ctxLista, episodios, filtros, ordem, temporadasValidas, soYoutube],
  );
  const visiveis = useMemo(() => grupos.flatMap(exibidosDoGrupo), [grupos]);
  // Uma ordem manual só, da série: na página de um quadro vale a da série acima dele.
  const raizDaOrdem = useMemo(() => {
    if (!serie) return null;
    if (tipo !== 'quadro') return serie.id;
    return ancestraisDaSerie(serie.id, state.series).find(no => tipos.get(no.id) !== 'quadro')?.id ?? serie.id;
  }, [serie, state.series, tipo, tipos]);
  const setas = rpcDisponivel === true && setasDisponiveis({ ordem, filtros, ordemDisponivel }) && raizDaOrdem === serieId && !temporadaId;
  const avisoOrdem = !ordemDisponivel
    ? 'Ordem manual indisponível: o banco ainda não tem a coluna de ordem.'
    : ordem === 'manual' && rpcDisponivel === false
      ? 'Mudar a ordem fica disponível depois de atualizar o banco (operação mover_episodios).'
    : ordem === 'manual' && !setas
      ? (raizDaOrdem !== serieId || temporadaId
        ? 'Para mudar a ordem, abra a página da série.'
        : 'Para mudar a ordem, limpe a busca e os filtros.')
      : null;

  // Cabeçalho: etapa atual de cada episódio da série e dos quadros, uma vez cada.
  const totais = useMemo(
    () => totaisDoCabecalho({ serieId, series: state.series, contents: state.contents }),
    [serieId, state.contents, state.series],
  );
  // Meta: o mesmo período salvo e a mesma conta do painel editorial (episódios previstos, não publicados).
  const periodoDaMeta = useMemo(
    () => (state.editorialVisao ? lerPeriodoSalvo(state.editorialVisao) : null) ?? periodoInicial(),
    [state.editorialVisao],
  );
  // Janelas inteiras nas pontas, como no Editorial e na Saúde.
  const itensDaJanela = useItensDaJanela(periodoDaMeta.inicio, periodoDaMeta.fim);
  const meta = useMemo(() => {
    if (!serie) return null;
    return metaDoCabecalho({ serie, series: state.series, itens: itensDaJanela, periodo: periodoDaMeta, hoje: hojeIso() });
  }, [itensDaJanela, periodoDaMeta, serie, state.series]);

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

  const trocarAgrupamento = (proximo: AgruparLista) => {
    mudarPreferencia({ agrupar: proximo });
    if (searchParams.has('aba')) {
      const params = new URLSearchParams(searchParams);
      params.delete('aba');
      setSearchParams(params, { replace: true });
    }
  };
  const limparFiltros = () => setEstado(atual => ({ ...atual, filtros: FILTROS_LISTA_PADRAO }));
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
    alternarVarios: ids => setSelecao(atual => {
      const proximos = alternarVarios(atual.ids, ids);
      return { ativa: celular || proximos.size > 0, ids: proximos };
    }),
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
    onExcluirTemporada: temporada => setExcluirAlvo({ tipo: 'temporada', temporada }),
    // Ordem manual, sem busca nem filtro: a seta troca com o vizinho da mesma seção.
    onMoverEpisodio: setas ? (lista, content, direcao) => void reordenar(lista, content, direcao) : undefined,
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
    const content = comModoDaEscolha({
      ...base,
      userId: user?.id || '',
      plataformas: novo.plataformas.map(plataforma => ({ ...plataforma, contentId: base.id })),
    });
    void dispatch({ type: 'ADD_CONTENT', payload: content });
    setNovoEm(null);
    // "Criar": fica na série; lista e contagens vêm do estado.
    if (!novo.abrir) return;
    const rota = buildContentDetailRoute(content.id);
    navigate(novo.modo === 'roteiro' ? `${rota}&focus=script` : rota, withDetailBack(caminhoDaPagina));
  };

  // Uma operação só no banco (mover_episodios): grava apenas ordem_episodio, sem updated_at. Se falhar, a lista volta.
  const reordenar = async (lista: readonly Content[], content: Content, direcao: 'subir' | 'descer') => {
    // A seta troca com o vizinho da mesma seção; a ordem completa da série é gravada de uma vez.
    const global = ordenarLista(episodios, 'manual').map(item => item.id);
    const ordemNova = ordemAposSetaNaSecao(global, lista, content.id, direcao);
    if (!ordemNova) return;
    try {
      await dispatch({ type: 'MOVER_EPISODIOS', payload: { conteudos: [], ordem: ordemNova } }, { silent: true });
    } catch {
      notifySaveFeedback({ status: 'error', message: 'Não foi possível salvar a nova ordem. A lista voltou como estava.' });
    }
  };

  // Ações em massa: um envio só, atômico. Erro mantém formulário e seleção.
  const destinosQuadro = useMemo(
    () => (raizDaOrdem ? destinosDeQuadro(raizDaOrdem, state.series) : []),
    [raizDaOrdem, state.series],
  );
  const planoQuadro = useCallback(
    (destinoId: string) => planoDefinirQuadro(selecionados, destinoId, state.series, state.temporadas, new Date().toISOString()),
    [selecionados, state.series, state.temporadas],
  );
  const comuns = useMemo(() => temporadasComuns(selecionados, state.series, state.temporadas), [selecionados, state.series, state.temporadas]);
  const planoTemporada = useCallback(
    (destino: string | null) => planoDefinirTemporada(selecionados, destino, new Date().toISOString()),
    [selecionados],
  );
  const abrirFormulario = (qual: 'quadro' | 'temporada') => {
    setErroDoFormulario(null);
    setFormulario(qual);
  };
  const enviar = async (mudam: Content[], ordemNova: string[] | null, jaLa: number) => {
    if (salvando) return;
    if (mudam.length === 0) {
      setFormulario(null);
      notifySaveFeedback({ status: 'success', message: 'Os selecionados já estavam aí' });
      return;
    }
    setSalvando(true);
    setErroDoFormulario(null);
    try {
      await dispatch({ type: 'MOVER_EPISODIOS', payload: { conteudos: mudam, ordem: ordemNova } }, { silent: true });
      const depois = depoisDoEnvio(true, selecao.ids);
      setSelecao(atual => ({ ...atual, ids: new Set(depois.selecionados) }));
      setFormulario(null);
      const resto = jaLa > 0 ? ` (${textoQuantidade(jaLa, 'já estava', 'já estavam')} aí)` : '';
      notifySaveFeedback({ status: 'success', message: `${textoQuantidade(mudam.length, 'episódio alterado', 'episódios alterados')}${resto}` });
    } catch {
      setErroDoFormulario('Não foi possível salvar. Nada foi alterado; tente de novo.');
    } finally {
      setSalvando(false);
    }
  };
  const confirmarQuadro = (destinoId: string) => {
    const plano = planoQuadro(destinoId);
    const movidos = new Set(plano.mudam.map(content => content.id));
    // Quem muda vai para o fim da ordem da série, na ordem em que já estava.
    const ordemNova = ordemDisponivel && raizDaOrdem && movidos.size > 0
      ? ordemFinalNoFim(episodiosDaPagina(raizDaOrdem, state.series, state.contents), movidos)
      : null;
    void enviar(plano.mudam, ordemNova, plano.jaNoDestino.length);
  };
  const confirmarTemporada = (destino: string | null) => {
    const plano = planoTemporada(destino);
    void enviar(plano.mudam, null, plano.jaNoDestino.length);
  };
  const exibidosIds = visiveis.map(content => content.id);
  const marcacaoGeral = estadoDaMarcacao(exibidosIds, selecao.ids);

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
    <SeriesListaToolbar
      filtros={filtros}
      onFiltros={patch => setEstado(atual => ({ ...atual, filtros: { ...atual.filtros, ...patch } }))}
      onLimpar={limparFiltros}
      agrupar={agrupar}
      opcoesAgrupar={opcoesAgrupar}
      onAgrupar={trocarAgrupamento}
      ordem={ordem}
      opcoesOrdem={opcoesDeOrdem(ordemDisponivel)}
      onOrdem={valor => mudarPreferencia({ ordem: valor })}
      quadros={filhos.map(filho => ({ id: filho.id, label: filho.name?.trim() || 'Sem nome' }))}
      contas={contasDaLista}
      temporadas={temporadasValidas ? temporadasValidas.map(item => ({ id: item.id, label: item.nome })) : null}
      visiveis={visiveis.length}
      total={episodios.length}
      celular={celular}
      avisoOrdem={avisoOrdem}
      acoes={undefined}
    />
  );
  const rodape = tipo === 'familia' && rotaCriarFilho ? (
    <AppButton variant="ghost" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={criarFilho}>
      Nova série
    </AppButton>
  ) : null;
  const adicionar = tipo !== 'familia' && !temporada ? {
    onEpisodio: () => setNovoEm({ serieId: serie.id, temporadaId: temporadaId ?? null }),
    ...(serieDasTemporadas ? { onTemporada: () => setEdicaoTemporada({ modo: 'criar' }) } : {}),
    ...(tipo === 'serie' ? { onQuadro: () => setModalTarget({ tipo: 'quadro', seriePaiId: serie.id }) } : {}),
  } : null;
  const cabecalho = (noCelular: boolean) => (
    <SeriesDetailHeader
      serie={serie}
      tipo={tipo}
      ancestrais={ancestrais}
      temporada={temporada}
      totais={totais}
      meta={meta ?? { estado: 'sem-meta', texto: 'Sem meta definida' }}
      celular={noCelular}
      onConfigure={() => navigate(`/series/${serie.id}/editar`)}
      onCreate={() => setNovoEm({ serieId: serie.id, temporadaId: temporadaId ?? null })}
      onBulk={() => abrirMassa(serie.id, temporadaId)}
      adicionar={adicionar}
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
              title={filtros.busca.trim() ? `Nada encontrado para “${filtros.busca.trim()}”` : 'Nenhum episódio com estes filtros'}
              description="Ajuste a busca ou os filtros para ver outros episódios."
              action={(
                <AppButton variant="secondary" onClick={limparFiltros}>
                  Limpar filtros
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
            <>
            {!celular || selecao.ativa ? (
              <div className="flex items-center gap-1 px-2">
                <CaixaMarcacao
                  estado={marcacaoGeral}
                  rotulo={`Selecionar os ${visiveis.length} exibidos`}
                  onToggle={() => selecaoDaLista.alternarVarios(exibidosIds)}
                />
                <Text variant="meta" as="span">
                  {marcacaoGeral === 'todos'
                    ? `Todos os ${textoQuantidade(visiveis.length, 'episódio exibido', 'episódios exibidos')} selecionados`
                    : `Selecionar os ${textoQuantidade(visiveis.length, 'episódio exibido', 'episódios exibidos')}`}
                </Text>
              </div>
            ) : null}
            <SeriesGruposLista
              grupos={grupos}
              agruparPor={agrupar}
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
              numerar={ordem === 'manual' && !filtrando}
              rodape={rotaCriarFilho || (serieDasTemporadas && !temporada) ? rodape : undefined}
            />
            </>
          )}
        </div>

        {selecao.ativa || selecao.ids.size > 0 ? (
          <BarraDeAcoes
            quantidade={selecao.ids.size}
            celular={celular}
            temporadasHabilitadas={Boolean(temporadasValidas)}
            disponivel={rpcDisponivel === true}
            onDefinirQuadro={() => abrirFormulario('quadro')}
            onDefinirTemporada={() => abrirFormulario('temporada')}
            onLimpar={() => setSelecao(SEM_SELECAO)}
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
        contas={state.platforms}
        destinosPadrao={state.editorial.destinosPadrao}
        focoRedes={novoEm ? focoEfetivo(
          novoEm.temporadaId ? state.temporadas.find(item => item.id === novoEm.temporadaId)?.focoRedes : [],
          state.series.find(item => item.id === novoEm.serieId)?.focoRedes,
        ) : null}
        onClose={() => setNovoEm(null)}
        onCreate={criarUm}
      />

      <DefinirQuadroSheet
        open={formulario === 'quadro'}
        quantidade={selecao.ids.size}
        destinos={destinosQuadro}
        plano={planoQuadro}
        salvando={salvando}
        erro={erroDoFormulario}
        onClose={() => { if (!salvando) setFormulario(null); }}
        onConfirmar={confirmarQuadro}
      />

      <DefinirTemporadaSheet
        open={formulario === 'temporada'}
        quantidade={selecao.ids.size}
        comuns={comuns}
        plano={planoTemporada}
        salvando={salvando}
        erro={erroDoFormulario}
        onClose={() => { if (!salvando) setFormulario(null); }}
        onConfirmar={confirmarTemporada}
      />

      {serieDasTemporadas ? (
        <TemporadaDialogs
          escopoId={serieDasTemporadas.id}
          escopoNome={serieDasTemporadas.name ?? ''}
          temporadas={temporadasDoEscopo(serieDasTemporadas.id, state.temporadas)}
          plataformas={state.platforms}
          edicao={edicaoTemporada}
          excluir={null}
          contagem={id => contagemDoEscopo({ serieId: serieDasTemporadas.id, series: state.series, contents: state.contents, temporadaId: id }).conteudos}
          onFecharEdicao={() => setEdicaoTemporada(null)}
          onFecharExcluir={() => undefined}
          onCriar={(nome, descricao, focoRedes) => {
            const alvo = state.series.find(item => item.id === serieDasTemporadas.id);
            if (!alvo) return;
            const agora = new Date().toISOString();
            void dispatch({
              type: 'ADD_TEMPORADA',
              payload: { id: generateUUID(), userId: user?.id || '', serieId: alvo.id, nome, descricao, focoRedes, createdAt: agora },
            });
            // A primeira temporada liga o uso de temporadas na série.
            if (!alvo.usaTemporadas) {
              void dispatch({ type: 'UPDATE_SERIE', payload: { ...alvo, usaTemporadas: true, updatedAt: agora } });
            }
          }}
          onRenomear={(item, nome, descricao, focoRedes) => void dispatch({ type: 'UPDATE_TEMPORADA', payload: { ...item, nome, descricao, focoRedes } })}
          onExcluir={() => undefined}
        />
      ) : null}

      {/* Excluir temporada: episódios vão antes para outra temporada ou ficam sem; nenhum roteiro é apagado. */}
      <ExcluirEstruturaDialog alvo={excluirAlvo} onClose={() => setExcluirAlvo(null)} />

      <SerieCreateModal
        target={modalTarget}
        onClose={() => setModalTarget(null)}
      />
    </PageLayout>
  );
}
