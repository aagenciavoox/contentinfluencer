import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { resolveQueryViewStatus, type QueryViewStatus } from '../../../components/ui/queryViewStatus';
import { useAppContext } from '../../../context/AppContext';
import { resolveDomainStatus } from '../../../context/domainLoading';
import { useDomainsReady } from '../../../hooks/useDomainsReady';
import { useSessionState } from '../../../hooks/useSessionState';
import type { AppDataDomain } from '../../../lib/database';
import { atualizarPreferencias } from '../../editorial/lib/editorialSettings';
import { getSerieOpenItems } from '../../editorial/lib/serieCompleteness';
import type { SerieCreateModalTarget } from '../components/SerieCreateModal';
import { TIPO_AGRUPAMENTO_PLURAL, tipoDaSerie } from '../lib/serieAgrupamento';
import { rotaParaCriarFilho } from '../lib/serieHierarquia';
import { useStatusDaSerie } from './useStatusDaSerie';
import {
  FILTROS_LISTA_PADRAO,
  filtrosDaListaAtivos,
  montarListaSeries,
  type FiltroSituacao,
  type FiltrosLista,
  type ItemLista,
} from '../lib/seriesListaView';

const DOMINIOS_DA_LISTA: readonly AppDataDomain[] = ['production', 'content'];

function validarFiltros(valor: unknown): FiltrosLista | null {
  if (!valor || typeof valor !== 'object') return null;
  const bruto = valor as Partial<FiltrosLista>;
  return {
    busca: typeof bruto.busca === 'string' ? bruto.busca : '',
    tipo: bruto.tipo === 'familia' || bruto.tipo === 'serie' || bruto.tipo === 'quadro' ? bruto.tipo : 'todos',
    pilar: typeof bruto.pilar === 'string' && bruto.pilar ? bruto.pilar : 'todos',
    situacao: bruto.situacao === 'inativas' || bruto.situacao === 'rascunho' || bruto.situacao === 'todas' || bruto.situacao === 'abertas'
      ? bruto.situacao
      : 'ativas',
    vista: bruto.vista === 'lista' ? 'lista' : 'cards',
  };
}

/** Regras da lista de séries, compartilhadas pela tela do computador e a do celular. */
export function useSeriesLista(onAbrirModalCriacao?: (target: SerieCreateModalTarget) => void) {
  const { state, dispatch, domainStatus, ensureDataDomains } = useAppContext();
  const navigate = useNavigate();
  const [filtrosSalvos, setFiltros] = useSessionState<FiltrosLista>('criaki:series:lista', FILTROS_LISTA_PADRAO, validarFiltros);
  const avisos = state.editorial.openInfoNotices;

  const filtros: FiltrosLista = !avisos && filtrosSalvos.situacao === 'abertas'
    ? { ...filtrosSalvos, situacao: 'todas' }
    : filtrosSalvos;

  const abertos = useMemo(
    () => new Map(state.series.map(serie => [
      serie.id,
      getSerieOpenItems(serie, { series: state.series, contents: state.contents }),
    ])),
    [state.contents, state.series],
  );

  const lista = useMemo(
    () => montarListaSeries({
      series: state.series,
      contents: state.contents,
      filtros,
      emAberto: serieId => avisos && (abertos.get(serieId)?.length ?? 0) > 0,
    }),
    [abertos, avisos, filtros, state.contents, state.series],
  );

  const nomesDosPilares = useMemo(() => new Map(state.pilares.map(pilar => [pilar.id, pilar.nome])), [state.pilares]);
  const pilarNome = useCallback(
    (item: ItemLista) => (item.pilar.pilarId ? nomesDosPilares.get(item.pilar.pilarId) ?? null : null),
    [nomesDosPilares],
  );

  const pronto = useDomainsReady(DOMINIOS_DA_LISTA);
  const comErro = DOMINIOS_DA_LISTA.some(dominio => resolveDomainStatus(domainStatus, dominio) === 'error');
  const status: QueryViewStatus = resolveQueryViewStatus({
    loading: !pronto,
    fetchAttempted: pronto,
    error: comErro ? 'falha' : null,
    itemCount: state.series.length,
  });

  const atualizarFiltro = useCallback(<K extends keyof FiltrosLista>(chave: K, valor: FiltrosLista[K]) => {
    setFiltros(atual => ({ ...atual, [chave]: valor }));
  }, [setFiltros]);

  const limparFiltros = useCallback(() => {
    setFiltros(atual => ({ ...FILTROS_LISTA_PADRAO, vista: atual.vista }));
  }, [setFiltros]);

  const { alternarAtiva, mudarStatus, modalAtivacao } = useStatusDaSerie();

  const acoes = useMemo(() => ({
    onOpen: (serieId: string) => {
      if (tipoDaSerie(serieId, state.series) === 'familia') {
        navigate(`/series/${serieId}/editar`);
        return;
      }
      navigate(`/series/${serieId}`);
    },
    onOpenFilhos: (serieId: string) => {
      if (tipoDaSerie(serieId, state.series) === 'familia') return;
      navigate(`/series/${serieId}?aba=quadros`);
    },
    onEdit: (serieId: string) => navigate(`/series/${serieId}/editar`),
    onToggleAtiva: alternarAtiva,
    onMudarStatus: mudarStatus,
    onCriarFilho: (item: Pick<ItemLista, 'serie' | 'tipo'>) => {
      if (item.tipo === 'serie' && onAbrirModalCriacao) {
        onAbrirModalCriacao({ tipo: 'quadro', seriePaiId: item.serie.id });
        return;
      }
      const rota = rotaParaCriarFilho(item.serie.id, item.tipo);
      if (rota) navigate(rota);
    },
  }), [alternarAtiva, mudarStatus, navigate, onAbrirModalCriacao, state.series]);

  // Todos = séries e quadros. A família segue alcançável pelo filtro dela.
  const opcoesTipo = [
    { value: 'todos', label: 'Todos' },
    ...(['serie', 'quadro', 'familia'] as const)
      .map(tipo => ({ value: tipo, label: TIPO_AGRUPAMENTO_PLURAL[tipo] })),
  ];
  const pilaresUsados = new Set([...lista.itens.values()].map(item => item.pilar.pilarId).filter(Boolean));
  const opcoesPilar = [
    { value: 'todos', label: 'Todos' },
    ...state.pilares
      .filter(pilar => pilar.ativo || pilaresUsados.has(pilar.id))
      .map(pilar => ({ value: pilar.id, label: pilar.nome })),
    { value: 'sem', label: 'Sem pilar' },
  ];
  const rotulosSituacao: Record<FiltroSituacao, string> = {
    ativas: 'Ativas',
    rascunho: 'Rascunho',
    inativas: 'Inativas',
    todas: 'Todas',
    abertas: 'Em aberto',
  };
  const opcoesSituacao = (['ativas', 'rascunho', 'inativas', 'todas', ...(avisos ? ['abertas' as const] : [])] as FiltroSituacao[])
    .map(situacao => ({ value: situacao, label: `${rotulosSituacao[situacao]} (${lista.situacoes[situacao]})` }));

  const preferencias = [
    {
      key: 'quickSeriesCreate',
      title: 'Criação rápida de séries',
      description: 'Crie com nome e cor e complete os detalhes depois.',
      enabled: state.editorial.quickSeriesCreate,
      toggle: () => dispatch({
        type: 'SET_EDITORIAL',
        payload: atualizarPreferencias({ ...state.editorial, quickSeriesCreate: !state.editorial.quickSeriesCreate }, {}),
      }),
    },
    {
      key: 'openInfoNotices',
      title: 'Avisar sobre informações em aberto',
      description: 'Sinaliza séries sem pilar, objetivo, frequência, formato ou esforço.',
      enabled: state.editorial.openInfoNotices,
      toggle: () => dispatch({
        type: 'SET_EDITORIAL',
        payload: atualizarPreferencias({ ...state.editorial, openInfoNotices: !state.editorial.openInfoNotices }, {}),
      }),
    },
  ];

  return {
    lista,
    filtros,
    filtrosAtivos: filtrosDaListaAtivos(filtros),
    atualizarFiltro,
    limparFiltros,
    emAberto: (serieId: string) => avisos && (abertos.get(serieId)?.length ?? 0) > 0,
    pilarNome,
    acoes,
    modalAtivacao,
    opcoesTipo,
    opcoesPilar,
    opcoesSituacao,
    rotulosSituacao,
    preferencias,
    status,
    pronto,
    tentarDeNovo: () => void ensureDataDomains(DOMINIOS_DA_LISTA, { force: true }),
    total: state.series.length,
  };
}

export type SeriesListaModelo = ReturnType<typeof useSeriesLista>;
